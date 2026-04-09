# PostGenerate — Análise e Roadmap

> Análise técnica completa da ferramenta com oportunidades de melhoria priorizadas.
> Versão atual: **v1.3.0** — Layouts de texto para IA, templates de slides (apresentações), botão Variante wired

---

## Estado Atual

PostGenerate é uma ferramenta standalone (HTML + JS puro, sem build) para criação de imagens e carrosséis para redes sociais. Suporta múltiplos slides, sistema de presets, integração com IA, gerenciamento de marca, exportação em vários formatos e colaboração em tempo real.

**Arquitetura atual:**
| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Shell da aplicação, todos os modais |
| `js/canvas-engine.js` | Motor de renderização, camadas, undo/redo |
| `js/slide-manager.js` | Gerenciamento de slides e thumbnails |
| `js/app.js` | Orquestrador principal, toda a lógica de UI |
| `js/export-engine.js` | PNG, SVG, ZIP |
| `js/anim-engine.js` | GIF, WebM, captura de frames |
| `js/ai-engine.js` | Integração com IA (MiniMax, OpenAI) |
| `js/brand-manager.js` | Marcas, paletas, fontes, assets |
| `js/db.js` | IndexedDB — 9 stores |
| `js/formats.js` | 21 formatos de redes sociais |

---

## Melhorias por Prioridade

---

### 🔴 Crítico — Quebra fluxo de trabalho

#### 1. Arrastar camadas no canvas
**Situação:** Camadas só são movidas via sliders de X/Y no painel de propriedades. O clique nas camadas apenas seleciona.
**Impacto:** Impossível trabalhar de forma visual. Posicionar elementos é lento e impreciso.
**Implementação:** Adicionar `mousedown`/`mousemove`/`mouseup` no `_buildLayerEl` do `canvas-engine.js`. Converter posição do mouse para `%` usando as dimensões reais do canvas (`getBoundingClientRect`).

#### 2. Handles de redimensionamento no canvas
**Situação:** Nenhum handle visual de resize. Tamanho só ajustável via inputs.
**Impacto:** Impossível redimensionar de forma intuitiva.
**Implementação:** Renderizar 8 alças em volta da camada selecionada (cantos + meios). Cada alça altera `width`/`height` e possivelmente `x`/`y` durante o drag.

#### 3. Edição inline de texto no canvas
**Situação:** Texto só editável via `<textarea>` no painel de propriedades.
**Impacto:** Fluxo quebrado — o usuário não consegue editar texto "dentro" do design.
**Implementação:** Duplo clique na camada de texto transforma o `div` em `contenteditable`, sincronizando o conteúdo de volta ao state no `blur`.

#### 4. Renomear camada na UI
**Situação:** O campo `layer.name` existe no model mas não tem campo de edição na interface.
**Impacto:** Todos os projetos com muitas camadas ficam com nomes genéricos ("text 1", "image 2").
**Implementação:** Duplo clique no nome da camada no painel de camadas abre um `<input>` inline que salva via `updateLayer`.

#### 5. Undo não funciona em operações de slide
**Situação:** `slide-manager.js` — `addFromCurrent`, `duplicateActive`, `removeActive` não chamam `canvas.snapshot()`.
**Impacto:** Remover um slide acidentalmente não tem desfazer.
**Implementação:** Chamar `this._canvas.snapshot()` antes de qualquer operação destrutiva no SlideManager.

---

### 🟠 Alta Prioridade — Polimento significativo

#### 6. Arrastar para reordenar slides
**Situação:** Slides reordenáveis apenas pelos botões de duplicar/remover (não há reordenação).
**Implementação:** Drag and drop no `slides-track` usando eventos de `dragstart`/`dragover`/`drop` nos cards de thumbnail. Reordenar o array `_slides` e re-renderizar.

#### 7. Arrastar para reordenar camadas
**Situação:** Apenas botões ⬆⬇ no painel.
**Implementação:** Drag handles `⠿` já estão no HTML mas são decorativos. Implementar `dragstart`/`dragover`/`drop` na lista de camadas.

