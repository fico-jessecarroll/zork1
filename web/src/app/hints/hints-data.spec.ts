import { HINTS } from './hints-data';

describe('HINTS', () => {
  it('is an instance of Map', () => {
    expect(HINTS).toBeInstanceOf(Map);
  });

  it('all map values are non-empty arrays', () => {
    for (const [, hints] of HINTS) {
      expect(Array.isArray(hints)).toBe(true);
      expect(hints.length).toBeGreaterThan(0);
    }
  });

  it('all hint strings within each array are non-empty strings', () => {
    for (const [, hints] of HINTS) {
      for (const hint of hints) {
        expect(typeof hint).toBe('string');
        expect(hint.length).toBeGreaterThan(0);
      }
    }
  });

  it('all keys are uppercase strings matching the engine here format', () => {
    for (const key of HINTS.keys()) {
      expect(typeof key).toBe('string');
      expect(key).toBe(key.toUpperCase());
    }
  });
});
