/**
 * Above-ground area action handlers — mirrors 1actions.zil routines:
 * WHITE-HOUSE-F, KITCHEN-WINDOW-F, MAILBOX-F, FOREST-F, BOARD-F, and a
 * derived TREE-F for the TREE global object.
 *
 * Each handler: (state, prso?, prsi?) => [ActionState, string]
 *   - ActionState extends GameState with the current verb and game-level globals.
 *   - Non-empty string return means the handler consumed the action; display the
 *     message and stop the chain.  Empty string means fall through.
 *   - State is always returned (even when the handler declines) so callers can
 *     chain immutably.
 */

import { GameState, ObjectFlag, RoomFlag } from '../types';
import { OBJECTS_BY_ID } from '../data/objects';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Extends the persistent GameState with transient turn-level data that the
 * action handlers require.  ActionState IS-A GameState (structurally), so
 * callers can pass it wherever GameState is expected after stripping the
 * extra fields.
 */
export interface ActionState extends GameState {
  readonly verb: string;
  readonly globals: Readonly<Record<string, boolean>>;
}

export type ActionHandler = (
  state: ActionState,
  prso?: string,
  prsi?: string,
) => [ActionState, string];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Walk-around cycle tables, mirroring HOUSE-AROUND, FOREST-AROUND, and
 * IN-HOUSE-AROUND from 1dungeon.zil.  Each entry maps a room to the room
 * reached when the player walks around in that direction.
 */
const HOUSE_AROUND: Readonly<Record<string, string>> = {
  'WEST-OF-HOUSE':  'NORTH-OF-HOUSE',
  'NORTH-OF-HOUSE': 'EAST-OF-HOUSE',
  'EAST-OF-HOUSE':  'SOUTH-OF-HOUSE',
  'SOUTH-OF-HOUSE': 'WEST-OF-HOUSE',
};

const IN_HOUSE_AROUND: Readonly<Record<string, string>> = {
  'LIVING-ROOM': 'KITCHEN',
  'KITCHEN':     'ATTIC',
  'ATTIC':       'KITCHEN',
};

const FOREST_AROUND: Readonly<Record<string, string>> = {
  'FOREST-1': 'FOREST-2',
  'FOREST-2': 'FOREST-3',
  'FOREST-3': 'PATH',
  'PATH':     'CLEARING',
  'CLEARING': 'FOREST-1',
};

// ---------------------------------------------------------------------------
// State helpers — all pure, returning new ActionState
// ---------------------------------------------------------------------------

function getStaticFlags(id: string): Set<ObjectFlag | RoomFlag> {
  const obj = OBJECTS_BY_ID.get(id);
  if (!obj) return new Set();
  const result = new Set<ObjectFlag | RoomFlag>();
  for (const flag of obj.flags) {
    // GameFlag string values match ObjectFlag/RoomFlag string values exactly.
    result.add(flag as unknown as ObjectFlag);
  }
  return result;
}

function hasFlag(id: string, flag: string, state: ActionState): boolean {
  const overrides = state.flagOverrides.get(id);
  if (overrides !== undefined) {
    for (const f of overrides) {
      if ((f as string) === flag) return true;
    }
    return false;
  }
  const obj = OBJECTS_BY_ID.get(id);
  if (!obj) return false;
  for (const f of obj.flags) {
    if ((f as string) === flag) return true;
  }
  return false;
}

function setFlag(id: string, flag: ObjectFlag | RoomFlag, state: ActionState): ActionState {
  const current = state.flagOverrides.has(id)
    ? new Set(state.flagOverrides.get(id)!)
    : getStaticFlags(id);
  current.add(flag);
  const flagOverrides = new Map(state.flagOverrides);
  flagOverrides.set(id, current);
  return { ...state, flagOverrides };
}

function clearFlag(id: string, flag: ObjectFlag | RoomFlag, state: ActionState): ActionState {
  const current = state.flagOverrides.has(id)
    ? new Set(state.flagOverrides.get(id)!)
    : getStaticFlags(id);
  current.delete(flag);
  const flagOverrides = new Map(state.flagOverrides);
  flagOverrides.set(id, current);
  return { ...state, flagOverrides };
}

function movePlayer(dest: string, state: ActionState): ActionState {
  return { ...state, here: dest };
}

function getGlobal(name: string, state: ActionState): boolean {
  return state.globals[name] ?? false;
}

