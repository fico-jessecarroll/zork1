import {
  ThiefGameState,
  MAZEBIT,
  TOUCHBIT,
  FIGHTBIT,
  OBJ_THIEF,
  OBJ_STILETTO,
  OBJ_LARGE_BAG,
  OBJ_TROPHY_CASE,
  OBJ_EGG,
  ROOM_TREASURE_ROOM,
  MAZE_ROOM_IDS,
  trophyCaseScore,
  trophyCaseAction,
  rob,
  robMaze,
  stealJunk,
  dropJunk,
  depositBooty,
  recoverStiletto,
  hackTreasures,
  iThief,
} from './maze-and-thief';
import { ZObject, INVISIBLE, RLANDBIT, TAKEBIT, SACREDBIT, NDESCBIT } from '../world';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeObj(
  id: string,
  parent: string | null,
  flags: string[] = [],
): ZObject {
  return { id, parent, flags: new Set(flags) };
}

const ROOM_A = 'room-a';
const ROOM_B = 'room-b';
const ROOM_C = 'room-c';
const PLAYER = 'player';

/**
 * Build a minimal ThiefGameState.
 *
 * Default topology:
 *   global-objects (root)
 *   room-a   RLANDBIT — player's current room
 *   room-b   RLANDBIT — thief's starting room (invisible)
 *   room-c   RLANDBIT
 *   treasure-room  RLANDBIT
 *   player   in room-a
 *   thief    in room-b, INVISIBLE
 *   stiletto in thief
 *   large-bag in thief
 *   trophy-case  in room-a
 */
function makeState(
  extra: Array<[string, ZObject]> = [],
  overrides: Partial<ThiefGameState> = {},
): ThiefGameState {
  const objects = new Map<string, ZObject>([
    ['global-objects', makeObj('global-objects', null)],
    [ROOM_A, makeObj(ROOM_A, null, [RLANDBIT])],
    [ROOM_B, makeObj(ROOM_B, null, [RLANDBIT])],
    [ROOM_C, makeObj(ROOM_C, null, [RLANDBIT])],
    [ROOM_TREASURE_ROOM, makeObj(ROOM_TREASURE_ROOM, null, [RLANDBIT])],
    [PLAYER, makeObj(PLAYER, ROOM_A)],
    [OBJ_THIEF, makeObj(OBJ_THIEF, ROOM_B, [INVISIBLE])],
    [OBJ_STILETTO, makeObj(OBJ_STILETTO, OBJ_THIEF)],
    [OBJ_LARGE_BAG, makeObj(OBJ_LARGE_BAG, OBJ_THIEF)],
    [OBJ_TROPHY_CASE, makeObj(OBJ_TROPHY_CASE, ROOM_A)],
    ...extra,
  ]);

  return {
    objects,
    player: PLAYER,
    here: ROOM_A,
    globalObjects: 'global-objects',
    alwaysLit: true,
    seed: 0,
    properties: new Map(),
    thiefHere: false,
    thiefEngrossed: false,
    baseScore: 0,
    score: 0,
    tvalueMap: new Map(),
    ...overrides,
  };
}

/** Return a deterministic rng that always returns `value` (0..1). */
function alwaysRng(value: number): () => number {
  return () => value;
}

/** Return a copy of state with tvalue set for an object. */
function withTvalue(state: ThiefGameState, id: string, value: number): ThiefGameState {
  const tvalueMap = new Map(state.tvalueMap);
  tvalueMap.set(id, value);
  return { ...state, tvalueMap };
}

// ── trophyCaseScore — OTVAL-FROB ─────────────────────────────────────────────

