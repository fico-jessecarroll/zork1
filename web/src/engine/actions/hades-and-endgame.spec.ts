import {
  HadesGameState,
  DeathOutcome,
  jigsUp,
  ghostsF,
  bellF,
  hotBellF,
  lldRoomMBeg,
  lldRoomMEnd,
  deadFunction,
  OBJ_BELL,
  OBJ_HOT_BELL,
  OBJ_BOOK,
  OBJ_CANDLES,
  OBJ_GHOSTS,
  OBJ_LAMP,
  ROOM_ENTRANCE_TO_HADES,
  ROOM_LAND_OF_LIVING_DEAD,
  ROOM_FOREST_1,
  ROOM_SOUTH_TEMPLE,
} from './hades-and-endgame';
import { ZObject, ONBIT, RLANDBIT, INVISIBLE } from '../world';

// ── Test helpers ─────────────────────────────────────────────────────────────

function makeObj(id: string, parent: string | null, flags: string[] = []): ZObject {
  return { id, parent, flags: new Set(flags) };
}

/**
 * Minimal HadesGameState for most tests.
 *
 * Topology:
 *   global-objects        (root)
 *   entrance-to-hades     (room, RLANDBIT)
 *   land-of-living-dead   (room, RLANDBIT)
 *   forest-1              (room, RLANDBIT + ONBIT)
 *   south-temple          (room, RLANDBIT)
 *   player                (in entrance-to-hades)
 *   bell                  (in player inventory)
 *   hot-bell              (not placed — parent null)
 *   book                  (in player inventory)
 *   candles               (in player inventory, unlit by default)
 *   ghosts                (in entrance-to-hades)
 *   lamp                  (in player inventory)
 */
function makeState(overrides: Partial<HadesGameState> = {}): HadesGameState {
  const objects = new Map<string, ZObject>([
    ['global-objects', makeObj('global-objects', null)],
    [ROOM_ENTRANCE_TO_HADES, makeObj(ROOM_ENTRANCE_TO_HADES, null, [RLANDBIT])],
    [ROOM_LAND_OF_LIVING_DEAD, makeObj(ROOM_LAND_OF_LIVING_DEAD, null, [RLANDBIT])],
    ['forest-1', makeObj('forest-1', null, [RLANDBIT, ONBIT])],
    [ROOM_SOUTH_TEMPLE, makeObj(ROOM_SOUTH_TEMPLE, null, [RLANDBIT])],
    ['player', makeObj('player', ROOM_ENTRANCE_TO_HADES)],
    [OBJ_BELL, makeObj(OBJ_BELL, 'player')],
    [OBJ_HOT_BELL, makeObj(OBJ_HOT_BELL, null)],
    [OBJ_BOOK, makeObj(OBJ_BOOK, 'player')],
    [OBJ_CANDLES, makeObj(OBJ_CANDLES, 'player')],
    [OBJ_GHOSTS, makeObj(OBJ_GHOSTS, ROOM_ENTRANCE_TO_HADES)],
    [OBJ_LAMP, makeObj(OBJ_LAMP, 'player', [INVISIBLE])],
  ]);

  return {
    objects,
    player: 'player',
    here: ROOM_ENTRANCE_TO_HADES,
    globalObjects: 'global-objects',
    alwaysLit: false,
    deaths: 0,
    dead: false,
    lldFlag: false,
    xb: false,
    xc: false,
    lucky: true,
    score: 100,
    southTempleUnlocked: false,
    ...overrides,
  };
}

// ── jigsUp — death message and lives ─────────────────────────────────────────

describe('jigsUp — death message', () => {
  it('includes the cause-of-death description in messages', () => {
    const state = makeState();
    const result = jigsUp("You fall into the pit.", state) as Extract<DeathOutcome, { kind: 'resurrected' }>;
    expect(result.messages[0]).toBe("You fall into the pit.");
  });

  it('includes the "you have died" banner', () => {
    const state = makeState();
    const result = jigsUp("You fall into the pit.", state) as Extract<DeathOutcome, { kind: 'resurrected' }>;
    expect(result.messages.some(m => m.includes('You have died'))).toBe(true);
  });

  it('adds "Bad luck" when lucky=false', () => {
    const state = makeState({ lucky: false });
    const result = jigsUp("You slip.", state) as Extract<DeathOutcome, { kind: 'resurrected' }>;
    expect(result.messages).toContain("Bad luck, huh?");
  });

  it('omits "Bad luck" when lucky=true', () => {
    const state = makeState({ lucky: true });
    const result = jigsUp("You slip.", state) as Extract<DeathOutcome, { kind: 'resurrected' }>;
    expect(result.messages).not.toContain("Bad luck, huh?");
  });
});

