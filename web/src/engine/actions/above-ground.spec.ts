import {
  ActionState,
  boardHandler,
  mailboxHandler,
  kitchenWindowHandler,
  whiteHouseHandler,
  forestHandler,
  treeHandler,
} from './above-ground';
import { ObjectFlag, RoomFlag } from '../types';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeState(
  overrides: Partial<ActionState> & { verb?: string } = {},
): ActionState {
  return {
    objectLocations: new Map<string, string>(),
    flagOverrides: new Map<string, Set<ObjectFlag | RoomFlag>>(),
    score: 0,
    moves: 0,
    winner: 'PLAYER',
    here: 'WEST-OF-HOUSE',
    verb: 'EXAMINE',
    globals: {},
    ...overrides,
  };
}

/** Set a flag in flagOverrides for a given object. */
function withFlag(
  id: string,
  flag: ObjectFlag | RoomFlag,
  state: ActionState,
): ActionState {
  const current = state.flagOverrides.has(id)
    ? new Set(state.flagOverrides.get(id)!)
    : new Set<ObjectFlag | RoomFlag>();
  current.add(flag);
  const flagOverrides = new Map(state.flagOverrides);
  flagOverrides.set(id, current);
  return { ...state, flagOverrides };
}

// ---------------------------------------------------------------------------
// boardHandler
// ---------------------------------------------------------------------------

describe('boardHandler', () => {
  it('TAKE returns boards-fastened message', () => {
    const [s, msg] = boardHandler(makeState({ verb: 'TAKE' }));
    expect(msg).toBe('The boards are securely fastened.');
    expect(s.here).toBe('WEST-OF-HOUSE');
  });

  it('EXAMINE returns boards-fastened message', () => {
    const [, msg] = boardHandler(makeState({ verb: 'EXAMINE' }));
    expect(msg).toBe('The boards are securely fastened.');
  });

  it('MOVE falls through (empty string)', () => {
    const [, msg] = boardHandler(makeState({ verb: 'MOVE' }));
    expect(msg).toBe('');
  });

  it('does not mutate state', () => {
    const s0 = makeState({ verb: 'TAKE' });
    boardHandler(s0);
    expect(s0.here).toBe('WEST-OF-HOUSE');
  });
});

// ---------------------------------------------------------------------------
// mailboxHandler
// ---------------------------------------------------------------------------

describe('mailboxHandler', () => {
  it('TAKE MAILBOX is securely anchored', () => {
    const [, msg] = mailboxHandler(makeState({ verb: 'TAKE' }), 'MAILBOX');
    expect(msg).toBe('It is securely anchored.');
  });

  it('TAKE ADVERTISEMENT (taking from inside mailbox) falls through', () => {
    const [, msg] = mailboxHandler(makeState({ verb: 'TAKE' }), 'ADVERTISEMENT');
    expect(msg).toBe('');
  });

  it('OPEN MAILBOX falls through (handled by default container logic)', () => {
    const [, msg] = mailboxHandler(makeState({ verb: 'OPEN' }), 'MAILBOX');
    expect(msg).toBe('');
  });

  it('EXAMINE MAILBOX falls through', () => {
    const [, msg] = mailboxHandler(makeState({ verb: 'EXAMINE' }), 'MAILBOX');
    expect(msg).toBe('');
  });

  it('state is unchanged after TAKE MAILBOX', () => {
    const s0 = makeState({ verb: 'TAKE' });
    const [s1] = mailboxHandler(s0, 'MAILBOX');
    expect(s1.score).toBe(s0.score);
    expect(s1.here).toBe(s0.here);
  });
});

// ---------------------------------------------------------------------------
// kitchenWindowHandler
// ---------------------------------------------------------------------------

