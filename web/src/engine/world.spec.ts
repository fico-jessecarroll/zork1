import {
  GameState,
  ZObject,
  move,
  getLocation,
  getContents,
  isIn,
  fset,
  fclear,
  fcheck,
  isLit,
  isAccessible,
  rngInt,
  getProp,
  setProp,
  remove,
  ONBIT,
  LIGHTBIT,
  OPENBIT,
  TRANSBIT,
  INVISIBLE,
  RLANDBIT,
} from './world';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeObj(
  id: string,
  parent: string | null,
  flags: string[] = []
): ZObject {
  return { id, parent, flags: new Set(flags) };
}

/**
 * Build a minimal GameState suitable for most tests.
 *
 * Topology (initial):
 *   GLOBAL-OBJECTS  (root container for always-accessible objects)
 *   west-of-house   (outdoor room, RLANDBIT + ONBIT)
 *   cellar          (dark room, RLANDBIT only)
 *   player          (in west-of-house)
 *   lantern         (in player inventory, LIGHTBIT, initially off)
 *   torch           (in cellar, LIGHTBIT + ONBIT)
 *   mailbox         (in west-of-house, OPENBIT)
 *   leaflet         (in mailbox)
 *   trophy-case     (in cellar, closed — no OPENBIT)
 *   egg             (in trophy-case)
 *   global-wall     (in GLOBAL-OBJECTS)
 */
