import type { Thing, WithContext } from "schema-dts";

/**
 * Typed JSON-LD emitter.
 *
 * Typing against schema-dts means a malformed graph is a compile error rather
 * than something an engine silently ignores. The payload is serialised with the
 * `<` escaped: a `</script>` sequence inside any string value would otherwise
 * terminate the script element early and inject markup.
 */
export function JsonLd<T extends Thing>({ data }: { data: WithContext<T> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
