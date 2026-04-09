/* ============================================================
   ShareModalController — Share modal wiring
   ============================================================ */

import { toast } from "../app.js";

export class ShareModalController {
  constructor({ shareService, projectService, brands }) {
    this._shareService = shareService;
    this._projectService = projectService;
    this._brands = brands;
  }

  wire() {
    this._wireShareModal();
  }

  init() {
    this._consumeShareLinkFromURL();
  }

  closeShareModal() {
    this._closeShareModal();
  }

  _openShareModal() {
    document.getElementById("share-code-output").value = "";
    const linkEl = document.getElementById("share-link-output");
    if (linkEl) linkEl.value = "";
    document.getElementById("share-modal")?.classList.add("open");
  }

  _closeShareModal() {
    document.getElementById("share-modal")?.classList.remove("open");
  }

  _wireShareModal() {
    document
      .getElementById("btn-close-share-modal")
      ?.addEventListener("click", () => this._closeShareModal());
    document.getElementById("share-modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "share-modal") this._closeShareModal();
    });
    document
      .getElementById("btn-generate-share-code")
      ?.addEventListener("click", async () => {
        await this._generateShareCode();
      });
    document
      .getElementById("btn-copy-share-code")
      ?.addEventListener("click", async () => {
        const el = document.getElementById("share-code-output");
        const value = el?.value?.trim();
        if (!value) {
          toast("Gere um código antes de copiar.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(value);
          toast("Código copiado.", "success");
        } catch {
          toast("Não foi possível copiar automaticamente.", "error");
        }
      });
    document
      .getElementById("btn-generate-share-link")
      ?.addEventListener("click", async () => {
        const scope =
          document.getElementById("share-scope")?.value ?? "project";
        if (scope !== "project") {
          toast("Link disponível apenas para projeto.", "info");
          return;
        }
        const permission =
          document.getElementById("share-permission")?.value ?? "edit";
        const link = await this._generateProjectShareLink(
          permission,
          { copyToClipboard: false, silent: true },
        );
        if (!link) return;
        document.getElementById("share-link-output").value = link;
        toast("Link de compartilhamento gerado.", "success");
      });
    document
      .getElementById("btn-copy-share-link")
      ?.addEventListener("click", async () => {
        const link = document
          .getElementById("share-link-output")
          ?.value?.trim();
        if (!link) {
          toast("Gere um link antes de copiar.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(link);
          toast("Link copiado.", "success");
        } catch {
          toast("Não foi possível copiar automaticamente.", "error");
        }
      });
    document
      .getElementById("btn-apply-share-code")
      ?.addEventListener("click", async () => {
        await this._applyShareCode();
      });
  }

  async _generateShareCode() {
    const scope = document.getElementById("share-scope")?.value ?? "project";
    const permission =
      document.getElementById("share-permission")?.value ?? "edit";
    try {
      let code = "";
      if (scope === "project") {
        code = await this._shareService.generateProjectCode(
          this._projectService._currentProjectId,
          permission,
        );
      } else {
        const brandId = this._brands.getCurrentBrandId();
        if (!brandId) {
          toast("Selecione uma marca para compartilhar.", "error");
          return;
        }
        code = await this._shareService.generateBrandCode(brandId, permission);
      }
      document.getElementById("share-code-output").value = code;
      toast("Código de compartilhamento gerado.", "success");
    } catch (e) {
      toast("Erro ao gerar código de compartilhamento.", "error");
      console.error(e);
    }
  }

  async _generateProjectShareLink(
    permission = "view",
    { copyToClipboard = true, silent = false } = {},
  ) {
    const projectId = this._projectService._currentProjectId;
    if (!projectId) return;
    try {
      const code = await this._shareService.generateProjectCode(projectId, permission);
      const url = new URL(window.location.origin + window.location.pathname);
      url.hash = `share=${encodeURIComponent(code)}`;
      const link = url.toString();
      if (copyToClipboard) {
        try {
          await navigator.clipboard?.writeText(link);
          if (!silent) toast("Link de compartilhamento copiado.", "success");
        } catch {
          window.prompt("Copie o link do projeto:", link);
        }
      }
      return link;
    } catch (e) {
      if (!silent) toast("Erro ao gerar link do projeto.", "error");
      console.error(e);
      return null;
    }
  }

  async _applyShareCode() {
    const raw = document.getElementById("share-code-input")?.value?.trim();
    if (!raw) {
      toast("Cole um código para importar.", "error");
      return;
    }
    try {
      const envelope = this._shareService.parseCode(raw);
      await this._applyShareEnvelope(envelope);
      this._closeShareModal();
      toast(
        envelope.permission === "view"
          ? "Material compartilhado aberto em modo visualização."
          : "Material compartilhado importado com edição liberada.",
        "success",
      );
    } catch (e) {
      toast("Código de compartilhamento inválido.", "error");
      console.error(e);
    }
  }

  async _applyShareEnvelope(envelope) {
    if (envelope.scope === "project") {
      const source = envelope.payload?.project;
      if (!source) throw new Error("Projeto inválido no código.");
      const importedId = crypto.randomUUID();
      const imported = {
        ...source,
        id: importedId,
        name: `${source.name || "Projeto"} (compartilhado)`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await this._projectService.save(imported);
    } else {
      await this._importSharedBrand(envelope);
    }
  }

  async _importSharedBrand(envelope) {
    const data = envelope.payload ?? {};
    const sourceBrand = data.brand;
    if (!sourceBrand) throw new Error("Marca inválida no código.");
    const newBrandId = crypto.randomUUID();
    const now = new Date().toISOString();
    await this._brands.addBrand({
      id: newBrandId,
      name: `${sourceBrand.name || "Marca"} (compartilhada)`,
      palette: sourceBrand.palette ?? [],
      logo: sourceBrand.logo ?? null,
      fontIds: [],
      createdAt: now,
      updatedAt: now,
    });
    await this._brands.init();
    await this._brands.setCurrentBrand(newBrandId);
  }

  async _consumeShareLinkFromURL() {
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams((url.hash || "").replace(/^#/, ""));
    const raw = hashParams.get("share") || url.searchParams.get("share") || "";
    if (!raw) return;
    try {
      const envelope = this._shareService.parseCode(raw);
      await this._applyShareEnvelope(envelope);
      toast(
        envelope.permission === "view"
          ? "Projeto compartilhado aberto por link (somente leitura)."
          : "Projeto compartilhado aberto por link.",
        "success",
      );
    } catch (e) {
      toast("Link de compartilhamento inválido.", "error");
      console.error(e);
    } finally {
      url.searchParams.delete("share");
      url.hash = "";
      history.replaceState({}, "", url.toString());
    }
  }
}
