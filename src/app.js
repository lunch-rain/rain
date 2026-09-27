import { COLUMNS, STORAGE_KEY, createItem, getCounts, normalizeItems } from "./model.js";
import { FOCUS_STORAGE_KEY, getTodayFocus, reconcileFocus } from "./focus.js";
import { makeBackup, readBackup } from "./backup.js";

const $ = (selector) => document.querySelector(selector);
const stored = (() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; } })();
let items;
try { items = normalizeItems(stored); } catch { items = []; }
let editingId = null;
let search = "";
let toastTimeout;

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }
  catch { notify("浏览器存储空间不足，请先导出备份", true); }
  render();
}

function notify(message, error = false) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.toggle("error", error);
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3500);
}

function makeCard(item) {
  const card = document.createElement("article");
  card.className = "task-card";
  card.draggable = true;
  card.dataset.id = item.id;
  const top = document.createElement("div");
  top.className = "task-top";
  const tag = document.createElement("span");
  tag.className = `task-tag ${item.priority === "high" ? "high" : ""}`;
  tag.textContent = item.priority === "high" ? "✦ 重要" : "✧ 想法";
  const more = document.createElement("button");
  more.className = "more-button";
  more.type = "button";
  more.setAttribute("aria-label", `编辑 ${item.title}`);
  more.textContent = "···";
  more.addEventListener("click", () => openDialog(item));
  top.append(tag, more);
  const title = document.createElement("h4");
  title.textContent = item.title;
  card.append(top, title);
  if (item.detail) {
    const detail = document.createElement("p");
    detail.className = "task-detail";
    detail.textContent = item.detail;
    card.append(detail);
  }
  const bottom = document.createElement("div");
  bottom.className = "task-bottom";
  const date = document.createElement("time");
  date.dateTime = item.createdAt;
  date.textContent = new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" }).format(new Date(item.createdAt));
  const actions = document.createElement("div");
  actions.className = "task-actions";
  const idx = COLUMNS.indexOf(item.column);
  if (idx > 0) actions.append(moveButton("←", "移到上一列", COLUMNS[idx - 1], item.id));
  if (idx < COLUMNS.length - 1) actions.append(moveButton("→", "移到下一列", COLUMNS[idx + 1], item.id));
  bottom.append(date, actions);
  card.append(bottom);
  card.addEventListener("dragstart", (event) => { event.dataTransfer.setData("text/plain", item.id); event.dataTransfer.effectAllowed = "move"; card.classList.add("dragging"); });
  card.addEventListener("dragend", () => card.classList.remove("dragging"));
  return card;
}

function moveButton(glyph, label, column, id) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = glyph;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.addEventListener("click", () => { items = items.map((item) => item.id === id ? { ...item, column } : item); save(); });
  return button;
}

function render() {
  const counts = getCounts(items);
  const progress = items.length ? Math.round((counts.done / items.length) * 100) : 0;
  $("#progress-fill").style.width = `${progress}%`;
  $(".progress-track").setAttribute("aria-valuenow", String(progress));
  $("#progress-summary").textContent = items.length ? `已完成 ${counts.done} / ${items.length} 件事 · ${progress}%` : "从一个想法开始";
  for (const column of COLUMNS) {
    $(`[data-count="${column}"]`).textContent = counts[column];
    $(`#${column}-count`).textContent = counts[column];
    const list = $(`[data-list="${column}"]`);
    list.replaceChildren();
    const visible = items.filter((item) => item.column === column && `${item.title} ${item.detail}`.toLocaleLowerCase().includes(search));
    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.innerHTML = `<span aria-hidden="true">${search ? "⌕" : column === "done" ? "✧" : "＋"}</span><p>${search ? "没有找到匹配的任务" : column === "inbox" ? "灵感会在这里发芽" : column === "doing" ? "把想做的事移到这里" : "完成的任务会出现在这里"}</p>`;
      list.append(empty);
    } else visible.forEach((item) => list.append(makeCard(item)));
  }
  renderFocusTasks();
}

