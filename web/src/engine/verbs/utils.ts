import { GameState, GameObject } from './types';

export function getObj(id: string, state: GameState): GameObject {
  const obj = state.objects.get(id);
  if (!obj) throw new Error(`Unknown object: ${id}`);
  return obj;
}

function withObj(
  state: GameState,
  id: string,
  update: (o: GameObject) => GameObject,
): GameState {
  const obj = getObj(id, state);
  const objects = new Map(state.objects);
  objects.set(id, update(obj));
  return { ...state, objects };
}

/** Move obj to dest (ZIL: MOVE). Returns new state. */
export function move(objId: string, destId: string, state: GameState): GameState {
  return withObj(state, objId, o => ({ ...o, parent: destId }));
}

/** Set flag on obj (ZIL: FSET). Returns new state. */
export function fset(objId: string, flag: string, state: GameState): GameState {
  return withObj(state, objId, o => ({
    ...o,
    flags: new Set([...o.flags, flag]),
  }));
}

/** Clear flag from obj (ZIL: FCLEAR). Returns new state. */
export function fclear(objId: string, flag: string, state: GameState): GameState {
  return withObj(state, objId, o => {
    const flags = new Set(o.flags);
    flags.delete(flag);
    return { ...o, flags };
  });
}

/** Return true if obj has flag set (ZIL: FSET?). */
export function fcheck(objId: string, flag: string, state: GameState): boolean {
  return state.objects.get(objId)?.flags.has(flag) ?? false;
}

/**
 * Return true if objId is anywhere inside containerId
 * (mirrors ZIL IN? for nested chains).
 */
export function isIn(objId: string, containerId: string, state: GameState): boolean {
  let current = state.objects.get(objId)?.parent ?? null;
  const visited = new Set<string>();
  while (current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);
    if (current === containerId) return true;
    current = state.objects.get(current)?.parent ?? null;
  }
  return false;
}

/** Return direct children of containerId (ZIL: FIRST? / NEXT? traversal). */
export function getContents(containerId: string, state: GameState): string[] {
  const result: string[] = [];
  for (const obj of state.objects.values()) {
    if (obj.parent === containerId) result.push(obj.id);
  }
  return result;
}

/**
 * Recursive carry weight of an object and its contents (mirrors ZIL WEIGHT).
 * Worn items held directly by the player count as 1 to replicate ZIL behaviour.
 */
export function calcWeight(objId: string, state: GameState): number {
  const obj = state.objects.get(objId);
  if (!obj) return 0;
  let weight = obj.size;
  for (const childId of getContents(objId, state)) {
    if (objId === state.player && fcheck(childId, 'WEARBIT', state)) {
      weight += 1;
    } else {
      weight += calcWeight(childId, state);
    }
  }
  return weight;
}
