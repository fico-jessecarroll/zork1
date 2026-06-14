/**
 * Hades, endgame, and death/resurrection mechanics.
 *
 * Mirrors the ZIL routines from 1actions.zil:
 *   JIGS-UP, GHOSTS-F, BELL-F, HOT-BELL-F, LLD-ROOM (= Entrance-to-Hades room fn),
 *   and the Bell/Book/Candles exorcism ceremony.
 *
 * All functions are pure: they accept state and return new state + messages.
 */

import { GameState as WorldState, move, fcheck, fclear, isIn, ONBIT, INVISIBLE } from '../world';

// ── Canonical IDs ────────────────────────────────────────────────────────────

export const OBJ_BELL = 'bell';
export const OBJ_HOT_BELL = 'hot-bell';
export const OBJ_BOOK = 'book';
export const OBJ_CANDLES = 'candles';
export const OBJ_GHOSTS = 'ghosts';
export const OBJ_COFFIN = 'coffin';
export const OBJ_LAMP = 'lamp';
export const OBJ_TRAP_DOOR = 'trap-door';

export const ROOM_ENTRANCE_TO_HADES = 'entrance-to-hades';
export const ROOM_LAND_OF_LIVING_DEAD = 'land-of-living-dead';
export const ROOM_FOREST_1 = 'forest-1';
export const ROOM_EGYPT_ROOM = 'egypt-room';
export const ROOM_SOUTH_TEMPLE = 'south-temple';

// ── State ────────────────────────────────────────────────────────────────────

/**
 * WorldState extended with Zork I globals required by death/Hades logic.
 *
 * deaths:              ZIL DEATHS global, counts upward from 0.
 *                      JIGS-UP triggers game-over when deaths >= 2 (before
 *                      the increment), matching the ZIL `<NOT <L? ,DEATHS 2>>` check.
 * dead:                DEAD global — true while the player is a ghost.
 * lldFlag:             LLD-FLAG — set when the exorcism ceremony completes.
 * xb:                  XB — set when the bell has been rung to start the ceremony.
 * xc:                  XC — set when the candle-dance phase activates (candles lit
 *                      while XB is active).
 * lucky:               LUCKY — if false, adds "Bad luck, huh?" to the death output.
 * score:               current score (JIGS-UP deducts 10 on death).
 * southTempleUnlocked: mirrors SOUTH-TEMPLE having TOUCHBIT — true once the player
 *                      has visited the South Temple.  Determines whether death sends
 *                      the player to the forest (false) or to Hades as a ghost (true).
 */
export interface HadesGameState extends WorldState {
  readonly deaths: number;
  readonly dead: boolean;
  readonly lldFlag: boolean;
  readonly xb: boolean;
  readonly xc: boolean;
  readonly lucky: boolean;
  readonly score: number;
  readonly southTempleUnlocked: boolean;
}

// ── Result types ─────────────────────────────────────────────────────────────

/**
 * Outcome of JIGS-UP (ZIL: death handler).
 *
 * already-dead  Player is already in ghost state — game over immediately.
 * game-over     DEATHS was >= 2 on entry (third death) — "suicidal maniac".
 * to-hades      Deaths < 2, South Temple seen — player becomes a ghost at
 *               Entrance to Hades.
 * resurrected   Deaths < 2, South Temple not yet seen — player gets a second
 *               chance and wakes in Forest-1.
 */
export type DeathOutcome =
  | { kind: 'already-dead' }
  | { kind: 'game-over'; messages: string[] }
  | { kind: 'to-hades'; messages: string[]; newState: HadesGameState }
  | { kind: 'resurrected'; messages: string[]; newState: HadesGameState };

/** Result from an action handler (mirrors ZIL M_HANDLED / M_NOT_HANDLED). */
export type ActionResult =
  | { handled: true; messages: string[]; newState: HadesGameState }
  | { handled: false };

// ── ZIL message literals ─────────────────────────────────────────────────────

const MSG_BAD_LUCK = "Bad luck, huh?";

const MSG_YOU_HAVE_DIED = "    ****  You have died  ****";

const MSG_SUICIDAL_MANIAC =
  "You clearly are a suicidal maniac.  We don't allow psychotics in the\n" +
  "cave, since they may harm other adventurers.  Your remains will be\n" +
  "installed in the Land of the Living Dead, where your fellow\n" +
  "adventurers may gloat over them.";

const MSG_GHOST_TRANSITION =
  "As you take your last breath, you feel relieved of your burdens. The\n" +
  "feeling passes as you find yourself before the gates of Hell, where\n" +
  "the spirits jeer at you and deny you entry.  Your senses are\n" +
  "disturbed.  The objects in the dungeon appear indistinct, bleached of\n" +
  "color, even unreal.";

