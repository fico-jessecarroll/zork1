/**
 * Syntax matching and noun-phrase resolution for the Zork I parser port.
 *
 * Mirrors the logic in gparser.zil (SYNTAX-CHECK, SNARFEM, GET-OBJECT,
 * THIS-IT?) and gsyntax.zil (SYNTAX declarations) at a level of fidelity
 * appropriate for a TypeScript reimplementation.
 */

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Subset of ZIL location-flag names used in SYNTAX declarations. */
export type LocationBit =
  | 'held'
  | 'carried'
  | 'on-ground'
  | 'in-room'
  | 'take'
  | 'have';

/** Per-object-slot constraints from a SYNTAX entry. */
export interface ObjectConstraint {
  /** Required flag on matching objects (e.g. 'takebit', 'lightbit'). */
  findBit?: string;
  locationBits: LocationBit[];
  allowMany: boolean;
}

/**
 * A single SYNTAX rule, e.g.
 *   TAKE OBJECT (FIND TAKEBIT)(ON-GROUND IN-ROOM MANY) = V-TAKE PRE-TAKE
 */
export interface SyntaxEntry {
  verb: string;
  particle?: string;
  preposition?: string;
  object1?: ObjectConstraint;
  object2?: ObjectConstraint;
  action: string;
  preAction?: string;
}

/** A parsed noun phrase extracted from the token stream. */
export interface NounPhrase {
  noun?: string;
  adjective?: string;
  isAll: boolean;
  isIt: boolean;
  /** Present when the user wrote "X AND Y" — each element is a sub-phrase. */
  conjuncts?: NounPhrase[];
}

/** Successful parse result. */
export interface ParsedCommand {
  action: string;
  preAction?: string;
  directObject?: NounPhrase;
  indirectObject?: NounPhrase;
  syntax: SyntaxEntry;
}

/** Returned when no syntax rule matches the input. */
export interface ParseError {
  kind: 'parse-error';
  message: string;
}

// ---------------------------------------------------------------------------
// Game-world types (consumed by resolveNouns)
// ---------------------------------------------------------------------------

export interface GameObject {
  id: string;
  synonyms: string[];
  adjectives: string[];
  flags: string[];
  /** Parent container id: a room id, 'player', or another object id. */
  location: string;
}

export interface GameState {
  objects: GameObject[];
  playerLocation: string;
  playerInventory: string[];
  /** Id of the last object the player explicitly interacted with (IT). */
  itObject?: string;
}

/** Returned when the noun matches more than one accessible object. */
export interface AmbiguityError {
  kind: 'ambiguity-error';
  message: string;
  matches: GameObject[];
}

/** Returned when no accessible object matches the noun phrase. */
export interface NotFoundError {
  kind: 'not-found-error';
  message: string;
  noun: string;
}

// ---------------------------------------------------------------------------
// Internal constants
// ---------------------------------------------------------------------------

/** Words that carry no semantic weight inside a noun phrase. */
const BUZZ_WORDS = new Set([
  'a', 'an', 'the', 'of', 'then', 'again', 'g', 'oops',
]);

const IT_WORDS = new Set(['it', 'them', 'her', 'him']);

const ALL_WORDS = new Set(['all', 'everything']);

/** Tokens that introduce a second conjunct in a noun phrase. */
const AND_TOKENS = new Set(['and', ',']);

// ---------------------------------------------------------------------------
// Noun-phrase parsing
// ---------------------------------------------------------------------------

