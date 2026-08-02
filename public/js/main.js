"use strict";
/* main.js — TheRowKneet site renderer. no framework, just fetch + DOM. */

const $ = (sel) => document.querySelector(sel);
const state = { data: null, filter: "all", modal: null };

/* ---- deterministic pseudo-random from a string seed ---- */
function seed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h ^= h >>> 13; return (h >>> 0) / 4294967295; };
}

/* ---- procedural "pcb" art for every project. same id => same board. ---- */
function pcbSvg(id, title, hue) {
  const r = seed(id);
  const W = 400, H = 130;
  let parts = [];
  const traces = 6 + Math.floor(r() * 5);
  let nodes = [];
  for (let i = 0; i < traces; i++) {
    const x1 = r() * W, y1 = r() * H, x2 = r() * W, y2 = r() * H;
    const bend = 8 + r() * 26;
    parts.push(`<path d="M${x1.toFixed(0)} ${y1.toFixed(0)} L${x1.toFixed(0)} ${y1.toFixed(0)} L${x2.toFixed(0)} ${y2.toFixed(0)} L${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${hue}" stroke-width="${(0.6 + r() * 1.2).toFixed(1)}" stroke-opacity="${(0.25 + r() * 0.3).toFixed(2)}" fill="none"/>`);
    if (r() > 0.4) nodes.push([x1.toFixed(0), y1.toFixed(0)]);
    if (r() > 0.7) nodes.push([x2.toFixed(0), y2.toFixed(0)]);
  }
  const chipX = 30 + r() * (W - 90), chipY = 40 + r() * (H - 70);
  parts.push(`<rect x="${chipX.toFixed(0)}" y="${chipY.toFixed(0)}" width="${(40 + r() * 30).toFixed(0)}" height="${(24 + r() * 20).toFixed(0)}" fill="none" stroke="${hue}" stroke-opacity="0.5" stroke-width="1.2"/>`);
  parts.push(`<rect x="${(chipX + 3).toFixed(0)}" y="${(chipY + 3).toFixed(0)}" width="6" height="6" fill="${hue}" opacity="0.7"/>`);
  for (const [x, y] of nodes.slice(0, 14)) {
    parts.push(`<circle cx="${x}" cy="${y}" r="2.4" fill="${hue}" opacity="0.8"/>`);
  }
  parts.push(`<text x="14" y="${H - 12}" font-family="JetBrains Mono, monospace" font-size="12" fill="${hue}" opacity="0.85">${title.replace(/[^A-Za-z0-9 _-]/g, "").slice(0, 34).toUpperCase().padEnd(34, "·")}</text>`);
  parts.push(`<text x="${W - 14}" y="16" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="10" fill="${hue}" opacity="0.5">ROWKNEET//${id.slice(0, 12)}</text>`);
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${parts.join("")}</svg>`;
}

const CATEGORY_HUES = {
  "IoT & Security": "#c9f24b",
  "AI & Health": "#ffb347",
  "Robotics": "#7dd3fc",
  "Automotive IoT": "#ff6b57",
  "Computer Vision": "#c9f24b",
  "Concept": "#a8ad99",
  "Game": "#f0abfc",
  "Hardware": "#ffb347",
  "Electronics": "#7dd3fc",
  "Web": "#a8ad99",
  "Tools": "#ffb347",
  "Software": "#c9f24b",
  "Security": "#ff6b57",
};

function hueFor(cat) { return CATEGORY_HUES[cat] || "#c9f24b"; }

/* ---- renderers ---- */
function renderTopbar() {
  $("#build-date").textContent = new Date().toISOString().slice(0, 10);
  $("#year").textContent = new Date().getFullYear();
}

function renderMarquee() {
  const p = state.data.profile;
  const items = [
    ...p.tech.languages.map((t) => `<span><b>◆</b> ${t}</span>`),
    ...p.tech.hardware.slice(0, 8).map((t) => `<span><b>◆</b> ${t}</span>`),
    ...p.focus.map((t) => `<span><b>◆</b> ${t}</span>`),
  ];
  $("#marquee-track").innerHTML = items.join("") + items.join(""); // doubled for seamless loop
}

function renderAbout() {
  const p = state.data.profile;
  $("#role").textContent = p.role.toLowerCase();
  $("#badges").innerHTML = p.badges.map((b) => `<span class="badge">${b}</span>`).join("");
  $("#principles").innerHTML = p.principles.map(
    (x) => `<div class="principle"><h4>${x.title}</h4><p>${x.note}</p></div>`
  ).join("");
  $("#focus-list").innerHTML = p.focus.map((f) => `<li>${f}</li>`).join("");
  $("#stats").innerHTML = p.stats.map(
    (s) => `<div class="stat"><b>${s.value}</b><span>${s.label}</span></div>`
  ).join("");
  $("#timeline").innerHTML = p.journey.map(
    (j) => `<li><b class="year">${j.year}</b><h4>${j.title}</h4><p>${j.note}</p></li>`
  ).join("");
  $("#fun-facts").innerHTML = p.fun_facts.map((f) => `<li>${f}</li>`).join("");
  $("#socials").innerHTML = Object.entries(p.socials)
    .map(([k, v]) => `<a href="${v}" target="_blank" rel="noopener">${k}</a>`)
    .join("");
}

function renderFilters() {
  const cats = ["all", ...new Set(state.data.projects.map((x) => x.category))];
  $("#filters").innerHTML = cats
    .map((c) => `<button class="filter${c === state.filter ? " active" : ""}" data-f=" ${c} ">${c}</button>`)
    .join("");
  document.querySelectorAll(".filter").forEach((b) =>
    b.addEventListener("click", () => { state.filter = b.dataset.f.trim(); renderFilters(); renderProjects(); })
  );
}

function statusRibbon(st) {
  const map = {
    "award-winning": ["★ award-winning", "award"],
    "shipped": ["✓ shipped", ""],
    "market-launched": ["✓ on the market", "award"],
    "major project": ["★ major project", "award"],
    "in development": ["⚙ in development", "wip"],
    "in progress": ["⚙ in progress", "wip"],
    "concept": ["◌ concept", "wip"],
    "experimental": ["◌ experimental", "wip"],
    "prototype": ["◌ prototype", "wip"],
    "built": ["✓ built", ""],
    "tool": ["✓ tool", ""],
    "fun": ["♪ fun", ""],
    "side quest": ["♪ side quest", ""],
    "proposal": ["◌ proposal", "wip"],
    "freelance": ["$ freelance work", "award"],
    "academic": ["🎓 academic", "wip"],
  };
  const m = map[st] || ["● " + st, "wip"];
  return `<span class="badge-ribbon ${m[1]}">${m[0]}</span>`;
}

function renderProjects() {
  const list = state.data.projects
    .filter((x) => state.filter === "all" || x.category === state.filter)
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.year - a.year);
  $("#project-grid").innerHTML = list.map((x) => {
    const hue = hueFor(x.category);
    return `
      <article class="card" data-id="${x.id}">
        ${statusRibbon(x.status)}
        <div class="card-svg">${pcbSvg(x.id, x.title, hue)}</div>
        <div class="card-body">
          <h3 class="card-title">${x.title}${x.featured ? ' <span class="accent" style="font-family:var(--font-m);font-size:.7rem">[featured]</span>' : ""}</h3>
          <p class="card-tag">${x.tagline}</p>
          <div class="card-tech">${x.tech.slice(0, 5).map((t) => `<span class="techchip">${t}</span>`).join("")}</div>
          <div class="card-foot">
            <span>${x.year} · ${x.category}</span>
            <span class="card-more">open →</span>
          </div>
        </div>
      </article>`;
  }).join("");
  if (!list.length) $("#project-grid").innerHTML = `<p style="grid-column:1/-1;color:var(--ink-faint);font-family:var(--font-m)">nothing in this bin yet. check back — something's always cooking.</p>`;
  $("#grid-foot").textContent = `// ${list.length} project${list.length === 1 ? "" : "s"} shown — sorted by how much they taught me, not by alphabet`;
  document.querySelectorAll(".card").forEach((c) =>
    c.addEventListener("click", () => openModal(c.dataset.id))
  );
}

