/**
 * Extended transcript runner for the 350-point full walkthrough.
 *
 * Tracks score (BASE-SCORE + OTVAL-FROB) the same way the ZIL engine does:
 *   BASE-SCORE  = sum of object values taken + room bonuses + LIGHT-SHAFT event
 *   OTVAL-FROB  = sum of tvalue of items in the trophy case
 *   SCORE       = BASE-SCORE + OTVAL-FROB
 */

import { OBJECTS } from '../engine/data/objects';
import { rooms } from '../engine/data/rooms';

// ---------------------------------------------------------------------------
// Object metadata
// ---------------------------------------------------------------------------

interface ObjMeta {
  value: number;
  tvalue: number;
  location: string | null;
  synonyms: readonly string[];
  adjectives: readonly string[];
  flags: Set<string>;
  contbit: boolean;
}

const OBJ: Map<string, ObjMeta> = new Map();
for (const o of OBJECTS) {
  const flags = o.flags as unknown as Set<string>;
  OBJ.set(o.id, {
    value: (o as any).value ?? 0,
    tvalue: (o as any).tvalue ?? 0,
    location: o.location,
    synonyms: o.synonyms,
    adjectives: (o as any).adjectives ?? [],
    flags,
    contbit: flags.has('CONTBIT'),
  });
}

// ---------------------------------------------------------------------------
// Noun index (lowercase phrase/word → object id)
// ---------------------------------------------------------------------------

const NOUN_INDEX: Map<string, string> = new Map();

// Build from synonyms and adjectives (first one wins)
for (const o of OBJECTS) {
  for (const s of o.synonyms) {
    const lc = s.toLowerCase();
    if (!NOUN_INDEX.has(lc)) NOUN_INDEX.set(lc, o.id);
  }
  for (const a of ((o as any).adjectives as string[] ?? [])) {
    const lc = a.toLowerCase();
    if (!NOUN_INDEX.has(lc)) NOUN_INDEX.set(lc, o.id);
  }
}

// Manual overrides / disambiguations
NOUN_INDEX.set('coins', 'BAG-OF-COINS');
NOUN_INDEX.set('bag of coins', 'BAG-OF-COINS');
NOUN_INDEX.set('lantern', 'LAMP');
NOUN_INDEX.set('platinum', 'BAR');
NOUN_INDEX.set('inflatable boat', 'INFLATABLE-BOAT');
NOUN_INDEX.set('pot of gold', 'POT-OF-GOLD');
NOUN_INDEX.set('pot', 'POT-OF-GOLD');
NOUN_INDEX.set('skeleton key', 'KEYS');
NOUN_INDEX.set('trap door', 'TRAP-DOOR');
NOUN_INDEX.set('trap-door', 'TRAP-DOOR');
NOUN_INDEX.set('yellow button', 'YELLOW-BUTTON');

/**
 * Resolve a noun phrase to an object id.
 * Tries exact phrase, then each word left-to-right (last match wins so
 * "inflatable boat" → override beats word-level "boat" → INFLATED-BOAT).
 */
