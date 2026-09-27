export const FOCUS_STORAGE_KEY = "rain-desk:focus-v1";
export const FOCUS_DURATIONS = [300, 1500, 3000];

export function localDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeFocus(value) {
  const input = value && typeof value === "object" ? value : {};
  const durationSeconds = FOCUS_DURATIONS.includes(input.durationSeconds) ? input.durationSeconds : 1500;
  const remainingSeconds = Number.isFinite(input.remainingSeconds)
    ? Math.max(0, Math.min(durationSeconds, Math.ceil(input.remainingSeconds))) : durationSeconds;
  const history = Array.isArray(input.history) ? input.history
    .filter((entry) => entry && /^\d{4}-\d{2}-\d{2}$/.test(entry.day))
    .map((entry) => ({
      day: entry.day,
      sessions: Number.isInteger(entry.sessions) ? Math.max(0, Math.min(entry.sessions, 999)) : 0,
      minutes: Number.isInteger(entry.minutes) ? Math.max(0, Math.min(entry.minutes, 9999)) : 0,
    })).slice(-30) : [];
  return {
    durationSeconds,
    remainingSeconds,
    endsAt: Number.isFinite(input.endsAt) && input.endsAt > 0 ? input.endsAt : null,
    targetId: typeof input.targetId === "string" ? input.targetId : "",
    history,
  };
}

export function reconcileFocus(value, nowMs = Date.now()) {
  const state = normalizeFocus(value);
  if (state.endsAt === null) return { state, completed: false };
  state.endsAt = Math.min(state.endsAt, nowMs + state.durationSeconds * 1000);
  state.remainingSeconds = Math.max(0, Math.ceil((state.endsAt - nowMs) / 1000));
  if (state.remainingSeconds > 0) return { state, completed: false };

  const finishedAt = state.endsAt;
  state.endsAt = null;
  if (state.durationSeconds !== 300) {
    const day = localDayKey(new Date(finishedAt));
    const record = state.history.find((entry) => entry.day === day);
    if (record) {
      record.sessions += 1;
      record.minutes += state.durationSeconds / 60;
    } else state.history.push({ day, sessions: 1, minutes: state.durationSeconds / 60 });
    state.history = state.history.slice(-30);
  }
  return { state, completed: true };
}

export function getTodayFocus(state, nowMs = Date.now()) {
  return state.history.find((entry) => entry.day === localDayKey(new Date(nowMs))) || { sessions: 0, minutes: 0 };
}
