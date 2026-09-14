import { ExportError } from "./export-errors";

/** Accepts JSON text produced by PostgreSQL json/jsonb, never untrusted raw input. */
export function* streamRecordWithJsonPayload(
  metadata: Record<string, unknown>,
  field: string,
  databaseJson: string | null,
  maxBytes = 10 * 1024 * 1024
): Generator<string> {
  const prefix =
    JSON.stringify(metadata).slice(0, -1) +
    (Object.keys(metadata).length ? "," : "") +
    JSON.stringify(field) +
    ":";
  const payload = databaseJson ?? "null";
  if (Buffer.byteLength(prefix) + Buffer.byteLength(payload) + 1 > maxBytes) {
    throw new ExportError(
      "EXPORT_RECORD_TOO_LARGE",
      "Export record exceeds byte budget",
      413,
      false
    );
  }
  yield prefix;
  // Small UTF-8 conversions avoid a full-record Buffer alongside the PG text.
  for (let start = 0; start < payload.length;) {
    let end = Math.min(start + 32768, payload.length);
    const last = payload.charCodeAt(end - 1);
    if (end < payload.length && last >= 0xd800 && last <= 0xdbff) end--;
    yield payload.slice(start, end);
    start = end;
  }
  yield "}";
}
