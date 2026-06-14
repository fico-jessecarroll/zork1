import { vFill, vPour, vBurn, vDig, vSwim, vPush, vPull, vTurn } from './utility';
import { GameState, GameObject } from './types';

function makeObj(id: string, parent: string | null, flags: string[] = []): GameObject {
  return { id, desc: id.toLowerCase(), parent, flags: new Set(flags), size: 5, capacity: 0 };
}

function makeState(objects: GameObject[] = []): GameState {
  const map = new Map<string, GameObject>();
  for (const obj of objects) map.set(obj.id, obj);
  return {
    objects: map,
    roomExits: new Map(),
    player: 'PLAYER',
    here: 'ROOM',
    globalObjects: 'GLOBAL',
    score: 0,
    moves: 0,
    verbose: false,
    superBrief: false,
    loadAllowed: 70,
  };
}

describe('vFill', () => {
  it('returns "Fill what?" when no object given', () => {
    const state = makeState();
    const [s, msg] = vFill(state);
    expect(msg).toBe('Fill what?');
    expect(s).toBe(state);
  });

  it("returns \"You can't fill that here.\" when an object is given", () => {
    const state = makeState();
    const bucket = makeObj('BUCKET', 'ROOM');
    const [s, msg] = vFill(state, bucket);
    expect(msg).toBe("You can't fill that here.");
    expect(s).toBe(state);
  });
});

describe('vPour', () => {
  it('returns "Pour what?" when no object given', () => {
    const state = makeState();
    const [, msg] = vPour(state);
    expect(msg).toBe('Pour what?');
  });

  it('returns "Nothing to pour it into." when only prso is given', () => {
    const state = makeState();
    const bottle = makeObj('BOTTLE', 'ROOM');
    const [, msg] = vPour(state, bottle);
    expect(msg).toBe('Nothing to pour it into.');
  });

  it('returns "Nothing to pour it into." even when prsi is also given', () => {
    const state = makeState();
    const bottle = makeObj('BOTTLE', 'ROOM');
    const bucket = makeObj('BUCKET', 'ROOM');
    const [, msg] = vPour(state, bottle, bucket);
    expect(msg).toBe('Nothing to pour it into.');
  });
});

describe('vBurn', () => {
  it('returns "Burn what?" when no object given', () => {
    const state = makeState();
    const [, msg] = vBurn(state);
    expect(msg).toBe('Burn what?');
  });

  it("returns \"There's no fire here.\" when an object is given", () => {
    const state = makeState();
    const paper = makeObj('PAPER', 'ROOM');
    const [, msg] = vBurn(state, paper);
    expect(msg).toBe("There's no fire here.");
  });
});

describe('vDig', () => {
  it('returns "Dig where?" when no object given', () => {
    const state = makeState();
    const [, msg] = vDig(state);
    expect(msg).toBe('Dig where?');
  });

  it('returns digging-is-ineffective message when an object is given', () => {
    const state = makeState();
    const ground = makeObj('GROUND', 'ROOM');
    const [, msg] = vDig(state, ground);
    expect(msg).toBe('Digging here with your hands is ineffective.');
  });
});

describe('vSwim', () => {
  it('returns the too-cold-for-a-swim message', () => {
    const state = makeState();
    const [s, msg] = vSwim(state);
    expect(msg).toBe('The water here is too cold for a swim.');
    expect(s).toBe(state);
  });
});

describe('vPush', () => {
  it('returns "Push what?" when no object given', () => {
    const state = makeState();
    const [, msg] = vPush(state);
    expect(msg).toBe('Push what?');
  });

  it('returns "Nothing happens." when an object is given', () => {
    const state = makeState();
    const boulder = makeObj('BOULDER', 'ROOM');
    const [, msg] = vPush(state, boulder);
    expect(msg).toBe('Nothing happens.');
  });
});

describe('vPull', () => {
  it('returns "Pull what?" when no object given', () => {
    const state = makeState();
    const [, msg] = vPull(state);
    expect(msg).toBe('Pull what?');
  });

  it("returns \"You can't pull that.\" when an object is given", () => {
    const state = makeState();
    const lever = makeObj('LEVER', 'ROOM');
    const [, msg] = vPull(state, lever);
    expect(msg).toBe("You can't pull that.");
  });
});

describe('vTurn', () => {
  it('returns "Turn what?" when no object given', () => {
    const state = makeState();
    const [, msg] = vTurn(state);
    expect(msg).toBe('Turn what?');
  });

  it('returns "Nothing happens." when an object is given', () => {
    const state = makeState();
    const knob = makeObj('KNOB', 'ROOM');
    const [, msg] = vTurn(state, knob);
    expect(msg).toBe('Nothing happens.');
  });
});
