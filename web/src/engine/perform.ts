export const M_HANDLED = 1 as const;
export const M_NOT_HANDLED = false as const;
export const M_FATAL = 2 as const;
export const M_BEG = 1 as const;

export type PerformResult = typeof M_HANDLED | typeof M_NOT_HANDLED | typeof M_FATAL;

/** An action or container function on a game object. */
export type ActionFn = (msg?: number) => PerformResult;

/** A game object that may have an action handler, a container function, and a location. */
export interface ZorkObject {
  readonly action?: ActionFn;
  readonly contfcn?: ActionFn;
  readonly loc?: ZorkObject | null;
}

/** Slice of game state required by perform. */
export interface GameState {
  /** The current actor (WINNER). Must have a loc pointing to the current room. */
  readonly winner: ZorkObject;
  /** Preaction table indexed by verb number. Entries may be null/undefined. */
  readonly preactions: ReadonlyArray<ActionFn | null | undefined>;
  /** Default verb action table indexed by verb number. */
  readonly actions: ReadonlyArray<ActionFn | null | undefined>;
  /** The numeric index of the WALK verb, used to skip CONTFCN and PRSO action. */
  readonly vWalk: number;
}

/**
 * PERFORM dispatch chain — mirrors the ZIL PERFORM routine from gmain.zil.
 *
 * Steps short-circuit on the first truthy (M_HANDLED or M_FATAL) return value.
 * Returns M_NOT_HANDLED if every step declines.
 */
export function perform(
  verb: number,
  prso: ZorkObject | null,
  prsi: ZorkObject | null,
  state: GameState,
): PerformResult {
  const { winner, preactions, actions, vWalk } = state;
  const isWalk = verb === vWalk;

  // (1) WINNER's action (actor action — no message argument)
  if (winner.action) {
    const v = winner.action();
    if (v) return v;
  }

  // (2) Room M_BEG — winner's current room action called with M_BEG
  const room = winner.loc;
  if (room?.action) {
    const v = room.action(M_BEG);
    if (v) return v;
  }

  // (3) Preaction table entry for this verb
  const preaction = preactions[verb];
  if (preaction) {
    const v = preaction();
    if (v) return v;
  }

  // (4) PRSI object action
  if (prsi?.action) {
    const v = prsi.action();
    if (v) return v;
  }

  // (5) PRSO container's CONTFCN (skipped for WALK verb)
  if (!isWalk && prso) {
    const container = prso.loc;
    if (container?.contfcn) {
      const v = container.contfcn();
      if (v) return v;
    }
  }

  // (6) PRSO object action (skipped for WALK verb)
  if (!isWalk && prso?.action) {
    const v = prso.action();
    if (v) return v;
  }

  // (7) Default verb table
  const defaultAction = actions[verb];
  if (defaultAction) {
    const v = defaultAction();
    if (v) return v;
  }

  return M_NOT_HANDLED;
}
