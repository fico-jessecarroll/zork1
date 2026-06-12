/**
 * Transcript runner — takes a sequence of command strings and returns the
 * sequence of output strings the TypeScript engine produces.
 *
 * State is accumulated across the run, so each command sees the world left
 * by the previous one.  After a successful move (vWalk returns '') the runner
 * automatically appends the room description so the transcript reads naturally.
 *
 * Regenerating expected output from Frotz
 * ----------------------------------------
 * The canonical Zork I z-machine file lives at COMPILED/zork1.z3.
 * With dfrotz installed (`brew install frotz` on macOS):
 *
 *   dfrotz -R /tmp/transcript.txt COMPILED/zork1.z3
 *
 * Type your commands, then QUIT.  The transcript is written to
 * /tmp/transcript.txt.  Copy the output lines into the EXPECTED array,
 * stripping the "> COMMAND" prompt lines that Frotz adds.
 *
 * Note: Frotz runs the original z-machine binary; the TypeScript port is an
 * independent reimplementation.  Use the Frotz transcript as a reference for
 * *intended* output; update the TypeScript engine and EXPECTED together when
 * they diverge intentionally.
 */

import { GameState, GameObject } from '../engine/verbs/types';
import { vOpen, vClose } from '../engine/verbs/containers';
import { vTake, vDrop, vInventory } from '../engine/verbs/inventory';
import { vExamine, vRead, vLook } from '../engine/verbs/examine';
import { vWalk } from '../engine/verbs/movement';
import { OBJECTS } from '../engine/data/objects';
import { rooms } from '../engine/data/rooms';

// ---------------------------------------------------------------------------
// Noun index: lowercase synonym → object id
// ---------------------------------------------------------------------------

const nounIndex = new Map<string, string>();
for (const obj of OBJECTS) {
  for (const syn of obj.synonyms) {
    if (!nounIndex.has(syn.toLowerCase())) {
      nounIndex.set(syn.toLowerCase(), obj.id);
    }
  }
}

// ---------------------------------------------------------------------------
// Direction helpers
// ---------------------------------------------------------------------------

const DIRECTIONS = new Map<string, string>([
  ['n', 'north'], ['north', 'north'],
  ['s', 'south'], ['south', 'south'],
  ['e', 'east'],  ['east',  'east'],
  ['w', 'west'],  ['west',  'west'],
  ['ne', 'ne'], ['nw', 'nw'], ['se', 'se'], ['sw', 'sw'],
  ['u', 'up'],   ['up',   'up'],
  ['d', 'down'], ['down', 'down'],
  ['in', 'in'], ['out', 'out'],
]);

// Pseudo-objects consumed by vWalk; id matches the direction key in roomExits.
const dirObjs = new Map<string, GameObject>(
  ['north', 'south', 'east', 'west', 'ne', 'nw', 'se', 'sw', 'up', 'down', 'in', 'out']
    .map(dir => [dir, { id: dir, desc: dir, parent: null, flags: new Set<string>(), size: 0, capacity: 0 }])
);

// ---------------------------------------------------------------------------
// Initial state construction from data layer
// ---------------------------------------------------------------------------

function buildRoomExits(): ReadonlyMap<string, ReadonlyMap<string, string | null>> {
  const result = new Map<string, Map<string, string | null>>();
  for (const room of rooms) {
    const id = room.id.toUpperCase();
    const exits = new Map<string, string | null>();
    for (const exit of room.exits) {
      if ('message' in exit) {
        exits.set(exit.direction, null);
      } else {
        // Conditional exits treated as unconditional for the regression harness.
        exits.set(exit.direction, exit.destination.toUpperCase());
      }
    }
    result.set(id, exits);
  }
  return result;
}

function buildInitialObjects(): ReadonlyMap<string, GameObject> {
  const objects = new Map<string, GameObject>();

  // Room stubs (for vLook desc lookup and parent tracking)
  for (const room of rooms) {
    const id = room.id.toUpperCase();
    objects.set(id, {
      id,
      desc: room.desc,
      parent: null,
      flags: new Set(room.flags),
      size: 0,
      capacity: 0,
    });
  }

  // Game objects from the data catalogue
  for (const obj of OBJECTS) {
    objects.set(obj.id, {
      id: obj.id,
      desc: obj.desc,
      parent: obj.location,
      flags: new Set([...obj.flags] as string[]),
      size: obj.size ?? 5,
      capacity: obj.capacity ?? 0,
    });
  }

  // Player
  objects.set('PLAYER', {
    id: 'PLAYER',
    desc: 'you',
    parent: 'WEST-OF-HOUSE',
    flags: new Set(),
    size: 0,
    capacity: 70,
  });

  return objects;
}

export function buildInitialState(): GameState {
  return {
    objects: buildInitialObjects(),
    roomExits: buildRoomExits(),
    player: 'PLAYER',
    here: 'WEST-OF-HOUSE',
    globalObjects: 'GLOBAL-OBJECTS',
    score: 0,
    moves: 0,
    verbose: false,
    superBrief: false,
    loadAllowed: 70,
  };
}

// ---------------------------------------------------------------------------
// Command dispatcher
// ---------------------------------------------------------------------------

function findObj(noun: string, state: GameState): GameObject | undefined {
  const id = nounIndex.get(noun.toLowerCase()) ?? noun.toUpperCase();
  return state.objects.get(id);
}

function dispatch(cmd: string, state: GameState): [GameState, string] {
  const tokens = cmd.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [state, ''];

  const verb = tokens[0];
  const noun = tokens.slice(1).join(' ');

  // Pure direction command (N, NORTH, IN, etc.)
  const dirKey = noun === '' ? DIRECTIONS.get(verb) : undefined;
  if (dirKey !== undefined) {
    return vWalk(state, dirObjs.get(dirKey)!);
  }

  // "GO NORTH" / "WALK EAST"
  if ((verb === 'go' || verb === 'walk') && DIRECTIONS.has(noun)) {
    return vWalk(state, dirObjs.get(DIRECTIONS.get(noun)!)!);
  }

  switch (verb) {
    case 'look':
    case 'l':
      return vLook(state);

    case 'inventory':
    case 'i':
      return vInventory(state);

    case 'open':
      return vOpen(state, findObj(noun, state));

    case 'close':
      return vClose(state, findObj(noun, state));

    case 'take':
    case 'get':
      return vTake(state, findObj(noun, state));

    case 'drop':
      return vDrop(state, findObj(noun, state));

    case 'examine':
    case 'x':
      return vExamine(state, findObj(noun, state));

    case 'read':
      return vRead(state, findObj(noun, state));

    default:
      return [state, `I don't know the word "${verb}".`];
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a sequence of commands against a fresh game state and return the output
 * string produced by each command.  After a successful move, the room name is
 * returned (simulating the room-description the game loop would print).
 */
export function runTranscript(commands: string[]): string[] {
  let state = buildInitialState();
  const outputs: string[] = [];

  for (const cmd of commands) {
    const prevHere = state.here;
    const [newState, output] = dispatch(cmd, state);
    state = newState;

    if (output === '' && state.here !== prevHere) {
      const [, roomDesc] = vLook(state);
      outputs.push(roomDesc);
    } else {
      outputs.push(output);
    }
  }

  return outputs;
}
