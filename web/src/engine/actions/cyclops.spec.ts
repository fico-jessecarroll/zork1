import type { GameState, GameObject } from '../verbs/types';
import { isCyclopsPresent, handleGiveFood, handleOdysseus, handleSay } from './cyclops';

// ─── Test helpers ─────────────────────────────────────────────────────────────

function makeObj(id: string, parent: string | null, flags: string[] = []): GameObject {
  return {
    id,
    desc: id.toLowerCase().replace(/-/g, ' '),
    parent,
    flags: new Set(flags),
    size: 5,
    capacity: 0,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const objects = new Map<string, GameObject>([
    ['PLAYER',         makeObj('PLAYER',         'CYCLOPS-ROOM')],
    ['GLOBAL-OBJECTS', makeObj('GLOBAL-OBJECTS', null)],
    ['CYCLOPS-ROOM',   makeObj('CYCLOPS-ROOM',   null, ['RLANDBIT'])],
    ['TREASURE-ROOM',  makeObj('TREASURE-ROOM',  null, ['RLANDBIT'])],
    ['CYCLOPS',        makeObj('CYCLOPS',        'CYCLOPS-ROOM', ['ACTORBIT', 'NDESCBIT', 'TRYTAKEBIT'])],
    ['GARLIC',         makeObj('GARLIC',         'PLAYER',       ['TAKEBIT', 'FOODBIT'])],
    ['SWORD',          makeObj('SWORD',          'PLAYER',       ['TAKEBIT', 'WEAPONBIT'])],
  ]);

  const roomExits = new Map<string, ReadonlyMap<string, string | null>>([
    ['CYCLOPS-ROOM', new Map([['up', 'TREASURE-ROOM'], ['nw', 'MAZE-15']])],
  ]);

  return {
    objects,
    roomExits,
    player: 'PLAYER',
    here: 'CYCLOPS-ROOM',
    globalObjects: 'GLOBAL-OBJECTS',
    score: 0,
    moves: 0,
    verbose: false,
    superBrief: false,
    loadAllowed: 70,
    ...overrides,
  };
}

// ─── isCyclopsPresent ─────────────────────────────────────────────────────────

describe('isCyclopsPresent', () => {
  it('returns true (going "up" would be blocked) when CYCLOPS is in CYCLOPS-ROOM', () => {
    const state = makeState();
    expect(isCyclopsPresent(state)).toBe(true);
  });

  it('returns false (going "up" to TREASURE-ROOM becomes passable) when CYCLOPS has fled', () => {
    const base = makeState();
    const [fled] = handleGiveFood(base, base.objects.get('GARLIC')!);
    expect(isCyclopsPresent(fled)).toBe(false);
  });
});

// ─── handleGiveFood ───────────────────────────────────────────────────────────

describe('handleGiveFood', () => {
  it('removes cyclops from room when given a FOODBIT item', () => {
    const state = makeState();
    const garlic = state.objects.get('GARLIC')!;
    const [newState, msg] = handleGiveFood(state, garlic);
    expect(newState.objects.get('CYCLOPS')?.parent).toBeNull();
    expect(msg).toBeTruthy();
  });

  it('returns refusal message and leaves cyclops in room when given a non-FOODBIT item', () => {
    const state = makeState();
    const sword = state.objects.get('SWORD')!;
    const [newState, msg] = handleGiveFood(state, sword);
    expect(newState.objects.get('CYCLOPS')?.parent).toBe('CYCLOPS-ROOM');
    expect(msg).toBeTruthy();
  });
});

// ─── handleOdysseus ───────────────────────────────────────────────────────────

describe('handleOdysseus', () => {
  it('removes cyclops from room when called', () => {
    const state = makeState();
    const [newState, msg] = handleOdysseus(state);
    expect(newState.objects.get('CYCLOPS')?.parent).toBeNull();
    expect(msg).toBeTruthy();
  });
});

// ─── handleSay ────────────────────────────────────────────────────────────────

describe('handleSay', () => {
  it('removes cyclops from room when word is "odysseus"', () => {
    const state = makeState();
    const result = handleSay(state, 'odysseus');
    expect(result).not.toBeNull();
    const [newState] = result!;
    expect(newState.objects.get('CYCLOPS')?.parent).toBeNull();
  });

  it('removes cyclops from room when word is "ulysses"', () => {
    const state = makeState();
    const result = handleSay(state, 'ulysses');
    expect(result).not.toBeNull();
    const [newState] = result!;
    expect(newState.objects.get('CYCLOPS')?.parent).toBeNull();
  });

  it('returns null for a random word (no cyclops effect) — saying random word in CYCLOPS-ROOM has no effect', () => {
    const state = makeState();
    const result = handleSay(state, 'hello');
    expect(result).toBeNull();
    // cyclops still present
    expect(state.objects.get('CYCLOPS')?.parent).toBe('CYCLOPS-ROOM');
  });
});
