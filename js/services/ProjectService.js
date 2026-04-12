/* ============================================================
   ProjectService — Project CRUD operations
   Extracted from app.js following SOLID (Single Responsibility)
   ============================================================ */

import { ProjectsDB } from "../db.js";
import { uuid } from "../utils/ui-helpers.js";

export class ProjectService {
  constructor(canvas, slides, brands, exporter) {
    this._canvas = canvas;
    this._slides = slides;
    this._brands = brands;
    this._exporter = exporter;
    this._currentProjectId = null;
    this._loadingProject = false;
    this._projectDirty = false;
    this._shareReadOnly = false;
    this._autoSaveInterval = null;
    this._setupAutoSave();
  }

  _setupAutoSave() {
    this._autoSaveInterval = setInterval(async () => {
      if (this._projectDirty && !this._loadingProject && this._currentProjectId && !this._shareReadOnly) {
        try { await this.save(); } catch (e) { console.error("[AutoSave] error:", e); }
      }
    }, 15000);
  }

  get currentProjectId() { return this._currentProjectId; }
  get isLoading() { return this._loadingProject; }
  get isDirty() { return this._projectDirty; }
  get isReadOnly() { return this._shareReadOnly; }

  setLoading(val) { this._loadingProject = val; }
  setDirty(val) { this._projectDirty = val; }
  setReadOnly(val) { this._shareReadOnly = !!val; }

  async create(name, mode = "single") {
    const { createDefaultState } = await import("../canvas-engine.js");
    const state = createDefaultState();
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
    return projectId;
  }

  async open(projectId) {
    if (!projectId) return false;
    const project = await ProjectsDB.get(projectId);
    if (!project) return false;
    this._loadingProject = true;
    this._currentProjectId = project.id;
    if (project.brandId) await this._brands.setCurrentBrand(project.brandId);
    await this._slides.loadSlides(project.slides ?? [], project.activeSlideIndex ?? 0);
    this._loadingProject = false;
    this._projectDirty = false;
    return true;
  }

  async save() {
    if (this._loadingProject || !this._currentProjectId || this._shareReadOnly) return;
    const project = await ProjectsDB.get(this._currentProjectId);
    if (!project) return;
    const slides = this._slides.getSlides().map((s) => ({
      id: s.id,
      state: structuredClone(s.state),
      caption: s.caption ?? "",
    }));
    let coverThumbnail = project.coverThumbnail ?? null;
    try {
      coverThumbnail = await this._exporter.generateThumbnail(220);
    } catch (e) {
      console.warn("Thumbnail não gerado:", e);
    }
    await ProjectsDB.save({
      ...project,
      slides,
      activeSlideIndex: this._slides.getActiveIndex(),
      brandId: this._brands.getCurrentBrandId(),
      coverThumbnail,
    });
    this._projectDirty = false;
  }

  async delete(projectId) {
    if (!projectId) return;
    await ProjectsDB.delete(projectId);
    if (this._currentProjectId === projectId) {
      this._currentProjectId = null;
    }
  }

  async duplicate(projectId, currentName = "") {
    if (!projectId) return null;
    const newName = prompt("Nome do projeto duplicado:", `${currentName} (cópia)`)?.trim();
    if (!newName) return null;
    const project = await ProjectsDB.get(projectId);
    if (!project) return null;
    const now = new Date().toISOString();
    const newId = uuid();
    await ProjectsDB.save({
      ...project,
      id: newId,
      name: newName,
      createdAt: now,
      updatedAt: now,
    });
    return newId;
  }

  async rename(projectId, currentName = "") {
    if (!projectId) return;
    const nextName = prompt("Novo nome do projeto:", currentName)?.trim();
    if (!nextName || nextName === currentName) return;
    const project = await ProjectsDB.get(projectId);
    if (!project) return;
    await ProjectsDB.save({ ...project, name: nextName });
  }

  async getAll() {
    return await ProjectsDB.getAll();
  }

  async get(projectId) {
    return await ProjectsDB.get(projectId);
  }

  async getCurrent() {
    if (!this._currentProjectId) return null;
    return await ProjectsDB.get(this._currentProjectId);
  }

  getCurrentName() {
    const el = document.getElementById("project-name-label");
    if (!el) return "Projeto";
    return el.textContent.replace(" • Somente leitura", "").trim() || "Projeto";
  }

  getCurrentMode() {
    return this._slides.getSlides().length > 1 ? "slides" : "single";
  }

  clearCurrent() {
    this._currentProjectId = null;
    this._projectDirty = false;
  }
}
