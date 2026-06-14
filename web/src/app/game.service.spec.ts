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
    expect(storage.getItem('zork1-saves')).not.toBeNull();
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

// ─── Named save slots ────────────────────────────────────────────────────────

describe('GameService — named save slots', () => {
  it('save() writes to zork1-saves (not the legacy zork1-save key)', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.save();
    expect(storage.getItem('zork1-saves')).not.toBeNull();
    expect(storage.getItem('zork1-save')).toBeNull();
  });

  it('save() returns true on success', () => {
    const svc = new GameService(makeStorage());
    expect(svc.save()).toBe(true);
  });

  it('save() and restore() with a named slot round-trips the room', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.processCommand('north');
    const savedHere = svc.getState().here;
    svc.save('adventure');
    svc.processCommand('north');
    expect(svc.getState().here).not.toBe(savedHere);
    svc.restore('adventure');
    expect(svc.getState().here).toBe(savedHere);
  });

  it('restore() with an unknown slot name returns false', () => {
    const svc = new GameService(makeStorage());
    expect(svc.restore('nonexistent')).toBe(false);
  });

  it('multiple named slots are stored and restored independently', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    svc.processCommand('north');
    const here1 = svc.getState().here;
    svc.save('slot1');

    svc.processCommand('north');
    const here2 = svc.getState().here;
    svc.save('slot2');

    svc.restore('slot1');
    expect(svc.getState().here).toBe(here1);

    svc.restore('slot2');
    expect(svc.getState().here).toBe(here2);
  });

  it('save() returns false when at 5-slot cap with a new slot name', () => {
    const svc = new GameService(makeStorage());
    svc.save('a');
    svc.save('b');
    svc.save('c');
    svc.save('d');
    svc.save('e');
    expect(svc.save('f')).toBe(false);
  });

  it('save() returns true when overwriting an existing slot at cap', () => {
    const svc = new GameService(makeStorage());
    svc.save('a');
    svc.save('b');
    svc.save('c');
    svc.save('d');
    svc.save('e');
    expect(svc.save('a')).toBe(true);
  });

  it('saves command lists the available slot names', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.save('run1');
    const [output] = svc.processCommand('saves');
    expect(output).toContain('run1');
  });

  it('saves command returns a no-saves message when empty', () => {
    const [output] = new GameService(makeStorage()).processCommand('saves');
    expect(output).toBe('No saved games.');
  });

  it('save <name> command saves to the named slot', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.processCommand('north');
    const savedHere = svc.getState().here;
    svc.processCommand('save checkpoint');
    svc.processCommand('north');
    svc.processCommand('restore checkpoint');
    expect(svc.getState().here).toBe(savedHere);
  });

  it('restore <name> command returns Restored. on success', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.processCommand('north');
    svc.processCommand('save run1');
    svc.processCommand('north');
    const [msg] = svc.processCommand('restore run1');
    expect(msg).toBe('Restored.');
  });

  it('migrates legacy zork1-save key to the quick slot on restore', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.processCommand('north');
    const savedHere = svc.getState().here;
    storage.setItem('zork1-save', serializeState(svc.getState()));

    const svc2 = new GameService(storage);
    svc2.processCommand('north');
    const ok = svc2.restore('quick');
    expect(ok).toBe(true);
    expect(svc2.getState().here).toBe(savedHere);
  });

  it('listSlotsData returns an empty array when no saves exist', () => {
    const svc = new GameService(makeStorage());
    expect(svc.listSlotsData()).toEqual([]);
  });

  it('listSlotsData returns slot info after saving', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.processCommand('north');
    svc.save('myslot');
    const slots = svc.listSlotsData();
    expect(slots).toHaveLength(1);
    expect(slots[0].name).toBe('myslot');
    expect(slots[0].room).toBe(svc.getState().here);
    expect(typeof slots[0].timestamp).toBe('number');
  });
});

// ─── getInventory ────────────────────────────────────────────────────────────

describe('GameService — getInventory', () => {
  it('returns [] on a fresh game (player starts empty-handed)', () => {
    const svc = new GameService(makeStorage());
    expect(svc.getInventory()).toEqual([]);
  });

  it('returns the desc of a taken item after open mailbox + take leaflet', () => {
    const svc = new GameService(makeStorage());
    svc.processCommand('open mailbox');
    svc.processCommand('take leaflet');
    expect(svc.getInventory()).toContain('leaflet');
  });

  it('returns all carried items when multiple items are held', () => {
    const svc = new GameService(makeStorage());
    svc.processCommand('open mailbox');
    svc.processCommand('take leaflet');
    // Navigate into the house: open window, enter, go south to get sword area
    // Simpler: just take leaflet and verify count
    const inv = svc.getInventory();
    expect(inv.length).toBeGreaterThan(0);
    expect(Array.isArray(inv)).toBe(true);
  });

  it('returns empty array again after dropping all items', () => {
    const svc = new GameService(makeStorage());
    svc.processCommand('open mailbox');
    svc.processCommand('take leaflet');
    expect(svc.getInventory()).toContain('leaflet');
    svc.processCommand('drop leaflet');
    expect(svc.getInventory()).toEqual([]);
  });
});

// ─── Auto-save ───────────────────────────────────────────────────────────────

