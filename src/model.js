export const STORAGE_KEY = "rain-desk:v1";
export const COLUMNS = ["inbox", "doing", "done"];

export function createItem(title, detail = "", priority = "normal") {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    detail: detail.trim(),
    priority,
    column: "inbox",
    createdAt: new Date().toISOString(),
  };
}

export function normalizeItems(input) {
  if (!Array.isArray(input)) throw new Error("文件中缺少任务列表");
  if (input.length > 1000) throw new Error("最多导入 1000 条任务");
  const ids = new Set();
  return input.map((item) => {
    if (!item || typeof item !== "object" || typeof item.id !== "string" ||
      !item.id || ids.has(item.id) || typeof item.title !== "string" ||
      !item.title.trim() || item.title.length > 120 ||
      !COLUMNS.includes(item.column)) {
      throw new Error("任务数据格式不正确");
    }
    ids.add(item.id);
    return {
      id: item.id,
      title: item.title.trim(),
      detail: typeof item.detail === "string" ? item.detail.slice(0, 1000) : "",
      priority: item.priority === "high" ? "high" : "normal",
      column: item.column,
      createdAt: typeof item.createdAt === "string" && !Number.isNaN(Date.parse(item.createdAt))
        ? item.createdAt : new Date().toISOString(),
    };
  });
}

export function getCounts(items) {
  return Object.fromEntries(COLUMNS.map((column) => [column, items.filter((item) => item.column === column).length]));
}
