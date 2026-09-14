import { expect, it } from "vitest";
import { streamRecordWithJsonPayload } from "@/src/modules/privacy/export-json-stream";

it("preserves nested DB JSON, UTF-8 across slice boundaries and null", () => {
  const content = "x".repeat(32755) + "😀".repeat(20000);
  const snapshot = { content, nested: [null, true, { quote: '"\\\n' }] };
  const chunks = [
    ...streamRecordWithJsonPayload({ id: "test" }, "snapshotJson", JSON.stringify(snapshot)),
  ];
  const parsed = JSON.parse(Buffer.concat(chunks.map((s) => Buffer.from(s))).toString("utf8"));
  expect(parsed).toEqual({ id: "test", snapshotJson: snapshot });
  expect(Math.max(...chunks.map((c) => c.length))).toBeLessThanOrEqual(32768);
  expect(JSON.parse([...streamRecordWithJsonPayload({}, "payload", null)].join(""))).toEqual({
    payload: null,
  });
});

it("rejects oversize before emitting any part, including metadata overhead", () => {
  const generator = streamRecordWithJsonPayload({ id: "metadata" }, "payload", '"1234"', 10);
  expect(() => generator.next()).toThrow("byte budget");
});
