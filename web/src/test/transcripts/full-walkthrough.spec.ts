import { runFullWalkthrough } from '../full-walkthrough-runner';
import {
  COMMANDS,
  EXPECTED_SCORE,
  PUT_RESPONSE,
  SCORE_INDEX,
  FIRST_PUT_INDEX,
} from './full-walkthrough';

describe('full 350-point walkthrough', () => {
  let outputs: string[];
  let finalScore: number;

  beforeAll(() => {
    const result = runFullWalkthrough(COMMANDS);
    outputs = result.outputs;
    finalScore = result.finalScore;
  });

  it('produces one output per command', () => {
    expect(outputs).toHaveLength(COMMANDS.length);
  });

  it('final score is 350', () => {
    expect(outputs[SCORE_INDEX]).toBe(EXPECTED_SCORE);
  });

  it('finalScore field is 350', () => {
    expect(finalScore).toBe(350);
  });

  it('no command returns "I don\'t know the word"', () => {
    const bad = outputs.filter(o => o.includes("I don't know the word"));
    expect(bad).toEqual([]);
  });

  it('no command returns "I don\'t understand"', () => {
    const bad = outputs.filter(o => o.toLowerCase().includes("i don't understand"));
    expect(bad).toEqual([]);
  });

  it('all PUT commands return Done.', () => {
    const putRange = outputs.slice(FIRST_PUT_INDEX, SCORE_INDEX);
    putRange.forEach((out) => {
      expect(out).toBe(PUT_RESPONSE);
    });
  });

  // Spot-check key score milestones by logging deposits
  it('all 19 treasures deposited (19 Done. responses before SCORE)', () => {
    const putRange = outputs.slice(FIRST_PUT_INDEX, SCORE_INDEX);
    expect(putRange).toHaveLength(19);
    expect(putRange.every(o => o === PUT_RESPONSE)).toBe(true);
  });
});