function setGlobal(name: string, value: boolean, state: ActionState): ActionState {
  return { ...state, globals: { ...state.globals, [name]: value } };
}

// ---------------------------------------------------------------------------
// BOARD-F  (boards on the front door, fastened to the house)
// ---------------------------------------------------------------------------

/**
 * Mirrors BOARD-F from 1actions.zil.
 * Called when the player interacts with the BOARD / BOARDS object.
 */
export function boardHandler(
  state: ActionState,
  prso?: string,
  _prsi?: string,
): [ActionState, string] {
  if (state.verb === 'TAKE' || state.verb === 'EXAMINE') {
    return [state, 'The boards are securely fastened.'];
  }
  return [state, ''];
}

// ---------------------------------------------------------------------------
// MAILBOX-F  (small mailbox at west-of-house)
// ---------------------------------------------------------------------------

/**
 * Mirrors MAILBOX-F from 1actions.zil.
 * Blocks taking the mailbox itself; all other verbs fall through.
 */
export function mailboxHandler(
  state: ActionState,
  prso?: string,
  _prsi?: string,
): [ActionState, string] {
  if (state.verb === 'TAKE' && prso === 'MAILBOX') {
    return [state, 'It is securely anchored.'];
  }
  return [state, ''];
}

// ---------------------------------------------------------------------------
// KITCHEN-WINDOW-F  (the small window on the east side of the white house)
// ---------------------------------------------------------------------------

/**
 * Mirrors KITCHEN-WINDOW-F from 1actions.zil.
 *
 * KITCHEN-WINDOW-FLAG (global boolean) tracks whether the window has ever
 * been interacted with; once true the EXAMINE message changes.
 */
export function kitchenWindowHandler(
  state: ActionState,
  _prso?: string,
  _prsi?: string,
): [ActionState, string] {
  const { verb } = state;

  if (verb === 'OPEN' || verb === 'CLOSE') {
    // Mark the window as having been interacted with.
    let s = setGlobal('KITCHEN-WINDOW-FLAG', true, state);
    const isOpen = hasFlag('KITCHEN-WINDOW', 'OPENBIT', state);

    if (verb === 'OPEN') {
      if (isOpen) return [s, "That's already open."];
      s = setFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT, s);
      return [s, 'With great effort, you open the window far enough to allow entry.'];
    } else {
      if (!isOpen) return [s, "That's already closed."];
      s = clearFlag('KITCHEN-WINDOW', ObjectFlag.OPENBIT, s);
      return [s, 'The window closes (more easily than it opened).'];
    }
  }

  // Before first interaction the examine message differs from the room description.
  if (verb === 'EXAMINE' && !getGlobal('KITCHEN-WINDOW-FLAG', state)) {
    return [state, 'The window is slightly ajar, but not enough to allow entry.'];
  }

  if (verb === 'WALK' || verb === 'BOARD' || verb === 'THROUGH') {
    if (!hasFlag('KITCHEN-WINDOW', 'OPENBIT', state)) {
      return [state, 'The window is closed.'];
    }
    // Going through the window moves between KITCHEN and EAST-OF-HOUSE.
    const dest = state.here === 'KITCHEN' ? 'EAST-OF-HOUSE' : 'KITCHEN';
    return [movePlayer(dest, state), ''];
  }

  if (verb === 'LOOK-INSIDE') {
    const msg = state.here === 'KITCHEN'
      ? 'You can see a clear area leading towards a forest.'
      : 'You can see what appears to be a kitchen.';
    return [state, msg];
  }

  return [state, ''];
}

// ---------------------------------------------------------------------------
// WHITE-HOUSE-F  (the colonial white house object, global to surrounding rooms)
// ---------------------------------------------------------------------------

/**
 * Mirrors WHITE-HOUSE-F from 1actions.zil.
 *
 * Behaviour varies by location:
 *   - Inside the house (KITCHEN / LIVING-ROOM / ATTIC): FIND is funny;
 *     WALK-AROUND cycles through the interior rooms.
 *   - Not near the house at all: FIND gives a directional hint.
 *   - Outside the house (N/E/S/W-of-house): full set of verbs handled.
 */
