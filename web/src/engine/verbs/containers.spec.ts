import { vOpen, vClose, vPut } from './containers';
import {
  GameState,
  GameObject,
  CONTBIT,
  DOORBIT,
  LOCKBIT,
  OPENBIT,
  TAKEBIT,
  TOUCHBIT,
} from './types';

function makeObj(
  id: string,
  parent: string | null,
  flags: string[] = [],
  size = 5,
  capacity = 10,
): GameObject {
  return { id, desc: id, parent, flags: new Set(flags), size, capacity };
}

function makeState(objects: GameObject[]): GameState {
  const map = new Map<string, GameObject>();
  for (const obj of objects) map.set(obj.id, obj);
  return {
    objects: map,
    roomExits: new Map(),
    player: 'player',
    here: 'room1',
    globalObjects: 'global-objects',
    score: 0,
    moves: 0,
    verbose: false,
    superBrief: false,
    loadAllowed: 70,
  };
}

// ---------------------------------------------------------------------------
// vOpen
// ---------------------------------------------------------------------------

describe('vOpen', () => {
  it('opens a closed container and returns "Opened."', () => {
    const box = makeObj('box', 'room1', [CONTBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
    ]);
    const [next, msg] = vOpen(state, box);
    expect(msg).toBe('Opened.');
    expect(next.objects.get('box')?.flags.has(OPENBIT)).toBe(true);
    expect(next.objects.get('box')?.flags.has(TOUCHBIT)).toBe(true);
  });

  it('returns "It is already open." when container is already open', () => {
    const box = makeObj('box', 'room1', [CONTBIT, OPENBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
    ]);
    const [next, msg] = vOpen(state, box);
    expect(msg).toBe('It is already open.');
    expect(next).toBe(state);
  });

  it('returns a locked message when container has LOCKBIT', () => {
    const chest = makeObj('chest', 'room1', [CONTBIT, LOCKBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      chest,
    ]);
    const [next, msg] = vOpen(state, chest);
    expect(msg).toBe('The chest is locked.');
    expect(next).toBe(state);
    expect(next.objects.get('chest')?.flags.has(OPENBIT)).toBe(false);
  });

  it('reveals contents when container holds items', () => {
    const box  = makeObj('box',  'room1', [CONTBIT], 5, 20);
    const coin = makeObj('coin', 'box',   [TAKEBIT, TOUCHBIT]); // already touched
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
      coin,
    ]);
    const [, msg] = vOpen(state, box);
    expect(msg).toContain('coin');
  });

  it('opens a door and returns the door name', () => {
    const door = makeObj('trapdoor', 'room1', [DOORBIT], 5, 0);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      door,
    ]);
    const [next, msg] = vOpen(state, door);
    expect(msg).toBe('The trapdoor opens.');
    expect(next.objects.get('trapdoor')?.flags.has(OPENBIT)).toBe(true);
  });

  it('returns error for a non-container non-door', () => {
    const sword = makeObj('sword', 'room1', [TAKEBIT], 5, 0);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      sword,
    ]);
    const [, msg] = vOpen(state, sword);
    expect(msg).toContain('You must tell me how to do that');
  });
});

// ---------------------------------------------------------------------------
// vClose
// ---------------------------------------------------------------------------

describe('vClose', () => {
  it('closes an open container', () => {
    const box = makeObj('box', 'room1', [CONTBIT, OPENBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
    ]);
    const [next, msg] = vClose(state, box);
    expect(msg).toBe('Closed.');
    expect(next.objects.get('box')?.flags.has(OPENBIT)).toBe(false);
  });

  it('returns "It is already closed." when container is closed', () => {
    const box = makeObj('box', 'room1', [CONTBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
    ]);
    const [next, msg] = vClose(state, box);
    expect(msg).toBe('It is already closed.');
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// vPut
// ---------------------------------------------------------------------------

describe('vPut', () => {
  it('puts an item into an open container', () => {
    const box  = makeObj('box',  'room1', [CONTBIT, OPENBIT], 5, 20);
    const coin = makeObj('coin', 'player', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
      coin,
    ]);
    const [next, msg] = vPut(state, coin, box);
    expect(msg).toBe('Done.');
    expect(next.objects.get('coin')?.parent).toBe('box');
  });

  it('refuses when the container is closed', () => {
    const box  = makeObj('box',  'room1', [CONTBIT], 5, 20);
    const coin = makeObj('coin', 'player', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
      coin,
    ]);
    const [next, msg] = vPut(state, coin, box);
    expect(msg).toContain("isn't open");
    expect(next).toBe(state);
  });

  it('refuses when the player does not have the item', () => {
    const box  = makeObj('box',  'room1', [CONTBIT, OPENBIT], 5, 20);
    const coin = makeObj('coin', 'room1', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null, [], 0, 0),
      box,
      coin,
    ]);
    const [next, msg] = vPut(state, coin, box);
    expect(msg).toContain("don't have");
    expect(next).toBe(state);
  });
});