function parseNounPhrase(tokens: string[]): NounPhrase {
  const meaningful = tokens.filter(t => !BUZZ_WORDS.has(t));

  if (meaningful.length === 0) {
    return { isAll: false, isIt: false };
  }

  // IT pronoun (IT/THEM/HER/HIM — see gglobals.zil OBJECT IT)
  if (meaningful.length === 1 && IT_WORDS.has(meaningful[0])) {
    return { isAll: false, isIt: true };
  }

  // ALL / EVERYTHING
  if (meaningful.some(t => ALL_WORDS.has(t))) {
    return { isAll: true, isIt: false };
  }

  // Conjunction ("LAMP AND SWORD") — split on the first AND token
  const andIdx = meaningful.findIndex(t => AND_TOKENS.has(t));
  if (andIdx > 0 && andIdx < meaningful.length - 1) {
    const left = parseNounPhrase(meaningful.slice(0, andIdx));
    const right = parseNounPhrase(meaningful.slice(andIdx + 1));
    // Flatten nested conjuncts so "A AND B AND C" becomes three entries
    const leftList = left.conjuncts ?? [left];
    const rightList = right.conjuncts ?? [right];
    return { isAll: false, isIt: false, conjuncts: [...leftList, ...rightList] };
  }

  // Simple noun phrase: [adjective] noun
  const noun = meaningful[meaningful.length - 1];
  const adjective = meaningful.length > 1 ? meaningful[0] : undefined;
  return { noun, adjective, isAll: false, isIt: false };
}

// ---------------------------------------------------------------------------
// Syntax matching
// ---------------------------------------------------------------------------

/**
 * Try to match `rest` (tokens after the verb) against a single SyntaxEntry.
 * Returns the parsed noun phrases on success, or null if the entry does not fit.
 */
function tryMatchEntry(
  entry: SyntaxEntry,
  rest: string[],
): { directObject?: NounPhrase; indirectObject?: NounPhrase } | null {
  let tokens = [...rest];

  // Consume particle (e.g. "UP" in PICK UP)
  if (entry.particle !== undefined) {
    if (tokens.length === 0 || tokens[0] !== entry.particle) return null;
    tokens = tokens.slice(1);
  }

  // Zero-object verb (INVENTORY, LOOK, etc.)
  if (!entry.object1 && !entry.preposition && !entry.object2) {
    return tokens.filter(t => !BUZZ_WORDS.has(t)).length === 0 ? {} : null;
  }

  // Single direct object (TAKE, DROP, EXAMINE, …)
  if (entry.object1 && !entry.preposition && !entry.object2) {
    if (tokens.length === 0) return null;
    return { directObject: parseNounPhrase(tokens) };
  }

  // Direct object + preposition + indirect object (PUT … IN …, GIVE … TO …)
  if (entry.object1 && entry.preposition && entry.object2) {
    // Use lastIndexOf so that "PUT SWORD IN BAG IN CASE" still splits at 'in'
    const prepIdx = tokens.lastIndexOf(entry.preposition);
    if (prepIdx <= 0) return null; // nothing before preposition
    const beforePrep = tokens.slice(0, prepIdx);
    const afterPrep = tokens.slice(prepIdx + 1);
    if (afterPrep.filter(t => !BUZZ_WORDS.has(t)).length === 0) return null;
    return {
      directObject: parseNounPhrase(beforePrep),
      indirectObject: parseNounPhrase(afterPrep),
    };
  }

  // Preposition + indirect object only (no direct object)
  if (!entry.object1 && entry.preposition && entry.object2) {
    if (tokens.length === 0 || tokens[0] !== entry.preposition) return null;
    const afterPrep = tokens.slice(1);
    if (afterPrep.filter(t => !BUZZ_WORDS.has(t)).length === 0) return null;
    return { indirectObject: parseNounPhrase(afterPrep) };
  }

  return null;
}

/**
 * Match a tokenized command against the syntax table.
 *
 * @param tokens       Raw word tokens from user input (case-insensitive).
 * @param syntaxTable  Ordered list of SyntaxEntry rules to try.
 * @param verbSynonyms Optional synonym map applied to the verb token
 *                     (e.g. "GET" → "take").
 */