function openDialog(item = null) {
  editingId = item?.id ?? null;
  $("#dialog-title").textContent = item ? "编辑任务" : "记录一个想法";
  $("#item-title").value = item?.title ?? "";
  $("#item-detail").value = item?.detail ?? "";
  $("#item-priority").value = item?.priority ?? "normal";
  const oldDelete = $("#delete-item");
  oldDelete?.remove();
  if (item) {
    const button = document.createElement("button");
    button.id = "delete-item";
    button.type = "button";
    button.className = "delete-button";
    button.textContent = "删除任务";
    button.addEventListener("click", () => {
      if (!confirm(`确定删除“${item.title}”吗？`)) return;
      items = items.filter((entry) => entry.id !== item.id);
      save();
      $("#item-dialog").close();
      notify("任务已删除");
    });
    $(".dialog-actions").prepend(button);
  }
  $("#item-dialog").showModal();
  $("#item-title").focus();
}

$("#hero-add").addEventListener("click", () => openDialog());
$("#add-button").addEventListener("click", () => openDialog());
$("[data-add]").addEventListener("click", () => openDialog());
$("#dialog-close").addEventListener("click", () => $("#item-dialog").close());
$("#dialog-cancel").addEventListener("click", () => $("#item-dialog").close());
$("#item-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const title = $("#item-title").value.trim();
  if (!title) return;
  const detail = $("#item-detail").value;
  const priority = $("#item-priority").value;
  if (editingId) items = items.map((item) => item.id === editingId ? { ...item, title, detail: detail.trim(), priority } : item);
  else items.unshift(createItem(title, detail, priority));
  save();
  $("#item-dialog").close();
  notify(editingId ? "任务已更新" : "想法已收好");
});
$("#search").addEventListener("input", (event) => { search = event.target.value.trim().toLocaleLowerCase(); render(); });
for (const column of document.querySelectorAll(".board-column")) {
  column.addEventListener("dragover", (event) => { event.preventDefault(); column.classList.add("drag-over"); });
  column.addEventListener("dragleave", (event) => { if (!column.contains(event.relatedTarget)) column.classList.remove("drag-over"); });
  column.addEventListener("drop", (event) => {
    event.preventDefault();
    column.classList.remove("drag-over");
    const id = event.dataTransfer.getData("text/plain");
    if (items.some((item) => item.id === id)) { items = items.map((item) => item.id === id ? { ...item, column: column.dataset.column } : item); save(); }
  });
}

