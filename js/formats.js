/* ============================================================
   PostGenerate — Social Media Formats
   ============================================================ */

export const FORMATS = {
  /* ── Instagram ── */
  'ig-feed-square': {
    label: 'Feed Quadrado',
    platform: 'instagram',
    platformLabel: 'Instagram',
    width: 1080,
    height: 1080,
    icon: '⬛',
    category: 'instagram',
  },
  'ig-feed-portrait': {
    label: 'Feed Retrato',
    platform: 'instagram',
    platformLabel: 'Instagram',
    width: 1080,
    height: 1350,
    icon: '📷',
    category: 'instagram',
  },
  'ig-feed-landscape': {
    label: 'Feed Paisagem',
    platform: 'instagram',
    platformLabel: 'Instagram',
    width: 1080,
    height: 566,
    icon: '🖼️',
    category: 'instagram',
  },
  'ig-story': {
    label: 'Story / Reel',
    platform: 'instagram',
    platformLabel: 'Instagram',
    width: 1080,
    height: 1920,
    icon: '📱',
    category: 'instagram',
  },

  /* ── LinkedIn ── */
  'li-post': {
    label: 'Post',
    platform: 'linkedin',
    platformLabel: 'LinkedIn',
    width: 1200,
    height: 627,
    icon: '💼',
    category: 'linkedin',
  },
  'li-post-square': {
    label: 'Post Quadrado',
    platform: 'linkedin',
    platformLabel: 'LinkedIn',
    width: 1080,
    height: 1080,
    icon: '💼',
    category: 'linkedin',
  },
  'li-story': {
    label: 'Story',
    platform: 'linkedin',
    platformLabel: 'LinkedIn',
    width: 1080,
    height: 1920,
    icon: '📱',
    category: 'linkedin',
  },
  'li-banner': {
    label: 'Banner do Perfil',
    platform: 'linkedin',
    platformLabel: 'LinkedIn',
    width: 1584,
    height: 396,
    icon: '🏔️',
    category: 'linkedin',
  },

  /* ── TikTok ── */
  'tiktok-video': {
    label: 'Vídeo / Foto',
    platform: 'tiktok',
    platformLabel: 'TikTok',
    width: 1080,
    height: 1920,
    icon: '🎵',
    category: 'tiktok',
  },

  /* ── YouTube ── */
  'yt-thumb': {
    label: 'Thumbnail',
    platform: 'youtube',
    platformLabel: 'YouTube',
    width: 1280,
    height: 720,
    icon: '▶️',
    category: 'youtube',
  },
  'yt-banner': {
    label: 'Banner do Canal',
    platform: 'youtube',
    platformLabel: 'YouTube',
    width: 2560,
    height: 1440,
    icon: '🎬',
    category: 'youtube',
  },
  'yt-short': {
    label: 'Short',
    platform: 'youtube',
    platformLabel: 'YouTube',
    width: 1080,
    height: 1920,
    icon: '⚡',
    category: 'youtube',
  },

  /* ── Twitter / X ── */
  'twitter-post': {
    label: 'Post',
    platform: 'twitter',
    platformLabel: 'Twitter / X',
    width: 1200,
    height: 675,
    icon: '🐦',
    category: 'twitter',
  },
  'twitter-header': {
    label: 'Header',
    platform: 'twitter',
    platformLabel: 'Twitter / X',
    width: 1500,
    height: 500,
    icon: '🐦',
    category: 'twitter',
  },

  /* ── Facebook ── */
  'fb-post': {
    label: 'Post',
    platform: 'facebook',
    platformLabel: 'Facebook',
    width: 1200,
    height: 630,
    icon: '👍',
    category: 'facebook',
  },
  'fb-story': {
    label: 'Story',
    platform: 'facebook',
    platformLabel: 'Facebook',
    width: 1080,
    height: 1920,
    icon: '📱',
    category: 'facebook',
  },
  'fb-cover': {
    label: 'Capa',
    platform: 'facebook',
    platformLabel: 'Facebook',
    width: 820,
    height: 312,
    icon: '🖼️',
    category: 'facebook',
  },

  /* ── Pinterest ── */
  'pinterest-pin': {
    label: 'Pin',
    platform: 'pinterest',
    platformLabel: 'Pinterest',
    width: 1000,
    height: 1500,
    icon: '📌',
    category: 'pinterest',
  },

  /* ── WhatsApp ── */
  'whatsapp-status': {
    label: 'Status',
    platform: 'whatsapp',
    platformLabel: 'WhatsApp',
    width: 1080,
    height: 1920,
    icon: '💬',
    category: 'whatsapp',
  },

  /* ── Custom ── */
  'custom': {
    label: 'Personalizado',
    platform: 'custom',
    platformLabel: 'Personalizado',
    width: 1080,
    height: 1080,
    icon: '✏️',
    category: 'custom',
  },

  /* ── Presentation / Slides ── */
  'slide-16-9': {
    label: 'Slide 16:9',
    platform: 'presentation',
    platformLabel: 'Apresentação',
    width: 1920,
    height: 1080,
    icon: '🖥️',
    category: 'presentation',
  },
  'slide-16-10': {
    label: 'Slide 16:10',
    platform: 'presentation',
    platformLabel: 'Apresentação',
    width: 1280,
    height: 800,
    icon: '🖥️',
    category: 'presentation',
  },
  'slide-4-3': {
    label: 'Slide 4:3',
    platform: 'presentation',
    platformLabel: 'Apresentação',
    width: 1024,
    height: 768,
    icon: '🖥️',
    category: 'presentation',
  },
  'slide-a4': {
    label: 'Slide A4',
    platform: 'presentation',
    platformLabel: 'Apresentação',
    width: 1123,
    height: 794,
    icon: '🖥️',
    category: 'presentation',
  },
  'slide-square': {
    label: 'Slide Quadrado',
    platform: 'presentation',
    platformLabel: 'Apresentação',
    width: 1080,
    height: 1080,
    icon: '◼️',
    category: 'presentation',
  },
}

