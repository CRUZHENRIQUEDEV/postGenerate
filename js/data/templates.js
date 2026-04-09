/* ============================================================
   Built-in Templates — PostGenerate
   Extracted from app.js to follow SOLID (data-only module)
   ============================================================ */

import { uuid } from "../utils/ui-helpers.js";

const mkShape = (id, name, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Forma",
  type: "shape",
  subtype: "rect",
  visible: true,
  locked: false,
  x: 8.5, y: 85, width: 15, height: 0.4,
  fillColor: "#7BC4EC",
  strokeColor: "transparent",
  strokeWidth: 0,
  borderRadius: 100,
  opacity: 1,
  animIn: "slide-left",
  animDelay: 0,
  ...overrides,
});

const mkCircle = (id, name, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Círculo",
  type: "shape",
  subtype: "circle",
  visible: true,
  locked: false,
  x: 85, y: 10, width: 20, height: 20,
  fillColor: "#7BC4EC",
  strokeColor: "transparent",
  strokeWidth: 0,
  borderRadius: 100,
  opacity: 0.3,
  ...overrides,
});

const mkLine = (id, name, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Linha",
  type: "shape",
  subtype: "rect",
  visible: true,
  locked: false,
  x: 5, y: 50, width: 25, height: 0.3,
  fillColor: "#ffffff",
  strokeColor: "transparent",
  strokeWidth: 0,
  borderRadius: 100,
  opacity: 0.5,
  ...overrides,
});

const mkText = (id, name, content, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Texto",
  type: "text",
  subtype: "headline",
  visible: true,
  locked: false,
  x: 8.5, y: 35, width: 83,
  content,
  fontFamily: "-apple-system",
  fontSize: 9,
  fontWeight: 800,
  fontStyle: "normal",
  color: "#ffffff",
  textAlign: "left",
  lineHeight: 1.2,
  letterSpacing: "0em",
  textTransform: "none",
  opacity: 1,
  animIn: "fade",
  ...overrides,
});

const mkBadge = (id, name, content, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Badge",
  type: "text",
  subtype: "badge",
  visible: true,
  locked: false,
  x: 5, y: 5, width: "auto",
  content,
  fontFamily: "-apple-system",
  fontSize: 2.1,
  fontWeight: 600,
  fontStyle: "normal",
  color: "#00D4FF",
  textAlign: "left",
  lineHeight: 1.2,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  opacity: 1,
  badgeBg: "transparent",
  badgeBorderColor: "rgba(0,212,255,0.5)",
  badgeBorderWidth: 1.5,
  badgeBorderRadius: 100,
  badgePaddingX: 1.5,
  badgePaddingY: 0.4,
  animIn: "fade",
  ...overrides,
});

const mkSub = (id, name, content, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Subtítulo",
  type: "text",
  subtype: "sub",
  visible: true,
  locked: false,
  x: 8.5, y: 65, width: 70,
  content,
  fontFamily: "-apple-system",
  fontSize: 3.5,
  fontWeight: 400,
  fontStyle: "normal",
  color: "rgba(255,255,255,0.75)",
  textAlign: "left",
  lineHeight: 1.4,
  letterSpacing: "0em",
  textTransform: "none",
  opacity: 1,
  animIn: "fade",
  animDelay: 0.1,
  ...overrides,
});

const mkImage = (id, name, src, overrides = {}) => ({
  id: id ?? uuid(),
  name: name ?? "Imagem",
  type: "image",
  src: src ?? "",
  visible: true,
  locked: false,
  x: 55, y: 15, width: 38, height: 60,
  opacity: 1,
  borderRadius: 0,
  ...overrides,
});

