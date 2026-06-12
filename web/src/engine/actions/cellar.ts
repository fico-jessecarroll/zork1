/**
 * Cellar and troll room actions — ported from 1actions.zil (Infocom Zork I 1983).
 *
 * Implements:
 *   CELLAR-FCN      — trap door closes on first entry
 *   TROLL-FCN       — villain-melee dispatch for the troll
 *   VILLAIN-BLOW    — troll attacks player using weighted combat tables
 *   HERO-BLOW       — player attacks troll using weighted combat tables
 *   I-SWORD         — sword glow update based on enemy proximity
 *
 * Combat uses a seedable LCG (via GameState.seed) so all outcomes are
 * deterministic and reproducible in tests.
 */

import {
  GameState,
  rngInt,
  getProp,
  setProp,
  fcheck,
  fset,
  fclear,
  move,
  remove,
  isIn,
} from '../world';

// ─── Object id constants ──────────────────────────────────────────────────────
const TROLL     = 'TROLL';
const AXE       = 'AXE';
const SWORD     = 'SWORD';
const TRAP_DOOR = 'TRAP-DOOR';

// ─── ZIL flag names ───────────────────────────────────────────────────────────
const OPENBIT    = 'OPENBIT';
const TOUCHBIT   = 'TOUCHBIT';
const FIGHTBIT   = 'FIGHTBIT';
const STAGGERED  = 'STAGGERED';
const NDESCBIT   = 'NDESCBIT';
const WEAPONBIT  = 'WEAPONBIT';

// ─── ZIL blow result codes (ZIL constants MISSED, UNCONSCIOUS, …) ─────────────
export const MISSED        = 1 as const;
export const UNCONSCIOUS   = 2 as const;
export const KILLED        = 3 as const;
export const LIGHT_WOUND   = 4 as const;
export const SERIOUS_WOUND = 5 as const;
export const STAGGER       = 6 as const;
export const LOSE_WEAPON   = 7 as const;
export const HESITATE      = 8 as const;
export const SITTING_DUCK  = 9 as const;

export type BlowResult =
  | typeof MISSED | typeof UNCONSCIOUS | typeof KILLED
  | typeof LIGHT_WOUND | typeof SERIOUS_WOUND | typeof STAGGER
  | typeof LOSE_WEAPON | typeof HESITATE | typeof SITTING_DUCK;

// ─── ZIL combat outcome tables ────────────────────────────────────────────────
// Each array's first 9 elements are selected by RANDOM 9 (index 0..8).
// Layout mirrors ZIL DEF1 / DEF2A / DEF2B / DEF3A / DEF3B / DEF3C globals.
//
// DEF-RES indexing (from ZIL):
//   DEF1-RES[ATT-1]   where ATT capped at 3  → offset (ATT-1) into DEF1
//   DEF2-RES[ATT-1]   where ATT capped at 4  → DEF2A at ATT=1, DEF2B at (ATT-2)
//   DEF3-RES[rel+2]   where rel = clamp(ATT-DEF, -2..2)

const DEF1: readonly number[] = [
  MISSED, MISSED, MISSED, MISSED,       // idx 0-3
  STAGGER, STAGGER,                     // idx 4-5
  UNCONSCIOUS, UNCONSCIOUS,             // idx 6-7
  KILLED, KILLED, KILLED, KILLED, KILLED, // idx 8-12
];

const DEF2A: readonly number[] = [
  MISSED, MISSED, MISSED, MISSED, MISSED, // idx 0-4
  STAGGER, STAGGER,                       // idx 5-6
  LIGHT_WOUND, LIGHT_WOUND,              // idx 7-8
  UNCONSCIOUS,                            // idx 9
];

const DEF2B: readonly number[] = [
  MISSED, MISSED, MISSED,                 // idx 0-2
  STAGGER, STAGGER,                       // idx 3-4
  LIGHT_WOUND, LIGHT_WOUND, LIGHT_WOUND, // idx 5-7
  UNCONSCIOUS,                            // idx 8
  KILLED, KILLED, KILLED,                 // idx 9-11
];