export function matchSyntax(
  tokens: string[],
  syntaxTable: SyntaxEntry[],
  verbSynonyms?: Map<string, string>,
): ParsedCommand | ParseError {
  if (tokens.length === 0) {
    return { kind: 'parse-error', message: 'I beg your pardon?' };
  }

  const lowered = tokens.map(t => t.toLowerCase());
  const rawVerb = lowered[0];
  const verb = verbSynonyms?.get(rawVerb) ?? rawVerb;
  const rest = lowered.slice(1);

  const verbEntries = syntaxTable.filter(e => e.verb === verb);
  if (verbEntries.length === 0) {
    return { kind: 'parse-error', message: `I don't know the word "${rawVerb}".` };
  }

  for (const entry of verbEntries) {
    const match = tryMatchEntry(entry, rest);
    if (match !== null) {
      return {
        action: entry.action,
        preAction: entry.preAction,
        directObject: match.directObject,
        indirectObject: match.indirectObject,
        syntax: entry,
      };
    }
  }

  return { kind: 'parse-error', message: "That sentence isn't one I recognize." };
}

// ---------------------------------------------------------------------------
// Noun-phrase resolution
// ---------------------------------------------------------------------------

/**
 * Determine whether a game object is reachable by the player.
 * Mirrors gparser.zil ACCESSIBLE? (simplified: no open-container traversal).
 */
function isAccessible(obj: GameObject, state: GameState): boolean {
  return (
    obj.location === state.playerLocation ||
    obj.location === 'player' ||
    state.playerInventory.includes(obj.id)
  );
}

/**
 * Resolve a parsed noun phrase to the matching game object(s).
 *
 * Handles:
 *  - IT / THEM  →  last referenced object (P-IT-OBJECT in gparser.zil)
 *  - ALL        →  all takeable objects in the current room
 *  - "X AND Y"  →  conjunct resolution (flattened)
 *  - Adjective filtering (THIS-IT? logic)
 *  - NotFoundError  when no object matches ("You can't see any X here!")
 *  - AmbiguityError when multiple objects match ("Which X do you mean?")
 */
export function resolveNouns(
  nounPhrase: NounPhrase,
  state: GameState,
): GameObject[] | AmbiguityError | NotFoundError {
  // Conjuncts: resolve each sub-phrase and flatten results
  if (nounPhrase.conjuncts) {
    const results: GameObject[] = [];
    for (const conjunct of nounPhrase.conjuncts) {
      const resolved = resolveNouns(conjunct, state);
      if ('kind' in resolved) return resolved; // propagate first error
      results.push(...resolved);
    }
    return results;
  }

  // IT: resolve to last referenced object (P-IT-OBJECT)
  if (nounPhrase.isIt) {
    if (!state.itObject) {
      return {
        kind: 'not-found-error',
        message: "I don't see what you're referring to.",
        noun: 'it',
      };
    }
    const itObj = state.objects.find(o => o.id === state.itObject);
    if (!itObj || !isAccessible(itObj, state)) {
      return {
        kind: 'not-found-error',
        message: "I don't see what you're referring to.",
        noun: 'it',
      };
    }
    return [itObj];
  }

  // ALL: every takeable object sitting in the current room
  if (nounPhrase.isAll) {
    const all = state.objects.filter(
      o => o.location === state.playerLocation && o.flags.includes('takebit'),
    );
    return all;
  }

  if (!nounPhrase.noun) {
    return {
      kind: 'not-found-error',
      message: 'There seems to be a noun missing in that sentence!',
      noun: '',
    };
  }

  const { noun, adjective } = nounPhrase;

  const candidates = state.objects.filter(o => {
    if (!isAccessible(o, state)) return false;
    if (!o.synonyms.includes(noun)) return false;
    if (adjective && !o.adjectives.includes(adjective)) return false;
    return true;
  });

  if (candidates.length === 0) {
    const displayNoun = adjective ? `${adjective} ${noun}` : noun;
    return {
      kind: 'not-found-error',
      message: `You can't see any ${displayNoun} here!`,
      noun: displayNoun,
    };
  }

  if (candidates.length > 1) {
    const list = candidates.map(c => `the ${c.id}`).join(' or ');
    return {
      kind: 'ambiguity-error',
      message: `Which ${noun} do you mean, ${list}?`,
      matches: candidates,
    };
  }

  return candidates;
}
