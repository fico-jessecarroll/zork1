import {
  GameState,
  GameObject,
  CONTBIT,
  OPENBIT,
  TAKEBIT,
  TOUCHBIT,
  WEARBIT,
} from './types';
import { calcWeight, fcheck, fset, getContents, isIn, move } from './utils';

/**
 * V-TAKE — pick up prso.
 * Mirrors ITAKE / PRE-TAKE logic in gverbs.zil.
 */
export function vTake(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Take what?'];

  if (isIn(prso.id, state.player, state)) {
    if (fcheck(prso.id, WEARBIT, state)) {
      return [state, `You are already wearing the ${prso.desc}.`];
    }
    return [state, 'You already have that!'];
  }

  // Refuse if item is inside a closed container
  const loc = prso.parent;
  if (
    loc !== null &&
    loc !== state.here &&
    loc !== state.player &&
    loc !== state.globalObjects
  ) {
    if (fcheck(loc, CONTBIT, state) && !fcheck(loc, OPENBIT, state)) {
      return [state, "You can't reach something that's inside a closed container."];
    }
  }

  if (!fcheck(prso.id, TAKEBIT, state)) {
    return [state, 'A valiant attempt.'];
  }

  if (calcWeight(prso.id, state) + calcWeight(state.player, state) > state.loadAllowed) {
    return [state, 'Your load is too heavy.'];
  }

  let s = move(prso.id, state.player, state);
  s = fset(prso.id, TOUCHBIT, s);
  return [s, 'Taken.'];
}

/**
 * V-DROP — drop prso into the current room.
 * Mirrors IDROP in gverbs.zil.
 */
export function vDrop(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Drop what?'];

  if (!isIn(prso.id, state.player, state)) {
    return [state, `You're not carrying the ${prso.desc}.`];
  }

  const s = move(prso.id, state.here, state);
  return [s, 'Dropped.'];
}

/**
 * V-INVENTORY — list what the player is carrying.
 * Mirrors V-INVENTORY in gverbs.zil.
 */
export function vInventory(state: GameState): [GameState, string] {
  const items = getContents(state.player, state);
  if (items.length === 0) return [state, 'You are empty-handed.'];
  const lines = items.map(id => {
    const obj = state.objects.get(id);
    return `  ${obj?.desc ?? id}`;
  });
  return [state, `You are carrying:\n${lines.join('\n')}`];
}