const DEF3A: readonly number[] = [
  MISSED, MISSED, MISSED, MISSED, MISSED, // idx 0-4
  STAGGER, STAGGER,                       // idx 5-6
  LIGHT_WOUND, LIGHT_WOUND,              // idx 7-8
  SERIOUS_WOUND, SERIOUS_WOUND,          // idx 9-10
];

const DEF3B: readonly number[] = [
  MISSED, MISSED, MISSED,                 // idx 0-2
  STAGGER, STAGGER,                       // idx 3-4
  LIGHT_WOUND, LIGHT_WOUND, LIGHT_WOUND, // idx 5-7
  SERIOUS_WOUND, SERIOUS_WOUND, SERIOUS_WOUND, // idx 8-10
];

const DEF3C: readonly number[] = [
  MISSED,                                 // idx 0
  STAGGER, STAGGER,                       // idx 1-2
  LIGHT_WOUND, LIGHT_WOUND, LIGHT_WOUND, LIGHT_WOUND, // idx 3-6
  SERIOUS_WOUND, SERIOUS_WOUND, SERIOUS_WOUND,         // idx 7-9
];

// ─── TROLL-MELEE messages (result code − 1 gives array index) ─────────────────
// Messages that include "{weapon}" have the player's weapon name substituted.
const TROLL_MELEE: readonly string[][] = [
  /* MISSED (0) */        [
    "The troll swings his axe, but it misses.",
    "The troll's axe barely misses your ear.",
    "The axe sweeps past as you jump aside.",
    "The axe crashes against the rock, throwing sparks!",
  ],
  /* UNCONSCIOUS (1) */   [
    "The flat of the troll's axe hits you delicately on the head, knocking you out.",
  ],
  /* KILLED (2) */        [
    "The troll neatly removes your head.",
    "The troll's axe stroke cleaves you from the nave to the chops.",
    "The troll's axe removes your head.",
  ],
  /* LIGHT_WOUND (3) */   [
    "The axe gets you right in the side. Ouch!",
    "The flat of the troll's axe skins across your forearm.",
    "The troll's swing almost knocks you over as you barely parry in time.",
    "The troll swings his axe, and it nicks your arm as you dodge.",
  ],
  /* SERIOUS_WOUND (4) */ [
    "The troll charges, and his axe slashes you on your arm.",
    "An axe stroke makes a deep wound in your leg.",
    "The troll's axe swings down, gashing your shoulder.",
  ],
  /* STAGGER (5) */       [
    "The troll hits you with a glancing blow, and you are momentarily stunned.",
    "The troll swings; the blade turns on your armor but crashes broadside into your head.",
    "You stagger back under a hail of axe strokes.",
    "The troll's mighty blow drops you to your knees.",
  ],
  /* LOSE_WEAPON (6) */   [
    "The axe hits your {weapon} and knocks it spinning.",
    "The troll swings, you parry, but the force of his blow knocks your {weapon} away.",
    "The axe knocks your {weapon} out of your hand. It falls to the floor.",
  ],
  /* HESITATE (7) */      [
    "The troll hesitates, fingering his axe.",
    "The troll scratches his head ruminatively: Might you be magically protected, he wonders?",
  ],
  /* SITTING_DUCK (8) */  [
    "Conquering his fears, the troll puts you to death.",
  ],
];