const MSG_ANOTHER_CHANCE =
  "Now, let's take a look here...\n" +
  "Well, you probably deserve another chance.  I can't quite fix you\n" +
  "up completely, but you can't have everything.";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Merge world-level state changes back into a HadesGameState. */
function applyWorldChange(base: HadesGameState, world: WorldState): HadesGameState {
  return { ...base, objects: world.objects };
}

/** Return true when the player is carrying obj. */
function playerHas(obj: string, state: HadesGameState): boolean {
  return isIn(obj, state.player, state);
}

// ── JIGS-UP ──────────────────────────────────────────────────────────────────

/**
 * JIGS-UP — the death handler (ZIL 1actions.zil:4046).
 *
 * Call with a cause-of-death description string.  Returns a DeathOutcome
 * discriminated union; the caller is responsible for displaying messages and
 * transitioning to the new state.
 *
 * Lives model (mirrors ZIL DEATHS global):
 *   deaths=0 → first death allowed
 *   deaths=1 → second death allowed
 *   deaths=2 → game over ("suicidal maniac") — checked before incrementing
 */
export function jigsUp(desc: string, state: HadesGameState): DeathOutcome {
  if (state.dead) {
    return { kind: 'already-dead' };
  }

  const messages: string[] = [desc];
  if (!state.lucky) messages.push(MSG_BAD_LUCK);
  messages.push(MSG_YOU_HAVE_DIED);

  // ZIL: `<NOT <L? ,DEATHS 2>>` — game over if deaths >= 2 (before increment)
  if (state.deaths >= 2) {
    return { kind: 'game-over', messages: [...messages, MSG_SUICIDAL_MANIAC] };
  }

  const newDeaths = state.deaths + 1;
  const newScore = state.score - 10;

  if (state.southTempleUnlocked) {
    // Ghost path: DEAD=T, ALWAYS-LIT=T, move to Entrance to Hades
    const movedWorld = move(state.player, ROOM_ENTRANCE_TO_HADES, state);
    const newState: HadesGameState = {
      ...applyWorldChange(state, movedWorld),
      deaths: newDeaths,
      dead: true,
      alwaysLit: true,
      here: ROOM_ENTRANCE_TO_HADES,
      score: newScore,
    };
    return { kind: 'to-hades', messages: [...messages, MSG_GHOST_TRANSITION], newState };
  } else {
    // Resurrection path: move to Forest-1
    const movedWorld = move(state.player, ROOM_FOREST_1, state);
    const newState: HadesGameState = {
      ...applyWorldChange(state, movedWorld),
      deaths: newDeaths,
      here: ROOM_FOREST_1,
      score: newScore,
    };
    return { kind: 'resurrected', messages: [...messages, MSG_ANOTHER_CHANCE], newState };
  }
}

// ── GHOSTS-F ─────────────────────────────────────────────────────────────────

/**
 * GHOSTS-F — action handler for the ghost spirits in LLD-ROOM (ZIL 1actions.zil:264).
 *
 * verbs: 'tell' | 'exorcise' | 'attack' | 'mung' | '*' (any other)
 */
export function ghostsF(verb: string, prso: string | null, state: HadesGameState): ActionResult {
  switch (verb) {
    case 'tell':
      return {
        handled: true,
        messages: ["The spirits jeer loudly and ignore you."],
        newState: state,
      };
    case 'exorcise':
      return {
        handled: true,
        messages: ["Only the ceremony itself has any effect."],
        newState: state,
      };
    case 'attack':
    case 'mung':
      if (prso === OBJ_GHOSTS) {
        return {
          handled: true,
          messages: ["How can you attack a spirit with material objects?"],
          newState: state,
        };
      }
      break;
  }
  return {
    handled: true,
    messages: ["You seem unable to interact with these spirits."],
    newState: state,
  };
}

// ── BELL-F ───────────────────────────────────────────────────────────────────

/**
 * BELL-F — action handler for the normal bell (ZIL 1actions.zil:343).
 *
 * When RING is called in the Entrance to Hades before the exorcism is
 * complete, returns handled=false to fall through to the room handler
 * (LLD-ROOM M-BEG) which performs the actual ceremony step.
 */
export function bellF(verb: string, state: HadesGameState): ActionResult {
  if (verb === 'ring') {
    if (state.here === ROOM_ENTRANCE_TO_HADES && !state.lldFlag) {
      return { handled: false };
    }
    return { handled: true, messages: ["Ding, dong."], newState: state };
  }
  return { handled: false };
}

// ── HOT-BELL-F ───────────────────────────────────────────────────────────────

/**
 * HOT-BELL-F — action handler for the bell while it is glowing hot
 * (ZIL 1actions.zil:351).  The hot bell cannot be touched.
 */
