import {
  BrandsDB,
  FontsDB,
  AssetsDB,
  PresetsDB,
  PostHistoryDB,
  ProjectsDB,
  BrandDocsDB,
} from "../js/db.js";

const SHARE_VERSION = 1;

export class ShareCodeManager {
  async generateProjectCode(projectId, permission = "edit") {
    const project = await ProjectsDB.get(projectId);
    if (!project) throw new Error("Projeto não encontrado.");
    const envelope = {
      v: SHARE_VERSION,
      scope: "project",
      permission: permission === "view" ? "view" : "edit",
      payload: {
        project,
      },
      createdAt: new Date().toISOString(),
    };
    return this._encode(envelope);
  }

  async generateBrandCode(brandId, permission = "edit") {
    const brand = await BrandsDB.get(brandId);
    if (!brand) throw new Error("Marca não encontrada.");
    const [fonts, assets, presets, history, projects, docs] = await Promise.all(
      [
        FontsDB.getByBrand(brandId),
        AssetsDB.getByBrand(brandId),
        PresetsDB.getByBrand(brandId),
        PostHistoryDB.getByBrand(brandId),
        ProjectsDB.getByBrand(brandId),
        BrandDocsDB.getByBrand(brandId),
      ],
    );
    const envelope = {
      v: SHARE_VERSION,
      scope: "brand",
      permission: permission === "view" ? "view" : "edit",
      payload: {
        brand,
        fonts,
        assets,
        presets,
        history,
        projects,
        docs,
      },
      createdAt: new Date().toISOString(),
    };
    return this._encode(envelope);
  }

  parseCode(code) {
    const raw = String(code ?? "").trim();
    if (!raw) throw new Error("Código vazio.");
    const envelope = this._decode(raw);
    if (envelope?.v !== SHARE_VERSION) {
      throw new Error("Versão de código não suportada.");
    }
    if (!["project", "brand"].includes(envelope.scope)) {
      throw new Error("Escopo de compartilhamento inválido.");
    }
    if (!["view", "edit"].includes(envelope.permission)) {
      throw new Error("Permissão inválida.");
    }
    return envelope;
  }

  _encode(data) {
    const json = JSON.stringify(data);
    return btoa(unescape(encodeURIComponent(json)));
  }

  _decode(code) {
    const json = decodeURIComponent(escape(atob(code)));
    return JSON.parse(json);
  }
}

export const shareCode = new ShareCodeManager();