// ─── HERO-MELEE messages ──────────────────────────────────────────────────────
const HERO_MELEE: readonly string[][] = [
  /* MISSED (0) */        [
    "Your {weapon} misses the troll by an inch.",
    "A good slash, but it misses the troll by a mile.",
    "You charge, but the troll jumps nimbly aside.",
    "Clang! Crash! The troll parries.",
    "A quick stroke, but the troll is on guard.",
    "A good stroke, but it's too slow; the troll dodges.",
  ],
  /* UNCONSCIOUS (1) */   [
    "Your {weapon} crashes down, knocking the troll into dreamland.",
    "The troll is battered into unconsciousness.",
    "A furious exchange, and the troll is knocked out!",
    "The haft of your {weapon} knocks out the troll.",
    "The troll is knocked out!",
  ],
  /* KILLED (2) */        [
    "It's curtains for the troll as your {weapon} removes his head.",
    "The fatal blow strikes the troll square in the heart: He dies.",
    "The troll takes a fatal blow and slumps to the floor dead.",
  ],
  /* LIGHT_WOUND (3) */   [
    "The troll is struck on the arm; blood begins to trickle down.",
    "Your {weapon} pinks the troll on the wrist, but it's not serious.",
    "Your stroke lands, but it was only the flat of the blade.",
    "The blow lands, making a shallow gash in the troll's arm!",
  ],
  /* SERIOUS_WOUND (4) */ [
    "The troll receives a deep gash in his side.",
    "A savage blow on the thigh! The troll is stunned but can still fight!",
    "Slash! Your blow lands! That one hit an artery, it could be serious!",
    "Slash! Your stroke connects! This could be serious!",
  ],
  /* STAGGER (5) */       [
    "The troll is staggered, and drops to his knees.",
    "The troll is momentarily disoriented and can't fight back.",
    "The force of your blow knocks the troll back, stunned.",
    "The troll is confused and can't fight back.",
    "The quickness of your thrust knocks the troll back, stunned.",
  ],
  /* LOSE_WEAPON (6) */   [
    "The troll's weapon is knocked to the floor, leaving him unarmed.",
    "The troll is disarmed by a subtle feint past his guard.",
  ],
  /* HESITATE (7) */      [],  // not used for hero blow
  /* SITTING_DUCK (8) */  [],  // not used for hero blow
];

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Select the combat outcome table based on attacker/defender strengths.
 * Mirrors the DEF1-RES / DEF2-RES / DEF3-RES table lookup in 1actions.zil.
 */
function selectTable(att: number, def: number): readonly number[] {
  if (def <= 0) return [KILLED];

  if (def === 1) {
    const a = Math.min(att, 3);
    // DEF1-RES[ATT-1]: offset (ATT-1) elements into DEF1
    return DEF1.slice(a - 1);
  }

  if (def === 2) {
    const a = Math.min(att, 4);
    if (a === 1) return DEF2A;
    // DEF2-RES[ATT-1]: ATT=2 → DEF2B[0], ATT=3 → DEF2B[1], ATT=4 → DEF2B[2]
    return DEF2B.slice(a - 2);
  }

  // def >= 3: compute relative attack, clamp to [-2, 2]
  let rel = att - def;
  if (rel < -1) rel = -2;
  else if (rel > 1) rel = 2;

  // DEF3-RES[rel+2]
  switch (rel) {
    case -2: return DEF3A;
    case -1: return DEF3A.slice(1);
    case  0: return DEF3B;
    case  1: return DEF3B.slice(1);
    default: return DEF3C; // rel === 2
  }
}

/** Pick one outcome from table using RANDOM 9 (1..9 → index 0..8). */
function rollOutcome(table: readonly number[], state: GameState): [BlowResult, GameState] {
  const [roll, s] = rngInt(9, state);
  const idx = Math.min(roll - 1, table.length - 1);
  return [table[idx] as BlowResult, s];
}

/** Pick a random message from the list, substituting the weapon description. */
function pickMessage(
  messages: readonly string[],
  weaponDesc: string,
  state: GameState,
): [string, GameState] {
  if (messages.length === 0) return ['', state];
  const [roll, s] = rngInt(messages.length, state);
  const msg = messages[roll - 1].replace(/{weapon}/g, weaponDesc);
  return [msg, s];
}

/**
 * Player fight strength: STRENGTH-MIN(2) + score/70 + P?STRENGTH adjustment.
 * Mirrors FIGHT-STRENGTH in 1actions.zil.
 */
