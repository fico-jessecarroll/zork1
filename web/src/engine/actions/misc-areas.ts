/**
 * Miscellaneous area handlers: bat room, mirror rooms, grating, and coal mine.
 *
 * Mirrors the following ZIL routines from 1actions.zil:
 *   BAT-F, FLY-ME, BATS-ROOM, BAT-D                    (subtitle "COAL MINE")
 *   MIRROR-MIRROR, MIRROR-ROOM                          (subtitle "MIRROR, MIRROR, ON THE WALL")
 *   GRATE-FUNCTION, CLEARING-FCN, MAZE-11-FCN           (subtitle "GRATING/MAZE")
 *   BOOM-ROOM, MACHINE-F, MSWITCH-FUNCTION, GUNK-FUNCTION (subtitle "COAL MINE")
 *
 * All functions are pure: they accept state and return new state + messages.
 * Side-effecting operations (moving objects, updating room lit-bits) are
 * expressed as boolean flags in the result; the caller is responsible for
 * applying them to the world model.
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Contents of the coal-mine machine (press-o-matic). */
export type MachineContents = 'coal' | 'diamond' | 'gunk' | 'empty';

export interface MiscAreasState {
  /** GRUNLOCK: grate has been unlocked with the brass key */
  grateUnlocked: boolean;
  /** GRATE-REVEALED: leaves have been disturbed, exposing the grate */
  grateRevealed: boolean;
  /** MIRROR-MUNG: mirror has been broken (MUNG/THROW/ATTACK) */
  mirrorMung: boolean;
  /** LUCKY: set to false when the mirror is broken; affects death messages */
  lucky: boolean;
  /** OPENBIT on the coal-mine machine lid */
  machineOpen: boolean;
  /** What is currently inside the coal-mine machine */
  machineContents: MachineContents;
}

export const initialMiscAreasState: MiscAreasState = {
  grateUnlocked: false,
  grateRevealed: false,
  mirrorMung: false,
  lucky: true,
  machineOpen: false,
  machineContents: 'coal',
};

// ---------------------------------------------------------------------------
// Room / object ID constants
// ---------------------------------------------------------------------------

export const ROOM_MIRROR_1 = 'mirror-room-1';
export const ROOM_MIRROR_2 = 'mirror-room-2';

/** Underground room directly below the grating. */
export const ROOM_GRATING_ROOM = 'grating-room';

/** Surface clearing where the grating is embedded in the ground. */
export const ROOM_GRATING_CLEARING = 'grating-clearing';

/** Rooms the bat can deposit the player in (BAT-DROPS table). */
export const BAT_DROP_ROOMS = [
  'mine-1',
  'mine-2',
  'mine-3',
  'mine-4',
  'ladder-top',
  'ladder-bottom',
  'squeeky-room',
  'mine-entrance',
] as const;

export type BatDropRoom = (typeof BAT_DROP_ROOMS)[number];

// ---------------------------------------------------------------------------
// BAT-F / FLY-ME — vampire bat interaction
// ---------------------------------------------------------------------------

export interface BatActionResult {
  handled: boolean;
  messages: string[];
  /**
   * Non-null when the bat grabs the player.  The caller must move the player
   * (and their inventory) to this room.
   */
  newRoom: BatDropRoom | null;
  /**
   * Number of "    Fweep!" lines to emit before the grab message.
   * Mirrors the ZIL FWEEP routine: FWEEP(4) for FLY-ME, FWEEP(6) for TELL.
   * The ZIL loop prints N-1 lines, so fweepCount is the raw argument value.
   */
  fweepCount: number;
}

/**
 * BAT-F — action handler for the vampire bat object.
 *
 * garlicPresent: true if the garlic is in the player's inventory or the
 *                current room (EQUAL? <LOC ,GARLIC> ,WINNER ,HERE).
 * pickRoom: injected randomness — returns one element of BAT_DROP_ROOMS.
 */
export function batAction(
  verb: string,
  garlicPresent: boolean,
  pickRoom: () => BatDropRoom,
): BatActionResult {
  if (verb === 'tell') {
    return { handled: true, messages: [], newRoom: null, fweepCount: 6 };
  }

  if (verb === 'take' || verb === 'attack' || verb === 'mung') {
    if (garlicPresent) {
      return {
        handled: true,
        messages: ["You can't reach him; he's on the ceiling."],
        newRoom: null,
        fweepCount: 0,
      };
    }
    const newRoom = pickRoom();
    return {
      handled: true,
      messages: ['The bat grabs you by the scruff of your neck and lifts you away....'],
      newRoom,
      fweepCount: 4,
    };
  }

  return { handled: false, messages: [], newRoom: null, fweepCount: 0 };
}

