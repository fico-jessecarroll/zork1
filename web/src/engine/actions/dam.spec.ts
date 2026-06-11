import {
  initialDamState,
  DamState,
  boltAction,
  buttonAction,
  damFunction,
  iREmpty,
  iRFill,
  river4EndAction,
  damRoomLookDesc,
  reservoirLookDesc,
  reservoirSouthLookDesc,
  reservoirNorthLookDesc,
} from './dam';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function state(overrides: Partial<DamState> = {}): DamState {
  return { ...initialDamState, ...overrides };
}

// ---------------------------------------------------------------------------
// boltAction — BOLT-F
// ---------------------------------------------------------------------------

describe('boltAction — TURN', () => {
  it('refuses to turn without wrench', () => {
    const result = boltAction('TURN', 'HANDS', state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/bolt won't turn using/i);
    expect(result.state.gatesOpen).toBe(false);
  });

  it('refuses with no instrument', () => {
    const result = boltAction('TURN', null, state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/bolt won't turn using/i);
  });

  it('opens sluice gates when closed', () => {
    const result = boltAction('TURN', 'WRENCH', state({ gatesOpen: false }));
    expect(result.handled).toBe(true);
    expect(result.state.gatesOpen).toBe(true);
    expect(result.message).toMatch(/sluice gates open/i);
    expect(result.scheduleREmpty).toBe(8);
    expect(result.scheduleRFill).toBeUndefined();
  });

  it('closes sluice gates when open', () => {
    const result = boltAction('TURN', 'WRENCH', state({ gatesOpen: true }));
    expect(result.handled).toBe(true);
    expect(result.state.gatesOpen).toBe(false);
    expect(result.message).toMatch(/sluice gates close/i);
    expect(result.scheduleRFill).toBe(8);
    expect(result.scheduleREmpty).toBeUndefined();
  });

  it('does not mutate the original state', () => {
    const original = state({ gatesOpen: false });
    boltAction('TURN', 'WRENCH', original);
    expect(original.gatesOpen).toBe(false);
  });
});

describe('boltAction — TAKE / OIL', () => {
  it('TAKE returns integral-part message', () => {
    const result = boltAction('TAKE', null, state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/integral part/i);
    expect(result.state).toEqual(state());
  });

  it('OIL returns glue message', () => {
    const result = boltAction('OIL', null, state());
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/glue/i);
  });
});

// ---------------------------------------------------------------------------
// buttonAction — BUTTON-F
// ---------------------------------------------------------------------------

describe('buttonAction — READ', () => {
  it('returns "greek to you" for READ verb', () => {
    const result = buttonAction('READ', 'YELLOW', state(), 0);
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/greek/i);
  });
});