describe('kitchenWindowHandler — OPEN / CLOSE', () => {
  it('OPEN when closed sets OPENBIT and returns open message', () => {
    const s0 = makeState({ verb: 'OPEN', here: 'EAST-OF-HOUSE' });
    const [s1, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('With great effort, you open the window far enough to allow entry.');
    // OPENBIT now set on KITCHEN-WINDOW
    const flags = s1.flagOverrides.get('KITCHEN-WINDOW');
    expect(flags?.has(ObjectFlag.OPENBIT)).toBe(true);
  });

  it('OPEN when already open returns already-open message', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT,
      makeState({ verb: 'OPEN', here: 'EAST-OF-HOUSE' }));
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe("That's already open.");
  });

  it('CLOSE when open clears OPENBIT and returns close message', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT,
      makeState({ verb: 'CLOSE', here: 'EAST-OF-HOUSE' }));
    const [s1, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('The window closes (more easily than it opened).');
    const flags = s1.flagOverrides.get('KITCHEN-WINDOW');
    expect(flags?.has(ObjectFlag.OPENBIT)).toBe(false);
  });

  it('CLOSE when already closed returns already-closed message', () => {
    const s0 = makeState({ verb: 'CLOSE', here: 'EAST-OF-HOUSE' });
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe("That's already closed.");
  });

  it('OPEN sets KITCHEN-WINDOW-FLAG global', () => {
    const s0 = makeState({ verb: 'OPEN' });
    const [s1] = kitchenWindowHandler(s0);
    expect(s1.globals['KITCHEN-WINDOW-FLAG']).toBe(true);
  });

  it('CLOSE sets KITCHEN-WINDOW-FLAG global', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT, makeState({ verb: 'CLOSE' }));
    const [s1] = kitchenWindowHandler(s0);
    expect(s1.globals['KITCHEN-WINDOW-FLAG']).toBe(true);
  });
});

describe('kitchenWindowHandler — EXAMINE', () => {
  it('EXAMINE before interaction returns slightly-ajar message', () => {
    const s0 = makeState({ verb: 'EXAMINE' });
    // KITCHEN-WINDOW-FLAG is false by default
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('The window is slightly ajar, but not enough to allow entry.');
  });

  it('EXAMINE after window has been touched falls through', () => {
    const s0 = makeState({ verb: 'EXAMINE', globals: { 'KITCHEN-WINDOW-FLAG': true } });
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('');
  });
});

describe('kitchenWindowHandler — WALK / THROUGH', () => {
  it('THROUGH when open from EAST-OF-HOUSE moves player to KITCHEN', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT,
      makeState({ verb: 'THROUGH', here: 'EAST-OF-HOUSE' }));
    const [s1, msg] = kitchenWindowHandler(s0);
    expect(s1.here).toBe('KITCHEN');
    expect(msg).toBe('');
  });

  it('WALK when open from KITCHEN moves player to EAST-OF-HOUSE', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT,
      makeState({ verb: 'WALK', here: 'KITCHEN' }));
    const [s1, msg] = kitchenWindowHandler(s0);
    expect(s1.here).toBe('EAST-OF-HOUSE');
    expect(msg).toBe('');
  });

  it('THROUGH when closed returns window-closed message', () => {
    const s0 = makeState({ verb: 'THROUGH', here: 'EAST-OF-HOUSE' });
    const [s1, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('The window is closed.');
    expect(s1.here).toBe('EAST-OF-HOUSE');
  });

  it('BOARD when closed returns window-closed message', () => {
    const s0 = makeState({ verb: 'BOARD', here: 'EAST-OF-HOUSE' });
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('The window is closed.');
  });
});

describe('kitchenWindowHandler — LOOK-INSIDE', () => {
  it('LOOK-INSIDE from EAST-OF-HOUSE describes the kitchen', () => {
    const s0 = makeState({ verb: 'LOOK-INSIDE', here: 'EAST-OF-HOUSE' });
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('You can see what appears to be a kitchen.');
  });

  it('LOOK-INSIDE from KITCHEN describes the outside', () => {
    const s0 = makeState({ verb: 'LOOK-INSIDE', here: 'KITCHEN' });
    const [, msg] = kitchenWindowHandler(s0);
    expect(msg).toBe('You can see a clear area leading towards a forest.');
  });
});

