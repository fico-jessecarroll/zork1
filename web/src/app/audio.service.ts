export type AtmosphereType =
  | 'outdoor' | 'forest' | 'water' | 'waterfall'
  | 'cave' | 'maze' | 'dungeon' | 'loud' | 'hades'
  | 'sacred' | 'indoor' | 'silent';

const ROOM_ATMOSPHERE: Record<string, AtmosphereType> = {
  // Forest
  'FOREST-1': 'forest', 'FOREST-2': 'forest', 'FOREST-3': 'forest',
  'UP-A-TREE': 'forest',

  // Outdoor
  'WEST-OF-HOUSE': 'outdoor', 'NORTH-OF-HOUSE': 'outdoor',
  'SOUTH-OF-HOUSE': 'outdoor', 'EAST-OF-HOUSE': 'outdoor',
  'PATH': 'outdoor', 'GRATING-CLEARING': 'outdoor', 'CLEARING': 'outdoor',
  'STONE-BARROW': 'outdoor', 'MOUNTAINS': 'outdoor',
  'CANYON-VIEW': 'outdoor', 'CANYON-BOTTOM': 'outdoor', 'CLIFF-MIDDLE': 'outdoor',
  'SHORE': 'outdoor', 'SANDY-BEACH': 'outdoor',
  'END-OF-RAINBOW': 'outdoor', 'ON-RAINBOW': 'outdoor',
  'WHITE-CLIFFS-NORTH': 'outdoor', 'WHITE-CLIFFS-SOUTH': 'outdoor',
  'DAM-BASE': 'outdoor', 'MINE-ENTRANCE': 'outdoor',

  // Water
  'RIVER-1': 'water', 'RIVER-2': 'water', 'RIVER-3': 'water',
  'RIVER-4': 'water', 'RIVER-5': 'water',
  'IN-STREAM': 'water', 'STREAM-VIEW': 'water',
  'RESERVOIR': 'water', 'RESERVOIR-SOUTH': 'water', 'RESERVOIR-NORTH': 'water',

  // Waterfall
  'ARAGAIN-FALLS': 'waterfall',

  // Maze
  'MAZE-1': 'maze', 'MAZE-2': 'maze', 'MAZE-3': 'maze', 'MAZE-4': 'maze',
  'MAZE-5': 'maze', 'MAZE-6': 'maze', 'MAZE-7': 'maze', 'MAZE-8': 'maze',
  'MAZE-9': 'maze', 'MAZE-10': 'maze', 'MAZE-11': 'maze', 'MAZE-12': 'maze',
  'MAZE-13': 'maze', 'MAZE-14': 'maze', 'MAZE-15': 'maze',
  'DEAD-END-1': 'maze', 'DEAD-END-2': 'maze', 'DEAD-END-3': 'maze',
  'DEAD-END-4': 'maze',

  // Loud
  'LOUD-ROOM': 'loud',

  // Hades
  'ENTRANCE-TO-HADES': 'hades', 'LAND-OF-LIVING-DEAD': 'hades',

  // Sacred / temple
  'NORTH-TEMPLE': 'sacred', 'SOUTH-TEMPLE': 'sacred',
  'EGYPT-ROOM': 'sacred', 'DOME-ROOM': 'sacred',
  'TORCH-ROOM': 'sacred', 'ATLANTIS-ROOM': 'sacred',

  // Cave / passages / mines
  'SMALL-CAVE': 'cave', 'TINY-CAVE': 'cave', 'SANDY-CAVE': 'cave',
  'DAMP-CAVE': 'cave', 'ENGRAVINGS-CAVE': 'cave',
  'COLD-PASSAGE': 'cave', 'NARROW-PASSAGE': 'cave',
  'WINDING-PASSAGE': 'cave', 'TWISTING-PASSAGE': 'cave',
  'EW-PASSAGE': 'cave', 'NS-PASSAGE': 'cave',
  'ROUND-ROOM': 'cave', 'CHASM-ROOM': 'cave', 'DEEP-CANYON': 'cave',
  'GRATING-ROOM': 'cave', 'MIRROR-ROOM-1': 'cave', 'MIRROR-ROOM-2': 'cave',
  'STRANGE-PASSAGE': 'cave', 'BAT-ROOM': 'cave', 'SMELLY-ROOM': 'cave',
  'GAS-ROOM': 'cave', 'SHAFT-ROOM': 'cave', 'SQUEEKY-ROOM': 'cave',
  'LADDER-TOP': 'cave', 'LADDER-BOTTOM': 'cave', 'LOWER-SHAFT': 'cave',
  'TIMBER-ROOM': 'cave', 'MACHINE-ROOM': 'cave', 'SLIDE-ROOM': 'cave',
  'MINE-1': 'cave', 'MINE-2': 'cave', 'MINE-3': 'cave', 'MINE-4': 'cave',
  'DEAD-END-5': 'cave',

  // Indoor
  'KITCHEN': 'indoor', 'ATTIC': 'indoor', 'LIVING-ROOM': 'indoor',

  // Dungeon (underground, not cave)
  'CELLAR': 'dungeon', 'TROLL-ROOM': 'dungeon', 'EAST-OF-CHASM': 'dungeon',
  'GALLERY': 'dungeon', 'STUDIO': 'dungeon', 'CYCLOPS-ROOM': 'dungeon',
  'TREASURE-ROOM': 'dungeon', 'MAINTENANCE-ROOM': 'dungeon',
  'DAM-ROOM': 'dungeon', 'DAM-LOBBY': 'dungeon',
};