describe('trophyCaseScore — OTVAL-FROB', () => {
  it('returns 0 when trophy case is empty', () => {
    const state = makeState();
    expect(trophyCaseScore(state)).toBe(0);
  });

  it('sums tvalue of items directly in trophy case', () => {
    let state = makeState([
      ['sword', makeObj('sword', OBJ_TROPHY_CASE)],
      ['coin', makeObj('coin', OBJ_TROPHY_CASE)],
    ]);
    state = withTvalue(state, 'sword', 10);
    state = withTvalue(state, 'coin', 5);
    expect(trophyCaseScore(state)).toBe(15);
  });

  it('recursively sums tvalue of nested items', () => {
    let state = makeState([
      ['box', makeObj('box', OBJ_TROPHY_CASE)],
      ['gem', makeObj('gem', 'box')],
    ]);
    state = withTvalue(state, 'gem', 8);
    expect(trophyCaseScore(state)).toBe(8);
  });

  it('ignores items with tvalue 0', () => {
    const state = makeState([
      ['junk', makeObj('junk', OBJ_TROPHY_CASE)],
    ]);
    expect(trophyCaseScore(state)).toBe(0);
  });
});

// ── trophyCaseAction — TROPHY-CASE-FCN ───────────────────────────────────────

describe('trophyCaseAction — TROPHY-CASE-FCN', () => {
  it('refuses TAKE of the trophy case', () => {
    const state = makeState();
    const result = trophyCaseAction('TAKE', OBJ_TROPHY_CASE, null, state);
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/securely fastened/i);
    expect(result.state.score).toBe(0);
  });

  it('recalculates score when item is PUT into the case', () => {
    let state = makeState([['ruby', makeObj('ruby', OBJ_TROPHY_CASE)]]);
    state = withTvalue(state, 'ruby', 12);
    state = { ...state, baseScore: 5 };

    const result = trophyCaseAction('PUT', 'ruby', OBJ_TROPHY_CASE, state);
    expect(result.handled).toBe(true);
    expect(result.state.score).toBe(17); // baseScore(5) + tvalue(12)
  });

  it('score reflects all items already in case after multiple deposits', () => {
    let state = makeState([
      ['ruby', makeObj('ruby', OBJ_TROPHY_CASE)],
      ['emerald', makeObj('emerald', OBJ_TROPHY_CASE)],
    ]);
    state = withTvalue(state, 'ruby', 12);
    state = withTvalue(state, 'emerald', 8);
    state = { ...state, baseScore: 0 };

    const result = trophyCaseAction('PUT', 'emerald', OBJ_TROPHY_CASE, state);
    expect(result.state.score).toBe(20); // 12 + 8
  });

  it('returns unhandled for unrecognised verb/target combinations', () => {
    const state = makeState();
    const result = trophyCaseAction('TAKE', 'something-else', null, state);
    expect(result.handled).toBe(false);
  });
});

// ── rob — ROB ─────────────────────────────────────────────────────────────────

describe('rob — ROB', () => {
  it('steals tvalue>0 visible non-sacred items from room', () => {
    let state = makeState([
      ['chalice', makeObj('chalice', ROOM_A)],
    ]);
    state = withTvalue(state, 'chalice', 6);

    const { state: s2, robbed } = rob(ROOM_A, state, alwaysRng(0));
    expect(robbed).toBe(true);
    const chalice = s2.objects.get('chalice')!;
    expect(chalice.parent).toBe(OBJ_THIEF);
    expect(chalice.flags.has(INVISIBLE)).toBe(true);
    expect(chalice.flags.has(TOUCHBIT)).toBe(true);
  });

  it('steals tvalue>0 items from player inventory', () => {
    let state = makeState([
      ['diamond', makeObj('diamond', PLAYER)],
    ]);
    state = withTvalue(state, 'diamond', 10);

    const { state: s2, robbed } = rob(PLAYER, state, alwaysRng(0));
    expect(robbed).toBe(true);
    expect(s2.objects.get('diamond')!.parent).toBe(OBJ_THIEF);
  });

  it('ignores invisible items', () => {
    let state = makeState([
      ['ghost-gem', makeObj('ghost-gem', ROOM_A, [INVISIBLE])],
    ]);
    state = withTvalue(state, 'ghost-gem', 5);

    const { robbed } = rob(ROOM_A, state, alwaysRng(0));
    expect(robbed).toBe(false);
  });

  it('ignores sacred items', () => {
    let state = makeState([
      ['relic', makeObj('relic', ROOM_A, [SACREDBIT])],
    ]);
    state = withTvalue(state, 'relic', 5);

    const { robbed } = rob(ROOM_A, state, alwaysRng(0));
    expect(robbed).toBe(false);
  });

  it('ignores tvalue=0 items', () => {
    const state = makeState([
      ['pebble', makeObj('pebble', ROOM_A)],
    ]);

    const { robbed } = rob(ROOM_A, state, alwaysRng(0));
    expect(robbed).toBe(false);
  });

  it('respects prob parameter — rng above threshold means no steal', () => {
    let state = makeState([
      ['gem', makeObj('gem', ROOM_A)],
    ]);
    state = withTvalue(state, 'gem', 5);

    // rng returns 1.0 → 1.0 * 100 = 100 >= 100 → skip item
    const { robbed } = rob(ROOM_A, state, alwaysRng(1), 100);
    expect(robbed).toBe(false);
  });

  it('does not mutate original state', () => {
    let state = makeState([['gem', makeObj('gem', ROOM_A)]]);
    state = withTvalue(state, 'gem', 5);
    const origParent = state.objects.get('gem')!.parent;
    rob(ROOM_A, state, alwaysRng(0));
    expect(state.objects.get('gem')!.parent).toBe(origParent);
  });
});