// ---------------------------------------------------------------------------
// whiteHouseHandler
// ---------------------------------------------------------------------------

describe('whiteHouseHandler — inside the house', () => {
  it('FIND from KITCHEN returns brains joke', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'FIND', here: 'KITCHEN' }));
    expect(msg).toBe('Why not find your brains?');
  });

  it('FIND from LIVING-ROOM returns brains joke', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'FIND', here: 'LIVING-ROOM' }));
    expect(msg).toBe('Why not find your brains?');
  });

  it('FIND from ATTIC returns brains joke', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'FIND', here: 'ATTIC' }));
    expect(msg).toBe('Why not find your brains?');
  });

  it('WALK-AROUND from KITCHEN moves to ATTIC', () => {
    const [s1, msg] = whiteHouseHandler(makeState({ verb: 'WALK-AROUND', here: 'KITCHEN' }));
    expect(s1.here).toBe('ATTIC');
    expect(msg).toBe('');
  });

  it('WALK-AROUND from LIVING-ROOM moves to KITCHEN', () => {
    const [s1] = whiteHouseHandler(makeState({ verb: 'WALK-AROUND', here: 'LIVING-ROOM' }));
    expect(s1.here).toBe('KITCHEN');
  });

  it('other verb from inside falls through', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'BURN', here: 'KITCHEN' }));
    expect(msg).toBe('');
  });
});

describe('whiteHouseHandler — near the house', () => {
  it('FIND from WEST-OF-HOUSE returns right-here message', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'FIND', here: 'WEST-OF-HOUSE' }));
    expect(msg).toBe("It's right here! Are you blind or something?");
  });

  it('EXAMINE returns house description', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'EXAMINE', here: 'NORTH-OF-HOUSE' }));
    expect(msg).toContain('beautiful colonial house');
    expect(msg).toContain('extremely wealthy');
  });

  it('WALK-AROUND from WEST-OF-HOUSE moves to NORTH-OF-HOUSE', () => {
    const [s1] = whiteHouseHandler(makeState({ verb: 'WALK-AROUND', here: 'WEST-OF-HOUSE' }));
    expect(s1.here).toBe('NORTH-OF-HOUSE');
  });

  it('WALK-AROUND cycles: N→E→S→W', () => {
    const sides = ['WEST-OF-HOUSE', 'NORTH-OF-HOUSE', 'EAST-OF-HOUSE', 'SOUTH-OF-HOUSE'];
    const expected = ['NORTH-OF-HOUSE', 'EAST-OF-HOUSE', 'SOUTH-OF-HOUSE', 'WEST-OF-HOUSE'];
    sides.forEach((start, i) => {
      const [s1] = whiteHouseHandler(makeState({ verb: 'WALK-AROUND', here: start }));
      expect(s1.here).toBe(expected[i]);
    });
  });

  it('THROUGH from EAST-OF-HOUSE with window open moves to KITCHEN', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT,
      makeState({ verb: 'THROUGH', here: 'EAST-OF-HOUSE' }));
    const [s1, msg] = whiteHouseHandler(s0);
    expect(s1.here).toBe('KITCHEN');
    expect(msg).toBe('');
  });

  it('THROUGH from EAST-OF-HOUSE with window closed returns window-closed', () => {
    const s0 = makeState({ verb: 'THROUGH', here: 'EAST-OF-HOUSE' });
    const [s1, msg] = whiteHouseHandler(s0);
    expect(s1.here).toBe('EAST-OF-HOUSE');
    expect(msg).toBe('The window is closed.');
  });

  it('OPEN from EAST-OF-HOUSE with window open moves to KITCHEN', () => {
    const s0 = withFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT,
      makeState({ verb: 'OPEN', here: 'EAST-OF-HOUSE' }));
    const [s1] = whiteHouseHandler(s0);
    expect(s1.here).toBe('KITCHEN');
  });

  it('THROUGH from WEST-OF-HOUSE returns cant-get-in message', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'THROUGH', here: 'WEST-OF-HOUSE' }));
    expect(msg).toBe("I can't see how to get in from here.");
  });

  it('BURN returns joking message', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'BURN', here: 'WEST-OF-HOUSE' }));
    expect(msg).toBe('You must be joking.');
  });
});

