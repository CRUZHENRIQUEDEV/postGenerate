/* ============================================================
   RealtimeCollabController — Realtime collaboration wiring
   ============================================================ */

import { toast } from "../app.js";

export class RealtimeCollabController {
  constructor({ canvas, slides, brands, network, bus, onToast, projectService }) {
    this._canvas = canvas;
    this._slides = slides;
    this._brands = brands;
    this._network = network;
    this._bus = bus;
    this._onToast = onToast;
    this._projectService = projectService;
    this._currentProjectId = projectService?.currentProjectId ?? null;
    this._realtime = {
      bound: false,
      active: false,
      role: null,
      roomId: null,
      lastRemoteTs: 0,
      applyingRemote: false,
      syncTimer: null,
    };
  }

  wire() {
    this._wireRealtimeCollab();
  }

  _wireRealtimeCollab() {
    if (this._realtime.bound) return;
    this._realtime.bound = true;
    document
      .getElementById("btn-create-live-room")
      ?.addEventListener("click", async () => {
        await this._createLiveRoom();
      });
    document
      .getElementById("btn-join-live-room")
      ?.addEventListener("click", async () => {
        await this._joinLiveRoom();
      });
    document
      .getElementById("btn-leave-live-room")
      ?.addEventListener("click", async () => {
        this._leaveLiveRoom();
      });
    document
      .getElementById("btn-copy-live-room")
      ?.addEventListener("click", async () => {
        const roomId = this._realtime.roomId;
        if (!roomId) {
          toast("Nenhuma sala ativa.", "info");
          return;
        }
        try {
          await navigator.clipboard.writeText(roomId);
          toast("Código da sala copiado.", "success");
        } catch {
          toast("Não foi possível copiar código da sala.", "error");
        }
      });

    this._bus.on("net:room-created", ({ roomId }) => {
      this._realtime.active = true;
      this._realtime.role = "host";
      this._realtime.roomId = roomId;
      this._setRealtimeStatus(`Ao vivo: host (${roomId})`);
      this._setRealtimeRoomInput(roomId);
      this._queueRealtimeBroadcast(true);
    });

    this._bus.on("net:room-joined", ({ roomId }) => {
      this._realtime.active = true;
      this._realtime.role = "guest";
      this._realtime.roomId = roomId;
      this._setRealtimeStatus(`Ao vivo: conectado (${roomId})`);
      this._setRealtimeRoomInput(roomId);
      this._network.broadcast("collab:request-sync", { roomId });
    });

    this._bus.on("net:peer-joined", () => {
      if (this._realtime.role === "host") this._queueRealtimeBroadcast(true);
    });

    this._bus.on("net:action", async ({ type, payload, from }) => {
      if (!this._realtime.active) return;
      if (from === this._network.localId) return;
      if (type === "collab:request-sync" && this._realtime.role === "host") {
        this._queueRealtimeBroadcast(true);
        return;
      }
      if (type !== "collab:project-sync") return;
      await this._applyRemoteRealtimeProject(payload);
    });

    this._bus.on("net:disconnected", () => {
      this._realtime.active = false;
      this._realtime.role = null;
      this._realtime.roomId = null;
      this._setRealtimeStatus("Offline");
    });

    this._bus.on("net:error", ({ error }) => {
      toast(`Erro de rede: ${error?.message ?? "falha"}`, "error");
    });
  }

  _setRealtimeStatus(text) {
    const el = document.getElementById("live-room-status");
    if (el) el.textContent = text;
  }

  _setRealtimeRoomInput(roomId) {
    const el = document.getElementById("live-room-id");
    if (el) el.value = roomId ?? "";
  }

  _generateLiveRoomId() {
    const n = Math.floor(Math.random() * 900 + 100);
    return `post-${n}-${Math.random().toString(36).slice(2, 6)}`;
  }

  async _createLiveRoom() {
    const roomInput = document.getElementById("live-room-id");
    const roomId = roomInput?.value?.trim() || this._generateLiveRoomId();
    try {
      await this._network.createRoom(roomId);
    } catch (e) {
      toast("Não foi possível criar sala ao vivo.", "error");
      console.error(e);
    }
  }

  async _joinLiveRoom() {
    const roomId = document.getElementById("live-room-id")?.value?.trim();
    if (!roomId) {
      toast("Digite o código da sala.", "error");
      return;
    }
    try {
      await this._network.joinRoom(roomId);
    } catch (e) {
      toast("Não foi possível entrar na sala.", "error");
      console.error(e);
    }
  }

  _leaveLiveRoom() {
    this._network.disconnect();
    this._setRealtimeStatus("Offline");
    toast("Sessão ao vivo encerrada.", "info");
  }

  _queueRealtimeBroadcast(immediate = false) {
    if (!this._realtime.active) return;
    if (this._realtime.applyingRemote) return;
    const send = async () => {
      const payload = this._buildRealtimePayload();
      this._network.broadcast("collab:project-sync", payload);
    };
    if (immediate) {
      send();
      return;
    }
    clearTimeout(this._realtime.syncTimer);
    this._realtime.syncTimer = setTimeout(send, 220);
  }

  _buildRealtimePayload() {
    return {
      ts: Date.now(),
      roomId: this._realtime.roomId,
      project: {
        name: this._getCurrentProjectName(),
        mode: this._getCurrentProjectMode(),
        brandId: this._brands.getCurrentBrandId(),
        slides: this._slides.getSlides().map((s) => ({
          id: s.id,
          state: structuredClone(s.state),
        })),
        activeSlideIndex: this._slides.getActiveIndex(),
      },
    };
  }

  _getCurrentProjectName() {
    const el = document.getElementById("project-name-label");
    if (!el) return "Projeto";
    return el.textContent.replace(" • Somente leitura", "").trim() || "Projeto";
  }

  _getCurrentProjectMode() {
    return this._slides.getSlides().length > 1 ? "slides" : "single";
  }

  async _applyRemoteRealtimeProject(payload) {
    const ts = Number(payload?.ts ?? 0);
    if (!ts || ts <= this._realtime.lastRemoteTs) return;
    const project = payload?.project;
    if (!project?.slides?.length) return;
    this._realtime.lastRemoteTs = ts;
    this._realtime.applyingRemote = true;
    try {
      if (project.brandId) await this._brands.setCurrentBrand(project.brandId);
      await this._slides.loadSlides(
        project.slides,
        project.activeSlideIndex ?? 0,
      );
      const current = this._projectService?.get?.(this._currentProjectId)
        ? await this._projectService.get(this._currentProjectId)
        : null;
      if (current) {
        await this._projectService?.save?.({
          ...current,
          name: project.name ?? current.name,
          mode: project.mode ?? current.mode,
          brandId: project.brandId ?? current.brandId,
          slides: project.slides.map((s) => ({
            id: s.id,
            state: structuredClone(s.state),
          })),
          activeSlideIndex: project.activeSlideIndex ?? 0,
        });
      }
      this._projectDirty = false;
      this._setRealtimeStatus(
        `Sincronizado ${new Date(ts).toLocaleTimeString("pt-BR")}`,
      );
    } catch (e) {
      console.error("Erro ao aplicar atualização remota:", e);
    } finally {
      this._realtime.applyingRemote = false;
    }
  }
}
