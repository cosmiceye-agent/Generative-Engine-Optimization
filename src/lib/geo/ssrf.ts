import { promises as dns } from "node:dns";
import net from "node:net";

/**
 * SSRF guard.
 *
 * The analyzer fetches an arbitrary user-supplied URL from our server, which is a
 * textbook SSRF sink: without a guard, a caller could point us at cloud metadata
 * endpoints (169.254.169.254), internal admin panels (10.x), or localhost.
 *
 * The defence has two halves and BOTH are required:
 *
 *  1. `assertSafeUrl` — scheme/port/hostname vetting plus DNS resolution, so a
 *     hostname that *resolves* to a private range is rejected even though the
 *     literal looks public (the "DNS rebinding by name" case, e.g. a domain with
 *     an A record of 127.0.0.1).
 *  2. `isBlockedIp` is re-applied to every redirect hop by the fetcher, because a
 *     public URL is free to 302 straight at an internal one.
 *
 * This still cannot fully close a TOCTOU DNS-rebinding attack, where the record
 * changes between our resolution and the kernel's. Closing that requires pinning
 * the connection to the vetted IP via a custom agent/lookup. See README
 * "Known limitations".
 */

export class SsrfError extends Error {
  readonly code = "SSRF_BLOCKED";
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/** Ports worth allowing. Everything else is almost certainly an internal service. */
const ALLOWED_PORTS = new Set(["", "80", "443", "8080", "8443"]);

/** Hostnames that never make sense to analyse, checked before DNS. */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "ip6-localhost",
  "ip6-loopback",
  "metadata.google.internal",
  "metadata.goog",
  "instance-data",
]);

/** Suffixes reserved for internal/private naming. */
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".localdomain", ".home.arpa", ".onion"];

function ipv4ToInt(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function inCidr(ip: string, cidr: string): boolean {
  const [range, bitsRaw] = cidr.split("/");
  const bits = Number(bitsRaw);
  // A /0 mask would shift by 32, which is a no-op in JS — special-case it.
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(range) & mask);
}

/** Every IPv4 range that is not publicly routable, per RFC 1918/5735/6598/3927. */
const BLOCKED_V4_CIDRS = [
  "0.0.0.0/8", // "this network"
  "10.0.0.0/8", // RFC1918 private
  "100.64.0.0/10", // RFC6598 carrier-grade NAT
  "127.0.0.0/8", // loopback
  "169.254.0.0/16", // link-local — includes cloud metadata at 169.254.169.254
  "172.16.0.0/12", // RFC1918 private
  "192.0.0.0/24", // IETF protocol assignments
  "192.0.2.0/24", // TEST-NET-1
  "192.88.99.0/24", // 6to4 relay anycast
  "192.168.0.0/16", // RFC1918 private
  "198.18.0.0/15", // benchmarking
  "198.51.100.0/24", // TEST-NET-2
  "203.0.113.0/24", // TEST-NET-3
  "224.0.0.0/4", // multicast
  "240.0.0.0/4", // reserved, includes 255.255.255.255 broadcast
];

function normaliseV6(ip: string): string {
  return ip.toLowerCase().split("%")[0];
}

/** True when the literal IP address must not be connected to. */
export function isBlockedIp(ip: string): boolean {
  const version = net.isIP(ip);

  if (version === 4) {
    return BLOCKED_V4_CIDRS.some((cidr) => inCidr(ip, cidr));
  }

  if (version === 6) {
    const v6 = normaliseV6(ip);

    // IPv4-mapped (::ffff:127.0.0.1) and IPv4-compatible forms tunnel the whole
    // IPv4 problem through IPv6, so unwrap and re-check as IPv4.
    const mapped = /^::(?:ffff:(?:0{1,4}:)?)?((?:\d{1,3}\.){3}\d{1,3})$/.exec(v6);
    if (mapped && net.isIP(mapped[1]) === 4) return isBlockedIp(mapped[1]);

    if (v6 === "::" || v6 === "::1") return true; // unspecified + loopback
    if (v6.startsWith("fe8") || v6.startsWith("fe9") || v6.startsWith("fea") || v6.startsWith("feb")) {
      return true; // fe80::/10 link-local
    }
    if (v6.startsWith("fc") || v6.startsWith("fd")) return true; // fc00::/7 unique-local
    if (v6.startsWith("ff")) return true; // ff00::/8 multicast
    if (v6.startsWith("2002:")) return true; // 6to4 — can encapsulate private v4
    if (v6.startsWith("64:ff9b:")) return true; // NAT64 well-known prefix
    return false;
  }

  // Not a parseable IP at all — treat as unsafe rather than guessing.
  return true;
}

export type VettedTarget = {
  url: URL;
  /** Addresses the hostname resolved to, all of which passed {@link isBlockedIp}. */
  addresses: string[];
};

/**
 * Validate a user-supplied URL and resolve it, throwing {@link SsrfError} if the
 * target is anything other than a public http(s) host.
 */
export async function assertSafeUrl(rawUrl: string): Promise<VettedTarget> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SsrfError("That is not a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new SsrfError(`Only http and https URLs can be analysed (got "${url.protocol}").`);
  }

  // Credentials in the URL are a common way to confuse downstream parsers.
  if (url.username || url.password) {
    throw new SsrfError("URLs containing credentials are not allowed.");
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new SsrfError(`Port ${url.port} is not allowed. Use 80, 443, 8080 or 8443.`);
  }

  // URL normalises IPv6 literals into brackets; strip them before IP checks.
  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new SsrfError(`"${hostname}" is a local address and cannot be analysed.`);
  }
  if (BLOCKED_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new SsrfError(`"${hostname}" is an internal hostname and cannot be analysed.`);
  }

  // A bare literal IP skips DNS entirely — check it directly.
  if (net.isIP(hostname) !== 0) {
    if (isBlockedIp(hostname)) {
      throw new SsrfError(`${hostname} is a private or reserved address and cannot be analysed.`);
    }
    return { url, addresses: [hostname] };
  }

  // A public-looking hostname can still resolve into a private range, so resolve
  // before connecting and vet every address the name maps to.
  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true, verbatim: true });
    addresses = records.map((record) => record.address);
  } catch {
    throw new SsrfError(`Could not resolve "${hostname}". Check the domain name.`);
  }

  if (addresses.length === 0) {
    throw new SsrfError(`"${hostname}" did not resolve to any address.`);
  }

  // Reject if ANY address is private: a round-robin record that mixes a public
  // and a private address must not be reachable by luck of the draw.
  const blocked = addresses.filter(isBlockedIp);
  if (blocked.length > 0) {
    throw new SsrfError(
      `"${hostname}" resolves to a private or reserved address (${blocked[0]}) and cannot be analysed.`,
    );
  }

  return { url, addresses };
}