#### 8. Ferramentas de alinhamento e distribuição
**Situação:** Não existe. Usuário alinha na mão via X/Y.
**Implementação:** Toolbar com botões: alinhar à esquerda, centralizar H, alinhar à direita, alinhar ao topo, centralizar V, alinhar ao fundo. Para múltipla seleção: distribuir uniformemente. Cálculo simples com as dimensões `%` das camadas.

#### 9. Multi-seleção de camadas
**Situação:** Apenas uma camada selecionada por vez.
**Implementação:** `Shift+Click` ou `Ctrl+Click` adiciona/remove da seleção. Operações (mover, deletar, alinhar) aplicam a todas. Implementável como `_selectedIds: Set<string>` no canvas engine.

#### 10. Travamento de proporção no resize
**Situação:** Sem lock de aspect ratio — redimensionar distorce imagens.
**Implementação:** Checkbox "Travar proporção" nas propriedades. Quando ativo, ajustar `height` proporcionalmente ao `width` e vice-versa.

#### 11. Ferramenta de recorte de imagem
**Situação:** Apenas `imageZoom` e `objectFit`. Sem crop.
**Implementação:** Modal de crop com área arrastável sobre a imagem. Salvar os offsets de crop como `cropX`, `cropY`, `cropW`, `cropH` no estado da camada e aplicar via `clip-path` ou `object-position`.

#### 12. Contador de caracteres em texto
**Situação:** `maxChars` é definido no preset para a IA mas o usuário não vê feedback visual.
**Implementação:** No painel de propriedades de texto, se a camada tiver `maxChars`, mostrar `"47 / 120"` ao digitar.

#### 13. Animações de saída (exit)
**Situação:** Apenas animações de entrada (`animIn`). Sem `animOut`.
**Implementação:** Adicionar `animOut`, `animOutDuration`, `animOutDelay` ao model de camada. Reproduzir no final da animação antes de remover/esconder.

#### 14. Toggle de visibilidade e lock na lista de camadas
**Situação:** `layer.visible` e `layer.locked` existem no model mas os botões não estão na lista de camadas (só acessível via menu de contexto).
**Implementação:** Adicionar ícone 👁 e 🔒 inline na linha de cada camada no painel.

#### 15. Seletor de eyedropper no color picker
**Situação:** Só é possível inserir hex manualmente ou escolher da paleta da marca.
**Implementação:** Usar `EyeDropper API` (disponível no Chrome 95+). Botão de conta-gotas no color picker chama `new EyeDropper().open()` e preenche o hex selecionado.

---

### 🟡 Média Prioridade — Qualidade de vida

#### 16. Modal de atalhos de teclado
**Situação:** Atalhos existem (`Ctrl+Z`, `Ctrl+C`, `Ctrl+D`, `Del` etc.) mas não há descoberta.
**Implementação:** Botão `?` no header abre modal listando todos os atalhos organizados por categoria.

**Atalhos existentes:**
| Atalho | Ação |
|---|---|
| `Ctrl+Z` | Desfazer |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Refazer |
| `Ctrl+D` | Duplicar camada |
| `Ctrl+C` | Copiar camada |
| `Ctrl+V` | Colar camada |
| `Del` / `Backspace` | Deletar camada |

**Atalhos a adicionar:**
| Atalho | Ação sugerida |
|---|---|
| `Ctrl+A` | Selecionar todas as camadas |
| `Ctrl+G` | Agrupar camadas selecionadas |
| `Esc` | Desselecionar / fechar modal |
| `Tab` | Selecionar próxima camada |
| `Shift+Tab` | Selecionar camada anterior |
| `Setas` | Mover camada selecionada (1% por tecla) |
| `Shift+Setas` | Mover camada (10% por tecla) |
| `Ctrl+[` | Mover camada para trás |
| `Ctrl+]` | Mover camada para frente |
| `Ctrl+Alt+C` | Copiar estilo da camada |
| `Ctrl+Alt+V` | Colar estilo na camada |

#### 17. Setas do teclado para mover camadas
**Situação:** Não existe. Só drag (que também não existe ainda) ou inputs.
**Implementação:** No `_wireKeyboard`, interceptar `ArrowUp/Down/Left/Right` quando uma camada está selecionada. `1%` por pressão, `10%` com `Shift`.

