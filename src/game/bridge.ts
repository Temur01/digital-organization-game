import type { CharacterId, HotspotVisualState, InteractiveObject, Rect, RoomDefinition } from '../types/models';

export const LOGICAL_WIDTH = 960;
export const LOGICAL_HEIGHT = 540;

export type SceneCommand =
  | { type: 'loadRoom'; room: RoomDefinition; hotspots: InteractiveObject[]; characterId: CharacterId }
  | { type: 'setPaused'; paused: boolean }
  | { type: 'walkToHotspot'; hotspotId: string }
  | { type: 'setHotspotStates'; states: Record<string, HotspotVisualState> }
  | { type: 'setReducedMotion'; value: boolean };

export type SceneEvent =
  | { type: 'ready' }
  | { type: 'error' }
  | { type: 'nearHotspotChanged'; hotspotId: string | null }
  | { type: 'hotspotActivated'; hotspotId: string }
  /** DOM overlay uchun CSS piksellardagi to‘rtburchaklar (sahna konteyneriga nisbatan) */
  | { type: 'hotspotLayout'; rects: Record<string, Rect> };

type Listener = (e: SceneEvent) => void;

/** React ↔ Pixi o‘rtasidagi tiplangan ko‘prik. Sahna tayyor bo‘lguncha buyruqlar navbatda turadi. */
export class GameBridge {
  private listeners = new Set<Listener>();
  private handler: ((cmd: SceneCommand) => void) | null = null;
  private queue: SceneCommand[] = [];

  send(cmd: SceneCommand): void {
    if (this.handler) this.handler(cmd);
    else this.queue.push(cmd);
  }

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Sahna tomoni chaqiradi */
  attach(handler: (cmd: SceneCommand) => void): void {
    this.handler = handler;
    const pending = this.queue;
    this.queue = [];
    pending.forEach(handler);
  }

  detach(): void {
    this.handler = null;
  }

  emit(e: SceneEvent): void {
    this.listeners.forEach((l) => l(e));
  }
}
