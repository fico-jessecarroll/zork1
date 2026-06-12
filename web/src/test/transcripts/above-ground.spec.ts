import { runTranscript } from '../transcript-runner';
import { COMMANDS, EXPECTED } from './above-ground';

describe('above-ground opening transcript', () => {
  let actual: string[];

  beforeAll(() => {
    actual = runTranscript(COMMANDS);
  });

  it('produces one output per command', () => {
    expect(actual).toHaveLength(COMMANDS.length);
  });

  COMMANDS.forEach((cmd, i) => {
    it(`[${i}] ${cmd}`, () => {
      expect(actual[i]).toBe(EXPECTED[i]);
    });
  });
});
