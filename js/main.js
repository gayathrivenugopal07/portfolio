const $ = id => document.getElementById(id);

/* Calendar range: begins CAL_START_OFFSET days from today (1 = tomorrow)
   and runs for CAL_YEARS year(s). Use 0 for today, or -364 to look back a year. */
const CAL_START_OFFSET = 1, CAL_YEARS = 1;
document.getElementById("yr").textContent = new Date().getFullYear();

/* projects */
$("projectList").innerHTML = PROJECTS.map((p, i) => `
  <article class="project" style="--i:${i}">
    <h3>${p.title}</h3>
    ${p.link ? `<a class="plink" href="${p.link}" target="_blank" rel="noopener">View project</a>`
             : `<span class="plink empty">Link coming soon</span>`}
    <p>${p.description}</p>
    <div class="stack">${p.stack}</div>
  </article>`).join("");

/* reveal on scroll */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .12 });
document.querySelectorAll(".rise").forEach(el => io.observe(el));

/* active nav link */
const navLinks = [...document.querySelectorAll(".links a")];
const spy = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) navLinks.forEach(a => a.classList.toggle("on", a.getAttribute("href") === "#" + e.target.id));
}), { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("section").forEach(s => spy.observe(s));

/* ---------- LEARNING CALENDAR ---------- */
const key = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const topics = [...new Set(STUDY_LOG.map(e => e.topic))];
let active = "All";

function level(h){ return h <= 0 ? 0 : h <= 1 ? 1 : h <= 2.5 ? 2 : h <= 4 ? 3 : 4; }

function drawCalendar(){
  const days = {};
  STUDY_LOG.filter(e => active === "All" || e.topic === active).forEach(e => {
    const d = days[e.date] || (days[e.date] = { hours: 0, parts: {}, notes: [] });
    d.hours += +e.hours || 0;
    d.parts[e.topic] = (d.parts[e.topic] || 0) + (+e.hours || 0);
    if (e.note) d.notes.push(e.note);
  });

  const today = new Date(); today.setHours(0,0,0,0);
  const first = new Date(today); first.setDate(first.getDate() + CAL_START_OFFSET);   // first visible day
  const last = new Date(first); last.setFullYear(last.getFullYear() + CAL_YEARS);      // same date next year
  const start = new Date(first); start.setDate(start.getDate() - first.getDay());      // back to Sunday so weeks line up
  let cells = "", col = 0, lastMonth = -1; const labels = [];
  for (let d = new Date(start), n = 0; d <= last; d.setDate(d.getDate()+1), n++){
    if (d.getDay() === 0){
      col++;
      if (d.getMonth() !== lastMonth){
        if (labels.length && col - labels[labels.length-1].col < 3) labels.pop();   // avoid overlapping month names
        labels.push({ col, text: d.toLocaleString("en",{month:"short"}) });
        lastMonth = d.getMonth();
      }
    }
    if (d < first){ cells += `<i class="future"></i>`; continue; }                // blank days before the start
    const k = key(d), e = days[k];
    cells += `<i data-d="${k}" data-l="${e ? level(e.hours) : 0}" style="animation-delay:${Math.min(n*3,900)}ms"></i>`;
  }
  const months = labels.map(l => `<span style="grid-column:${l.col}">${l.text}</span>`).join("");
  $("grid").innerHTML = cells;
  $("months").innerHTML = months;
  $("months").style.gridTemplateColumns = `repeat(${col}, 14px)`;

  const studied = Object.keys(days).sort();
  const total = studied.reduce((s,k) => s + days[k].hours, 0);
  let streak = 0; const c = new Date(today);
  if (!days[key(c)]) c.setDate(c.getDate()-1);   // today not logged yet doesn't break the streak
  while (days[key(c)]) { streak++; c.setDate(c.getDate()-1); }
  $("stats").innerHTML =
    `<div class="stat"><b>${+total.toFixed(1)}</b><span>hours studied</span></div>
     <div class="stat"><b>${studied.length}</b><span>days studied</span></div>
     <div class="stat"><b>${streak}</b><span>day streak</span></div>`;

  window._days = days;
  const wrap = document.querySelector(".cal"); wrap.scrollLeft = 0;
}

function drawFilters(){
  $("filters").innerHTML = ["All", ...topics].map(t => `<button class="${t===active?"on":""}" data-t="${t}">${t}</button>`).join("");
}
$("filters").addEventListener("click", e => {
  const t = e.target.dataset.t; if (!t) return;
  active = t; drawFilters(); drawCalendar(); if (statsSeen) countUp();
});

/* tooltip: hover on desktop, tap on touch screens */
const tip = $("tip");
function showTip(e){
  const k = e.target.getAttribute("data-d");
  if (!k) return tip.classList.remove("show");
  const d = window._days[k];
  const [y,m,dd] = k.split("-");
  const label = new Date(y, m-1, dd).toLocaleDateString("en",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
  tip.innerHTML = d
    ? `<b>${+d.hours.toFixed(1)} h</b> on ${label}<br>${Object.entries(d.parts).map(([t,h]) => `${t} ${+h.toFixed(1)}h`).join(", ")}${d.notes.length ? "<br>" + d.notes.join(", ") : ""}`
    : `No study on ${label}`;
  tip.style.left = Math.max(8, Math.min(e.clientX + 14, window.innerWidth - 250)) + "px";
  tip.style.top = (e.clientY + 16) + "px";
  tip.classList.add("show");
}
$("grid").addEventListener("mousemove", showTip);
$("grid").addEventListener("click", showTip);
$("grid").addEventListener("mouseleave", () => tip.classList.remove("show"));
document.addEventListener("click", e => { if (!e.target.closest("#grid")) tip.classList.remove("show"); });
window.addEventListener("scroll", () => tip.classList.remove("show"), { passive: true });

/* profiles */
$("profileList").innerHTML = PROFILES.map((p, i) => `
  <article class="profile" style="--i:${i}">
    <h3>${p.platform}</h3>
    <div class="user">@${p.username}</div>
    <p class="sum">${p.summary}</p>
    ${p.link ? `<a class="plink" href="${p.link}" target="_blank" rel="noopener">View profile</a>`
             : `<span class="plink empty">Link coming soon</span>`}
  </article>`).join("");

/* mobile menu */
const hdr = document.querySelector("header"), menuBtn = $("menuBtn");
function setMenu(open){ hdr.classList.toggle("menu-open", open); menuBtn.setAttribute("aria-expanded", String(open)); }
menuBtn.addEventListener("click", () => setMenu(!hdr.classList.contains("menu-open")));
navLinks.forEach(a => a.addEventListener("click", () => setMenu(false)));

drawFilters(); drawCalendar();

/* header shadow and scroll progress bar */
const bar = $("progress");
let ticking = false;
function onScroll(){
  const max = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.transform = "scaleX(" + (max > 0 ? Math.min(window.scrollY / max, 1) : 0) + ")";
  hdr.classList.toggle("scrolled", window.scrollY > 8);
  ticking = false;
}
window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();

/* stagger chips */
document.querySelectorAll(".chips").forEach(g => Array.prototype.forEach.call(g.children, (c, i) => c.style.setProperty("--i", i)));

/* count-up numbers once the calendar is on screen */
let statsSeen = false;
function countUp(){
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll(".stat b").forEach(el => {
    const end = parseFloat(el.textContent), dec = el.textContent.indexOf(".") > -1 ? 1 : 0, t0 = performance.now();
    (function step(t){
      const p = Math.min((t - t0) / 900, 1);
      el.textContent = (end * (1 - Math.pow(1 - p, 3))).toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  });
}
new IntersectionObserver((es, o) => { if (es[0].isIntersecting) { statsSeen = true; countUp(); o.disconnect(); } }, { threshold: .6 }).observe($("stats"));
