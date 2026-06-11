import { M_HANDLED, queue, clocker, disable, enable, registerRoutine, _reset } from './clock';

beforeEach(() => {
  _reset();
});

describe('clocker', () => {
  it('fires an interrupt exactly when its tick counter reaches zero', () => {
    const fired = jest.fn().mockReturnValue(true);
    registerRoutine('TEST-FCN', fired);
    queue('TEST-FCN', 3);

    const state = {};

    // T=3 -> T=2: no fire
    expect(clocker(state)).toBe(false);
    expect(fired).not.toHaveBeenCalled();

    // T=2 -> T=1: no fire
    expect(clocker(state)).toBe(false);
    expect(fired).not.toHaveBeenCalled();

    // T=1 -> T=0: fires, returns M_HANDLED
    expect(clocker(state)).toBe(M_HANDLED);
    expect(fired).toHaveBeenCalledTimes(1);

    // T=0: already at 0, skipped — does not re-fire
    expect(clocker(state)).toBe(false);
    expect(fired).toHaveBeenCalledTimes(1);
  });

  it('does not fire disabled entries', () => {
    const fired = jest.fn().mockReturnValue(true);
    registerRoutine('DISABLED-FCN', fired);
    const entry = queue('DISABLED-FCN', 1);
    disable(entry);

    clocker({});
    expect(fired).not.toHaveBeenCalled();
  });

  it('fires again after being re-queued', () => {
    const fired = jest.fn().mockReturnValue(true);
    registerRoutine('REQUEUE-FCN', fired);
    const entry = queue('REQUEUE-FCN', 1);

    clocker({});
    expect(fired).toHaveBeenCalledTimes(1);

    // Re-arm the entry
    entry.ticks = 1;
    enable(entry);

    clocker({});
    expect(fired).toHaveBeenCalledTimes(2);
  });

  it('returns false when the routine returns false', () => {
    registerRoutine('SILENT-FCN', () => false);
    queue('SILENT-FCN', 1);

    expect(clocker({})).toBe(false);
  });

  it('returns M_HANDLED when any routine fires and returns true', () => {
    registerRoutine('A', () => false);
    registerRoutine('B', () => true);
    queue('A', 1);
    queue('B', 1);

    expect(clocker({})).toBe(M_HANDLED);
  });
});
