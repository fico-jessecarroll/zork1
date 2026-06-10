export interface ObjectState {
  id: string;
  /** Room id, container object id, or "PLAYER" for inventory. */
  location: string;
  flags: Record<string, boolean>;
  properties: Record<string, number | string | boolean>;
}

export interface RoomState {
  id: string;
  visited: boolean;
  flags: Record<string, boolean>;
}

/**
 * Full snapshot of runtime game state. Must contain only JSON-serializable
 * primitives — no functions, class instances, or circular references.
 */
export interface GameState {
  version: number;
  currentRoom: string;
  score: number;
  moves: number;
  maxScore: number;
  loadAllowed: number;
  objects: Record<string, ObjectState>;
  rooms: Record<string, RoomState>;
  /** Game-specific boolean/numeric flags (e.g. CYCLOPS-FLAG, DOME-FLAG). */
  globals: Record<string, number | string | boolean>;
  outputBuffer: string[];
}