$("#export-button").addEventListener("click", () => {
  if (focus.endsAt) tick();
  const blob = new Blob([JSON.stringify(makeBackup(items, focus), null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `rain-desk-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  notify("备份文件已导出");
});
$("#import-button").addEventListener("click", () => $("#import-file").click());
$("#import-file").addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    if (file.size > 2_000_000) throw new Error("文件过大，最大支持 2 MB");
    const { items: next, focus: nextFocus } = readBackup(JSON.parse(await file.text()));
    if (!confirm(`将导入 ${next.length} 条任务，并替换当前 ${items.length} 条任务${nextFocus ? "和专注记录" : ""}。继续吗？`)) return;
    items = next;
    if (nextFocus) {
      clearInterval(tickInterval);
      focus = nextFocus;
      persistFocus();
      renderTimer();
      renderFocusStats();
    }
    save();
    notify(`已导入 ${items.length} 条任务`);
  } catch (error) { notify(error.message || "导入失败", true); }
  finally { event.target.value = ""; }
});

function renderToday() {
  const now = new Date();
  $("#today-date").textContent = new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(now);
  $("#greeting").textContent = now.getHours() < 11 ? "早上好，慢慢开始也很好" : now.getHours() < 18 ? "今天也在一点点前进" : "辛苦了，记得留点时间给自己";
}

const restoredFocus = (() => {
  try { return reconcileFocus(JSON.parse(localStorage.getItem(FOCUS_STORAGE_KEY) || "null")); }
  catch { return reconcileFocus(null); }
})();
let focus = restoredFocus.state;
let tickInterval = null;

function persistFocus() {
  try { localStorage.setItem(FOCUS_STORAGE_KEY, JSON.stringify(focus)); }
  catch { notify("专注记录无法保存，请检查浏览器存储空间", true); }
}

function renderFocusTasks() {
  const select = $("#focus-task");
  const current = focus.targetId;
  select.replaceChildren(new Option("自由专注", ""));
  for (const item of items.filter((entry) => entry.column === "doing")) {
    select.add(new Option(item.title, item.id));
  }
  focus.targetId = items.some((item) => item.id === current && item.column === "doing") ? current : "";
  select.value = focus.targetId;
  if (current !== focus.targetId) persistFocus();
}

function renderFocusStats() {
  const today = getTodayFocus(focus);
  $("#focus-minutes").textContent = today.minutes;
  $("#focus-sessions").textContent = today.sessions;
}

function renderTimer() {
  const minutes = String(Math.floor(focus.remainingSeconds / 60)).padStart(2, "0");
  const seconds = String(focus.remainingSeconds % 60).padStart(2, "0");
  $("#timer-display").textContent = `${minutes}:${seconds}`;
  $("#timer-ring").style.setProperty("--progress", `${((focus.durationSeconds - focus.remainingSeconds) / focus.durationSeconds) * 100}%`);
  $("#timer-label").textContent = focus.durationSeconds === 300 ? "休息时间" : "专注时间";
  document.title = focus.endsAt ? `${minutes}:${seconds} · Rain Desk` : "Rain Desk — 给灵感一个落脚点";
  $("#timer-toggle").textContent = focus.endsAt ? "暂停计时" : focus.remainingSeconds < focus.durationSeconds ? "继续专注" : "开始专注";
  document.querySelectorAll(".preset").forEach((button) => button.classList.toggle("active", Number(button.dataset.minutes) * 60 === focus.durationSeconds));
}

function tick() {
  const result = reconcileFocus(focus);
  focus = result.state;
  if (result.completed) {
    clearInterval(tickInterval);
    persistFocus();
    renderFocusStats();
    notify("这一段时间完成了，去伸个懒腰吧 ✨");
  }
  renderTimer();
}

function pauseTimer() {
  if (!focus.endsAt) return;
  tick();
  focus.endsAt = null;
  clearInterval(tickInterval);
  persistFocus();
  renderTimer();
}

$("#timer-toggle").addEventListener("click", () => {
  if (focus.endsAt) pauseTimer();
  else {
    if (focus.remainingSeconds === 0) focus.remainingSeconds = focus.durationSeconds;
    focus.endsAt = Date.now() + focus.remainingSeconds * 1000;
    persistFocus();
    tickInterval = setInterval(tick, 250);
    renderTimer();
  }
});
$("#timer-reset").addEventListener("click", () => { pauseTimer(); focus.remainingSeconds = focus.durationSeconds; persistFocus(); renderTimer(); });
for (const button of document.querySelectorAll(".preset")) button.addEventListener("click", () => {
  pauseTimer();
  focus.durationSeconds = Number(button.dataset.minutes) * 60;
  focus.remainingSeconds = focus.durationSeconds;
  persistFocus();
  renderTimer();
});
$("#focus-task").addEventListener("change", (event) => { focus.targetId = event.target.value; persistFocus(); });
document.addEventListener("visibilitychange", () => { if (!document.hidden && focus.endsAt) tick(); });

renderToday();
render();
renderTimer();
renderFocusStats();
if (focus.endsAt) tickInterval = setInterval(tick, 250);
if (restoredFocus.completed) { persistFocus(); notify("上一轮计时已结束 ✨"); }
setInterval(() => { renderToday(); renderFocusStats(); }, 60_000);
