import {
  GameState,
  GameObject,
  CONTBIT,
  DOORBIT,
  INVISIBLE,
  OPENBIT,
  READBIT,
  TRANSBIT,
} from './types';
import { fcheck, getContents } from './utils';

/**
 * V-EXAMINE — describe an object in detail.
 * Mirrors V-EXAMINE in gverbs.zil.
 */
export function vExamine(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Examine what?'];

  if (prso.text) {
    return [state, prso.text];
  }

  if (fcheck(prso.id, CONTBIT, state) || fcheck(prso.id, DOORBIT, state)) {
    return lookInside(state, prso);
  }

  return [state, `There's nothing special about the ${prso.desc}.`];
}

function lookInside(state: GameState, prso: GameObject): [GameState, string] {
  if (fcheck(prso.id, DOORBIT, state)) {
    if (fcheck(prso.id, OPENBIT, state)) {
      return [state, `The ${prso.desc} is open, but I can't tell what's beyond it.`];
    }
    return [state, `The ${prso.desc} is closed.`];
  }

  if (!fcheck(prso.id, OPENBIT, state) && !fcheck(prso.id, TRANSBIT, state)) {
    return [state, `The ${prso.desc} is closed.`];
  }

  const contents = getContents(prso.id, state).filter(
    id => !fcheck(id, INVISIBLE, state),
  );

  if (contents.length === 0) {
    return [state, `The ${prso.desc} is empty.`];
  }

  const lines = contents.map(id => {
    const obj = state.objects.get(id);
    return `  ${obj?.desc ?? id}`;
  });
  return [state, `The ${prso.desc} contains:\n${lines.join('\n')}`];
}

/**
 * V-READ — read text on an object.
 * Mirrors V-READ in gverbs.zil.
 */
export function vRead(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Read what?'];

  if (!fcheck(prso.id, READBIT, state)) {
    return [state, `How does one read a ${prso.desc}?`];
  }

  if (!prso.text) {
    return [state, `The ${prso.desc} appears to be blank.`];
  }

  return [state, prso.text];
}

/**
 * V-LOOK — describe the current room.
 * Full room description (including objects) is delegated to the caller.
 */
export function vLook(state: GameState): [GameState, string] {
  const room = state.objects.get(state.here);
  return [state, room?.desc ?? state.here];
}
