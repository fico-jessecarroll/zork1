import {
  perform,
  M_HANDLED,
  M_NOT_HANDLED,
  M_FATAL,
  M_BEG,
  ActionFn,
  GameState,
  PerformResult,
  ZorkObject,
} from './perform';

const VERB_TAKE = 0;
const VERB_WALK = 99;

function makeState(overrides: Partial<GameState> = {}): GameState {
  return {
    winner: {},
    preactions: [],
    actions: [],
    vWalk: VERB_WALK,
    ...overrides,
  };
}

function noop(): ActionFn {
  return jest.fn(() => M_NOT_HANDLED);
}

function handled(): ActionFn {
  return jest.fn(() => M_HANDLED);
}

function fatal(): ActionFn {
  return jest.fn(() => M_FATAL);
}

// ── Full chain declines → M_NOT_HANDLED ──────────────────────────────────────

describe('perform — all handlers decline', () => {
  it('returns M_NOT_HANDLED when no handlers are registered', () => {
    expect(perform(VERB_TAKE, null, null, makeState())).toBe(M_NOT_HANDLED);
  });

  it('returns M_NOT_HANDLED when every handler returns M_NOT_HANDLED', () => {
    const preaction = noop();
    const defaultAction = noop();
    const winnerAction = noop();
    const roomAction = noop();
    const prsoAction = noop();
    const prsiAction = noop();
    const contfcn = noop();

    const container: ZorkObject = { contfcn };
    const prso: ZorkObject = { action: prsoAction, loc: container };
    const prsi: ZorkObject = { action: prsiAction };
    const room: ZorkObject = { action: roomAction };
    const winner: ZorkObject = { action: winnerAction, loc: room };

    const preactions: ActionFn[] = [];
    preactions[VERB_TAKE] = preaction;
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    const result = perform(VERB_TAKE, prso, prsi, makeState({ winner, preactions, actions }));
    expect(result).toBe(M_NOT_HANDLED);
    expect(winnerAction).toHaveBeenCalledTimes(1);
    expect(roomAction).toHaveBeenCalledTimes(1);
    expect(preaction).toHaveBeenCalledTimes(1);
    expect(prsiAction).toHaveBeenCalledTimes(1);
    expect(contfcn).toHaveBeenCalledTimes(1);
    expect(prsoAction).toHaveBeenCalledTimes(1);
    expect(defaultAction).toHaveBeenCalledTimes(1);
  });
});

// ── Chain short-circuits at each step ────────────────────────────────────────

describe('perform — short-circuit on M_HANDLED', () => {
  function makeAllHandlers() {
    const winnerAction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const roomAction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const preaction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const prsiAction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const contfcn: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const prsoAction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const defaultAction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);

    const container: ZorkObject = { contfcn };
    const prso: ZorkObject = { action: prsoAction, loc: container };
    const prsi: ZorkObject = { action: prsiAction };
    const room: ZorkObject = { action: roomAction };
    const winner: ZorkObject = { action: winnerAction, loc: room };

    const preactions: ActionFn[] = [];
    preactions[VERB_TAKE] = preaction;
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    const state = makeState({ winner, preactions, actions });
    return { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state };
  }

  it('handler 1 (WINNER action) handled → handlers 2-7 not called', () => {
    const { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state } =
      makeAllHandlers();
    winnerAction.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(winnerAction).toHaveBeenCalledTimes(1);
    expect(roomAction).not.toHaveBeenCalled();
    expect(preaction).not.toHaveBeenCalled();
    expect(prsiAction).not.toHaveBeenCalled();
    expect(contfcn).not.toHaveBeenCalled();
    expect(prsoAction).not.toHaveBeenCalled();
    expect(defaultAction).not.toHaveBeenCalled();
  });

  it('handler 2 (room M_BEG) handled → handlers 3-7 not called', () => {
    const { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state } =
      makeAllHandlers();
    roomAction.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(winnerAction).toHaveBeenCalledTimes(1);
    expect(roomAction).toHaveBeenCalledTimes(1);
    expect(preaction).not.toHaveBeenCalled();
    expect(prsiAction).not.toHaveBeenCalled();
    expect(contfcn).not.toHaveBeenCalled();
    expect(prsoAction).not.toHaveBeenCalled();
    expect(defaultAction).not.toHaveBeenCalled();
  });

  it('handler 3 (preaction) handled → handlers 4-7 not called', () => {
    const { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state } =
      makeAllHandlers();
    preaction.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(winnerAction).toHaveBeenCalledTimes(1);
    expect(roomAction).toHaveBeenCalledTimes(1);
    expect(preaction).toHaveBeenCalledTimes(1);
    expect(prsiAction).not.toHaveBeenCalled();
    expect(contfcn).not.toHaveBeenCalled();
    expect(prsoAction).not.toHaveBeenCalled();
    expect(defaultAction).not.toHaveBeenCalled();
  });

  it('handler 4 (PRSI action) handled → handlers 5-7 not called', () => {
    const { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state } =
      makeAllHandlers();
    prsiAction.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(winnerAction).toHaveBeenCalledTimes(1);
    expect(roomAction).toHaveBeenCalledTimes(1);
    expect(preaction).toHaveBeenCalledTimes(1);
    expect(prsiAction).toHaveBeenCalledTimes(1);
    expect(contfcn).not.toHaveBeenCalled();
    expect(prsoAction).not.toHaveBeenCalled();
    expect(defaultAction).not.toHaveBeenCalled();
  });

  it('handler 5 (PRSO container CONTFCN) handled → handlers 6-7 not called', () => {
    const { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state } =
      makeAllHandlers();
    contfcn.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(contfcn).toHaveBeenCalledTimes(1);
    expect(prsoAction).not.toHaveBeenCalled();
    expect(defaultAction).not.toHaveBeenCalled();
  });

  it('handler 6 (PRSO action) handled → handler 7 not called', () => {
    const { winnerAction, roomAction, preaction, prsiAction, contfcn, prsoAction, defaultAction, prso, prsi, state } =
      makeAllHandlers();
    prsoAction.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(prsoAction).toHaveBeenCalledTimes(1);
    expect(defaultAction).not.toHaveBeenCalled();
  });

  it('handler 7 (default verb action) handled → returns M_HANDLED', () => {
    const { defaultAction, prso, prsi, state } = makeAllHandlers();
    defaultAction.mockReturnValue(M_HANDLED);

    const result = perform(VERB_TAKE, prso, prsi, state);

    expect(result).toBe(M_HANDLED);
    expect(defaultAction).toHaveBeenCalledTimes(1);
  });
});

