import test from "node:test";
import assert from "node:assert/strict";
import { getCounts, normalizeItems } from "../src/model.js";

test("valid backup is normalized and counted", () => {
  const items = normalizeItems([{ id: "one", title: "  想法  ", column: "inbox", createdAt: "2026-09-26T00:00:00Z" }]);
  assert.equal(items[0].title, "想法");
  assert.deepEqual(getCounts(items), { inbox: 1, doing: 0, done: 0 });
});

test("invalid or duplicate backup entries are rejected", () => {
  assert.throws(() => normalizeItems([{ id: "1", title: "A", column: "inbox" }, { id: "1", title: "B", column: "done" }]));
  assert.throws(() => normalizeItems([{ id: "1", title: "A", column: "unknown" }]));
});
