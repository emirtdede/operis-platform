/**
 * Safely serializes an object to a JSON-LD script content string.
 * Escapes characters that could be used to prematurely close the </script> tag
 * or execute HTML injection.
 *
 * Complies with RFC 8259 JSON and Schema.org specifications.
 */
export function serializeJsonLd(data: unknown): string {
  const json = JSON.stringify(data);
  if (!json) return "{}";
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
