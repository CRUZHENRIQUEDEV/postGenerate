/* ============================================================
   PostGenerate — Layer Factories
   Factories for creating layer objects.
   ============================================================ */

import { uuid, ANIM_DEFAULTS } from "./canvas-utils.js";

export function createDefaultState(formatId = "ig-feed-square") {
  return {
    formatId,
    background: {
      type: "solid",
      color: "#000000",
      gradient: {
        type: "linear",
        from: "#000000",
        to: "#0e1a2e",
        angle: 135,
        fromReach: 0,
        toReach: 100,
        reach: 100,
        opacity: 100,
        fromOpacity: 100,
        toOpacity: 100,
      },
      image: null,
      imageSize: "cover",
    },
    layers: [],
  };
}

export function makeBadgeLayer(id, name, content = "Badge") {
  return {
    id: id ?? uuid(),
    name: name ?? "Badge",
    type: "text",
    subtype: "badge",
    visible: true,
    locked: false,
    x: 8.5,
    y: 9.5,
    width: "auto",
    content,
    fontFamily: "-apple-system",
    fontSize: 2.1,
    fontWeight: 500,
    fontStyle: "normal",
    color: "#7BC4EC",
    textAlign: "left",
    lineHeight: 1.2,
    letterSpacing: "0.07em",
    textTransform: "none",
    opacity: 1,
    badgeBg: "transparent",
    badgeBorderColor: "rgba(123,196,236,0.4)",
    badgeBorderWidth: 1,
    badgeBorderRadius: 100,
    badgePaddingX: 1.1,
    badgePaddingY: 0.33,
    ...ANIM_DEFAULTS,
    animIn: "fade",
    animDelay: 0,
  };
}

export function makeHeadlineLayer(id, name, content = "Título\nPrincipal") {
  return {
    id: id ?? uuid(),
    name: name ?? "Headline",
    type: "text",
    subtype: "headline",
    visible: true,
    locked: false,
    x: 8.5,
    y: 18,
    width: 75,
    content,
    fontFamily: "-apple-system",
    fontSize: 9.0,
    fontWeight: 800,
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "left",
    lineHeight: 1.02,
    letterSpacing: "-0.03em",
    textTransform: "none",
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 2,
    borderRadius: 8,
    borderPaddingX: 32,
    borderPaddingY: 16,
    ...ANIM_DEFAULTS,
    animIn: "slide-left",
    animDelay: 0.1,
  };
}

export function makeSubLayer(id, name, content = "Texto de suporte aqui.") {
  return {
    id: id ?? uuid(),
    name: name ?? "Subtítulo",
    type: "text",
    subtype: "sub",
    visible: true,
    locked: false,
    x: 8.5,
    y: 68,
    width: 62,
    content,
    fontFamily: "-apple-system",
    fontSize: 2.3,
    fontWeight: 400,
    fontStyle: "normal",
    color: "rgba(255,255,255,0.62)",
    textAlign: "left",
    lineHeight: 1.55,
    letterSpacing: "0.01em",
    textTransform: "none",
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.2)",
    borderWidth: 1,
    borderRadius: 6,
    borderPaddingX: 16,
    borderPaddingY: 8,
    ...ANIM_DEFAULTS,
    animIn: "slide-up",
    animDelay: 0.22,
  };
}

export function makeTextLayer(id, name) {
  return {
    id: id ?? uuid(),
    name: name ?? "Texto",
    type: "text",
    subtype: "body",
    visible: true,
    locked: false,
    x: 8.5,
    y: 50,
    width: 65,
    content: "Novo texto",
    fontFamily: "-apple-system",
    fontSize: 3.5,
    fontWeight: 400,
    fontStyle: "normal",
    color: "#ffffff",
    textAlign: "left",
    lineHeight: 1.4,
    letterSpacing: "0em",
    textTransform: "none",
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
    borderRadius: 6,
    borderPaddingX: 16,
    borderPaddingY: 8,
    ...ANIM_DEFAULTS,
  };
}

export function makeImageLayer(id, name, src) {
  return {
    id: id ?? uuid(),
    name: name ?? "Imagem",
    type: "image",
    subtype: "image",
    visible: true,
    locked: false,
    x: 50,
    y: 20,
    width: 40,
    height: 40,
    src: src ?? "",
    objectFit: "contain",
    imageZoom: 1,
    opacity: 1,
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.28)",
    borderWidth: 2,
    borderRadius: 0,
    ...ANIM_DEFAULTS,
    animIn: "scale",
  };
}

export function makeIconLayer(id, name, iconId = "", svg = "") {
  return {
    id: id ?? uuid(),
    name: name ?? "Ícone",
    type: "icon",
    subtype: "icon",
    visible: true,
    locked: false,
    x: 40,
    y: 40,
    size: 8,
    iconId,
    svg,
    color: "#ffffff",
    background: "transparent",
    hasBorder: false,
    borderColor: "rgba(255,255,255,0.32)",
    borderWidth: 1,
    borderRadius: 12,
    opacity: 1,
    ...ANIM_DEFAULTS,
    animIn: "scale",
  };
}

export function makeShapeLayer(id, name) {
  return {
    id: id ?? uuid(),
    name: name ?? "Forma",
    type: "shape",
    subtype: "rect",
    visible: true,
    locked: false,
    x: 8.5,
    y: 85,
    width: 15,
    height: 0.4,
    fillColor: "#7BC4EC",
    strokeColor: "transparent",
    strokeWidth: 0,
    borderRadius: 100,
    opacity: 1,
    ...ANIM_DEFAULTS,
    animIn: "slide-left",
    animDelay: 0.05,
  };
}