function playerFightStrength(state: GameState): number {
  const base = 2 + Math.floor(state.score / 70);
  const adj = getProp('ADVENTURER', 'strength', state);
  return base + adj;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CombatResult {
  state: GameState;
  message: string;
  outcome: BlowResult;
  trollDead: boolean;
  playerDead: boolean;
}

/**
 * Troll attacks the player (VILLAIN-BLOW for the troll).
 *
 * Requires: TROLL is in state.here with FIGHTBIT set.
 * weaponDesc: description of the player's weapon (substituted in messages).
 */
export function trollAttacks(state: GameState, weaponDesc = 'weapon'): CombatResult {
  const trollStr = getProp(TROLL, 'strength', state, 2);
  const playerStr = playerFightStrength(state);

  const table = selectTable(trollStr, playerStr);
  let [outcome, s] = rollOutcome(table, state);

  // Pick the troll-melee message
  const msgList = TROLL_MELEE[outcome - 1] ?? [];
  let message: string;
  [message, s] = pickMessage(msgList, weaponDesc, s);

  let newState: GameState = s;
  let playerDead = false;

  const playerAdj = getProp('ADVENTURER', 'strength', newState);

  switch (outcome) {
    case LIGHT_WOUND:
      newState = setProp('ADVENTURER', 'strength', playerAdj - 1, newState);
      break;
    case SERIOUS_WOUND:
      newState = setProp('ADVENTURER', 'strength', playerAdj - 2, newState);
      break;
    case STAGGER:
      newState = fset('ADVENTURER', STAGGERED, newState);
      break;
    case LOSE_WEAPON:
      // Player's weapon drops to the floor (caller responsible for identifying it)
      break;
    case KILLED:
    case SITTING_DUCK:
      newState = setProp('ADVENTURER', 'strength', -10000, newState);
      playerDead = true;
      break;
    case UNCONSCIOUS:
      // Strength goes deeply negative (mirroring WINNER-RESULT setting DEF=0 → -10000)
      newState = setProp('ADVENTURER', 'strength', -Math.abs(playerStr) - 1, newState);
      playerDead = playerFightStrength(newState) <= 0;
      break;
  }

  return { state: newState, message, outcome, trollDead: false, playerDead };
}

/**
 * Player attacks the troll (HERO-BLOW).
 *
 * trollStrengthOverride: caller may override the troll's current strength
 *   (useful for tests; normally read from state.properties).
 * weaponDesc: description of the player's weapon.
 */
export function playerAttacksTroll(
  state: GameState,
  weaponDesc = 'sword',
): CombatResult {
  const trollStr = getProp(TROLL, 'strength', state, 2);
  const playerStr = playerFightStrength(state);
  const trollHasAxe = getLocation(AXE, state) === TROLL;

  let s = state;
  let outcome: BlowResult;
  let message: string;
  let newTrollStr = trollStr;

  // Unarmed or unconscious troll can't defend — instant kill (mirrors ZIL HERO-BLOW)
  if (!trollHasAxe || trollStr < 0) {
    outcome = KILLED;
    message = trollStr < 0
      ? "The unconscious troll cannot defend himself: He dies."
      : "The unarmed troll cannot defend himself: He dies.";
    newTrollStr = 0;
  } else {
    const table = selectTable(playerStr, trollStr);
    [outcome, s] = rollOutcome(table, s);
    const msgList = HERO_MELEE[outcome - 1] ?? [];
    [message, s] = pickMessage(msgList, weaponDesc, s);

    switch (outcome) {
      case LIGHT_WOUND:
        newTrollStr = trollStr - 1;
        break;
      case SERIOUS_WOUND:
        newTrollStr = trollStr - 2;
        break;
      case UNCONSCIOUS:
        newTrollStr = -Math.abs(trollStr);
        s = fclear(TROLL, FIGHTBIT, s);
        // Troll drops the axe
        s = move(AXE, s.here, s);
        s = fclear(AXE, NDESCBIT, s);
        s = fset(AXE, WEAPONBIT, s);
        break;
      case KILLED:
      case SITTING_DUCK:
        newTrollStr = 0;
        break;
      case STAGGER:
        s = fset(TROLL, STAGGERED, s);
        break;
      case LOSE_WEAPON:
        if (trollHasAxe) {
          s = move(AXE, s.here, s);
          s = fclear(AXE, NDESCBIT, s);
          s = fset(AXE, WEAPONBIT, s);
        }
        break;
    }
  }

  s = setProp(TROLL, 'strength', newTrollStr, s);

  // Troll dies when strength reaches 0 (VILLAIN-RESULT in ZIL)
  let trollDead = false;
  if (newTrollStr <= 0 && outcome !== STAGGER && outcome !== LOSE_WEAPON) {
    s = remove(TROLL, s);
    s = setProp('TROLL-FLAG', 'dead', 1, s);
    trollDead = true;
    if (outcome !== UNCONSCIOUS) {
      message +=
        "\nAlmost as soon as the troll breathes his last breath, a cloud" +
        " of sinister black fog envelops him, and when the fog lifts," +
        " the carcass has disappeared.";
    }
  }

  return { state: s, message, outcome, trollDead, playerDead: false };
}

/**
 * Update sword glow state based on enemy proximity (I-SWORD in 1actions.zil).
 *
 * Glow levels (stored as SWORD:glow in state.properties):
 *   0 = not glowing
 *   1 = faint blue glow (enemy in adjacent room)
 *   2 = glowing very brightly (enemy in current room)
 *
 * Returns updated state and a message to display (empty string if glow unchanged).
 */
export function checkSwordGlow(state: GameState): {
  state: GameState;
  glow: number;
  message: string;
} {
  const prevGlow = getProp(SWORD, 'glow', state);

  // Sword only glows when player is carrying it
  if (!isIn(SWORD, state.player, state)) {
    const newGlow = 0;
    const changed = prevGlow !== newGlow;
    const s = setProp(SWORD, 'glow', newGlow, state);
    return {
      state: s,
      glow: newGlow,
      message: changed && prevGlow > 0 ? "Your sword is no longer glowing." : '',
    };
  }

  // Check if troll (or another visible actor) is in the current room
  let newGlow = 0;
  const trollParent = getLocation(TROLL, state);
  if (trollParent === state.here && !fcheck(TROLL, 'INVISIBLE', state)) {
    newGlow = 2;
  }
  // (Adjacent room check omitted for now; would require room-exit traversal)

  const s = setProp(SWORD, 'glow', newGlow, state);
  let message = '';
  if (newGlow !== prevGlow) {
    if (newGlow === 2) message = "Your sword has begun to glow very brightly.";
    else if (newGlow === 1) message = "Your sword is glowing with a faint blue glow.";
    else message = "Your sword is no longer glowing.";
  }

  return { state: s, glow: newGlow, message };
}

/**
 * Cellar room action — M-ENTER handler (CELLAR-FCN in 1actions.zil).
 *
 * When the player first descends through the trap door (door is OPEN but not
 * yet TOUCHED), the door slams shut and is barred from above.
 */
export function cellarOnEnter(state: GameState): {
  state: GameState;
  message: string;
} {
  const doorOpen    = fcheck(TRAP_DOOR, OPENBIT,   state);
  const doorTouched = fcheck(TRAP_DOOR, TOUCHBIT,  state);

  if (doorOpen && !doorTouched) {
    let s = fclear(TRAP_DOOR, OPENBIT,  state);
    s     = fset  (TRAP_DOOR, TOUCHBIT, s);
    return {
      state: s,
      message: "The trap door crashes shut, and you hear someone barring it.",
    };
  }

  return { state, message: '' };
}

// ─── Internal helper exposed for testing ─────────────────────────────────────

/** Return the current parent of obj, or null. Thin wrapper over GameState lookup. */
function getLocation(obj: string, state: GameState): string | null {
  return state.objects.get(obj)?.parent ?? null;
}
