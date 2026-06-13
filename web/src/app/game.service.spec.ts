import { GameService, buildInitialState, serializeState, deserializeState } from './game.service';

// ─── localStorage mock ───────────────────────────────────────────────────────

function makeStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
  };
}

// ─── Full turn cycle ─────────────────────────────────────────────────────────

describe('GameService — turn cycle', () => {
  it('processCommand("look") returns a non-empty string array', () => {
    const svc = new GameService(makeStorage());
    const lines = svc.processCommand('look');
    expect(lines).toBeInstanceOf(Array);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines[0]).toBeTruthy();
  });

  it('processCommand("look") includes the starting room name', () => {
    const svc = new GameService(makeStorage());
    const [desc] = svc.processCommand('look');
    expect(desc.toLowerCase()).toContain('house');
  });

  it('processCommand with an unknown verb returns an error message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('frobnicate');
    expect(msg).toContain("don't know");
  });

  it('successful movement returns the destination room description', () => {
    const svc = new GameService(makeStorage());
    const [desc] = svc.processCommand('north');
    expect(typeof desc).toBe('string');
    expect(desc.length).toBeGreaterThan(0);
  });

  it('increments move counter after each command', () => {
    const svc = new GameService(makeStorage());
    expect(svc.getState().moves).toBe(0);
    svc.processCommand('look');
    expect(svc.getState().moves).toBe(1);
    svc.processCommand('look');
    expect(svc.getState().moves).toBe(2);
  });

  it('empty input returns an empty array', () => {
    const svc = new GameService(makeStorage());
    expect(svc.processCommand('')).toEqual([]);
    expect(svc.processCommand('   ')).toEqual([]);
  });
});

// ─── SAVE / RESTORE round-trip ───────────────────────────────────────────────

describe('GameService — SAVE / RESTORE', () => {
  it('restore() returns false when no save exists', () => {
    const svc = new GameService(makeStorage());
    expect(svc.restore()).toBe(false);
  });

  it('save() then restore() preserves the current room', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    svc.processCommand('north'); // move to north-of-house
    const hereAfterMove = svc.getState().here;

    svc.save();
    svc.processCommand('north'); // move again
    expect(svc.getState().here).not.toBe(hereAfterMove);

    svc.restore();
    expect(svc.getState().here).toBe(hereAfterMove);
  });

  it('save() then restore() preserves score', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    // Manually set score by round-tripping through state (score changes via take)
    svc.processCommand('look'); // just advance a move
    const scoreBefore = svc.getState().score;
    svc.save();

    svc.processCommand('look');
    svc.restore();
    expect(svc.getState().score).toBe(scoreBefore);
  });

  it('save() then restore() preserves object locations', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    // Open mailbox then take the leaflet (id: ADVERTISEMENT in data layer)
    svc.processCommand('open mailbox');
    svc.processCommand('take leaflet'); // synonym maps to ADVERTISEMENT
    const locationAfterTake = svc.getState().objects.get('ADVERTISEMENT')?.parent;
    expect(locationAfterTake).toBe('PLAYER');

    svc.save();

    svc.processCommand('drop leaflet');
    const locationAfterDrop = svc.getState().objects.get('ADVERTISEMENT')?.parent;
    expect(locationAfterDrop).not.toBe('PLAYER');

    svc.restore();
    const locationAfterRestore = svc.getState().objects.get('ADVERTISEMENT')?.parent;
    expect(locationAfterRestore).toBe('PLAYER');
  });

  it('save command via processCommand saves to storage', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    const result = svc.processCommand('save');
    expect(result[0]).toBe('Saved.');
    expect(storage.getItem('zork1-save')).not.toBeNull();
  });

  it('restore command via processCommand when no save exists returns failure message', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    const result = svc.processCommand('restore');
    expect(result[0]).toBe('No saved game found.');
  });

  it('restore command via processCommand restores saved state', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    svc.processCommand('north');
    const savedHere = svc.getState().here;
    svc.processCommand('save');

    svc.processCommand('north');
    expect(svc.getState().here).not.toBe(savedHere);

    const result = svc.processCommand('restore');
    expect(result[0]).toBe('Restored.');
    expect(svc.getState().here).toBe(savedHere);
  });
});

// ─── UNDO ────────────────────────────────────────────────────────────────────

describe('GameService — UNDO', () => {
  it('undo() returns false on empty stack', () => {
    const svc = new GameService(makeStorage());
    expect(svc.undo()).toBe(false);
  });

  it('undo via processCommand with empty stack returns failure message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('undo');
    expect(msg).toBe('Nothing to undo.');
  });

  it('undo after a move reverts the room', () => {
    const svc = new GameService(makeStorage());
    const initialHere = svc.getState().here;

    svc.processCommand('north');
    expect(svc.getState().here).not.toBe(initialHere);

    svc.processCommand('undo');
    expect(svc.getState().here).toBe(initialHere);
  });

  it('undo() API reverts state', () => {
    const svc = new GameService(makeStorage());
    const initialHere = svc.getState().here;
    svc.processCommand('north');
    svc.undo();
    expect(svc.getState().here).toBe(initialHere);
  });
});

// ─── serializeState / deserializeState ───────────────────────────────────────

describe('serializeState / deserializeState round-trip', () => {
  it('produces valid JSON', () => {
    const state = buildInitialState();
    expect(() => JSON.parse(serializeState(state))).not.toThrow();
  });

  it('preserves scalar fields', () => {
    const state = buildInitialState();
    const restored = deserializeState(serializeState(state));
    expect(restored.here).toBe(state.here);
    expect(restored.score).toBe(state.score);
    expect(restored.moves).toBe(state.moves);
    expect(restored.verbose).toBe(state.verbose);
    expect(restored.superBrief).toBe(state.superBrief);
  });

  it('restores objects map', () => {
    const state = buildInitialState();
    const restored = deserializeState(serializeState(state));
    expect(restored.objects).toBeInstanceOf(Map);
    expect(restored.objects.size).toBe(state.objects.size);
  });

  it('preserves object parent locations', () => {
    const state = buildInitialState();
    const leafletBefore = state.objects.get('LEAFLET');
    const restored = deserializeState(serializeState(state));
    expect(restored.objects.get('LEAFLET')?.parent).toBe(leafletBefore?.parent);
  });

  it('restores object flags as Sets', () => {
    const state = buildInitialState();
    const restored = deserializeState(serializeState(state));
    const lamp = restored.objects.get('LAMP');
    expect(lamp?.flags).toBeInstanceOf(Set);
  });

  it('deserializeState throws on invalid JSON', () => {
    expect(() => deserializeState('not json')).toThrow();
  });
});
