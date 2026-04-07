export class AIEngine {
  async chatWithTools({
    provider,
    model,
    endpoint,
    apiKey,
    chatHistory,
    brandContext,
    docContext,
    currentFormatId,
    tools,
    templateSchema,
    temperature = 0.8,
  }) {
    if (!apiKey) throw new Error("API key não informada.");
    const finalPrompt = this._buildChatPrompt({
      chatHistory,
      brandContext,
      docContext,
      currentFormatId,
      tools,
      templateSchema,
    });
    const req = this._buildRequest({
      provider,
      model,
      endpoint,
      apiKey,
      finalPrompt,
      temperature,
    });
    const { data, url } = await this._requestWithFallback(req);
    this._assertProviderSuccess(data);
    const text = this._extractText(data);
    const payload = this._extractJSON(text);
    const normalized = this._normalizeAssistantPayload(payload, currentFormatId);
    // Expose debug info for chat logging
    normalized._debug = {
      prompt: finalPrompt,
      rawResponse: text,
      endpoint: url,
      model: req.body?.model ?? model,
    };
    return normalized;
  }

  async generatePostPlan({
    provider,
    model,
    endpoint,
    apiKey,
    prompt,
    brandContext,
    docContext,
    currentFormatId,
    temperature = 0.8,
  }) {
    const out = await this.chatWithTools({
      provider,
      model,
      endpoint,
      apiKey,
      chatHistory: [{ role: "user", content: prompt }],
      brandContext,
      docContext,
      currentFormatId,
      tools: this._defaultTools(),
      temperature,
    });
    return out.plan;
  }

  _buildChatPrompt({
    chatHistory,
    brandContext,
    docContext,
    currentFormatId,
    tools,
    templateSchema,
  }) {
    const history = (chatHistory ?? [])
      .filter((m) => m?.content)
      .map(
        (m) => `${m.role === "assistant" ? "ASSISTANT" : "USER"}: ${m.content}`,
      )
      .join("\n");

    const hasSchema = Array.isArray(templateSchema) && templateSchema.length > 0;
    const schemaBlock = hasSchema
      ? `\nSCHEMA DO TEMPLATE (campos que cada slide precisa ter preenchidos):\n${templateSchema
          .map(
            (f, i) =>
              `  ${i + 1}. layerName: "${f.layerName}" | role: "${f.role || "texto"}" | fontSize: ${f.fontSize || "?"}px | maxChars: ${f.maxChars || "~80"} | hint: "${f.hint || ""}"`,
          )
          .join("\n")}\n`
      : "";

    const createPagesExample = hasSchema
      ? JSON.stringify(
          {
            type: "create_pages",
            payload: {
              pages: [
                {
                  formatId: currentFormatId,
                  textContent: Object.fromEntries(
                    templateSchema.map((f) => [
                      f.layerName,
                      `<conteúdo para "${f.role || f.layerName}">`,
                    ]),
                  ),
                },
              ],
            },
          },
          null,
          2,
        )
      : JSON.stringify(
          {
            type: "create_pages",
            payload: {
              pages: [
                {
                  formatId: currentFormatId,
                  textContent: { "Título": "<título>", "Subtítulo": "<subtítulo>" },
                },
              ],
            },
          },
          null,
          2,
        );

    return `
Você é um agente criativo para editor de posts de redes sociais.
Você recebe um template com campos de texto definidos e deve preenchê-los com copy criativo.

${schemaBlock}
REGRAS CRÍTICAS:
- SEMPRE retorne JSON válido sem markdown.
- SEMPRE inclua "assistantMessage" com resposta curta ao usuário.
- NUNCA altere layout, fontes, tamanhos ou posições — apenas os TEXTOS.
- Se o usuário pedir N slides/posts, crie EXATAMENTE N itens em pages[].
- Para cada slide, preencha TODOS os campos do schema em "textContent" (chave = layerName exato).
- Textos de slides diferentes devem ser ÚNICOS — não repita o mesmo conteúdo.
- Respeite o maxChars de cada campo — textos muito longos serão cortados.
- Use a fonte, a voz e as cores da marca para guiar o estilo do copy.

FORMATO DE RESPOSTA:
{
  "assistantMessage": "texto curto para o usuário",
  "actions": [
    ${createPagesExample}
  ],
  "plan": {}
}

MCP tools disponíveis:
${JSON.stringify(tools ?? this._defaultTools(), null, 2)}

Format atual: "${currentFormatId}".

Contexto da marca:
${brandContext || "Sem contexto de marca"}

Documentos/materiais da marca:
${docContext || "Sem documentos anexados"}

Histórico do chat:
${history || "Sem histórico"}
`.trim();
  }

  _defaultTools() {
    return [
      {
        name: "apply_plan",
        description: "Aplica um plano completo no post atual",
        payload: { optional: [] },
      },
      {
        name: "create_pages",
        description: "Cria novas páginas/slides no projeto",
        payload: {
          pages: [
            {
              formatId: "ig-feed-square",
              background: {},
              layers: [],
            },
          ],
          replaceAll: false,
        },
      },
      {
        name: "use_template",
        description: "Usa um preset/template existente por nome",
        payload: { presetName: "Nome do preset" },
      },
      {
        name: "add_icon",
        description: "Adiciona ícone no slide atual",
        payload: {
          iconId: "ph:star-bold",
          name: "Ícone",
          x: 50,
          y: 50,
          size: 8,
          color: "#FFFFFF",
        },
      },
      {
        name: "add_text",
        description: "Adiciona texto no slide atual",
        payload: {
          name: "Título",
          content: "Texto",
          x: 50,
          y: 30,
          width: 80,
          fontSize: 56,
          color: "#FFFFFF",
        },
      },
    ];
  }

  _buildPrompt({ prompt, brandContext, docContext, currentFormatId }) {
    return `
Você é um diretor de arte para posts sociais.
Retorne APENAS JSON válido, sem markdown.
Formato de saída:
{
  "formatId": "ig-feed-square",
  "background": {
    "type": "solid|gradient",
    "color": "#RRGGBB",
    "gradient": {
      "type": "linear|radial",
      "from": "#RRGGBB",
      "to": "#RRGGBB",
      "angle": 135,
      "reach": 100,
      "opacity": 100,
      "fromOpacity": 100,
      "toOpacity": 100
    }
  },
  "layers": [
    {
      "type": "text|shape",
      "name": "Título",
      "content": "texto",
      "x": 50,
      "y": 20,
      "width": 80,
      "height": 20,
      "fontSize": 72,
      "fontWeight": 700,
      "color": "#FFFFFF",
      "align": "left|center|right",
      "fillColor": "#RRGGBB",
      "borderRadius": 0
    }
  ]
}
Use no máximo 6 camadas.
Use formatId: "${currentFormatId}" se o usuário não pedir outro.

Contexto da marca:
${brandContext || "Sem contexto de marca"}

Documentos de insumo:
${docContext || "Sem documentos anexados"}

Pedido do usuário:
${prompt}
`.trim();
  }

  _buildRequest({
    provider,
    model,
    endpoint,
    apiKey,
    finalPrompt,
    temperature,
  }) {
    const p = String(provider || "minimax").toLowerCase();
    if (p === "minimax_token_plan") {
      const urls = endpoint?.trim()
        ? [endpoint.trim()]
        : [
            "https://api.minimax.io/anthropic/v1/messages",
            "https://api.minimaxi.com/anthropic/v1/messages",
          ];
      return {
        urls,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: {
          model: model || "MiniMax-M2.7",
          max_tokens: 4096,
          temperature,
          messages: [{ role: "user", content: finalPrompt }],
        },
      };
    }
    if (p === "openai") {
      const base =
        endpoint?.trim() || "https://api.openai.com/v1/chat/completions";
      return {
        urls: [base],
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: {
          model: model || "gpt-4o-mini",
          temperature,
          messages: [{ role: "user", content: finalPrompt }],
        },
      };
    }
    if (p === "compatible") {
      const base = endpoint?.trim();
      if (!base) throw new Error("Informe endpoint para provider compatível.");
      return {
        urls: [base],
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: {
          model: model || "minimax-2.7",
          temperature,
          messages: [{ role: "user", content: finalPrompt }],
        },
      };
    }
    const fallbackUrls = endpoint?.trim()
      ? [endpoint.trim()]
      : [
          "https://api.minimax.io/v1/text/chatcompletion_v2",
          "https://api.minimaxi.com/v1/text/chatcompletion_v2",
          "https://api.minimax.chat/v1/text/chatcompletion_v2",
        ];
    return {
      urls: fallbackUrls,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: {
        model: model || "MiniMax-M2.7",
        temperature,
        messages: [{ role: "user", content: finalPrompt }],
      },
    };
  }

  async _requestWithFallback(req) {
    const urls = Array.isArray(req?.urls) ? req.urls.filter(Boolean) : [];
    if (!urls.length) throw new Error("Nenhum endpoint configurado.");
    let lastError = null;
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: req.headers,
          body: JSON.stringify(req.body),
        });
        const raw = await res.text();
        let data = null;
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error(
            `Resposta não-JSON em ${url}: ${raw.slice(0, 180) || "vazio"}`,
          );
        }
        if (!res.ok) {
          const message =
            data?.error?.message ||
            data?.base_resp?.status_msg ||
            `Falha HTTP ${res.status}`;
          throw new Error(`${message} (${url})`);
        }
        return { res, data, url };
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error("Falha ao chamar endpoint de IA.");
  }

  _extractText(data) {
    if (Array.isArray(data?.content)) {
      return data.content
        .map((part) => part?.text ?? part?.content ?? "")
        .join("\n");
    }
    if (typeof data?.reply === "string") return data.reply;
    if (Array.isArray(data?.choices) && data.choices[0]?.message?.content) {
      const content = data.choices[0].message.content;
      if (typeof content === "string") return content;
      if (Array.isArray(content)) {
        return content
          .map((part) => {
            if (typeof part === "string") return part;
            return part?.text ?? part?.content ?? "";
          })
          .join("\n");
      }
      if (typeof content === "object") {
        return content.text ?? content.content ?? JSON.stringify(content);
      }
    }
    if (
      Array.isArray(data?.choices) &&
      typeof data.choices[0]?.text === "string"
    ) {
      return data.choices[0].text;
    }
    return JSON.stringify(data);
  }

  _assertProviderSuccess(data) {
    const statusCode = data?.base_resp?.status_code;
    if (Number.isFinite(statusCode) && statusCode !== 0) {
      const msg = data?.base_resp?.status_msg || `status_code ${statusCode}`;
      throw new Error(`MiniMax retornou erro: ${msg}`);
    }
    if (data?.error?.message) {
      throw new Error(data.error.message);
    }
  }

  _extractJSON(text) {
    const raw = String(text ?? "").trim();
    try {
      return JSON.parse(raw);
    } catch {
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        return JSON.parse(raw.slice(start, end + 1));
      }
      throw new Error("Resposta da IA não retornou JSON válido.");
    }
  }

  _normalizePlan(plan, fallbackFormatId) {
    const safe = plan && typeof plan === "object" ? plan : {};
    return {
      formatId: safe.formatId || fallbackFormatId || "ig-feed-square",
      background: safe.background || null,
      layers: Array.isArray(safe.layers) ? safe.layers : [],
    };
  }

  _normalizeAssistantPayload(payload, fallbackFormatId) {
    const p = payload && typeof payload === "object" ? payload : {};
    const looksLikePlan =
      "formatId" in p ||
      "background" in p ||
      (Array.isArray(p.layers) && p.layers.length >= 0);
    const hasAgentShape =
      "assistantMessage" in p || "actions" in p || "plan" in p;
    if (!hasAgentShape && looksLikePlan) {
      return {
        assistantMessage: "Plano recebido do modelo.",
        actions: [{ type: "apply_plan", payload: {} }],
        plan: this._normalizePlan(p, fallbackFormatId),
      };
    }
    if (!hasAgentShape && !looksLikePlan) {
      const snippet = JSON.stringify(p).slice(0, 220);
      throw new Error(
        `Resposta fora do formato esperado (assistant/actions/plan). Verifique provider/modelo/endpoint. Payload: ${snippet}`,
      );
    }
    return {
      assistantMessage: String(
        p.assistantMessage ?? "Pronto. Preparei ações para o post.",
      ),
      actions: Array.isArray(p.actions) ? p.actions : [],
      plan: this._normalizePlan(p.plan, fallbackFormatId),
    };
  }
}

export const aiEngine = new AIEngine();