function renderWins() {
  $("#win-list").innerHTML = state.data.achievements.map((a) => `
    <li class="win-item">
      <span class="w-year">${a.year}</span>
      <div class="w-main">
        <span class="w-event">${a.event}</span>
        <h3>${a.title}</h3>
        <p>${a.detail}</p>
      </div>
      <span class="w-result ${/runner|best of/i.test(a.result) ? "amber" : ""}">${a.result}</span>
    </li>`).join("");
}

function openModal(id) {
  const x = state.data.projects.find((p) => p.id === id);
  if (!x) return;
  const hue = hueFor(x.category);
  $("#modal-svg").innerHTML = pcbSvg(x.id, x.title, hue);
  $("#modal-title").textContent = x.title;
  $("#modal-tag").textContent = `${x.tagline} — ${x.year} · ${x.category} · ${x.status}`;
  $("#modal-chips").innerHTML = x.tech.map((t) => `<span class="techchip">${t}</span>`).join("");
  $("#modal-desc").textContent = x.description;
  $("#modal-high").innerHTML = x.highlights.length
    ? x.highlights.map((h) => `<li>${h}</li>`).join("")
    : "";
  const links = [];
  if (x.links && x.links.github) links.push(`<a href="${x.links.github}" target="_blank" rel="noopener">github ↗</a>`);
  if (x.links && x.links.live) links.push(`<a href="${x.links.live}" target="_blank" rel="noopener">live ↗</a>`);
  $("#modal-links").innerHTML = links.join("");
  state.modal = $("#modal");
  state.modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeModal() {
  if (!state.modal) return;
  state.modal.hidden = true;
  document.body.style.overflow = "";
}

/* ---- copy button ---- */
function bindCopy() {
  const btn = $("#copy-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(btn.dataset.copy);
      btn.textContent = "copied ✓";
      setTimeout(() => { btn.textContent = btn.dataset.copy; }, 1600);
    } catch { window.prompt("copy this:", btn.dataset.copy); }
  });
}

/* ---- boot ---- */
(async function boot() {
  try {
    const res = await fetch("/api/data");
    state.data = await res.json();
    renderTopbar();
    renderMarquee();
    renderAbout();
    renderFilters();
    renderProjects();
    renderWins();
    bindCopy();
    $("#modal-close").addEventListener("click", closeModal);
    $("#modal").addEventListener("click", (e) => { if (e.target === $("#modal")) closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
    console.log("%cTheRowKneet, checking in. built by hand, no template.", "color:#c9f24b;font-family:monospace;font-size:12px");
  } catch (err) {
    console.error("site failed to load data:", err);
    $("#grid-foot").textContent = "data failed to load — is the server running? (node server.js)";
  }
})();
