import { normalizeFocus } from "./focus.js";
import { normalizeItems } from "./model.js";

export function makeBackup(items, focus, exportedAt = new Date()) {
  return {
    app: "rain-desk",
    version: 2,
    exportedAt: exportedAt.toISOString(),
    items,
    focus: { ...normalizeFocus(focus), endsAt: null },
  };
}

export function readBackup(data) {
  if (!data || data.app !== "rain-desk" || ![1, 2].includes(data.version)) {
    throw new Error("请选择 Rain Desk 导出的备份文件");
  }
  const items = normalizeItems(data.items);
  if (data.version === 1) return { items, focus: null };
  if (!data.focus || typeof data.focus !== "object" || Array.isArray(data.focus)) {
    throw new Error("备份中缺少专注记录");
  }
  return { items, focus: { ...normalizeFocus(data.focus), endsAt: null } };
}
