/* ============================================================
   ProjectsHomeController — Projects home screen wiring
   ============================================================ */

import { toast } from "../app.js";
import { ProjectsDB } from "../db.js";
import { uuid } from "../utils/ui-helpers.js";
import { getBuiltInTemplates, getBuiltInSlideTemplates, getBuiltInTextLayouts } from "../data/templates.js";
import { FORMATS, FORMAT_GROUPS } from "../formats.js";

export class ProjectsHomeController {
  constructor({ projectService, canvas, slides, brands, exporter, onToast, onShowProjectsHome }) {
    this._projectService = projectService;
    this._canvas = canvas;
    this._slides = slides;
    this._brands = brands;
    this._exporter = exporter;
    this._onToast = onToast;
    this._onShowProjectsHome = onShowProjectsHome;
  }

  wire() {
    this._wireProjectsHome();
  }

  async render() {
    await this._renderProjectsHome();
  }

  async openProject(id) {
    await this._openProject(id);
  }

  show() {
    this._onShowProjectsHome(true);
  }

  hide() {
    this._onShowProjectsHome(false);
  }

  _wireProjectsHome() {
    document
      .getElementById("btn-new-project-single")
      ?.addEventListener("click", async () => {
        const name = prompt("Nome do projeto:");
        if (!name) return;
        await this._createProject(name, "single");
      });
    document
      .getElementById("btn-new-project-slides")
      ?.addEventListener("click", async () => {
        const name = prompt("Nome do projeto:");
        if (!name) return;
        await this._createProject(name, "slides");
      });
    document
      .getElementById("btn-templates-gallery")
      ?.addEventListener("click", () => this._openTemplatesModal());
    document
      .getElementById("btn-import-project-file")
      ?.addEventListener("click", () => {
        document.getElementById("project-file-input")?.click();
      });
    document
      .getElementById("project-file-input")
      ?.addEventListener("change", async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        await this._importProjectFromFile(file);
        e.target.value = "";
      });
    document
      .getElementById("btn-close-templates-modal")
      ?.addEventListener("click", () => {
        const m = document.getElementById("templates-modal");
        if (m) { m.classList.remove("open"); m.style.display = "none"; }
      });
    document
      .getElementById("btn-close-template-preview")
      ?.addEventListener("click", () => {
        const m = document.getElementById("template-preview-modal");
        if (m) { m.classList.remove("open"); m.style.display = "none"; }
      });
    document
      .getElementById("btn-cancel-template-preview")
      ?.addEventListener("click", () => {
        const m = document.getElementById("template-preview-modal");
        if (m) { m.classList.remove("open"); m.style.display = "none"; }
      });
  }

  _openTemplatesModal() {
    this._tplSelectedGroup = this._tplSelectedGroup || "instagram";
    this._tplSelectedFormat = this._tplSelectedFormat || null;
    this._tplViewMode = this._tplViewMode || "templates";
    const modal = document.getElementById("templates-modal");
    if (modal) { modal.style.display = "flex"; modal.classList.add("open"); }
    try {
      this._renderTemplatesGallery();
    } catch (e) {
      console.error("[Templates] Erro ao renderizar galeria:", e);
    }
  }

  _renderTemplatesGallery() {
    const mainTabs = document.getElementById("templates-main-tabs");
    const groupTabs = document.getElementById("templates-group-tabs");
    const formatTabs = document.getElementById("templates-format-tabs");
    const list = document.getElementById("templates-list");
    if (!mainTabs || !groupTabs || !formatTabs || !list) return;

    mainTabs.innerHTML = `
      <button class="tab-btn ${this._tplViewMode === 'templates' ? 'active' : ''}" data-view="templates">Templates</button>
      <button class="tab-btn ${this._tplViewMode === 'textLayouts' ? 'active' : ''}" data-view="textLayouts">Textos</button>
      <button class="tab-btn ${this._tplViewMode === 'slides' ? 'active' : ''}" data-view="slides">Slides</button>
    `;
    mainTabs.querySelectorAll("[data-view]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._tplViewMode = btn.dataset.view;
        this._tplSelectedFormat = null;
        this._renderTemplatesGallery();
      });
    });

    const groups = FORMAT_GROUPS.filter(g => g.id !== "custom");
    groupTabs.innerHTML = groups.map(g => `
      <button class="tab-btn sm ${this._tplSelectedGroup === g.id ? 'active' : ''}" data-group="${g.id}">${g.icon} ${g.label}</button>
    `).join("");
    groupTabs.querySelectorAll("[data-group]").forEach(btn => {
      btn.addEventListener("click", () => {
        this._tplSelectedGroup = btn.dataset.group;
        this._tplSelectedFormat = null;
        this._renderTemplatesGallery();
      });
    });

    const group = groups.find(g => g.id === this._tplSelectedGroup);
    if (group && group.formats.length > 1) {
      formatTabs.style.display = "flex";
      formatTabs.innerHTML = group.formats.map(fid => {
        const fmt = FORMATS[fid];
        if (!fmt) return "";
        return `<button class="tab-btn xs ${this._tplSelectedFormat === fid ? 'active' : ''}" data-format="${fid}">${fmt.icon || ""}</button>`;
      }).join("");
      formatTabs.querySelectorAll("[data-format]").forEach(btn => {
        btn.addEventListener("click", () => {
          this._tplSelectedFormat = btn.dataset.format;
          this._renderTemplatesGallery();
        });
      });
    } else {
      formatTabs.style.display = "none";
      formatTabs.innerHTML = "";
    }

    list.innerHTML = "";

    if (this._tplViewMode === "textLayouts") {
      const layouts = getBuiltInTextLayouts();
      layouts.forEach(layout => {
        list.appendChild(this._buildTemplateCard({ ...layout, formatId: layout.formatId || "ig-feed-square" }));
      });
    } else if (this._tplViewMode === "slides") {
      const slides = getBuiltInSlideTemplates();
      slides.forEach(tpl => {
        list.appendChild(this._buildSlideTemplateCard(tpl));
      });
    } else {
      const all = getBuiltInTemplates();
      const filtered = all.filter(t => {
        if (t.platform !== this._tplSelectedGroup) return false;
        if (this._tplSelectedFormat && t.formatId !== this._tplSelectedFormat) return false;
        return true;
      });
      filtered.forEach(tpl => {
        list.appendChild(this._buildTemplateCard(tpl));
      });
    }
  }

  _buildTemplateCard(tpl) {
    const card = document.createElement("div");
    card.className = "tpl-card";
    card.style.cssText = "border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;transition:0.15s;";
    const fmt = FORMATS[tpl.formatId] || {};
    card.innerHTML = `
      <div class="tpl-preview" style="background:#111;height:140px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;text-align:center;padding:8px;">${fmt.icon || "📐"} ${tpl.name || "Template"}</div>
      <div style="padding:8px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${tpl.name || ""}</div>
        <div style="font-size:10px;color:var(--text-muted);">${fmt.platformLabel || tpl.platform || ""} • ${fmt.label || ""}</div>
        ${tpl.description ? `<div style="font-size:10px;color:var(--text-disabled);margin-top:4px;">${tpl.description}</div>` : ""}
      </div>
    `;
    card.addEventListener("click", () => this._openTemplatePreview(tpl));
    return card;
  }

  _buildSlideTemplateCard(tpl) {
    const card = document.createElement("div");
    card.className = "tpl-card";
    card.style.cssText = "border:1px solid var(--border);border-radius:8px;overflow:hidden;cursor:pointer;transition:0.15s;";
    card.innerHTML = `
      <div class="tpl-preview" style="background:#111;height:140px;display:flex;align-items:center;justify-content:center;font-size:11px;color:#666;text-align:center;padding:8px;">🖥️ ${tpl.name || "Slide Template"}</div>
      <div style="padding:8px;">
        <div style="font-size:12px;font-weight:600;color:var(--text-primary);margin-bottom:4px;">${tpl.name || ""}</div>
        <div style="font-size:10px;color:var(--text-muted);">${(tpl.slides || []).length} slides</div>
      </div>
    `;
    card.addEventListener("click", () => this._openSlideTemplatePreview(tpl));
    return card;
  }

  async _openTemplatePreview(tpl) {
    const previewCanvas = document.getElementById("tpl-preview-canvas");
    const previewInfo = document.getElementById("tpl-preview-info");
    const previewLayers = document.getElementById("tpl-preview-layers");
    const previewName = document.getElementById("tpl-preview-name");
    const modal = document.getElementById("template-preview-modal");

    if (!previewCanvas || !modal) return;

    previewName.textContent = tpl.name || "Template";
    previewCanvas.innerHTML = `<div style="text-align:center;color:#666;padding:40px;">${tpl.description || tpl.name || ""}</div>`;
    previewInfo.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">${(tpl.layers || []).length} camadas</div>`;
    previewLayers.innerHTML = `<button id="btn-create-from-template" class="btn btn-primary" style="flex:1;">Criar Projeto</button>`;

    previewLayers.querySelector("#btn-create-from-template")?.addEventListener("click", async () => {
      await this._createProjectFromTemplate(tpl);
      modal.classList.remove("open");
      modal.style.display = "none";
    });

    modal.style.display = "flex";
    modal.classList.add("open");
  }

  async _openSlideTemplatePreview(tpl) {
    const previewCanvas = document.getElementById("tpl-preview-canvas");
    const previewInfo = document.getElementById("tpl-preview-info");
    const previewLayers = document.getElementById("tpl-preview-layers");
    const previewName = document.getElementById("tpl-preview-name");
    const modal = document.getElementById("template-preview-modal");

    if (!previewCanvas || !modal) return;

    previewName.textContent = tpl.name || "Slide Template";
    previewCanvas.innerHTML = `<div style="text-align:center;color:#666;padding:40px;">${(tpl.slides || []).length} slides</div>`;
    previewInfo.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">${(tpl.slides || []).length} slides</div>`;
    previewLayers.innerHTML = `<button id="btn-create-from-template" class="btn btn-primary" style="flex:1;">Criar Projeto</button>`;

    previewLayers.querySelector("#btn-create-from-template")?.addEventListener("click", async () => {
      await this._createProjectFromSlideTemplate(tpl);
      modal.classList.remove("open");
      modal.style.display = "none";
    });

    modal.style.display = "flex";
    modal.classList.add("open");
  }

  async _createProjectFromTemplate(tpl) {
    const projectId = uuid();
    const name = `${tpl.name || "Projeto"} (template)`;
    const state = {
      layers: structuredClone(tpl.layers || []),
      formatId: tpl.formatId || "ig-feed-square",
      background: structuredClone(tpl.background || { type: "solid", color: "#111111" }),
    };
    await ProjectsDB.save({
      id: projectId,
      name,
      mode: "single",
      brandId: this._brands.getCurrentBrandId(),
      slides: [{ id: uuid(), state }],
      activeSlideIndex: 0,
      coverThumbnail: null,
    });
    await this._openProject(projectId);
    await this._renderProjectsHome();
    const tplModal = document.getElementById("templates-modal");
    if (tplModal) { tplModal.classList.remove("open"); tplModal.style.display = "none"; }
  }

  async _createProjectFromSlideTemplate(tpl) {
    const projectId = uuid();
    const name = `${tpl.name || "Projeto"} (slides)`;
    const slides = (tpl.slides || []).map(s => ({
      id: uuid(),
      state: structuredClone(s.state || s),
    }));
    await ProjectsDB.save({
      id: projectId,
      name,
      mode: "slides",
      brandId: this._brands.getCurrentBrandId(),
      slides,
      activeSlideIndex: 0,
      coverThumbnail: null,
    });
    await this._openProject(projectId);
    await this._renderProjectsHome();
    const tplModal = document.getElementById("templates-modal");
    if (tplModal) { tplModal.classList.remove("open"); tplModal.style.display = "none"; }
  }

  async _createProject(name, mode = "slides") {
    const state = {
      formatId: "ig-feed-square",
      background: { type: "solid", color: "#000000", gradient: { type: "linear", from: "#000000", to: "#0e1a2e", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 }, image: null, imageSize: "cover" },
      layers: [],
    };
    const projectId = uuid();
    await ProjectsDB.save({
      id: projectId,
      name,
      mode,
      brandId: this._brands.getCurrentBrandId(),
      slides: [{ id: uuid(), state }],
      activeSlideIndex: 0,
      coverThumbnail: null,
    });
    await this._openProject(projectId);
    await this._renderProjectsHome();
  }

  async _renderProjectsHome() {
    const grid = document.getElementById("projects-grid");
    if (!grid) return;
    let projects = [];
    try {
      projects = await this._projectService.getAll();
    } catch(e) {
      console.error("[PG] Erro ao carregar projetos:", e);
      grid.innerHTML = '<div class="projects-empty">Erro ao carregar projetos. Verifique o console.</div>';
      return;
    }
    if (!projects.length) {
      grid.innerHTML =
        '<div class="projects-empty">Nenhum projeto ainda. Crie um novo projeto para começar.</div>';
      return;
    }
    projects.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    grid.innerHTML = "";
    projects.forEach((project) => {
      const card = document.createElement("button");
      card.className = "project-card";
      const slidesCount = (project.slides ?? []).length;
      const cover = project.coverThumbnail
        ? `<img class="project-card-thumb" src="${project.coverThumbnail}" alt="${project.name}">`
        : `<div class="project-card-thumb project-card-thumb-empty">Sem capa</div>`;
      card.innerHTML = `
        ${cover}
        <div class="project-card-meta">
          <div class="project-card-top">
          <div class="project-card-name">${project.name}</div>
          <button class="project-card-rename" data-export-project="${project.id}" title="Exportar projeto (.json)">⇩</button>
          <button class="project-card-rename" data-share-link-project="${project.id}" title="Gerar link de compartilhamento">🔗</button>
          <button class="project-card-rename" data-duplicate-project="${project.id}" title="Duplicar projeto">⧉</button>
          <button class="project-card-rename" data-rename-project="${project.id}" title="Renomear projeto">✎</button>
          <button class="project-card-delete" data-delete-project="${project.id}" title="Excluir projeto">×</button>
          </div>
          <div class="project-card-sub">${slidesCount} slide${slidesCount === 1 ? "" : "s"} • ${project.mode === "single" ? "Imagem única" : "Carrossel"}</div>
        </div>
      `;
      card.addEventListener("click", async () => {
        await this._openProject(project.id);
      });
      card
        .querySelector(`[data-export-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._exportProjectToFile(project.id);
        });
      card
        .querySelector(`[data-share-link-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._generateProjectShareLink(project.id);
        });
      card
        .querySelector(`[data-duplicate-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._duplicateProject(project.id, project.name);
        });
      card
        .querySelector(`[data-rename-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          await this._renameProject(project.id, project.name);
        });
      card
        .querySelector(`[data-delete-project]`)
        ?.addEventListener("click", async (e) => {
          e.preventDefault();
          e.stopPropagation();
          const ok = confirm(`Deseja excluir o projeto "${project.name}"?`);
          if (!ok) return;
          await this._deleteProject(project.id);
        });
      grid.appendChild(card);
    });
  }

  async _deleteProject(projectId) {
    if (!projectId) return;
    await this._projectService.delete(projectId);
    this._onShowProjectsHome(true);
    await this._renderProjectsHome();
    this._onToast("Projeto excluído.", "success");
  }

  async _renameProject(projectId, currentName = "") {
    if (!projectId) return;
    const nextName = prompt("Novo nome do projeto:", currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    const project = await this._projectService.get(projectId);
    if (!project) return;
    await ProjectsDB.save({
      ...project,
      name: nextName,
    });
    await this._renderProjectsHome();
    this._onToast("Projeto renomeado.", "success");
  }

  async _duplicateProject(projectId, currentName = "") {
    if (!projectId) return;
    const newName = prompt(
      "Nome do projeto duplicado:",
      `${currentName} (cópia)`,
    )?.trim();
    if (!newName) return;
    const project = await this._projectService.get(projectId);
    if (!project) return;
    const now = new Date().toISOString();
    await ProjectsDB.save({
      ...project,
      id: uuid(),
      name: newName,
      createdAt: now,
      updatedAt: now,
    });
    await this._renderProjectsHome();
    this._onToast(`Projeto "${newName}" criado.`, "success");
  }

  async _exportProjectToFile(projectId) {
    const project = await this._projectService.get(projectId);
    if (!project) {
      this._onToast("Projeto não encontrado.", "error");
      return;
    }
    const payload = {
      schema: "postgenerate-project-v2",
      exportedAt: new Date().toISOString(),
      project: { ...project },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name.replace(/[^a-z0-9]/gi, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this._onToast("Projeto exportado.", "success");
  }

  async _generateProjectShareLink(projectId) {
    if (!projectId) return;
    try {
      const project = await this._projectService.get(projectId);
      if (!project) return;
      const code = project.id;
      const url = new URL(window.location.origin + window.location.pathname);
      url.hash = `share=${encodeURIComponent(code)}`;
      const link = url.toString();
      try {
        await navigator.clipboard?.writeText(link);
        this._onToast("Link de compartilhamento copiado.", "success");
      } catch {
        window.prompt("Copie o link do projeto:", link);
      }
    } catch (e) {
      this._onToast("Erro ao gerar link do projeto.", "error");
      console.error(e);
    }
  }

  async _importProjectFromFile(file) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const project = data.project || data;
      if (!project?.id || !project?.slides) {
        throw new Error("Formato de arquivo inválido.");
      }
      project.id = uuid();
      project.name = `${project.name || "Projeto"} (importado)`;
      project.createdAt = new Date().toISOString();
      project.updatedAt = new Date().toISOString();
      await ProjectsDB.save(project);
      await this._renderProjectsHome();
      this._onToast("Projeto importado.", "success");
    } catch (e) {
      this._onToast("Erro ao importar projeto.", "error");
      console.error(e);
    }
  }

  async _openProject(projectId, opts = {}) {
    if (!projectId) return;
    const project = await this._projectService.get(projectId);
    if (!project) return;
    const ok = await this._projectService.open(projectId);
    if (!ok) return;
    requestAnimationFrame(() => this._fitCanvas());
    this._updateFormatBadge(this._canvas.getState().formatId);
    this._updateProjectNameLabel(project.name);
    const saveBtn = document.getElementById("btn-save-project");
    if (saveBtn) saveBtn.style.display = "";
    this._onShowProjectsHome(false);
  }

  _fitCanvas() {
    const area = document.getElementById("canvas-preview-area");
    if (!area) return;
    const pad = 48;
    const availW = area.clientWidth - pad;
    const availH = area.clientHeight - pad;
    this._canvas.setPreviewSize(availW, availH);
  }

  _updateFormatBadge(fmtId) {
    const badge = document.getElementById("format-badge");
    if (badge) badge.textContent = fmtId || "";
  }

  _updateProjectNameLabel(name) {
    const el = document.getElementById("project-name-label");
    if (!el) return;
    if (name) {
      el.textContent = name;
      return;
    }
    el.textContent = this._currentProjectId ? "Projeto" : "Sem projeto";
  }
}