export function hotBellF(
  verb: string,
  prsi: string | null,
  state: HadesGameState,
): ActionResult {
  switch (verb) {
    case 'take':
      return {
        handled: true,
        messages: ["The bell is very hot and cannot be taken."],
        newState: state,
      };
    case 'rub':
    case 'ring': {
      if (prsi) {
        const msg = prsi === 'hands'
          ? "The bell is too hot to touch."
          : "The heat from the bell is too intense.";
        return { handled: true, messages: [msg], newState: state };
      }
      // ring with no indirect object
      return {
        handled: true,
        messages: ["The bell is too hot to reach."],
        newState: state,
      };
    }
    case 'pour-on': {
      // Water cools the bell: swap hot-bell back to regular bell
      let newState = applyWorldChange(state, move(OBJ_HOT_BELL, state.here, state));
      // Remove hot-bell, restore plain bell to entrance
      const hotBellObj = newState.objects.get(OBJ_HOT_BELL);
      if (hotBellObj) {
        const objects = new Map(newState.objects);
        objects.set(OBJ_HOT_BELL, { ...hotBellObj, parent: null });
        const bellObj = objects.get(OBJ_BELL);
        if (bellObj) objects.set(OBJ_BELL, { ...bellObj, parent: ROOM_ENTRANCE_TO_HADES });
        newState = { ...newState, objects };
      }
      return {
        handled: true,
        messages: ["The water cools the bell and is evaporated."],
        newState,
      };
    }
  }
  return { handled: false };
}

// ── LLD-ROOM (Entrance to Hades) room handler ────────────────────────────────

/**
 * Room handler for ENTRANCE-TO-HADES (ZIL LLD-ROOM, 1actions.zil:1058).
 *
 * Call with phase='M-BEG' before the verb fires, or 'M-END' after.
 * For M-BEG, pass the current verb and prso (object the player is acting on).
 *
 * This function drives the three-step Bell/Book/Candles exorcism:
 *   1. RING BELL  → XB=true, bell goes hot, candles drop (if held/lit)
 *   2. (next turn, M-END) lit candles in hand + XB → XC=true (candle dance)
 *   3. READ BOOK  → XC must be true → LLD-FLAG=true, ghosts removed
 */
export function lldRoomMBeg(
  verb: string,
  prso: string | null,
  state: HadesGameState,
): ActionResult {
  // EXORCISE verb: tell player what's needed
  if (verb === 'exorcise' && !state.lldFlag) {
    const hasAll = playerHas(OBJ_BELL, state)
      && playerHas(OBJ_BOOK, state)
      && playerHas(OBJ_CANDLES, state);
    const msg = hasAll
      ? "You must perform the ceremony."
      : "You aren't equipped for an exorcism.";
    return { handled: true, messages: [msg], newState: state };
  }

  // RING BELL: start the ceremony (XB phase)
  if (verb === 'ring' && prso === OBJ_BELL && !state.lldFlag) {
    const messages: string[] = [
      "The bell suddenly becomes red hot and falls to the ground. The\n" +
      "wraiths, as if paralyzed, stop their jeering and slowly turn to face\n" +
      "you. On their ashen faces, the expression of a long-forgotten terror\n" +
      "takes shape.",
    ];

    // Move bell → hot-bell in this room
    let newState: HadesGameState = { ...state, xb: true };
    const bellObj = newState.objects.get(OBJ_BELL);
    const hotBellObj = newState.objects.get(OBJ_HOT_BELL);
    if (bellObj && hotBellObj) {
      const objects = new Map(newState.objects);
      objects.set(OBJ_BELL, { ...bellObj, parent: null });
      objects.set(OBJ_HOT_BELL, { ...hotBellObj, parent: ROOM_ENTRANCE_TO_HADES });
      newState = { ...newState, objects };
    }

    // If player carried lit candles, they drop and extinguish
    if (playerHas(OBJ_CANDLES, newState) && fcheck(OBJ_CANDLES, ONBIT, newState)) {
      messages.push(
        "In your confusion, the candles drop to the ground (and they are out).",
      );
      let ws: WorldState = move(OBJ_CANDLES, ROOM_ENTRANCE_TO_HADES, newState);
      ws = fclear(OBJ_CANDLES, ONBIT, ws);
      newState = applyWorldChange(newState, ws);
    }

    return { handled: true, messages, newState };
  }

  // READ BOOK: complete the ceremony (requires XC active)
  if (verb === 'read' && prso === OBJ_BOOK && state.xc && !state.lldFlag) {
    const messages = [
      "Each word of the prayer reverberates through the hall in a deafening\n" +
      "confusion. As the last word fades, a voice, loud and commanding,\n" +
      "speaks: \"Begone, fiends!\" A heart-stopping scream fills the cavern,\n" +
      "and the spirits, sensing a greater power, flee through the walls.",
    ];

    // Remove ghosts, set LLD-FLAG
    let newState: HadesGameState = { ...state, lldFlag: true, xc: false };
    const ghostObj = newState.objects.get(OBJ_GHOSTS);
    if (ghostObj) {
      const objects = new Map(newState.objects);
      objects.set(OBJ_GHOSTS, { ...ghostObj, parent: null });
      newState = { ...newState, objects };
    }

    return { handled: true, messages, newState };
  }

  return { handled: false };
}

