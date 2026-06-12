/**
 * Maze rooms, thief, and trophy-case mechanics.
 *
 * Mirrors TROPHY-CASE-FCN, OTVAL-FROB, I-THIEF, THIEF-VS-ADVENTURER,
 * ROB, ROB-MAZE, STEAL-JUNK, DROP-JUNK, DEPOSIT-BOOTY, RECOVER-STILETTO,
 * and ROBBER-FUNCTION from 1actions.zil ("SUBTITLE A SEEDY LOOKING GENTLEMAN").
 *
 * All functions are pure: state in → new state + messages out.
 */

import {
  GameState,
  move,
  getContents,
  getLocation,
  fcheck,
  fset,
  fclear,
  isIn,
  INVISIBLE,
  SACREDBIT,
  TAKEBIT,
  RLANDBIT,
  NDESCBIT,
  OPENBIT,
} from '../world';

// ── Constants ─────────────────────────────────────────────────────────────────

/** MAZEBIT — marks maze rooms. Not in world.ts; domain-specific here. */
export const MAZEBIT = 'MAZEBIT';

/** TOUCHBIT — room or object has been visited/touched by the player. */
export const TOUCHBIT = 'TOUCHBIT';

/** FIGHTBIT — actor is currently in combat mode. */
export const FIGHTBIT = 'FIGHTBIT';

export const OBJ_THIEF       = 'thief';
export const OBJ_STILETTO    = 'stiletto';
export const OBJ_LARGE_BAG   = 'large-bag';
export const OBJ_TROPHY_CASE = 'trophy-case';
export const OBJ_EGG         = 'egg';

export const ROOM_TREASURE_ROOM = 'treasure-room';

/** All 19 maze rooms (MAZEBIT), in ZIL source order for thief wandering. */
export const MAZE_ROOM_IDS: ReadonlyArray<string> = [
  'maze-1',    'maze-2',    'maze-3',    'maze-4',    'maze-5',
  'maze-6',    'maze-7',    'maze-8',    'maze-9',    'maze-10',
  'maze-11',   'maze-12',   'maze-13',   'maze-14',   'maze-15',
  'dead-end-1', 'dead-end-2', 'dead-end-3', 'dead-end-4',
];

// ── State ─────────────────────────────────────────────────────────────────────

/**
 * GameState extended with Zork I globals required by thief/treasure logic.
 *
 * thiefHere:      THIEF-HERE — thief's presence has been announced to the player.
 * thiefEngrossed: THIEF-ENGROSSED — thief is distracted admiring a given treasure.
 * baseScore:      BASE-SCORE — score without trophy-case contributions.
 * score:          SCORE — current total score.
 * tvalueMap:      P?TVALUE keyed by object ID (ZIL numeric property on objects).
 *                 Stored separately because world.ts has no numeric property system.
 */
