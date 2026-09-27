import test from "node:test";
import assert from "node:assert/strict";
import { getTodayFocus, localDayKey, reconcileFocus } from "../src/focus.js";

const now = new Date(2026, 8, 27, 12, 0, 0).getTime();

test("running focus session resumes from its end time", () => {
  const { state, completed } = reconcileFocus({ durationSeconds: 1500, remainingSeconds: 1500, endsAt: now + 90_000 }, now);
  assert.equal(state.remainingSeconds, 90);
  assert.equal(completed, false);
});

test("elapsed session is recorded once after returning", () => {
  const first = reconcileFocus({ durationSeconds: 1500, remainingSeconds: 1500, endsAt: now - 1000 }, now);
  assert.equal(first.completed, true);
  assert.deepEqual(getTodayFocus(first.state, now), { day: localDayKey(new Date(now)), sessions: 1, minutes: 25 });
  const second = reconcileFocus(first.state, now + 1000);
  assert.equal(second.completed, false);
  assert.equal(getTodayFocus(second.state, now).sessions, 1);
});

test("a completed break does not add focus minutes", () => {
  const result = reconcileFocus({ durationSeconds: 300, remainingSeconds: 300, endsAt: now - 1 }, now);
  assert.deepEqual(getTodayFocus(result.state, now), { sessions: 0, minutes: 0 });
});

test("a finished session belongs to the day it ended", () => {
  const finishedAt = new Date(2026, 8, 26, 23, 55).getTime();
  const result = reconcileFocus({ durationSeconds: 1500, remainingSeconds: 1500, endsAt: finishedAt }, now);
  assert.equal(result.state.history[0].day, "2026-09-26");
  assert.equal(getTodayFocus(result.state, now).minutes, 0);
});
