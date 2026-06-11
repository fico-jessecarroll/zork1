import { GameState, ObjectFlag, RoomFlag } from './types';
import {
  serialize,
  deserialize,
  createUndoStack,
  pushUndo,
  popUndo,
} from './persistence';

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    objectLocations: new Map([['SWORD', 'PLAYER'], ['LAMP', 'WEST-OF-HOUSE']]),
    flagOverrides: new Map([
      ['SWORD', new Set<ObjectFlag | RoomFlag>([ObjectFlag.TAKEBIT, ObjectFlag.WEAPONBIT])],
      ['lamp-on', new Set<ObjectFlag | RoomFlag>([ObjectFlag.ONBIT])],
    ]),
    score: 0,
    moves: 0,
    winner: 'PLAYER',
    here: 'WEST-OF-HOUSE',
    ...overrides,
  };
}

const baseState: GameState = makeState();

// ─── serialize / deserialize ────────────────────────────────────────────────

describe('serialize / deserialize round-trip', () => {
  it('should produce valid JSON', () => {
    const json = serialize(baseState);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should preserve all primitive fields', () => {
    const result = deserialize(serialize(baseState));
    expect(result.score).toBe(baseState.score);
    expect(result.moves).toBe(baseState.moves);
    expect(result.winner).toBe(baseState.winner);
    expect(result.here).toBe(baseState.here);
  });

  it('should restore objectLocations as a Map', () => {
    const result = deserialize(serialize(baseState));
    expect(result.objectLocations).toBeInstanceOf(Map);
    expect(result.objectLocations.get('SWORD')).toBe('PLAYER');
    expect(result.objectLocations.get('LAMP')).toBe('WEST-OF-HOUSE');
  });

  it('should restore flagOverrides as a Map of Sets', () => {
    const result = deserialize(serialize(baseState));
    expect(result.flagOverrides).toBeInstanceOf(Map);
    const swordFlags = result.flagOverrides.get('SWORD');
    expect(swordFlags).toBeInstanceOf(Set);
    expect(swordFlags?.has(ObjectFlag.TAKEBIT)).toBe(true);
    expect(swordFlags?.has(ObjectFlag.WEAPONBIT)).toBe(true);
  });

  it('should produce a deep copy — mutating the result does not affect the original', () => {
    const result = deserialize(serialize(baseState));
    result.here = 'FOREST';
    result.objectLocations.set('SWORD', 'CELLAR');
    expect(baseState.here).toBe('WEST-OF-HOUSE');
    expect(baseState.objectLocations.get('SWORD')).toBe('PLAYER');
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
    pushUndo(stack, makeState({ moves: 1 }));
    pushUndo(stack, makeState({ moves: 2 }));
    pushUndo(stack, makeState({ moves: 3 }));
    expect(stack.states).toHaveLength(3);
  });

  it('should drop the oldest entry when maxDepth is exceeded', () => {
    const stack = createUndoStack(2);
    pushUndo(stack, makeState({ moves: 1 }));
    pushUndo(stack, makeState({ moves: 2 }));
    pushUndo(stack, makeState({ moves: 3 }));
    expect(stack.states).toHaveLength(2);
    expect(stack.states[0].moves).toBe(2);
    expect(stack.states[1].moves).toBe(3);
  });

  it('should store a deep copy so later mutations do not corrupt the snapshot', () => {
    const stack = createUndoStack(5);
    const mutable = makeState({ score: 10 });
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
    pushUndo(stack, makeState({ moves: 1 }));
    pushUndo(stack, makeState({ moves: 2 }));
    const popped = popUndo(stack);
    expect(popped?.moves).toBe(2);
  });

  it('should remove the returned state from the stack', () => {
    const stack = createUndoStack(5);
    pushUndo(stack, makeState({ moves: 1 }));
    popUndo(stack);
    expect(stack.states).toHaveLength(0);
  });

  it('should allow popping all states one by one', () => {
    const stack = createUndoStack(3);
    pushUndo(stack, makeState({ moves: 1 }));
    pushUndo(stack, makeState({ moves: 2 }));
    expect(popUndo(stack)?.moves).toBe(2);
    expect(popUndo(stack)?.moves).toBe(1);
    expect(popUndo(stack)).toBeNull();
  });
});