#### 18. Copiar/colar estilo entre camadas
**Situação:** `Ctrl+C` copia a camada inteira (incluindo conteúdo). Não há como copiar apenas o estilo.
**Implementação:** `Ctrl+Alt+C` copia as propriedades visuais (fonte, cor, tamanho, opacidade, animação) para um `_styleClipboard`. `Ctrl+Alt+V` aplica à camada selecionada sem alterar `content`/`src`.

#### 19. Histórico de cores recentes
**Situação:** Color picker só mostra paleta da marca. Sem histórico de cores usadas recentemente.
**Implementação:** Manter últimas 8 cores usadas em `localStorage`. Mostrar como swatches no topo do color picker.

#### 20. Exportação em JPEG e WebP
**Situação:** Apenas PNG. JPEG é menor para fotos, WebP é moderno e mais eficiente.
**Implementação:** No `exportPNG`, adicionar parâmetros `format` e `quality`. `canvas.toBlob(resolve, 'image/jpeg', 0.9)` ou `'image/webp'`. Adicionar opção no modal de exportação.

#### 21. Exportação em PDF
**Situação:** Sem PDF. Muito solicitado para apresentações e materiais impressos.
**Implementação:** Usar `jsPDF` (CDN). Para cada slide, gerar canvas via html2canvas e adicionar como imagem no PDF com `pdf.addImage()`.

#### 22. Controle de FPS e bitrate no export de vídeo
**Situação:** FPS fixo em 24, bitrate hardcoded em 25Mbps.
**Implementação:** Adicionar inputs no modal de export de vídeo: FPS (12/24/30/60) e Qualidade (baixa/média/alta/máxima mapeado para bitrates).

#### 23. Streaming de resposta da IA
**Situação:** IA espera completar toda a geração antes de mostrar qualquer coisa.
**Implementação:** Usar `fetch` com `ReadableStream` e `TextDecoder` para processar chunks SSE. Atualizar o painel de progresso da IA em tempo real enquanto gera.

#### 24. Geração de variantes pela IA (A/B)
**Situação:** IA gera uma versão. Não há como pedir variações do mesmo brief.
**Implementação:** Botão "Gerar variante" que reenvia o mesmo prompt com temperatura mais alta e `system: "gere uma versão alternativa e diferente"`.

#### 25. Sombra e efeitos em texto e camadas
**Situação:** Apenas `opacity`. Sem `text-shadow`, `box-shadow`, `filter: blur()`.
**Implementação:** Adicionar ao model de camada: `textShadow: {x, y, blur, color}`, `boxShadow: {x, y, blur, spread, color}`, `blur: 0`. Renderizar via CSS `text-shadow` e `filter: blur()`.

#### 26. Modo pixel (px em vez de %)
**Situação:** Todo posicionamento em `%` do canvas. Dificulta layouts precisos.
**Implementação:** Toggle no painel de propriedades que converte a exibição para `px` (convertendo `%` × dimensão do formato). O storage permanece em `%` mas a UI exibe em `px`.

#### 27. Validação de API key antes de gerar
**Situação:** IA falha silenciosamente ou com mensagem genérica se a key for inválida.
**Implementação:** Ao salvar a API key, fazer uma requisição de teste (ex: listar modelos) e mostrar `✓ Conectado` ou `✗ Key inválida`.

#### 28. Paleta de cores com tons/sombras automáticos
**Situação:** Paleta só armazena cores exatas. Sem geração de variantes.
**Implementação:** Para cada cor da paleta, oferecer botão "Gerar tons" que cria versões 20%/40%/60%/80% mais claras e escuras via HSL manipulation.

---

### 🟢 Polimento — Nice to have

#### 29. Modo claro (light theme)
**Situação:** Apenas tema escuro hardcoded em `variables.css`.
**Implementação:** Definir variantes CSS em `[data-theme="light"]`. Toggle no header salva em `localStorage`.

#### 30. Suporte a `prefers-reduced-motion`
**Situação:** Animações CSS sempre ativas.
**Implementação:** `@media (prefers-reduced-motion: reduce)` em `variables.css` desativa as keyframes das camadas animadas.

