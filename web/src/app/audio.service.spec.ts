import { AudioService, getRoomAtmosphere } from './audio.service';

// ─── Mock AudioContext ────────────────────────────────────────────────────────

function makeMockNode() {
  return { connect: vi.fn(), disconnect: vi.fn(), gain: { value: 0, setTargetAtTime: vi.fn() } };
}

function makeMockOscillator() {
  return {
    type: 'sine' as OscillatorType,
    frequency: { value: 0 },
    detune: { value: 0 },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
}

function makeMockBufferSource() {
  return { buffer: null, loop: false, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
}

function makeMockFilter() {
  return { type: 'lowpass' as BiquadFilterType, frequency: { value: 0 }, Q: { value: 0 }, connect: vi.fn() };
}

function makeMockContext(): AudioContext {
  return {
    sampleRate: 44100,
    currentTime: 0,
    destination: {} as AudioDestinationNode,
    createGain: vi.fn(() => makeMockNode()),
    createOscillator: vi.fn(() => makeMockOscillator()),
    createBufferSource: vi.fn(() => makeMockBufferSource()),
    createBiquadFilter: vi.fn(() => makeMockFilter()),
    createBuffer: vi.fn((_ch: number, frames: number) => ({
      getChannelData: vi.fn(() => new Float32Array(frames)),
    })),
  } as unknown as AudioContext;
}

function makeStorage(): Pick<Storage, 'getItem' | 'setItem'> {
  const store: Record<string, string> = {};
  return {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
  };
}

// ─── getRoomAtmosphere (pure function) ───────────────────────────────────────

describe('getRoomAtmosphere', () => {
  it('classifies forest rooms as forest', () => {
    expect(getRoomAtmosphere('FOREST-1')).toBe('forest');
    expect(getRoomAtmosphere('FOREST-2')).toBe('forest');
    expect(getRoomAtmosphere('FOREST-3')).toBe('forest');
  });

  it('classifies outdoor rooms correctly', () => {
    expect(getRoomAtmosphere('WEST-OF-HOUSE')).toBe('outdoor');
    expect(getRoomAtmosphere('NORTH-OF-HOUSE')).toBe('outdoor');
    expect(getRoomAtmosphere('PATH')).toBe('outdoor');
    expect(getRoomAtmosphere('CLEARING')).toBe('outdoor');
  });

  it('classifies river and stream rooms as water', () => {
    expect(getRoomAtmosphere('RIVER-1')).toBe('water');
    expect(getRoomAtmosphere('RIVER-5')).toBe('water');
    expect(getRoomAtmosphere('IN-STREAM')).toBe('water');
    expect(getRoomAtmosphere('STREAM-VIEW')).toBe('water');
    expect(getRoomAtmosphere('RESERVOIR')).toBe('water');
  });

  it('classifies aragain-falls as waterfall', () => {
    expect(getRoomAtmosphere('ARAGAIN-FALLS')).toBe('waterfall');
  });

  it('classifies maze rooms as maze', () => {
    expect(getRoomAtmosphere('MAZE-1')).toBe('maze');
    expect(getRoomAtmosphere('MAZE-15')).toBe('maze');
    expect(getRoomAtmosphere('DEAD-END-1')).toBe('maze');
    expect(getRoomAtmosphere('DEAD-END-4')).toBe('maze');
  });

  it('classifies the loud-room as loud', () => {
    expect(getRoomAtmosphere('LOUD-ROOM')).toBe('loud');
  });

  it('classifies hades rooms correctly', () => {
    expect(getRoomAtmosphere('ENTRANCE-TO-HADES')).toBe('hades');
    expect(getRoomAtmosphere('LAND-OF-LIVING-DEAD')).toBe('hades');
  });

  it('classifies temple rooms as sacred', () => {
    expect(getRoomAtmosphere('NORTH-TEMPLE')).toBe('sacred');
    expect(getRoomAtmosphere('EGYPT-ROOM')).toBe('sacred');
    expect(getRoomAtmosphere('ATLANTIS-ROOM')).toBe('sacred');
  });

  it('classifies cave and passage rooms as cave', () => {
    expect(getRoomAtmosphere('SMALL-CAVE')).toBe('cave');
    expect(getRoomAtmosphere('DAMP-CAVE')).toBe('cave');
    expect(getRoomAtmosphere('COLD-PASSAGE')).toBe('cave');
    expect(getRoomAtmosphere('MINE-1')).toBe('cave');
    expect(getRoomAtmosphere('BAT-ROOM')).toBe('cave');
  });

  it('classifies indoor rooms as indoor', () => {
    expect(getRoomAtmosphere('KITCHEN')).toBe('indoor');
    expect(getRoomAtmosphere('LIVING-ROOM')).toBe('indoor');
    expect(getRoomAtmosphere('ATTIC')).toBe('indoor');
  });

  it('classifies dungeon rooms correctly', () => {
    expect(getRoomAtmosphere('CELLAR')).toBe('dungeon');
    expect(getRoomAtmosphere('TROLL-ROOM')).toBe('dungeon');
    expect(getRoomAtmosphere('TREASURE-ROOM')).toBe('dungeon');
  });

  it('returns silent for unknown room IDs', () => {
    expect(getRoomAtmosphere('UNKNOWN-ROOM')).toBe('silent');
  });
});

// ─── AudioService — mute state ────────────────────────────────────────────────

describe('AudioService — mute state', () => {
  it('starts unmuted by default', () => {
    const svc = new AudioService(makeStorage(), () => makeMockContext());
    expect(svc.isMuted()).toBe(false);
  });

  it('reads initial mute state from storage', () => {
    const storage = makeStorage();
    storage.setItem('zork1-muted', 'true');
    const svc = new AudioService(storage, () => makeMockContext());
    expect(svc.isMuted()).toBe(true);
  });

  it('toggle() flips mute state', () => {
    const svc = new AudioService(makeStorage(), () => makeMockContext());
    svc.toggle();
    expect(svc.isMuted()).toBe(true);
    svc.toggle();
    expect(svc.isMuted()).toBe(false);
  });

  it('toggle() persists mute state to storage', () => {
    const storage = makeStorage();
    const svc = new AudioService(storage, () => makeMockContext());
    svc.toggle();
    expect(storage.getItem('zork1-muted')).toBe('true');
    svc.toggle();
    expect(storage.getItem('zork1-muted')).toBe('false');
  });
});

// ─── AudioService — enable / playRoom ────────────────────────────────────────

describe('AudioService — enable and playRoom', () => {
  it('isEnabled() is false before enable()', () => {
    const svc = new AudioService(makeStorage(), () => makeMockContext());
    expect(svc.isEnabled()).toBe(false);
  });

  it('isEnabled() is true after enable()', () => {
    const mockCtx = makeMockContext();
    const svc = new AudioService(makeStorage(), () => mockCtx);
    svc.enable();
    expect(svc.isEnabled()).toBe(true);
  });

  it('enable() creates an AudioContext via the factory', () => {
    const mockCtx = makeMockContext();
    const factory = vi.fn(() => mockCtx);
    const svc = new AudioService(makeStorage(), factory);
    svc.enable();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('enable() called twice only creates one AudioContext', () => {
    const factory = vi.fn(() => makeMockContext());
    const svc = new AudioService(makeStorage(), factory);
    svc.enable();
    svc.enable();
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('playRoom() does nothing before enable()', () => {
    const mockCtx = makeMockContext();
    const svc = new AudioService(makeStorage(), () => mockCtx);
    svc.playRoom('FOREST-1');
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });

  it('playRoom() creates audio nodes after enable()', () => {
    const mockCtx = makeMockContext();
    const svc = new AudioService(makeStorage(), () => mockCtx);
    svc.enable();
    svc.playRoom('CELLAR');
    const totalNodes =
      (mockCtx.createOscillator as ReturnType<typeof vi.fn>).mock.calls.length +
      (mockCtx.createBufferSource as ReturnType<typeof vi.fn>).mock.calls.length;
    expect(totalNodes).toBeGreaterThan(0);
  });

  it('playRoom() with a silent room does not create oscillators or buffer sources', () => {
    const mockCtx = makeMockContext();
    const svc = new AudioService(makeStorage(), () => mockCtx);
    svc.enable();
    // Reset call counts after enable's master gain setup
    (mockCtx.createOscillator as ReturnType<typeof vi.fn>).mockClear();
    (mockCtx.createBufferSource as ReturnType<typeof vi.fn>).mockClear();
    svc.playRoom('UNKNOWN-ROOM-XYZ');
    expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    expect(mockCtx.createBufferSource).not.toHaveBeenCalled();
  });
});
