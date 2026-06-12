import {
  MiscAreasState,
  BatDropRoom,
  BAT_DROP_ROOMS,
  ROOM_MIRROR_1,
  ROOM_MIRROR_2,
  ROOM_GRATING_ROOM,
  ROOM_GRATING_CLEARING,
  initialMiscAreasState,
  batAction,
  batDescription,
  batsRoomEnter,
  mirrorAction,
  mirrorRoomLookExtra,
  grateAction,
  boomRoomCheck,
  machineAction,
  machineSwitchAction,
  gunkAction,
} from './misc-areas';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function state(overrides: Partial<MiscAreasState> = {}): MiscAreasState {
  return { ...initialMiscAreasState, ...overrides };
}

/** Deterministic room picker — always returns the first BAT_DROP_ROOMS entry. */
const pickFirst = (): BatDropRoom => BAT_DROP_ROOMS[0];

/** Deterministic room picker — always returns the last BAT_DROP_ROOMS entry. */
const pickLast = (): BatDropRoom => BAT_DROP_ROOMS[BAT_DROP_ROOMS.length - 1];

// ---------------------------------------------------------------------------
// BAT-F — batAction
// ---------------------------------------------------------------------------

describe('batAction — TELL verb', () => {
  it('handles TELL and emits 6 fweeps (no transport)', () => {
    const result = batAction('tell', false, pickFirst);
    expect(result.handled).toBe(true);
    expect(result.fweepCount).toBe(6);
    expect(result.newRoom).toBeNull();
    expect(result.messages).toHaveLength(0);
  });
});