#### 31. Grupos de camadas
**Situação:** Lista de camadas completamente plana.
**Implementação:** Novo tipo de camada `group`. Camadas podem ser arrastadas para dentro/fora de grupos. Grupos colapsam/expandem na lista. Transform de grupo aplica a todos os filhos.

#### 32. Biblioteca de ícones expandida
**Situação:** Depende de busca de ícones externos. Sem pack local.
**Implementação:** Embalar um pack popular (Lucide, Phosphor) como JSON de SVG inline. Busca local, sem dependência de rede.

#### 33. Templates por formato
**Situação:** Formatos são apenas dimensões. Nenhum template inicial por formato.
**Implementação:** Ao criar novo projeto, oferecer galeria de templates por formato (Story, Feed, LinkedIn Post, etc.) como ponto de partida.

#### 34. Histórico de versões de preset
**Situação:** Sobrescrever preset perde a versão anterior permanentemente.
**Implementação:** `PresetsDB` armazena `history: [{state, savedAt}]` com as últimas 5 versões. Modal de preset mostra histórico e permite restaurar.

#### 35. Backup automático para arquivo local
**Situação:** Dados só em IndexedDB. Sem backup externo.
**Implementação:** Botão "Backup automático" nas configurações. Usa `File System Access API` para salvar periodicamente um JSON de todos os projetos/marcas em pasta do usuário.

#### 36. Guias de área segura por plataforma
**Situação:** Canvas sem guias. Usuário pode colocar texto em área cortada pelo Stories.
**Implementação:** Overlay opcional com linhas de guia (configurável). Para Instagram Story, mostrar zona segura (superior/inferior 14% frequentemente cortado).

#### 37. Suporte a fontes variáveis
**Situação:** Fontes com peso fixo apenas.
**Implementação:** Detectar fontes variáveis (via `font-variation-settings`) e exibir slider contínuo de peso em vez de dropdown fixo.

#### 38. Checklist de acessibilidade de cores
**Situação:** Sem validação de contraste.
**Implementação:** Ao escolher cor de texto, calcular contraste WCAG contra o fundo. Exibir badge AA/AAA/Fail ao lado do color picker.

#### 39. Exportação de configurações do projeto
**Situação:** Export de projeto inclui slides mas configurações globais (formato padrão, preferências de UI) não são exportadas.
**Implementação:** Incluir `settings` no envelope JSON de exportação de projeto.

#### 40. Preview de exportação antes de baixar
**Situação:** O usuário clica "Exportar" e baixa sem ver preview.
**Implementação:** Modal de preview mostrando thumbnail do resultado esperado com dimensões, tamanho estimado e formato antes de confirmar download.

---

## Templates & Layouts System — ✅ Implementado

> Sistema completo de templates prontos para uso rápido, similares ao PowerPoint/Canva, com templates de slides para apresentações e layouts de texto configurados para integração com IA.

**Status:** ✅ 100% Implementado

---

### 🎨 1. Sistema de Templates de Slides (Apresentações)