/**
 * M-END phase of LLD-ROOM: fires at the end of the turn after the bell has
 * been rung (XB=true).  If the player still carries lit candles and XC has
 * not yet been set, advance to the candle-dance phase (XC=true).
 */
export function lldRoomMEnd(
  state: HadesGameState,
): { messages: string[]; newState: HadesGameState } {
  if (
    state.xb
    && !state.xc
    && playerHas(OBJ_CANDLES, state)
    && fcheck(OBJ_CANDLES, ONBIT, state)
  ) {
    const messages = [
      "The flames flicker wildly and appear to dance. The earth beneath\n" +
      "your feet trembles, and your legs nearly buckle beneath you.\n" +
      "The spirits cower at your unearthly power.",
    ];
    return { messages, newState: { ...state, xc: true } };
  }
  return { messages: [], newState: state };
}

// ── DEAD-FUNCTION (ghost-state verb overrides) ───────────────────────────────

/**
 * DEAD-FUNCTION — replaces the player's action handler when they are in ghost
 * state (ZIL 1actions.zil:3113).
 *
 * Returns a handled result with an appropriate message for most verbs, or
 * handled=false for verbs that are allowed even while dead (BRIEF, VERBOSE,
 * VERSION, SAVE, RESTORE, QUIT, RESTART).
 *
 * PRAY in SOUTH-TEMPLE triggers resurrection.
 */
export function deadFunction(
  verb: string,
  state: HadesGameState,
): ActionResult {
  switch (verb) {
    case 'brief':
    case 'verbose':
    case 'super-brief':
    case 'version':
    case 'save':
    case 'restore':
    case 'quit':
    case 'restart':
      return { handled: false };

    case 'attack':
    case 'mung':
    case 'alarm':
    case 'swing':
      return { handled: true, messages: ["All such attacks are vain in your condition."], newState: state };

    case 'open':
    case 'close':
    case 'eat':
    case 'drink':
    case 'inflate':
    case 'deflate':
    case 'turn':
    case 'burn':
    case 'tie':
    case 'untie':
    case 'rub':
      return { handled: true, messages: ["Even such an action is beyond your capabilities."], newState: state };

    case 'wait':
      return { handled: true, messages: ["Might as well. You've got an eternity."], newState: state };

    case 'lamp-on':
      return { handled: true, messages: ["You need no light to guide you."], newState: state };

    case 'score':
      return { handled: true, messages: ["You're dead! How can you think of your score?"], newState: state };

    case 'take':
      return { handled: true, messages: ["Your hand passes through its object."], newState: state };

    case 'drop':
    case 'throw':
    case 'inventory':
      return { handled: true, messages: ["You have no possessions."], newState: state };

    case 'diagnose':
      return { handled: true, messages: ["You are dead."], newState: state };

    case 'pray':
      if (state.here === ROOM_SOUTH_TEMPLE) {
        // Resurrection: wake in forest, clear dead state, restore lamp visibility
        const objects = new Map(state.objects);
        const lampObj = objects.get(OBJ_LAMP);
        if (lampObj) objects.set(OBJ_LAMP, { ...lampObj, flags: new Set([...lampObj.flags].filter(f => f !== INVISIBLE)) });
        const movedWorld = move(state.player, ROOM_FOREST_1, { ...state, objects });
        const newState: HadesGameState = {
          ...applyWorldChange(state, movedWorld),
          objects: new Map([...state.objects, ...movedWorld.objects]),
          dead: false,
          alwaysLit: false,
          here: ROOM_FOREST_1,
        };
        return {
          handled: true,
          messages: [
            "From the distance the sound of a lone trumpet is heard. The room\n" +
            "becomes very bright and you feel disembodied. In a moment, the\n" +
            "brightness fades and you find yourself rising as if from a long\n" +
            "sleep, deep in the woods. In the distance you can faintly hear a\n" +
            "songbird and the sounds of the forest.",
          ],
          newState,
        };
      }
      return { handled: true, messages: ["Your prayers are not heard."], newState: state };

    default:
      return { handled: true, messages: ["You can't even do that."], newState: state };
  }
}
