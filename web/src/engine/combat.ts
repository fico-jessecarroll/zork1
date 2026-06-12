/**
 * Generic melee combat resolution mirroring the ZIL VILLAIN-BLOW / HERO-BLOW
 * routines from 1actions.zil.
 *
 * The nine-element outcome tables are derived from DEF1/DEF2A/DEF2B/DEF3A/
 * DEF3B/DEF3C by taking the appropriate 9-word window for each attacker-
 * strength offset, exactly as the ZIL REST-pointer arithmetic does.
 */

import type { GameState } from './world';

// ─── Seedable RNG ─────────────────────────────────────────────────────────────

/**
 * Mulberry32 PRNG. Returns a factory seeded with the given 32-bit integer.
 * Each call to the returned function advances the state and returns a value
 * in [0, 1), matching the semantics expected by melee().
 */
export function makeRng(seed: number): () => number {
  let s = seed >>> 0;
  return (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Outcome types ────────────────────────────────────────────────────────────

export type MeleeOutcome =
  | 'missed'       // MISSED (1) — attacker misses
  | 'unconscious'  // UNCONSCIOUS (2) — defender knocked out
  | 'killed'       // KILLED (3) — defender dead
  | 'light-wound'  // LIGHT-WOUND (4) — minor hit, −1 strength
  | 'serious-wound'// SERIOUS-WOUND (5) — major hit, −2 strength
  | 'stagger'      // STAGGER (6) — defender loses next attack turn
  | 'lose-weapon'  // LOSE-WEAPON (7) — defender disarmed (upgraded from stagger)
  | 'hesitate'     // HESITATE (8) — attacker hesitates vs. unconscious defender
  | 'sitting-duck';// SITTING-DUCK (9) — unconscious defender dispatched

// ─── Outcome tables ───────────────────────────────────────────────────────────
//
// Each row is exactly 9 entries (indices 0–8, matching RANDOM(9)–1).
//
// ZIL source: DEF1-RES, DEF2-RES, DEF3-RES select the sub-table; then
//   <GET TBL <- <RANDOM 9> 1>>  picks the outcome.

type O = MeleeOutcome;
const M: O = 'missed';
const U: O = 'unconscious';
const K: O = 'killed';
const LW: O = 'light-wound';
const SW: O = 'serious-wound';
const ST: O = 'stagger';

// DEF=1 (very weak defender). ATT clamped to [1, 3].
// Source: windows into DEF1 starting at offset 0/1/2.
const DEF1_TABLES: ReadonlyArray<ReadonlyArray<O>> = [
  [M, M, M, M, ST, ST, U, U, K],   // ATT=1, offset 0
  [M, M, M, ST, ST, U, U, K, K],   // ATT=2, offset 1
  [M, M, ST, ST, U, U, K, K, K],   // ATT=3, offset 2
];

// DEF=2 (weak defender). ATT clamped to [1, 4].
// ATT=1 → DEF2A offset 0; ATT=2-4 → DEF2B offsets 0/1/2.
const DEF2_TABLES: ReadonlyArray<ReadonlyArray<O>> = [
  [M, M, M, M, M, ST, ST, LW, LW],       // ATT=1, DEF2A offset 0
  [M, M, M, ST, ST, LW, LW, LW, U],      // ATT=2, DEF2B offset 0
  [M, M, ST, ST, LW, LW, LW, U, K],      // ATT=3, DEF2B offset 1
  [M, ST, ST, LW, LW, LW, U, K, K],      // ATT=4, DEF2B offset 2
];

// DEF>2. ATT adjusted = clamp(ATT−DEF, −2, 2). Index = adjusted+2.
// DEF3-RES: DEF3A@0, DEF3A@1, DEF3B@0, DEF3B@1, DEF3C@0.
const DEF3_TABLES: ReadonlyArray<ReadonlyArray<O>> = [
  [M, M, M, M, M, ST, ST, LW, LW],       // adj=−2, DEF3A offset 0
  [M, M, M, M, ST, ST, LW, LW, SW],      // adj=−1, DEF3A offset 1
  [M, M, M, ST, ST, LW, LW, LW, SW],     // adj= 0, DEF3B offset 0
  [M, M, ST, ST, LW, LW, LW, SW, SW],    // adj=+1, DEF3B offset 1
  [M, ST, ST, LW, LW, LW, LW, SW, SW],   // adj=+2, DEF3C offset 0
];

// ─── State ────────────────────────────────────────────────────────────────────

export interface CombatState extends GameState {
  /** Seedable RNG: each call returns a value in [0, 1). */
  readonly rng: () => number;
}

// ─── Combatant ────────────────────────────────────────────────────────────────

export interface Combatant {
  /**
   * Current P?STRENGTH value.
   * >0 = fighting, 0 = just killed, <0 = unconscious.
   */
  readonly strength: number;
  /**
   * STAGGERED flag — set after rolling STAGGER; attacker skips their next turn.
   */
  readonly staggered: boolean;
  /**
   * True when this combatant is already unconscious (the ZIL out? parameter).
   * Converts table outcomes: STAGGER → HESITATE, anything else → SITTING-DUCK.
   */
  readonly unconscious: boolean;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

// Message strings taken from HERO-MELEE in 1actions.zil (first variant per
// outcome category). "[weapon]" and "[defender]" stand in for ZIL's F-WEP / F-DEF
// substitution, which callers can post-process if desired.
const MESSAGES: Readonly<Record<MeleeOutcome, string>> = {
  missed:         'Your [weapon] misses the [defender] by an inch.',
  unconscious:    'Your [weapon] crashes down, knocking the [defender] into dreamland.',
  killed:         'The fatal blow strikes the [defender] square in the heart: They die.',
  'light-wound':  'The [defender] is struck on the arm; blood begins to trickle down.',
  'serious-wound':'The [defender] receives a deep gash in their side.',
  stagger:        'The [defender] is staggered, and drops to their knees.',
  'lose-weapon':  "The [defender]'s weapon is knocked to the floor, leaving them unarmed.",
  hesitate:       'You hesitate, and the unconscious [defender] is spared for now.',
  'sitting-duck': 'You dispatch the unconscious [defender].',
};

// ─── Result ───────────────────────────────────────────────────────────────────

export interface MeleeResult {
  readonly outcome: MeleeOutcome;
  readonly message: string;
}

// ─── Core function ────────────────────────────────────────────────────────────

/**
 * Resolve one melee exchange using the ZIL outcome tables.
 *
 * Consumes exactly one RNG call for the d9 table roll, plus one additional
 * call if the rolled result is STAGGER and weapon is non-null (LOSE-WEAPON
 * upgrade check, 25% chance).  No further RNG calls are made.
 *
 * @param attacker  Attacking combatant (P?STRENGTH, STAGGERED, out? flags).
 * @param defender  Defending combatant.
 * @param weapon    Defender's current weapon id, or null if unarmed.
 *                  A non-null weapon enables the LOSE-WEAPON (disarm) outcome.
 * @param state     Game state supplying the seedable RNG.
 */
export function melee(
  attacker: Combatant,
  defender: Combatant,
  weapon: string | null,
  state: CombatState,
): MeleeResult {
  const { rng } = state;

  // Staggered attacker: skips their turn and clears the flag conceptually.
  // (Caller is responsible for clearing the STAGGERED flag in actual game state.)
  if (attacker.staggered) {
    return {
      outcome: 'missed',
      message: 'The attacker is still recovering from the last blow.',
    };
  }

  const att = attacker.strength;
  const def = defender.strength;

  // Defender already out of the fight (dead or unconscious with strength ≤ 0).
  if (def <= 0) {
    return { outcome: 'killed', message: MESSAGES.killed };
  }

  // Select the 9-element outcome sub-table.
  let table: ReadonlyArray<O>;
  if (def === 1) {
    const capped = Math.min(Math.max(att, 1), 3);
    table = DEF1_TABLES[capped - 1];
  } else if (def === 2) {
    const capped = Math.min(Math.max(att, 1), 4);
    table = DEF2_TABLES[capped - 1];
  } else {
    // DEF > 2: ATT adjusted relative to DEF, clamped to [−2, +2].
    const adj = Math.min(Math.max(att - def, -2), 2);
    table = DEF3_TABLES[adj + 2];
  }

  // Roll d9 — maps to table index 0–8 (mirrors ZIL: GET TBL (RANDOM(9)−1)).
  const roll = Math.floor(rng() * 9);
  let outcome: O = table[roll];

  // Unconscious defender (out? = true): modify outcome before disarm check.
  if (defender.unconscious) {
    // STAGGER → HESITATE; everything else → SITTING-DUCK (even a "miss").
    outcome = outcome === 'stagger' ? 'hesitate' : 'sitting-duck';
  }

  // STAGGER → LOSE-WEAPON upgrade: 25% chance when defender holds a weapon.
  // (Only reachable when defender is not unconscious, since unconscious check
  // already converted STAGGER to HESITATE above.)
  if (outcome === 'stagger' && weapon !== null && rng() < 0.25) {
    outcome = 'lose-weapon';
  }

  return { outcome, message: MESSAGES[outcome] };
}
