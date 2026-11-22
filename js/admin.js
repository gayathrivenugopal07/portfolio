const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const todayStr = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

const HEADER = `/* ------------------------------------------------------------
   MY DAILY STUDY LOG
   This file is written by admin.html. You can still edit it by hand.

   date  : "YYYY-MM-DD"
   topic : any name you like (a new topic appears automatically)
   hours : time spent, e.g. 1.5
   note  : optional, shown when you hover over the day
------------------------------------------------------------ */
`;

let log = STUDY_LOG.map(e => Object.assign({}, e));
let editing = -1, dirty = false, toastTimer;

function toast(msg) {
  const t = $("toast"); t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 3200);
}

function setDirty(v) {
  dirty = v;
  $("status").textContent = v ? "You have unsaved changes." : "All changes saved.";
  $("status").className = v ? "dirty" : "";
}

function render() {
  const topics = [...new Set(log.map(e => e.topic))].sort();
  $("topicList").innerHTML = topics.map(t => `<option value="${esc(t)}">`).join("");
  $("topicChips").innerHTML = topics.map(t => `<button type="button" data-t="${esc(t)}">${esc(t)}</button>`).join("");

  const rows = log.map((e, i) => ({ e, i })).sort((a, b) => a.e.date < b.e.date ? 1 : a.e.date > b.e.date ? -1 : 0);
  $("count").textContent = "(" + log.length + ")";
  $("list").innerHTML = rows.length ? rows.map(({ e, i }) => `
    <div class="entry">
      <span class="d">${new Date(e.date + "T00:00").toLocaleDateString("en", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</span>
      <span class="t"><b>${esc(e.topic)}</b>${e.note ? `<span class="n">${esc(e.note)}</span>` : ""}</span>
      <span class="h">${e.hours} h</span>
      <span class="acts"><button class="lnk" data-edit="${i}" type="button">Edit</button><button class="lnk del" data-del="${i}" type="button">Delete</button></span>
    </div>`).join("") : `<p class="empty">No entries yet. Add your first study session above.</p>`;
}

function resetForm() {
  editing = -1;
  $("f").reset(); $("date").value = todayStr();
  $("formTitle").textContent = "Add a study session";
  $("addBtn").textContent = "Add entry";
  $("cancelBtn").hidden = true;
}

$("f").addEventListener("submit", ev => {
  ev.preventDefault();
  const entry = { date: $("date").value, topic: $("topic").value.trim(), hours: +$("hours").value, note: $("note").value.trim() };
  if (!entry.date || !entry.topic || !(entry.hours > 0)) return toast("Please fill in the date, topic and hours.");
  if (editing >= 0) log[editing] = entry; else log.push(entry);
  const wasEditing = editing >= 0;
  resetForm(); setDirty(true); render();
  toast(wasEditing ? "Entry updated. Press Save when you are done." : "Entry added. Press Save when you are done.");
  $("topic").focus();
});

$("cancelBtn").addEventListener("click", resetForm);
$("topicChips").addEventListener("click", e => { const t = e.target.getAttribute("data-t"); if (t) { $("topic").value = t; $("hours").focus(); } });

$("list").addEventListener("click", e => {
  const ed = e.target.getAttribute("data-edit"), del = e.target.getAttribute("data-del");
  if (ed !== null) {
    const x = log[+ed]; editing = +ed;
    $("date").value = x.date; $("topic").value = x.topic; $("hours").value = x.hours; $("note").value = x.note || "";
    $("formTitle").textContent = "Edit entry"; $("addBtn").textContent = "Update entry"; $("cancelBtn").hidden = false;
    window.scrollTo({ top: 0, behavior: "smooth" });
  } else if (del !== null) {
    log.splice(+del, 1); if (editing >= 0) resetForm();
    setDirty(true); render(); toast("Entry deleted. Press Save to keep this change.");
  }
});

/* ---------- saving ---------- */
function toFile() {
  const sorted = log.slice().sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0);
  const lines = sorted.map(e => "  " + JSON.stringify({ date: e.date, topic: e.topic, hours: e.hours, note: e.note || "" }) + ",");
  return HEADER + "\nconst STUDY_LOG = [\n" + lines.join("\n") + "\n];\n";
}

/* remember the chosen file so you only pick it once (Chrome / Edge) */
const openDB = () => new Promise((res, rej) => { const r = indexedDB.open("study-admin", 1); r.onupgradeneeded = () => r.result.createObjectStore("kv"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
async function getHandle() { try { const db = await openDB(); return await new Promise(res => { const q = db.transaction("kv").objectStore("kv").get("h"); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } }
async function putHandle(h) { try { const db = await openDB(); db.transaction("kv", "readwrite").objectStore("kv").put(h, "h"); } catch (e) { /* ignore */ } }

function download(text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/javascript" }));
  a.download = "study-log.js"; document.body.appendChild(a); a.click(); a.remove();
  setDirty(false); toast("Downloaded. Replace js/study-log.js with this file.");
}

async function save() {
  const text = toFile();
  if (!window.showOpenFilePicker) return download(text);
  try {
    let h = await getHandle();
    if (!h) {
      [h] = await window.showOpenFilePicker({ types: [{ description: "study-log.js", accept: { "text/javascript": [".js"] } }] });
      if (h.name !== "study-log.js") return toast("Please choose the file named study-log.js.");
      await putHandle(h);
    }
    if ((await h.queryPermission({ mode: "readwrite" })) !== "granted" && (await h.requestPermission({ mode: "readwrite" })) !== "granted") return toast("Permission to save was not given.");
    const w = await h.createWritable(); await w.write(text); await w.close();
    setDirty(false); toast("Saved. Refresh your portfolio to see the update.");
  } catch (err) {
    if (err && err.name === "AbortError") return;
    console.warn(err); download(text);
  }
}

$("saveBtn").addEventListener("click", save);
$("rechoose").addEventListener("click", async () => { await putHandle(null); toast("Next time you save, you will pick the file again."); });
window.addEventListener("beforeunload", e => { if (dirty) { e.preventDefault(); e.returnValue = ""; } });

resetForm(); render();
