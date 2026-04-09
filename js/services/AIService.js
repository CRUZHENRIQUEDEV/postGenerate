/* ============================================================
   AIService — AI chat, generation and template handling
   ============================================================ */

import { toast } from "../app.js";
import { uuid } from "../utils/ui-helpers.js";
import {
  PresetsDB,
  AIConfigDB,
  BrandDocsDB,
} from "../db.js";

export class AIService {
  constructor({
    canvas,
    brands,
    slides,
    icons,
    aiEngine,
    PresetsDB,
    AIConfigDB,
    BrandDocsDB,
    FORMATS,
    makeIconLayer,
    makeTextLayer,
    onFitCanvas,
    onUpdateFormatBadge,
    onUpdateGradientBar,
  }) {
    this._canvas = canvas;
    this._brands = brands;
    this._slides = slides;
    this._icons = icons;
    this._aiEngine = aiEngine;
    this._FORMATS = FORMATS;
    this._makeIconLayer = makeIconLayer;
    this._makeTextLayer = makeTextLayer;
    this._onFitCanvas = onFitCanvas;
    this._onUpdateFormatBadge = onUpdateFormatBadge;
    this._onUpdateGradientBar = onUpdateGradientBar;

    this._aiChatHistory = [];
    this._aiBusy = false;
    this._aiTyping = false;
    this._aiPendingResponse = null;
    this._aiPendingCursor = 0;
    this._aiUndoStack = [];
    this._aiSideOpen = false;
    this._aiBasePresetId = "";
    this._aiPresetsCache = [];
    this._aiDocs = [];
    this._aiConfigId = null;
    this._aiUseDocsContext = true;
    this._aiModalBound = false;
  }

  get chatHistory() { return this._aiChatHistory; }
  get pendingResponse() { return this._aiPendingResponse; }
  get isBusy() { return this._aiBusy; }
  get isTyping() { return this._aiTyping; }
  get sideOpen() { return this._aiSideOpen; }
  get basePresetId() { return this._aiBasePresetId; }