describe('buttonAction — PUSH', () => {
  it('YELLOW button activates gate indicator light', () => {
    const result = buttonAction('PUSH', 'YELLOW', state({ gateFlag: false }), 0);
    expect(result.handled).toBe(true);
    expect(result.state.gateFlag).toBe(true);
    expect(result.message).toBe('Click.');
  });

  it('BROWN button deactivates gate indicator light', () => {
    const result = buttonAction('PUSH', 'BROWN', state({ gateFlag: true }), 0);
    expect(result.handled).toBe(true);
    expect(result.state.gateFlag).toBe(false);
    expect(result.message).toBe('Click.');
  });

  it('BLUE button starts maintenance-room leak when waterLevel is 0', () => {
    const result = buttonAction('PUSH', 'BLUE', state(), 0);
    expect(result.handled).toBe(true);
    expect(result.startLeak).toBe(true);
    expect(result.message).toMatch(/burst from the east wall/i);
  });

  it('BLUE button is jammed when waterLevel > 0', () => {
    const result = buttonAction('PUSH', 'BLUE', state(), 2);
    expect(result.startLeak).toBeFalsy();
    expect(result.message).toMatch(/jammed/i);
  });

  it('RED button signals light toggle', () => {
    const result = buttonAction('PUSH', 'RED', state(), 0);
    expect(result.handled).toBe(true);
    expect(result.toggleLights).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// damFunction — DAM-FUNCTION
// ---------------------------------------------------------------------------

describe('damFunction', () => {
  it('OPEN returns "Sounds reasonable" message', () => {
    const result = damFunction('OPEN', null);
    expect(result.handled).toBe(true);
    expect(result.message).toMatch(/sounds reasonable/i);
  });

  it('CLOSE returns "Sounds reasonable" message', () => {
    const result = damFunction('CLOSE', null);
    expect(result.message).toMatch(/sounds reasonable/i);
  });

  it('PLUG with hands returns little Dutch boy message', () => {
    const result = damFunction('PLUG', 'HANDS');
    expect(result.message).toMatch(/Dutch boy/i);
  });

  it('PLUG with other object returns size message', () => {
    const result = damFunction('PLUG', 'PUTTY');
    expect(result.message).toMatch(/how big this dam is/i);
  });
});

// ---------------------------------------------------------------------------
// iREmpty — reservoir drains after gates open for 8 turns
// ---------------------------------------------------------------------------

describe('iREmpty — opening sluice gate changes reservoir water level', () => {
  it('sets lowTide and reveals trunk', () => {
    const result = iREmpty(state({ gatesOpen: true }), 'DAM-ROOM', false);
    expect(result.fatal).toBe(false);
    expect(result.state.lowTide).toBe(true);
    expect(result.state.trunkVisible).toBe(true);
    expect(result.state.gatesOpen).toBe(true);
  });

  it('produces crossing message at RESERVOIR-SOUTH', () => {
    const result = iREmpty(state({ gatesOpen: true }), 'RESERVOIR-SOUTH', false);
    expect(result.message).toMatch(/easily cross/i);
  });

  it('produces crossing message at RESERVOIR-NORTH', () => {
    const result = iREmpty(state({ gatesOpen: true }), 'RESERVOIR-NORTH', false);
    expect(result.message).toMatch(/easily cross/i);
  });

  it('produces quieter-water message at DEEP-CANYON', () => {
    const result = iREmpty(state({ gatesOpen: true }), 'DEEP-CANYON', false);
    expect(result.message).toMatch(/quieter/i);
  });

  it('produces no message for unrelated rooms', () => {
    const result = iREmpty(state({ gatesOpen: true }), 'DAM-LOBBY', false);
    expect(result.message).toBeNull();
  });

  it('warns about sunken boat when player in reservoir with vehicle', () => {
    const result = iREmpty(state({ gatesOpen: true }), 'RESERVOIR', true);
    expect(result.fatal).toBe(false);
    expect(result.message).toMatch(/sinks into the mud/i);
    expect(result.state.lowTide).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// iRFill — reservoir fills after gates close for 8 turns
// ---------------------------------------------------------------------------

describe('iRFill — closing sluice gate refills reservoir', () => {
  it('clears lowTide and hides trunk', () => {
    const result = iRFill(
      state({ gatesOpen: false, lowTide: true, trunkVisible: true }),
      'DAM-ROOM',
      false,
    );
    expect(result.state.lowTide).toBe(false);
    expect(result.state.trunkVisible).toBe(false);
    expect(result.fatal).toBe(false);
  });

  it('is fatal for player in reservoir without vehicle', () => {
    const result = iRFill(
      state({ gatesOpen: false, lowTide: true }),
      'RESERVOIR',
      false,
    );
    expect(result.fatal).toBe(true);
  });

  it('produces floating-boat message in reservoir with vehicle', () => {
    const result = iRFill(
      state({ gatesOpen: false, lowTide: true }),
      'RESERVOIR',
      true,
    );
    expect(result.fatal).toBe(false);
    expect(result.message).toMatch(/floating/i);
  });

  it('produces impossible-to-cross message at RESERVOIR-SOUTH', () => {
    const result = iRFill(
      state({ gatesOpen: false, lowTide: true }),
      'RESERVOIR-SOUTH',
      false,
    );
    expect(result.message).toMatch(/impossible to cross/i);
  });

  it('produces flowing-water sound at DEEP-CANYON', () => {
    const result = iRFill(
      state({ gatesOpen: false, lowTide: true }),
      'DEEP-CANYON',
      false,
    );
    expect(result.message).toMatch(/flowing water/i);
  });
});

// ---------------------------------------------------------------------------
// river4EndAction — RIVR4-ROOM M-END (buoy retrieval hint)
// ---------------------------------------------------------------------------

describe('river4EndAction — buoy retrieval when reservoir is drained', () => {
  it('delivers hint the first time player carries the buoy', () => {
    const result = river4EndAction(true, state({ buoyFlag: true }));
    expect(result.message).toMatch(/funny/i);
    expect(result.clearBuoyFlag).toBe(true);
  });

  it('delivers hint only once (buoyFlag already cleared)', () => {
    const result = river4EndAction(true, state({ buoyFlag: false }));
    expect(result.message).toBeNull();
    expect(result.clearBuoyFlag).toBe(false);
  });

  it('no hint when player is not carrying the buoy', () => {
    const result = river4EndAction(false, state({ buoyFlag: true }));
    expect(result.message).toBeNull();
    expect(result.clearBuoyFlag).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Room look descriptions
// ---------------------------------------------------------------------------

describe('damRoomLookDesc', () => {
  it('shows gates closed, reservoir full when both flags false', () => {
    const desc = damRoomLookDesc(state());
    expect(desc).toMatch(/sluice gates on the dam are closed/i);
    expect(desc).toMatch(/control panel/i);
  });

  it('shows glowing bubble when gateFlag is true', () => {
    const desc = damRoomLookDesc(state({ gateFlag: true }));
    expect(desc).toMatch(/glowing serenely/i);
  });

  it('shows no glow when gateFlag is false', () => {
    const desc = damRoomLookDesc(state({ gateFlag: false }));
    expect(desc).not.toMatch(/glowing/i);
  });

  it('shows gates open, high water when gatesOpen and not lowTide', () => {
    const desc = damRoomLookDesc(state({ gatesOpen: true, lowTide: false }));
    expect(desc).toMatch(/sluice gates are open/i);
    expect(desc).toMatch(/still high/i);
  });

  it('shows low water and open gates when both flags true', () => {
    const desc = damRoomLookDesc(state({ gatesOpen: true, lowTide: true }));
    expect(desc).toMatch(/water level behind the dam is low/i);
  });

  it('shows low tide rising when gates closed and lowTide true', () => {
    const desc = damRoomLookDesc(state({ gatesOpen: false, lowTide: true }));
    expect(desc).toMatch(/rising quickly/i);
  });
});

describe('reservoirLookDesc', () => {
  it('shows mud flat when lowTide', () => {
    const desc = reservoirLookDesc(state({ lowTide: true }));
    expect(desc).toMatch(/mud pile/i);
  });

  it('shows lake when not lowTide', () => {
    const desc = reservoirLookDesc(state({ lowTide: false }));
    expect(desc).toMatch(/lake/i);
  });
});

describe('reservoirSouthLookDesc', () => {
  it('all four state combinations produce distinct descriptions', () => {
    const s1 = reservoirSouthLookDesc(state({ gatesOpen: false, lowTide: false }));
    const s2 = reservoirSouthLookDesc(state({ gatesOpen: true, lowTide: false }));
    const s3 = reservoirSouthLookDesc(state({ gatesOpen: false, lowTide: true }));
    const s4 = reservoirSouthLookDesc(state({ gatesOpen: true, lowTide: true }));
    const descs = new Set([s1, s2, s3, s4]);
    expect(descs.size).toBe(4);
  });
});

describe('reservoirNorthLookDesc', () => {
  it('all four state combinations produce distinct descriptions', () => {
    const s1 = reservoirNorthLookDesc(state({ gatesOpen: false, lowTide: false }));
    const s2 = reservoirNorthLookDesc(state({ gatesOpen: true, lowTide: false }));
    const s3 = reservoirNorthLookDesc(state({ gatesOpen: false, lowTide: true }));
    const s4 = reservoirNorthLookDesc(state({ gatesOpen: true, lowTide: true }));
    const descs = new Set([s1, s2, s3, s4]);
    expect(descs.size).toBe(4);
  });
});
