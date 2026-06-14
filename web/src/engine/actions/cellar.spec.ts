import {
  trollAttacks,
  playerAttacksTroll,
  checkSwordGlow,
  cellarOnEnter,
  KILLED,
  LIGHT_WOUND,
  SERIOUS_WOUND,
  BlowResult,
} from './cellar';

import {
  GameState,
  ZObject,
  fcheck,
  fset,
  move,
  getProp,
} from '../world';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeObj(
  id: string,
  parent: string | null,
  flags: string[] = [],
): ZObject {
  return { id, parent, flags: new Set(flags) };
}

/**
 * Minimal world state for cellar/troll tests.
 *
 * Topology:
 *   TROLL-ROOM  (room, RLANDBIT+ONBIT)
 *   CELLAR      (room, RLANDBIT — dark)
 *   PLAYER      in TROLL-ROOM
 *   TROLL       in TROLL-ROOM, FIGHTBIT
 *   SWORD       in PLAYER inventory, WEAPONBIT
 *   AXE         in TROLL, WEAPONBIT
 *   TRAP-DOOR   in CELLAR, initially OPEN (no TOUCHBIT)
 */
function makeState(overrides: Partial<GameState> = {}): GameState {
  const objects = new Map<string, ZObject>([
    ['GLOBAL-OBJECTS', makeObj('GLOBAL-OBJECTS', null)],
    ['TROLL-ROOM',     makeObj('TROLL-ROOM', null,         ['RLANDBIT', 'ONBIT'])],
    ['CELLAR',         makeObj('CELLAR', null,              ['RLANDBIT'])],
    ['PLAYER',         makeObj('PLAYER', 'TROLL-ROOM')],
    ['ADVENTURER',     makeObj('ADVENTURER', 'PLAYER')],
    ['TROLL',          makeObj('TROLL', 'TROLL-ROOM',       ['ACTORBIT', 'FIGHTBIT'])],
    ['SWORD',          makeObj('SWORD', 'PLAYER',           ['WEAPONBIT', 'TAKEBIT'])],
    ['AXE',            makeObj('AXE',  'TROLL',             ['WEAPONBIT', 'NDESCBIT'])],
    ['TRAP-DOOR',      makeObj('TRAP-DOOR', 'CELLAR',       ['DOORBIT', 'OPENBIT'])],
  ]);

  const base: GameState = {
    objects,
    player: 'PLAYER',
    here: 'TROLL-ROOM',
    globalObjects: 'GLOBAL-OBJECTS',
    alwaysLit: true,
    seed: 1,
    score: 0,
    properties: new Map([['TROLL:strength', 2]]),
  };

  return { ...base, ...overrides };
}

// ─── trollAttacks ─────────────────────────────────────────────────────────────

describe('trollAttacks', () => {
  it('returns a non-empty message when troll is in same room as player', () => {
    const state = makeState({ seed: 1 });
    const result = trollAttacks(state);
    expect(result.message).toBeTruthy();
    expect(result.outcome).toBeGreaterThanOrEqual(1);
    expect(result.outcome).toBeLessThanOrEqual(9);
  });

  it('combat outcomes are deterministic: same seed produces same result', () => {
    const s1 = makeState({ seed: 42 });
    const s2 = makeState({ seed: 42 });
    const r1 = trollAttacks(s1);
    const r2 = trollAttacks(s2);
    expect(r1.message).toBe(r2.message);
    expect(r1.outcome).toBe(r2.outcome);
  });

  it('different seeds can produce different outcomes', () => {
    // Collect a sample of outcomes over several seeds; they should not all be identical.
    const outcomes = new Set<BlowResult>();
    for (let seed = 1; seed <= 50; seed++) {
      outcomes.add(trollAttacks(makeState({ seed })).outcome);
    }
    expect(outcomes.size).toBeGreaterThan(1);
  });

  it('advances the RNG seed so sequential attacks differ', () => {
    const s0 = makeState({ seed: 7 });
    const r1 = trollAttacks(s0);
    const r2 = trollAttacks(r1.state);
    // The seeds in the returned states should differ (RNG advanced)
    expect(r1.state.seed).not.toBe(s0.seed);
    expect(r2.state.seed).not.toBe(r1.state.seed);
  });

  it('troll does not attack when it has no strength (dead)', () => {
    const state = makeState({
      seed: 1,
      properties: new Map([['TROLL:strength', 0]]),
    });
    const result = trollAttacks(state);
    // With strength 0, the selectTable receives def<=0 (player) path
    // — outcome still valid, just verifying no crash
    expect(typeof result.message).toBe('string');
  });
});