// ── depositBooty — DEPOSIT-BOOTY ──────────────────────────────────────────────

describe('depositBooty — DEPOSIT-BOOTY', () => {
  it('moves valuable items from thief to target room', () => {
    let state = makeState([
      ['chalice', makeObj('chalice', OBJ_THIEF)],
    ]);
    state = withTvalue(state, 'chalice', 6);

    const { state: s2, deposited } = depositBooty(ROOM_TREASURE_ROOM, state);
    expect(deposited).toBe(true);
    expect(s2.objects.get('chalice')!.parent).toBe(ROOM_TREASURE_ROOM);
  });

  it('never moves stiletto or large-bag', () => {
    const state = makeState();
    const { state: s2 } = depositBooty(ROOM_TREASURE_ROOM, state);
    expect(s2.objects.get(OBJ_STILETTO)!.parent).toBe(OBJ_THIEF);
    expect(s2.objects.get(OBJ_LARGE_BAG)!.parent).toBe(OBJ_THIEF);
  });

  it('sets OPENBIT on egg when depositing (EGG-SOLVE)', () => {
    let state = makeState([
      [OBJ_EGG, makeObj(OBJ_EGG, OBJ_THIEF)],
    ]);
    state = withTvalue(state, OBJ_EGG, 5);

    const { state: s2, eggSolved } = depositBooty(ROOM_TREASURE_ROOM, state);
    expect(eggSolved).toBe(true);
    expect(s2.objects.get(OBJ_EGG)!.flags.has('OPENBIT')).toBe(true);
  });

  it('reports deposited=false when thief has no valuables', () => {
    const state = makeState();
    const { deposited } = depositBooty(ROOM_TREASURE_ROOM, state);
    expect(deposited).toBe(false);
  });
});

// ── recoverStiletto — RECOVER-STILETTO ────────────────────────────────────────

describe('recoverStiletto — RECOVER-STILETTO', () => {
  it('picks up stiletto from thief\'s room into thief and hides it', () => {
    // Put stiletto loose in room-b (thief's room), not inside thief
    const objects = new Map(makeState().objects);
    objects.set(OBJ_STILETTO, makeObj(OBJ_STILETTO, ROOM_B)); // loose in thief's room
    const state = { ...makeState(), objects };

    const s2 = recoverStiletto(state);
    expect(s2.objects.get(OBJ_STILETTO)!.parent).toBe(OBJ_THIEF);
    expect(s2.objects.get(OBJ_STILETTO)!.flags.has(NDESCBIT)).toBe(true);
  });

  it('does nothing when stiletto is already in thief', () => {
    const state = makeState(); // stiletto starts in thief
    const s2 = recoverStiletto(state);
    expect(s2.objects.get(OBJ_STILETTO)!.parent).toBe(OBJ_THIEF);
  });

  it('does nothing when stiletto is in a different room than thief', () => {
    const objects = new Map(makeState().objects);
    objects.set(OBJ_STILETTO, makeObj(OBJ_STILETTO, ROOM_A)); // different room
    const state = { ...makeState(), objects };

    const s2 = recoverStiletto(state);
    expect(s2.objects.get(OBJ_STILETTO)!.parent).toBe(ROOM_A);
  });
});

