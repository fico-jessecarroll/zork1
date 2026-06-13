/**
 * GameService — bridges the Zork I engine to the Angular UI layer.
 *
 * Holds the current runtime game state and exposes processCommand() which
 * runs parser → perform → clocker for each player input.  SAVE/RESTORE use
 * localStorage; UNDO maintains an in-memory snapshot stack.
 *
 * The constructor accepts an optional Storage injection point (defaults to
 * globalThis.localStorage) so tests can supply a plain-object mock without
 * requiring a browser/jsdom environment.
 */

import type { GameState, GameObject } from '../engine/verbs/types';
import { vOpen, vClose } from '../engine/verbs/containers';
import { vTake, vDrop, vInventory } from '../engine/verbs/inventory';
import { vExamine, vRead, vLook } from '../engine/verbs/examine';
import { vWalk } from '../engine/verbs/movement';
import {
  vScore, vQuit, vSave, vRestore, vSavesList, vVerbose, vBrief, vWait,
  SIGNAL_SAVE_PREFIX, SIGNAL_RESTORE_PREFIX, SIGNAL_SAVES_LIST, SIGNAL_QUIT,
} from '../engine/verbs/meta';
import { clocker } from '../engine/clock';
import { OBJECTS } from '../engine/data/objects';
import { rooms } from '../engine/data/rooms';

// ─── Constants ──────────────────────────────────────────────────────────────

const SAVES_KEY = 'zork1-saves';
const LEGACY_SAVE_KEY = 'zork1-save';
const MAX_SLOTS = 5;
const UNDO_DEPTH = 10;

// ─── Direction helpers ───────────────────────────────────────────────────────

const DIRECTIONS = new Map<string, string>([
  ['n', 'north'], ['north', 'north'],
  ['s', 'south'], ['south', 'south'],
  ['e', 'east'],  ['east',  'east'],
  ['w', 'west'],  ['west',  'west'],
  ['ne', 'ne'], ['nw', 'nw'], ['se', 'se'], ['sw', 'sw'],
  ['u', 'up'],   ['up',   'up'],
  ['d', 'down'], ['down', 'down'],
  ['in', 'in'],  ['out', 'out'],
  ['land', 'land'],
]);

const DIR_OBJECTS: ReadonlyMap<string, GameObject> = new Map(
  ['north','south','east','west','ne','nw','se','sw','up','down','in','out','land']
    .map(dir => [dir, { id: dir, desc: dir, parent: null, flags: new Set<string>(), size: 0, capacity: 0 }])
);

// ─── Noun index ──────────────────────────────────────────────────────────────

const NOUN_INDEX = new Map<string, string>();
for (const obj of OBJECTS) {
  for (const syn of obj.synonyms) {
    const lc = syn.toLowerCase();
    if (!NOUN_INDEX.has(lc)) NOUN_INDEX.set(lc, obj.id);
  }
}

// ─── State construction ──────────────────────────────────────────────────────

function buildInitialObjects(): Map<string, GameObject> {
  const objects = new Map<string, GameObject>();

  for (const room of rooms) {
    const id = room.id.toUpperCase();
    objects.set(id, {
      id,
      desc: room.desc,
      parent: null,
      flags: new Set(room.flags),
      size: 0,
      capacity: 0,
    });
  }

  for (const obj of OBJECTS) {
    objects.set(obj.id, {
      id: obj.id,
      desc: obj.desc,
      parent: obj.location,
      flags: new Set([...obj.flags] as string[]),
      size: obj.size ?? 5,
      capacity: obj.capacity ?? 0,
      text: (obj as { text?: string }).text,
    });
  }

  objects.set('PLAYER', {
    id: 'PLAYER',
    desc: 'you',
    parent: 'WEST-OF-HOUSE',
    flags: new Set(),
    size: 0,
    capacity: 70,
  });

  return objects;
}

function buildRoomExits(): Map<string, Map<string, string | null>> {
  const result = new Map<string, Map<string, string | null>>();
  for (const room of rooms) {
    const id = room.id.toUpperCase();
    const exits = new Map<string, string | null>();
    for (const exit of room.exits) {
      if ('message' in exit) {
        exits.set(exit.direction, null);
      } else {
        exits.set(exit.direction, (exit as { direction: string; destination: string }).destination.toUpperCase());
      }
    }
    result.set(id, exits);
  }
  return result;
}

const INITIAL_ROOM_EXITS: ReadonlyMap<string, ReadonlyMap<string, string | null>> = buildRoomExits();