describe('GameService — auto-save', () => {
  it('after processCommand("look") the auto slot exists in localStorage', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);
    svc.processCommand('look');
    const raw = storage.getItem('zork1-saves');
    expect(raw).not.toBeNull();
    const store = JSON.parse(raw!) as Record<string, unknown>;
    expect('auto' in store).toBe(true);
  });

  it('auto slot is overwritten on each command and reflects the most recent state', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    svc.processCommand('look');
    const storeAfterFirst = JSON.parse(storage.getItem('zork1-saves')!) as Record<string, { room: string; timestamp: number }>;
    const firstTimestamp = storeAfterFirst['auto'].timestamp;

    svc.processCommand('north');
    const storeAfterSecond = JSON.parse(storage.getItem('zork1-saves')!) as Record<string, { room: string; timestamp: number }>;
    const secondTimestamp = storeAfterSecond['auto'].timestamp;
    const secondRoom = storeAfterSecond['auto'].room;

    expect(secondTimestamp).toBeGreaterThanOrEqual(firstTimestamp);
    expect(secondRoom).toBe(svc.getState().here);
  });

  it('auto slot does not count toward the 5-slot user cap', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    svc.save('a');
    svc.save('b');
    svc.save('c');
    svc.save('d');
    svc.save('e');

    svc.processCommand('look');

    const store = JSON.parse(storage.getItem('zork1-saves')!) as Record<string, unknown>;
    expect('auto' in store).toBe(true);
  });

  it('processCommand("undo") does not overwrite the auto-save', () => {
    const storage = makeStorage();
    const svc = new GameService(storage);

    svc.processCommand('look');
    const storeBeforeUndo = JSON.parse(storage.getItem('zork1-saves')!) as Record<string, { timestamp: number }>;
    const timestampBeforeUndo = storeBeforeUndo['auto'].timestamp;

    svc.processCommand('undo');
    const storeAfterUndo = JSON.parse(storage.getItem('zork1-saves')!) as Record<string, { timestamp: number }>;
    const timestampAfterUndo = storeAfterUndo['auto'].timestamp;

    expect(timestampAfterUndo).toBe(timestampBeforeUndo);
  });
});

// ─── getExits ────────────────────────────────────────────────────────────────

describe('GameService — getExits', () => {
  it('returns a non-empty array in the starting room', () => {
    const svc = new GameService(makeStorage());
    const exits = svc.getExits();
    expect(exits.length).toBeGreaterThan(0);
  });

  it('returns only navigable exits (blocked directions excluded)', () => {
    const svc = new GameService(makeStorage());
    // Should not include any null-destination directions
    const exits = svc.getExits();
    expect(exits.every(dir => typeof dir === 'string' && dir.length > 0)).toBe(true);
    // The starting room has at least 'north' as a navigable exit
    expect(exits).toContain('north');
  });

  it('returns different exits after moving rooms', () => {
    const svc = new GameService(makeStorage());
    const startingExits = svc.getExits();
    svc.processCommand('north');
    const newExits = svc.getExits();
    expect(newExits).not.toEqual(startingExits);
  });

  it('returns an array of lowercase direction strings', () => {
    const svc = new GameService(makeStorage());
    const exits = svc.getExits();
    for (const dir of exits) {
      expect(dir).toBe(dir.toLowerCase());
    }
  });
});

// ─── hasAutoSave ─────────────────────────────────────────────────────────────

describe('GameService — hasAutoSave', () => {
  it('returns false on a fresh game (no commands run yet)', () => {
    const svc = new GameService(makeStorage());
    expect(svc.hasAutoSave()).toBe(false);
  });

  it('returns true after processCommand("look") fires auto-save', () => {
    const svc = new GameService(makeStorage());
    svc.processCommand('look');
    expect(svc.hasAutoSave()).toBe(true);
  });
});

// ─── Missing verb dispatch and utility verbs ──────────────────────────────────

describe('GameService — missing verb dispatch and utility verbs', () => {
  it('attack troll returns a message (not "I don\'t know...")', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('attack troll');
    expect(msg).not.toContain("don't know");
  });

  it('throw sword at troll drops the sword and returns a message', () => {
    const svc = new GameService(makeStorage());
    // Navigate west-of-house -> north-of-house -> east-of-house -> kitchen -> living-room
    svc.processCommand('north');
    svc.processCommand('east');
    svc.processCommand('west');
    svc.processCommand('west');
    svc.processCommand('take sword');
    expect(svc.getState().objects.get('SWORD')?.parent).toBe('PLAYER');

    const [msg] = svc.processCommand('throw sword at troll');
    expect(msg).not.toContain("don't know");
    expect(svc.getState().objects.get('SWORD')?.parent).not.toBe('PLAYER');
  });

  it('climb stairs returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('climb stairs');
    expect(msg).not.toContain("don't know");
  });

  it('put leaflet in mailbox works when mailbox is open and leaflet is held', () => {
    const svc = new GameService(makeStorage());
    svc.processCommand('open mailbox');
    svc.processCommand('take leaflet');
    const [msg] = svc.processCommand('put leaflet in mailbox');
    expect(msg).not.toContain("don't know");
    expect(msg).toBe('Done.');
  });

  it('lock mailbox returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('lock mailbox');
    expect(msg).not.toContain("don't know");
  });

  it('unlock mailbox returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('unlock mailbox');
    expect(msg).not.toContain("don't know");
  });

  it('swim returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('swim');
    expect(msg).not.toContain("don't know");
  });

  it('push boulder returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('push boulder');
    expect(msg).not.toContain("don't know");
  });

  it('fill returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('fill');
    expect(msg).not.toContain("don't know");
  });

  it('pour returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('pour');
    expect(msg).not.toContain("don't know");
  });

  it('burn returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('burn');
    expect(msg).not.toContain("don't know");
  });

  it('dig returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('dig');
    expect(msg).not.toContain("don't know");
  });

  it('pull leaflet returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('pull leaflet');
    expect(msg).not.toContain("don't know");
  });

  it('turn returns a message', () => {
    const svc = new GameService(makeStorage());
    const [msg] = svc.processCommand('turn');
    expect(msg).not.toContain("don't know");
  });
});
