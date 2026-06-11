import { GameState, ObjectFlag, RoomFlag } from './types';

type SerializedState = {
  objectLocations: Record<string, string>;
  flagOverrides: Record<string, (ObjectFlag | RoomFlag)[]>;
  score: number;
  moves: number;
  winner: string;
  here: string;
};

export function serialize(state: GameState): string {
  const serialized: SerializedState = {
    objectLocations: Object.fromEntries(state.objectLocations),
    flagOverrides: Object.fromEntries(
      Array.from(state.flagOverrides.entries()).map(([k, v]) => [k, Array.from(v)])
    ),
    score: state.score,
    moves: state.moves,
    winner: state.winner,
    here: state.here,
  };
  return JSON.stringify(serialized);
}

export function deserialize(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isSerializedState(parsed)) {
    throw new Error('Invalid game state: missing or malformed required fields');
  }
  return {
    objectLocations: new Map(Object.entries(parsed.objectLocations)),
    flagOverrides: new Map(
      Object.entries(parsed.flagOverrides).map(([k, v]) => [k, new Set(v)])
    ),
    score: parsed.score,
    moves: parsed.moves,
    winner: parsed.winner,
    here: parsed.here,
  };
}

function isSerializedState(value: unknown): value is SerializedState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    isPlainObject(s['objectLocations']) &&
    isPlainObject(s['flagOverrides']) &&
    typeof s['score'] === 'number' &&
    typeof s['moves'] === 'number' &&
    typeof s['winner'] === 'string' &&
    typeof s['here'] === 'string'
  );
}

function isPlainObject(value: unknown): boolean {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export interface UndoStack {
  states: GameState[];
  maxDepth: number;
}

export function createUndoStack(maxDepth: number): UndoStack {
  if (maxDepth < 1) throw new Error('maxDepth must be at least 1');
  return { states: [], maxDepth };
}

export function pushUndo(stack: UndoStack, state: GameState): void {
  // Deep-copy via round-trip so stored snapshots are immune to later mutations.
  stack.states.push(deserialize(serialize(state)));
  while (stack.states.length > stack.maxDepth) {
    stack.states.shift();
  }
}

export function popUndo(stack: UndoStack): GameState | null {
  return stack.states.pop() ?? null;
}