export const FORMAT_GROUPS = [
  {
    id: 'instagram',
    label: 'Instagram',
    icon: '📷',
    formats: ['ig-feed-square', 'ig-feed-portrait', 'ig-feed-landscape', 'ig-story'],
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    icon: '💼',
    formats: ['li-post', 'li-post-square', 'li-story', 'li-banner'],
  },
  {
    id: 'tiktok',
    label: 'TikTok',
    icon: '🎵',
    formats: ['tiktok-video'],
  },
  {
    id: 'youtube',
    label: 'YouTube',
    icon: '▶️',
    formats: ['yt-thumb', 'yt-banner', 'yt-short'],
  },
  {
    id: 'twitter',
    label: 'Twitter / X',
    icon: '🐦',
    formats: ['twitter-post', 'twitter-header'],
  },
  {
    id: 'facebook',
    label: 'Facebook',
    icon: '👍',
    formats: ['fb-post', 'fb-story', 'fb-cover'],
  },
  {
    id: 'pinterest',
    label: 'Pinterest',
    icon: '📌',
    formats: ['pinterest-pin'],
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    icon: '💬',
    formats: ['whatsapp-status'],
  },
  {
    id: 'presentation',
    label: 'Apresentação',
    icon: '🖥️',
    formats: ['slide-16-9', 'slide-16-10', 'slide-4-3', 'slide-a4', 'slide-square'],
  },
  {
    id: 'custom',
    label: 'Personalizado',
    icon: '✏️',
    formats: ['custom'],
  },
]

export function getFormat(id) {
  return FORMATS[id] ?? FORMATS['ig-feed-square']
}

/** Returns aspect ratio as a CSS-friendly percentage for thumb sizing */
export function getThumbDimensions(formatId, maxW = 40, maxH = 52) {
  const fmt = getFormat(formatId)
  const ratio = fmt.width / fmt.height
  if (ratio >= 1) {
    // landscape or square
    const w = maxW
    const h = Math.round(w / ratio)
    return { w, h }
  } else {
    // portrait
    const h = maxH
    const w = Math.round(h * ratio)
    return { w, h }
  }
}
