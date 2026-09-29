import { describe, expect, it } from "vitest";
import { assertSafeUrl, isBlockedIp, SsrfError } from "@/lib/geo/ssrf";

/**
 * The SSRF guard is the only part of this codebase where a bug is a security
 * incident rather than a wrong number, so the blocked cases are enumerated
 * exhaustively rather than sampled.
 */
describe("isBlockedIp", () => {
  const blocked = [
    ["loopback", "127.0.0.1"],
    ["loopback, high octet", "127.255.255.254"],
    ["this-network", "0.0.0.0"],
    ["RFC1918 10/8", "10.0.0.1"],
    ["RFC1918 10/8 upper", "10.255.255.255"],
    ["RFC1918 172.16/12", "172.16.0.1"],
    ["RFC1918 172.16/12 upper", "172.31.255.255"],
    ["RFC1918 192.168/16", "192.168.1.1"],
    ["link-local", "169.254.0.1"],
    ["cloud metadata", "169.254.169.254"],
    ["carrier-grade NAT", "100.64.0.1"],
    ["IETF protocol assignments", "192.0.0.1"],
    ["TEST-NET-1", "192.0.2.1"],
    ["TEST-NET-2", "198.51.100.1"],
    ["TEST-NET-3", "203.0.113.1"],
    ["benchmarking", "198.18.0.1"],
    ["6to4 relay", "192.88.99.1"],
    ["multicast", "224.0.0.1"],
    ["reserved", "240.0.0.1"],
    ["broadcast", "255.255.255.255"],
    ["IPv6 loopback", "::1"],
    ["IPv6 unspecified", "::"],
    ["IPv6 link-local", "fe80::1"],
    ["IPv6 unique-local", "fd00::1"],
    ["IPv6 unique-local fc", "fc00::1"],
    ["IPv6 multicast", "ff02::1"],
    ["IPv4-mapped loopback", "::ffff:127.0.0.1"],
    ["IPv4-mapped metadata", "::ffff:169.254.169.254"],
    ["IPv4-mapped private", "::ffff:10.0.0.1"],
    ["6to4", "2002:c0a8:0101::1"],
    ["NAT64", "64:ff9b::7f00:1"],
  ] as const;

  for (const [label, ip] of blocked) {
    it(`blocks ${label} (${ip})`, () => {
      expect(isBlockedIp(ip)).toBe(true);
    });
  }

  const allowed = [
    ["Google DNS", "8.8.8.8"],
    ["Cloudflare DNS", "1.1.1.1"],
    ["public v4", "93.184.216.34"],
    ["just outside 172.16/12", "172.32.0.1"],
    ["just below 172.16/12", "172.15.255.255"],
    ["just outside 100.64/10", "100.128.0.1"],
    ["public IPv6", "2606:4700:4700::1111"],
  ] as const;

  for (const [label, ip] of allowed) {
    it(`allows ${label} (${ip})`, () => {
      expect(isBlockedIp(ip)).toBe(false);
    });
  }

  it("treats an unparseable address as blocked", () => {
    expect(isBlockedIp("not-an-ip")).toBe(true);
    expect(isBlockedIp("")).toBe(true);
    expect(isBlockedIp("999.999.999.999")).toBe(true);
  });
});

describe("assertSafeUrl", () => {
  it("rejects non-http schemes", async () => {
    for (const url of [
      "file:///etc/passwd",
      "ftp://example.com/x",
      "gopher://example.com",
      "data:text/html,<h1>hi</h1>",
    ]) {
      await expect(assertSafeUrl(url)).rejects.toBeInstanceOf(SsrfError);
    }
  });

  it("rejects malformed URLs", async () => {
    await expect(assertSafeUrl("not a url")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("")).rejects.toThrow(SsrfError);
  });

  it("rejects localhost by name", async () => {
    for (const url of [
      "http://localhost/",
      "http://localhost:8080/admin",
      "http://LOCALHOST/",
      "http://app.localhost/",
      "http://service.internal/",
      "http://db.local/",
      "http://foo.home.arpa/",
    ]) {
      await expect(assertSafeUrl(url)).rejects.toThrow(SsrfError);
    }
  });

  it("rejects cloud metadata endpoints", async () => {
    await expect(assertSafeUrl("http://169.254.169.254/latest/meta-data/")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("http://metadata.google.internal/")).rejects.toThrow(SsrfError);
  });

  it("rejects literal private IPs", async () => {
    for (const url of [
      "http://127.0.0.1/",
      "http://127.0.0.1:3000/",
      "http://10.0.0.5/",
      "http://192.168.1.1/",
      "http://172.16.5.4/",
      "http://[::1]/",
      "http://[fd00::1]/",
    ]) {
      await expect(assertSafeUrl(url)).rejects.toThrow(SsrfError);
    }
  });

  it("rejects non-standard ports", async () => {
    await expect(assertSafeUrl("http://example.com:22/")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("http://example.com:6379/")).rejects.toThrow(SsrfError);
    await expect(assertSafeUrl("http://example.com:5432/")).rejects.toThrow(SsrfError);
  });

  it("rejects URLs carrying credentials", async () => {
    await expect(assertSafeUrl("https://user:pass@example.com/")).rejects.toThrow(SsrfError);
  });

  it("allows a public literal IP without touching DNS", async () => {
    const result = await assertSafeUrl("https://8.8.8.8/");
    expect(result.addresses).toEqual(["8.8.8.8"]);
  });

  it("allows the standard web ports", async () => {
    await expect(assertSafeUrl("https://8.8.8.8:443/")).resolves.toBeDefined();
    await expect(assertSafeUrl("http://8.8.8.8:80/")).resolves.toBeDefined();
    await expect(assertSafeUrl("http://8.8.8.8:8080/")).resolves.toBeDefined();
  });

  it("rejects a hostname that does not resolve", async () => {
    await expect(
      assertSafeUrl("https://this-domain-should-never-exist-envoyix.invalid/"),
    ).rejects.toThrow(SsrfError);
  });
});