/**
 * BAT-D — the bat's short description, printed when the room is looked at.
 *
 * When garlic is nearby the bat cowers on the ceiling; otherwise it swoops.
 */
export function batDescription(garlicPresent: boolean): string {
  return garlicPresent
    ? 'In the corner of the room on the ceiling is a large vampire bat who is obviously deranged and holding his nose.'
    : 'A large vampire bat, hanging from the ceiling, swoops down at you!';
}

// ---------------------------------------------------------------------------
// BATS-ROOM — M-ENTER room handler
// ---------------------------------------------------------------------------

export interface BatsRoomEnterResult {
  messages: string[];
  /** When non-null the player is grabbed; caller must update their position. */
  newRoom: BatDropRoom | null;
  fweepCount: number;
}

/**
 * BATS-ROOM M-ENTER: if the player is alive and has no garlic, the bat
 * immediately grabs them on entry and transports them to a random mine room.
 *
 * Mirrors the ZIL:
 *   (<AND <EQUAL? .RARG ,M-ENTER> <NOT ,DEAD>>
 *    <COND (<NOT <EQUAL? <LOC ,GARLIC> ,WINNER ,HERE>>
 *           <V-FIRST-LOOK> <CRLF> <FLY-ME>)>)
 */
export function batsRoomEnter(
  garlicPresent: boolean,
  isDead: boolean,
  pickRoom: () => BatDropRoom,
): BatsRoomEnterResult {
  if (isDead || garlicPresent) {
    return { messages: [], newRoom: null, fweepCount: 0 };
  }
  const newRoom = pickRoom();
  return {
    messages: ['The bat grabs you by the scruff of your neck and lifts you away....'],
    newRoom,
    fweepCount: 4,
  };
}

// ---------------------------------------------------------------------------
// MIRROR-MIRROR — rubbing/breaking the mirror
// ---------------------------------------------------------------------------

export interface MirrorActionResult {
  handled: boolean;
  messages: string[];
  /**
   * When non-null, the player is moved to this room.  The caller must also
   * swap all room-level objects between ROOM_MIRROR_1 and ROOM_MIRROR_2.
   */
  destination: typeof ROOM_MIRROR_1 | typeof ROOM_MIRROR_2 | null;
  newState: MiscAreasState;
}

/**
 * MIRROR-MIRROR — handles RUB, EXAMINE, LOOK-INSIDE, TAKE, MUNG, THROW,
 * and ATTACK on the mirror.
 *
 * here: the room the player is currently in (expected to be one of the mirror
 *       rooms when rubbing).
 * prsi: instrument used with RUB (null or 'hands' = bare hands → teleport).
 */
export function mirrorAction(
  verb: string,
  prsi: string | null,
  here: string,
  state: MiscAreasState,
): MirrorActionResult {
  const unchanged = (message: string): MirrorActionResult => ({
    handled: true,
    messages: [message],
    destination: null,
    newState: state,
  });

  if (verb === 'rub') {
    if (state.mirrorMung) {
      return unchanged("Haven't you done enough damage already?");
    }
    // Non-hands instrument → tingling sensation, no teleport
    if (prsi && prsi !== 'hands') {
      return unchanged(`You feel a faint tingling transmitted through the ${prsi}.`);
    }
    // Bare hands (or no instrument) → swap rooms and teleport player
    const destination =
      here === ROOM_MIRROR_2 ? ROOM_MIRROR_1 : ROOM_MIRROR_2;
    return {
      handled: true,
      messages: ['There is a rumble from deep within the earth and the room shakes.'],
      destination,
      newState: state,
    };
  }

  if (verb === 'look-inside' || verb === 'examine') {
    const msg = state.mirrorMung
      ? 'The mirror is broken into many pieces.'
      : 'There is an ugly person staring back at you.';
    return unchanged(msg);
  }

  if (verb === 'take') {
    return unchanged('The mirror is many times your size. Give up.');
  }

  if (verb === 'mung' || verb === 'throw' || verb === 'attack') {
    if (state.mirrorMung) {
      return unchanged("Haven't you done enough damage already?");
    }
    return {
      handled: true,
      messages: [
        "You have broken the mirror. I hope you have a seven years' supply of\ngood luck handy.",
      ],
      destination: null,
      newState: { ...state, mirrorMung: true, lucky: false },
    };
  }

  return { handled: false, messages: [], destination: null, newState: state };
}

/**
 * MIRROR-ROOM M-LOOK extra text — appended to the room description when the
 * mirror has been smashed.
 */
export function mirrorRoomLookExtra(state: MiscAreasState): string | null {
  return state.mirrorMung
    ? 'Unfortunately, the mirror has been destroyed by your recklessness.'
    : null;
}

