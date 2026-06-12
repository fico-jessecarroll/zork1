import { GameState, GameObject, ACTORBIT, WEAPONBIT } from './types';
import { fcheck, isIn, move } from './utils';

/**
 * V-ATTACK — attack prso with prsi (weapon).
 * Mirrors V-ATTACK in gverbs.zil. Individual actor objects override for real combat.
 */
export function vAttack(
  state: GameState,
  prso?: GameObject,
  prsi?: GameObject,
): [GameState, string] {
  if (!prso) return [state, 'Attack what?'];

  if (!fcheck(prso.id, ACTORBIT, state)) {
    return [state, `I've known strange people, but fighting a ${prso.desc}?`];
  }

  if (!prsi) {
    return [state, `Trying to attack a ${prso.desc} with your bare hands is suicidal.`];
  }

  if (!isIn(prsi.id, state.player, state)) {
    return [state, `You aren't even holding the ${prsi.desc}.`];
  }

  if (!fcheck(prsi.id, WEAPONBIT, state)) {
    return [state, `Trying to attack the ${prso.desc} with a ${prsi.desc} is suicidal.`];
  }

  // Default: object-specific handler would intercept for real combat resolution
  return [state, `You attack the ${prso.desc} with the ${prsi.desc}.`];
}

/**
 * V-THROW — throw prso (optionally at prsi).
 * Mirrors V-THROW / IDROP in gverbs.zil.
 */
export function vThrow(
  state: GameState,
  prso?: GameObject,
  prsi?: GameObject,
): [GameState, string] {
  if (!prso) return [state, 'Throw what?'];

  if (!isIn(prso.id, state.player, state)) {
    return [state, `You're not carrying the ${prso.desc}.`];
  }

  const s = move(prso.id, state.here, state);

  if (prsi && fcheck(prsi.id, ACTORBIT, state)) {
    return [
      s,
      `The ${prsi.desc} ducks as the ${prso.desc} flies by and crashes to the ground.`,
    ];
  }

  return [s, 'Thrown.'];
}
