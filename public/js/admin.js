"use strict";
/* admin.js — TheRowKneet control room */

const $ = (s, el = document) => el.querySelector(s);
const state = { token: localStorage.getItem("rk_token") || null, editing: null };

async function api(path, opts = {}) {
  const headers = { "Content-Type": "application/json" };
  if (state.token) headers["X-Auth-Token"] = state.token;
  const res = await fetch(path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  if (res.status === 401) { logout(); throw new Error("session expired — log in again"); }
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || "request failed");
  return body;
}

function logout() { state.token = null; localStorage.removeItem("rk_token"); document.getElementById("admin-view").classList.add("hidden"); document.getElementById("login-view").classList.remove("hidden"); }

function setMsg(text, ok) {
  const m = $("#admin-msg");
  if (!m) return;
  m.textContent = text;
  m.className = "msg " + (ok ? "ok" : "err");
  if (text) setTimeout(() => { m.textContent = ""; }, 4000);
}

/* ---------- login ---------- */
$("#login-btn").addEventListener("click", async () => {
  const pw = $("#pw").value;
  const msg = $("#login-msg");
  try {
    const r = await api("/api/login", { method: "POST", body: JSON.stringify({ password: pw }) });
    state.token = r.token;
    localStorage.setItem("rk_token", r.token);
    document.getElementById("login-view").classList.add("hidden");
    document.getElementById("admin-view").classList.remove("hidden");
    bootAdmin();
  } catch (e) {
    msg.textContent = e.message;
    msg.className = "msg err";
  }
});
$("#pw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#login-btn").click(); });
$("#logout-btn").addEventListener("click", logout);

/* ---------- list renderers ---------- */
function renderProjectList(data) {
  $("#project-list").innerHTML = data.projects.map((p) => `
    <div class="row">
      <div>
        <div class="r-title">${p.title} <span style="color:var(--lime);font-family:var(--font-m);font-size:.7rem">${p.featured ? "[featured]" : ""}</span></div>
        <div class="r-sub">${p.category} · ${p.year} · ${p.status} · ${p.id}</div>
      </div>
      <div class="r-actions">
        <button class="mini" data-editp="${p.id}">edit</button>
        <button class="mini danger" data-delp="${p.id}">delete</button>
      </div>
    </div>`).join("") || "<p style='font-family:var(--font-m);font-size:.8rem;color:var(--ink-faint)'>no projects yet.</p>";

  document.querySelectorAll("[data-editp]").forEach((b) => b.addEventListener("click", () => showProjectForm(findProject(b.dataset.editp))));
  document.querySelectorAll("[data-delp]").forEach((b) => b.addEventListener("click", () => deleteProject(b.dataset.delp)));
}

function renderAchList(data) {
  $("#ach-list").innerHTML = data.achievements.map((a) => `
    <div class="row">
      <div>
        <div class="r-title">${a.title}</div>
        <div class="r-sub">${a.event} · ${a.year} · ${a.result}</div>
      </div>
      <div class="r-actions">
        <button class="mini" data-edita="${a.id}">edit</button>
        <button class="mini danger" data-dela="${a.id}">delete</button>
      </div>
    </div>`).join("") || "<p style='font-family:var(--font-m);font-size:.8rem;color:var(--ink-faint)'>no wins logged yet. (i know you've won something.)</p>";

  document.querySelectorAll("[data-edita]").forEach((b) => b.addEventListener("click", () => showAchForm(findAch(b.dataset.edita))));
  document.querySelectorAll("[data-dela]").forEach((b) => b.addEventListener("click", () => deleteAch(b.dataset.dela)));
}

