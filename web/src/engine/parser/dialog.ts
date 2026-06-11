/**
 * Dialog-layer parser handlers: AGAIN, OOPS, and orphan resolution.
 *
 * These mirror the AGAIN-LEXV / OOPS-TABLE / P-OFLAG logic in gparser.zil.
 * All functions are pure — they return new values rather than mutating state.
 */

export interface ParsedCommand {
  verb: string;
  directObject?: string;
  indirectObject?: string;
  prep?: string;
}

export interface ParseError {
  kind: 'error';
  message: string;
}

export interface StillAmbiguous {
  kind: 'ambiguous';
  prompt: string;
}

/** Context saved when the parser encounters an unknown word (OOPS-TABLE). */
export interface UnknownWordContext {
  /** Raw uppercase tokens from the failed parse (e.g. ['TAKE', 'FROBOZZ']). */
  tokens: string[];
  /** Index into tokens of the unknown word. */
  unknownIndex: number;
}

export interface ParserState {
  /** Last successfully dispatched command, stored in AGAIN-LEXV. */
  lastCommand: ParsedCommand | null;
  /** Set when the parser flagged an unknown word (O-PTR non-null). */
  unknownWordContext: UnknownWordContext | null;
  /**
   * Non-null while an orphan is pending (P-OFLAG = true).
   * Stores the verb that was asked about so handleOrphan can merge it.
   */
  pendingOrphanVerb?: string | null;
  /**
   * Optional preposition associated with the orphaned verb (e.g. PUT … IN).
   * When set, the noun supplied to handleOrphan becomes the indirect object.
   */
  pendingPrep?: string;
}

/**
 * Replay the last successfully-dispatched command (ZIL: AGAIN / G).
 *
 * Mirrors the AGAIN branch in PARSER: restores AGAIN-LEXV to P-LEXV and
 * re-runs the parse.  Here we simply return the stored ParsedCommand.
 *
 * Throws when:
 *  - No prior command exists ("Beg pardon?")
 *  - An orphan is currently pending ("It's difficult to repeat fragments.")
 */
export function handleAgain(state: ParserState): ParsedCommand {
  if (state.pendingOrphanVerb) {
    throw new Error("It's difficult to repeat fragments.");
  }
  if (!state.lastCommand) {
    throw new Error('Beg pardon?');
  }
  return state.lastCommand;
}

/**
 * Replace the last flagged unknown token with the player's correction (ZIL: OOPS).
 *
 * Mirrors the OOPS branch in PARSER: substitutes the word at O-PTR in
 * AGAIN-LEXV with the first word of the player's correction, then re-parses.
 *
 * Returns ParseError when:
 *  - No unknown word was flagged ("There was no word to replace!")
 */
export function handleOops(
  correction: string,
  state: ParserState,
): ParsedCommand | ParseError {
  if (!state.unknownWordContext) {
    return { kind: 'error', message: 'There was no word to replace!' };
  }
  const { tokens, unknownIndex } = state.unknownWordContext;
  const corrected = tokens.map((t, i) =>
    i === unknownIndex ? correction.trim().toUpperCase() : t,
  );
  return tokensToCommand(corrected);
}

/**
 * Merge a pending orphaned verb with the noun supplied by the player (ZIL: ORPHAN-MERGE).
 *
 * After SYNTAX-CHECK sets P-OFLAG and asks "What do you want to <verb>?",
 * this is called with the player's answer.  Returns a complete ParsedCommand
 * when a noun is provided, or StillAmbiguous when the input is empty.
 *
 * When state.pendingPrep is set (e.g. "PUT … IN"), the noun becomes the
 * indirect object rather than the direct object.
 */
export function handleOrphan(
  playerInput: string,
  pendingVerb: string,
  state: ParserState,
): ParsedCommand | StillAmbiguous {
  const noun = playerInput.trim().toUpperCase();
  const verb = pendingVerb.toUpperCase();

  if (!noun) {
    return {
      kind: 'ambiguous',
      prompt: `What do you want to ${pendingVerb.toLowerCase()}?`,
    };
  }

  if (state.pendingPrep) {
    return { verb, prep: state.pendingPrep, indirectObject: noun };
  }

  return { verb, directObject: noun };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Build a ParsedCommand from a corrected token list.
 * Assumes tokens[0] is the verb and tokens[1] (if present) is the direct object.
 * Sufficient for the OOPS use-case: only one substitution is made per correction.
 */
function tokensToCommand(tokens: string[]): ParsedCommand {
  const [verb, directObject] = tokens;
  if (directObject !== undefined) {
    return { verb, directObject };
  }
  return { verb };
}
