import type { GameState, GameObject } from '../verbs/types';

const CYCLOPS_ID  = 'CYCLOPS';
const CYCLOPS_ROOM = 'CYCLOPS-ROOM';
const FOODBIT      = 'FOODBIT';

/** True when the cyclops is still in CYCLOPS-ROOM (passage up is blocked). */
export function isCyclopsPresent(state: GameState): boolean {
  return state.objects.get(CYCLOPS_ID)?.parent === CYCLOPS_ROOM;
}

/**
 * Give an item to the cyclops.
 * - FOODBIT items: cyclops flees (removed from room).
 * - Non-food items: refusal message, state unchanged.
 */
export function handleGiveFood(state: GameState, item: GameObject): [GameState, string] {
  if (!item.flags.has(FOODBIT)) {
    return [state, 'The cyclops is not interested in that.'];
  }
  const cyclops = state.objects.get(CYCLOPS_ID);
  if (!cyclops) return [state, 'There is no cyclops here.'];
  const newObjects = new Map(state.objects);
  newObjects.set(CYCLOPS_ID, { ...cyclops, parent: null });
  return [
    { ...state, objects: newObjects },
    'The cyclops, smelling the food, lets out a terrible shriek and bolts through the room.',
  ];
}

/** Cyclops recognises Odysseus/Ulysses and flees in terror. */
export function handleOdysseus(state: GameState): [GameState, string] {
  const cyclops = state.objects.get(CYCLOPS_ID);
  if (!cyclops) return [state, 'There is no cyclops here.'];
  const newObjects = new Map(state.objects);
  newObjects.set(CYCLOPS_ID, { ...cyclops, parent: null });
  return [
    { ...state, objects: newObjects },
    'The cyclops, overcome with fear, drops his club and flees the room.',
  ];
}

/**
 * Handle a 'say WORD' command in the cyclops room.
 * Returns [newState, message] when the word triggers the puzzle, null otherwise.
 */
export function handleSay(state: GameState, word: string): [GameState, string] | null {
  const lc = word.toLowerCase().trim();
  if (lc === 'odysseus' || lc === 'ulysses') {
    return handleOdysseus(state);
  }
  return null;
}
