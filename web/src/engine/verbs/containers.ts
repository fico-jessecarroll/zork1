import {
  GameState,
  GameObject,
  CONTBIT,
  DOORBIT,
  INVISIBLE,
  LOCKBIT,
  OPENBIT,
  TOUCHBIT,
  TRANSBIT,
} from './types';
import { calcWeight, fcheck, fclear, fset, getContents, isIn, move } from './utils';

/**
 * V-OPEN — open a container or door.
 * Mirrors V-OPEN in gverbs.zil, with an added LOCKBIT check for the default handler.
 */
export function vOpen(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Open what?'];

  const isContainer = fcheck(prso.id, CONTBIT, state) && prso.capacity !== 0;
  const isDoor = fcheck(prso.id, DOORBIT, state);

  if (!isContainer && !isDoor) {
    return [state, `You must tell me how to do that to a ${prso.desc}.`];
  }

  if (fcheck(prso.id, LOCKBIT, state)) {
    return [state, `The ${prso.desc} is locked.`];
  }

  if (fcheck(prso.id, OPENBIT, state)) {
    return [state, 'It is already open.'];
  }

  if (isDoor) {
    const s = fset(prso.id, OPENBIT, state);
    return [s, `The ${prso.desc} opens.`];
  }

  let s = fset(prso.id, OPENBIT, state);
  s = fset(prso.id, TOUCHBIT, s);

  const contents = getContents(prso.id, state).filter(
    id => !fcheck(id, INVISIBLE, state),
  );

  if (contents.length === 0 || fcheck(prso.id, TRANSBIT, state)) {
    return [s, 'Opened.'];
  }

  if (contents.length === 1) {
    const item = state.objects.get(contents[0]);
    if (item && !fcheck(contents[0], TOUCHBIT, state) && item.text) {
      return [s, `The ${prso.desc} opens.\n${item.text}`];
    }
  }

  const itemList = contents
    .map(id => `a ${state.objects.get(id)?.desc ?? id}`)
    .join(', ');
  return [s, `Opening the ${prso.desc} reveals ${itemList}.`];
}

/**
 * V-CLOSE — close a container or door.
 * Mirrors V-CLOSE in gverbs.zil.
 */
export function vClose(state: GameState, prso?: GameObject): [GameState, string] {
  if (!prso) return [state, 'Close what?'];

  const isContainer = fcheck(prso.id, CONTBIT, state) && prso.capacity !== 0;
  const isDoor = fcheck(prso.id, DOORBIT, state);

  if (!isContainer && !isDoor) {
    return [state, `You must tell me how to do that to a ${prso.desc}.`];
  }

  if (!fcheck(prso.id, OPENBIT, state)) {
    return [state, 'It is already closed.'];
  }

  const s = fclear(prso.id, OPENBIT, state);
  if (isDoor) {
    return [s, `The ${prso.desc} is now closed.`];
  }
  return [s, 'Closed.'];
}

/**
 * V-LOCK — default lock handler.
 * In ZIL this is a no-op ("It doesn't seem to work."); individual objects override.
 */
export function vLock(
  state: GameState,
  prso?: GameObject,
  _prsi?: GameObject,
): [GameState, string] {
  if (!prso) return [state, 'Lock what?'];

  if (!fcheck(prso.id, CONTBIT, state) && !fcheck(prso.id, DOORBIT, state)) {
    return [state, `You can't lock the ${prso.desc}.`];
  }

  return [state, "It doesn't seem to work."];
}

/**
 * V-UNLOCK — default unlock handler.
 * Mirrors V-UNLOCK → V-LOCK in gverbs.zil.
 */
export function vUnlock(
  state: GameState,
  prso?: GameObject,
  _prsi?: GameObject,
): [GameState, string] {
  if (!prso) return [state, 'Unlock what?'];

  if (!fcheck(prso.id, CONTBIT, state) && !fcheck(prso.id, DOORBIT, state)) {
    return [state, `You can't unlock the ${prso.desc}.`];
  }

  return [state, "It doesn't seem to work."];
}

/**
 * V-PUT — put prso into prsi.
 * Mirrors V-PUT in gverbs.zil.
 */
export function vPut(
  state: GameState,
  prso?: GameObject,
  prsi?: GameObject,
): [GameState, string] {
  if (!prso || !prsi) return [state, 'Put what where?'];

  if (!isIn(prso.id, state.player, state)) {
    return [state, `You don't have the ${prso.desc}.`];
  }

  if (!fcheck(prsi.id, OPENBIT, state)) {
    return [state, `The ${prsi.desc} isn't open.`];
  }

  if (prso.id === prsi.id) {
    return [state, 'How can you do that?'];
  }

  if (state.objects.get(prso.id)?.parent === prsi.id) {
    return [state, `The ${prso.desc} is already in the ${prsi.desc}.`];
  }

  // contents weight + new item weight must not exceed container capacity
  const contentsWeight = calcWeight(prsi.id, state) - prsi.size;
  if (contentsWeight + calcWeight(prso.id, state) > prsi.capacity) {
    return [state, "There's no room."];
  }

  const s = move(prso.id, prsi.id, state);
  return [s, 'Done.'];
}