// ── M_FATAL propagates and short-circuits ────────────────────────────────────

describe('perform — M_FATAL short-circuit', () => {
  it('handler 2 returning M_FATAL stops the chain and returns M_FATAL', () => {
    const roomAction = fatal();
    const preaction = noop();
    const room: ZorkObject = { action: roomAction };
    const winner: ZorkObject = { loc: room };
    const preactions: ActionFn[] = [];
    preactions[VERB_TAKE] = preaction;

    const result = perform(VERB_TAKE, null, null, makeState({ winner, preactions }));

    expect(result).toBe(M_FATAL);
    expect(preaction).not.toHaveBeenCalled();
  });
});

// ── Room action is called with M_BEG ─────────────────────────────────────────

describe('perform — room action receives M_BEG', () => {
  it('calls room action with M_BEG constant', () => {
    const roomAction: jest.Mock<PerformResult> = jest.fn(() => M_NOT_HANDLED);
    const room: ZorkObject = { action: roomAction };
    const winner: ZorkObject = { loc: room };

    perform(VERB_TAKE, null, null, makeState({ winner }));

    expect(roomAction).toHaveBeenCalledWith(M_BEG);
  });
});

// ── WALK verb skips steps 5 and 6 ────────────────────────────────────────────

describe('perform — WALK verb', () => {
  it('skips PRSO container CONTFCN for WALK', () => {
    const contfcn = handled();
    const prsoAction = handled();
    const defaultAction = handled();
    const container: ZorkObject = { contfcn };
    const prso: ZorkObject = { action: prsoAction, loc: container };
    const actions: ActionFn[] = [];
    actions[VERB_WALK] = defaultAction;

    const result = perform(VERB_WALK, prso, null, makeState({ actions }));

    expect(contfcn).not.toHaveBeenCalled();
    expect(prsoAction).not.toHaveBeenCalled();
    expect(defaultAction).toHaveBeenCalledTimes(1);
    expect(result).toBe(M_HANDLED);
  });
});

// ── Null / absent objects skip their steps ───────────────────────────────────

describe('perform — null objects', () => {
  it('skips handler 4 when prsi is null', () => {
    const prsiAction = noop();
    const defaultAction = handled();
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    perform(VERB_TAKE, null, null, makeState({ actions }));

    expect(prsiAction).not.toHaveBeenCalled();
  });

  it('skips handlers 5 and 6 when prso is null', () => {
    const contfcn = noop();
    const prsoAction = noop();
    const defaultAction = handled();
    const container: ZorkObject = { contfcn };
    // prso is null — objects above are not attached to anything
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    const result = perform(VERB_TAKE, null, null, makeState({ actions }));

    expect(contfcn).not.toHaveBeenCalled();
    expect(prsoAction).not.toHaveBeenCalled();
    expect(result).toBe(M_HANDLED);
  });

  it('skips handler 5 when prso has no loc', () => {
    const contfcn = handled();
    const prso: ZorkObject = { loc: null };
    const defaultAction = handled();
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    perform(VERB_TAKE, prso, null, makeState({ actions }));

    expect(contfcn).not.toHaveBeenCalled();
  });

  it('skips handler 5 when prso container has no contfcn', () => {
    const container: ZorkObject = {};
    const prso: ZorkObject = { loc: container };
    const defaultAction = handled();
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    const result = perform(VERB_TAKE, prso, null, makeState({ actions }));

    expect(result).toBe(M_HANDLED);
  });

  it('skips handler 3 when preactions entry is undefined', () => {
    const defaultAction = handled();
    const actions: ActionFn[] = [];
    actions[VERB_TAKE] = defaultAction;

    const result = perform(VERB_TAKE, null, null, makeState({ actions }));

    expect(result).toBe(M_HANDLED);
  });
});