  wire() {
    if (this._aiModalBound) return;
    this._aiModalBound = true;
    document
      .getElementById("btn-close-ai-modal")
      ?.addEventListener("click", () => {
        document.getElementById("ai-modal")?.classList.remove("open");
      });
    document.getElementById("ai-modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "ai-modal") {
        document.getElementById("ai-modal")?.classList.remove("open");
      }
    });
    document
      .getElementById("btn-ai-save-config")
      ?.addEventListener("click", async () => {
        await this._saveAIConfig();
      });
    document
      .getElementById("btn-ai-add-docs")
      ?.addEventListener("click", async () => {
        await this._addAIDocs();
      });
    document
      .getElementById("ai-use-docs-context")
      ?.addEventListener("change", (e) => {
        this._aiUseDocsContext = e.target.checked;
      });
    document
      .getElementById("btn-ai-generate-post")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("btn-ai-plan")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("btn-ai-apply-partial")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(false);
      });
    document
      .getElementById("btn-ai-apply-all")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(true);
      });
    document
      .getElementById("btn-ai-undo-last")
      ?.addEventListener("click", async () => {
        await this._undoLastAIApply();
      });
    document
      .getElementById("btn-ai-clear-chat")
      ?.addEventListener("click", () => {
        this._aiChatHistory = [];
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        this._renderAIChat();
        this._renderAIActionStatus();
      });
    document
      .getElementById("btn-ai-side-close")
      ?.addEventListener("click", () => this._closeAISidePanel());
    document
      .getElementById("btn-ai-open-config")
      ?.addEventListener("click", async () => {
        await this._openAIModal();
      });
    document
      .getElementById("btn-ai-side-send")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("ai-side-prompt")
      ?.addEventListener("keydown", async (e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          await this._requestAIResponse();
        }
      });
    document
      .getElementById("btn-ai-side-plan")
      ?.addEventListener("click", async () => {
        await this._requestAIResponse();
      });
    document
      .getElementById("btn-ai-side-partial")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(false);
      });
    document
      .getElementById("btn-ai-side-all")
      ?.addEventListener("click", async () => {
        await this._applyAIPending(true);
      });
    document
      .getElementById("btn-ai-side-undo")
      ?.addEventListener("click", async () => {
        await this._undoLastAIApply();
      });
    document
      .getElementById("btn-ai-side-clear")
      ?.addEventListener("click", () => {
        this._aiChatHistory = [];
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        const sidePrompt = document.getElementById("ai-side-prompt");
        if (sidePrompt) sidePrompt.value = "";
        this._renderAIChat();
        this._renderAIActionStatus();
      });
    document
      .getElementById("btn-ai-variant")
      ?.addEventListener("click", async () => {
        await this._requestAIVariant();
      });
    document
      .getElementById("btn-ai-side-variant")
      ?.addEventListener("click", async () => {
        await this._requestAIVariant();
      });
    document
      .getElementById("ai-side-use-docs-context")
      ?.addEventListener("change", (e) => {
        this._aiUseDocsContext = e.target.checked;
      });
    document
      .getElementById("btn-close-ai-doc-modal")
      ?.addEventListener("click", () => this._closeAIDocModal());
    document.getElementById("ai-doc-modal")?.addEventListener("click", (e) => {
      if (e.target?.id === "ai-doc-modal") this._closeAIDocModal();
    });
    document
      .getElementById("btn-save-ai-doc-modal")
      ?.addEventListener("click", async () => {
        await this._saveAIDocModal();
      });
    document
      .getElementById("ai-provider")
      ?.addEventListener("change", () => this._applyAIProviderDefaults());
    const syncBasePreset = (value) => {
      this._aiBasePresetId = value ?? "";
      const a = document.getElementById("ai-base-preset");
      const b = document.getElementById("ai-side-base-preset");
      if (a && a.value !== this._aiBasePresetId) a.value = this._aiBasePresetId;
      if (b && b.value !== this._aiBasePresetId) b.value = this._aiBasePresetId;
      if (this._aiBasePresetId) {
        const preset = this._aiPresetsCache.find(
          (p) => p.id === this._aiBasePresetId,
        );
        if (preset)
          this._pushAIProgress(`Preset base definido: ${preset.name}`);
      } else {
        this._pushAIProgress(
          "Preset base limpo. Usando slide atual como referência.",
        );
      }
    };
    document
      .getElementById("ai-base-preset")
      ?.addEventListener("change", (e) => syncBasePreset(e.target.value));
    document
      .getElementById("ai-side-base-preset")
      ?.addEventListener("change", (e) => syncBasePreset(e.target.value));
    this._initAIStructuredPromptControls();
  }

  async _openAISidePanel() {
    const panel = document.getElementById("ai-side-panel");
    if (!panel) return;
    panel.style.transform = "translateX(0)";
    this._aiSideOpen = true;
    const brandId = this._brands.getCurrentBrandId();
    if (brandId) {
      this._aiPresetsCache = await PresetsDB.getAll();
      this._renderAIPresetSelectors();
    }
    this._syncAIStructuredDefaultsFromCanvas();
    this._renderAIChat();
    this._renderAIActionStatus();
  }

  _closeAISidePanel() {
    const panel = document.getElementById("ai-side-panel");
    if (!panel) return;
    panel.style.transform = "translateX(100%)";
    this._aiSideOpen = false;
  }

  async _openAIModal() {
    const brandId = this._brands.getCurrentBrandId();
    const configs = await AIConfigDB.getByBrand(brandId);
    const config = configs.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    this._aiConfigId = config?.id ?? null;
    document.getElementById("ai-provider").value =
      config?.provider ?? "minimax";
    document.getElementById("ai-model").value = config?.model ?? "MiniMax-M2.7";
    document.getElementById("ai-endpoint").value =
      config?.endpoint ??
      this._getDefaultEndpoint(config?.provider ?? "minimax");
    document.getElementById("ai-api-key").value = config?.apiKey ?? "";
    document.getElementById("ai-temperature").value = String(
      config?.temperature ?? 0.8,
    );
    this._applyAIProviderDefaults();
    this._aiDocs = await BrandDocsDB.getByBrand(brandId);
    this._aiPresetsCache = await PresetsDB.getAll();
    this._renderAIPresetSelectors();
    this._renderAIDocsList();
    this._renderAIChat();
    this._renderAIActionStatus();
    document.getElementById("ai-modal")?.classList.add("open");
  }

  async _saveAIConfig() {
    const brandId = this._brands.getCurrentBrandId();
    if (!brandId) {
      toast("Selecione uma marca para configurar IA.", "error");
      return;
    }
    const provider = document.getElementById("ai-provider")?.value ?? "minimax";
    const model = document.getElementById("ai-model")?.value?.trim() ?? "";
    const endpoint =
      document.getElementById("ai-endpoint")?.value?.trim() ?? "";
    const apiKeyInput =
      document.getElementById("ai-api-key")?.value?.trim() ?? "";
    const temperature = parseFloat(
      document.getElementById("ai-temperature")?.value ?? "0.8",
    );
    const existingList = await AIConfigDB.getByBrand(brandId);
    const existing = existingList.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    const id = this._aiConfigId ?? existing?.id;
    const apiKey = apiKeyInput || existing?.apiKey || "";
    if (apiKeyInput) {
      toast("Validando API key...", "info");
      const result = await this._aiEngine.validateApiKey({ provider, model, endpoint, apiKey });
      if (!result.valid) {
        toast(`✗ Key inválida: ${result.error}`, "error");
        return;
      }
      toast("✓ API key válida — Conectado!", "success");
    }
    const saved = await AIConfigDB.save({
      id,
      brandId,
      provider,
      model:
        model ||
        (provider === "openai"
          ? "gpt-4o-mini"
          : provider === "minimax_token_plan"
            ? "MiniMax-M2.7"
            : "MiniMax-M2.7"),
      endpoint,
      apiKey,
      temperature: Number.isFinite(temperature) ? temperature : 0.8,
    });
    this._aiConfigId =
      typeof saved === "string" ? saved : (id ?? this._aiConfigId);
    if (!apiKeyInput && existing?.apiKey) {
      document.getElementById("ai-api-key").value = existing.apiKey;
    }
    toast("Configuração de IA salva localmente.", "success");
  }

  async _addAIDocs() {
    const brandId = this._brands.getCurrentBrandId();
    if (!brandId) {
      toast("Selecione uma marca antes de anexar arquivos.", "error");
      return;
    }
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".txt,.md,.json,.csv,.xml,.html,.css,.js,.ts,.py,.sql,.yaml,.yml";
    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files ?? []);
      for (const file of files) {
        const content = await this._extractDocContent(file);
        await BrandDocsDB.save({
          brandId,
          name: file.name,
          mimeType: file.type || "text/plain",
          content,
        });
      }
      this._aiDocs = await BrandDocsDB.getByBrand(brandId);
      this._renderAIDocsList();
      toast("Arquivos anexados à marca.", "success");
    });
    input.click();
  }

  async _extractDocContent(file) {
    return await this._brands.constructor.readFileAsText(file);
  }

  _renderAIDocsList() {
    const list = document.getElementById("ai-docs-list");
    if (!list) return;
    if (!this._aiDocs.length) {
      list.innerHTML =
        '<div class="text-xs text-muted" style="padding:8px;">Nenhum arquivo anexado.</div>';
      return;
    }
    list.innerHTML = "";
    this._aiDocs.forEach((doc) => {
      const row = document.createElement("div");
      row.style.cssText =
        "display:flex;align-items:center;gap:8px;border:1px solid var(--border);border-radius:8px;padding:6px 8px;";
      row.innerHTML = `
        <div style="flex:1;min-width:0;">
          <div style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${doc.name}</div>
          <div class="text-xs text-muted">${doc.mimeType || "arquivo"}</div>
        </div>
        <button class="btn btn-ghost btn-sm" data-doc-view="${doc.id}">Ver</button>
        ${
          this._isEditableAIDoc(doc)
            ? `<button class="btn btn-ghost btn-sm" data-doc-edit="${doc.id}">Editar</button>`
            : ""
        }
        <button class="btn btn-ghost btn-sm" data-doc-del="${doc.id}">Excluir</button>
      `;
      row
        .querySelector("[data-doc-view]")
        ?.addEventListener("click", () => this._openAIDocModal(doc, false));
      row
        .querySelector("[data-doc-edit]")
        ?.addEventListener("click", () => this._openAIDocModal(doc, true));
      row
        .querySelector("[data-doc-del]")
        ?.addEventListener("click", async () => {
          await BrandDocsDB.delete(doc.id);
          this._aiDocs = this._aiDocs.filter((d) => d.id !== doc.id);
          this._renderAIDocsList();
        });
      list.appendChild(row);
    });
  }

  _isEditableAIDoc(doc) {
    const mime = String(doc?.mimeType ?? "").toLowerCase();
    const name = String(doc?.name ?? "").toLowerCase();
    return (
      mime.startsWith("text/") ||
      name.endsWith(".txt") ||
      name.endsWith(".md") ||
      name.endsWith(".markdown")
    );
  }

  _openAIDocModal(doc, editable) {
    const modal = document.getElementById("ai-doc-modal");
    const title = document.getElementById("ai-doc-modal-title");
    const content = document.getElementById("ai-doc-modal-content");
    const saveBtn = document.getElementById("btn-save-ai-doc-modal");
    if (!modal || !title || !content || !saveBtn || !doc) return;
    modal.dataset.docId = doc.id;
    modal.dataset.editable = editable ? "1" : "0";
    title.textContent = editable
      ? `Editar: ${doc.name}`
      : `Visualizar: ${doc.name}`;
    content.value = String(doc.content ?? "");
    content.readOnly = !editable;
    saveBtn.style.display = editable ? "" : "none";
    modal.classList.add("open");
  }

  _closeAIDocModal() {
    const modal = document.getElementById("ai-doc-modal");
    if (!modal) return;
    modal.classList.remove("open");
    modal.dataset.docId = "";
  }

  async _saveAIDocModal() {
    const modal = document.getElementById("ai-doc-modal");
    const content = document.getElementById("ai-doc-modal-content");
    if (!modal || !content) return;
    const docId = modal.dataset.docId;
    if (!docId) return;
    const doc = await BrandDocsDB.get(docId);
    if (!doc) {
      toast("Documento não encontrado.", "error");
      return;
    }
    await BrandDocsDB.save({
      ...doc,
      content: content.value,
    });
    const brandId = this._brands.getCurrentBrandId();
    this._aiDocs = await BrandDocsDB.getByBrand(brandId);
    this._renderAIDocsList();
    this._closeAIDocModal();
    toast("Documento atualizado.", "success");
  }

  async _requestAIResponse() {
    if (this._aiBusy) {
      this._pushAIProgress("IA ainda processando a solicitação anterior...");
      return;
    }
    this._openAISidePanel();
    const brandId = this._brands.getCurrentBrandId();
    if (!brandId) {
      this._pushAIProgress("Selecione uma marca antes de enviar para a IA.");
      toast("Selecione uma marca para usar IA.", "error");
      return;
    }
    await this._saveAIConfig();
    const cfgs = await AIConfigDB.getByBrand(brandId);
    const cfg = cfgs.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    if (!cfg?.apiKey) {
      this._pushAIProgress(
        "API key ausente. Abra Config no chat lateral e salve a chave.",
      );
      await this._openAIModal();
      toast("Informe API key para gerar com IA.", "error");
      return;
    }
    const prompt = this._consumeAIPrompt();
    if (!prompt) {
      this._pushAIProgress(
        "Digite uma mensagem no chat para gerar alterações.",
      );
      toast("Digite o prompt para gerar o post.", "error");
      return;
    }
    this._aiPresetsCache = await PresetsDB.getAll();
    const brief = this._buildAIStructuredBrief();
    const effectivePrompt = this._composeAIPrompt(prompt, brief);
    if (await this._handleAIPresetCommand(prompt)) return;
    this._aiChatHistory.push({ role: "user", content: prompt });
    this._renderAIChat();
    this._pushAIProgress("Iniciando geração com IA...");
    const brand = await this._brands.getCurrentBrand();
    let docContext = "";
    let docMeta = [];
    if (this._aiUseDocsContext) {
      this._pushAIProgress("Carregando documentos e contexto da marca...");
      this._aiDocs = await BrandDocsDB.getByBrand(brandId);
      const result = this._buildAIDocContext(this._aiDocs);
      docContext = result.docContext;
      docMeta = result.docMeta;
      this._pushAIBasisContext({ prompt, brand, docs: this._aiDocs, docMeta, brief });
    } else {
      this._pushAIProgress("Docs desativados — usando apenas contexto da marca.");
    }
    const brandContext = await this._buildRichBrandContext(brand);
    const templateSchema = this._buildTemplateSchema();
    if (templateSchema.length) {
      this._pushAIProgress(
        `Schema do template: ${templateSchema.map((f) => `"${f.layerName}" (${f.role})`).join(", ")}`,
      );
    }
    try {
      this._aiBusy = true;
      this._aiTyping = true;
      this._renderAIChat();
      this._pushAIProgress(
        `Config IA: provider=${cfg.provider}, model=${cfg.model}, endpoint=${cfg.endpoint || "auto"}`,
      );
      this._pushAIProgress("Chamando modelo e aguardando resposta...");
      const tools = await this._buildAIMCPTools(brandId, brief);
      const historyForAI = this._buildHistoryForAI(
        this._aiChatHistory.slice(-16),
        prompt,
        effectivePrompt,
      );
      const out = await this._aiEngine.chatWithTools({
        provider: cfg.provider,
        model: cfg.model,
        endpoint: cfg.endpoint,
        apiKey: cfg.apiKey,
        chatHistory: historyForAI,
        brandContext,
        docContext,
        currentFormatId: this._canvas.getState().formatId,
        tools,
        templateSchema,
        temperature: cfg.temperature ?? 0.8,
      });
      this._ensureAISlideCountIntent(
        out,
        prompt,
        brief.postCount,
        brief.formatId,
      );
      this._aiChatHistory.push({
        role: "assistant",
        content: out.assistantMessage || "Ajustei o post conforme solicitado.",
      });
      this._renderAIChat();
      this._pushAIDebugLog(out._debug);
      this._pushAIRawResponse(out);
      this._pushAIProgress(
        "Resposta recebida. Aplicando ações em tempo real...",
      );
      this._aiPendingResponse = out;
      this._aiPendingCursor = 0;
      this._renderAIActionStatus();
      await this._applyAIPending(true);
    } catch (e) {
      toast(`Erro na IA: ${e.message || "falha"}`, "error");
      this._pushAIProgress(`Erro da IA: ${e.message || "falha"}`);
      console.error(e);
    } finally {
      this._aiBusy = false;
      this._aiTyping = false;
      this._renderAIChat();
    }
  }

  async _requestAIVariant() {
    if (this._aiBusy) {
      this._pushAIProgress("IA ainda processando a solicitação anterior...");
      return;
    }
    const lastUserMsg = [...this._aiChatHistory]
      .reverse()
      .find((m) => m.role === "user");
    if (!lastUserMsg) {
      toast("Envie uma mensagem primeiro para gerar uma variante.", "info");
      return;
    }
    this._openAISidePanel();
    const brandId = this._brands.getCurrentBrandId();
    if (!brandId) {
      toast("Selecione uma marca antes de usar IA.", "error");
      return;
    }
    await this._saveAIConfig();
    const cfgs = await AIConfigDB.getByBrand(brandId);
    const cfg = cfgs.sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt) -
        new Date(a.updatedAt || a.createdAt),
    )[0];
    if (!cfg?.apiKey) {
      toast("Informe API key para gerar com IA.", "error");
      return;
    }
    const variantPrompt = `Gere uma VERSÃO COMPLETAMENTE DIFERENTE do que foi pedido antes._same topic, but with a different approach, different words, different structure. Only output the content — do not explain what changed.\n\nOriginal request: ${lastUserMsg.content}`;
    this._aiChatHistory.push({ role: "user", content: variantPrompt });
    this._renderAIChat();
    this._pushAIProgress("Gerando variante com temperatura alta...");
    const brand = await this._brands.getCurrentBrand();
    const brandContext = await this._buildRichBrandContext(brand);
    const brief = this._buildAIStructuredBrief();
    const templateSchema = this._buildTemplateSchema();
    const tools = await this._buildAIMCPTools(brandId, brief);
    const historyForAI = this._buildHistoryForAI(
      this._aiChatHistory.slice(-16),
      variantPrompt,
      variantPrompt,
    );
    try {
      this._aiBusy = true;
      this._aiTyping = true;
      this._renderAIChat();
      const out = await this._aiEngine.chatWithTools({
        provider: cfg.provider,
        model: cfg.model,
        endpoint: cfg.endpoint,
        apiKey: cfg.apiKey,
        chatHistory: historyForAI,
        brandContext,
        docContext: "",
        currentFormatId: this._canvas.getState().formatId,
        tools,
        templateSchema,
        temperature: 1.2,
      });
      this._ensureAISlideCountIntent(
        out,
        variantPrompt,
        brief.postCount,
        brief.formatId,
      );
      this._aiChatHistory.push({
        role: "assistant",
        content: out.assistantMessage || "Aqui está uma versão alternativa.",
      });
      this._renderAIChat();
      this._pushAIDebugLog(out._debug);
      this._pushAIRawResponse(out);
      this._pushAIProgress("Variante recebida.");
      this._aiPendingResponse = out;
      this._aiPendingCursor = 0;
      this._renderAIActionStatus();
      await this._applyAIPending(true);
    } catch (e) {
      toast(`Erro na IA: ${e.message || "falha"}`, "error");
      this._pushAIProgress(`Erro da IA: ${e.message || "falha"}`);
      console.error(e);
    } finally {
      this._aiBusy = false;
      this._aiTyping = false;
      this._renderAIChat();
    }
  }

  async _applyAIPending(applyAll = false) {
    const out = this._aiPendingResponse;
    if (!out) {
      toast("Não há plano pendente da IA.", "info");
      return;
    }
    const actions = Array.isArray(out.actions) ? out.actions : [];
    const hasActions = actions.length > 0;
    const onlyPlan = !hasActions && !!out.plan;
    if (!hasActions && !out.plan) {
      toast("A resposta atual não possui ações aplicáveis.", "info");
      return;
    }
    this._pushAIUndoSnapshot();
    try {
      if (onlyPlan) {
        if (!this._hasMeaningfulPlan(out.plan)) {
          this._aiPendingResponse = null;
          this._aiPendingCursor = 0;
          this._renderAIActionStatus();
          this._pushAIProgress(
            "A IA não retornou plano aplicável. Peça conteúdo/cópia explícita no prompt.",
          );
          return;
        }
        this._pushAIProgress("Aplicando plano completo...");
        this._applyAIPostPlan(out.plan);
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        this._renderAIActionStatus();
        this._pushAIProgress("Concluído. Plano aplicado no canvas.");
        toast("Plano aplicado.", "success");
        return;
      }
      const start = this._aiPendingCursor;
      const end = applyAll
        ? actions.length
        : Math.min(actions.length, start + 1);
      let appliedAny = false;
      let appliedPlanByAction = false;
      for (let i = start; i < end; i++) {
        const action = actions[i];
        this._pushAIProgress(
          `Executando ${i + 1}/${actions.length}: ${this._humanizeAIAction(action?.type)}`,
        );
        const ok = await this._executeSingleAIAction(action, out);
        appliedAny = appliedAny || !!ok;
        if (action?.type === "apply_plan" && ok) appliedPlanByAction = true;
        await this._wait(160);
      }
      if (
        applyAll &&
        this._hasMeaningfulPlan(out?.plan) &&
        !appliedPlanByAction
      ) {
        this._pushAIProgress(
          "Aplicando conteúdo do plano após ações para preencher textos...",
        );
        this._applyAIPostPlan(out.plan);
        appliedAny = true;
      }
      if (!appliedAny) {
        const fallback = this._applyAssistantMessageFallback(
          out?.assistantMessage,
        );
        if (fallback) {
          this._pushAIProgress(
            "Fallback aplicado: conteúdo inserido no primeiro campo de texto.",
          );
          appliedAny = true;
        }
      }
      this._aiPendingCursor = end;
      if (this._aiPendingCursor >= actions.length) {
        this._aiPendingResponse = null;
        this._aiPendingCursor = 0;
        this._renderAIActionStatus();
        this._pushAIProgress(
          appliedAny
            ? "Concluído. Todas as ações da IA foram aplicadas."
            : "Concluído sem alterações visíveis. Ajuste o prompt para gerar textos/slides.",
        );
        return;
      }
      this._renderAIActionStatus();
      toast(
        `Ação ${this._aiPendingCursor}/${actions.length} aplicada.`,
        "success",
      );
    } catch (e) {
      this._pushAIProgress(
        `Erro ao aplicar ações: ${e?.message || "falha inesperada"}`,
      );
      toast("Falha ao aplicar ações da IA.", "error");
      console.error(e);
    }
  }

  async _undoLastAIApply() {
    const snap = this._aiUndoStack.pop();
    if (!snap) {
      toast("Sem ações da IA para desfazer.", "info");
      return;
    }
    try {
      this._canvas.setState(snap.canvasState);
      await this._slides.loadSlides(snap.slides, snap.activeSlideIndex);
      this._onFitCanvas();
      this._onUpdateFormatBadge(this._canvas.getState().formatId);
      this._onUpdateGradientBar();
      toast("Última aplicação da IA desfeita.", "success");
    } finally {
    }
  }

  _renderAIChat() {
    const targets = [
      document.getElementById("ai-chat-log"),
      document.getElementById("ai-side-chat-log"),
    ].filter(Boolean);
    targets.forEach((box) => {
      if (!this._aiChatHistory.length) {
        box.innerHTML =
          '<div class="text-xs text-muted">Converse com a IA. Ela pode criar páginas, usar templates e adicionar ícones.</div>';
        return;
      }
      box.innerHTML = "";
      this._aiChatHistory.forEach((msg) => {
        if (msg.role === "debug") {
          box.appendChild(this._buildAIDebugBlock(msg));
          return;
        }
        const line = document.createElement("div");
        const isUser = msg.role === "user";
        const isProgress = msg.role === "system";
        line.style.cssText = `
          max-width: 92%;
          justify-self: ${isUser ? "end" : "start"};
          background: ${isProgress ? "transparent" : isUser ? "var(--accent-bg)" : "var(--surface-2)"};
          border: ${isProgress ? "0" : `1px solid ${isUser ? "var(--border-accent)" : "var(--border)"}`};
          border-radius: 8px;
          padding: ${isProgress ? "2px 0" : "6px 8px"};
          font-size: 12px;
          white-space: pre-wrap;
          color: ${isProgress ? "var(--text-muted)" : "var(--text-primary)"};
          font-style: ${isProgress ? "italic" : "normal"};
        `;
        line.textContent = msg.content;
        box.appendChild(line);
      });
      box.scrollTop = box.scrollHeight;
    });
  }

  _buildAIDebugBlock(msg) {
    const wrap = document.createElement("div");
    wrap.style.cssText =
      "border:1px solid var(--border);border-radius:8px;overflow:hidden;font-size:11px;max-width:100%;";

    const makeSection = (label, text, color = "var(--text-muted)") => {
      const id = `dbg-${Math.random().toString(36).slice(2)}`;
      const header = document.createElement("div");
      header.style.cssText = `
        display:flex;align-items:center;gap:6px;padding:5px 8px;
        background:var(--surface-2);cursor:pointer;user-select:none;
        border-top:1px solid var(--border);
      `;
      header.innerHTML = `
        <span style="font-size:10px;color:var(--text-disabled);">▶</span>
        <span style="font-weight:600;color:${color};flex:1;">${label}</span>
        <span style="font-size:10px;color:var(--text-disabled);">${String(text ?? "").length} chars</span>
      `;
      const body = document.createElement("div");
      body.id = id;
      body.style.cssText = `
        display:none;padding:8px;background:var(--surface-1);
        overflow:auto;max-height:320px;
        font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;
        font-size:10px;white-space:pre-wrap;word-break:break-all;
        color:var(--text-primary);line-height:1.5;
      `;
      body.textContent = text ?? "(vazio)";
      header.addEventListener("click", () => {
        const open = body.style.display !== "none";
        body.style.display = open ? "none" : "block";
        header.querySelector("span").textContent = open ? "▶" : "▼";
      });
      return [header, body];
    };

    const badge = document.createElement("div");
    badge.style.cssText =
      "padding:4px 8px;background:var(--surface-3);font-size:10px;color:var(--text-disabled);display:flex;gap:8px;";
    badge.innerHTML = `
      <span>📡 <b>Endpoint:</b> ${msg.endpoint || "—"}</span>
      <span>🤖 <b>Model:</b> ${msg.model || "—"}</span>
    `;
    wrap.appendChild(badge);

    const [promptHeader, promptBody] = makeSection(
      "PROMPT ENVIADO",
      msg.prompt,
      "#7BC4EC",
    );
    wrap.appendChild(promptHeader);
    wrap.appendChild(promptBody);

    const [respHeader, respBody] = makeSection(
      "RESPOSTA BRUTA",
      msg.rawResponse,
      "#4ade80",
    );
    wrap.appendChild(respHeader);
    wrap.appendChild(respBody);

    return wrap;
  }

  async _buildAIMCPTools(brandId, brief = null) {
    const presets = await PresetsDB.getAll();
    this._aiPresetsCache = presets;
    const basePreset = this._aiBasePresetId
      ? presets.find((p) => p.id === this._aiBasePresetId)
      : null;
    const templateSchema = this._buildTemplateSchema();
    const createPagesDescription = templateSchema.length
      ? `Criar múltiplas páginas/slides. Cada page DEVE ter "textContent" com as chaves: ${templateSchema.map((f) => `"${f.layerName}"`).join(", ")}.`
      : "Criar múltiplas páginas/slides. Cada page deve ter textContent com os textos mapeados por layerName.";
    return [
      {
        name: "base_preset_policy",
        description:
          "Sempre respeitar o preset base e alterar prioritariamente somente textos, sem quebrar layout.",
        selectedBasePreset: basePreset
          ? {
              id: basePreset.id,
              name: basePreset.name,
              description: basePreset.description || "",
            }
          : null,
        templateSchema,
        required: brief
          ? {
              postCount: brief.postCount,
              formatId: brief.formatId,
              network: brief.network || "auto",
            }
          : null,
      },
      {
        name: "apply_plan",
        description: "Aplicar plano completo no post atual",
      },
      {
        name: "create_pages",
        description: createPagesDescription,
        templateSchema,
      },
      {
        name: "use_template",
        description: "Aplicar template/preset existente",
        availablePresets: presets.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || "",
        })),
      },
      {
        name: "add_icon",
        description: "Adicionar ícone (iconId do Iconify) no slide atual",
      },
      {
        name: "add_text",
        description: "Adicionar texto no slide atual",
      },
    ];
  }

  async _executeSingleAIAction(action, out) {
    const type = action?.type;
    const payload = action?.payload ?? {};
    if (type === "apply_plan") {
      if (!this._hasMeaningfulPlan(out?.plan)) return false;
      this._applyAIPostPlan(out.plan);
      return true;
    }
    if (type === "create_pages") {
      return await this._aiCreatePages(payload, !!payload?.replaceAll);
    }
    if (type === "use_template") {
      return await this._aiUseTemplate(payload);
    }
    if (type === "add_icon") {
      return await this._aiAddIcon(payload);
    }
    if (type === "add_text") {
      return this._aiAddText(payload);
    }
    return false;
  }

  _pushAIUndoSnapshot() {
    this._aiUndoStack.push({
      canvasState: structuredClone(this._canvas.getState()),
      slides: this._slides.getSlides().map((s) => ({
        id: s.id,
        state: structuredClone(s.state),
        thumb: s.thumb ?? "",
      })),
      activeSlideIndex: this._slides.getActiveIndex(),
    });
    if (this._aiUndoStack.length > 20) this._aiUndoStack.shift();
  }

  _renderAIActionStatus() {
    const els = [
      document.getElementById("ai-action-status"),
      document.getElementById("ai-side-action-status"),
    ].filter(Boolean);
    els.forEach((el) => {
      if (!this._aiPendingResponse) {
        el.textContent = "Sem plano pendente.";
        return;
      }
      const actions = Array.isArray(this._aiPendingResponse.actions)
        ? this._aiPendingResponse.actions
        : [];
      if (!actions.length && this._aiPendingResponse.plan) {
        el.textContent = "Plano pronto para aplicar.";
        return;
      }
      el.textContent = `Ações pendentes: ${Math.max(
        0,
        actions.length - this._aiPendingCursor,
      )} de ${actions.length}.`;
    });
  }

  _initAIStructuredPromptControls() {
    const formatSelect = document.getElementById("ai-side-format");
    if (!formatSelect || formatSelect.options.length > 0) return;
    Object.entries(this._FORMATS).forEach(([id, fmt]) => {
      const op = document.createElement("option");
      op.value = id;
      op.textContent = `${fmt.label} (${fmt.platformLabel || fmt.platform})`;
      formatSelect.appendChild(op);
    });
    formatSelect.addEventListener("change", () => {
      const networkSelect = document.getElementById("ai-side-network");
      if (!networkSelect) return;
      if (!networkSelect.value) {
        const platform = this._FORMATS[formatSelect.value]?.platform || "";
        networkSelect.value = this._normalizePlatformToNetwork(platform);
      }
    });
    this._syncAIStructuredDefaultsFromCanvas();
  }

  _syncAIStructuredDefaultsFromCanvas() {
    const state = this._canvas?.getState?.();
    const currentFormatId = state?.formatId || "ig-feed-square";
    const formatSelect = document.getElementById("ai-side-format");
    const networkSelect = document.getElementById("ai-side-network");
    if (formatSelect && !formatSelect.value) {
      formatSelect.value = currentFormatId;
    }
    if (networkSelect && !networkSelect.value) {
      const platform = this._FORMATS[formatSelect?.value]?.platform || "";
      networkSelect.value = this._normalizePlatformToNetwork(platform);
    }
  }

  _normalizePlatformToNetwork(platform) {
    const p = String(platform || "").toLowerCase();
    if (p.includes("instagram")) return "instagram";
    if (p.includes("facebook")) return "facebook";
    if (p.includes("linkedin")) return "linkedin";
    if (p.includes("tiktok")) return "tiktok";
    if (p.includes("youtube")) return "youtube";
    if (p.includes("x")) return "x";
    if (p.includes("thread")) return "threads";
    return "";
  }

  _buildAIStructuredBrief() {
    const postCount = Math.max(
      1,
      Math.min(
        12,
        parseInt(
          document.getElementById("ai-side-post-count")?.value ?? "1",
          10,
        ) || 1,
      ),
    );
    const formatId =
      document.getElementById("ai-side-format")?.value ||
      this._canvas.getState().formatId;
    const formatLabel = this._FORMATS[formatId]?.label || formatId;
    const network = document.getElementById("ai-side-network")?.value || "";
    const goal = document.getElementById("ai-side-goal")?.value?.trim() || "";
    return { postCount, formatId, formatLabel, network, goal };
  }

  _composeAIPrompt(subjectPrompt, brief) {
    const lines = [
      "REQUISITOS ESTRUTURADOS:",
      `- quantidade_posts: ${brief.postCount}`,
      `- format_id: ${brief.formatId}`,
      `- format_label: ${brief.formatLabel}`,
      `- rede_social: ${brief.network || "auto"}`,
      `- objetivo_cta: ${brief.goal || "não informado"}`,
      "",
      "PEDIDO DO USUÁRIO:",
      subjectPrompt,
    ];
    return lines.join("\n");
  }

  _buildTemplateSchema() {
    const basePreset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    if (basePreset?.textFields?.length) return basePreset.textFields;
    return this._extractPresetTextFields(this._canvas.getState());
  }

  _extractPresetTextFields(state, existingPreset = null) {
    const layers = Array.isArray(state?.layers) ? state.layers : [];
    const existingFields = existingPreset?.textFields ?? [];
    return layers
      .filter((l) => l?.type === "text")
      .map((l) => {
        const existing = existingFields.find((f) => f.layerId === l.id);
        const charsPerLine = Math.max(
          10,
          Math.round(70 / ((l.fontSize || 40) / 40)),
        );
        const estimatedLines = Math.max(
          1,
          Math.round((l.height || 20) / (((l.fontSize || 40) / 1080) * 100)),
        );
        return {
          layerId: l.id,
          layerName: l.name || "Texto",
          role: existing?.role ?? this._inferLayerRole(l),
          hint: existing?.hint ?? "",
          fontSize: l.fontSize || 40,
          fontFamily: l.fontFamily || "",
          fontWeight: l.fontWeight || 400,
          color: l.color || "#ffffff",
          textAlign: l.textAlign || l.align || "left",
          lineHeight: l.lineHeight || 1.2,
          letterSpacing: l.letterSpacing || "0em",
          animIn: l.animIn || "none",
          animDelay: l.animDelay ?? 0,
          maxChars:
            existing?.maxChars ?? Math.min(200, charsPerLine * estimatedLines),
        };
      });
  }

  _inferLayerRole(layer) {
    const name = String(layer?.name ?? "").toLowerCase();
    if (/t[ií]tulo|title|headline|h1/.test(name)) return "título principal";
    if (/sub|descrição|description|body/.test(name))
      return "subtítulo ou descrição";
    if (/badge|tag|pill|label|chip/.test(name)) return "tag ou categoria";
    if (/cta|ação|action|button/.test(name)) return "chamada para ação";
    if (/autor|name|nome/.test(name)) return "nome ou autor";
    if (/num|número|step|etapa/.test(name)) return "número ou etapa";
    return "texto";
  }

  async _buildRichBrandContext(brand) {
    const fonts = brand?.id ? await this._brands.getBrandFonts(brand.id) : [];
    const fontNames = fonts.map((f) => f.family).filter(Boolean);
    return JSON.stringify(
      {
        name: brand?.name,
        description: brand?.description,
        palette: brand?.palette,
        primaryFont: brand?.primaryFont || fontNames[0] || "",
        secondaryFont: brand?.secondaryFont || fontNames[1] || "",
        brandVoice: brand?.brandVoice || "",
        brandKeywords: brand?.brandKeywords || "",
      },
      null,
      2,
    );
  }

  _buildHistoryForAI(history, rawPrompt, effectivePrompt) {
    const arr = Array.isArray(history) ? history.map((m) => ({ ...m })) : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      if (
        arr[i].role === "user" &&
        String(arr[i].content).trim() === rawPrompt.trim()
      ) {
        arr[i].content = effectivePrompt;
        break;
      }
    }
    return arr;
  }

  _getDefaultEndpoint(provider) {
    const p = String(provider || "minimax").toLowerCase();
    if (p === "openai") return "https://api.openai.com/v1/chat/completions";
    if (p === "minimax_token_plan")
      return "https://api.minimax.io/anthropic/v1/messages";
    if (p === "compatible") return "";
    return "https://api.minimax.io/v1/text/chatcompletion_v2";
  }

  _getDefaultModel(provider) {
    const p = String(provider || "minimax").toLowerCase();
    if (p === "openai") return "gpt-4o-mini";
    return "MiniMax-M2.7";
  }

  _applyAIProviderDefaults() {
    const provider = document.getElementById("ai-provider")?.value ?? "minimax";
    const endpointEl = document.getElementById("ai-endpoint");
    const modelEl = document.getElementById("ai-model");
    if (endpointEl && !endpointEl.value.trim()) {
      endpointEl.value = this._getDefaultEndpoint(provider);
    }
    if (modelEl && !modelEl.value.trim()) {
      modelEl.value = this._getDefaultModel(provider);
    }
  }

  _renderAIPresetSelectors() {
    const selects = [
      document.getElementById("ai-base-preset"),
      document.getElementById("ai-side-base-preset"),
    ].filter(Boolean);
    selects.forEach((sel) => {
      const current = this._aiBasePresetId || "";
      sel.innerHTML = '<option value="">Atual (sem preset fixo)</option>';
      this._aiPresetsCache.forEach((p) => {
        const op = document.createElement("option");
        op.value = p.id;
        op.textContent = p.name;
        sel.appendChild(op);
      });
      sel.value = current;
    });
  }

  async _handleAIPresetCommand(prompt) {
    const text = String(prompt ?? "").trim();
    if (!text.toLowerCase().startsWith("/preset")) return false;
    const arg = text.replace(/^\/preset\s*/i, "").trim();
    if (!arg || arg.toLowerCase() === "atual" || arg.toLowerCase() === "none") {
      this._aiBasePresetId = "";
      this._renderAIPresetSelectors();
      this._pushAIProgress("Preset base removido. A IA usará o estado atual.");
      return true;
    }
    const target = this._aiPresetsCache.find((p) =>
      p.name.toLowerCase().includes(arg.toLowerCase()),
    );
    if (!target) {
      this._pushAIProgress(`Preset não encontrado: "${arg}"`);
      return true;
    }
    this._aiBasePresetId = target.id;
    this._renderAIPresetSelectors();
    this._pushAIProgress(`Preset base definido via chat: ${target.name}`);
    return true;
  }

  _pushAIProgress(message) {
    if (!message) return;
    this._aiChatHistory.push({
      role: "system",
      content: `• ${message}`,
    });
    this._renderAIChat();
  }

  _pushAIBasisContext({ prompt, brand, docs, docMeta, brief }) {
    const preset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    const topic = this._extractPromptTopic(prompt);
    const docsForLine = (docMeta ?? [])
      .slice(0, 8)
      .map((d) => `${d.name} (${d.chars} chars, ${d.kind})`);
    const docLine = docsForLine.length
      ? docsForLine.join(", ")
      : "Nenhum documento anexado";
    const palette = Array.isArray(brand?.palette)
      ? brand.palette.slice(0, 6)
      : [];
    const paletteLine = palette.length
      ? palette
          .map((c) => this._formatBrandColor(c))
          .filter(Boolean)
          .join(", ")
      : "Sem paleta definida";
    const summary = [
      "Base usada pela IA:",
      `- Preset base: ${preset?.name || "Atual (sem preset fixo)"}`,
      `- Marca: ${brand?.name || "Sem nome"}`,
      `- Paleta: ${paletteLine}`,
      `- Materiais enviados para IA: ${docLine}`,
      `- Arquivos no pacote de contexto: ${(docMeta ?? []).length}`,
      `- Quantidade solicitada: ${brief?.postCount || 1}`,
      `- Formato solicitado: ${brief?.formatLabel || brief?.formatId || "auto"}`,
      `- Rede social alvo: ${brief?.network || "auto"}`,
      `- Objetivo/CTA: ${brief?.goal || "não informado"}`,
      `- Tema solicitado: ${topic}`,
      "- Política: preservar template e priorizar preenchimento de conteúdo",
    ].join("\n");
    this._aiChatHistory.push({
      role: "system",
      content: summary,
    });
    this._renderAIChat();
  }

  _formatBrandColor(entry) {
    if (typeof entry === "string") return entry;
    if (!entry || typeof entry !== "object") return "";
    return (
      entry.hex ||
      entry.value ||
      entry.color ||
      (entry.name ? `${entry.name}` : "") ||
      ""
    );
  }

  _buildAIDocContext(docs) {
    const items = Array.isArray(docs) ? docs : [];
    const meta = [];
    let buffer = "";
    for (const doc of items) {
      const name = String(doc?.name ?? "documento");
      const raw = String(doc?.content ?? "");
      const lower = name.toLowerCase();
      const isMd = lower.endsWith(".md") || lower.endsWith(".markdown");
      const isText = this._isEditableAIDoc(doc) || isMd;
      if (!isText) continue;
      const prepared = this._normalizeMarkdownForAI(raw);
      const clipped = prepared.slice(0, 6000);
      const kind = isMd ? "md" : "text";
      meta.push({ name, chars: prepared.length, kind });
      const chunk = `## ${name}\n[TIPO:${kind}] [CHARS:${prepared.length}]\n${clipped}\n\n`;
      if ((buffer + chunk).length > 24000) break;
      buffer += chunk;
    }
    return {
      docContext: buffer.trim(),
      docMeta: meta,
    };
  }

  _normalizeMarkdownForAI(text) {
    return String(text ?? "")
      .replace(/\r\n/g, "\n")
      .replace(/\t/g, "  ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  _extractPromptTopic(prompt) {
    const text = String(prompt ?? "").trim();
    if (!text) return "Não informado";
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const first = lines[0] || text;
    return first.length > 160 ? `${first.slice(0, 157)}...` : first;
  }

  _pushAIRawResponse(out) {
    const actions = Array.isArray(out?.actions) ? out.actions : [];
    const actionTypes = actions.map((a) => a?.type).filter(Boolean);
    const planLayers = Array.isArray(out?.plan?.layers)
      ? out.plan.layers.length
      : 0;
    const line = [
      "Resumo da resposta:",
      `- assistantMessage: ${String(out?.assistantMessage || "").slice(0, 180) || "(vazio)"}`,
      `- actions: ${actionTypes.length ? actionTypes.join(", ") : "(nenhuma)"}`,
      `- plan.layers: ${planLayers}`,
    ].join("\n");
    this._aiChatHistory.push({ role: "system", content: line });
    this._renderAIChat();
  }

  _pushAIDebugLog(debug) {
    if (!debug) return;
    this._aiChatHistory.push({
      role: "debug",
      prompt: debug.prompt,
      rawResponse: debug.rawResponse,
      endpoint: debug.endpoint,
      model: debug.model,
    });
    this._renderAIChat();
  }

  _inferRequestedSlideCount(prompt) {
    const text = String(prompt ?? "").toLowerCase();
    if (!text) return 0;
    const direct = text.match(/(\d+)\s*(slides?|p[aá]ginas?|posts?)/i);
    if (direct) return Math.max(0, Math.min(12, Number(direct[1]) || 0));
    const words = {
      um: 1,
      uma: 1,
      dois: 2,
      duas: 2,
      tres: 3,
      três: 3,
      quatro: 4,
      cinco: 5,
      seis: 6,
      sete: 7,
      oito: 8,
      nove: 9,
      dez: 10,
    };
    for (const [k, v] of Object.entries(words)) {
      if (
        new RegExp(`\\b${k}\\b\\s*(slides?|p[aá]ginas?|posts?)`, "i").test(text)
      )
        return v;
    }
    return 0;
  }

  _ensureAISlideCountIntent(out, prompt, forcedCount = 0, forcedFormatId = "") {
    if (!out || typeof out !== "object") return;
    const requested = forcedCount || this._inferRequestedSlideCount(prompt);
    if (requested <= 1) return;
    const actions = Array.isArray(out.actions) ? out.actions : [];
    const hasCreate = actions.some((a) => a?.type === "create_pages");
    if (hasCreate) return;
    out.actions = [
      ...actions,
      {
        type: "create_pages",
        payload: {
          count: requested,
          formatId: forcedFormatId || this._canvas.getState().formatId,
          topic: this._extractPromptTopic(prompt),
          replaceAll: false,
        },
      },
    ];
    this._pushAIProgress(
      `Ajuste automático: adicionado create_pages para ${requested} slides.`,
    );
  }

  _humanizeAIAction(type) {
    const map = {
      apply_plan: "aplicar plano",
      create_pages: "criar páginas",
      use_template: "usar template",
      add_icon: "adicionar ícone",
      add_text: "adicionar texto",
    };
    return map[type] || type || "ação";
  }

  _wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  _resolveAIBaseState() {
    const preset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    if (preset?.state) return structuredClone(preset.state);
    return structuredClone(this._canvas.getState());
  }

  _applyPlanTextsToState(state, plan) {
    if (!state || !Array.isArray(state.layers)) return false;
    const sourceTexts = (plan?.layers ?? [])
      .filter((l) => l && l.type !== "shape")
      .map((l) => String(l.content ?? "").trim())
      .filter(Boolean);
    if (!sourceTexts.length) return false;
    const targetTextLayers = state.layers.filter((l) => l.type === "text");
    if (!targetTextLayers.length) return false;
    targetTextLayers.forEach((layer, i) => {
      layer.content = sourceTexts[i] ?? sourceTexts[sourceTexts.length - 1];
    });
    return true;
  }

  _consumeAIPrompt() {
    const side = document.getElementById("ai-side-prompt");
    const modal = document.getElementById("ai-prompt");
    const sideText = side?.value?.trim() ?? "";
    const modalText = modal?.value?.trim() ?? "";
    const text = sideText || modalText;
    if (side) side.value = "";
    if (modal) modal.value = "";
    return text;
  }

  async _aiCreatePages(payload, replaceAll = false) {
    const pagesInput = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.pages)
        ? payload.pages
        : [];
    let pages = pagesInput;
    if (!pages.length) {
      const countRaw =
        payload?.count ??
        payload?.slides ??
        payload?.total ??
        payload?.quantity ??
        0;
      const count = Math.max(0, Math.min(12, Number(countRaw) || 0));
      if (count > 0) {
        const topic = String(payload?.topic || payload?.title || "Novo slide");
        pages = Array.from({ length: count }).map((_, i) => ({
          formatId: this._canvas.getState().formatId,
          layers: [
            {
              type: "text",
              name: `Título ${i + 1}`,
              content: `${topic} ${count > 1 ? `#${i + 1}` : ""}`,
              x: 50,
              y: 40,
              width: 84,
              fontSize: 56,
              color: "#FFFFFF",
              align: "center",
            },
          ],
        }));
      }
    }
    if (!Array.isArray(pages) || !pages.length) return false;
    const current = this._slides.getSlides();
    const templateState = this._resolveAIBaseState();

    const basePreset = this._aiBasePresetId
      ? this._aiPresetsCache.find((p) => p.id === this._aiBasePresetId)
      : null;
    const fixedLayerIds = basePreset?.fixedLayerIds ?? null;

    const built = pages.slice(0, 12).map((page) => {
      const base = structuredClone(templateState);
      base.formatId = page?.formatId || base.formatId;
      if (page?.background && typeof page.background === "object") {
        base.background = { ...base.background, ...page.background };
      }
      if (Array.isArray(fixedLayerIds)) {
        base.layers = (base.layers ?? []).filter(
          (l) => l.type === "text" || fixedLayerIds.includes(l.id),
        );
      }
      const textCandidates = this._extractPageTextCandidates(page);
      const textContent = page?.textContent ?? null;
      this._applyTextsToTemplateState(base, textCandidates, textContent);
      if (this._aiBasePresetId) base._presetId = this._aiBasePresetId;
      return {
        id: uuid(),
        state: base,
      };
    });
    const nextSlides = replaceAll ? built : [...current, ...built];
    await this._slides.loadSlides(nextSlides, replaceAll ? 0 : current.length);
    this._pushAIProgress(`${built.length} slide(s) criados.`);
    return true;
  }

  _extractPageTextCandidates(page) {
    const lines = [];
    const push = (v) => {
      const t = String(v ?? "").trim();
      if (t) lines.push(t);
    };
    push(page?.title);
    push(page?.headline);
    push(page?.subtitle);
    push(page?.subheadline);
    push(page?.content);
    push(page?.description);
    if (Array.isArray(page?.bullets)) {
      page.bullets.forEach((b) => push(`• ${String(b ?? "").trim()}`));
    }
    if (Array.isArray(page?.layers)) {
      page.layers
        .filter((l) => l && l.type !== "shape")
        .forEach((l) => push(l.content));
    }
    if (!lines.length) {
      push(page?.topic);
    }
    return lines;
  }

  _applyTextsToTemplateState(state, textCandidates, textContent = null) {
    if (!state || !Array.isArray(state.layers)) return false;
    const textLayers = state.layers.filter((l) => l.type === "text");
    if (!textLayers.length) return false;

    if (textContent && typeof textContent === "object") {
      let applied = false;
      textLayers.forEach((layer) => {
        const key = Object.keys(textContent).find(
          (k) => k.toLowerCase() === (layer.name || "").toLowerCase(),
        );
        if (key != null) {
          layer.content =
            String(textContent[key] ?? "").trim() || layer.content;
          applied = true;
        }
      });
      if (applied) return true;
    }

    const lines = Array.isArray(textCandidates)
      ? textCandidates.map((t) => String(t ?? "").trim()).filter(Boolean)
      : [];
    if (!lines.length) return false;
    textLayers.forEach((layer, i) => {
      const next = lines[i] ?? lines[lines.length - 1];
      layer.content = next;
      if (!Number.isFinite(layer.fontSize) || layer.fontSize <= 0) {
        layer.fontSize = 24;
      }
    });
    return true;
  }

  _hasMeaningfulPlan(plan) {
    if (!plan || typeof plan !== "object") return false;
    const hasLayers = Array.isArray(plan.layers) && plan.layers.length > 0;
    const hasBg =
      !!plan.background &&
      (plan.background.type === "solid" ||
        plan.background.type === "gradient" ||
        plan.background.type === "image");
    return hasLayers || hasBg;
  }

  async _aiUseTemplate(payload) {
    const presets = await PresetsDB.getAll();
    if (!presets.length) return false;
    const byId = payload?.presetId
      ? presets.find((p) => p.id === payload.presetId)
      : null;
    const byName = payload?.presetName
      ? presets.find((p) =>
          p.name
            .toLowerCase()
            .includes(String(payload.presetName).toLowerCase()),
        )
      : null;
    const target = byId || byName;
    if (!target?.state) return false;
    this._canvas.snapshot();
    this._canvas.setState(target.state);
    this._onFitCanvas();
    this._onUpdateFormatBadge(this._canvas.getState().formatId);
    return true;
  }

  async _aiAddIcon(payload) {
    const iconId = String(payload?.iconId ?? "").trim();
    if (!iconId) return false;
    const svg = await this._icons.fetchSVG(iconId);
    if (!svg) return false;
    this._canvas.snapshot();
    this._canvas.addLayer(
      this._makeIconLayer(null, payload?.name || iconId, iconId, svg),
    );
    const layer = this._canvas.getSelectedLayer();
    if (!layer) return true;
    this._canvas.updateLayer(layer.id, {
      x: Number.isFinite(payload?.x) ? payload.x : layer.x,
      y: Number.isFinite(payload?.y) ? payload.y : layer.y,
      size: Number.isFinite(payload?.size) ? payload.size : layer.size,
      color: payload?.color || layer.color,
    });
    return true;
  }

  _applyAssistantMessageFallback(message) {
    const text = String(message ?? "").trim();
    if (!text) return false;
    const content = text.length > 280 ? `${text.slice(0, 277)}...` : text;
    return this._aiAddText({
      name: "Copy IA",
      content,
    });
  }

  _aiAddText(payload) {
    const content = String(payload?.content ?? "").trim();
    if (!content) return false;
    const state = this._canvas.getState();
    const target = state.layers.find((l) => l.type === "text");
    if (target) {
      this._canvas.snapshot();
      this._canvas.updateLayer(target.id, {
        content,
      });
      return true;
    }
    this._canvas.snapshot();
    const layer = this._makeTextLayer(null, payload?.name || "Texto IA", content);
    this._canvas.addLayer(layer);
    const selected = this._canvas.getSelectedLayer();
    if (!selected) return true;
    this._canvas.updateLayer(selected.id, {
      x: Number.isFinite(payload?.x) ? payload.x : selected.x,
      y: Number.isFinite(payload?.y) ? payload.y : selected.y,
      width: Number.isFinite(payload?.width) ? payload.width : selected.width,
      fontSize: Number.isFinite(payload?.fontSize)
        ? payload.fontSize
        : selected.fontSize,
      color: payload?.color || selected.color,
      align: ["left", "center", "right"].includes(payload?.align)
        ? payload.align
        : selected.align,
    });
    return true;
  }

  _applyAIPostPlan(plan) {
    const base = this._resolveAIBaseState();
    const next = structuredClone(base);
    const changed = this._applyPlanTextsToState(next, plan);
    if (!changed) {
      this._pushAIProgress(
        "Plano sem textos aplicáveis. Mantendo preset/layout atual sem quebrar.",
      );
      return;
    }
    this._canvas.snapshot();
    this._canvas.setState(next);
    this._onFitCanvas();
    this._onUpdateFormatBadge(next.formatId);
    this._onUpdateGradientBar();
  }
}
