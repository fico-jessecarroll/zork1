/**
 * Tests for combat.ts — melee resolution.
 *
 * RNG strategy: the melee() function consumes at most two RNG calls per
 * invocation:
 *   1. d9 table roll → outcome category (always consumed)
 *   2. LOSE-WEAPON upgrade check → rng() < 0.25  (only when roll = STAGGER
 *      and weapon is non-null)
 *
 * Each test supplies a deterministic RNG that returns a fixed sequence so
 * we can target specific table rows and disarm-check outcomes.
 */

import { melee, makeRng, Combatant, CombatState, MeleeOutcome } from './combat';
import { ZObject, RLANDBIT } from './world';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeObj(id: string, parent: string | null, flags: string[] = []): ZObject {
  return { id, parent, flags: new Set(flags) };
}

/**
 * Minimal CombatState wrapping a controlled RNG sequence.
 * melee() never inspects objects, player, here, etc., so only rng matters.
 */
function makeState(rngValues: number[]): CombatState {
  let i = 0;
  const objects = new Map<string, ZObject>([
    ['global-objects', makeObj('global-objects', null)],
    ['room', makeObj('room', null, [RLANDBIT])],
    ['player', makeObj('player', 'room')],
  ]);
  return {
    objects,
    player: 'player',
    here: 'room',
    globalObjects: 'global-objects',
    alwaysLit: false,
    rng: () => rngValues[i++ % rngValues.length],
  };
}

/** Fighter with sensible defaults for most tests. */
function fighter(overrides: Partial<Combatant> = {}): Combatant {
  return {
    strength: 4,
    staggered: false,
    unconscious: false,
    ...overrides,
  };
}

/** Pick a roll value that maps to a given 0-based table index. */
function rollFor(index: number): number {
  // Math.floor(v * 9) === index  ↔  index/9 ≤ v < (index+1)/9
  return (index + 0.5) / 9; // midpoint of the bucket
}

// ─── makeRng ─────────────────────────────────────────────────────────────────

describe('makeRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 200; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = makeRng(123);
    const b = makeRng(123);
    for (let i = 0; i < 50; i++) {
      expect(a()).toBe(b());
    }
  });

  it('produces different sequences for different seeds', () => {
    const a = makeRng(1);
    const b = makeRng(2);
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });
});

// ─── Staggered attacker ───────────────────────────────────────────────────────

describe('melee — staggered attacker', () => {
  it('returns missed and does not advance RNG', () => {
    let calls = 0;
    const state = makeState([]);
    const trackingState = { ...state, rng: () => { calls++; return 0; } };
    const result = melee(fighter({ staggered: true }), fighter(), 'sword', trackingState);
    expect(result.outcome).toBe<MeleeOutcome>('missed');
    expect(calls).toBe(0);
  });
});

// ─── Defender dead/unconscious (strength ≤ 0) ────────────────────────────────

describe('melee — dead defender', () => {
  it('returns killed when defender strength is 0', () => {
    const result = melee(fighter(), fighter({ strength: 0 }), null, makeState([0]));
    expect(result.outcome).toBe<MeleeOutcome>('killed');
  });

  it('returns killed when defender strength is negative', () => {
    const result = melee(fighter(), fighter({ strength: -3 }), null, makeState([0]));
    expect(result.outcome).toBe<MeleeOutcome>('killed');
  });
});

// ─── DEF=1 table (very weak defender) ────────────────────────────────────────

