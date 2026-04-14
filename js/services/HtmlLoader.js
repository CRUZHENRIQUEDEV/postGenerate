/* ============================================================
   HtmlLoader — Loads HTML partials and assembles the app shell.
   Partials live in html/partials/ so index.html stays minimal.
   ============================================================ */

const PARTIALS_BASE = "html/partials";

async function fetchText(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load partial: ${url} (${res.status})`);
  return res.text();
}

function appendHTML(parent, html) {
  const tpl = document.createElement("template");
  tpl.innerHTML = String(html ?? "").trim();
  parent.appendChild(tpl.content);
}

export async function loadPartials() {
  const [projectsHome, header, sidebar, canvasArea, propsPanel, modals] =
    await Promise.all([
      fetchText(`${PARTIALS_BASE}/projects-home.html`),
      fetchText(`${PARTIALS_BASE}/header.html`),
      fetchText(`${PARTIALS_BASE}/sidebar.html`),
      fetchText(`${PARTIALS_BASE}/canvas-area.html`),
      fetchText(`${PARTIALS_BASE}/properties-panel.html`),
      fetchText(`${PARTIALS_BASE}/modals.html`),
    ]);

  document.body.innerHTML = "";
  appendHTML(document.body, projectsHome);
  const app = document.createElement("div");
  app.id = "app";
  document.body.appendChild(app);
  appendHTML(app, header);
  appendHTML(app, sidebar);
  appendHTML(app, canvasArea);
  appendHTML(app, propsPanel);
  appendHTML(document.body, modals);
}