export function getRoomAtmosphere(roomId: string): AtmosphereType {
  return ROOM_ATMOSPHERE[roomId] ?? 'silent';
}

// ─── AudioService ─────────────────────────────────────────────────────────────

type StoppableNode = { stop(): void };

export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private activeNodes: StoppableNode[] = [];
  private muted: boolean;
  private enabled = false;

  constructor(
    private readonly storage: Pick<Storage, 'getItem' | 'setItem'> = globalThis.localStorage,
    private readonly createContext: () => AudioContext = () => {
      const Ctor =
        (globalThis as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
        (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      return new Ctor!();
    },
  ) {
    this.muted = storage.getItem('zork1-muted') === 'true';
  }

  enable(): void {
    if (this.enabled) return;
    try {
      this.ctx = this.createContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.masterGain.gain.value = this.muted ? 0 : 0.6;
      this.enabled = true;
    } catch { /* audio unavailable */ }
  }

  playRoom(roomId: string): void {
    if (!this.enabled || !this.ctx || !this.masterGain) return;
    this.stopCurrent();
    this.startAtmosphere(getRoomAtmosphere(roomId));
  }

  toggle(): void {
    this.muted = !this.muted;
    this.storage.setItem('zork1-muted', String(this.muted));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : 0.6,
        this.ctx.currentTime,
        0.3,
      );
    }
  }

  isMuted(): boolean { return this.muted; }
  isEnabled(): boolean { return this.enabled; }

  // ── Private helpers ──────────────────────────────────────────────────────────

  private stopCurrent(): void {
    for (const node of this.activeNodes) {
      try { node.stop(); } catch { /* already stopped */ }
    }
    this.activeNodes = [];
  }

  private track(node: StoppableNode): void {
    this.activeNodes.push(node);
  }

  private startAtmosphere(atmosphere: AtmosphereType): void {
    const ctx = this.ctx!;
    const out = this.masterGain!;
    switch (atmosphere) {
      case 'outdoor':   this.buildNoise(ctx, out, 'bandpass', 300, 0.5, 0.05); break;
      case 'forest':    this.buildNoise(ctx, out, 'lowpass',  500, 1,   0.07); break;
      case 'water':     this.buildNoise(ctx, out, 'lowpass',  800, 1,   0.15); break;
      case 'waterfall': this.buildNoise(ctx, out, 'lowpass', 1200, 1,   0.35); break;
      case 'cave':      this.buildDrone(ctx, out, 48,  0.04); break;
      case 'maze':      this.buildMaze(ctx, out); break;
      case 'dungeon':   this.buildDrone(ctx, out, 60,  0.04); break;
      case 'loud':      this.buildNoise(ctx, out, 'bandpass', 300, 8,   0.25); break;
      case 'hades':     this.buildHades(ctx, out); break;
      case 'sacred':    this.buildDrone(ctx, out, 220, 0.02); break;
      case 'indoor':    this.buildDrone(ctx, out, 60,  0.01); break;
      case 'silent':    break;
    }
  }

  private noiseSource(ctx: AudioContext): AudioBufferSourceNode {
    const frames = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    this.track(src);
    return src;
  }

  private buildNoise(
    ctx: AudioContext, out: GainNode,
    filterType: BiquadFilterType, freq: number, q: number, vol: number,
  ): void {
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    this.noiseSource(ctx).connect(filter);
    filter.connect(gain);
    gain.connect(out);
  }

  private buildDrone(ctx: AudioContext, out: GainNode, freq: number, vol: number): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    osc.connect(gain);
    gain.connect(out);
    osc.start();
    this.track(osc);
  }

  private buildMaze(ctx: AudioContext, out: GainNode): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 3;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(out);
    osc.start();
    lfo.start();
    this.track(osc);
    this.track(lfo);
  }

  private buildHades(ctx: AudioContext, out: GainNode): void {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 32;
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.04;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.04;
    const gain = ctx.createGain();
    gain.gain.value = 0.08;
    lfo.connect(lfoGain);
    lfoGain.connect(gain.gain);
    osc.connect(gain);
    gain.connect(out);
    osc.start();
    lfo.start();
    this.track(osc);
    this.track(lfo);
  }
}
