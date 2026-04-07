export class IconSearch {
  constructor({ modalId = 'icon-modal', inputId = 'icon-search-input', resultsId = 'icon-results', closeBtnId = 'btn-close-icon-modal' } = {}) {
    this._modal = document.getElementById(modalId)
    this._input = document.getElementById(inputId)
    this._results = document.getElementById(resultsId)
    this._closeBtn = document.getElementById(closeBtnId)
    this._onPick = null
    this._debounce = null
    this._bind()
  }

  _bind() {
    this._closeBtn?.addEventListener('click', () => this.close())
    this._modal?.addEventListener('click', (e) => {
      if (e.target === this._modal) this.close()
    })
    this._input?.addEventListener('input', () => {
      clearTimeout(this._debounce)
      this._debounce = setTimeout(() => this.search(this._input.value), 260)
    })
  }

  open(onPick) {
    this._onPick = onPick
    if (!this._modal) return
    this._modal.classList.add('open')
    if (this._input) {
      this._input.value = ''
      this._input.focus()
    }
    this.search('instagram')
  }

  close() {
    this._modal?.classList.remove('open')
  }

  async search(query) {
    if (!this._results) return
    const q = String(query ?? '').trim()
    if (!q) {
      this._results.innerHTML = ''
      return
    }
    this._results.innerHTML = '<div class="text-muted text-sm">Buscando ícones...</div>'
    try {
      const url = `https://api.iconify.design/search?query=${encodeURIComponent(q)}&limit=48`
      const res = await fetch(url)
      const data = await res.json()
      const icons = data?.icons ?? []
      if (!icons.length) {
        this._results.innerHTML = '<div class="text-muted text-sm">Nenhum ícone encontrado.</div>'
        return
      }
      this._results.innerHTML = ''
      icons.forEach(iconId => {
        const btn = document.createElement('button')
        btn.className = 'icon-result-btn'
        btn.innerHTML = `<img src="https://api.iconify.design/${iconId}.svg?height=32" alt="${iconId}"><span>${iconId}</span>`
        btn.addEventListener('click', async () => {
          const svg = await this.fetchSVG(iconId)
          if (!svg) return
          this._onPick?.({ iconId, svg })
          this.close()
        })
        this._results.appendChild(btn)
      })
    } catch {
      this._results.innerHTML = '<div class="text-muted text-sm">Erro ao consultar API de ícones.</div>'
    }
  }

  async fetchSVG(iconId) {
    try {
      const url = `https://api.iconify.design/${iconId}.svg`
      const res = await fetch(url)
      const raw = await res.text()
      return raw
        .replace(/fill="(?!none)[^"]*"/g, 'fill="currentColor"')
        .replace(/stroke="(?!none)[^"]*"/g, 'stroke="currentColor"')
    } catch {
      return ''
    }
  }
}
