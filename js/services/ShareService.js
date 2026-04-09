/* ============================================================
   ShareService — Share code/link generation
   ============================================================ */

import { shareCode } from "../../network/ShareCodeManager.js";

export class ShareService {
  constructor(projectService, brands) {
    this._projectService = projectService;
    this._brands = brands;
  }

  async generateProjectCode(projectId, permission = "edit") {
    return await shareCode.generateProjectCode(projectId, permission);
  }

  async generateBrandCode(brandId, permission = "edit") {
    return await shareCode.generateBrandCode(brandId, permission);
  }

  parseCode(code) {
    return shareCode.parseCode(code);
  }

  async generateProjectLink(projectId, permission = "view", options = {}) {
    if (!projectId) return null;
    const code = await this.generateProjectCode(projectId, permission);
    const url = new URL(window.location.origin + window.location.pathname);
    url.hash = `share=${encodeURIComponent(code)}`;
    const link = url.toString();
    if (options.copyToClipboard !== false) {
      try {
        await navigator.clipboard?.writeText(link);
      } catch {
        window.prompt("Copie o link do projeto:", link);
      }
    }
    return link;
  }

  buildShareEnvelope(scope, payload, permission = "edit") {
    return shareCode.buildCode ? shareCode.buildCode(scope, payload, permission) : { scope, payload, permission };
  }
}
