import { GameState } from './types';

/** Signal values returned as the output string to indicate engine-level actions. */
export const SIGNAL_QUIT    = '@@QUIT';
export const SIGNAL_SAVE    = '@@SAVE';
export const SIGNAL_RESTORE = '@@RESTORE';
export const SIGNAL_RESTART = '@@RESTART';

/** V-SCORE — display current score. */
export function vScore(state: GameState): [GameState, string] {
  return [state, `Your score is ${state.score}.`];
}

/** V-QUIT — signal the engine to end the session. */
export function vQuit(state: GameState): [GameState, string] {
  return [state, SIGNAL_QUIT];
}

/** V-SAVE — signal the engine to save state. */
export function vSave(state: GameState): [GameState, string] {
  return [state, SIGNAL_SAVE];
}

/** V-RESTORE — signal the engine to restore saved state. */
export function vRestore(state: GameState): [GameState, string] {
  return [state, SIGNAL_RESTORE];
}

/** V-RESTART — signal the engine to restart the game. */
export function vRestart(state: GameState): [GameState, string] {
  return [state, SIGNAL_RESTART];
}

/** V-VERBOSE — enable full room descriptions on every move. */
export function vVerbose(state: GameState): [GameState, string] {
  return [{ ...state, verbose: true, superBrief: false }, 'Maximum verbosity.'];
}

/** V-BRIEF — revert to standard (non-verbose) descriptions. */
export function vBrief(state: GameState): [GameState, string] {
  return [{ ...state, verbose: false, superBrief: false }, 'Brief descriptions.'];
}

/** V-WAIT — pass time without doing anything (default: 1 turn). */
export function vWait(state: GameState): [GameState, string] {
  return [state, 'Time passes...'];
}