// ── jigsUp — lives counter ────────────────────────────────────────────────────

describe('jigsUp — lives (DEATHS counter)', () => {
  it('increments deaths on first death', () => {
    const state = makeState({ deaths: 0 });
    const result = jigsUp("You die.", state) as Extract<DeathOutcome, { kind: 'resurrected' | 'to-hades' }>;
    expect(result.newState.deaths).toBe(1);
  });

  it('increments deaths on second death', () => {
    const state = makeState({ deaths: 1 });
    const result = jigsUp("You die again.", state) as Extract<DeathOutcome, { kind: 'resurrected' | 'to-hades' }>;
    expect(result.newState.deaths).toBe(2);
  });

  it('deducts 10 from score on death', () => {
    const state = makeState({ score: 100, deaths: 0 });
    const result = jigsUp("You die.", state) as Extract<DeathOutcome, { kind: 'resurrected' | 'to-hades' }>;
    expect(result.newState.score).toBe(90);
  });
});

// ── jigsUp — game over at 0 lives (deaths >= 2) ───────────────────────────────

describe('jigsUp — game over', () => {
  it('returns game-over when deaths is 2 (third death)', () => {
    const state = makeState({ deaths: 2 });
    const result = jigsUp("You die a third time.", state);
    expect(result.kind).toBe('game-over');
  });

  it('includes suicidal-maniac text in game-over messages', () => {
    const state = makeState({ deaths: 2 });
    const result = jigsUp("You die.", state) as Extract<DeathOutcome, { kind: 'game-over' }>;
    expect(result.messages.some(m => m.includes('suicidal maniac'))).toBe(true);
  });

  it('does not return game-over at deaths=0', () => {
    const state = makeState({ deaths: 0 });
    const result = jigsUp("You die.", state);
    expect(result.kind).not.toBe('game-over');
  });

  it('does not return game-over at deaths=1', () => {
    const state = makeState({ deaths: 1 });
    const result = jigsUp("You die.", state);
    expect(result.kind).not.toBe('game-over');
  });

  it('returns already-dead when player is in ghost state', () => {
    const state = makeState({ dead: true });
    const result = jigsUp("You die.", state);
    expect(result.kind).toBe('already-dead');
  });
});

// ── jigsUp — resurrection routing ────────────────────────────────────────────

describe('jigsUp — resurrection routing', () => {
  it('routes to forest-1 when South Temple not yet visited', () => {
    const state = makeState({ deaths: 0, southTempleUnlocked: false });
    const result = jigsUp("You die.", state) as Extract<DeathOutcome, { kind: 'resurrected' }>;
    expect(result.kind).toBe('resurrected');
    expect(result.newState.here).toBe(ROOM_FOREST_1);
  });

  it('routes to entrance-to-hades as ghost when South Temple visited', () => {
    const state = makeState({ deaths: 0, southTempleUnlocked: true });
    const result = jigsUp("You die.", state) as Extract<DeathOutcome, { kind: 'to-hades' }>;
    expect(result.kind).toBe('to-hades');
    expect(result.newState.here).toBe(ROOM_ENTRANCE_TO_HADES);
    expect(result.newState.dead).toBe(true);
    expect(result.newState.alwaysLit).toBe(true);
  });
});

// ── ghostsF ──────────────────────────────────────────────────────────────────