// ── hackTreasures — HACK-TREASURES ───────────────────────────────────────────

describe('hackTreasures — HACK-TREASURES', () => {
  it('makes thief invisible and reveals treasure-room items', () => {
    const objects = new Map(makeState().objects);
    objects.set(OBJ_THIEF, makeObj(OBJ_THIEF, ROOM_B, [])); // visible thief
    objects.set('hidden-gem', makeObj('hidden-gem', ROOM_TREASURE_ROOM, [INVISIBLE]));
    const state = { ...makeState(), objects };

    const s2 = hackTreasures(state);
    expect(s2.objects.get(OBJ_THIEF)!.flags.has(INVISIBLE)).toBe(true);
    expect(s2.objects.get('hidden-gem')!.flags.has(INVISIBLE)).toBe(false);
  });
});

// ── iThief — wandering ────────────────────────────────────────────────────────

describe('iThief — thief wanders between rooms', () => {
  const allRooms = [ROOM_A, ROOM_B, ROOM_C];

  it('moves thief from room-b to room-c on first tick', () => {
    const state = makeState();
    const { state: s2 } = iThief(state, allRooms, alwaysRng(1));
    expect(s2.objects.get(OBJ_THIEF)!.parent).toBe(ROOM_C);
  });

  it('cycles through all rooms across multiple ticks', () => {
    const state = makeState();
    let s = state;
    const visited = new Set<string>();

    for (let i = 0; i < allRooms.length * 2; i++) {
      const result = iThief(s, allRooms, alwaysRng(1));
      s = result.state;
      const loc = s.objects.get(OBJ_THIEF)!.parent!;
      visited.add(loc);
    }

    for (const room of allRooms) {
      expect(visited.has(room)).toBe(true);
    }
  });

  it('thief stays invisible while wandering', () => {
    const state = makeState();
    const { state: s2 } = iThief(state, allRooms, alwaysRng(1));
    expect(s2.objects.get(OBJ_THIEF)!.flags.has(INVISIBLE)).toBe(true);
  });

  it('clears thiefHere after wandering', () => {
    const state = makeState([], { thiefHere: true });
    const { state: s2 } = iThief(state, allRooms, alwaysRng(1));
    expect(s2.thiefHere).toBe(false);
  });

  it('wraps around to room-a when thief is at room-c', () => {
    const objects = new Map(makeState().objects);
    objects.set(OBJ_THIEF, makeObj(OBJ_THIEF, ROOM_C, [INVISIBLE]));
    const state = { ...makeState(), objects };

    const { state: s2 } = iThief(state, allRooms, alwaysRng(1));
    expect(s2.objects.get(OBJ_THIEF)!.parent).toBe(ROOM_A);
  });

  it('skips sacred rooms when wandering', () => {
    // room-c has SACREDBIT — thief should skip it and go to room-a
    const objects = new Map(makeState().objects);
    objects.set(ROOM_C, makeObj(ROOM_C, null, [RLANDBIT, SACREDBIT]));
    const state = { ...makeState(), objects };

    const { state: s2 } = iThief(state, allRooms, alwaysRng(1));
    // room-b → skip room-c (sacred) → land on room-a
    expect(s2.objects.get(OBJ_THIEF)!.parent).toBe(ROOM_A);
  });
});

// ── iThief — thief steals from player ────────────────────────────────────────