export interface ThiefGameState extends GameState {
  readonly thiefHere: boolean;
  readonly thiefEngrossed: boolean;
  readonly baseScore: number;
  readonly score: number;
  readonly tvalueMap: ReadonlyMap<string, number>;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Look up P?TVALUE for an object (0 if not set). */
function tval(id: string, state: ThiefGameState): number {
  return state.tvalueMap.get(id) ?? 0;
}

/** Merge world-level object changes back into a ThiefGameState. */
function applyWorld(base: ThiefGameState, world: GameState): ThiefGameState {
  return { ...base, objects: world.objects };
}

// ── OTVAL-FROB ────────────────────────────────────────────────────────────────

/**
 * OTVAL-FROB: recursively sum P?TVALUE of every item inside the trophy case.
 * Called by LIVING-ROOM-FCN M-END after any TAKE or PUT-to-TROPHY-CASE.
 */
export function trophyCaseScore(state: ThiefGameState): number {
  function sumIn(id: string): number {
    return getContents(id, state).reduce((acc, child) => {
      return acc + tval(child, state) + sumIn(child);
    }, 0);
  }
  return sumIn(OBJ_TROPHY_CASE);
}

// ── TROPHY-CASE-FCN ───────────────────────────────────────────────────────────

export interface TrophyCaseResult {
  handled: boolean;
  message: string;
  state: ThiefGameState;
}

/**
 * TROPHY-CASE-FCN: TAKE on the case refuses; PUT recalculates score.
 */
export function trophyCaseAction(
  verb: 'TAKE' | 'PUT',
  prso: string,
  prsi: string | null,
  state: ThiefGameState,
): TrophyCaseResult {
  if (verb === 'TAKE' && prso === OBJ_TROPHY_CASE) {
    return {
      handled: true,
      message: 'The trophy case is securely fastened to the wall.',
      state,
    };
  }

  if (verb === 'PUT' && prsi === OBJ_TROPHY_CASE) {
    const newScore = state.baseScore + trophyCaseScore(state);
    return { handled: true, message: '', state: { ...state, score: newScore } };
  }

  return { handled: false, message: '', state };
}

// ── ROB ───────────────────────────────────────────────────────────────────────

export interface RobResult {
  state: ThiefGameState;
  robbed: boolean;
}

/**
 * ROB: steal all visible non-sacred tvalue>0 items from `fromId` into thief.
 * Optional `prob` (0–100) = per-item percentage chance; omit for 100%.
 */
export function rob(
  fromId: string,
  state: ThiefGameState,
  rng: () => number = Math.random,
  prob?: number,
): RobResult {
  let s = state;
  let robbed = false;

  for (const id of getContents(fromId, state)) {
    if (fcheck(id, INVISIBLE, state)) continue;
    if (fcheck(id, SACREDBIT, state)) continue;
    if (tval(id, state) <= 0) continue;
    if (prob !== undefined && rng() * 100 >= prob) continue;

    s = applyWorld(s, move(id, OBJ_THIEF, s));
    s = applyWorld(s, fset(id, TOUCHBIT, s));
    s = applyWorld(s, fset(id, INVISIBLE, s));
    robbed = true;
  }

  return { state: s, robbed };
}

// ── ROB-MAZE ──────────────────────────────────────────────────────────────────

export interface RobMazeResult {
  state: ThiefGameState;
  message: string | null;
}

/**
 * ROB-MAZE: 40% chance per takeable visible item to notice it;
 * 60% sub-chance to actually steal it.
 */
export function robMaze(
  roomId: string,
  state: ThiefGameState,
  rng: () => number,
): RobMazeResult {
  for (const id of getContents(roomId, state)) {
    if (!fcheck(id, TAKEBIT, state)) continue;
    if (fcheck(id, INVISIBLE, state)) continue;
    if (rng() >= 0.4) continue;

    const msg =
      `You hear, off in the distance, someone saying "My, I wonder what this fine ${id} is doing here."`;
    if (rng() < 0.6) {
      let s = applyWorld(state, move(id, OBJ_THIEF, state));
      s = applyWorld(s, fset(id, TOUCHBIT, s));
      s = applyWorld(s, fset(id, INVISIBLE, s));
      return { state: s, message: msg };
    }
    return { state, message: msg };
  }
  return { state, message: null };
}

// ── STEAL-JUNK ────────────────────────────────────────────────────────────────

export interface StealJunkResult {
  state: ThiefGameState;
  message: string | null;
}

/**
 * STEAL-JUNK: steal worthless (tvalue=0) takeable non-sacred visible items.
 * Stiletto is always stolen; all others have 10% probability.
 */
export function stealJunk(
  roomId: string,
  playerRoom: string,
  state: ThiefGameState,
  rng: () => number,
): StealJunkResult {
  for (const id of getContents(roomId, state)) {
    if (tval(id, state) !== 0) continue;
    if (!fcheck(id, TAKEBIT, state)) continue;
    if (fcheck(id, SACREDBIT, state)) continue;
    if (fcheck(id, INVISIBLE, state)) continue;
    if (id !== OBJ_STILETTO && rng() >= 0.1) continue;

    let s = applyWorld(state, move(id, OBJ_THIEF, state));
    s = applyWorld(s, fset(id, TOUCHBIT, s));
    s = applyWorld(s, fset(id, INVISIBLE, s));

    return {
      state: s,
      message: roomId === playerRoom ? `You suddenly notice that the ${id} vanished.` : null,
    };
  }
  return { state, message: null };
}

// ── DROP-JUNK ─────────────────────────────────────────────────────────────────

export interface DropJunkResult {
  state: ThiefGameState;
  message: string | null;
}

/**
 * DROP-JUNK: 30% chance per worthless item to drop it from thief's bag into `roomId`.
 */
export function dropJunk(
  roomId: string,
  playerRoom: string,
  state: ThiefGameState,
  rng: () => number,
): DropJunkResult {
  let s = state;
  let announced = false;

  for (const id of getContents(OBJ_THIEF, state)) {
    if (id === OBJ_STILETTO || id === OBJ_LARGE_BAG) continue;
    if (tval(id, state) !== 0) continue;
    if (rng() >= 0.3) continue;

    s = applyWorld(s, fclear(id, INVISIBLE, s));
    s = applyWorld(s, move(id, roomId, s));
    if (roomId === playerRoom && !announced) announced = true;
  }

  return {
    state: s,
    message: announced
      ? 'The robber, rummaging through his bag, dropped a few items he found valueless.'
      : null,
  };
}

// ── DEPOSIT-BOOTY ─────────────────────────────────────────────────────────────

export interface DepositResult {
  state: ThiefGameState;
  deposited: boolean;
  eggSolved: boolean;
}

/**
 * DEPOSIT-BOOTY: move tvalue>0 items (excluding stiletto and large-bag)
 * from thief into `roomId`. Special-cases the egg (EGG-SOLVE).
 */
export function depositBooty(roomId: string, state: ThiefGameState): DepositResult {
  let s = state;
  let deposited = false;
  let eggSolved = false;

  for (const id of getContents(OBJ_THIEF, state)) {
    if (id === OBJ_STILETTO || id === OBJ_LARGE_BAG) continue;
    if (tval(id, state) <= 0) continue;

    s = applyWorld(s, move(id, roomId, s));
    deposited = true;
    if (id === OBJ_EGG) {
      eggSolved = true;
      s = applyWorld(s, fset(OBJ_EGG, OPENBIT, s));
    }
  }

  return { state: s, deposited, eggSolved };
}

// ── RECOVER-STILETTO ──────────────────────────────────────────────────────────

/**
 * RECOVER-STILETTO: if the stiletto is loose in the thief's room, move it
 * into the thief and hide it.
 */
export function recoverStiletto(state: ThiefGameState): ThiefGameState {
  const thiefLoc = getLocation(OBJ_THIEF, state);
  if (!thiefLoc) return state;
  if (isIn(OBJ_STILETTO, OBJ_THIEF, state)) return state;
  if (getLocation(OBJ_STILETTO, state) !== thiefLoc) return state;

  let s = applyWorld(state, move(OBJ_STILETTO, OBJ_THIEF, state));
  s = applyWorld(s, fset(OBJ_STILETTO, NDESCBIT, s));
  return s;
}

// ── HACK-TREASURES ────────────────────────────────────────────────────────────

/**
 * HACK-TREASURES: make thief invisible and reveal all items in TREASURE-ROOM.
 */
export function hackTreasures(state: ThiefGameState): ThiefGameState {
  let s = applyWorld(state, fset(OBJ_THIEF, INVISIBLE, state));
  for (const id of getContents(ROOM_TREASURE_ROOM, state)) {
    s = applyWorld(s, fclear(id, INVISIBLE, s));
  }
  return s;
}

// ── THIEF-VS-ADVENTURER ───────────────────────────────────────────────────────

interface TVAResult {
  state: ThiefGameState;
  thiefHere: boolean;
  messages: string[];
  /** True if I-THIEF should return immediately (mirrors ZIL RTRUE). */
  done: boolean;
}

/**
 * THIEF-VS-ADVENTURER: decides what the thief does when in the player's room.
 *
 * Covers announcement, robbing, and leaving. Combat is handled by I-FIGHT
 * (not implemented here) per the ZIL source structure.
 */
function thiefVsAdventurer(
  wasVisible: boolean,
  state: ThiefGameState,
  rng: () => number,
): TVAResult {
  const noOp: TVAResult = { state, thiefHere: state.thiefHere, messages: [], done: false };

  if (state.here === ROOM_TREASURE_ROOM) return noOp;

  if (!state.thiefHere) {
    if (!wasVisible && rng() < 0.3) {
      // 30%: announce thief's presence
      const hasStiletto = isIn(OBJ_STILETTO, OBJ_THIEF, state);
      const msg = hasStiletto
        ? 'Someone carrying a large bag is casually leaning against one of the walls here. ' +
          'He does not speak, but it is clear from his aspect that the bag will be taken only over his dead body.'
        : 'You feel a light finger-touch, and turning, notice a grinning figure holding a large bag in one hand and a stiletto in the other.';
      const s = applyWorld(state, fclear(OBJ_THIEF, INVISIBLE, state));
      return { state: s, thiefHere: true, messages: [msg], done: true };
    }

    if (wasVisible && fcheck(OBJ_THIEF, FIGHTBIT, state) && rng() >= 0.1) {
      return noOp; // 90%: continue fighting
    }

    if (wasVisible && rng() < 0.3) {
      // 30%: leave disgusted (took nothing)
      let s = applyWorld(state, fset(OBJ_THIEF, INVISIBLE, state));
      s = recoverStiletto(s);
      return {
        state: s,
        thiefHere: false,
        messages: ['The holder of the large bag just left, looking disgusted. Fortunately, he took nothing.'],
        done: true,
      };
    }

    if (rng() < 0.7) return noOp; // 70%: do nothing

    return doRobAndLeave(wasVisible, state, rng, false);
  }

  // Already announced: 30% chance to rob and leave
  if (wasVisible && rng() < 0.3) {
    return doRobAndLeave(wasVisible, state, rng, true);
  }

  return noOp;
}

function doRobAndLeave(
  wasVisible: boolean,
  state: ThiefGameState,
  rng: () => number,
  alreadyHere: boolean,
): TVAResult {
  let s = state;
  let robbedFrom: 'room' | 'player' | null = null;

  const roomRob = rob(state.here, s, rng);
  s = roomRob.state;
  if (roomRob.robbed) robbedFrom = 'room';

  if (!robbedFrom) {
    const playerRob = rob(state.player, s, rng);
    s = playerRob.state;
    if (playerRob.robbed) robbedFrom = 'player';
  }

  s = recoverStiletto(s);
  s = applyWorld(s, fset(OBJ_THIEF, INVISIBLE, s));

  const messages: string[] = [];
  if (!wasVisible && robbedFrom) {
    const what = robbedFrom === 'room' ? 'the room' : 'your possession';
    messages.push(
      `A seedy-looking individual with a large bag just wandered through the room. ` +
      `On the way through, he quietly abstracted some valuables from ${what}, mumbling something about "Doing unto others before..."`,
    );
  } else if (wasVisible && robbedFrom) {
    const what = robbedFrom === 'player' ? 'robbed you blind first.' : 'appropriated the valuables in the room.';
    messages.push(
      `The thief just left, still carrying his large bag. You may not have noticed that he ${what}`,
    );
  } else if (!wasVisible && !robbedFrom) {
    messages.push(
      'A "lean and hungry" gentleman just wandered through, carrying a large bag. Finding nothing of value, he left disgruntled.',
    );
  } else {
    messages.push('The thief, finding nothing of value, left disgusted.');
  }

  return { state: s, thiefHere: alreadyHere ? false : true, messages, done: true };
}

// ── I-THIEF ───────────────────────────────────────────────────────────────────

export interface IThiefResult {
  state: ThiefGameState;
  messages: string[];
}

/**
 * I-THIEF: clock-registered routine, called once per game turn.
 *
 * Case A — thief in TREASURE-ROOM (player elsewhere): deposit booty, then wander.
 * Case B — thief in player's room: run THIEF-VS-ADVENTURER interaction.
 * Case C — thief elsewhere: hack visited rooms, then wander to next room.
 *
 * `allRooms` is the ordered non-sacred RLANDBIT room list the thief cycles through
 * (mirrors ZIL FIRST?/NEXT? iteration over the ROOMS object).
 */
export function iThief(
  state: ThiefGameState,
  allRooms: string[],
  rng: () => number,
): IThiefResult {
  const thiefRoom = getLocation(OBJ_THIEF, state);
  const thiefVisible = !fcheck(OBJ_THIEF, INVISIBLE, state);
  const playerRoom = state.here;
  const messages: string[] = [];
  let s = state;

  // ── Case A: thief in TREASURE-ROOM but player is elsewhere ────────────────────
  if (thiefRoom === ROOM_TREASURE_ROOM && thiefRoom !== playerRoom) {
    if (thiefVisible) s = hackTreasures(s);
    s = depositBooty(ROOM_TREASURE_ROOM, s).state;
    // Fall through to wander (thief is now invisible)

  // ── Case B: thief in same room as player ─────────────────────────────────────
  } else if (thiefRoom === playerRoom) {
    const tva = thiefVsAdventurer(thiefVisible, s, rng);
    messages.push(...tva.messages);
    s = { ...tva.state, thiefHere: tva.thiefHere };
    if (tva.done) return { state: s, messages };

  // ── Case C: thief is in some other room ──────────────────────────────────────
  } else {
    if (thiefVisible) s = applyWorld(s, fset(OBJ_THIEF, INVISIBLE, s));
    if (thiefRoom && fcheck(thiefRoom, TOUCHBIT, s)) {
      const { state: s2 } = rob(thiefRoom, s, rng, 75);
      s = s2;
      const bothMaze = fcheck(thiefRoom, MAZEBIT, s) && fcheck(playerRoom, MAZEBIT, s);
      if (bothMaze) {
        const { state: s3, message } = robMaze(thiefRoom, s, rng);
        s = s3;
        if (message) messages.push(message);
      } else {
        const { state: s3, message } = stealJunk(thiefRoom, playerRoom, s, rng);
        s = s3;
        if (message) messages.push(message);
      }
    }
  }

  // ── Wander to next room when invisible ────────────────────────────────────────
  if (fcheck(OBJ_THIEF, INVISIBLE, s)) {
    s = recoverStiletto(s);
    const currentRoom = getLocation(OBJ_THIEF, s);
    const nextRoom = wanderNext(currentRoom, allRooms, s);
    if (nextRoom) {
      s = applyWorld(s, move(OBJ_THIEF, nextRoom, s));
      s = applyWorld(s, fclear(OBJ_THIEF, FIGHTBIT, s));
      s = { ...s, thiefHere: false };

      // Second-pass hack on the new room (ZIL PROG/AGAIN second iteration)
      if (fcheck(nextRoom, TOUCHBIT, s)) {
        const { state: s2 } = rob(nextRoom, s, rng, 75);
        s = s2;
        const bothMaze = fcheck(nextRoom, MAZEBIT, s) && fcheck(playerRoom, MAZEBIT, s);
        if (bothMaze) {
          const { state: s3, message } = robMaze(nextRoom, s, rng);
          s = s3;
          if (message) messages.push(message);
        } else {
          const { state: s3, message } = stealJunk(nextRoom, playerRoom, s, rng);
          s = s3;
          if (message) messages.push(message);
        }
      }
    }
  }

  // ── Drop junk in final room ───────────────────────────────────────────────────
  const finalRoom = getLocation(OBJ_THIEF, s);
  if (finalRoom && finalRoom !== ROOM_TREASURE_ROOM) {
    const { state: s2, message } = dropJunk(finalRoom, playerRoom, s, rng);
    s = s2;
    if (message) messages.push(message);
  }

  return { state: s, messages };
}

/**
 * Find the next wanderable room after `currentRoom` by cycling through `allRooms`.
 * Skips sacred rooms (SACREDBIT). Mirrors ZIL FIRST?/NEXT? over ,ROOMS.
 */
function wanderNext(
  currentRoom: string | null,
  allRooms: string[],
  state: ThiefGameState,
): string | null {
  if (allRooms.length === 0) return null;

  const idx = currentRoom ? allRooms.indexOf(currentRoom) : -1;
  const start = (idx + 1 + allRooms.length) % allRooms.length;

  for (let i = 0; i < allRooms.length; i++) {
    const room = allRooms[(start + i) % allRooms.length];
    if (!fcheck(room, SACREDBIT, state) && fcheck(room, RLANDBIT, state)) {
      return room;
    }
  }
  return null;
}