// ---------------------------------------------------------------------------
// GRATE-FUNCTION — grating lock / unlock / open / close
// ---------------------------------------------------------------------------

export interface GrateActionResult {
  handled: boolean;
  message: string;
  newState: MiscAreasState;
  /** Caller should set ONBIT on grating-room (sunlight pours in). */
  setGratingRoomLit: boolean;
  /** Caller should clear ONBIT on grating-room. */
  clearGratingRoomLit: boolean;
  /** Caller should move the LEAVES object into the current room. */
  moveLeaves: boolean;
}

const NO_SIDE_EFFECTS = {
  setGratingRoomLit: false,
  clearGratingRoomLit: false,
  moveLeaves: false,
};

/**
 * GRATE-FUNCTION — handles OPEN, CLOSE, LOCK, UNLOCK, PICK, and PUT on the
 * grating object.
 *
 * here: player's current room id — expected to be ROOM_GRATING_ROOM (below)
 *       or ROOM_GRATING_CLEARING (above).
 * isGrateOpen: current OPENBIT state of the grate object.
 * prsi: instrument (e.g. 'KEYS', or null).
 * objectFitsGrate: for PUT — true when the object's size <= 20.  Pass
 *                  undefined / true when the verb is not PUT.
 * prsoDesc: human-readable name of the PUT object, used in the message.
 */
export function grateAction(
  verb: string,
  prsi: string | null,
  here: string,
  isGrateOpen: boolean,
  state: MiscAreasState,
  objectFitsGrate?: boolean,
  prsoDesc?: string,
): GrateActionResult {
  const unchanged = (message: string): GrateActionResult => ({
    handled: true,
    message,
    newState: state,
    ...NO_SIDE_EFFECTS,
  });

  // OPEN GRATE WITH KEYS → treat as UNLOCK (ZIL: PERFORM V?UNLOCK)
  if (verb === 'open' && prsi === 'KEYS') {
    return grateAction('unlock', prsi, here, isGrateOpen, state);
  }

  if (verb === 'pick') {
    return unchanged("You can't pick the lock.");
  }

  if (verb === 'lock') {
    if (here === ROOM_GRATING_ROOM) {
      return {
        handled: true,
        message: 'The grate is locked.',
        newState: { ...state, grateUnlocked: false },
        ...NO_SIDE_EFFECTS,
      };
    }
    if (here === ROOM_GRATING_CLEARING) {
      return unchanged("You can't lock it from this side.");
    }
    return unchanged("You can't lock it from here.");
  }

  if (verb === 'unlock') {
    if (prsi === 'KEYS') {
      if (here === ROOM_GRATING_ROOM) {
        return {
          handled: true,
          message: 'The grate is unlocked.',
          newState: { ...state, grateUnlocked: true },
          ...NO_SIDE_EFFECTS,
        };
      }
      if (here === ROOM_GRATING_CLEARING) {
        return unchanged("You can't reach the lock from here.");
      }
    }
    const withWhat = prsi ? `a ${prsi}` : 'that';
    return unchanged(`Can you unlock a grating with ${withWhat}?`);
  }

  if (verb === 'open' || verb === 'close') {
    if (!state.grateUnlocked) {
      return unchanged('The grating is locked.');
    }
    if (verb === 'open') {
      if (isGrateOpen) {
        return unchanged("It's already open.");
      }
      const openMsg =
        here === ROOM_GRATING_CLEARING
          ? 'The grating opens.'
          : 'The grating opens to reveal trees above you.';
      // From underground (or clearing after leaves already revealed): leaves fall
      const needLeaves = here !== ROOM_GRATING_CLEARING && !state.grateRevealed;
      const leavesMsg = needLeaves
        ? '\nA pile of leaves falls onto your head and to the ground.'
        : '';
      return {
        handled: true,
        message: openMsg + leavesMsg,
        newState: needLeaves ? { ...state, grateRevealed: true } : state,
        setGratingRoomLit: true,
        clearGratingRoomLit: false,
        moveLeaves: needLeaves,
      };
    }
    // close
    if (!isGrateOpen) {
      return unchanged("It's already closed.");
    }
    return {
      handled: true,
      message: 'The grating is closed.',
      newState: state,
      setGratingRoomLit: false,
      clearGratingRoomLit: true,
      moveLeaves: false,
    };
  }

  if (verb === 'put') {
    if (objectFitsGrate === false) {
      return unchanged("It won't fit through the grating.");
    }
    const desc = prsoDesc ?? 'it';
    return {
      handled: true,
      message: `The ${desc} goes through the grating into the darkness below.`,
      newState: state,
      ...NO_SIDE_EFFECTS,
    };
  }

  return { handled: false, message: '', newState: state, ...NO_SIDE_EFFECTS };
}