/* ---------- project form ---------- */
function showProjectForm(p) {
  state.editing = p || null;
  const f = $("#project-form");
  f.classList.remove("hidden");
  const v = p || { title: "", tagline: "", category: "IoT & Security", year: new Date().getFullYear(), status: "built", tech: [], description: "", highlights: [], image: "", featured: false, links: {} };
  f.innerHTML = `
    <div class="form-grid">
      <div class="field"><label>title</label><input id="pf-title" value="${esc(v.title)}"></div>
      <div class="field"><label>tagline</label><input id="pf-tagline" value="${esc(v.tagline)}"></div>
      <div class="field"><label>category</label><input id="pf-cat" value="${esc(v.category)}"></div>
      <div class="field"><label>year</label><input id="pf-year" value="${esc(String(v.year))}"></div>
      <div class="field"><label>status</label>
        <select id="pf-status">
          ${["award-winning","shipped","market-launched","major project","in development","in progress","built","concept","experimental","prototype","tool","fun","side quest","proposal"].map((s) => `<option ${v.status === s ? "selected" : ""}>${s}</option>`).join("")}
        </select>
      </div>
      <div class="field"><label>tech (comma separated)</label><input id="pf-tech" value="${esc((v.tech || []).join(", "))}"></div>
      <div class="field full"><label>description</label><textarea id="pf-desc">${esc(v.description)}</textarea></div>
      <div class="field full"><label>highlights (comma separated)</label><input id="pf-high" value="${esc((v.highlights || []).join(", "))}"></div>
      <div class="field"><label>github link</label><input id="pf-gh" value="${esc((v.links || {}).github || "")}"></div>
      <div class="field"><label>live link</label><input id="pf-live" value="${esc((v.links || {}).live || "")}"></div>
      <div class="field full"><label>image (upload)</label><input type="file" id="pf-file" accept="image/*"><img class="up-photo" id="pf-preview" src="${v.image ? v.image : "/images/logo.svg"}" alt="preview"></div>
      <div class="field"><label>featured</label><select id="pf-feat"><option value="no" ${v.featured ? "" : "selected"}>no</option><option value="yes" ${v.featured ? "selected" : ""}>yes</option></select></div>
    </div>
    <div class="form-actions">
      <button class="btn solid" id="pf-save">${p ? "save changes" : "add project"}</button>
      <button class="btn ghost" id="pf-cancel">cancel</button>
      <span class="msg" id="pf-msg"></span>
    </div>`;
  $("#pf-cancel").addEventListener("click", () => f.classList.add("hidden"));
  $("#pf-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const buf = await file.arrayBuffer();
    const b64 = btoa(new Uint8Array(buf).reduce((s, b) => s + String.fromCharCode(b), ""));
    try {
      const r = await api("/api/upload", { method: "POST", body: JSON.stringify({ name: file.name, dataUrl: `data:${file.type};base64,${b64}` }) });
      $("#pf-preview").src = r.url;
      $("#pf-preview").dataset.url = r.url;
    } catch (err) { $("#pf-msg").textContent = err.message; $("#pf-msg").className = "msg err"; }
  });
  $("#pf-save").addEventListener("click", async () => {
    const payload = {
      title: $("#pf-title").value.trim(),
      tagline: $("#pf-tagline").value.trim(),
      category: $("#pf-cat").value.trim() || "Other",
      year: parseInt($("#pf-year").value) || new Date().getFullYear(),
      status: $("#pf-status").value,
      tech: $("#pf-tech").value.split(",").map((s) => s.trim()).filter(Boolean),
      description: $("#pf-desc").value.trim(),
      highlights: $("#pf-high").value.split(",").map((s) => s.trim()).filter(Boolean),
      image: ($("#pf-preview").dataset.url || ($("#pf-preview").src && !$("#pf-preview").src.startsWith("data:") ? $("#pf-preview").src : "")) || null,
      featured: $("#pf-feat").value === "yes",
      links: { github: $("#pf-gh").value.trim() || undefined, live: $("#pf-live").value.trim() || undefined },
    };
    if (!payload.title) return setMsg("a project needs a title, mate.");
    try {
      if (state.editing) await api(`/api/projects/${state.editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/projects", { method: "POST", body: JSON.stringify(payload) });
      f.classList.add("hidden");
      setMsg(state.editing ? "project updated ✓" : "project added ✓", true);
      await refresh();
    } catch (err) { setMsg(err.message, false); }
  });
}

function findProject(id) { return lastData.projects.find((x) => x.id === id); }
function findAch(id) { return lastData.achievements.find((x) => x.id === id); }

async function deleteProject(id) {
  if (!confirm("delete this project? this can't be undone.")) return;
  try { await api(`/api/projects/${id}`, { method: "DELETE" }); setMsg("project deleted.", true); await refresh(); }
  catch (err) { setMsg(err.message, false); }
}

/* ---------- achievement form ---------- */
function showAchForm(a) {
  state.editing = a || null;
  const f = $("#ach-form");
  f.classList.remove("hidden");
  const v = a || { event: "", title: "", year: new Date().getFullYear(), result: "Winner", detail: "" };
  f.innerHTML = `
    <div class="form-grid">
      <div class="field"><label>event</label><input id="af-event" value="${esc(v.event)}"></div>
      <div class="field"><label>year</label><input id="af-year" value="${esc(String(v.year))}"></div>
      <div class="field"><label>title / project</label><input id="af-title" value="${esc(v.title)}"></div>
      <div class="field"><label>result</label><input id="af-result" value="${esc(v.result)}"></div>
      <div class="field full"><label>detail</label><textarea id="af-detail">${esc(v.detail)}</textarea></div>
    </div>
    <div class="form-actions">
      <button class="btn solid" id="af-save">${a ? "save changes" : "add win"}</button>
      <button class="btn ghost" id="af-cancel">cancel</button>
      <span class="msg" id="af-msg"></span>
    </div>`;
  $("#af-cancel").addEventListener("click", () => f.classList.add("hidden"));
  $("#af-save").addEventListener("click", async () => {
    const payload = {
      event: $("#af-event").value.trim(),
      title: $("#af-title").value.trim(),
      year: parseInt($("#af-year").value) || new Date().getFullYear(),
      result: $("#af-result").value.trim(),
      detail: $("#af-detail").value.trim(),
    };
    if (!payload.title || !payload.event) return setMsg("event + title are required.");
    try {
      if (state.editing) await api(`/api/achievements/${state.editing.id}`, { method: "PUT", body: JSON.stringify(payload) });
      else await api("/api/achievements", { method: "POST", body: JSON.stringify(payload) });
      f.classList.add("hidden");
      setMsg(state.editing ? "win updated ✓" : "win logged ✓", true);
      await refresh();
    } catch (err) { setMsg(err.message, false); }
  });
}

async function deleteAch(id) {
  if (!confirm("delete this win?")) return;
  try { await api(`/api/achievements/${id}`, { method: "DELETE" }); setMsg("win deleted.", true); await refresh(); }
  catch (err) { setMsg(err.message, false); }
}

let lastData = null;
async function refresh() {
  lastData = await api("/api/data");
  renderProjectList(lastData);
  renderAchList(lastData);
}

function esc(s) { return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

function bootAdmin() {
  $("#new-project-btn").addEventListener("click", () => { $("#ach-form").classList.add("hidden"); showProjectForm(null); });
  $("#new-ach-btn").addEventListener("click", () => { $("#project-form").classList.add("hidden"); showAchForm(null); });
  refresh().then(() => {
    if (state.token) {
      document.getElementById("login-view").classList.add("hidden");
      document.getElementById("admin-view").classList.remove("hidden");
    }
  });
}

if (state.token) {
  document.getElementById("login-view").classList.add("hidden");
  document.getElementById("admin-view").classList.remove("hidden");
  bootAdmin();
}
