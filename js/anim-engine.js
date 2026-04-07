export class AnimEngine {
  constructor(canvasEngine, { canvasId = 'post-canvas' } = {}) {
    this._canvas = canvasEngine
    this._canvasId = canvasId
  }

  async play() {
    await this._canvas.playAnimations()
  }

  async exportGIF({ fps = 10, filename = 'post-animado.gif' } = {}) {
    if (!window.gifshot || !window.html2canvas) {
      throw new Error('Dependências de GIF não carregadas.')
    }
    const frames = await this._captureFrames(fps)
    if (!frames.length) throw new Error('Não foi possível gerar frames.')
    const target = document.getElementById(this._canvasId)
    return new Promise((resolve, reject) => {
      window.gifshot.createGIF({
        images: frames,
        gifWidth: target?.clientWidth ?? 600,
        gifHeight: target?.clientHeight ?? 600,
        interval: 1 / fps,
      }, (result) => {
        if (!result || result.error) {
          reject(new Error('Falha ao gerar GIF.'))
          return
        }
        this._downloadDataURL(result.image, filename)
        resolve(result.image)
      })
    })
  }

  async exportVideo({ fps = 20, filename = 'post-animado.webm' } = {}) {
    const frames = await this._captureFrames(fps)
    if (!frames.length) throw new Error('Não foi possível gerar frames.')
    const base = document.getElementById(this._canvasId)
    const w = base?.clientWidth ?? 720
    const h = base?.clientHeight ?? 720
    const out = document.createElement('canvas')
    out.width = w
    out.height = h
    const ctx = out.getContext('2d')
    const stream = out.captureStream(fps)
    const chunks = []
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' })
    recorder.ondataavailable = (e) => e.data?.size && chunks.push(e.data)
    recorder.start()
    for (const frame of frames) {
      const img = await this._loadImage(frame)
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(img, 0, 0, w, h)
      await this._wait(1000 / fps)
    }
    recorder.stop()
    await new Promise(resolve => { recorder.onstop = resolve })
    const blob = new Blob(chunks, { type: 'video/webm' })
    this._downloadBlob(blob, filename)
    return blob
  }

  async _captureFrames(fps) {
    const el = document.getElementById(this._canvasId)
    if (!el || !window.html2canvas) return []
    const total = this._canvas.getAnimDuration() + 350
    const interval = 1000 / fps
    const frameCount = Math.max(2, Math.ceil(total / interval))
    const frames = []
    this._canvas.playAnimations()
    for (let i = 0; i < frameCount; i++) {
      const start = performance.now()
      const snapshot = await window.html2canvas(el, {
        useCORS: true,
        backgroundColor: null,
        logging: false,
        scale: 1,
      })
      frames.push(snapshot.toDataURL('image/png'))
      const elapsed = performance.now() - start
      const rest = interval - elapsed
      if (rest > 1) await this._wait(rest)
    }
    return frames
  }

  _loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })
  }

  _downloadDataURL(dataURL, filename) {
    const a = document.createElement('a')
    a.href = dataURL
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  _downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
