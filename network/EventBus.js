class EventBus {
  constructor() {
    this._handlers = new Map();
  }

  on(event, cb) {
    if (!this._handlers.has(event)) this._handlers.set(event, new Set());
    this._handlers.get(event).add(cb);
    return () => this.off(event, cb);
  }

  off(event, cb) {
    this._handlers.get(event)?.delete(cb);
  }

  emit(event, payload) {
    const handlers = this._handlers.get(event);
    if (!handlers) return;
    handlers.forEach((cb) => cb(payload));
  }
}

export const bus = new EventBus();
