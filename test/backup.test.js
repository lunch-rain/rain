import test from "node:test";
import assert from "node:assert/strict";
import { makeBackup, readBackup } from "../src/backup.js";

const item = { id: "one", title: "写文章", column: "doing", createdAt: "2026-09-27T00:00:00Z" };

test("new backup includes paused focus state and remains importable", () => {
  const backup = makeBackup([item], { durationSeconds: 1500, remainingSeconds: 600, endsAt: Date.now() + 600_000, history: [{ day: "2026-09-27", sessions: 1, minutes: 25 }] });
  assert.equal(backup.version, 2);
  assert.equal(backup.focus.endsAt, null);
  const restored = readBackup(backup);
  assert.equal(restored.items[0].title, "写文章");
  assert.equal(restored.focus.history[0].minutes, 25);
});

test("version 1 task backups remain importable", () => {
  const restored = readBackup({ app: "rain-desk", version: 1, items: [item] });
  assert.equal(restored.items.length, 1);
  assert.equal(restored.focus, null);
});
