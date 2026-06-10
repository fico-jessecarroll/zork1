import { GameState } from './types';

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(json: string): GameState {
  const parsed: unknown = JSON.parse(json);
  if (!isGameState(parsed)) {
    throw new Error('Invalid game state: missing or malformed required fields');
  }
  return parsed;
}

function isGameState(value: unknown): value is GameState {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s['version'] === 'number' &&
    typeof s['currentRoom'] === 'string' &&
    typeof s['score'] === 'number' &&
    typeof s['moves'] === 'number' &&
    typeof s['maxScore'] === 'number' &&
    typeof s['loadAllowed'] === 'number' &&
    isPlainObject(s['objects']) &&
    isPlainObject(s['rooms']) &&
    isPlainObject(s['globals']) &&
    Array.isArray(s['outputBuffer'])
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