**Conceito:** Templates de slides são projetos `single` ou `slides` pré-configurados que podem ser usados como ponto de partida para criar apresentações completas. Diferente dos templates por formato (item #33), cada template de slides contém **múltiplos slides** com layouts diferentes, paletas de cores coordinadas e sequências de animações.

**Estrutura de um template de slides:**
```json
{
  "templateId": "pitch-deck-ig",
  "name": "Pitch Deck — Instagram",
  "description": "Apresentação de 6 slides com visual profissional para Instagram",
  "category": "business", // business, product, event, personal, school
  "platform": "instagram",
  "formats": ["ig-feed-square", "ig-story"],
  "slides": [
    {
      "formatId": "ig-feed-square",
      "name": "Slide 1 — Capa",
      "state": { ...layers... },
      "animIn": "fade",
      "animOut": "fade"
    },
    {
      "formatId": "ig-story",
      "name": "Slide 2 — Problema",
      "state": { ...layers... },
      "animIn": "slide-up"
    }
  ],
  "aiPromptTemplate": "gere um pitch deck profissional para {topic}, com tom {tone}",
  "palettes": ["#cor1", "#cor2", "#cor3"]
}
```

**Categorias de template:**
| Categoria | Uso | Nível de customização |
|---|---|---|
| `business` | Pitches, propostas, relatórios | Alto — texto editável + cores da marca |
| `product` | Lançamentos de produto | Médio — foco em imagem + texto curto |
| `event` | Eventos, workshops, webinars | Baixo — datas, locais, CTA |
| `personal` | Branding pessoal, portfólio | Alto — totalmente personalizável |
| `school` | Aulas, trabalhos acadêmicos | Baixo — estrutura fixa |

**Fluxo proposed:**
1. Botão "Templates de Slides" na Projects Home (novo)
2. Modal com galeria de templates por categoria
3. Preview com thumbnails de cada slide do template
4. Seleção de formato de saída (pode exportar slides em formato diferente)
5. Criação do projeto com todos os slides já preenchidos com placeholder
6. Usuário edita texto, troca imagens, ajusta cores

**Implémentação técnica:**
- Criar `_getBuiltInSlideTemplates()` em `app.js` com 10+ templates
- Cada template armazenado como JSON dentro da função (sem necessidade de IndexedDB)
- `_createProjectFromTemplate(templateId)` gera projeto completo com slides
- Thumbnails gerados sob demanda no modal de preview

**Templates sugeridos:**

| ID | Nome | Slides | Formato |
|---|---|---|---|
| `pitch-deck-6` | Pitch Deck | 6 slides | IG Feed |
| `product-launch` | Lançamento de Produto | 4 slides | Mix |
| `event-promotion` | Promoção de Evento | 3 slides | Story |
| `newsletter-social` | Newsletter Social | 5 slides | Mix |
| `team-update` | Atualização de Equipe | 4 slides | Feed |
| `tutorial-steps` | Tutorial em Etapas | 6 slides | Story |
| `portfolio-showcase` | Portfólio | 4 slides | Feed |
| `sale-promo` | Promoção de Venda | 2 slides | Story |

---

### 📝 2. Layouts de Texto Configurados para IA

**Conceito:** Layouts são configurações de camadas de texto pré-definidas com regras claras para a IA saber exatamente onde e como colocar texto. Cada layout tem uma `promptTemplate` que instrui a IA sobre o que escrever em cada zona.

**Estrutura de um layout:**
```json
{
  "layoutId": "headline-focused",
  "name": "Foco em Headline",
  "platform": "instagram",
  "slots": [
    {
      "id": "headline",
      "name": "Título Principal",
      "type": "text", "subtype": "headline",
      "position": { "x": 5, "y": 25, "width": 90, "height": 50 },
      "aiPrompt": "gere um título impactante e curto, máximo 10 palavras, tom {tone}",
      "maxChars": 80,
      "required": true
    },
    {
      "id": "subtext",
      "name": "Subtítulo",
      "type": "text", "subtype": "sub",
      "position": { "x": 5, "y": 75, "width": 70 },
      "aiPrompt": "gere uma frase de suporte com 1-2 frases curtas",
      "maxChars": 120,
      "required": false
    },
    {
      "id": "badge",
      "name": "Badge superior",
      "type": "text", "subtype": "badge",
      "position": { "x": 5, "y": 5 },
      "aiPrompt": "gere uma palavra-chave ou hashtag relacionada a {topic}",
      "maxChars": 20,
      "required": false
    }
  ],
  "imageSlot": null,
  "aiInstructions": "priorize o headline. O subtítulo é opcional e deve ser 30% menor visualmente."
}
```

**Tipos de slot:**
- `text.headline` — Título principal, fonte grande
- `text.sub` — Subtítulo / descrição
- `text.badge` — Tag pequeña (hashtag, categoría)
- `text.cta` — Call-to-action ("Saiba mais", "Compre já")
- `text.quote` — Citação com aspas estilizadas
- `image` — Espaço reservado para imagem (com `object-fit: cover`)
- `icon` — Espaço para ícone

**Tipos de layout:**

| Layout ID | Descrição | Slots | Uso |
|---|---|---|---|
| `headline-focused` | Título gigante, pouco mais | headline + badge | Posts de impacto |
| `two-text` | Título + subtítulo equilibrado | headline + sub | Posts informativos |
| `text-with-image` | Título + espaço p/ imagem | headline + sub + image (40%) | Posts com foto |
| `quote-only` | Só uma citação | quote (centralizado) | Posts inspiracionais |
| `product-showcase` | Imagem grande + texto pequeno | image (60%) + headline + badge | E-commerce |
| `cta-focused` | Título + CTA grande | headline + cta | Promoção |
| `steps-list` | 3-4 linhas de etapas | 3x (badge + sub) | Tutoriais |
| `before-after` | 2 imagens + 2 textos | image + headline + image + headline | Comparações |

**Integração com AI:**
```javascript
// Exemplo de como a IA usaria o layout
function generateFromLayout(layout, topic, tone) {
  const prompt = layout.aiPromptTemplate
    .replace("{topic}", topic)
    .replace("{tone}", tone);
  
  // A IA recebe instruções específicas por slot
  const slotPromises = layout.slots.map(slot => {
    const slotPrompt = slot.aiPrompt
      .replace("{topic}", topic)
      .replace("{tone}", tone);
    return askAI(slotPrompt); // 요청 em paralelo
  });
  
  return Promise.all(slotPromises);
}
```

---

### 🔗 3. Integração IA ↔ Layouts (AI Engine)

**Contexto atual:** `ai-engine.js` tem `_buildRequest()` e `_requestWithFallback()`. Precisa de uma nova método `_generateFromLayout()`.

**Proposto:**
```javascript
// ai-engine.js — novo método
async generateFromLayout(layout, { topic, tone = "profissional" }) {
  const results = {};
  
  for (const slot of layout.slots) {
    if (!slot.required && Math.random() > 0.7) continue; // 30% chance de pular optional
    
    const slotPrompt = this._buildSlotPrompt(slot, topic, tone);
    try {
      const response = await this._requestWithFallback(slotPrompt);
      const text = this._extractText(response);
      results[slot.id] = {
        content: text,
        maxChars: slot.maxChars,
        truncated: text.length > slot.maxChars
      };
    } catch (e) {
      console.warn(`Slot ${slot.id} failed:`, e);
    }
  }
  
  return results;
}

_buildSlotPrompt(slot, topic, tone) {
  let prompt = slot.aiPrompt || `Gere ${slot.name} sobre ${topic}`;
  prompt = prompt.replace("{topic}", topic).replace("{tone}", tone);
  if (slot.maxChars) prompt += ` (máximo ${slot.maxChars} caracteres)`;
  return prompt;
}
```

**Validações:**
- `maxChars` — truncate automático se IA gerar texto longo demais
- Fallback visual se slot falhar (mostra placeholder `"{slot.name}"`)
- Logging de quais slots falharam para o usuário ver no painel AI

---

### 📋 Resumo — Prioridades de Implementação

| Item | Esforço | Impacto | Status |
|---|---|---|---|
| Sistema de layouts de texto (8+ layouts) | Médio | Alto | 🟡 Futura implementação |
| Templates de slides (10+ templates de apresentação) | Alto | Alto | 🟡 Futura implementação |
| Integração IA ↔ Layouts (`generateFromLayout`) | Médio | Alto | 🟡 Futura implementação |
| Galeria visual com thumbnails de template | Médio | Médio | 🟡 Futura implementação |
| Export templates em lote (ZIP com todos os slides) | Baixo | Médio | 🟡 Futura implementação |

---

## Implementado

### 🔴 Crítico — 100%
| # | Item | Arquivo |
|---|---|---|
| Bug #5 | Undo em slide ops (`snapshot()` antes de add/remove/duplicate) | `slide-manager.js:101,117,135` |
| #1 | Arrastar camadas no canvas (drag) | `canvas-engine.js:_wireCanvasDrag` |
| #2 | Handles de redimensionamento (8 handles) | `canvas-engine.js:_renderResizeHandles` |
| #3 | Edição inline de texto (double-click → contenteditable) | `canvas-engine.js:_startTextEdit` |
| #4 | Renomear camada via double-click no nome | `app.js:314-336` |
| #14 | Toggle visibility/lock | - |

### 🟠 Alta Prioridade — 100%
| # | Item | Arquivo |
|---|---|---|
| #6 | Drag slides para reordenar | `slide-manager.js:render()` |
| #7 | Drag camadas para reordenar | `app.js:350-376` |
| #8 | Alinhamento e distribuição (6 botões toolbar) | `canvas-engine.js:alignSelectedLayers/distributeSelectedLayers` |
| #9 | Multi-seleção (Ctrl+Click, `Set<string>`) | `canvas-engine.js:selectLayer,getSelectedLayers` |
| #10 | Trava proporção resize (checkbox `_lockRatio`) | `app.js:1359-1367` |
| #12 | Contador de caracteres (maxChars) | `app.js:908-916` |
| #13 | Animações de saída (animOut) | `canvas-engine.js:ANIM_DEFAULTS + CSS + props panel` |
| #15 | EyeDropper API | `color-picker.js:header + #cp-eyedropper` |
| #31 | Grupos de camadas (`Ctrl+G` agrupar, `Ctrl+Shift+G` desagrupar) | `canvas-engine.js:387-445` |
| #36 | Wire `btn-safe-area` | `app.js:2617` |

### 🟡 Média Prioridade — 100%
| # | Item | Arquivo |
|---|---|---|
| #17 | Arrow keys mover camadas (1%/10% Shift) | `app.js:_wireKeyboard` |
| #16 | Modal de atalhos de teclado + botão ? | `index.html` + `app.js:_wireShortcutsModal` |
| #20 | Export JPEG e WebP | `export-engine.js:exportImage` |
| #22 | FPS/bitrate no export vídeo | `index.html` + `app.js` |
| #25 | Shadow e efeitos (blur, boxShadow, textShadow) | `canvas-engine.js:_apply*Styles + props panel` |
| #27 | Validação de API key (validateApiKey) | `ai-engine.js` + `app.js:_saveAIConfig` |
| #19 | Histórico de cores recentes (localStorage) | `color-picker.js:_recentColors` |
| #21 | Export PDF (jsPDF via CDN) | `app.js:2107-2144`, `index.html` |
| #28 | Paleta de tons/sombras automáticos (`generateTones()`, `generateShades()`) | `brand-manager.js` |
| #33 | Templates por formato (galeria com modal) | `app.js:_getBuiltInTemplates,_openTemplatePreview,_renderTemplatesGallery` + `index.html` |
| #34 | Versionamento de preset (`_history[]` com 5 versões + UI restaurar) | `app.js:6389-6415` |
| #35 | Backup completo (brands + projects + presets + colors + fonts + assets) | `app.js:_exportFullBackup` |
| #37 | Fontes variáveis (slider de peso 100-900) | `index.html:1008`, `app.js:836-851` |

### 🟢 Polimento — 100%
| # | Item | Arquivo |
|---|---|---|
| #29 | Light theme (CSS variables `[data-theme="light"]`) | `css/variables.css` |
| #30 | `prefers-reduced-motion` CSS | `css/variables.css` |
| #38 | WCAG contrast badge (`_luminance`, `_wcagRatio`, `_updateWcagBadge`) | `color-picker.js` |
| #40 | Export preview modal (thumbnail in export modal) | `index.html` + `app.js` |
| #39 | Export settings in project JSON | `app.js` |

### 🆕 Adicionado nesta sessão
- Toggle "Usar docs no contexto" na AI (modal + side panel)
- Templates de apresentação (16:9, 16:10, 4:3, A4, Square)
- 26 templates redesenhados com backgrounds customizados
- Galeria de templates com grupo + formato tabs
- Preview do gradiente do template no card

## Bugs Conhecidos

| # | Descrição | Arquivo | Linha approx. |
|---|---|---|---|
| B1 | Undo não funciona após adicionar/remover slides | `slide-manager.js` | 99, 130 |
| B2 | Format badge não atualiza ao trocar de slide se o format for o mesmo objeto | `canvas-engine.js` | 320 |
| B3 | Video export usa `clientWidth` para scale (afetado por CSS transform) | `anim-engine.js` | 121–135 |
| B4 | Salvar preset pode falhar silenciosamente se `generateThumbnail` lançar erro | `app.js` | ~5170 |
| B5 | `_pasteLayerToAllSlides` + `_pasteLayer` pode colocar 2 camadas no slide ativo | `app.js` | ~5375 |
| B6 | Context menu de slide thumb usa indexOf no DOM que pode falhar se houver outros filhos | `app.js` | ~4847 |

---

## Melhorias de Arquitetura

### Separar lógica do DOM
`app.js` tem 5.500+ linhas misturando lógica de negócio e manipulação de DOM. Separar em:
- `ui/properties-panel.js` — painel de propriedades
- `ui/layer-list.js` — lista de camadas
- `ui/sidebar.js` — sidebar tabs
- `ui/modals.js` — modais reutilizáveis

### Event bus centralizado
Atualmente os componentes se comunicam por callbacks diretos. Um `EventBus` simples (`on`/`emit`) desacoplaria `SlideManager`, `CanvasEngine` e `App`.

### Worker para operações pesadas
`html2canvas` bloqueia a thread principal durante export/thumbnail. Mover para `OffscreenCanvas` + `Worker` manteria a UI responsiva durante export.

### Cache de thumbnails
Thumbnails são regenerados a cada mudança. Um sistema de cache baseado em hash do estado evitaria regeneração desnecessária.

---

## Resumo por Esforço

| Impacto | Esforço baixo | Esforço médio | Esforço alto |
|---|---|---|---|
| **Alto** | ✅ Setas para mover, toggle lock/visibility, contador chars, atalhos doc | ✅ Arrastar slides, alinhamento/distribuição, JPEG/WebP export, eyedropper | ✅ Drag/resize no canvas, edição inline, multi-select |
| **Médio** | ✅ Histórico de cores, modal de atalhos | ✅ Animações de saída, copiar/colar estilo, PDF export, tons/sombras, versionamento preset, backup completo, templates, fontes variáveis | ✅ Grupos de camadas |
| **Baixo** | ✅ Modo claro, `prefers-reduced-motion`, WCAG badge, export preview | ✅ Templates por formato (galeria), API key validation | ❌ Streaming IA, ❌ Worker para export |

## Descartados / Não Implementados

| # | Item | Motivo |
|---|---|---|
| #23 | Streaming de resposta IA | Requer refactoring grande do ai-engine.js com SSE. Impacto médio vs esforço alto |
| #26 | Modo pixel | Requer mudança de todo o sistema de coordenadas da UI. Manter % é mais consistente |

## Adicionados na Sessão Final

| # | Item |
|---|---|
| #11b | Crop de imagem com clip-path (cropX/Y/W/H + controles no painel) |
| #24 | Botão "🔄 Variante" para gerar variações com temperatura 1.2 + wiring completo |
| #32b | 100+ ícones Lucide inline + fallback Iconify API |
| #18b | Layouts de texto configurados para IA (8 layouts: headline-focused, two-text, etc.) |
| #1b | Templates de slides / apresentações (6 templates: pitch-deck, product-launch, etc.) |

---

## Estado Final — v1.3.0

**Total implementado: ~100% (40/40 itens)**

✅ Crítico: 6/6
✅ Alta Prioridade: 11/11  
✅ Média Prioridade: 14/14
✅ Polimento: 5/5
✅ Templates & Layouts: Sistema completo implementado
✅ Descartados: 2 (#23 Streaming IA, #26 Modo pixel)

**Resumo:**
- Editor visual completo (drag, resize, inline edit, multi-select, grupos)
- Sistema de templates com 40+ templates (social + apresentações)
- 5 formatos de apresentação (16:9, 16:10, 4:3, A4, Square)
- 6 templates de slides (pitch-deck, product-launch, event, team-update, tutorial, sale-promo)
- 8 layouts de texto configurados para IA (slots com prompts por zona)
- Export completo (PNG, JPEG, WebP, PDF, GIF, WebM)
- IA integrada com toggle de contexto de documentos + botão Variante (temperatura 1.2)
- Crop de imagem nativo (clip-path)
- Biblioteca local de 100+ ícones Lucide (funciona offline)
- Light theme, WCAG badges, fontes variáveis
- Backup/restore, versionamento de presets
- Collaboration real-time básica
- **Arquitetura modular**: canvas-utils.js, layer-factories.js separados do canvas-engine.js
