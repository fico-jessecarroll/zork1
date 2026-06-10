import { GameState } from './types';
import {
  serialize,
  deserialize,
  createUndoStack,
  pushUndo,
  popUndo,
} from './persistence';

const baseState: GameState = {
  version: 1,
  currentRoom: 'WEST-OF-HOUSE',
  score: 0,
  moves: 0,
  maxScore: 350,
  loadAllowed: 100,
  objects: {
    SWORD: {
      id: 'SWORD',
      location: 'PLAYER',
      flags: { TAKEBIT: true, WEAPONBIT: true },
      properties: { value: 10 },
    },
    LAMP: {
      id: 'LAMP',
      location: 'WEST-OF-HOUSE',
      flags: { TAKEBIT: true, ONBIT: false },
      properties: { value: 15, fuelRemaining: 300 },
    },
  },
  rooms: {
    'WEST-OF-HOUSE': {
      id: 'WEST-OF-HOUSE',
      visited: true,
      flags: { RLANDBIT: true },
    },
    'NORTH-OF-HOUSE': {
      id: 'NORTH-OF-HOUSE',
      visited: false,
      flags: { RLANDBIT: true },
    },
  },
  globals: {
    'CYCLOPS-FLAG': false,
    'DOME-FLAG': false,
    'LOAD-MAX': 100,
    'MAGIC-FLAG': false,
  },
  outputBuffer: ['You are standing in an open field.', 'There is a small mailbox here.'],
};

// ─── serialize / deserialize ────────────────────────────────────────────────

describe('serialize / deserialize round-trip', () => {
  it('should produce valid JSON', () => {
    const json = serialize(baseState);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should preserve all top-level primitive fields', () => {
    const result = deserialize(serialize(baseState));
    expect(result.version).toBe(baseState.version);
    expect(result.currentRoom).toBe(baseState.currentRoom);
    expect(result.score).toBe(baseState.score);
    expect(result.moves).toBe(baseState.moves);
    expect(result.maxScore).toBe(baseState.maxScore);
    expect(result.loadAllowed).toBe(baseState.loadAllowed);
  });

  it('should preserve object locations and flags', () => {
    const result = deserialize(serialize(baseState));
    expect(result.objects['SWORD'].location).toBe('PLAYER');
    expect(result.objects['SWORD'].flags['WEAPONBIT']).toBe(true);
    expect(result.objects['LAMP'].flags['ONBIT']).toBe(false);
    expect(result.objects['LAMP'].properties['fuelRemaining']).toBe(300);
  });

  it('should preserve room visited status and flags', () => {
    const result = deserialize(serialize(baseState));
    expect(result.rooms['WEST-OF-HOUSE'].visited).toBe(true);
    expect(result.rooms['NORTH-OF-HOUSE'].visited).toBe(false);
    expect(result.rooms['WEST-OF-HOUSE'].flags['RLANDBIT']).toBe(true);
  });

  it('should preserve globals map', () => {
    const result = deserialize(serialize(baseState));
    expect(result.globals['CYCLOPS-FLAG']).toBe(false);
    expect(result.globals['LOAD-MAX']).toBe(100);
  });

  it('should preserve outputBuffer contents and order', () => {
    const result = deserialize(serialize(baseState));
    expect(result.outputBuffer).toEqual(baseState.outputBuffer);
  });

  it('should produce a deep copy — mutating the result does not affect the original', () => {
    const result = deserialize(serialize(baseState));
    result.currentRoom = 'FOREST';
    result.objects['SWORD'].flags['TAKEBIT'] = false;
    expect(baseState.currentRoom).toBe('WEST-OF-HOUSE');
    expect(baseState.objects['SWORD'].flags['TAKEBIT']).toBe(true);
  });

  it('should throw on invalid JSON', () => {
    expect(() => deserialize('not json')).toThrow();
  });

  it('should throw when required fields are missing', () => {
    const bad = JSON.stringify({ currentRoom: 'WEST-OF-HOUSE' });
    expect(() => deserialize(bad)).toThrow('Invalid game state');
  });

  it('should throw when top-level value is not an object', () => {
    expect(() => deserialize('"just a string"')).toThrow('Invalid game state');
    expect(() => deserialize('42')).toThrow('Invalid game state');
    expect(() => deserialize('null')).toThrow('Invalid game state');
  });
});

// ─── undo stack ─────────────────────────────────────────────────────────────

describe('createUndoStack', () => {
  it('should initialise with an empty state list', () => {
    const stack = createUndoStack(5);
    expect(stack.states).toHaveLength(0);
    expect(stack.maxDepth).toBe(5);
  });

  it('should throw when maxDepth is less than 1', () => {
    expect(() => createUndoStack(0)).toThrow();
    expect(() => createUndoStack(-1)).toThrow();
  });
});

describe('pushUndo', () => {
  it('should add states up to maxDepth', () => {
    const stack = createUndoStack(3);
    pushUndo(stack, { ...baseState, moves: 1 });
    pushUndo(stack, { ...baseState, moves: 2 });
    pushUndo(stack, { ...baseState, moves: 3 });
    expect(stack.states).toHaveLength(3);
  });

  it('should drop the oldest entry when maxDepth is exceeded', () => {
    const stack = createUndoStack(2);
    pushUndo(stack, { ...baseState, moves: 1 });
    pushUndo(stack, { ...baseState, moves: 2 });
    pushUndo(stack, { ...baseState, moves: 3 });
    expect(stack.states).toHaveLength(2);
    expect(stack.states[0].moves).toBe(2);
    expect(stack.states[1].moves).toBe(3);
  });

  it('should store a deep copy so later mutations do not corrupt the snapshot', () => {
    const stack = createUndoStack(5);
    const mutable: GameState = { ...baseState, score: 10 };
    pushUndo(stack, mutable);
    mutable.score = 99;
    expect(stack.states[0].score).toBe(10);
  });
});

describe('popUndo', () => {
  it('should return null from an empty stack', () => {
    const stack = createUndoStack(5);
    expect(popUndo(stack)).toBeNull();
  });

  it('should return the most recently pushed state (LIFO)', () => {
    const stack = createUndoStack(5);
    pushUndo(stack, { ...baseState, moves: 1 });
    pushUndo(stack, { ...baseState, moves: 2 });
    const popped = popUndo(stack);
    expect(popped?.moves).toBe(2);
  });

  it('should remove the returned state from the stack', () => {
    const stack = createUndoStack(5);
    pushUndo(stack, { ...baseState, moves: 1 });
    popUndo(stack);
    expect(stack.states).toHaveLength(0);
  });

  it('should allow popping all states one by one', () => {
    const stack = createUndoStack(3);
    pushUndo(stack, { ...baseState, moves: 1 });
    pushUndo(stack, { ...baseState, moves: 2 });
    expect(popUndo(stack)?.moves).toBe(2);
    expect(popUndo(stack)?.moves).toBe(1);
    expect(popUndo(stack)).toBeNull();
  });
});