export function buildInitialState(): GameState {
  return {
    objects: buildInitialObjects(),
    roomExits: INITIAL_ROOM_EXITS,
    player: 'PLAYER',
    here: 'WEST-OF-HOUSE',
    globalObjects: 'GLOBAL-OBJECTS',
    score: 0,
    moves: 0,
    verbose: false,
    superBrief: false,
    loadAllowed: 70,
  };
}

// ─── Serialization ───────────────────────────────────────────────────────────

type SaveData = {
  objectParents: Array<[string, string | null]>;
  objectFlags: Array<[string, string[]]>;
  here: string;
  score: number;
  moves: number;
  verbose: boolean;
  superBrief: boolean;
};

type SlotEntry = SaveData & { timestamp: number; room: string };
type SavesStore = Record<string, SlotEntry>;

export type SlotInfo = { name: string; timestamp: number; room: string; score: number };

export function serializeState(state: GameState): string {
  const data: SaveData = {
    objectParents: Array.from(state.objects.entries())
      .map(([id, obj]) => [id, obj.parent]),
    objectFlags: Array.from(state.objects.entries())
      .map(([id, obj]) => [id, Array.from(obj.flags)]),
    here: state.here,
    score: state.score,
    moves: state.moves,
    verbose: state.verbose,
    superBrief: state.superBrief,
  };
  return JSON.stringify(data);
}

export function deserializeState(json: string): GameState {
  const data = JSON.parse(json) as SaveData;

  const initial = buildInitialState();
  const objects = new Map(initial.objects);

  const parentsMap = new Map<string, string | null>(data.objectParents);
  const flagsMap = new Map<string, Set<string>>(
    data.objectFlags.map(([id, flags]) => [id, new Set(flags)])
  );

  for (const [id, obj] of objects) {
    const savedParent = parentsMap.get(id);
    const savedFlags = flagsMap.get(id);
    const newParent = savedParent !== undefined ? savedParent : obj.parent;
    const newFlags = savedFlags ?? obj.flags;
    if (newParent !== obj.parent || newFlags !== obj.flags) {
      objects.set(id, { ...obj, parent: newParent, flags: newFlags });
    }
  }

  return {
    ...initial,
    objects,
    here: data.here,
    score: data.score,
    moves: data.moves,
    verbose: data.verbose,
    superBrief: data.superBrief,
  };
}

// ─── Command dispatch ────────────────────────────────────────────────────────

function findObj(noun: string, state: GameState): GameObject | undefined {
  const id = NOUN_INDEX.get(noun.toLowerCase()) ?? noun.toUpperCase();
  return state.objects.get(id);
}

function dispatchCommand(cmd: string, state: GameState): [GameState, string] {
  const tokens = cmd.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [state, ''];

  const verb = tokens[0];
  const noun = tokens.slice(1).join(' ');

  const dirKey = noun === '' ? DIRECTIONS.get(verb) : undefined;
  if (dirKey !== undefined) return vWalk(state, DIR_OBJECTS.get(dirKey));

  if ((verb === 'go' || verb === 'walk') && DIRECTIONS.has(noun)) {
    return vWalk(state, DIR_OBJECTS.get(DIRECTIONS.get(noun)!));
  }

  switch (verb) {
    case 'look': case 'l':         return vLook(state);
    case 'inventory': case 'i':    return vInventory(state);
    case 'take': case 'get':       return vTake(state, findObj(noun, state));
    case 'drop':                   return vDrop(state, findObj(noun, state));
    case 'open':                   return vOpen(state, findObj(noun, state));
    case 'close':                  return vClose(state, findObj(noun, state));
    case 'examine': case 'x':      return vExamine(state, findObj(noun, state));
    case 'read':                   return vRead(state, findObj(noun, state));
    case 'score':                  return vScore(state);
    case 'quit': case 'q':         return vQuit(state);
    case 'save':                   return vSave(state, noun.trim() || 'quick');
    case 'restore':                return vRestore(state, noun.trim() || 'quick');
    case 'saves':                  return vSavesList(state);
    case 'verbose':                return vVerbose(state);
    case 'brief':                  return vBrief(state);
    case 'wait': case 'z':         return vWait(state);
    default:
      return [state, `I don't know the word "${verb}".`];
  }
}

// ─── GameService ─────────────────────────────────────────────────────────────

export class GameService {
  private state: GameState;
  private readonly undoStack: string[] = [];

