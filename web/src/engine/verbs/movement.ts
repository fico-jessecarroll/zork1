import { GameState, GameObject, CLIMBBIT } from './types';
import { fcheck } from './utils';

/**
 * V-WALK — attempt to move in the direction given by prso.id.
 * Returns the new state with `here` updated on success, or an unchanged state
 * with a failure message.
 */
export function vWalk(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Go which way?'];

  const exits = state.roomExits.get(state.here);
  if (!exits) return [state, "You can't go that way."];

  const target = exits.get(prso.id);
  if (target === undefined || target === null) {
    return [state, "You can't go that way."];
  }

  return [{ ...state, here: target }, ''];
}

/**
 * V-CLIMB — try to climb prso.
 * Defers interesting cases to per-object action handlers; this is the default.
 */
export function vClimb(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Climb what?'];

  if (fcheck(prso.id, CLIMBBIT, state)) {
    return [state, `You climb the ${prso.desc}.`];
  }

  return [state, `You can't climb the ${prso.desc}.`];
}