export function whiteHouseHandler(
  state: ActionState,
  _prso?: string,
  _prsi?: string,
): [ActionState, string] {
  const { verb, here } = state;

  const insideHouse = here === 'KITCHEN' || here === 'LIVING-ROOM' || here === 'ATTIC';
  if (insideHouse) {
    if (verb === 'FIND') return [state, 'Why not find your brains?'];
    if (verb === 'WALK-AROUND') {
      const dest = IN_HOUSE_AROUND[here];
      return dest ? [movePlayer(dest, state), ''] : [state, ''];
    }
    return [state, ''];
  }

  const nearHouse =
    here === 'EAST-OF-HOUSE' || here === 'WEST-OF-HOUSE' ||
    here === 'NORTH-OF-HOUSE' || here === 'SOUTH-OF-HOUSE';

  if (!nearHouse) {
    if (verb === 'FIND') {
      if (here === 'CLEARING') return [state, 'It seems to be to the west.'];
      return [state, 'It was here just a minute ago....'];
    }
    return [state, "You're not at the house."];
  }

  // At one of the four sides of the house.
  if (verb === 'FIND') {
    return [state, "It's right here! Are you blind or something?"];
  }
  if (verb === 'WALK-AROUND') {
    const dest = HOUSE_AROUND[here];
    return dest ? [movePlayer(dest, state), ''] : [state, ''];
  }
  if (verb === 'EXAMINE') {
    return [
      state,
      'The house is a beautiful colonial house which is painted white. ' +
      'It is clear that the owners must have been extremely wealthy.',
    ];
  }
  if (verb === 'THROUGH' || verb === 'OPEN') {
    if (here === 'EAST-OF-HOUSE') {
      if (hasFlag('KITCHEN-WINDOW', 'OPENBIT', state)) {
        return [movePlayer('KITCHEN', state), ''];
      }
      return [state, 'The window is closed.'];
    }
    return [state, "I can't see how to get in from here."];
  }
  if (verb === 'BURN') {
    return [state, 'You must be joking.'];
  }

  return [state, ''];
}

// ---------------------------------------------------------------------------
// FOREST-F  (the FOREST global object, accessible in all forest rooms)
// ---------------------------------------------------------------------------

/**
 * Mirrors FOREST-F from 1actions.zil.
 */
export function forestHandler(
  state: ActionState,
  _prso?: string,
  _prsi?: string,
): [ActionState, string] {
  const { verb, here } = state;

  if (verb === 'WALK-AROUND') {
    const nearHouse =
      here === 'WEST-OF-HOUSE' || here === 'NORTH-OF-HOUSE' ||
      here === 'SOUTH-OF-HOUSE' || here === 'EAST-OF-HOUSE';
    if (nearHouse) return [state, "You aren't even in the forest."];
    const dest = FOREST_AROUND[here];
    return dest ? [movePlayer(dest, state), ''] : [state, ''];
  }
  if (verb === 'DISEMBARK') {
    return [state, 'You will have to specify a direction.'];
  }
  if (verb === 'FIND') {
    return [state, 'You cannot see the forest for the trees.'];
  }
  if (verb === 'LISTEN') {
    return [state, 'The pines and the hemlocks seem to be murmuring.'];
  }

  return [state, ''];
}

// ---------------------------------------------------------------------------
// TREE-F  (derived — the TREE global object, CLIMBBIT set)
//
// The ZIL TREE object has no named action function; climbing behaviour is
// scattered across TREE-ROOM (room action for UP-A-TREE) and the room exit
// table (PATH has UP → UP-A-TREE; other forest rooms have a blocked message).
// This handler consolidates that behaviour for the object itself.
// ---------------------------------------------------------------------------

/**
 * Handles player interactions with the TREE global object.
 * Climbing from PATH goes up to UP-A-TREE; climbing from UP-A-TREE tries to
 * go higher (refused); climbing down from UP-A-TREE returns to PATH.
 */
export function treeHandler(
  state: ActionState,
  _prso?: string,
  _prsi?: string,
): [ActionState, string] {
  const { verb, here } = state;

  if (verb === 'CLIMB' || verb === 'CLIMB-UP') {
    if (here === 'PATH') {
      return [movePlayer('UP-A-TREE', state), ''];
    }
    if (here === 'UP-A-TREE') {
      return [state, 'The nearest branch above you is above your reach.'];
    }
    return [state, 'There is no tree here suitable for climbing.'];
  }

  if (verb === 'CLIMB-DOWN') {
    if (here === 'UP-A-TREE') {
      return [movePlayer('PATH', state), ''];
    }
    return [state, 'There is no tree here to climb down from.'];
  }

  return [state, ''];
}