export function getBuiltInTemplates() {
  return [
    /* ══════════════════════════════════════════════════════
       INSTAGRAM FEED — SQUARE (1080×1080)
       ══════════════════════════════════════════════════════ */
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Neon Night",
      description: "Gradiente roxo-azul profundo com acentos em ciano neon.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0c29", to: "#302b63", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Círculo Neon", { x: 75, y: 5, width: 35, height: 35, fillColor: "#00D4FF", opacity: 0.15 }),
        mkCircle(uuid(), "Círculo Rastro", { x: 5, y: 70, width: 25, height: 25, fillColor: "#FF6B9D", opacity: 0.12 }),
        mkBadge(uuid(), "Badge", "LANÇAMENTO", { color: "#00D4FF", badgeBorderColor: "rgba(0,212,255,0.5)" }),
        mkText(uuid(), "Headline", "TÍTULO\nDE IMPACTO", { x: 5, y: 25, width: 90, fontSize: 11, fontWeight: 900, color: "#ffffff" }),
        mkLine(uuid(), "Linha", { x: 5, y: 60, width: 30, height: 0.3, fillColor: "#00D4FF", opacity: 0.7 }),
        mkSub(uuid(), "Sub", "Texto de apoio que complementa\no título principal da mensagem", { x: 5, y: 63, width: 75, fontSize: 3.2, color: "rgba(255,255,255,0.7)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Sunset Burst",
      description: "Gradiente laranja-rosa vibrante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#f12711", to: "#f5af19", angle: 45, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Círculo Glow", { x: 70, y: -10, width: 50, height: 50, fillColor: "#ffffff", opacity: 0.1 }),
        mkBadge(uuid(), "Badge", "OFERTA", { color: "#ffffff", badgeBg: "rgba(0,0,0,0.3)", badgeBorderColor: "transparent", badgeBorderWidth: 0 }),
        mkText(uuid(), "Headline", "OFERTA\nIMPERDÍVEL", { x: 5, y: 25, width: 90, fontSize: 11.5, fontWeight: 900, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Condição especial por tempo limitado.\nNão perca essa oportunidade!", { x: 5, y: 65, width: 75, fontSize: 3.5, color: "rgba(255,255,255,0.85)" }),
        mkShape(uuid(), "Barra CTA", { x: 5, y: 85, width: 35, height: 0.8, fillColor: "#ffffff", opacity: 0.95, borderRadius: 100, animIn: "slide-up" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Ocean Deep",
      description: "Gradiente azul oceano profundo.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#26d0ce", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Onda", { x: 0, y: 80, width: 100, height: 25, fillColor: "#1a2980", opacity: 0.4, borderRadius: 0 }),
        mkBadge(uuid(), "Badge", "DESTAQUE", { color: "#26d0ce" }),
        mkText(uuid(), "Headline", "CONTEÚDO\nPROFISSIONAL", { x: 5, y: 25, width: 90, fontSize: 10, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Texto de suporte com informações\nadicionais sobre o tema", { x: 5, y: 63, width: 75, fontSize: 3.2, color: "rgba(255,255,255,0.75)" }),
        mkLine(uuid(), "Linha", { x: 5, y: 60, width: 20, height: 0.3, fillColor: "#26d0ce", opacity: 0.8 }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Minimal Dark",
      description: "Preto absoluto com texto branco.",
      background: { type: "solid", color: "#000000" },
      layers: [
        mkText(uuid(), "Headline", "Menos é\nmais.", { x: 10, y: 35, width: 80, fontSize: 12, fontWeight: 700, color: "#ffffff", textAlign: "center" }),
        mkLine(uuid(), "Linha", { x: 35, y: 68, width: 30, height: 0.4, fillColor: "#ffffff", opacity: 0.6 }),
        mkSub(uuid(), "Sub", "Design minimalista", { x: 10, y: 73, width: 80, fontSize: 3, color: "rgba(255,255,255,0.5)", textAlign: "center" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Rose Gold",
      description: "Gradiente rose dourado elegante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#f5af19", to: "#f12711", angle: 120, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Círculo Soft", { x: 65, y: 60, width: 45, height: 45, fillColor: "#ffffff", opacity: 0.08 }),
        mkBadge(uuid(), "Badge", "EXCLUSIVO", { color: "#ffffff", badgeBg: "rgba(255,255,255,0.15)", badgeBorderColor: "transparent", badgeBorderWidth: 0 }),
        mkText(uuid(), "Headline", "EFEITO\nROSE GOLD", { x: 5, y: 28, width: 90, fontSize: 10.5, fontWeight: 900, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Mensagem elegante para\nmarcas e produtos premium", { x: 5, y: 63, width: 75, fontSize: 3.2, color: "rgba(255,255,255,0.8)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Forest Dark",
      description: "Gradiente verde floresta escuro.",
      background: { type: "gradient", gradient: { type: "linear", from: "#134e5e", to: "#71b280", angle: 140, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Folha 1", { x: 80, y: 5, width: 15, height: 15, fillColor: "#71b280", opacity: 0.3, borderRadius: 50 }),
        mkBadge(uuid(), "Badge", "SUSTENTÁVEL", { color: "#71b280" }),
        mkText(uuid(), "Headline", "CONSCIENTE\nE NATURAL", { x: 5, y: 28, width: 90, fontSize: 10, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Produtos que respeitam\no meio ambiente", { x: 5, y: 63, width: 75, fontSize: 3.2, color: "rgba(255,255,255,0.75)" }),
        mkLine(uuid(), "Linha", { x: 5, y: 60, width: 25, height: 0.3, fillColor: "#71b280", opacity: 0.8 }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Electric Violet",
      description: "Gradiente roxo elétrico vibrante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#301862", to: "#651e3e", angle: 110, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Círculo Glow", { x: -5, y: -5, width: 40, height: 40, fillColor: "#E040FB", opacity: 0.2 }),
        mkCircle(uuid(), "Círculo 2", { x: 75, y: 65, width: 30, height: 30, fillColor: "#00E5FF", opacity: 0.12 }),
        mkBadge(uuid(), "Badge", "INOVAÇÃO", { color: "#E040FB" }),
        mkText(uuid(), "Headline", "FUTURO\nÉ AGORA", { x: 5, y: 28, width: 90, fontSize: 11, fontWeight: 900, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Tecnologia de ponta para\ntransformar ideias em realidade", { x: 5, y: 63, width: 75, fontSize: 3, color: "rgba(255,255,255,0.7)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Midnight Gold",
      description: "Preto com dourado luxuoso.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0a0a0a", to: "#1a1206", angle: 90, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Linha Ouro", { x: 5, y: 22, width: 0.4, height: 60, fillColor: "#d4af37", opacity: 0.6 }),
        mkBadge(uuid(), "Badge", "PREMIUM", { color: "#d4af37", badgeBorderColor: "rgba(212,175,55,0.5)" }),
        mkText(uuid(), "Headline", "EXCLUSIVO\nE LUXUOSO", { x: 10, y: 28, width: 85, fontSize: 10.5, fontWeight: 900, color: "#d4af37" }),
        mkSub(uuid(), "Sub", "Experiência premium para\nclientes especiais", { x: 10, y: 63, width: 75, fontSize: 3.2, color: "rgba(212,175,55,0.7)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Coral Energy",
      description: "Gradiente coral vibrante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#ff6b6b", to: "#feca57", angle: 50, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Círculo", { x: 70, y: -10, width: 45, height: 45, fillColor: "#ffffff", opacity: 0.15 }),
        mkBadge(uuid(), "Badge", "🔥 VIRAL", { color: "#ffffff", badgeBg: "rgba(0,0,0,0.2)", badgeBorderColor: "transparent", badgeBorderWidth: 0 }),
        mkText(uuid(), "Headline", "ENERGIA\nPOSITIVA", { x: 5, y: 28, width: 90, fontSize: 11, fontWeight: 900, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Mensagem vibrante que\ntransmite alegria e energia", { x: 5, y: 63, width: 75, fontSize: 3.2, color: "rgba(255,255,255,0.85)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Paper & Ink",
      description: "Fundo creme elegante com texto marrom.",
      background: { type: "solid", color: "#fef9f3" },
      layers: [
        mkShape(uuid(), "Barra", { x: 5, y: 5, width: 0.5, height: 90, fillColor: "#3d2b1f", opacity: 0.8 }),
        mkBadge(uuid(), "Badge", "EDITORIAL", { color: "#3d2b1f", badgeBorderColor: "rgba(61,43,31,0.4)" }),
        mkText(uuid(), "Headline", "BELA\nESCRITA", { x: 10, y: 28, width: 85, fontSize: 11, fontWeight: 800, color: "#3d2b1f" }),
        mkLine(uuid(), "Linha", { x: 10, y: 60, width: 30, height: 0.4, fillColor: "#3d2b1f", opacity: 0.5 }),
        mkSub(uuid(), "Sub", "Texto elegante para marcas\nque valorizam详细内容", { x: 10, y: 63, width: 75, fontSize: 3, color: "rgba(61,43,31,0.7)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Bold Red",
      description: "Vermelho e preto de alto contraste.",
      background: { type: "gradient", gradient: { type: "linear", from: "#c0392b", to: "#000000", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "⚠️ ATENÇÃO", { color: "#ffffff", badgeBg: "rgba(0,0,0,0.4)", badgeBorderColor: "transparent", badgeBorderWidth: 0 }),
        mkText(uuid(), "Headline", "URGENTE\nAGORA", { x: 5, y: 28, width: 90, fontSize: 12, fontWeight: 900, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Mensagem de emergência\npara ação imediata", { x: 5, y: 63, width: 75, fontSize: 3.5, color: "rgba(255,255,255,0.8)" }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-feed-square",
      name: "Dark Quote",
      description: "Quote motivacional sobre fundo escuro.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0f0f", to: "#1a1a2e", angle: 130, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Aspas", "\"", { x: 5, y: 18, width: 20, fontSize: 20, fontWeight: 300, color: "#E040FB", opacity: 0.4 }),
        mkText(uuid(), "Quote", "Frase que inspira\ne transforma vidas", { x: 8, y: 35, width: 84, fontSize: 6.5, fontWeight: 600, fontStyle: "italic", color: "#ffffff", textAlign: "center", lineHeight: 1.5 }),
        mkLine(uuid(), "Linha", { x: 35, y: 70, width: 30, height: 0.3, fillColor: "#E040FB", opacity: 0.6 }),
        mkSub(uuid(), "Autor", "— Autor da citação", { x: 20, y: 75, width: 60, fontSize: 2.8, color: "rgba(255,255,255,0.5)", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       INSTAGRAM PORTRAIT (1080×1350)
       ══════════════════════════════════════════════════════ */
    {
      platform: "instagram", formatId: "ig-feed-portrait",
      name: "Editorial Portrait",
      description: "Layout editorial para formato retrato.",
      background: { type: "gradient", gradient: { type: "linear", from: "#232526", to: "#414345", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "ARTIGO", { color: "#f5af19" }),
        mkText(uuid(), "Headline", "TÍTULO DO\nARTIGO", { x: 5, y: 18, width: 90, fontSize: 9, fontWeight: 800, color: "#ffffff" }),
        mkLine(uuid(), "Linha", { x: 5, y: 50, width: 25, height: 0.3, fillColor: "#f5af19", opacity: 0.7 }),
        mkSub(uuid(), "Sub", "Resumo ou chamada para leitura completa do artigo publicado", { x: 5, y: 54, width: 80, fontSize: 3, color: "rgba(255,255,255,0.7)" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       INSTAGRAM STORY (1080×1920)
       ══════════════════════════════════════════════════════ */
    {
      platform: "instagram", formatId: "ig-story",
      name: "Story Neon",
      description: "Story fullscreen com gradiente e título centralizado.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0c29", to: "#302b63", angle: 180, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Headline", "SWIPE UP", { x: 5, y: 40, width: 90, fontSize: 14, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkSub(uuid(), "Sub", "ou toque no link", { x: 15, y: 65, width: 70, fontSize: 4, color: "rgba(255,255,255,0.6)", textAlign: "center" }),
        mkShape(uuid(), "CTA", { x: 25, y: 75, width: 50, height: 1.2, fillColor: "#00D4FF", opacity: 0.9, borderRadius: 100 }),
      ],
    },
    {
      platform: "instagram", formatId: "ig-story",
      name: "Story Split",
      description: "Story dividido: texto à esquerda, espaço para imagem à direita.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#26d0ce", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "TUTORIAL", { color: "#26d0ce" }),
        mkText(uuid(), "Headline", "PARTE 1:\nINTRODUÇÃO", { x: 5, y: 20, width: 45, fontSize: 6, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Continue passando para a próxima tela →", { x: 5, y: 50, width: 45, fontSize: 2.8, color: "rgba(255,255,255,0.7)" }),
        mkImage(uuid(), "Imagem", "", { x: 52, y: 10, width: 45, height: 35 }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       FACEBOOK
       ══════════════════════════════════════════════════════ */
    {
      platform: "facebook", formatId: "fb-post",
      name: "FB Evento",
      description: "Card de evento com gradiente azul escuro.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#2d5da1", angle: 140, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "🎉 EVENTO", { color: "#f5af19", badgeBg: "transparent", badgeBorderColor: "rgba(245,175,25,0.5)" }),
        mkText(uuid(), "Headline", "NOME DO\nEVENTO", { x: 5, y: 22, width: 90, fontSize: 9, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Info", "📅 25 de Dezembro\n📍 Online + Presencial\n🔥 Inscreva-se já!", { x: 5, y: 55, width: 85, fontSize: 3, color: "rgba(255,255,255,0.8)" }),
      ],
    },
    {
      platform: "facebook", formatId: "fb-post",
      name: "FB Promo Flash",
      description: "Promoção com gradiente vermelho-laranja de urgência.",
      background: { type: "gradient", gradient: { type: "linear", from: "#e74c3c", to: "#f39c12", angle: 60, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "⚡ OFERTA", { color: "#ffffff", badgeBg: "rgba(0,0,0,0.3)", badgeBorderColor: "transparent" }),
        mkText(uuid(), "Headline", "DE R$199\nPOR R$99", { x: 5, y: 25, width: 90, fontSize: 10, fontWeight: 900, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Só hoje! Corra!\nÚltimas unidades", { x: 5, y: 62, width: 75, fontSize: 3.5, color: "rgba(255,255,255,0.85)" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       LINKEDIN
       ══════════════════════════════════════════════════════ */
    {
      platform: "linkedin", formatId: "li-post-square",
      name: "LI Profissional",
      description: "Post profissional com gradiente navy elegante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f1923", to: "#1a2980", angle: 150, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "LINKEDIN", { color: "#0A66C2", badgeBorderColor: "rgba(10,102,194,0.5)" }),
        mkText(uuid(), "Headline", "POST\nPROFISSIONAL", { x: 5, y: 28, width: 90, fontSize: 9.5, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Conteúdo corporativo para\nengajar sua rede profissional", { x: 5, y: 62, width: 80, fontSize: 3, color: "rgba(255,255,255,0.7)" }),
      ],
    },
    {
      platform: "linkedin", formatId: "li-post",
      name: "LI Thought Leadership",
      description: "Quote em itálico para posicionamento de liderança.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f1923", to: "#1e3a5f", angle: 130, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Aspas", "\"", { x: 5, y: 18, width: 15, fontSize: 16, fontWeight: 300, color: "#0A66C2", opacity: 0.5 }),
        mkText(uuid(), "Quote", "Opinião forte sobre o futuro\nda indústria. Frase de impacto.", { x: 8, y: 28, width: 84, fontSize: 5, fontWeight: 600, fontStyle: "italic", color: "#ffffff", textAlign: "center", lineHeight: 1.5 }),
        mkLine(uuid(), "Linha", { x: 30, y: 62, width: 40, height: 0.3, fillColor: "#0A66C2", opacity: 0.6 }),
        mkSub(uuid(), "Autor", "Seu Nome • Cargo", { x: 20, y: 67, width: 60, fontSize: 3, color: "rgba(255,255,255,0.5)", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       YOUTUBE
       ══════════════════════════════════════════════════════ */
    {
      platform: "youtube", formatId: "yt-thumb",
      name: "YT Thumbnail",
      description: "Thumbnail clássico dark com título branco gigante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0f0f", to: "#1a1a1a", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Headline", "VIDEO\nTITLE", { x: 3, y: 55, width: 94, fontSize: 14, fontWeight: 900, color: "#ffffff" }),
        mkShape(uuid(), "Barra", { x: 3, y: 85, width: 40, height: 0.5, fillColor: "#ff0000", opacity: 0.9 }),
        mkSub(uuid(), "Sub", "@canal • 12K views", { x: 3, y: 88, width: 50, fontSize: 2.8, color: "rgba(255,255,255,0.6)" }),
      ],
    },
    {
      platform: "youtube", formatId: "yt-thumb",
      name: "YT Reação",
      description: "Thumbnail dramático com título em vermelho.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a1a1a", to: "#2d2d2d", angle: 150, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Headline", "VOCÊ NÃO\nVAI ACREDITAR", { x: 3, y: 50, width: 94, fontSize: 12, fontWeight: 900, color: "#ff0000" }),
        mkShape(uuid(), "Rect", { x: 3, y: 80, width: 35, height: 0.6, fillColor: "#ff0000", opacity: 0.8 }),
        mkSub(uuid(), "Sub", "@canal • views", { x: 3, y: 84, width: 50, fontSize: 2.8, color: "rgba(255,255,255,0.6)" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       WHATSAPP STATUS
       ══════════════════════════════════════════════════════ */
    {
      platform: "whatsapp", formatId: "whatsapp-status",
      name: "WA Status",
      description: "Status WhatsApp com gradiente verde vibrante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#25D366", to: "#128C7E", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Headline", "OFERTA\nDO DIA 🔥", { x: 5, y: 35, width: 90, fontSize: 11, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkSub(uuid(), "Sub", "Produto • R$99", { x: 15, y: 70, width: 70, fontSize: 4, color: "rgba(255,255,255,0.85)", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       TIKTOK
       ══════════════════════════════════════════════════════ */
    {
      platform: "tiktok", formatId: "tiktok-video",
      name: "TikTok Bold",
      description: "Cover TikTok dark com acentos neon cyan e pink.",
      background: { type: "gradient", gradient: { type: "linear", from: "#000000", to: "#0f0f0f", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Neon1", { x: 70, y: -10, width: 40, height: 40, fillColor: "#00F5FF", opacity: 0.15 }),
        mkCircle(uuid(), "Neon2", { x: -5, y: 60, width: 35, height: 35, fillColor: "#FF0080", opacity: 0.12 }),
        mkBadge(uuid(), "Badge", "🔥 VIRAL", { color: "#00F5FF", badgeBorderColor: "rgba(0,245,255,0.5)" }),
        mkText(uuid(), "Headline", "VÍDEO\nTIKTOK", { x: 5, y: 30, width: 90, fontSize: 12, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkSub(uuid(), "Sub", "@usuario • #fyp #viral", { x: 15, y: 72, width: 70, fontSize: 3.5, color: "rgba(255,255,255,0.6)", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       PINTEREST
       ══════════════════════════════════════════════════════ */
    {
      platform: "pinterest", formatId: "pinterest-pin",
      name: "Pin Inspiração",
      description: "Pin vertical com gradiente elegante.",
      background: { type: "gradient", gradient: { type: "linear", from: "#301862", to: "#651e3e", angle: 150, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "💡 IDEIA", { color: "#f5af19", badgeBg: "transparent", badgeBorderColor: "rgba(245,175,25,0.5)" }),
        mkText(uuid(), "Headline", "IDEIA\nINSPIRADORA", { x: 5, y: 18, width: 90, fontSize: 9, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Sub", "Salva para ver depois.\nInspire-se todos os dias.", { x: 5, y: 55, width: 80, fontSize: 3, color: "rgba(255,255,255,0.7)" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       GENERIC / OTHER
       ══════════════════════════════════════════════════════ */
    {
      platform: "other", formatId: "ig-feed-square",
      name: "Capa de Ebook",
      description: "Capa estilo ebook com gradiente dark.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a1a2e", to: "#16213e", angle: 140, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "EBOOK", { color: "#f5af19", badgeBorderColor: "rgba(245,175,25,0.5)" }),
        mkText(uuid(), "Headline", "TÍTULO DO\nEBOOK", { x: 5, y: 30, width: 90, fontSize: 10.5, fontWeight: 800, color: "#ffffff" }),
        mkLine(uuid(), "Linha", { x: 5, y: 60, width: 30, height: 0.3, fillColor: "#f5af19", opacity: 0.6 }),
        mkSub(uuid(), "Sub", "Nome do Autor", { x: 5, y: 65, width: 75, fontSize: 3.5, color: "rgba(255,255,255,0.6)" }),
      ],
    },
    {
      platform: "other", formatId: "ig-feed-square",
      name: "Anúncio",
      description: "Card para classificados.",
      background: { type: "gradient", gradient: { type: "linear", from: "#2d2d2d", to: "#1a1a1a", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "ANÚNCIO", { color: "#ff9800" }),
        mkText(uuid(), "Headline", "PRODUTO\nÀ VENDA", { x: 5, y: 22, width: 90, fontSize: 9, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Info", "R$ 199\nCondição: Novo\nLocal: São Paulo", { x: 5, y: 52, width: 80, fontSize: 3, color: "rgba(255,255,255,0.7)" }),
        mkShape(uuid(), "CTA", { x: 5, y: 78, width: 40, height: 0.9, fillColor: "#25D366", opacity: 0.95, borderRadius: 100 }),
        mkText(uuid(), "WhatsApp", "💬 WHATSAPP", { x: 6, y: 79.3, width: 38, fontSize: 2.2, fontWeight: 700, color: "#ffffff", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       APRESENTAÇÕES — SLIDE 16:9 (1920×1080)
       ══════════════════════════════════════════════════════ */
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Título Principal",
      description: "Slide de título com título grande centralizado.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0c29", to: "#302b63", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Barra Topo", { x: 0, y: 0, width: 100, height: 8, fillColor: "#00D4FF", opacity: 0.8, borderRadius: 0 }),
        mkText(uuid(), "Título", "TÍTULO DA\nAPRESENTAÇÃO", { x: 8, y: 35, width: 84, fontSize: 8, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkShape(uuid(), "Linha", { x: 35, y: 62, width: 30, height: 0.3, fillColor: "#00D4FF", opacity: 0.8 }),
        mkSub(uuid(), "Sub", "Subtítulo descritivo da apresentação", { x: 15, y: 65, width: 70, fontSize: 3, color: "rgba(255,255,255,0.7)", textAlign: "center" }),
        mkShape(uuid(), "Barra Fundo", { x: 0, y: 92, width: 100, height: 8, fillColor: "#00D4FF", opacity: 0.8, borderRadius: 0 }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Divisor de Seção",
      description: "Slide minimalista com título de seção em destaque.",
      background: { type: "solid", color: "#1a1a2e" },
      layers: [
        mkCircle(uuid(), "Círculo", { x: 75, y: 10, width: 30, height: 30, fillColor: "#E040FB", opacity: 0.15, borderRadius: 50 }),
        mkText(uuid(), "Seção", "NOME DA\nSEÇÃO", { x: 8, y: 38, width: 84, fontSize: 10, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkLine(uuid(), "Linha", { x: 40, y: 60, width: 20, height: 0.4, fillColor: "#E040FB", opacity: 0.7 }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Conteúdo com Bullet",
      description: "Slide de conteúdo com título no topo e lista de pontos.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#26d0ce", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Barra Topo", { x: 0, y: 0, width: 100, height: 5, fillColor: "#26d0ce", opacity: 0.9, borderRadius: 0 }),
        mkBadge(uuid(), "Badge", "TÓPICO", { color: "#26d0ce" }),
        mkText(uuid(), "Título", "TÍTULO DO\nCONTEÚDO", { x: 5, y: 15, width: 90, fontSize: 6, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Bullets", "→ Primeiro ponto importante\n→ Segundo ponto relevante\n→ Terceiro ponto clave\n→ Quarto ponto final", { x: 5, y: 45, width: 70, fontSize: 3.2, color: "rgba(255,255,255,0.85)", lineHeight: 1.8 }),
        mkShape(uuid(), "Deco", { x: 80, y: 50, width: 15, height: 15, fillColor: "#26d0ce", opacity: 0.2, borderRadius: 50 }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Duas Colunas",
      description: "Slide com layout de duas colunas.",
      background: { type: "gradient", gradient: { type: "linear", from: "#232526", to: "#414345", angle: 150, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Título", "COMPARAÇÃO", { x: 5, y: 8, width: 90, fontSize: 5, fontWeight: 800, color: "#ffffff" }),
        mkShape(uuid(), "Divisor", { x: 50, y: 20, width: 0.3, height: 65, fillColor: "#ffffff", opacity: 0.2 }),
        mkSub(uuid(), "Coluna 1", "LADO ESQUERDO\n\nPonto um do lado esquerdo com detalhes.\n\nPonto dois com mais informações.", { x: 3, y: 22, width: 44, fontSize: 2.8, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }),
        mkSub(uuid(), "Coluna 2", "LADO DIREITO\n\nPonto um do lado direito com detalhes.\n\nPonto dois com mais informações.", { x: 53, y: 22, width: 44, fontSize: 2.8, color: "rgba(255,255,255,0.8)", lineHeight: 1.6 }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Slide Citação",
      description: "Slide de citação com aspas grandes.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0f0f", to: "#1a1a2e", angle: 130, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "Aspas", "\"", { x: 5, y: 15, width: 15, fontSize: 20, fontWeight: 200, color: "#E040FB", opacity: 0.4 }),
        mkText(uuid(), "Quote", "Esta é uma citação importante que destaca um ponto fundamental da apresentação.", { x: 10, y: 30, width: 80, fontSize: 5, fontWeight: 500, fontStyle: "italic", color: "#ffffff", textAlign: "center", lineHeight: 1.6 }),
        mkLine(uuid(), "Linha", { x: 38, y: 58, width: 24, height: 0.3, fillColor: "#E040FB", opacity: 0.6 }),
        mkSub(uuid(), "Autor", "— Nome do Autor, Cargo", { x: 25, y: 62, width: 50, fontSize: 2.8, color: "rgba(255,255,255,0.5)", textAlign: "center" }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Call to Action",
      description: "Slide final com CTA.",
      background: { type: "gradient", gradient: { type: "linear", from: "#e74c3c", to: "#f39c12", angle: 60, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkText(uuid(), "CTA", "PARTICIPE!", { x: 8, y: 32, width: 84, fontSize: 10, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkSub(uuid(), "Detalhe", "Chamada para ação específica\ncom instruções claras", { x: 20, y: 52, width: 60, fontSize: 3, color: "rgba(255,255,255,0.85)", textAlign: "center", lineHeight: 1.5 }),
        mkShape(uuid(), "Botão", { x: 35, y: 70, width: 30, height: 1.5, fillColor: "#ffffff", opacity: 0.95, borderRadius: 100 }),
        mkText(uuid(), "Texto CTA", "ACESSE O LINK", { x: 35, y: 70.3, width: 30, fontSize: 2, fontWeight: 700, color: "#e74c3c", textAlign: "center" }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-9",
      name: "Obrigado",
      description: "Slide final de encerramento.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0c29", to: "#302b63", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Círculo 1", { x: 80, y: -5, width: 35, height: 35, fillColor: "#00D4FF", opacity: 0.1, borderRadius: 50 }),
        mkShape(uuid(), "Círculo 2", { x: -5, y: 70, width: 30, height: 30, fillColor: "#E040FB", opacity: 0.1, borderRadius: 50 }),
        mkText(uuid(), "Obrigado", "OBRIGADO!", { x: 8, y: 38, width: 84, fontSize: 12, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkLine(uuid(), "Linha", { x: 40, y: 58, width: 20, height: 0.3, fillColor: "#00D4FF", opacity: 0.7 }),
        mkSub(uuid(), "Contato", "contato@empresa.com", { x: 25, y: 62, width: 50, fontSize: 2.5, color: "rgba(255,255,255,0.6)", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       SLIDE 16:10 (1280×800)
       ══════════════════════════════════════════════════════ */
    {
      platform: "presentation", formatId: "slide-16-10",
      name: "Título 16:10",
      description: "Slide de título para formato 16:10.",
      background: { type: "gradient", gradient: { type: "linear", from: "#134e5e", to: "#71b280", angle: 140, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Barra", { x: 0, y: 0, width: 100, height: 6, fillColor: "#71b280", opacity: 0.9, borderRadius: 0 }),
        mkText(uuid(), "Título", "TÍTULO DO\nSLIDE", { x: 8, y: 30, width: 84, fontSize: 8, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkLine(uuid(), "Linha", { x: 38, y: 58, width: 24, height: 0.3, fillColor: "#71b280", opacity: 0.7 }),
        mkSub(uuid(), "Sub", "Subtítulo do slide", { x: 20, y: 62, width: 60, fontSize: 3, color: "rgba(255,255,255,0.7)", textAlign: "center" }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-16-10",
      name: "Conteúdo 16:10",
      description: "Slide de conteúdo para formato 16:10.",
      background: { type: "gradient", gradient: { type: "linear", from: "#232526", to: "#414345", angle: 150, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkBadge(uuid(), "Badge", "TÓPICO", { color: "#f5af19" }),
        mkText(uuid(), "Título", "CONTEÚDO", { x: 5, y: 15, width: 90, fontSize: 6, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Bullets", "→ Ponto importante um\n→ Ponto relevante dois\n→ Ponto clave três", { x: 5, y: 40, width: 70, fontSize: 3, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       SLIDE 4:3 (1024×768)
       ══════════════════════════════════════════════════════ */
    {
      platform: "presentation", formatId: "slide-4-3",
      name: "Título 4:3",
      description: "Slide de título para formato 4:3.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#2d5da1", angle: 140, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Barra", { x: 0, y: 0, width: 100, height: 7, fillColor: "#f5af19", opacity: 0.9, borderRadius: 0 }),
        mkText(uuid(), "Título", "TÍTULO", { x: 8, y: 32, width: 84, fontSize: 9, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkSub(uuid(), "Sub", "Subtítulo descritivo", { x: 20, y: 55, width: 60, fontSize: 3.5, color: "rgba(255,255,255,0.75)", textAlign: "center" }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       SLIDE A4 PAISAGEM (1123×794)
       ══════════════════════════════════════════════════════ */
    {
      platform: "presentation", formatId: "slide-a4",
      name: "Título A4",
      description: "Slide em formato A4 paisagem.",
      background: { type: "gradient", gradient: { type: "linear", from: "#fef9f3", to: "#f5f0e8", angle: 140, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Barra", { x: 0, y: 0, width: 100, height: 5, fillColor: "#3d2b1f", opacity: 0.8, borderRadius: 0 }),
        mkText(uuid(), "Título", "TÍTULO DO\nDOCUMENTO", { x: 8, y: 30, width: 84, fontSize: 8, fontWeight: 800, color: "#3d2b1f", textAlign: "center" }),
        mkLine(uuid(), "Linha", { x: 38, y: 58, width: 24, height: 0.3, fillColor: "#3d2b1f", opacity: 0.5 }),
        mkSub(uuid(), "Sub", "Subtítulo ou descrição", { x: 20, y: 62, width: 60, fontSize: 3, color: "rgba(61,43,31,0.7)", textAlign: "center" }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-a4",
      name: "Conteúdo A4",
      description: "Slide de conteúdo em formato A4 paisagem.",
      background: { type: "solid", color: "#fef9f3" },
      layers: [
        mkShape(uuid(), "Barra Lateral", { x: 0, y: 0, width: 0.5, height: 100, fillColor: "#3d2b1f", opacity: 0.7 }),
        mkBadge(uuid(), "Badge", "TÓPICO", { color: "#3d2b1f", badgeBorderColor: "rgba(61,43,31,0.4)" }),
        mkText(uuid(), "Título", "TÍTULO", { x: 8, y: 15, width: 85, fontSize: 6, fontWeight: 800, color: "#3d2b1f" }),
        mkSub(uuid(), "Texto", "Texto de conteúdo organizado em parágrafos claros e objetivos para facilitar a leitura.", { x: 8, y: 38, width: 75, fontSize: 3, color: "rgba(61,43,31,0.8)", lineHeight: 1.6 }),
      ],
    },
    /* ══════════════════════════════════════════════════════
       SLIDE QUADRADO (1080×1080)
       ══════════════════════════════════════════════════════ */
    {
      platform: "presentation", formatId: "slide-square",
      name: "Título Quadrado",
      description: "Slide quadrado para projeção e redes sociais.",
      background: { type: "gradient", gradient: { type: "linear", from: "#0f0c29", to: "#302b63", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkCircle(uuid(), "Círculo", { x: 70, y: 5, width: 35, height: 35, fillColor: "#00D4FF", opacity: 0.12, borderRadius: 50 }),
        mkBadge(uuid(), "Badge", "APRESENTAÇÃO", { color: "#00D4FF" }),
        mkText(uuid(), "Título", "TÍTULO DO\nSLIDE", { x: 5, y: 28, width: 90, fontSize: 9.5, fontWeight: 900, color: "#ffffff", textAlign: "center" }),
        mkLine(uuid(), "Linha", { x: 35, y: 60, width: 30, height: 0.3, fillColor: "#00D4FF", opacity: 0.7 }),
        mkSub(uuid(), "Sub", "Subtítulo descritivo", { x: 15, y: 64, width: 70, fontSize: 3.2, color: "rgba(255,255,255,0.7)", textAlign: "center" }),
      ],
    },
    {
      platform: "presentation", formatId: "slide-square",
      name: "Conteúdo Quadrado",
      description: "Slide de conteúdo quadrado.",
      background: { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#26d0ce", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } },
      layers: [
        mkShape(uuid(), "Barra", { x: 0, y: 0, width: 100, height: 5, fillColor: "#26d0ce", opacity: 0.9, borderRadius: 0 }),
        mkBadge(uuid(), "Badge", "TÓPICO", { color: "#26d0ce" }),
        mkText(uuid(), "Título", "CONTEÚDO", { x: 5, y: 18, width: 90, fontSize: 7, fontWeight: 800, color: "#ffffff" }),
        mkSub(uuid(), "Bullets", "→ Ponto importante\n→ Ponto relevante\n→ Ponto clave", { x: 5, y: 45, width: 75, fontSize: 3.2, color: "rgba(255,255,255,0.8)", lineHeight: 1.8 }),
      ],
    },
  ];
}

export function getBuiltInSlideTemplates() {
  const mkSlideBg = (from, to, angle = 135) => ({
    type: "gradient",
    gradient: { type: "linear", from, to, angle, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 }
  });

  const mkTextL = (id, name, content, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Texto",
    type: "text",
    subtype: "body",
    visible: true,
    locked: false,
    x: 5, y: 50, width: 90,
    content,
    fontFamily: "-apple-system",
    fontSize: 3.5,
    fontWeight: 400,
    fontStyle: "normal",
    color: "rgba(255,255,255,0.85)",
    textAlign: "left",
    lineHeight: 1.5,
    letterSpacing: "0em",
    textTransform: "none",
    opacity: 1,
    animIn: "fade",
    ...overrides,
  });

  const mkHeadlineL = (id, name, content, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Título",
    type: "text",
    subtype: "headline",
    visible: true,
    locked: false,
    x: 5, y: 30, width: 90,
    content,
    fontFamily: "-apple-system",
    fontSize: 8,
    fontWeight: 800,
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "left",
    lineHeight: 1.1,
    letterSpacing: "-0.02em",
    textTransform: "none",
    opacity: 1,
    animIn: "fade",
    ...overrides,
  });

  const mkSubL = (id, name, content, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Subtítulo",
    type: "text",
    subtype: "sub",
    visible: true,
    locked: false,
    x: 5, y: 65, width: 70,
    content,
    fontFamily: "-apple-system",
    fontSize: 3,
    fontWeight: 400,
    fontStyle: "normal",
    color: "rgba(255,255,255,0.7)",
    textAlign: "left",
    lineHeight: 1.5,
    letterSpacing: "0em",
    textTransform: "none",
    opacity: 1,
    animIn: "slide-up",
    animDelay: 0.15,
    ...overrides,
  });

  const mkBadgeL = (id, name, content, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Badge",
    type: "text",
    subtype: "badge",
    visible: true,
    locked: false,
    x: 5, y: 5, width: "auto",
    content,
    fontFamily: "-apple-system",
    fontSize: 2,
    fontWeight: 600,
    fontStyle: "normal",
    color: "#00D4FF",
    textAlign: "left",
    lineHeight: 1.2,
    letterSpacing: "0.07em",
    textTransform: "uppercase",
    opacity: 1,
    badgeBg: "transparent",
    badgeBorderColor: "rgba(0,212,255,0.4)",
    badgeBorderWidth: 1,
    badgeBorderRadius: 100,
    badgePaddingX: 1.2,
    badgePaddingY: 0.35,
    animIn: "fade",
    ...overrides,
  });

  const mkShapeL = (id, name, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Forma",
    type: "shape",
    subtype: "rect",
    visible: true,
    locked: false,
    x: 5, y: 85, width: 20, height: 0.5,
    fillColor: "#00D4FF",
    strokeColor: "transparent",
    strokeWidth: 0,
    borderRadius: 100,
    opacity: 1,
    animIn: "slide-left",
    animDelay: 0.1,
    ...overrides,
  });

  const mkLineL = (id, name, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Linha",
    type: "shape",
    subtype: "rect",
    visible: true,
    locked: false,
    x: 5, y: 50, width: 25, height: 0.3,
    fillColor: "#ffffff",
    strokeColor: "transparent",
    strokeWidth: 0,
    borderRadius: 100,
    opacity: 0.5,
    animIn: "slide-left",
    ...overrides,
  });

  const mkCircleL = (id, name, overrides = {}) => ({
    id: id ?? uuid(),
    name: name ?? "Círculo",
    type: "shape",
    subtype: "circle",
    visible: true,
    locked: false,
    x: 75, y: 5, width: 30, height: 30,
    fillColor: "#00D4FF",
    strokeColor: "transparent",
    strokeWidth: 0,
    borderRadius: 100,
    opacity: 0.15,
    ...overrides,
  });

  const baseState = (formatId, layers, bg) => ({
    formatId,
    background: bg || mkSlideBg("#0f0c29", "#302b63", 135),
    layers,
  });

  return [
    /* ══════════════════════════════════════════════════════
       PITCH DECK — 6 slides business
       ══════════════════════════════════════════════════════ */
    {
      templateId: "pitch-deck-6",
      name: "Pitch Deck",
      description: "6 slides profissionais para presentations de negócios.",
      category: "business",
      platform: "presentation",
      formats: ["slide-16-9", "slide-16-10", "slide-4-3", "slide-a4", "slide-square"],
      aiPromptTemplate: "gere um pitch deck profissional para {topic}, com tom {tone}",
      palettes: ["#0f0c29", "#302b63", "#00D4FF", "#ffffff"],
      slides: [
        { formatId: "slide-16-9", name: "Slide 1 — Capa", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow 1", { x: 70, y: -5, width: 50, height: 50, fillColor: "#00D4FF", opacity: 0.1 }), mkCircleL(uuid(), "Glow 2", { x: -5, y: 70, width: 40, height: 40, fillColor: "#FF6B9D", opacity: 0.08 }), mkBadgeL(uuid(), "Badge", "PITCH DECK", { x: 5, y: 5, color: "#00D4FF" }), mkHeadlineL(uuid(), "Título", "NOME DA\nEMPRESA", { x: 5, y: 28, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkLineL(uuid(), "Linha", { x: 35, y: 58, width: 30, height: 0.4, fillColor: "#00D4FF", opacity: 0.8 }), mkSubL(uuid(), "Sub", "Tagline descritiva do projeto ou empresa", { x: 15, y: 62, width: 70, textAlign: "center", color: "rgba(255,255,255,0.7)" }), mkTextL(uuid(), "Autor", "Seu Nome • Cargo", { x: 5, y: 88, width: 90, fontSize: 2.5, color: "rgba(255,255,255,0.5)", textAlign: "center" })], mkSlideBg("#0f0c29", "#302b63", 135)), animIn: "fade", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 2 — Problema", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "O PROBLEMA", { color: "#FF6B9D" }), mkHeadlineL(uuid(), "Título", "QUAL O\nPROBLEMA?", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Linha", { x: 5, y: 50, width: 15, height: 0.5, fillColor: "#FF6B9D" }), mkSubL(uuid(), "P1", "→ Dor principal do mercado-alvo\nque afeta milhares de pessoas", { x: 5, y: 55, width: 85, fontSize: 3.2, lineHeight: 1.7 }), mkSubL(uuid(), "P2", "→ Consequência quando o problema\nnão é resolvido a tempo", { x: 5, y: 72, width: 85, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#1a1a2e", "#16213e", 160)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 3 — Solução", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "A SOLUÇÃO", { color: "#4CAF50" }), mkHeadlineL(uuid(), "Título", "COMO\nRESOLVEMOS", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Linha", { x: 5, y: 50, width: 15, height: 0.5, fillColor: "#4CAF50" }), mkSubL(uuid(), "Solução", "Nossa solução resolve o problema\nde forma inovadora e escalável,\ngenerando valor real para clientes.", { x: 5, y: 55, width: 85, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 4 — Produto", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "PRODUTO", { color: "#FFC107" }), mkHeadlineL(uuid(), "Título", "NOSSO\nPRODUTO", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Linha", { x: 5, y: 50, width: 15, height: 0.5, fillColor: "#FFC107" }), mkSubL(uuid(), "Feature 1", "✦ Feature principal do produto", { x: 5, y: 55, width: 85, fontSize: 3 }), mkSubL(uuid(), "Feature 2", "✦ Segunda feature relevante", { x: 5, y: 65, width: 85, fontSize: 3 }), mkSubL(uuid(), "Feature 3", "✦ Terceira feature diferenciada", { x: 5, y: 75, width: 85, fontSize: 3 })], mkSlideBg("#1a1a2e", "#2d2b55", 140)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 5 — Mercado", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "MERCADO", { color: "#9C27B0" }), mkHeadlineL(uuid(), "Título", "OPORTUNIDADE\nDE MERCADO", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Linha", { x: 5, y: 50, width: 15, height: 0.5, fillColor: "#9C27B0" }), mkSubL(uuid(), "TAM", "TAM: R$ 10 Bilhões", { x: 5, y: 55, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "SAM", "SAM: R$ 2 Bilhões", { x: 5, y: 65, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "SOM", "SOM: R$ 500 Milhões", { x: 5, y: 75, width: 85, fontSize: 3.2 })], mkSlideBg("#0f0c29", "#4a148c", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 6 — CTA", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow", { x: 50, y: 30, width: 60, height: 60, fillColor: "#00D4FF", opacity: 0.08 }), mkHeadlineL(uuid(), "Título", "VEM COM\AGENTE!", { x: 5, y: 30, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Entre em contato para saber mais\nsobre como podemos ajudar", { x: 15, y: 62, width: 70, textAlign: "center" }), mkShapeL(uuid(), "CTA Barra", { x: 30, y: 80, width: 40, height: 0.6, fillColor: "#00D4FF", opacity: 1 })], mkSlideBg("#0f0c29", "#302b63", 135)), animIn: "scale", animOut: "fade" },
      ],
    },
    /* ══════════════════════════════════════════════════════
       PRODUCT LAUNCH — 4 slides
       ══════════════════════════════════════════════════════ */
    {
      templateId: "product-launch",
      name: "Lançamento de Produto",
      description: "4 slides para lanzamiento de producto.",
      category: "product",
      platform: "presentation",
      formats: ["slide-16-9", "slide-16-10", "slide-4-3", "slide-a4", "slide-square"],
      aiPromptTemplate: "gere um lançamento de produto para {topic}",
      palettes: ["#f12711", "#f5af19", "#ffffff", "#000000"],
      slides: [
        { formatId: "slide-16-9", name: "Slide 1 — Capa", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow", { x: 60, y: -10, width: 60, height: 60, fillColor: "#f5af19", opacity: 0.15 }), mkBadgeL(uuid(), "Badge", "LANÇAMENTO", { x: 5, y: 5, color: "#f5af19", badgeBg: "rgba(241,39,17,0.2)", badgeBorderColor: "transparent", badgeBorderWidth: 0 }), mkHeadlineL(uuid(), "Título", "NOME DO\nPRODUTO", { x: 5, y: 30, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "A solução que você estava esperando\nchegou para transformar seu negócio", { x: 15, y: 62, width: 70, textAlign: "center" })], { type: "gradient", gradient: { type: "linear", from: "#f12711", to: "#f5af19", angle: 45, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "fade", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 2 — Feature", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "DESTAQUE", { color: "#f5af19" }), mkHeadlineL(uuid(), "Título", "FEATURE\nPRINCIPAL", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Linha", { x: 5, y: 50, width: 15, height: 0.5, fillColor: "#f5af19" }), mkSubL(uuid(), "Desc", "Descreva aqui a principal funcionalidade\ndo produto com clareza e impacto.", { x: 5, y: 55, width: 85, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#1a1a2e", "#2d2b55", 140)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 3 — Benefícios", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "BENEFÍCIOS", { color: "#4CAF50" }), mkHeadlineL(uuid(), "Título", "POR QUE\nESCOLHER", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkSubL(uuid(), "B1", "✓ Benefício número um do produto", { x: 5, y: 52, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "B2", "✓ Benefício número dois do produto", { x: 5, y: 62, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "B3", "✓ Benefício número três do produto", { x: 5, y: 72, width: 85, fontSize: 3.2 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 4 — CTA", state: baseState("slide-16-9", [mkHeadlineL(uuid(), "Título", "EXPERIMENTE\nHOJE", { x: 5, y: 30, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Comece agora mesmo e transforme\nseu negócio com nossa solução", { x: 15, y: 62, width: 70, textAlign: "center" }), mkShapeL(uuid(), "CTA", { x: 30, y: 80, width: 40, height: 0.6, fillColor: "#f5af19", opacity: 1 })], { type: "gradient", gradient: { type: "linear", from: "#f12711", to: "#f5af19", angle: 45, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "scale", animOut: "fade" },
      ],
    },
    /* ══════════════════════════════════════════════════════
       EVENT PROMOTION — 3 slides
       ══════════════════════════════════════════════════════ */
    {
      templateId: "event-promotion",
      name: "Promoção de Evento",
      description: "3 slides para promotionar eventos.",
      category: "event",
      platform: "presentation",
      formats: ["slide-16-9", "slide-16-10", "slide-4-3", "slide-a4", "slide-square"],
      aiPromptTemplate: "gere uma promoção de evento para {topic}",
      palettes: ["#667eea", "#764ba2", "#ffffff"],
      slides: [
        { formatId: "slide-16-9", name: "Slide 1 — Capa", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow 1", { x: 70, y: -5, width: 50, height: 50, fillColor: "#764ba2", opacity: 0.12 }), mkBadgeL(uuid(), "Badge", "EVENTO", { x: 5, y: 5, color: "#ffffff" }), mkHeadlineL(uuid(), "Título", "NOME DO\nEVENTO", { x: 5, y: 28, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Data • Horário • Local", { x: 15, y: 62, width: 70, textAlign: "center", color: "rgba(255,255,255,0.8)" })], { type: "gradient", gradient: { type: "linear", from: "#667eea", to: "#764ba2", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "fade", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 2 — Detalhes", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "SOBRE O EVENTO", { color: "#764ba2" }), mkHeadlineL(uuid(), "Título", "O QUE\nESPERAR", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkSubL(uuid(), "D1", "📍 Local: Auditorium Principal", { x: 5, y: 50, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "D2", "📅 Data: 15 de Janeiro de 2025", { x: 5, y: 60, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "D3", "⏰ Horário: 19h às 22h", { x: 5, y: 70, width: 85, fontSize: 3.2 })], mkSlideBg("#1a1a2e", "#2d2b55", 140)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 3 — Registro", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow", { x: 50, y: 30, width: 60, height: 60, fillColor: "#764ba2", opacity: 0.08 }), mkHeadlineL(uuid(), "Título", "INSCREVA-SE\nAGORA", { x: 5, y: 30, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Garanta sua vaga antes que esgote\nInscrições limitadas", { x: 15, y: 62, width: 70, textAlign: "center" }), mkShapeL(uuid(), "CTA", { x: 30, y: 80, width: 40, height: 0.6, fillColor: "#764ba2", opacity: 1 })], { type: "gradient", gradient: { type: "linear", from: "#667eea", to: "#764ba2", angle: 135, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "scale", animOut: "fade" },
      ],
    },
    /* ══════════════════════════════════════════════════════
       TEAM UPDATE — 4 slides
       ══════════════════════════════════════════════════════ */
    {
      templateId: "team-update",
      name: "Atualização de Equipe",
      description: "4 slides para updates de equipo.",
      category: "business",
      platform: "presentation",
      formats: ["slide-16-9", "slide-16-10", "slide-4-3", "slide-a4", "slide-square"],
      aiPromptTemplate: "gere uma atualização de equipe para {topic}",
      palettes: ["#00D4FF", "#0f0c29", "#ffffff"],
      slides: [
        { formatId: "slide-16-9", name: "Slide 1 — Capa", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "TEAM UPDATE", { color: "#00D4FF" }), mkHeadlineL(uuid(), "Título", "UPDATE\nMENSAL", { x: 5, y: 28, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkLineL(uuid(), "Linha", { x: 35, y: 58, width: 30, height: 0.4, fillColor: "#00D4FF", opacity: 0.8 }), mkSubL(uuid(), "Sub", "Resumo das atividades da equipe\nno último mês", { x: 15, y: 62, width: 70, textAlign: "center" })], mkSlideBg("#0f0c29", "#302b63", 135)), animIn: "fade", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 2 — Métricas", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "MÉTRICAS", { color: "#4CAF50" }), mkHeadlineL(uuid(), "Título", "NOSSAS\nMÉTRICAS", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkSubL(uuid(), "M1", "📊 Métrica 1: +25% crescimento", { x: 5, y: 52, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "M2", "📊 Métrica 2: 150 usuários ativos", { x: 5, y: 62, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "M3", "📊 Métrica 3: 98% satisfação", { x: 5, y: 72, width: 85, fontSize: 3.2 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 3 — Conquistas", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "CONQUISTAS", { color: "#FFC107" }), mkHeadlineL(uuid(), "Título", "O QUE\nALCançAMOS", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkSubL(uuid(), "C1", "✅ Conquista número um do time", { x: 5, y: 52, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "C2", "✅ Conquista número dois do time", { x: 5, y: 62, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "C3", "✅ Conquista número três do time", { x: 5, y: 72, width: 85, fontSize: 3.2 })], mkSlideBg("#1a1a2e", "#2d2b55", 140)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 4 — Próximos Passos", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "PRÓXIMOS PASSOS", { color: "#9C27B0" }), mkHeadlineL(uuid(), "Título", "O QUE\nVEM POR AI", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkSubL(uuid(), "P1", "→ Próximo passo número um", { x: 5, y: 52, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "P2", "→ Próximo passo número dois", { x: 5, y: 62, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "P3", "→ Próximo passo número três", { x: 5, y: 72, width: 85, fontSize: 3.2 })], mkSlideBg("#0f0c29", "#4a148c", 135)), animIn: "slide-up", animOut: "fade" },
      ],
    },
    /* ══════════════════════════════════════════════════════
       TUTORIAL STEPS — 6 slides
       ══════════════════════════════════════════════════════ */
    {
      templateId: "tutorial-steps",
      name: "Tutorial em Etapas",
      description: "6 slides para tutoriales paso a paso.",
      category: "school",
      platform: "presentation",
      formats: ["slide-16-9", "slide-16-10", "slide-4-3", "slide-a4", "slide-square"],
      aiPromptTemplate: "gere um tutorial em etapas sobre {topic}",
      palettes: ["#1a2980", "#26d0ce", "#ffffff"],
      slides: [
        { formatId: "slide-16-9", name: "Slide 1 — Título", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow", { x: 65, y: 5, width: 45, height: 45, fillColor: "#26d0ce", opacity: 0.1 }), mkBadgeL(uuid(), "Badge", "TUTORIAL", { color: "#26d0ce" }), mkHeadlineL(uuid(), "Título", "COMO FAZER\nTUTORIAL", { x: 5, y: 28, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkLineL(uuid(), "Linha", { x: 35, y: 58, width: 30, height: 0.4, fillColor: "#26d0ce", opacity: 0.8 }), mkSubL(uuid(), "Sub", "Aprenda passo a passo como fazer\nem simples etapas", { x: 15, y: 62, width: 70, textAlign: "center" })], { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#26d0ce", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "fade", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 2 — Passo 1", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "PASSO 1", { color: "#26d0ce" }), mkHeadlineL(uuid(), "Título", "PRIMEIRO\nPASSO", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Núm", { x: 5, y: 50, width: 8, height: 8, fillColor: "#26d0ce", opacity: 1, borderRadius: 100 }), mkSubL(uuid(), "Desc", "Descreva aqui o primeiro passo\ndo processo com detalhes.", { x: 18, y: 50, width: 75, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 3 — Passo 2", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "PASSO 2", { color: "#26d0ce" }), mkHeadlineL(uuid(), "Título", "SEGUNDO\nPASSO", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Núm", { x: 5, y: 50, width: 8, height: 8, fillColor: "#26d0ce", opacity: 1, borderRadius: 100 }), mkSubL(uuid(), "Desc", "Descreva aqui o segundo passo\ndo processo com detalhes.", { x: 18, y: 50, width: 75, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 4 — Passo 3", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "PASSO 3", { color: "#26d0ce" }), mkHeadlineL(uuid(), "Título", "TERCEIRO\nPASSO", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Núm", { x: 5, y: 50, width: 8, height: 8, fillColor: "#26d0ce", opacity: 1, borderRadius: 100 }), mkSubL(uuid(), "Desc", "Descreva aqui o terceiro passo\ndo processo com detalhes.", { x: 18, y: 50, width: 75, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 5 — Passo 4", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "PASSO 4", { color: "#26d0ce" }), mkHeadlineL(uuid(), "Título", "QUARTO\nPASSO", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkShapeL(uuid(), "Núm", { x: 5, y: 50, width: 8, height: 8, fillColor: "#26d0ce", opacity: 1, borderRadius: 100 }), mkSubL(uuid(), "Desc", "Descreva aqui o quarto passo\ndo processo com detalhes.", { x: 18, y: 50, width: 75, fontSize: 3.2, lineHeight: 1.7 })], mkSlideBg("#0d1b2a", "#1b4332", 135)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 6 — Conclusão", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow", { x: 50, y: 30, width: 60, height: 60, fillColor: "#26d0ce", opacity: 0.08 }), mkHeadlineL(uuid(), "Título", "TUTORIAL\nCONCLUÍDO!", { x: 5, y: 30, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Parabéns! Agora você sabe como fazer.\nCompartilhe com quem precisa.", { x: 15, y: 62, width: 70, textAlign: "center" })], { type: "gradient", gradient: { type: "linear", from: "#1a2980", to: "#26d0ce", angle: 160, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "scale", animOut: "fade" },
      ],
    },
    /* ══════════════════════════════════════════════════════
       SALE PROMO — 3 slides
       ══════════════════════════════════════════════════════ */
    {
      templateId: "sale-promo",
      name: "Promoção de Venda",
      description: "3 slides para promociones de venta.",
      category: "product",
      platform: "presentation",
      formats: ["slide-16-9", "slide-16-10", "slide-4-3", "slide-a4", "slide-square"],
      aiPromptTemplate: "gere uma promoção de venda para {topic}",
      palettes: ["#f12711", "#f5af19", "#ffffff"],
      slides: [
        { formatId: "slide-16-9", name: "Slide 1 — Capa", state: baseState("slide-16-9", [mkCircleL(uuid(), "Glow", { x: 70, y: -10, width: 50, height: 50, fillColor: "#ffffff", opacity: 0.1 }), mkBadgeL(uuid(), "Badge", "PROMOÇÃO", { x: 5, y: 5, color: "#ffffff" }), mkHeadlineL(uuid(), "Título", "OFERTA\nIMPERDÍVEL", { x: 5, y: 28, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Condição especial por tempo limitado\nNão perca essa oportunidade!", { x: 15, y: 62, width: 70, textAlign: "center" })], { type: "gradient", gradient: { type: "linear", from: "#f12711", to: "#f5af19", angle: 45, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "fade", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 2 — Detalhes", state: baseState("slide-16-9", [mkBadgeL(uuid(), "Badge", "OFERTA", { color: "#f5af19" }), mkHeadlineL(uuid(), "Título", "APROVEITE\nESSA OFERTA", { x: 5, y: 22, width: 90, fontSize: 8, fontWeight: 900 }), mkSubL(uuid(), "Detail 1", "💰 Desconto especial de 40%", { x: 5, y: 52, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "Detail 2", "🎁 Brinde exclusivo para você", { x: 5, y: 62, width: 85, fontSize: 3.2 }), mkSubL(uuid(), "Detail 3", "⏰ Válido até durnir estoque", { x: 5, y: 72, width: 85, fontSize: 3.2 })], mkSlideBg("#1a1a2e", "#2d2b55", 140)), animIn: "slide-up", animOut: "fade" },
        { formatId: "slide-16-9", name: "Slide 3 — CTA", state: baseState("slide-16-9", [mkHeadlineL(uuid(), "Título", "COMPRE\nAGORA!", { x: 5, y: 30, width: 90, fontSize: 9, fontWeight: 900, textAlign: "center" }), mkSubL(uuid(), "Sub", "Clique agora e garanta sua oferta\nantes que esgote", { x: 15, y: 62, width: 70, textAlign: "center" }), mkShapeL(uuid(), "CTA", { x: 30, y: 80, width: 40, height: 0.6, fillColor: "#f5af19", opacity: 1 })], { type: "gradient", gradient: { type: "linear", from: "#f12711", to: "#f5af19", angle: 45, fromReach: 0, toReach: 100, opacity: 100, fromOpacity: 100, toOpacity: 100 } }), animIn: "scale", animOut: "fade" },
      ],
    },
  ];
}

export function getBuiltInTextLayouts() {
  return [
    {
      layoutId: "headline-focused",
      name: "Foco em Headline",
      description: "Título gigante com badge superior.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "badge", name: "Badge", type: "text", subtype: "badge", position: { x: 5, y: 5, width: 25 }, aiPrompt: "gere uma palavra-chave ou hashtag relacionada a {topic}, máximo 20 caracteres", maxChars: 20, required: false },
        { id: "headline", name: "Título Principal", type: "text", subtype: "headline", position: { x: 5, y: 25, width: 90, height: 50 }, aiPrompt: "gere um título impactante e curto, máximo 10 palavras, tom {tone}", maxChars: 80, required: true },
        { id: "subtext", name: "Subtítulo", type: "text", subtype: "sub", position: { x: 5, y: 75, width: 70 }, aiPrompt: "gere uma frase de suporte com 1-2 frases curtas", maxChars: 120, required: false },
      ],
      aiInstructions: "Priorize o headline. O subtítulo é opcional e deve ser 30% menor visualmente.",
    },
    {
      layoutId: "two-text",
      name: "Título + Subtítulo",
      description: "Layout equilibrado com título e subtítulo.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "badge", name: "Badge", type: "text", subtype: "badge", position: { x: 5, y: 5, width: 20 }, aiPrompt: "gere uma palavra-chave ou hashtag relacionada a {topic}", maxChars: 20, required: false },
        { id: "headline", name: "Título", type: "text", subtype: "headline", position: { x: 5, y: 22, width: 90, height: 35 }, aiPrompt: "gere um título claro e direto sobre {topic}, máximo 8 palavras", maxChars: 60, required: true },
        { id: "subtext", name: "Subtítulo", type: "text", subtype: "sub", position: { x: 5, y: 58, width: 80, height: 25 }, aiPrompt: "gere uma descrição de 2-3 frases curtas sobre {topic}", maxChars: 150, required: true },
      ],
      aiInstructions: "Both headline and sub are required. Headline should be 2x the size of sub.",
    },
    {
      layoutId: "text-with-image",
      name: "Texto + Imagem",
      description: "Título à esquerda, espaço para imagem à direita (40%).",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "headline", name: "Título", type: "text", subtype: "headline", position: { x: 3, y: 20, width: 52, height: 30 }, aiPrompt: "gere um título curto e impactante sobre {topic}", maxChars: 50, required: true },
        { id: "subtext", name: "Descrição", type: "text", subtype: "sub", position: { x: 3, y: 52, width: 52, height: 20 }, aiPrompt: "gere uma descrição breve de {topic} em 1-2 frases", maxChars: 100, required: false },
        { id: "image", name: "Imagem", type: "image", position: { x: 57, y: 10, width: 40, height: 80 }, aiPrompt: null, maxChars: null, required: false },
      ],
      aiInstructions: "Text on left (55%), image placeholder on right (40%).",
    },
    {
      layoutId: "quote-only",
      name: "Somente Citação",
      description: "Uma citação inspiracional centralizada.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "quote", name: "Citação", type: "text", subtype: "quote", position: { x: 10, y: 25, width: 80, height: 50 }, aiPrompt: "gere uma citação inspiracional ou frase de impacto sobre {topic}, entre 5-15 palavras", maxChars: 120, required: true },
        { id: "author", name: "Autor", type: "text", subtype: "sub", position: { x: 20, y: 78, width: 60 }, aiPrompt: "gere o nome do autor da citação ou 'Autor Desconhecido'", maxChars: 40, required: false },
      ],
      aiInstructions: "Quote centered with quotation marks. Author at bottom center.",
    },
    {
      layoutId: "product-showcase",
      name: "Vitrine de Produto",
      description: "Imagem grande (60%) com título e badge.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "badge", name: "Badge", type: "text", subtype: "badge", position: { x: 5, y: 5, width: 22 }, aiPrompt: "gere uma tag como 'NOVO', 'OFERTA' ou 'LANÇAMENTO'", maxChars: 15, required: false },
        { id: "image", name: "Produto", type: "image", position: { x: 3, y: 10, width: 62, height: 70 }, aiPrompt: null, maxChars: null, required: false },
        { id: "headline", name: "Nome do Produto", type: "text", subtype: "headline", position: { x: 67, y: 25, width: 30, height: 25 }, aiPrompt: "gere o nome de um produto relacionado a {topic}", maxChars: 40, required: true },
        { id: "subtext", name: "Preço/Descrição", type: "text", subtype: "sub", position: { x: 67, y: 52, width: 30, height: 15 }, aiPrompt: "gere preço e tagline curta, ex: 'R$ 99 • Qualidade premium'", maxChars: 50, required: false },
      ],
      aiInstructions: "Image takes 60% left, text on right. Badge at top-left corner.",
    },
    {
      layoutId: "cta-focused",
      name: "Foco em CTA",
      description: "Título grande com CTA em destaque.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "badge", name: "Badge", type: "text", subtype: "badge", position: { x: 5, y: 5, width: 20 }, aiPrompt: "gere uma tag como 'LIMITADO', 'ÚNICO' ou similar", maxChars: 15, required: false },
        { id: "headline", name: "Título", type: "text", subtype: "headline", position: { x: 5, y: 20, width: 90, height: 35 }, aiPrompt: "gere um título persuasivo sobre {topic} com senso de urgência", maxChars: 60, required: true },
        { id: "cta", name: "CTA", type: "text", subtype: "cta", position: { x: 20, y: 68, width: 60 }, aiPrompt: "gere um call-to-action como 'Saiba Mais', 'Compre Já', 'Garanta o Seu'", maxChars: 30, required: true },
      ],
      aiInstructions: "Headline takes 60%, CTA button centered below at 20% height.",
    },
    {
      layoutId: "steps-list",
      name: "Lista de Passos",
      description: "3-4 linhas de etapas numeradas.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "step1-badge", name: "Passo 1", type: "text", subtype: "badge", position: { x: 5, y: 15, width: 8 }, aiPrompt: "gere o número '1'", maxChars: 2, required: true },
        { id: "step1-text", name: "Texto Passo 1", type: "text", subtype: "sub", position: { x: 15, y: 15, width: 80 }, aiPrompt: "gere o primeiro passo de um tutorial sobre {topic}", maxChars: 60, required: true },
        { id: "step2-badge", name: "Passo 2", type: "text", subtype: "badge", position: { x: 5, y: 38, width: 8 }, aiPrompt: "gere o número '2'", maxChars: 2, required: true },
        { id: "step2-text", name: "Texto Passo 2", type: "text", subtype: "sub", position: { x: 15, y: 38, width: 80 }, aiPrompt: "gere o segundo passo de um tutorial sobre {topic}", maxChars: 60, required: true },
        { id: "step3-badge", name: "Passo 3", type: "text", subtype: "badge", position: { x: 5, y: 61, width: 8 }, aiPrompt: "gere o número '3'", maxChars: 2, required: true },
        { id: "step3-text", name: "Texto Passo 3", type: "text", subtype: "sub", position: { x: 15, y: 61, width: 80 }, aiPrompt: "gere o terceiro passo de um tutorial sobre {topic}", maxChars: 60, required: true },
      ],
      aiInstructions: "3 numbered steps, each with a small badge number and text beside it.",
    },
    {
      layoutId: "before-after",
      name: "Antes / Depois",
      description: "Duas imagens lado a lado com textos.",
      platform: "instagram",
      formatId: "ig-feed-square",
      slots: [
        { id: "before-image", name: "Antes", type: "image", position: { x: 3, y: 10, width: 42, height: 55 }, aiPrompt: null, maxChars: null, required: false },
        { id: "before-text", name: "Texto Antes", type: "text", subtype: "sub", position: { x: 3, y: 67, width: 42 }, aiPrompt: "gere uma frase curta descrevendo o 'antes' de {topic}", maxChars: 40, required: true },
        { id: "after-image", name: "Depois", type: "image", position: { x: 55, y: 10, width: 42, height: 55 }, aiPrompt: null, maxChars: null, required: false },
        { id: "after-text", name: "Texto Depois", type: "text", subtype: "sub", position: { x: 55, y: 67, width: 42 }, aiPrompt: "gere uma frase curta descrevendo o 'depois' de {topic}", maxChars: 40, required: true },
      ],
      aiInstructions: "Two equal image slots side by side with text below each.",
    },
  ];
}