function makeState(overrides: Partial<GameState> = {}): GameState {
  const objects = new Map<string, ZObject>([
    ['global-objects', makeObj('global-objects', null)],
    ['west-of-house', makeObj('west-of-house', null, [RLANDBIT, ONBIT])],
    ['cellar', makeObj('cellar', null, [RLANDBIT])],
    ['player', makeObj('player', 'west-of-house')],
    ['lantern', makeObj('lantern', 'player', [LIGHTBIT])],
    ['torch', makeObj('torch', 'cellar', [LIGHTBIT, ONBIT])],
    ['mailbox', makeObj('mailbox', 'west-of-house', [OPENBIT])],
    ['leaflet', makeObj('leaflet', 'mailbox')],
    ['trophy-case', makeObj('trophy-case', 'cellar')], // closed
    ['egg', makeObj('egg', 'trophy-case')],
    ['global-wall', makeObj('global-wall', 'global-objects')],
  ]);

  return {
    objects,
    player: 'player',
    here: 'west-of-house',
    globalObjects: 'global-objects',
    alwaysLit: false,
    seed: 0,
    score: 0,
    properties: new Map(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getLocation
// ---------------------------------------------------------------------------

describe('getLocation', () => {
  it('returns direct parent', () => {
    const state = makeState();
    expect(getLocation('player', state)).toBe('west-of-house');
    expect(getLocation('lantern', state)).toBe('player');
    expect(getLocation('leaflet', state)).toBe('mailbox');
  });

  it('returns null for a root object', () => {
    const state = makeState();
    expect(getLocation('global-objects', state)).toBeNull();
  });

  it('throws for unknown object id', () => {
    const state = makeState();
    expect(() => getLocation('no-such-thing', state)).toThrow('Unknown object');
  });
});

// ---------------------------------------------------------------------------
// move
// ---------------------------------------------------------------------------

describe('move', () => {
  it('relocates an object to a new container', () => {
    const s0 = makeState();
    const s1 = move('lantern', 'cellar', s0);
    expect(getLocation('lantern', s1)).toBe('cellar');
  });

  it('does not mutate the original state', () => {
    const s0 = makeState();
    move('lantern', 'cellar', s0);
    expect(getLocation('lantern', s0)).toBe('player');
  });

  it('moves an item between two arbitrary containers', () => {
    const s0 = makeState();
    const s1 = move('leaflet', 'player', s0);
    expect(getLocation('leaflet', s1)).toBe('player');
    expect(getContents('mailbox', s1)).not.toContain('leaflet');
  });

  it('can move player to a new room', () => {
    const s0 = makeState();
    const s1 = move('player', 'cellar', s0);
    expect(getLocation('player', s1)).toBe('cellar');
  });
});

// ---------------------------------------------------------------------------
// getContents
// ---------------------------------------------------------------------------

describe('getContents', () => {
  it('returns direct children', () => {
    const state = makeState();
    expect(getContents('player', state)).toEqual(['lantern']);
    expect(getContents('mailbox', state)).toEqual(['leaflet']);
  });

  it('returns empty array for an empty container', () => {
    const s0 = makeState();
    const s1 = move('egg', 'cellar', s0); // move egg out of trophy-case
    expect(getContents('trophy-case', s1)).toEqual([]);
  });

  it('does not return grandchildren', () => {
    const state = makeState();
    const roomContents = getContents('west-of-house', state);
    expect(roomContents).toContain('player');
    expect(roomContents).toContain('mailbox');
    expect(roomContents).not.toContain('lantern');
    expect(roomContents).not.toContain('leaflet');
  });
});

// ---------------------------------------------------------------------------
// isIn
// ---------------------------------------------------------------------------

describe('isIn', () => {
  it('returns true for a direct child', () => {
    const state = makeState();
    expect(isIn('lantern', 'player', state)).toBe(true);
    expect(isIn('leaflet', 'mailbox', state)).toBe(true);
  });

  it('returns true for nested containment chains', () => {
    const state = makeState();
    // lantern → player → west-of-house
    expect(isIn('lantern', 'west-of-house', state)).toBe(true);
    // leaflet → mailbox → west-of-house
    expect(isIn('leaflet', 'west-of-house', state)).toBe(true);
  });

  it('returns false when not contained', () => {
    const state = makeState();
    expect(isIn('lantern', 'cellar', state)).toBe(false);
    expect(isIn('torch', 'player', state)).toBe(false);
  });

  it('returns false for an object at the same level', () => {
    const state = makeState();
    expect(isIn('mailbox', 'player', state)).toBe(false);
  });

  it('updates correctly after move', () => {
    const s0 = makeState();
    expect(isIn('lantern', 'cellar', s0)).toBe(false);
    const s1 = move('lantern', 'cellar', s0);
    expect(isIn('lantern', 'cellar', s1)).toBe(true);
    expect(isIn('lantern', 'player', s1)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fset / fclear / fcheck
// ---------------------------------------------------------------------------

describe('fset / fclear / fcheck', () => {
  it('fcheck returns false for an absent flag', () => {
    const state = makeState();
    expect(fcheck('lantern', ONBIT, state)).toBe(false);
  });

  it('fset adds a flag and returns new state', () => {
    const s0 = makeState();
    const s1 = fset('lantern', ONBIT, s0);
    expect(fcheck('lantern', ONBIT, s1)).toBe(true);
    expect(fcheck('lantern', ONBIT, s0)).toBe(false); // original unchanged
  });

  it('fclear removes a flag and returns new state', () => {
    const s0 = makeState();
    const s1 = fclear('torch', ONBIT, s0);
    expect(fcheck('torch', ONBIT, s1)).toBe(false);
    expect(fcheck('torch', ONBIT, s0)).toBe(true); // original unchanged
  });

  it('fclear on absent flag is a no-op', () => {
    const s0 = makeState();
    const s1 = fclear('lantern', ONBIT, s0);
    expect(fcheck('lantern', ONBIT, s1)).toBe(false);
  });

  it('fset is idempotent', () => {
    const s0 = makeState();
    const s1 = fset('lantern', ONBIT, s0);
    const s2 = fset('lantern', ONBIT, s1);
    expect(fcheck('lantern', ONBIT, s2)).toBe(true);
  });

  it('preserves existing flags when setting a new one', () => {
    const s0 = makeState();
    const s1 = fset('lantern', ONBIT, s0);
    expect(fcheck('lantern', LIGHTBIT, s1)).toBe(true);
  });

  it('preserves other flags when clearing one', () => {
    const s0 = makeState();
    const s1 = fclear('torch', ONBIT, s0);
    expect(fcheck('torch', LIGHTBIT, s1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isLit — darkness detection
// ---------------------------------------------------------------------------

describe('isLit', () => {
  it('outdoor room with ONBIT is lit', () => {
    const state = makeState();
    expect(isLit('west-of-house', state)).toBe(true);
  });

  it('underground room with no light source is dark', () => {
    const s0 = makeState();
    // move torch out of cellar so it is not a light source there
    const s1 = { ...s0, here: 'cellar' };
    const s2 = move('torch', 'west-of-house', s1);
    expect(isLit('cellar', s2)).toBe(false);
  });

  it('dark room becomes lit when torch is present in the room', () => {
    const state = makeState();
    // torch starts in cellar with LIGHTBIT+ONBIT → cellar is lit
    expect(isLit('cellar', state)).toBe(true);
  });

  it('dark room becomes lit when player carries a lit lantern', () => {
    const s0 = makeState();
    const s1 = fset('lantern', ONBIT, s0); // light the lantern
    const s2 = { ...s1, here: 'cellar' };  // player moves to cellar
    expect(isLit('cellar', s2)).toBe(true);
  });

  it('unlit lantern does not illuminate a dark room', () => {
    const s0 = makeState();
    // lantern has LIGHTBIT but no ONBIT — not lit
    const s1 = move('torch', 'west-of-house', s0); // remove only lit source
    const s2 = { ...s1, here: 'cellar' };
    expect(isLit('cellar', s2)).toBe(false);
  });

  it('extinguishing the torch makes the room dark', () => {
    const s0 = makeState();
    const s1 = fclear('torch', ONBIT, s0); // extinguish torch
    expect(isLit('cellar', s1)).toBe(false);
  });

  it('alwaysLit override illuminates every room', () => {
    const s0 = makeState({ alwaysLit: true });
    // cellar has no light source and no ONBIT, but alwaysLit overrides
    expect(isLit('cellar', s0)).toBe(true);
  });

  it('lit lantern inside an open container in the room provides light', () => {
    const s0 = makeState();
    // move lit lantern into the open mailbox which is in west-of-house
    const s1 = fset('lantern', ONBIT, s0);
    const s2 = move('lantern', 'mailbox', s1); // mailbox is OPENBIT
    const s3 = { ...s2, here: 'cellar' };
    // lantern is not in cellar, so cellar needs its own light
    const s4 = move('torch', 'west-of-house', s3); // remove torch from cellar
    expect(isLit('cellar', s4)).toBe(false);
  });

  it('lit lantern in transparent closed container in room provides light', () => {
    const s0 = makeState();
    // Add a glass case (TRANSBIT, no OPENBIT) in cellar
    const glassCaseObjects = new Map(s0.objects);
    glassCaseObjects.set('glass-case', makeObj('glass-case', 'cellar', [TRANSBIT]));
    const litLantern = makeObj('lantern', 'glass-case', [LIGHTBIT, ONBIT]);
    glassCaseObjects.set('lantern', litLantern);
    const torch = makeObj('torch', 'west-of-house', [LIGHTBIT, ONBIT]);
    glassCaseObjects.set('torch', torch); // remove torch from cellar
    const s1: GameState = { ...s0, objects: glassCaseObjects };
    expect(isLit('cellar', s1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isAccessible
// ---------------------------------------------------------------------------

describe('isAccessible', () => {
  it('object in GLOBAL-OBJECTS is always accessible', () => {
    const state = makeState();
    expect(isAccessible('global-wall', state)).toBe(true);
  });

  it('object directly in current room is accessible', () => {
    const state = makeState();
    expect(isAccessible('mailbox', state)).toBe(true);
  });

  it('object in player inventory is accessible', () => {
    const state = makeState();
    expect(isAccessible('lantern', state)).toBe(true);
  });

  it('object inside open container in room is accessible', () => {
    const state = makeState();
    // leaflet is in mailbox (OPENBIT), which is in west-of-house
    expect(isAccessible('leaflet', state)).toBe(true);
  });

  it('object inside closed container in room is not accessible', () => {
    const state = makeState();
    // egg is in trophy-case (no OPENBIT), in cellar (different room)
    expect(isAccessible('egg', state)).toBe(false);
  });

  it('object in a different room is not accessible', () => {
    const state = makeState();
    expect(isAccessible('torch', state)).toBe(false);
  });

  it('INVISIBLE object is never accessible', () => {
    const s0 = makeState();
    const s1 = fset('lantern', INVISIBLE, s0);
    expect(isAccessible('lantern', s1)).toBe(false);
  });

  it('object with null parent is not accessible', () => {
    const state = makeState();
    expect(isAccessible('global-objects', state)).toBe(false);
    expect(isAccessible('west-of-house', state)).toBe(false);
  });

  it('object in closed container in room is not accessible', () => {
    // Add a closed box in west-of-house
    const s0 = makeState();
    const objects = new Map(s0.objects);
    objects.set('closed-box', makeObj('closed-box', 'west-of-house')); // no OPENBIT
    objects.set('coin', makeObj('coin', 'closed-box'));
    const s1: GameState = { ...s0, objects };
    expect(isAccessible('coin', s1)).toBe(false);
  });

  it('becomes accessible after move to inventory', () => {
    const s0 = makeState();
    const s1 = move('torch', 'player', s0);
    const s2 = { ...s1, here: 'cellar' };
    expect(isAccessible('torch', s2)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rngInt — seedable RNG
// ---------------------------------------------------------------------------

describe('rngInt', () => {
  it('returns a value in [1, max]', () => {
    const s0 = makeState({ seed: 1 });
    const [v] = rngInt(9, s0);
    expect(v).toBeGreaterThanOrEqual(1);
    expect(v).toBeLessThanOrEqual(9);
  });

  it('advances the seed each call', () => {
    const s0 = makeState({ seed: 42 });
    const [, s1] = rngInt(9, s0);
    const [, s2] = rngInt(9, s1);
    expect(s0.seed).not.toBe(s1.seed);
    expect(s1.seed).not.toBe(s2.seed);
  });

  it('same seed produces same result', () => {
    const s0 = makeState({ seed: 99 });
    const [v1] = rngInt(9, s0);
    const [v2] = rngInt(9, s0);
    expect(v1).toBe(v2);
  });
});

// ---------------------------------------------------------------------------
// getProp / setProp
// ---------------------------------------------------------------------------

describe('getProp / setProp', () => {
  it('getProp returns default 0 for unknown key', () => {
    const state = makeState();
    expect(getProp('TROLL', 'strength', state)).toBe(0);
  });

  it('setProp stores a value retrievable by getProp', () => {
    const s0 = makeState();
    const s1 = setProp('TROLL', 'strength', 2, s0);
    expect(getProp('TROLL', 'strength', s1)).toBe(2);
  });

  it('setProp does not mutate original state', () => {
    const s0 = makeState();
    setProp('TROLL', 'strength', 5, s0);
    expect(getProp('TROLL', 'strength', s0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// remove
// ---------------------------------------------------------------------------

describe('remove', () => {
  it('sets the object parent to null', () => {
    const s0 = makeState();
    expect(getLocation('lantern', s0)).toBe('player');
    const s1 = remove('lantern', s0);
    expect(getLocation('lantern', s1)).toBeNull();
  });

  it('does not affect other objects', () => {
    const s0 = makeState();
    const s1 = remove('lantern', s0);
    expect(getLocation('player', s1)).toBe('west-of-house');
  });
});