// ---------------------------------------------------------------------------
// BOOM-ROOM — coal-mine gas-room explosion check
// ---------------------------------------------------------------------------

export interface BoomResult {
  /** True when the coal gas ignites and kills the player. */
  explodes: boolean;
  /** Fatal message to pass to JIGS-UP, or null when safe. */
  fatalMessage: string | null;
}

/**
 * BOOM-ROOM M-END — check whether any lit flame the player carries ignites
 * the coal gas.
 *
 * deliberate: true when the player has just attempted to light a flame object
 *             in this room (verb was LAMP-ON or BURN, prso was candles/torch/match).
 * litObjectDesc: short name of the object being lit, used in the message when
 *                deliberate=true (e.g. 'candles', 'match').
 */
export function boomRoomCheck(
  carryingLitCandles: boolean,
  carryingLitTorch: boolean,
  carryingLitMatch: boolean,
  deliberate: boolean,
  litObjectDesc: string | null,
): BoomResult {
  const hasFlame = carryingLitCandles || carryingLitTorch || carryingLitMatch;
  if (!hasFlame) {
    return { explodes: false, fatalMessage: null };
  }

  const preamble =
    deliberate && litObjectDesc
      ? `How sad for an aspiring adventurer to light a ${litObjectDesc} in a room which\nreeks of gas. Fortunately, there is justice in the world.`
      : 'Oh dear. It appears that the smell coming from this room was coal gas.\nI would have thought twice about carrying flaming objects in here.';

  return {
    explodes: true,
    fatalMessage: preamble + '\n|\n      ** BOOOOOOOOOOOM **',
  };
}

// ---------------------------------------------------------------------------
// MACHINE-F — coal-mine machine (press-o-matic) lid and switch
// ---------------------------------------------------------------------------

export interface MachineActionResult {
  handled: boolean;
  message: string;
  newState: MiscAreasState;
}

/**
 * MACHINE-F — handles TAKE, OPEN, CLOSE, and LAMP-ON on the machine.
 *
 * For LAMP-ON with an instrument, delegates to machineSwitchAction.
 */
export function machineAction(
  verb: string,
  state: MiscAreasState,
  prsi: string | null = null,
): MachineActionResult {
  const unchanged = (message: string): MachineActionResult => ({
    handled: true,
    message,
    newState: state,
  });

  if (verb === 'take') {
    return unchanged('It is far too large to carry.');
  }

  if (verb === 'open') {
    if (state.machineOpen) {
      return unchanged("It's already open.");
    }
    const contentsMsg =
      state.machineContents !== 'empty'
        ? `The lid opens, revealing a ${state.machineContents}.`
        : 'The lid opens.';
    return {
      handled: true,
      message: contentsMsg,
      newState: { ...state, machineOpen: true },
    };
  }

  if (verb === 'close') {
    if (!state.machineOpen) {
      return unchanged("It's already closed.");
    }
    return {
      handled: true,
      message: 'The lid closes.',
      newState: { ...state, machineOpen: false },
    };
  }

  if (verb === 'lamp-on') {
    if (!prsi) {
      return unchanged("It's not clear how to turn it on with your bare hands.");
    }
    return machineSwitchAction(prsi, state);
  }

  return { handled: false, message: '', newState: state };
}

/**
 * MSWITCH-FUNCTION — handles TURN on the machine's START switch.
 *
 * Requires a screwdriver.  Machine must be closed.
 *   coal in machine → coal becomes diamond.
 *   anything else   → contents replaced with gunk.
 */
export function machineSwitchAction(
  prsi: string | null,
  state: MiscAreasState,
): MachineActionResult {
  if (prsi !== 'SCREWDRIVER') {
    const withWhat = prsi ? `a ${prsi}` : 'that';
    return {
      handled: true,
      message: `It seems that ${withWhat} won't do.`,
      newState: state,
    };
  }

  if (state.machineOpen) {
    return {
      handled: true,
      message: "The machine doesn't seem to want to do anything.",
      newState: state,
    };
  }

  const newContents: MachineContents =
    state.machineContents === 'coal' ? 'diamond' : 'gunk';

  return {
    handled: true,
    message:
      'The machine comes to life (figuratively) with a dazzling display of\n' +
      'colored lights and bizarre noises. After a few moments, the\n' +
      'excitement abates.',
    newState: { ...state, machineContents: newContents },
  };
}

/**
 * GUNK-FUNCTION — called when the player interacts with the gunk produced by
 * the machine.  The gunk crumbles at the slightest touch.
 */
export function gunkAction(): { message: string; removeGunk: boolean } {
  return {
    message:
      'The slag was rather insubstantial, and crumbles into dust at your touch.',
    removeGunk: true,
  };
}