describe('batAction — garlic present', () => {
  it('TAKE with garlic present: bat stays on ceiling', () => {
    const result = batAction('take', true, pickFirst);
    expect(result.handled).toBe(true);
    expect(result.messages[0]).toMatch(/can't reach him/i);
    expect(result.newRoom).toBeNull();
    expect(result.fweepCount).toBe(0);
  });

  it('ATTACK with garlic present: bat stays on ceiling', () => {
    const result = batAction('attack', true, pickFirst);
    expect(result.newRoom).toBeNull();
    expect(result.messages[0]).toMatch(/ceiling/i);
  });

  it('MUNG with garlic present: bat stays on ceiling', () => {
    const result = batAction('mung', true, pickFirst);
    expect(result.newRoom).toBeNull();
  });
});

describe('batAction — bat steals zorkmid and moves it randomly (FLY-ME)', () => {
  it('TAKE without garlic: bat grabs player and moves to a mine room', () => {
    const result = batAction('take', false, pickFirst);
    expect(result.handled).toBe(true);
    expect(result.messages[0]).toMatch(/bat grabs you/i);
    expect(result.newRoom).toBe('mine-1');
    expect(result.fweepCount).toBe(4);
  });

  it('destination is drawn from BAT_DROP_ROOMS (first picker)', () => {
    const result = batAction('take', false, pickFirst);
    expect(BAT_DROP_ROOMS).toContain(result.newRoom);
  });

  it('destination is drawn from BAT_DROP_ROOMS (last picker)', () => {
    const result = batAction('take', false, pickLast);
    expect(result.newRoom).toBe('mine-entrance');
    expect(BAT_DROP_ROOMS).toContain(result.newRoom);
  });

  it('pickRoom function controls the destination (carries zorkmid to random room)', () => {
    // The zorkmid moves with the player, so whichever room is picked is where
    // the zorkmid ends up. Verify that different pickers produce different rooms.
    const r1 = batAction('attack', false, () => 'mine-1');
    const r2 = batAction('attack', false, () => 'ladder-top');
    expect(r1.newRoom).toBe('mine-1');
    expect(r2.newRoom).toBe('ladder-top');
  });

  it('ATTACK without garlic also triggers FLY-ME', () => {
    const result = batAction('attack', false, pickFirst);
    expect(result.newRoom).not.toBeNull();
    expect(result.messages[0]).toMatch(/bat grabs you/i);
  });

  it('unhandled verb returns handled=false with no transport', () => {
    const result = batAction('examine', false, pickFirst);
    expect(result.handled).toBe(false);
    expect(result.newRoom).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// batDescription
// ---------------------------------------------------------------------------

describe('batDescription', () => {
  it('garlic present: bat cowers on ceiling', () => {
    expect(batDescription(true)).toMatch(/deranged.*holding his nose/i);
  });

  it('no garlic: bat swoops', () => {
    expect(batDescription(false)).toMatch(/swoops down/i);
  });
});

// ---------------------------------------------------------------------------
// BATS-ROOM M-ENTER — batsRoomEnter
// ---------------------------------------------------------------------------

describe('batsRoomEnter', () => {
  it('no garlic and alive: bat grabs player immediately', () => {
    const result = batsRoomEnter(false, false, pickFirst);
    expect(result.newRoom).toBe('mine-1');
    expect(result.messages[0]).toMatch(/bat grabs you/i);
    expect(result.fweepCount).toBe(4);
  });

  it('garlic present: bat does not grab player', () => {
    const result = batsRoomEnter(true, false, pickFirst);
    expect(result.newRoom).toBeNull();
    expect(result.messages).toHaveLength(0);
  });

  it('player is dead: bat does not grab player', () => {
    const result = batsRoomEnter(false, true, pickFirst);
    expect(result.newRoom).toBeNull();
  });

  it('destination is one of the valid mine drop rooms', () => {
    const result = batsRoomEnter(false, false, pickLast);
    expect(BAT_DROP_ROOMS).toContain(result.newRoom);
  });
});

// ---------------------------------------------------------------------------
// MIRROR-MIRROR — mirrorAction
// ---------------------------------------------------------------------------

describe('mirrorAction — RUB', () => {
  it('rub with bare hands from mirror-room-1 teleports to mirror-room-2', () => {
    const result = mirrorAction('rub', null, ROOM_MIRROR_1, state());
    expect(result.handled).toBe(true);
    expect(result.destination).toBe(ROOM_MIRROR_2);
    expect(result.messages[0]).toMatch(/rumble/i);
    expect(result.newState).toEqual(state()); // no state change
  });

  it('mirror teleport puts player in correct destination room (room-2 → room-1)', () => {
    const result = mirrorAction('rub', null, ROOM_MIRROR_2, state());
    expect(result.destination).toBe(ROOM_MIRROR_1);
  });

  it('rub with non-hands instrument: tingling message, no teleport', () => {
    const result = mirrorAction('rub', 'cloth', ROOM_MIRROR_1, state());
    expect(result.destination).toBeNull();
    expect(result.messages[0]).toMatch(/tingling/i);
  });

  it('rub with hands explicitly: teleports (hands treated same as no instrument)', () => {
    const result = mirrorAction('rub', 'hands', ROOM_MIRROR_1, state());
    expect(result.destination).toBe(ROOM_MIRROR_2);
  });

  it('rub broken mirror: "Haven\'t you done enough damage"', () => {
    const result = mirrorAction('rub', null, ROOM_MIRROR_1, state({ mirrorMung: true }));
    expect(result.destination).toBeNull();
    expect(result.messages[0]).toMatch(/enough damage/i);
  });
});

describe('mirrorAction — EXAMINE / LOOK-INSIDE', () => {
  it('examine intact mirror: ugly person message', () => {
    const result = mirrorAction('examine', null, ROOM_MIRROR_1, state());
    expect(result.messages[0]).toMatch(/ugly person/i);
  });

  it('examine broken mirror: pieces message', () => {
    const result = mirrorAction('examine', null, ROOM_MIRROR_1, state({ mirrorMung: true }));
    expect(result.messages[0]).toMatch(/broken into many pieces/i);
  });

  it('look-inside intact mirror: ugly person message', () => {
    const result = mirrorAction('look-inside', null, ROOM_MIRROR_1, state());
    expect(result.messages[0]).toMatch(/ugly person/i);
  });
});

describe('mirrorAction — TAKE', () => {
  it('cannot take the mirror', () => {
    const result = mirrorAction('take', null, ROOM_MIRROR_1, state());
    expect(result.messages[0]).toMatch(/many times your size/i);
    expect(result.destination).toBeNull();
  });
});

describe('mirrorAction — MUNG / THROW / ATTACK (breaking)', () => {
  it('mung breaks the mirror and clears LUCKY', () => {
    const result = mirrorAction('mung', null, ROOM_MIRROR_1, state({ lucky: true }));
    expect(result.newState.mirrorMung).toBe(true);
    expect(result.newState.lucky).toBe(false);
    expect(result.messages[0]).toMatch(/broken the mirror/i);
  });

  it('attack breaks the mirror', () => {
    const result = mirrorAction('attack', null, ROOM_MIRROR_1, state());
    expect(result.newState.mirrorMung).toBe(true);
  });

  it('throw breaks the mirror', () => {
    const result = mirrorAction('throw', null, ROOM_MIRROR_1, state());
    expect(result.newState.mirrorMung).toBe(true);
  });

  it('breaking already-broken mirror: "enough damage" message', () => {
    const result = mirrorAction('mung', null, ROOM_MIRROR_1, state({ mirrorMung: true }));
    expect(result.messages[0]).toMatch(/enough damage/i);
    expect(result.newState.mirrorMung).toBe(true); // stays true
  });

  it('does not mutate the input state', () => {
    const s = state({ lucky: true });
    mirrorAction('mung', null, ROOM_MIRROR_1, s);
    expect(s.lucky).toBe(true);
    expect(s.mirrorMung).toBe(false);
  });
});

describe('mirrorRoomLookExtra', () => {
  it('returns null when mirror is intact', () => {
    expect(mirrorRoomLookExtra(state())).toBeNull();
  });

  it('returns damage message when mirror is broken', () => {
    const msg = mirrorRoomLookExtra(state({ mirrorMung: true }));
    expect(msg).toMatch(/destroyed by your recklessness/i);
  });
});

// ---------------------------------------------------------------------------
// GRATE-FUNCTION — grateAction
// ---------------------------------------------------------------------------

describe('grateAction — grating requires key to unlock', () => {
  it('UNLOCK from grating-room with KEYS: unlocks and sets flag', () => {
    const result = grateAction('unlock', 'KEYS', ROOM_GRATING_ROOM, false, state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/unlocked/i);
    expect(result.newState.grateUnlocked).toBe(true);
  });

  it('UNLOCK from grating-room without keys: refuses', () => {
    const result = grateAction('unlock', 'CROWBAR', ROOM_GRATING_ROOM, false, state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/can you unlock a grating with/i);
    expect(result.newState.grateUnlocked).toBe(false);
  });

  it('UNLOCK from grating-room with no instrument: refuses', () => {
    const result = grateAction('unlock', null, ROOM_GRATING_ROOM, false, state());
    expect(result.newState.grateUnlocked).toBe(false);
    expect(result.message).toMatch(/can you unlock/i);
  });

  it('UNLOCK from grating-clearing (surface) with KEYS: cannot reach lock', () => {
    const result = grateAction('unlock', 'KEYS', ROOM_GRATING_CLEARING, false, state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/can't reach the lock/i);
    expect(result.newState.grateUnlocked).toBe(false);
  });

  it('OPEN GRATE WITH KEYS: treated as UNLOCK (sets grateUnlocked)', () => {
    const result = grateAction('open', 'KEYS', ROOM_GRATING_ROOM, false, state());
    expect(result.newState.grateUnlocked).toBe(true);
    expect(result.message).toMatch(/unlocked/i);
  });
});

describe('grateAction — LOCK', () => {
  it('LOCK from grating-room: locks grate and clears flag', () => {
    const result = grateAction('lock', null, ROOM_GRATING_ROOM, false, state({ grateUnlocked: true }));
    expect(result.handled).toBe(true);
    expect(result.newState.grateUnlocked).toBe(false);
    expect(result.message).toMatch(/locked/i);
  });

  it('LOCK from grating-clearing: cannot lock from above', () => {
    const result = grateAction('lock', null, ROOM_GRATING_CLEARING, false, state({ grateUnlocked: true }));
    expect(result.message).toMatch(/can't lock it from this side/i);
    expect(result.newState.grateUnlocked).toBe(true); // unchanged
  });
});

describe('grateAction — PICK', () => {
  it('cannot pick the lock', () => {
    const result = grateAction('pick', null, ROOM_GRATING_ROOM, false, state());
    expect(result.message).toMatch(/can't pick/i);
    expect(result.newState.grateUnlocked).toBe(false);
  });
});

describe('grateAction — OPEN / CLOSE', () => {
  it('OPEN locked grate: refuses', () => {
    const result = grateAction('open', null, ROOM_GRATING_ROOM, false, state());
    expect(result.message).toMatch(/locked/i);
    expect(result.setGratingRoomLit).toBe(false);
  });

  it('OPEN unlocked grate from underground: "trees above" message, sets lit', () => {
    const result = grateAction('open', null, ROOM_GRATING_ROOM, false, state({ grateUnlocked: true }));
    expect(result.message).toMatch(/trees above you/i);
    expect(result.setGratingRoomLit).toBe(true);
  });

  it('OPEN unlocked grate from surface: "grating opens" message', () => {
    const result = grateAction('open', null, ROOM_GRATING_CLEARING, false, state({ grateUnlocked: true }));
    expect(result.message).toMatch(/^The grating opens\.$/i);
    expect(result.setGratingRoomLit).toBe(true);
  });

  it('OPEN from underground before leaves revealed: leaves fall', () => {
    const result = grateAction(
      'open', null, ROOM_GRATING_ROOM, false,
      state({ grateUnlocked: true, grateRevealed: false }),
    );
    expect(result.moveLeaves).toBe(true);
    expect(result.newState.grateRevealed).toBe(true);
    expect(result.message).toMatch(/pile of leaves/i);
  });

  it('OPEN from underground after leaves revealed: no leaves message', () => {
    const result = grateAction(
      'open', null, ROOM_GRATING_ROOM, false,
      state({ grateUnlocked: true, grateRevealed: true }),
    );
    expect(result.moveLeaves).toBe(false);
    expect(result.message).not.toMatch(/leaves/i);
  });

  it('OPEN already-open grate: reports already open', () => {
    const result = grateAction('open', null, ROOM_GRATING_ROOM, true, state({ grateUnlocked: true }));
    expect(result.message).toMatch(/already open/i);
    expect(result.setGratingRoomLit).toBe(false);
  });

  it('CLOSE open grate: closes and clears lit flag', () => {
    const result = grateAction('close', null, ROOM_GRATING_ROOM, true, state({ grateUnlocked: true }));
    expect(result.message).toMatch(/closed/i);
    expect(result.clearGratingRoomLit).toBe(true);
    expect(result.setGratingRoomLit).toBe(false);
  });

  it('CLOSE already-closed grate: reports already closed', () => {
    const result = grateAction('close', null, ROOM_GRATING_ROOM, false, state({ grateUnlocked: true }));
    expect(result.message).toMatch(/already closed/i);
  });
});

describe('grateAction — PUT', () => {
  it('small object fits through grating', () => {
    const result = grateAction('put', null, ROOM_GRATING_CLEARING, false, state(), true, 'leaflet');
    expect(result.message).toMatch(/goes through the grating into the darkness/i);
  });

  it('large object does not fit through grating', () => {
    const result = grateAction('put', null, ROOM_GRATING_CLEARING, false, state(), false, 'coffin');
    expect(result.message).toMatch(/won't fit through/i);
  });
});

// ---------------------------------------------------------------------------
// BOOM-ROOM — boomRoomCheck
// ---------------------------------------------------------------------------

describe('boomRoomCheck', () => {
  it('no flame: safe', () => {
    const result = boomRoomCheck(false, false, false, false, null);
    expect(result.explodes).toBe(false);
    expect(result.fatalMessage).toBeNull();
  });

  it('lit candles: explosion with accidental message', () => {
    const result = boomRoomCheck(true, false, false, false, null);
    expect(result.explodes).toBe(true);
    expect(result.fatalMessage).toMatch(/coal gas/i);
    expect(result.fatalMessage).toMatch(/BOOOOOOOOOOOM/);
  });

  it('lit torch: explosion', () => {
    const result = boomRoomCheck(false, true, false, false, null);
    expect(result.explodes).toBe(true);
  });

  it('lit match: explosion', () => {
    const result = boomRoomCheck(false, false, true, false, null);
    expect(result.explodes).toBe(true);
  });

  it('deliberate lighting of candles: "aspiring adventurer" message', () => {
    const result = boomRoomCheck(true, false, false, true, 'candles');
    expect(result.explodes).toBe(true);
    expect(result.fatalMessage).toMatch(/aspiring adventurer/i);
    expect(result.fatalMessage).toMatch(/candles/i);
    expect(result.fatalMessage).toMatch(/BOOOOOOOOOOOM/);
  });
});

// ---------------------------------------------------------------------------
// MACHINE-F — machineAction
// ---------------------------------------------------------------------------

describe('machineAction — TAKE', () => {
  it('machine cannot be taken', () => {
    const result = machineAction('take', state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/far too large/i);
  });
});

describe('machineAction — OPEN', () => {
  it('opens machine with coal inside: shows coal in description', () => {
    const result = machineAction('open', state({ machineContents: 'coal' }));
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/coal/i);
    expect(result.newState.machineOpen).toBe(true);
  });

  it('opens empty machine: generic open message', () => {
    const result = machineAction('open', state({ machineContents: 'empty' }));
    expect(result.message).toMatch(/^The lid opens\.$/i);
    expect(result.newState.machineOpen).toBe(true);
  });

  it('opening already-open machine: reports already open', () => {
    const result = machineAction('open', state({ machineOpen: true }));
    expect(result.message).toMatch(/already open/i);
    expect(result.newState.machineOpen).toBe(true);
  });
});

describe('machineAction — CLOSE', () => {
  it('closes the machine', () => {
    const result = machineAction('close', state({ machineOpen: true }));
    expect(result.newState.machineOpen).toBe(false);
    expect(result.message).toMatch(/closes/i);
  });

  it('closing already-closed machine: reports already closed', () => {
    const result = machineAction('close', state({ machineOpen: false }));
    expect(result.message).toMatch(/already closed/i);
  });
});

describe('machineAction — LAMP-ON', () => {
  it('LAMP-ON without instrument: bare-hands message', () => {
    const result = machineAction('lamp-on', state(), null);
    expect(result.message).toMatch(/bare hands/i);
  });

  it('LAMP-ON with screwdriver: delegates to switch action', () => {
    const result = machineAction('lamp-on', state({ machineOpen: false, machineContents: 'coal' }), 'SCREWDRIVER');
    expect(result.newState.machineContents).toBe('diamond');
  });
});

// ---------------------------------------------------------------------------
// MSWITCH-FUNCTION — machineSwitchAction
// ---------------------------------------------------------------------------

describe('machineSwitchAction', () => {
  it('TURN with screwdriver, closed, coal → diamond', () => {
    const result = machineSwitchAction('SCREWDRIVER', state({ machineOpen: false, machineContents: 'coal' }));
    expect(result.handled).toBe(true);
    expect(result.newState.machineContents).toBe('diamond');
    expect(result.message).toMatch(/dazzling display/i);
  });

  it('TURN with screwdriver, closed, no coal → gunk', () => {
    const result = machineSwitchAction('SCREWDRIVER', state({ machineOpen: false, machineContents: 'empty' }));
    expect(result.newState.machineContents).toBe('gunk');
  });

  it('TURN with screwdriver, closed, diamond → gunk', () => {
    const result = machineSwitchAction('SCREWDRIVER', state({ machineOpen: false, machineContents: 'diamond' }));
    expect(result.newState.machineContents).toBe('gunk');
  });

  it('TURN with screwdriver but machine open: refuses', () => {
    const result = machineSwitchAction('SCREWDRIVER', state({ machineOpen: true }));
    expect(result.newState.machineContents).toBe('coal'); // unchanged
    expect(result.message).toMatch(/doesn't seem to want to do anything/i);
  });

  it('TURN with wrong instrument: refuses', () => {
    const result = machineSwitchAction('HANDS', state({ machineOpen: false }));
    expect(result.message).toMatch(/won't do/i);
    expect(result.newState.machineContents).toBe('coal');
  });

  it('TURN with null instrument: refuses', () => {
    const result = machineSwitchAction(null, state());
    expect(result.message).toMatch(/won't do/i);
  });

  it('does not mutate original state', () => {
    const s = state({ machineContents: 'coal' });
    machineSwitchAction('SCREWDRIVER', s);
    expect(s.machineContents).toBe('coal');
  });
});

// ---------------------------------------------------------------------------
// gunkAction
// ---------------------------------------------------------------------------

describe('gunkAction', () => {
  it('crumbles gunk and signals removal', () => {
    const result = gunkAction();
    expect(result.removeGunk).toBe(true);
    expect(result.message).toMatch(/crumbles into dust/i);
  });
});
