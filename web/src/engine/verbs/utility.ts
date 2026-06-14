import { GameState, GameObject } from './types';

export function vFill(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Fill what?'];
  return [state, "You can't fill that here."];
}

export function vPour(
  state: GameState,
  prso?: GameObject,
  _prsi?: GameObject,
): [GameState, string] {
  if (!prso) return [state, 'Pour what?'];
  return [state, 'Nothing to pour it into.'];
}

export function vBurn(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Burn what?'];
  return [state, "There's no fire here."];
}

export function vDig(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Dig where?'];
  return [state, 'Digging here with your hands is ineffective.'];
}

export function vSwim(state: GameState): [GameState, string] {
  return [state, 'The water here is too cold for a swim.'];
}

export function vPush(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Push what?'];
  return [state, 'Nothing happens.'];
}

export function vPull(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Pull what?'];
  return [state, "You can't pull that."];
}

export function vTurn(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Turn what?'];
  return [state, 'Nothing happens.'];
}
