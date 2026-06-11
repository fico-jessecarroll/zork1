import { vTake, vDrop, vInventory } from './inventory';
import { GameState, GameObject, CONTBIT, OPENBIT, TAKEBIT, TOUCHBIT, WEARBIT } from './types';

function makeObj(
  id: string,
  parent: string | null,
  flags: string[] = [],
  size = 5,
  capacity = 0,
): GameObject {
  return { id, desc: id, parent, flags: new Set(flags), size, capacity };
}

function makeState(objects: GameObject[], loadAllowed = 70): GameState {
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
    loadAllowed,
  };
}

// ---------------------------------------------------------------------------
// vTake
// ---------------------------------------------------------------------------

describe('vTake', () => {
  it('takes an item from the current room', () => {
    const sword = makeObj('sword', 'room1', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      sword,
    ]);
    const [next, msg] = vTake(state, sword);
    expect(msg).toBe('Taken.');
    expect(next.objects.get('sword')?.parent).toBe('player');
    expect(next.objects.get('sword')?.flags.has(TOUCHBIT)).toBe(true);
  });

  it('refuses when item is already held', () => {
    const sword = makeObj('sword', 'player', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      sword,
    ]);
    const [next, msg] = vTake(state, sword);
    expect(msg).toBe('You already have that!');
    expect(next).toBe(state);
  });

  it('refuses when item is not takeable (no TAKEBIT)', () => {
    const table = makeObj('table', 'room1'); // no TAKEBIT
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      table,
    ]);
    const [next, msg] = vTake(state, table);
    expect(msg).toBe('A valiant attempt.');
    expect(next.objects.get('table')?.parent).toBe('room1');
  });

  it('refuses when item would exceed carry weight', () => {
    // Player already carries a heavy item (size 15); new item (size 10) would overflow limit of 20
    const existingItem = makeObj('rock', 'player', [TAKEBIT], 15);
    const boulder = makeObj('boulder', 'room1', [TAKEBIT], 10);
    const state = makeState(
      [
        makeObj('player', 'room1', [], 0),
        makeObj('room1', null),
        existingItem,
        boulder,
      ],
      20,
    );
    const [next, msg] = vTake(state, boulder);
    expect(msg).toBe('Your load is too heavy.');
    expect(next.objects.get('boulder')?.parent).toBe('room1');
  });

  it('returns an error when no object is specified', () => {
    const state = makeState([makeObj('player', 'room1', [], 0), makeObj('room1', null)]);
    const [, msg] = vTake(state);
    expect(msg).toBe('Take what?');
  });

  it('refuses when item is inside a closed container', () => {
    const box   = makeObj('box',    'room1', [CONTBIT], 5, 10); // closed (no OPENBIT)
    const coin  = makeObj('coin',   'box',   [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      box,
      coin,
    ]);
    const [next, msg] = vTake(state, coin);
    expect(msg).toBe("You can't reach something that's inside a closed container.");
    expect(next.objects.get('coin')?.parent).toBe('box');
  });

  it('succeeds taking an item from an open container', () => {
    const box  = makeObj('box',  'room1', [CONTBIT, OPENBIT], 5, 10);
    const coin = makeObj('coin', 'box',   [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      box,
      coin,
    ]);
    const [next, msg] = vTake(state, coin);
    expect(msg).toBe('Taken.');
    expect(next.objects.get('coin')?.parent).toBe('player');
  });

  it('reports wearing instead of "already have" when item is worn', () => {
    const cloak = makeObj('cloak', 'player', [TAKEBIT, WEARBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      cloak,
    ]);
    const [, msg] = vTake(state, cloak);
    expect(msg).toBe('You are already wearing the cloak.');
  });
});

// ---------------------------------------------------------------------------
// vDrop
// ---------------------------------------------------------------------------

describe('vDrop', () => {
  it('drops a held item into the current room', () => {
    const sword = makeObj('sword', 'player', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      sword,
    ]);
    const [next, msg] = vDrop(state, sword);
    expect(msg).toBe('Dropped.');
    expect(next.objects.get('sword')?.parent).toBe('room1');
  });

  it('refuses to drop an item not in inventory', () => {
    const sword = makeObj('sword', 'room1', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      sword,
    ]);
    const [next, msg] = vDrop(state, sword);
    expect(msg).toBe("You're not carrying the sword.");
    expect(next).toBe(state);
  });
});

// ---------------------------------------------------------------------------
// vInventory
// ---------------------------------------------------------------------------

describe('vInventory', () => {
  it('returns empty-handed message when carrying nothing', () => {
    const state = makeState([makeObj('player', 'room1', [], 0), makeObj('room1', null)]);
    const [, msg] = vInventory(state);
    expect(msg).toBe('You are empty-handed.');
  });

  it('lists carried items', () => {
    const sword = makeObj('sword', 'player', [TAKEBIT]);
    const state = makeState([
      makeObj('player', 'room1', [], 0),
      makeObj('room1', null),
      sword,
    ]);
    const [, msg] = vInventory(state);
    expect(msg).toContain('sword');
    expect(msg).toContain('You are carrying');
  });
});