describe('ghostsF', () => {
  it('handles tell: spirits jeer and ignore', () => {
    const state = makeState();
    const result = ghostsF('tell', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('jeer');
  });

  it('handles exorcise: only ceremony has effect', () => {
    const state = makeState();
    const result = ghostsF('exorcise', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('ceremony');
  });

  it('handles attack on ghosts: cannot attack spirits', () => {
    const state = makeState();
    const result = ghostsF('attack', OBJ_GHOSTS, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('spirit');
  });

  it('handles unknown verbs with default message', () => {
    const state = makeState();
    const result = ghostsF('kiss', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('unable to interact');
  });
});

// ── bellF ────────────────────────────────────────────────────────────────────

describe('bellF', () => {
  it('falls through when ringing in Entrance to Hades before exorcism', () => {
    const state = makeState({ here: ROOM_ENTRANCE_TO_HADES, lldFlag: false });
    const result = bellF('ring', state);
    expect(result.handled).toBe(false);
  });

  it('dings when rung outside Entrance to Hades', () => {
    const state = makeState({ here: ROOM_FOREST_1 });
    const result = bellF('ring', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toBe('Ding, dong.');
  });

  it('dings when rung in Entrance to Hades after exorcism complete', () => {
    const state = makeState({ here: ROOM_ENTRANCE_TO_HADES, lldFlag: true });
    const result = bellF('ring', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toBe('Ding, dong.');
  });

  it('does not handle non-ring verbs', () => {
    const state = makeState();
    expect(bellF('take', state).handled).toBe(false);
  });
});

// ── hotBellF ─────────────────────────────────────────────────────────────────

describe('hotBellF', () => {
  it('cannot take the hot bell', () => {
    const state = makeState();
    const result = hotBellF('take', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('very hot');
  });

  it('cannot ring the hot bell', () => {
    const state = makeState();
    const result = hotBellF('ring', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('too hot');
  });

  it('rubbing with hands says too hot to touch', () => {
    const state = makeState();
    const result = hotBellF('rub', 'hands', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('too hot to touch');
  });

  it('rubbing with an object says heat is too intense', () => {
    const state = makeState();
    const result = hotBellF('rub', 'stick', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('too intense');
  });

  it('pouring water cools the bell', () => {
    const state = makeState();
    const result = hotBellF('pour-on', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('cools the bell');
  });
});

// ── Bell / Book / Candles ceremony ────────────────────────────────────────────

describe('Bell/Book/Candles exorcism ceremony', () => {
  it('exorcise without items says not equipped', () => {
    const objects = new Map(makeState().objects);
    // move all ceremony items out of inventory
    for (const id of [OBJ_BELL, OBJ_BOOK, OBJ_CANDLES]) {
      const obj = objects.get(id)!;
      objects.set(id, { ...obj, parent: ROOM_ENTRANCE_TO_HADES });
    }
    const state = makeState({ objects });
    const result = lldRoomMBeg('exorcise', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain("aren't equipped");
  });

  it('exorcise with all items says must perform the ceremony', () => {
    const state = makeState(); // player has bell, book, candles by default
    const result = lldRoomMBeg('exorcise', null, state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('must perform');
  });

  it('ringing the bell sets XB and shows the wraith message', () => {
    const state = makeState();
    const result = lldRoomMBeg('ring', OBJ_BELL, state);
    expect(result.handled).toBe(true);
    if (!result.handled) return;
    expect(result.newState.xb).toBe(true);
    expect(result.messages[0]).toContain('red hot');
  });

  it('ringing bell with lit candles in inventory drops and extinguishes them', () => {
    const objects = new Map(makeState().objects);
    objects.set(OBJ_CANDLES, makeObj(OBJ_CANDLES, 'player', [ONBIT]));
    const state = makeState({ objects });
    const result = lldRoomMBeg('ring', OBJ_BELL, state);
    expect(result.handled).toBe(true);
    if (!result.handled) return;
    expect(result.messages.some(m => m.includes('drop'))).toBe(true);
    // Candles should now be in the room, not inventory
    const candlesParent = result.newState.objects.get(OBJ_CANDLES)?.parent;
    expect(candlesParent).toBe(ROOM_ENTRANCE_TO_HADES);
    // Candles should be extinguished
    expect(result.newState.objects.get(OBJ_CANDLES)?.flags.has(ONBIT)).toBe(false);
  });

  it('M-END: lit candles while XB active advances to XC phase (candle dance)', () => {
    const objects = new Map(makeState().objects);
    objects.set(OBJ_CANDLES, makeObj(OBJ_CANDLES, 'player', [ONBIT]));
    const state = makeState({ objects, xb: true, xc: false });
    const { messages, newState } = lldRoomMEnd(state);
    expect(newState.xc).toBe(true);
    expect(messages[0]).toContain('flames flicker');
  });

  it('M-END: no candle dance when XB is false', () => {
    const objects = new Map(makeState().objects);
    objects.set(OBJ_CANDLES, makeObj(OBJ_CANDLES, 'player', [ONBIT]));
    const state = makeState({ objects, xb: false });
    const { messages, newState } = lldRoomMEnd(state);
    expect(newState.xc).toBe(false);
    expect(messages).toHaveLength(0);
  });

  it('M-END: no candle dance when candles are unlit', () => {
    const state = makeState({ xb: true }); // candles unlit by default
    const { newState } = lldRoomMEnd(state);
    expect(newState.xc).toBe(false);
  });

  it('reading the book without XC fails (returns handled=false)', () => {
    const state = makeState({ xb: true, xc: false });
    const result = lldRoomMBeg('read', OBJ_BOOK, state);
    expect(result.handled).toBe(false);
  });

  it('reading the book with XC active exorcises the ghosts', () => {
    const state = makeState({ xb: true, xc: true });
    const result = lldRoomMBeg('read', OBJ_BOOK, state);
    expect(result.handled).toBe(true);
    if (!result.handled) return;
    expect(result.newState.lldFlag).toBe(true);
    expect(result.messages[0]).toContain('Begone');
    // Ghosts removed from the object world
    expect(result.newState.objects.get(OBJ_GHOSTS)?.parent).toBeNull();
  });

  it('full ceremony sequence: ring → candle dance → read exorcises ghosts', () => {
    // Initial: player in entrance-to-hades with bell, book, and LIT candles
    const objects = new Map(makeState().objects);
    objects.set(OBJ_CANDLES, makeObj(OBJ_CANDLES, 'player', [ONBIT]));
    let state = makeState({ objects });

    // Step 1: ring bell
    const ringResult = lldRoomMBeg('ring', OBJ_BELL, state);
    expect(ringResult.handled).toBe(true);
    state = (ringResult as { handled: true; messages: string[]; newState: HadesGameState }).newState;
    expect(state.xb).toBe(true);

    // Step 2: M-END (candle dance)
    // Note: after ringing, if candles were LIT they drop. Re-equip lit candles.
    const objects2 = new Map(state.objects);
    objects2.set(OBJ_CANDLES, makeObj(OBJ_CANDLES, 'player', [ONBIT]));
    state = { ...state, objects: objects2 };
    const endResult = lldRoomMEnd(state);
    state = endResult.newState;
    expect(state.xc).toBe(true);

    // Step 3: read book
    const readResult = lldRoomMBeg('read', OBJ_BOOK, state);
    expect(readResult.handled).toBe(true);
    state = (readResult as { handled: true; messages: string[]; newState: HadesGameState }).newState;
    expect(state.lldFlag).toBe(true);
    expect(state.objects.get(OBJ_GHOSTS)?.parent).toBeNull();
  });
});

// ── deadFunction ─────────────────────────────────────────────────────────────

describe('deadFunction', () => {
  it('blocks attack while dead', () => {
    const state = makeState({ dead: true });
    const result = deadFunction('attack', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('vain');
  });

  it('blocks take while dead', () => {
    const state = makeState({ dead: true });
    const result = deadFunction('take', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('passes through');
  });

  it('allows save/restore/quit while dead', () => {
    const state = makeState({ dead: true });
    expect(deadFunction('save', state).handled).toBe(false);
    expect(deadFunction('restore', state).handled).toBe(false);
    expect(deadFunction('quit', state).handled).toBe(false);
  });

  it('praying in south-temple resurrects the player', () => {
    const state = makeState({ dead: true, here: ROOM_SOUTH_TEMPLE });
    // Move player to south-temple
    const objects = new Map(state.objects);
    objects.set('player', makeObj('player', ROOM_SOUTH_TEMPLE));
    const stateInTemple = { ...state, objects };

    const result = deadFunction('pray', stateInTemple);
    expect(result.handled).toBe(true);
    if (!result.handled) return;
    expect(result.newState.dead).toBe(false);
    expect(result.newState.here).toBe(ROOM_FOREST_1);
    expect(result.messages[0]).toContain('trumpet');
  });

  it('praying outside south-temple has no effect', () => {
    const state = makeState({ dead: true, here: ROOM_ENTRANCE_TO_HADES });
    const result = deadFunction('pray', state);
    expect(result.handled).toBe(true);
    expect(result.handled && result.messages[0]).toContain('not heard');
  });
});