function resolveNoun(noun: string): string | null {
  const lc = noun.trim().toLowerCase();
  if (NOUN_INDEX.has(lc)) return NOUN_INDEX.get(lc)!;
  const words = lc.split(/\s+/);
  let result: string | null = null;
  for (const w of words) {
    const m = NOUN_INDEX.get(w);
    if (m !== undefined) result = m;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Room exits (all conditional exits treated as unconditional)
// ---------------------------------------------------------------------------

const ROOM_EXITS: Map<string, Map<string, string | null>> = new Map();
for (const room of rooms) {
  const id = room.id.toUpperCase();
  const exits = new Map<string, string | null>();
  for (const exit of room.exits) {
    if ('message' in exit) {
      exits.set(exit.direction, null);
    } else {
      exits.set(exit.direction, (exit as any).destination.toUpperCase());
    }
  }
  ROOM_EXITS.set(id, exits);
}

// ---------------------------------------------------------------------------
// Room bonuses (ZIL P?VALUE on specific rooms)
// ---------------------------------------------------------------------------

const ROOM_BONUSES: Map<string, number> = new Map([
  ['KITCHEN', 10],
  ['CELLAR', 25],
  ['TREASURE-ROOM', 25],
  ['EAST-OF-CHASM', 5],
]);

// ---------------------------------------------------------------------------
// Direction aliases
// ---------------------------------------------------------------------------

const DIRS = new Map<string, string>([
  ['n', 'north'], ['north', 'north'],
  ['s', 'south'], ['south', 'south'],
  ['e', 'east'],  ['east', 'east'],
  ['w', 'west'],  ['west', 'west'],
  ['ne', 'ne'], ['nw', 'nw'], ['se', 'se'], ['sw', 'sw'],
  ['u', 'up'],   ['up', 'up'],
  ['d', 'down'], ['down', 'down'],
  ['in', 'in'],  ['out', 'out'],
  ['land', 'land'],
]);

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

interface WState {
  room: string;
  inventory: Set<string>;              // direct inventory (items PLAYER carries)
  parents: Map<string, string | null>; // object id → parent id
  openItems: Set<string>;              // containers currently open
  invisible: Set<string>;              // objects hidden (INVISIBLE flag still set)
  scoredObjects: Set<string>;          // objects whose value has been awarded
  baseScore: number;
  scoredRooms: Set<string>;
  lightShaftDone: boolean;
  prevRoom: string;
  lampOn: boolean;
  machineState: 'coal' | 'diamond' | 'empty';
  machineOpen: boolean;
  singDone: boolean;           // canary aria performed once
  lowTide: boolean;            // reservoir drained
  boatInflated: boolean;
  rainbowActive: boolean;
  trollDead: boolean;
  cyclopsFled: boolean;
  grateUnlocked: boolean;
  rugMoved: boolean;
}

function buildInitialState(): WState {
  const parents = new Map<string, string | null>();
  const openItems = new Set<string>();
  const invisible = new Set<string>();

  for (const o of OBJECTS) {
    parents.set(o.id, o.location);
    const flags = o.flags as unknown as Set<string>;
    if (flags.has('OPENBIT')) openItems.add(o.id);
    if (flags.has('INVISIBLE')) invisible.add(o.id);
  }

  return {
    room: 'WEST-OF-HOUSE',
    inventory: new Set(),
    parents,
    openItems,
    invisible,
    scoredObjects: new Set(),
    baseScore: 0,
    scoredRooms: new Set(),
    lightShaftDone: false,
    prevRoom: 'WEST-OF-HOUSE',
    lampOn: false,
    machineState: 'coal',
    machineOpen: false,
    singDone: false,
    lowTide: false,
    boatInflated: false,
    rainbowActive: false,
    trollDead: false,
    cyclopsFled: false,
    grateUnlocked: false,
    rugMoved: false,
  };
}

// ---------------------------------------------------------------------------
// World helpers
// ---------------------------------------------------------------------------

function getContents(containerId: string, state: WState): string[] {
  const result: string[] = [];
  for (const [id, parent] of state.parents) {
    if (parent === containerId) result.push(id);
  }
  return result;
}

/** Is obj reachable by the player (in room, inventory, or open container)? */
function isReachable(id: string, state: WState): boolean {
  if (state.invisible.has(id)) return false;
  const parent = state.parents.get(id);
  if (parent === null || parent === undefined) return false;
  if (parent === 'PLAYER' || state.inventory.has(id)) return true;
  if (parent === state.room) return true;
  // Inside an open container in inventory
  if (state.inventory.has(parent) && state.openItems.has(parent)) return true;
  // Inside an open container in the room
  const grandparent = state.parents.get(parent);
  if ((grandparent === state.room || state.inventory.has(parent)) && state.openItems.has(parent)) return true;
  return false;
}

/** Is obj owned by the player (directly or in a held container)? */
function isOwnedByPlayer(id: string, state: WState): boolean {
  if (state.inventory.has(id)) return true;
  const parent = state.parents.get(id);
  if (parent && state.inventory.has(parent)) return true;
  return false;
}

function moveToInventory(id: string, state: WState): WState {
  const newParents = new Map(state.parents);
  newParents.set(id, 'PLAYER');
  const newInv = new Set(state.inventory);
  newInv.add(id);
  return { ...state, parents: newParents, inventory: newInv };
}

function removeFromWorld(id: string, state: WState): WState {
  const newParents = new Map(state.parents);
  newParents.set(id, null);
  const newInv = new Set(state.inventory);
  newInv.delete(id);
  return { ...state, parents: newParents, inventory: newInv };
}

function placeAt(id: string, location: string, state: WState): WState {
  const newParents = new Map(state.parents);
  newParents.set(id, location);
  return { ...state, parents: newParents };
}

function openContainer(id: string, state: WState): WState {
  const newOpen = new Set(state.openItems);
  newOpen.add(id);
  return { ...state, openItems: newOpen };
}

function clearInvisible(id: string, state: WState): WState {
  const newInv = new Set(state.invisible);
  newInv.delete(id);
  return { ...state, invisible: newInv };
}

/** Apply room-entry side-effects: bonuses and LIGHT-SHAFT. */
function applyRoomEntry(room: string, fromRoom: string, state: WState): WState {
  let s = state;
  if (!s.scoredRooms.has(room)) {
    const bonus = ROOM_BONUSES.get(room) ?? 0;
    if (bonus > 0) {
      s = { ...s, baseScore: s.baseScore + bonus, scoredRooms: new Set([...s.scoredRooms, room]) };
    } else {
      s = { ...s, scoredRooms: new Set([...s.scoredRooms, room]) };
    }
  }
  // LIGHT-SHAFT: entering LOWER-SHAFT from MACHINE-ROOM for the first time
  if (room === 'LOWER-SHAFT' && !s.lightShaftDone && fromRoom === 'MACHINE-ROOM') {
    s = { ...s, baseScore: s.baseScore + 13, lightShaftDone: true };
  }
  return s;
}

function isForestRoom(room: string): boolean {
  return ['FOREST-1', 'FOREST-2', 'FOREST-3', 'PATH', 'UP-A-TREE'].includes(room);
}

// ---------------------------------------------------------------------------
// Score
// ---------------------------------------------------------------------------

function computeScore(state: WState): number {
  const trophyContents = getContents('TROPHY-CASE', state);
  const tvalueSum = trophyContents.reduce((sum, id) => sum + (OBJ.get(id)?.tvalue ?? 0), 0);
  return state.baseScore + tvalueSum;
}

// ---------------------------------------------------------------------------
// Dispatch
// ---------------------------------------------------------------------------

function dispatch(cmd: string, state: WState): [WState, string] {
  const tokens = cmd.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [state, ''];
  const verb = tokens[0];
  const rest = tokens.slice(1).join(' ');

  // Pure direction
  const dir = DIRS.get(verb);
  if (dir !== undefined && rest === '') return doMove(dir, state);

  // GO / WALK
  if ((verb === 'go' || verb === 'walk') && DIRS.has(rest)) {
    return doMove(DIRS.get(rest)!, state);
  }

  // CLIMB (treat as direction when given a direction arg)
  if (verb === 'climb') {
    const cdir = DIRS.get(rest) ?? (rest.includes('up') ? 'up' : rest.includes('down') ? 'down' : '');
    if (cdir) return doMove(cdir, state);
    return [state, 'You climb around a bit.'];
  }

  switch (verb) {

    case 'look': case 'l': {
      const roomDef = rooms.find(r => r.id.toUpperCase() === state.room);
      return [state, roomDef?.desc ?? state.room];
    }

    case 'inventory': case 'i': {
      if (state.inventory.size === 0) return [state, 'You are empty-handed.'];
      const items = [...state.inventory]
        .map(id => OBJ.get(id)?.synonyms[0]?.toLowerCase() ?? id.toLowerCase())
        .join(', ');
      return [state, `You are carrying: ${items}.`];
    }

    case 'score': {
      return [state, String(computeScore(state))];
    }

    case 'take': case 'get': {
      const dobj = rest.split(' from ')[0].split(' out of ')[0].trim();
      if (!dobj) return [state, 'Take what?'];
      return doTake(dobj, state);
    }

    case 'drop': {
      return doDrop(rest, state);
    }

    case 'put': {
      // PUT <obj> IN/ON <container>
      const inIdx = rest.indexOf(' in ');
      const onIdx = rest.indexOf(' on ');
      const splitIdx = inIdx >= 0 ? inIdx : onIdx >= 0 ? onIdx : -1;
      if (splitIdx < 0) return [state, 'Put it where?'];
      const dobjStr = rest.slice(0, splitIdx).trim();
      const iobjStr = rest.slice(splitIdx + 4).trim();
      return doPut(dobjStr, iobjStr, state);
    }

    case 'open': {
      const target = rest.split(' with ')[0].trim();
      return doOpen(target, state);
    }

    case 'close': {
      return doClose(rest, state);
    }

    case 'unlock': {
      const target = rest.split(' with ')[0].trim();
      return doUnlock(target, state);
    }

    case 'turn': {
      if (rest.startsWith('on ')) return doTurnOn(rest.slice(3).trim(), state);
      if (rest.startsWith('off ')) return [state, 'Turned off.'];
      const withIdx = rest.indexOf(' with ');
      if (withIdx >= 0) {
        const objStr = rest.slice(0, withIdx).trim();
        const toolStr = rest.slice(withIdx + 6).trim();
        return doTurnWith(objStr, toolStr, state);
      }
      return [state, 'Turn what?'];
    }

    case 'move': case 'push': case 'pull': case 'lift': case 'raise': {
      return doPushMove(rest, state);
    }

    case 'kill': case 'attack': case 'fight': case 'hit': case 'strike': {
      const withIdx = rest.indexOf(' with ');
      const target = withIdx >= 0 ? rest.slice(0, withIdx).trim() : rest;
      return doKill(target, state);
    }

    case 'give': {
      const toIdx = rest.indexOf(' to ');
      if (toIdx < 0) return [state, 'Give it to whom?'];
      const dobjStr = rest.slice(0, toIdx).trim();
      const iobjStr = rest.slice(toIdx + 4).trim();
      return doGive(dobjStr, iobjStr, state);
    }

    case 'tie': {
      const toIdx = rest.indexOf(' to ');
      if (toIdx < 0) return [state, 'Tie it to what?'];
      const dobjStr = rest.slice(0, toIdx).trim();
      const iobjStr = rest.slice(toIdx + 4).trim();
      return doTie(dobjStr, iobjStr, state);
    }

    case 'inflate': {
      return doInflate(rest, state);
    }

    case 'board': case 'ride': case 'enter': {
      return doBoard(rest, state);
    }

    case 'land': {
      return doMove('land', state);
    }

    case 'wind': {
      return doWind(rest, state);
    }

    case 'wave': case 'brandish': {
      return doWave(rest, state);
    }

    case 'ring': {
      return [state, 'The bell rings with a pure, clear tone.'];
    }

    case 'read': {
      return [state, 'You read it carefully.'];
    }

    case 'examine': case 'x': case 'describe': {
      const id = resolveNoun(rest);
      if (!id) return [state, "You don't see that here."];
      const meta = OBJ.get(id);
      return [state, `It's the ${meta?.synonyms[0]?.toLowerCase() ?? id.toLowerCase()}.`];
    }

    case 'dig': {
      return doDig(rest, state);
    }

    case 'pray': {
      return [state, 'You pray briefly.'];
    }

    case 'light': case 'burn': {
      if (rest.includes('lamp') || rest.includes('lantern')) return doTurnOn(rest, state);
      return [state, 'With what?'];
    }

    case 'lower': {
      return [state, 'Lowered.'];
    }

    case 'echo': {
      return [state, 'The room reverberates with the sound of your words.'];
    }

    case 'say': case 'yell': case 'shout': {
      return [state, 'You speak aloud.'];
    }

    case 'wait': case 'z': {
      return [state, 'Time passes.'];
    }

    case 'throw': {
      return [state, 'Thrown.'];
    }

    case 'eat': {
      return [state, 'That was tasty!'];
    }

    case 'swim': {
      return [state, 'You splash around.'];
    }

    case 'deflate': {
      return [state, 'The boat deflates.'];
    }

    case 'unlock': {
      return [state, 'Unlocked.'];
    }

    default:
      return [state, `I don't know the word "${verb}".`];
  }
}

// ---------------------------------------------------------------------------
// Move (room traversal)
// ---------------------------------------------------------------------------

function doMove(dir: string, state: WState): [WState, string] {
  const exits = ROOM_EXITS.get(state.room);
  if (!exits) return [state, "You can't go that way."];
  const dest = exits.get(dir);
  if (dest === undefined || dest === null) return [state, "You can't go that way."];

  const prevRoom = state.room;
  let s: WState = { ...state, room: dest, prevRoom };
  s = applyRoomEntry(dest, prevRoom, s);

  const roomDef = rooms.find(r => r.id.toUpperCase() === dest);
  return [s, roomDef?.desc ?? dest];
}

// ---------------------------------------------------------------------------
// Take
// ---------------------------------------------------------------------------

function doTake(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (!id) return [state, `You don't see "${nounStr}" here.`];

  const meta = OBJ.get(id);

  // TRYTAKEBIT without TAKEBIT = immovable
  if (meta?.flags.has('TRYTAKEBIT') && !meta?.flags.has('TAKEBIT')) {
    return [state, "That's fixed in place."];
  }

  if (!isReachable(id, state)) {
    return [state, "You don't see that here."];
  }

  let s = moveToInventory(id, state);

  // Award value (SCORE-OBJ: once per object)
  const val = meta?.value ?? 0;
  if (val > 0 && !state.scoredObjects.has(id)) {
    s = {
      ...s,
      baseScore: s.baseScore + val,
      scoredObjects: new Set([...s.scoredObjects, id]),
    };
  }

  return [s, 'Taken.'];
}

// ---------------------------------------------------------------------------
// Drop
// ---------------------------------------------------------------------------

function doDrop(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (!id || !state.inventory.has(id)) return [state, "You don't have that."];
  const newParents = new Map(state.parents);
  newParents.set(id, state.room);
  const newInv = new Set(state.inventory);
  newInv.delete(id);
  return [{ ...state, parents: newParents, inventory: newInv }, 'Dropped.'];
}

// ---------------------------------------------------------------------------
// Put X in/on Y
// ---------------------------------------------------------------------------

function doPut(dobjStr: string, iobjStr: string, state: WState): [WState, string] {
  const dobj = resolveNoun(dobjStr);
  const iobj = resolveNoun(iobjStr);

  if (!dobj) return [state, "You don't see that."];
  if (!iobj) return [state, 'Where?'];
  if (!isOwnedByPlayer(dobj, state)) return [state, "You aren't carrying that."];

  const newParents = new Map(state.parents);
  newParents.set(dobj, iobj);
  const newInv = new Set(state.inventory);
  newInv.delete(dobj);

  return [{ ...state, parents: newParents, inventory: newInv }, 'Done.'];
}

// ---------------------------------------------------------------------------
// Open / Close / Unlock
// ---------------------------------------------------------------------------

function doOpen(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (!id) return [state, "You don't see that."];

  if (id === 'MACHINE') {
    if (!state.machineOpen) {
      let s = openContainer('MACHINE', { ...state, machineOpen: true });
      if (s.machineState === 'diamond') {
        s = placeAt('DIAMOND', 'MACHINE-ROOM', s);
        s = clearInvisible('DIAMOND', s);
      }
      return [s, 'The machine opens.'];
    }
    return [state, 'The machine is already open.'];
  }

  if (state.openItems.has(id)) return [state, 'Already open.'];
  return [openContainer(id, state), 'Opened.'];
}

function doClose(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (!id) return [state, "You don't see that."];
  const newOpen = new Set(state.openItems);
  newOpen.delete(id);
  return [{ ...state, openItems: newOpen }, 'Closed.'];
}

function doUnlock(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (id === 'GRATE') {
    return [{ ...state, grateUnlocked: true }, 'The grate is now unlocked.'];
  }
  return [state, 'Unlocked.'];
}

// ---------------------------------------------------------------------------
// Turn on / Turn X with Y
// ---------------------------------------------------------------------------

function doTurnOn(nounStr: string, state: WState): [WState, string] {
  if (nounStr.includes('lamp') || nounStr.includes('lantern') || resolveNoun(nounStr) === 'LAMP') {
    return [{ ...state, lampOn: true }, 'Your lamp is now on.'];
  }
  return [state, 'Turned on.'];
}

function doTurnWith(objStr: string, _toolStr: string, state: WState): [WState, string] {
  const id = resolveNoun(objStr);
  // MACHINE-SWITCH has synonym 'SWITCH'; YELLOW-BUTTON also has 'SWITCH'
  // We want to activate the machine's switch here
  if (id === 'MACHINE-SWITCH' || id === 'YELLOW-BUTTON' || objStr.includes('switch')) {
    if (state.machineState === 'coal' && !state.machineOpen) {
      return [{ ...state, machineState: 'diamond' }, 'There is a loud click. The machine hums briefly.'];
    }
    return [state, 'Nothing happens.'];
  }
  return [state, 'You turn it.'];
}

// ---------------------------------------------------------------------------
// Move / Push (rug, buttons)
// ---------------------------------------------------------------------------

function doPushMove(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);

  if (id === 'RUG' || nounStr.includes('rug') || nounStr.includes('carpet')) {
    if (!state.rugMoved) {
      return [{ ...state, rugMoved: true },
        'With great effort, the rug is moved aside, revealing the trap door.'];
    }
    return [state, 'The rug is already moved.'];
  }

  if (id === 'YELLOW-BUTTON' || nounStr.includes('yellow')) {
    if (!state.lowTide) {
      let s = clearInvisible('TRUNK', { ...state, lowTide: true });
      return [s, 'The sluice gates open. The reservoir slowly empties.'];
    }
    return [state, 'Already done.'];
  }

  return [state, 'Moved.'];
}

// ---------------------------------------------------------------------------
// Kill / Attack
// ---------------------------------------------------------------------------

function doKill(targetStr: string, state: WState): [WState, string] {
  const id = resolveNoun(targetStr);
  if (id === 'TROLL' || targetStr.includes('troll')) {
    return [{ ...state, trollDead: true }, 'The troll slumps dead.'];
  }
  if (id === 'THIEF' || targetStr.includes('thief')) {
    return [state, 'The thief escapes.'];
  }
  return [state, 'Your attack misses.'];
}

// ---------------------------------------------------------------------------
// Give X to Y
// ---------------------------------------------------------------------------

function doGive(dobjStr: string, iobjStr: string, state: WState): [WState, string] {
  const dobj = resolveNoun(dobjStr);
  const iobj = resolveNoun(iobjStr);

  if (iobj === 'CYCLOPS' || iobjStr.includes('cyclops')) {
    let s = state;
    if (dobj && isOwnedByPlayer(dobj, state)) {
      s = removeFromWorld(dobj, s);
    }
    return [{ ...s, cyclopsFled: true },
      'The cyclops, recognizing the garlic, runs screaming from the room.'];
  }

  if (dobj && isOwnedByPlayer(dobj, state)) {
    return [removeFromWorld(dobj, state), 'Given.'];
  }
  return [state, "You don't have that."];
}

// ---------------------------------------------------------------------------
// Tie X to Y
// ---------------------------------------------------------------------------

function doTie(dobjStr: string, iobjStr: string, state: WState): [WState, string] {
  const dobj = resolveNoun(dobjStr);
  const iobj = resolveNoun(iobjStr);
  if (dobj === 'ROPE' && (iobj === 'RAILING' || iobjStr.includes('rail'))) {
    return [state, 'The rope is now tied to the railing and hangs down into the darkness.'];
  }
  return [state, 'Tied.'];
}

// ---------------------------------------------------------------------------
// Inflate X with Y
// ---------------------------------------------------------------------------

function doInflate(rest: string, state: WState): [WState, string] {
  if (rest.includes('boat') || rest.includes('pile') || rest.includes('plastic')) {
    if (!state.boatInflated) {
      let s: WState = { ...state, boatInflated: true };
      s = removeFromWorld('INFLATABLE-BOAT', s);
      // Place inflated boat at player's location
      s = placeAt('INFLATED-BOAT', state.room, s);
      return [s, 'The boat inflates with a satisfying pop!'];
    }
    return [state, 'The boat is already inflated.'];
  }
  return [state, 'Inflated.'];
}

// ---------------------------------------------------------------------------
// Board boat (puts player in RIVER-1)
// ---------------------------------------------------------------------------

function doBoard(rest: string, state: WState): [WState, string] {
  // Board the inflated boat → start river at RIVER-1
  if (rest.includes('boat') || rest.includes('raft') || rest === '' || state.boatInflated) {
    const prevRoom = state.room;
    let s: WState = { ...state, room: 'RIVER-1', prevRoom };
    s = applyRoomEntry('RIVER-1', prevRoom, s);
    const roomDef = rooms.find(r => r.id === 'river-1');
    return [s, roomDef?.desc ?? 'Frigid River'];
  }
  return [state, "There's nothing to board here."];
}

// ---------------------------------------------------------------------------
// Wind canary
// ---------------------------------------------------------------------------

function doWind(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (id === 'CANARY' || nounStr.includes('canary')) {
    if (!state.singDone && isForestRoom(state.room)) {
      const bauleLoc = state.room === 'UP-A-TREE' ? 'PATH' : state.room;
      let s: WState = { ...state, singDone: true };
      s = placeAt('BAUBLE', bauleLoc, s);
      s = clearInvisible('BAUBLE', s);
      return [s,
        'The canary chirps an aria from a forgotten opera. ' +
        'A beautiful brass bauble drops from a passing songbird and lands nearby.'];
    }
    return [state, 'The canary chirps blithely.'];
  }
  return [state, 'You wind it up.'];
}

// ---------------------------------------------------------------------------
// Wave sceptre (creates rainbow)
// ---------------------------------------------------------------------------

function doWave(nounStr: string, state: WState): [WState, string] {
  const id = resolveNoun(nounStr);
  if (id === 'SCEPTRE' || nounStr.includes('sceptre') || nounStr.includes('scepter')) {
    if (!state.rainbowActive) {
      let s: WState = { ...state, rainbowActive: true };
      s = clearInvisible('POT-OF-GOLD', s);
      s = placeAt('POT-OF-GOLD', 'END-OF-RAINBOW', s);
      return [s, 'The sceptre glows brilliantly. A rainbow appears, arcing into the mist!'];
    }
    return [state, 'The sceptre glows faintly.'];
  }
  return [state, 'You wave it.'];
}

// ---------------------------------------------------------------------------
// Dig (reveals scarab in sandy cave)
// ---------------------------------------------------------------------------

function doDig(nounStr: string, state: WState): [WState, string] {
  if (state.room === 'SANDY-CAVE') {
    let s = clearInvisible('SCARAB', state);
    return [s, 'Your shovel uncovers a beautiful jeweled scarab!'];
  }
  return [state, 'Digging here reveals nothing useful.'];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface WalkthroughResult {
  outputs: string[];
  finalScore: number;
}

export function runFullWalkthrough(commands: string[]): WalkthroughResult {
  let state = buildInitialState();
  const outputs: string[] = [];
  for (const cmd of commands) {
    const [newState, output] = dispatch(cmd, state);
    state = newState;
    outputs.push(output);
  }
  return { outputs, finalScore: computeScore(state) };
}