describe('iThief — thief steals items from player', () => {
  it('rob steals valuable item from player inventory', () => {
    let state = makeState([
      ['gem', makeObj('gem', PLAYER)],
    ]);
    state = withTvalue(state, 'gem', 5);

    // Test rob() directly — this is what iThief calls internally
    const { state: s2, robbed } = rob(PLAYER, state, alwaysRng(0));
    expect(robbed).toBe(true);
    expect(s2.objects.get('gem')!.parent).toBe(OBJ_THIEF);
  });

  it('does not steal items with tvalue=0 from player', () => {
    const state = makeState([['pebble', makeObj('pebble', PLAYER, [TAKEBIT])]]);

    const { robbed } = rob(PLAYER, state, alwaysRng(0));
    expect(robbed).toBe(false);
    expect(state.objects.get('pebble')!.parent).toBe(PLAYER);
  });

  it('thief robs visited room when wandering past it', () => {
    // room-b has TOUCHBIT (player visited) and contains a gem
    const objects = new Map(makeState().objects);
    objects.set(ROOM_B, makeObj(ROOM_B, null, [RLANDBIT, TOUCHBIT]));
    objects.set('gem', makeObj('gem', ROOM_B));
    const baseState = { ...makeState(), objects };
    let state = withTvalue(baseState, 'gem', 5);

    // Thief in room-b (invisible) → hacks room-b (75% rob) → wanders
    // rng=0: 0*100=0 < 75 → steals gem from room-b
    const { state: s2 } = iThief(state, [ROOM_A, ROOM_B, ROOM_C], alwaysRng(0));
    expect(s2.objects.get('gem')!.parent).toBe(OBJ_THIEF);
  });
});

// ── depositing treasure → score increments ────────────────────────────────────

describe('depositing treasure in case increments score correctly', () => {
  it('score increases by tvalue of item added to trophy case', () => {
    let state = makeState([
      ['chalice', makeObj('chalice', OBJ_TROPHY_CASE)],
    ]);
    state = withTvalue(state, 'chalice', 14);
    state = { ...state, baseScore: 0 };

    const result = trophyCaseAction('PUT', 'chalice', OBJ_TROPHY_CASE, state);
    expect(result.state.score).toBe(14);
  });

  it('score accumulates across multiple items in the case', () => {
    let state = makeState([
      ['chalice', makeObj('chalice', OBJ_TROPHY_CASE)],
      ['torch', makeObj('torch', OBJ_TROPHY_CASE)],
    ]);
    state = withTvalue(state, 'chalice', 14);
    state = withTvalue(state, 'torch', 6);
    state = { ...state, baseScore: 0 };

    const result = trophyCaseAction('PUT', 'torch', OBJ_TROPHY_CASE, state);
    expect(result.state.score).toBe(20);
  });

  it('depositBooty places thief loot into target; trophyCaseScore reflects it', () => {
    let state = makeState([
      ['sceptre', makeObj('sceptre', OBJ_THIEF)],
    ]);
    state = withTvalue(state, 'sceptre', 10);

    const { state: s2 } = depositBooty(OBJ_TROPHY_CASE, state);
    expect(s2.objects.get('sceptre')!.parent).toBe(OBJ_TROPHY_CASE);
    expect(trophyCaseScore(s2)).toBe(10);
  });

  it('baseScore is preserved and added to trophy total', () => {
    let state = makeState([
      ['jewel', makeObj('jewel', OBJ_TROPHY_CASE)],
    ]);
    state = withTvalue(state, 'jewel', 7);
    state = { ...state, baseScore: 100 };

    const result = trophyCaseAction('PUT', 'jewel', OBJ_TROPHY_CASE, state);
    expect(result.state.score).toBe(107);
  });
});

// ── MAZE_ROOM_IDS ─────────────────────────────────────────────────────────────

describe('MAZE_ROOM_IDS', () => {
  it('contains exactly 19 rooms', () => {
    expect(MAZE_ROOM_IDS.length).toBe(19);
  });

  it('contains maze-1 through maze-15', () => {
    for (let i = 1; i <= 15; i++) {
      expect(MAZE_ROOM_IDS).toContain(`maze-${i}`);
    }
  });

  it('contains all four dead-end rooms', () => {
    for (let i = 1; i <= 4; i++) {
      expect(MAZE_ROOM_IDS).toContain(`dead-end-${i}`);
    }
  });
});