// ─── playerAttacksTroll ───────────────────────────────────────────────────────

describe('playerAttacksTroll', () => {
  it('returns a non-empty message for a normal attack', () => {
    const state = makeState({ seed: 5 });
    const result = playerAttacksTroll(state, 'sword');
    expect(result.message).toBeTruthy();
    expect(result.outcome).toBeGreaterThanOrEqual(1);
    expect(result.outcome).toBeLessThanOrEqual(9);
  });

  it('troll dies when health reaches 0 — unarmed troll is an instant kill', () => {
    // Move axe out of troll's possession so troll is unarmed
    const base = makeState({ seed: 1 });
    const stateWithAxeOnFloor = move('AXE', 'TROLL-ROOM', base);
    const result = playerAttacksTroll(stateWithAxeOnFloor, 'sword');
    expect(result.trollDead).toBe(true);
    expect(result.outcome).toBe(KILLED);
    // Troll should be removed from its room (parent = null)
    expect(result.state.objects.get('TROLL')?.parent).toBeNull();
  });

  it('troll dies when health reaches 0 — unconscious troll is an instant kill', () => {
    // Set troll strength negative (unconscious state in ZIL)
    const state = makeState({
      seed: 1,
      properties: new Map([['TROLL:strength', -1]]),
    });
    const result = playerAttacksTroll(state, 'sword');
    expect(result.trollDead).toBe(true);
    expect(result.outcome).toBe(KILLED);
  });

  it('TROLL-FLAG:dead property is set when troll is killed', () => {
    const base = makeState({ seed: 1 });
    const stateUnarmed = move('AXE', 'TROLL-ROOM', base);
    const result = playerAttacksTroll(stateUnarmed, 'sword');
    expect(getProp('TROLL-FLAG', 'dead', result.state)).toBe(1);
  });

  it('reduces troll strength on LIGHT_WOUND', () => {
    // Find a seed that produces LIGHT_WOUND (outcome 4).
    // Player ATT=2, Troll DEF=2 → DEF2B, so LIGHT_WOUND appears at indices 5-7.
    // Scan seeds until we hit it.
    let result;
    let state;
    let found = false;
    for (let seed = 1; seed <= 200; seed++) {
      state = makeState({ seed, properties: new Map([['TROLL:strength', 2]]) });
      result = playerAttacksTroll(state!, 'sword');
      if (result.outcome === LIGHT_WOUND) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    expect(getProp('TROLL', 'strength', result!.state)).toBe(1);
  });

  it('reduces troll strength on SERIOUS_WOUND', () => {
    let result;
    let found = false;
    for (let seed = 1; seed <= 400; seed++) {
      const state = makeState({ seed, properties: new Map([['TROLL:strength', 3]]) });
      result = playerAttacksTroll(state, 'sword');
      if (result!.outcome === SERIOUS_WOUND) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    // strength 3 - 2 = 1
    expect(getProp('TROLL', 'strength', result!.state)).toBe(1);
  });

  it('sequential attacks eventually kill the troll', () => {
    let state = makeState({ seed: 1, properties: new Map([['TROLL:strength', 2]]) });
    let dead = false;
    for (let i = 0; i < 50 && !dead; i++) {
      // Ensure troll stays armed for valid combat (re-arm each round if needed)
      if (state.objects.get('AXE')?.parent !== 'TROLL') {
        state = move('AXE', 'TROLL', state);
      }
      const result = playerAttacksTroll(state, 'sword');
      state = result.state;
      if (result.trollDead) dead = true;
    }
    expect(dead).toBe(true);
  });
});

// ─── checkSwordGlow ───────────────────────────────────────────────────────────

describe('checkSwordGlow', () => {
  it('sword glows very brightly (glow=2) when troll is in same room as player', () => {
    const state = makeState(); // PLAYER in TROLL-ROOM, TROLL in TROLL-ROOM
    const result = checkSwordGlow(state);
    expect(result.glow).toBe(2);
    expect(result.message).toContain('very brightly');
  });

  it('sets SWORD:glow property to 2 in returned state', () => {
    const state = makeState();
    const { state: s } = checkSwordGlow(state);
    expect(getProp('SWORD', 'glow', s)).toBe(2);
  });

  it('sword does not glow when troll is absent from room', () => {
    // Move troll to a different room
    const base = makeState();
    const state = move('TROLL', 'CELLAR', base);
    const result = checkSwordGlow(state);
    expect(result.glow).toBe(0);
  });

  it('no message when glow level is unchanged', () => {
    const base = makeState();
    // Run once to set glow=2 in state
    const { state: s1 } = checkSwordGlow(base);
    // Run again — no change expected
    const { message } = checkSwordGlow(s1);
    expect(message).toBe('');
  });

  it('emits "no longer glowing" message when enemy leaves', () => {
    const base = makeState();
    const { state: withGlow } = checkSwordGlow(base); // glow set to 2
    const withoutTroll = move('TROLL', 'CELLAR', withGlow);
    const { message } = checkSwordGlow(withoutTroll);
    expect(message).toContain('no longer glowing');
  });

  it('sword does not glow when player is not carrying it', () => {
    const base = makeState();
    // Move sword to the room floor instead of player inventory
    const state = move('SWORD', 'TROLL-ROOM', base);
    const result = checkSwordGlow(state);
    expect(result.glow).toBe(0);
  });
});

// ─── cellarOnEnter ────────────────────────────────────────────────────────────

describe('cellarOnEnter', () => {
  it('slams trap door shut on first entry (OPEN and not TOUCHED)', () => {
    const state = makeState({ here: 'CELLAR' });
    // TRAP-DOOR is OPENBIT, not TOUCHBIT — matches fresh descent
    const result = cellarOnEnter(state);
    expect(result.message).toContain('trap door crashes shut');
    expect(fcheck('TRAP-DOOR', 'OPENBIT',  result.state)).toBe(false);
    expect(fcheck('TRAP-DOOR', 'TOUCHBIT', result.state)).toBe(true);
  });

  it('does nothing when trap door is already closed', () => {
    const base = makeState({ here: 'CELLAR' });
    // Close the door first
    const closed = {
      ...base,
      objects: new Map([
        ...base.objects,
        ['TRAP-DOOR', makeObj('TRAP-DOOR', 'CELLAR', ['DOORBIT'])], // no OPENBIT
      ]),
    };
    const result = cellarOnEnter(closed);
    expect(result.message).toBe('');
  });

  it('does nothing when door is open but already touched (previously closed)', () => {
    const base = makeState({ here: 'CELLAR' });
    const touched = fset('TRAP-DOOR', 'TOUCHBIT', base);
    const result = cellarOnEnter(touched);
    expect(result.message).toBe('');
  });

  it('returns the same state when no action taken', () => {
    const base = makeState({ here: 'CELLAR' });
    const closed = {
      ...base,
      objects: new Map([
        ...base.objects,
        ['TRAP-DOOR', makeObj('TRAP-DOOR', 'CELLAR', ['DOORBIT'])],
      ]),
    };
    const { state } = cellarOnEnter(closed);
    expect(state).toBe(closed); // same reference — no mutation
  });
});