  constructor(private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = globalThis.localStorage) {
    this.state = buildInitialState();
  }

  /**
   * Process one player input and return the output lines to display.
   * A full turn cycle: dispatch → clock → handle signals.
   */
  processCommand(input: string): string[] {
    const trimmed = input.trim();
    if (!trimmed) return [];

    const cmd = trimmed.toLowerCase();

    // UNDO: pop snapshot without pushing a new one first
    if (cmd === 'undo') {
      if (this.undoStack.length === 0) return ['Nothing to undo.'];
      this.state = deserializeState(this.undoStack.pop()!);
      const [, roomDesc] = vLook(this.state);
      return ['Undone.', roomDesc];
    }

    // Push snapshot before executing the command
    this.undoStack.push(serializeState(this.state));
    if (this.undoStack.length > UNDO_DEPTH) this.undoStack.shift();

    const prevHere = this.state.here;
    const [newState, output] = dispatchCommand(cmd, this.state);
    this.state = { ...newState, moves: newState.moves + 1 };

    // Tick the clock
    clocker(this.state);

    // Handle engine signals from meta verbs
    if (output.startsWith(SIGNAL_SAVE_PREFIX)) {
      const slot = output.slice(SIGNAL_SAVE_PREFIX.length);
      const ok = this.save(slot);
      return [ok ? 'Saved.' : `Cannot save: ${MAX_SLOTS} slots are full. Use "saves" to see them.`];
    }
    if (output.startsWith(SIGNAL_RESTORE_PREFIX)) {
      const slot = output.slice(SIGNAL_RESTORE_PREFIX.length);
      return [this.restore(slot) ? 'Restored.' : 'No saved game found.'];
    }
    if (output === SIGNAL_SAVES_LIST) {
      return [this.listSlots()];
    }
    if (output === SIGNAL_QUIT) {
      return ['Thanks for playing!'];
    }

    // Successful move: return the new room description
    if (output === '' && this.state.here !== prevHere) {
      const [, roomDesc] = vLook(this.state);
      return [roomDesc];
    }

    return [output];
  }

  /** Persist current state to the named slot. Returns false if the slot cap is reached. */
  save(slot = 'quick'): boolean {
    const store = this.loadStore();
    const isNew = !(slot in store);
    if (isNew && Object.keys(store).length >= MAX_SLOTS) return false;
    const data = JSON.parse(serializeState(this.state)) as SaveData;
    store[slot] = { ...data, timestamp: Date.now(), room: this.state.here };
    this.storage.setItem(SAVES_KEY, JSON.stringify(store));
    return true;
  }

  /** Load state from the named slot. Returns true on success. */
  restore(slot = 'quick'): boolean {
    this.migrateLegacySave();
    const store = this.loadStore();
    const entry = store[slot];
    if (!entry) return false;
    try {
      this.state = deserializeState(JSON.stringify(entry));
      return true;
    } catch {
      return false;
    }
  }

  /** Return structured slot data for UI display. */
  listSlotsData(): SlotInfo[] {
    const store = this.loadStore();
    return Object.entries(store).map(([name, entry]) => ({
      name,
      timestamp: entry.timestamp,
      room: entry.room,
      score: entry.score,
    }));
  }

  private listSlots(): string {
    const slots = this.listSlotsData();
    if (slots.length === 0) return 'No saved games.';
    return slots.map(s => {
      const when = new Date(s.timestamp).toLocaleString();
      return `${s.name}: ${s.room} — score ${s.score} (${when})`;
    }).join('\n');
  }

  private loadStore(): SavesStore {
    const json = this.storage.getItem(SAVES_KEY);
    if (!json) return {};
    try { return JSON.parse(json) as SavesStore; } catch { return {}; }
  }

  private migrateLegacySave(): void {
    const legacy = this.storage.getItem(LEGACY_SAVE_KEY);
    if (!legacy) return;
    const store = this.loadStore();
    if ('quick' in store) return;
    try {
      const data = JSON.parse(legacy) as SaveData;
      store['quick'] = { ...data, timestamp: 0, room: data.here };
      this.storage.setItem(SAVES_KEY, JSON.stringify(store));
    } catch { /* ignore corrupt legacy data */ }
  }

  /** Step back one command via the undo stack. Returns true on success. */
  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    this.state = deserializeState(this.undoStack.pop()!);
    return true;
  }

  getState(): Readonly<GameState> {
    return this.state;
  }
}