describe('whiteHouseHandler — away from the house', () => {
  it('FIND from CLEARING gives directional hint', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'FIND', here: 'CLEARING' }));
    expect(msg).toBe('It seems to be to the west.');
  });

  it('FIND from unrelated room gives vague hint', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'FIND', here: 'FOREST-1' }));
    expect(msg).toBe('It was here just a minute ago....');
  });

  it('non-FIND verb from unrelated room returns not-at-house message', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'EXAMINE', here: 'CELLAR' }));
    expect(msg).toBe("You're not at the house.");
  });

  it('WALK-AROUND from unrelated room returns not-at-house message', () => {
    const [, msg] = whiteHouseHandler(makeState({ verb: 'WALK-AROUND', here: 'TROLL-ROOM' }));
    expect(msg).toBe("You're not at the house.");
  });
});

// ---------------------------------------------------------------------------
// forestHandler
// ---------------------------------------------------------------------------

describe('forestHandler — WALK-AROUND', () => {
  it('WALK-AROUND from near house returns not-in-forest message', () => {
    for (const here of ['WEST-OF-HOUSE', 'NORTH-OF-HOUSE', 'SOUTH-OF-HOUSE', 'EAST-OF-HOUSE']) {
      const [, msg] = forestHandler(makeState({ verb: 'WALK-AROUND', here }));
      expect(msg).toBe("You aren't even in the forest.");
    }
  });

  it('WALK-AROUND from FOREST-1 moves to FOREST-2', () => {
    const [s1, msg] = forestHandler(makeState({ verb: 'WALK-AROUND', here: 'FOREST-1' }));
    expect(s1.here).toBe('FOREST-2');
    expect(msg).toBe('');
  });

  it('WALK-AROUND cycles: F1→F2→F3→PATH→CLEARING→F1', () => {
    const cycle = ['FOREST-1', 'FOREST-2', 'FOREST-3', 'PATH', 'CLEARING'];
    const expected = ['FOREST-2', 'FOREST-3', 'PATH', 'CLEARING', 'FOREST-1'];
    cycle.forEach((start, i) => {
      const [s1] = forestHandler(makeState({ verb: 'WALK-AROUND', here: start }));
      expect(s1.here).toBe(expected[i]);
    });
  });

  it('WALK-AROUND from room not in FOREST-AROUND falls through', () => {
    const [s1, msg] = forestHandler(makeState({ verb: 'WALK-AROUND', here: 'CELLAR' }));
    expect(msg).toBe('');
    expect(s1.here).toBe('CELLAR');
  });
});

describe('forestHandler — other verbs', () => {
  it('DISEMBARK returns specify-direction message', () => {
    const [, msg] = forestHandler(makeState({ verb: 'DISEMBARK', here: 'FOREST-1' }));
    expect(msg).toBe('You will have to specify a direction.');
  });

  it('FIND returns cannot-see-forest message', () => {
    const [, msg] = forestHandler(makeState({ verb: 'FIND', here: 'FOREST-2' }));
    expect(msg).toBe('You cannot see the forest for the trees.');
  });

  it('LISTEN returns murmuring message', () => {
    const [, msg] = forestHandler(makeState({ verb: 'LISTEN', here: 'FOREST-3' }));
    expect(msg).toBe('The pines and the hemlocks seem to be murmuring.');
  });

  it('EXAMINE falls through', () => {
    const [, msg] = forestHandler(makeState({ verb: 'EXAMINE', here: 'FOREST-1' }));
    expect(msg).toBe('');
  });
});

// ---------------------------------------------------------------------------
// treeHandler
// ---------------------------------------------------------------------------