describe('melee — DEF=1', () => {
  // DEF1_TABLES[0] (ATT=1): [M, M, M, M, ST, ST, U, U, K]
  it('returns missed (ATT=1, roll=0)', () => {
    const r = melee(fighter({ strength: 1 }), fighter({ strength: 1 }), null,
      makeState([rollFor(0)]));
    expect(r.outcome).toBe<MeleeOutcome>('missed');
  });

  it('returns stagger (ATT=1, roll=4)', () => {
    // Index 4 = ST in DEF1_TABLES[0]; weapon=null so no disarm upgrade
    const r = melee(fighter({ strength: 1 }), fighter({ strength: 1 }), null,
      makeState([rollFor(4)]));
    expect(r.outcome).toBe<MeleeOutcome>('stagger');
  });

  it('returns unconscious (ATT=1, roll=6)', () => {
    const r = melee(fighter({ strength: 1 }), fighter({ strength: 1 }), null,
      makeState([rollFor(6)]));
    expect(r.outcome).toBe<MeleeOutcome>('unconscious');
  });

  // DEF1_TABLES[2] (ATT=3): [M, M, ST, ST, U, U, K, K, K]
  it('returns killed (ATT=3, roll=6)', () => {
    const r = melee(fighter({ strength: 3 }), fighter({ strength: 1 }), null,
      makeState([rollFor(6)]));
    expect(r.outcome).toBe<MeleeOutcome>('killed');
  });

  it('caps ATT above 3 to the ATT=3 table', () => {
    // ATT=99 should behave the same as ATT=3
    const uncapped = melee(fighter({ strength: 3 }), fighter({ strength: 1 }), null,
      makeState([rollFor(6)]));
    const capped = melee(fighter({ strength: 99 }), fighter({ strength: 1 }), null,
      makeState([rollFor(6)]));
    expect(capped.outcome).toBe(uncapped.outcome);
  });
});

// ─── DEF=2 table (weak defender) ─────────────────────────────────────────────

describe('melee — DEF=2', () => {
  // DEF2_TABLES[0] (ATT=1): [M, M, M, M, M, ST, ST, LW, LW]
  it('returns light-wound (ATT=1, roll=7)', () => {
    const r = melee(fighter({ strength: 1 }), fighter({ strength: 2 }), null,
      makeState([rollFor(7)]));
    expect(r.outcome).toBe<MeleeOutcome>('light-wound');
  });

  // DEF2_TABLES[3] (ATT=4): [M, ST, ST, LW, LW, LW, U, K, K]
  it('returns killed (ATT=4, roll=7)', () => {
    const r = melee(fighter({ strength: 4 }), fighter({ strength: 2 }), null,
      makeState([rollFor(7)]));
    expect(r.outcome).toBe<MeleeOutcome>('killed');
  });
});

// ─── DEF>2 table ─────────────────────────────────────────────────────────────

describe('melee — DEF>2', () => {
  // All using DEF=4, ATT=4 → adj=0 → DEF3_TABLES[2] = [M,M,M,ST,ST,LW,LW,LW,SW]

  it('returns missed (adj=0, roll=0)', () => {
    const r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), null,
      makeState([rollFor(0)]));
    expect(r.outcome).toBe<MeleeOutcome>('missed');
  });

  it('returns stagger (adj=0, roll=3)', () => {
    // Index 3 = ST; second rng value ≥ 0.25 → no upgrade
    const r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), 'axe',
      makeState([rollFor(3), 0.5]));
    expect(r.outcome).toBe<MeleeOutcome>('stagger');
  });

  it('returns light-wound (adj=0, roll=5)', () => {
    const r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), null,
      makeState([rollFor(5)]));
    expect(r.outcome).toBe<MeleeOutcome>('light-wound');
  });

  it('returns serious-wound (adj=0, roll=8)', () => {
    const r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), null,
      makeState([rollFor(8)]));
    expect(r.outcome).toBe<MeleeOutcome>('serious-wound');
  });

  it('adj=-2 uses most-defender-favoured table (mostly misses)', () => {
    // DEF=6, ATT=2 → adj=-4 clamped to -2 → DEF3_TABLES[0] = [M,M,M,M,M,ST,ST,LW,LW]
    // Any roll 0-4 → missed
    const r = melee(fighter({ strength: 2 }), fighter({ strength: 6 }), null,
      makeState([rollFor(0)]));
    expect(r.outcome).toBe<MeleeOutcome>('missed');
  });

  it('adj=+2 uses most-attacker-favoured table (more wounds)', () => {
    // DEF=3, ATT=9 → adj=6 clamped to 2 → DEF3_TABLES[4] = [M,ST,ST,LW,LW,LW,LW,SW,SW]
    // Roll 7 → SW
    const r = melee(fighter({ strength: 9 }), fighter({ strength: 3 }), null,
      makeState([rollFor(7)]));
    expect(r.outcome).toBe<MeleeOutcome>('serious-wound');
  });
});

