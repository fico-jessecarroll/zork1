/**
 * World-model kernel mirroring ZIL semantics.
 * All functions are pure: they take GameState and return new state or a boolean.
 */

export type Flag = string;

// Flag constants matching ZIL bit names
export const ONBIT = 'ONBIT';       // room: naturally lit; object: light source is on
export const LIGHTBIT = 'LIGHTBIT'; // object can serve as a light source
export const OPENBIT = 'OPENBIT';   // container is open
export const TRANSBIT = 'TRANSBIT'; // container is transparent
export const INVISIBLE = 'INVISIBLE';
export const RLANDBIT = 'RLANDBIT'; // marks a room object
export const FLAMEBIT = 'FLAMEBIT'; // burning (torch)
export const TAKEBIT = 'TAKEBIT';
export const SACREDBIT = 'SACREDBIT';
export const NDESCBIT = 'NDESCBIT';

export interface ZObject {
  readonly id: string;
  readonly parent: string | null;
  readonly flags: ReadonlySet<Flag>;
}

export interface GameState {
  readonly objects: ReadonlyMap<string, ZObject>;
  /** Player object id */
  readonly player: string;
  /** Current room id */
  readonly here: string;
  /** Id of the GLOBAL-OBJECTS container (always accessible objects) */
  readonly globalObjects: string;
  /** Debug override: every room is lit */
  readonly alwaysLit: boolean;
  /** LCG seed for the seedable RNG (advances each rngInt call) */
  readonly seed: number;
  /** Player score (affects fight strength calculation) */
  readonly score: number;
  /** Mutable numeric properties keyed by "OBJECT:prop" — e.g. troll strength */
  readonly properties: ReadonlyMap<string, number>;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getObj(id: string, state: GameState): ZObject {
  const obj = state.objects.get(id);
  if (!obj) throw new Error(`Unknown object: ${id}`);
  return obj;
}

function withUpdatedObj(
  state: GameState,
  id: string,
  update: (obj: ZObject) => ZObject
): GameState {
  const obj = getObj(id, state);
  const newObjects = new Map(state.objects);
  newObjects.set(id, update(obj));
  return { ...state, objects: newObjects };
}

/**
 * Yield all object ids reachable inside a container, recursing into
 * open or transparent sub-containers (mirrors SEARCH-LIST in gparser.zil).
 */
function* walkReachable(containerId: string, state: GameState): Iterable<string> {
  for (const obj of state.objects.values()) {
    if (obj.parent !== containerId) continue;
    yield obj.id;
    if (obj.flags.has(OPENBIT) || obj.flags.has(TRANSBIT)) {
      yield* walkReachable(obj.id, state);
    }
  }
}

/**
 * Walk up the parent chain to find the top-level room or GLOBAL-OBJECTS
 * container for an object (mirrors META-LOC in gparser.zil).
 */
function metaLoc(objId: string, state: GameState): string | null {
  let current: string | null = objId;
  const visited = new Set<string>();
  while (current !== null) {
    if (visited.has(current)) return null; // guard against cycles
    visited.add(current);
    const obj = state.objects.get(current);
    if (!obj) return null;
    if (obj.parent === current) return null; // self-referential root (ROOMS)
    if (obj.parent === state.globalObjects) return state.globalObjects;
    if (obj.flags.has(RLANDBIT)) return current;
    current = obj.parent;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Move obj to dest. Returns a new GameState. */
export function move(obj: string, dest: string, state: GameState): GameState {
  return withUpdatedObj(state, obj, o => ({ ...o, parent: dest }));
}

/** Return the direct parent of obj, or null if it has no location. */
export function getLocation(obj: string, state: GameState): string | null {
  return getObj(obj, state).parent;
}

/** Return all direct children of container. */
export function getContents(container: string, state: GameState): string[] {
  const result: string[] = [];
  for (const obj of state.objects.values()) {
    if (obj.parent === container) result.push(obj.id);
  }
  return result;
}

/**
 * Return true if obj is anywhere inside container
 * (direct child or nested to any depth).
 */
export function isIn(obj: string, container: string, state: GameState): boolean {
  let current: string | null = getLocation(obj, state);
  const visited = new Set<string>();
  while (current !== null) {
    if (visited.has(current)) return false;
    visited.add(current);
    if (current === container) return true;
    current = getLocation(current, state);
  }
  return false;
}

/** Set flag on obj. Returns a new GameState (ZIL: FSET). */
export function fset(obj: string, flag: Flag, state: GameState): GameState {
  return withUpdatedObj(state, obj, o => ({
    ...o,
    flags: new Set([...o.flags, flag]),
  }));
}

/** Clear flag from obj. Returns a new GameState (ZIL: FCLEAR). */
export function fclear(obj: string, flag: Flag, state: GameState): GameState {
  return withUpdatedObj(state, obj, o => {
    const flags = new Set(o.flags);
    flags.delete(flag);
    return { ...o, flags };
  });
}

/** Return true if obj has flag set (ZIL: FSET?). */
export function fcheck(obj: string, flag: Flag, state: GameState): boolean {
  return getObj(obj, state).flags.has(flag);
}

/**
 * Return true if room is lit, replicating the LIT? logic from gparser.zil:
 *   1. alwaysLit override (ALWAYS-LIT global)
 *   2. The room itself has ONBIT (naturally lit outdoor room)
 *   3. Any object reachable from the player's inventory or the room's contents
 *      (recursing into open/transparent containers) has LIGHTBIT and ONBIT.
 */
export function isLit(room: string, state: GameState): boolean {
  if (state.alwaysLit) return true;

  const roomObj = getObj(room, state);
  if (roomObj.flags.has(ONBIT)) return true;

  // Search player inventory (and open containers therein)
  for (const id of walkReachable(state.player, state)) {
    const obj = getObj(id, state);
    if (obj.flags.has(LIGHTBIT) && obj.flags.has(ONBIT)) return true;
  }

  // Search room contents (and open/transparent containers therein)
  for (const id of walkReachable(room, state)) {
    const obj = getObj(id, state);
    if (obj.flags.has(LIGHTBIT) && obj.flags.has(ONBIT)) return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// RNG helpers
// ---------------------------------------------------------------------------

/** Advance the LCG seed one step (Knuth multiplicative). */
function lcgStep(seed: number): number {
  return ((Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0;
}

/**
 * Return [value: 1..max, newState] — mirrors ZIL RANDOM N.
 * Updates state.seed.
 */
export function rngInt(max: number, state: GameState): [number, GameState] {
  const next = lcgStep(state.seed);
  const value = (next % max) + 1;
  return [value, { ...state, seed: next }];
}

// ---------------------------------------------------------------------------
// Mutable-property helpers (ZIL PUTP / GETP for numeric properties)
// ---------------------------------------------------------------------------

/**
 * Read a numeric property stored under the key "id:prop".
 * Returns defaultVal (0) when not set.
 */
export function getProp(id: string, prop: string, state: GameState, defaultVal = 0): number {
  return state.properties.get(`${id}:${prop}`) ?? defaultVal;
}

/** Write a numeric property stored under the key "id:prop". Returns new state. */
export function setProp(id: string, prop: string, value: number, state: GameState): GameState {
  const properties = new Map(state.properties);
  properties.set(`${id}:${prop}`, value);
  return { ...state, properties };
}

// ---------------------------------------------------------------------------
// Object removal
// ---------------------------------------------------------------------------

/** Remove obj from the world (sets parent to null). Mirrors ZIL REMOVE-CAREFULLY. */
export function remove(obj: string, state: GameState): GameState {
  return withUpdatedObj(state, obj, o => ({ ...o, parent: null }));
}

/**
 * Return true if the player can touch/reach obj, replicating ACCESSIBLE? from gparser.zil.
 *
 * Accessibility rules (in order):
 *   - INVISIBLE objects are never accessible
 *   - Objects with no location are not accessible
 *   - Objects in GLOBAL-OBJECTS are always accessible
 *   - Objects whose meta-location is not HERE or the player's container → not accessible
 *   - Objects directly in the player, the current room, or the player's container → accessible
 *   - Objects in an open container that is itself accessible → accessible (recursive)
 */
export function isAccessible(obj: string, state: GameState): boolean {
  const o = state.objects.get(obj);
  if (!o) return false;
  if (o.flags.has(INVISIBLE)) return false;

  const loc = o.parent;
  if (loc === null) return false;

  if (loc === state.globalObjects) return true;

  // Find top-level room for this object
  const ml = metaLoc(obj, state);
  const playerContainer = getLocation(state.player, state);

  // Meta-location must be current room or player's container
  if (ml !== state.here && ml !== playerContainer) return false;

  // Directly in player, current room, or the container holding the player
  if (loc === state.player || loc === state.here || loc === playerContainer) return true;

  // In an open container that is itself accessible (recursive)
  const locObj = state.objects.get(loc);
  if (locObj && locObj.flags.has(OPENBIT)) return isAccessible(loc, state);

  return false;
}