describe('treeHandler — CLIMB / CLIMB-UP', () => {
  it('CLIMB from PATH moves player to UP-A-TREE', () => {
    const [s1, msg] = treeHandler(makeState({ verb: 'CLIMB', here: 'PATH' }));
    expect(s1.here).toBe('UP-A-TREE');
    expect(msg).toBe('');
  });

  it('CLIMB-UP from PATH moves player to UP-A-TREE', () => {
    const [s1] = treeHandler(makeState({ verb: 'CLIMB-UP', here: 'PATH' }));
    expect(s1.here).toBe('UP-A-TREE');
  });

  it('CLIMB from UP-A-TREE returns branch-above-reach message', () => {
    const [s1, msg] = treeHandler(makeState({ verb: 'CLIMB', here: 'UP-A-TREE' }));
    expect(msg).toBe('The nearest branch above you is above your reach.');
    expect(s1.here).toBe('UP-A-TREE');
  });

  it('CLIMB from FOREST-1 returns no-tree-here message', () => {
    const [, msg] = treeHandler(makeState({ verb: 'CLIMB', here: 'FOREST-1' }));
    expect(msg).toBe('There is no tree here suitable for climbing.');
  });

  it('CLIMB from FOREST-2 returns no-tree-here message', () => {
    const [, msg] = treeHandler(makeState({ verb: 'CLIMB', here: 'FOREST-2' }));
    expect(msg).toBe('There is no tree here suitable for climbing.');
  });
});

describe('treeHandler — CLIMB-DOWN', () => {
  it('CLIMB-DOWN from UP-A-TREE moves player to PATH', () => {
    const [s1, msg] = treeHandler(makeState({ verb: 'CLIMB-DOWN', here: 'UP-A-TREE' }));
    expect(s1.here).toBe('PATH');
    expect(msg).toBe('');
  });

  it('CLIMB-DOWN from PATH returns no-tree-to-climb-down message', () => {
    const [s1, msg] = treeHandler(makeState({ verb: 'CLIMB-DOWN', here: 'PATH' }));
    expect(msg).toBe('There is no tree here to climb down from.');
    expect(s1.here).toBe('PATH');
  });

  it('CLIMB-DOWN from unrelated room returns no-tree-to-climb-down message', () => {
    const [, msg] = treeHandler(makeState({ verb: 'CLIMB-DOWN', here: 'CELLAR' }));
    expect(msg).toBe('There is no tree here to climb down from.');
  });
});

describe('treeHandler — other verbs', () => {
  it('EXAMINE falls through', () => {
    const [, msg] = treeHandler(makeState({ verb: 'EXAMINE', here: 'PATH' }));
    expect(msg).toBe('');
  });

  it('TAKE falls through', () => {
    const [, msg] = treeHandler(makeState({ verb: 'TAKE', here: 'PATH' }));
    expect(msg).toBe('');
  });
});

// ---------------------------------------------------------------------------
// Immutability — handlers must not mutate their input
// ---------------------------------------------------------------------------

describe('handlers are pure (no input mutation)', () => {
  it('kitchenWindowHandler does not mutate state on OPEN', () => {
    const s0 = makeState({ verb: 'OPEN' });
    const original = { ...s0, flagOverrides: new Map(s0.flagOverrides) };
    kitchenWindowHandler(s0);
    expect(s0.flagOverrides).toEqual(original.flagOverrides);
  });

  it('whiteHouseHandler does not mutate state on WALK-AROUND', () => {
    const s0 = makeState({ verb: 'WALK-AROUND', here: 'WEST-OF-HOUSE' });
    whiteHouseHandler(s0);
    expect(s0.here).toBe('WEST-OF-HOUSE');
  });

  it('treeHandler does not mutate state on CLIMB', () => {
    const s0 = makeState({ verb: 'CLIMB', here: 'PATH' });
    treeHandler(s0);
    expect(s0.here).toBe('PATH');
  });
});