// ─── LOSE-WEAPON (disarm) ────────────────────────────────────────────────────

describe('melee — lose-weapon (disarm)', () => {
  // DEF=4, ATT=4, adj=0, roll=3 → ST; weapon present; rng()=0.1 < 0.25 → upgrade
  it('upgrades stagger to lose-weapon when weapon present and rng < 0.25', () => {
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4 }),
      'sword',
      makeState([rollFor(3), 0.1]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('lose-weapon');
  });

  it('keeps stagger when weapon present but rng ≥ 0.25', () => {
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4 }),
      'sword',
      makeState([rollFor(3), 0.25]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('stagger');
  });

  it('keeps stagger when weapon is null (nothing to disarm)', () => {
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4 }),
      null,
      makeState([rollFor(3), 0.0]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('stagger');
  });
});

// ─── Unconscious defender (out? = true) ──────────────────────────────────────

describe('melee — unconscious defender', () => {
  it('converts stagger to hesitate', () => {
    // adj=0, roll=3 → ST → but defender.unconscious=true → hesitate
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4, unconscious: true }),
      'sword',
      makeState([rollFor(3)]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('hesitate');
  });

  it('converts missed to sitting-duck', () => {
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4, unconscious: true }),
      null,
      makeState([rollFor(0)]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('sitting-duck');
  });

  it('converts light-wound to sitting-duck', () => {
    // adj=0, roll=5 → LW → sitting-duck
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4, unconscious: true }),
      null,
      makeState([rollFor(5)]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('sitting-duck');
  });

  it('does not apply lose-weapon upgrade when defender is unconscious', () => {
    // Roll → ST → converted to hesitate before lose-weapon check; no disarm possible
    const r = melee(
      fighter({ strength: 4 }),
      fighter({ strength: 4, unconscious: true }),
      'sword',
      // Only one rng() call needed (no disarm check after hesitate conversion)
      makeState([rollFor(3)]),
    );
    expect(r.outcome).toBe<MeleeOutcome>('hesitate');
  });
});

// ─── Result shape ─────────────────────────────────────────────────────────────

describe('melee — result', () => {
  it('always includes a non-empty message', () => {
    const outcomes: MeleeOutcome[] = [
      'missed', 'unconscious', 'killed', 'light-wound', 'serious-wound',
      'stagger', 'lose-weapon', 'hesitate', 'sitting-duck',
    ];
    // We only care that each message is a non-empty string; exact wording may evolve.
    for (const expected of outcomes) {
      let r: ReturnType<typeof melee>;
      switch (expected) {
        case 'missed':
          r = melee(fighter(), fighter(), null, makeState([rollFor(0)])); break;
        case 'unconscious':
          r = melee(fighter({ strength: 1 }), fighter({ strength: 1 }), null,
            makeState([rollFor(6)])); break;
        case 'killed':
          r = melee(fighter({ strength: 3 }), fighter({ strength: 1 }), null,
            makeState([rollFor(6)])); break;
        case 'light-wound':
          r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), null,
            makeState([rollFor(5)])); break;
        case 'serious-wound':
          r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), null,
            makeState([rollFor(8)])); break;
        case 'stagger':
          r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), null,
            makeState([rollFor(3)])); break;
        case 'lose-weapon':
          r = melee(fighter({ strength: 4 }), fighter({ strength: 4 }), 'sword',
            makeState([rollFor(3), 0.1])); break;
        case 'hesitate':
          r = melee(fighter({ strength: 4 }),
            fighter({ strength: 4, unconscious: true }), 'sword',
            makeState([rollFor(3)])); break;
        case 'sitting-duck':
          r = melee(fighter({ strength: 4 }),
            fighter({ strength: 4, unconscious: true }), null,
            makeState([rollFor(0)])); break;
      }
      expect(r!.outcome).toBe(expected);
      expect(typeof r!.message).toBe('string');
      expect(r!.message.length).toBeGreaterThan(0);
    }
  });
});
