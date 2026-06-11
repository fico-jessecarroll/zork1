import {
  matchSyntax,
  resolveNouns,
  AmbiguityError,
  GameObject,
  GameState,
  NotFoundError,
  NounPhrase,
  ParsedCommand,
  ParseError,
  SyntaxEntry,
} from './syntax';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

/** Minimal syntax table derived from gsyntax.zil rules. */
const SYNTAX_TABLE: SyntaxEntry[] = [
  // TAKE OBJECT (FIND TAKEBIT) (ON-GROUND IN-ROOM MANY) = V-TAKE PRE-TAKE
  {
    verb: 'take',
    object1: {
      findBit: 'takebit',
      locationBits: ['on-ground', 'in-room'],
      allowMany: true,
    },
    action: 'V-TAKE',
    preAction: 'PRE-TAKE',
  },
  // PUT OBJECT (HELD MANY HAVE) IN OBJECT = V-PUT PRE-PUT
  {
    verb: 'put',
    preposition: 'in',
    object1: { locationBits: ['held', 'have'], allowMany: true },
    object2: { locationBits: ['on-ground', 'in-room'], allowMany: false },
    action: 'V-PUT',
    preAction: 'PRE-PUT',
  },
  // PUT OBJECT (HELD MANY HAVE) ON OBJECT = V-PUT-ON PRE-PUT
  {
    verb: 'put',
    preposition: 'on',
    object1: { locationBits: ['held', 'have'], allowMany: true },
    object2: { locationBits: ['on-ground', 'in-room'], allowMany: false },
    action: 'V-PUT-ON',
    preAction: 'PRE-PUT',
  },
  // DROP OBJECT (HELD MANY HAVE) = V-DROP PRE-DROP
  {
    verb: 'drop',
    object1: { locationBits: ['held', 'have'], allowMany: true },
    action: 'V-DROP',
    preAction: 'PRE-DROP',
  },
  // EXAMINE OBJECT (MANY) = V-EXAMINE
  {
    verb: 'examine',
    object1: {
      locationBits: ['held', 'carried', 'on-ground', 'in-room'],
      allowMany: true,
    },
    action: 'V-EXAMINE',
  },
  // LOOK = V-LOOK
  {
    verb: 'look',
    action: 'V-LOOK',
  },
  // INVENTORY = V-INVENTORY
  {
    verb: 'inventory',
    action: 'V-INVENTORY',
  },
];

/** SYNONYM declarations from gsyntax.zil relevant to these tests. */
const VERB_SYNONYMS = new Map<string, string>([
  ['get', 'take'],
  ['hold', 'take'],
  ['carry', 'take'],
  ['remove', 'take'],
  ['grab', 'take'],
  ['catch', 'take'],
  ['l', 'look'],
  ['i', 'inventory'],
  ['x', 'examine'],
  ['describe', 'examine'],
]);

// ---------------------------------------------------------------------------
// Game objects for resolveNouns tests
// ---------------------------------------------------------------------------

const SWORD: GameObject = {
  id: 'sword',
  synonyms: ['sword'],
  adjectives: ['elvish'],
  flags: ['takebit', 'weaponbit'],
  location: 'clearing',
};

const LAMP: GameObject = {
  id: 'lamp',
  synonyms: ['lamp', 'lantern'],
  adjectives: ['brass'],
  flags: ['takebit', 'lightbit'],
  location: 'player',
};

const TROPHY_CASE: GameObject = {
  id: 'trophy-case',
  synonyms: ['case', 'trophy', 'cabinet'],
  adjectives: ['trophy', 'glass'],
  flags: ['contbit', 'openbit'],
  location: 'clearing',
};

const RUSTY_SWORD: GameObject = {
  id: 'rusty-sword',
  synonyms: ['sword'],
  adjectives: ['rusty'],
  flags: ['takebit', 'weaponbit'],
  location: 'clearing',
};

const DISTANT_TROLL: GameObject = {
  id: 'troll',
  synonyms: ['troll'],
  adjectives: [],
  flags: ['actorbit'],
  location: 'troll-room', // not the player's location
};

/** Base game state: player is in 'clearing', holding the lamp. */
const BASE_STATE: GameState = {
  objects: [SWORD, LAMP, TROPHY_CASE],
  playerLocation: 'clearing',
  playerInventory: ['lamp'],
  itObject: 'sword',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function asCommand(result: ParsedCommand | ParseError): ParsedCommand {
  if ('kind' in result) throw new Error(`Expected command, got error: ${result.message}`);
  return result;
}

function asError(result: ParsedCommand | ParseError): ParseError {
  if (!('kind' in result)) throw new Error('Expected ParseError, got command');
  return result;
}

function asObjects(
  result: GameObject[] | AmbiguityError | NotFoundError,
): GameObject[] {
  if ('kind' in result) throw new Error(`Expected objects, got ${result.kind}: ${result.message}`);
  return result;
}

function asAmbiguity(
  result: GameObject[] | AmbiguityError | NotFoundError,
): AmbiguityError {
  if (!('kind' in result) || result.kind !== 'ambiguity-error') {
    throw new Error(`Expected ambiguity-error, got ${JSON.stringify(result)}`);
  }
  return result as AmbiguityError;
}

function asNotFound(
  result: GameObject[] | AmbiguityError | NotFoundError,
): NotFoundError {
  if (!('kind' in result) || result.kind !== 'not-found-error') {
    throw new Error(`Expected not-found-error, got ${JSON.stringify(result)}`);
  }
  return result as NotFoundError;
}

// ---------------------------------------------------------------------------
// matchSyntax tests
// ---------------------------------------------------------------------------

describe('matchSyntax', () => {
  describe('TAKE SWORD', () => {
    it('maps to V-TAKE with sword as direct object', () => {
      const cmd = asCommand(matchSyntax(['TAKE', 'SWORD'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.action).toBe('V-TAKE');
      expect(cmd.preAction).toBe('PRE-TAKE');
      expect(cmd.directObject?.noun).toBe('sword');
      expect(cmd.directObject?.isAll).toBe(false);
      expect(cmd.directObject?.isIt).toBe(false);
      expect(cmd.indirectObject).toBeUndefined();
    });

    it('is case-insensitive', () => {
      const cmd = asCommand(matchSyntax(['take', 'sword'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.action).toBe('V-TAKE');
      expect(cmd.directObject?.noun).toBe('sword');
    });

    it('strips articles from the noun phrase', () => {
      const cmd = asCommand(matchSyntax(['take', 'the', 'sword'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.directObject?.noun).toBe('sword');
      expect(cmd.directObject?.adjective).toBeUndefined();
    });

    it('captures an adjective when present', () => {
      const cmd = asCommand(matchSyntax(['take', 'elvish', 'sword'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.directObject?.noun).toBe('sword');
      expect(cmd.directObject?.adjective).toBe('elvish');
    });
  });

  describe('PUT SWORD IN CASE', () => {
    it('maps to V-PUT with sword as direct and case as indirect object', () => {
      const cmd = asCommand(
        matchSyntax(['PUT', 'SWORD', 'IN', 'CASE'], SYNTAX_TABLE, VERB_SYNONYMS),
      );
      expect(cmd.action).toBe('V-PUT');
      expect(cmd.preAction).toBe('PRE-PUT');
      expect(cmd.directObject?.noun).toBe('sword');
      expect(cmd.indirectObject?.noun).toBe('case');
    });

    it('selects the ON variant when the preposition is ON', () => {
      const cmd = asCommand(
        matchSyntax(['put', 'lamp', 'on', 'case'], SYNTAX_TABLE, VERB_SYNONYMS),
      );
      expect(cmd.action).toBe('V-PUT-ON');
      expect(cmd.directObject?.noun).toBe('lamp');
      expect(cmd.indirectObject?.noun).toBe('case');
    });

    it('preserves adjectives on both objects', () => {
      const cmd = asCommand(
        matchSyntax(
          ['put', 'elvish', 'sword', 'in', 'trophy', 'case'],
          SYNTAX_TABLE,
          VERB_SYNONYMS,
        ),
      );
      expect(cmd.directObject?.noun).toBe('sword');
      expect(cmd.directObject?.adjective).toBe('elvish');
      expect(cmd.indirectObject?.noun).toBe('case');
      expect(cmd.indirectObject?.adjective).toBe('trophy');
    });
  });

  describe('TAKE ALL', () => {
    it('sets isAll=true on the direct object', () => {
      const cmd = asCommand(matchSyntax(['TAKE', 'ALL'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.action).toBe('V-TAKE');
      expect(cmd.directObject?.isAll).toBe(true);
      expect(cmd.directObject?.noun).toBeUndefined();
    });

    it('handles "TAKE EVERYTHING" as a synonym for ALL', () => {
      const cmd = asCommand(
        matchSyntax(['take', 'everything'], SYNTAX_TABLE, VERB_SYNONYMS),
      );
      expect(cmd.directObject?.isAll).toBe(true);
    });
  });

  describe('GET LAMP AND SWORD', () => {
    it('resolves GET as a synonym for TAKE', () => {
      const cmd = asCommand(
        matchSyntax(['GET', 'LAMP', 'AND', 'SWORD'], SYNTAX_TABLE, VERB_SYNONYMS),
      );
      expect(cmd.action).toBe('V-TAKE');
    });

    it('returns conjuncts with one entry per noun', () => {
      const cmd = asCommand(
        matchSyntax(['get', 'lamp', 'and', 'sword'], SYNTAX_TABLE, VERB_SYNONYMS),
      );
      const conjuncts = cmd.directObject?.conjuncts;
      expect(conjuncts).toHaveLength(2);
      expect(conjuncts?.[0].noun).toBe('lamp');
      expect(conjuncts?.[1].noun).toBe('sword');
    });

    it('handles three-way conjunctions (A AND B AND C)', () => {
      const cmd = asCommand(
        matchSyntax(
          ['take', 'lamp', 'and', 'sword', 'and', 'case'],
          SYNTAX_TABLE,
          VERB_SYNONYMS,
        ),
      );
      expect(cmd.directObject?.conjuncts).toHaveLength(3);
    });
  });

  describe('zero-object verbs', () => {
    it('matches LOOK with no objects', () => {
      const cmd = asCommand(matchSyntax(['look'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.action).toBe('V-LOOK');
      expect(cmd.directObject).toBeUndefined();
    });

    it('matches I (synonym for INVENTORY)', () => {
      const cmd = asCommand(matchSyntax(['i'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(cmd.action).toBe('V-INVENTORY');
    });
  });

  describe('invalid syntax', () => {
    it('returns parse-error for empty input', () => {
      const err = asError(matchSyntax([], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(err.kind).toBe('parse-error');
      expect(err.message).toBe('I beg your pardon?');
    });

    it('returns parse-error for an unknown verb', () => {
      const err = asError(matchSyntax(['xyzzy', 'lamp'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(err.kind).toBe('parse-error');
      expect(err.message).toMatch(/don't know the word/i);
      expect(err.message).toContain('xyzzy');
    });

    it('returns parse-error when PUT has no preposition', () => {
      // "PUT SWORD" matches no PUT entry (all require IN or ON)
      const err = asError(matchSyntax(['put', 'sword'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(err.kind).toBe('parse-error');
      expect(err.message).toMatch(/isn't one I recognize/i);
    });

    it('returns parse-error when a verb that requires an object gets none', () => {
      // TAKE with nothing after it has no token for the noun clause
      const err = asError(matchSyntax(['take'], SYNTAX_TABLE, VERB_SYNONYMS));
      expect(err.kind).toBe('parse-error');
    });
  });
});

// ---------------------------------------------------------------------------
// resolveNouns tests
// ---------------------------------------------------------------------------

describe('resolveNouns', () => {
  describe('single noun — normal lookup', () => {
    it('returns the matching object from the current room', () => {
      const phrase: NounPhrase = { noun: 'sword', isAll: false, isIt: false };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sword');
    });

    it('returns an object currently held by the player', () => {
      const phrase: NounPhrase = { noun: 'lamp', isAll: false, isIt: false };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('lamp');
    });

    it('returns the container (trophy-case) from the room', () => {
      const phrase: NounPhrase = { noun: 'case', isAll: false, isIt: false };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      expect(result[0].id).toBe('trophy-case');
    });
  });

  describe('IT pronoun', () => {
    it('resolves IT to the last referenced object', () => {
      const phrase: NounPhrase = { isAll: false, isIt: true };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('sword'); // BASE_STATE.itObject
    });

    it('returns not-found-error when itObject is unset', () => {
      const state: GameState = { ...BASE_STATE, itObject: undefined };
      const phrase: NounPhrase = { isAll: false, isIt: true };
      const err = asNotFound(resolveNouns(phrase, state));
      expect(err.kind).toBe('not-found-error');
      expect(err.noun).toBe('it');
    });

    it('returns not-found-error when the IT object is no longer accessible', () => {
      const state: GameState = {
        ...BASE_STATE,
        // sword is in 'clearing' but player has moved
        playerLocation: 'maze',
        playerInventory: [],
        itObject: 'sword',
      };
      const phrase: NounPhrase = { isAll: false, isIt: true };
      const err = asNotFound(resolveNouns(phrase, state));
      expect(err.kind).toBe('not-found-error');
    });
  });

  describe('ALL', () => {
    it('returns all takeable objects in the current room (not in inventory)', () => {
      const phrase: NounPhrase = { isAll: true, isIt: false };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      // In 'clearing': SWORD (takebit ✓), TROPHY_CASE (no takebit), LAMP is in 'player'
      expect(result.map(o => o.id)).toEqual(['sword']);
    });

    it('returns an empty array when nothing takeable is in the room', () => {
      const state: GameState = { ...BASE_STATE, playerLocation: 'empty-room' };
      const phrase: NounPhrase = { isAll: true, isIt: false };
      const result = asObjects(resolveNouns(phrase, state));
      expect(result).toHaveLength(0);
    });
  });

  describe('adjective filtering', () => {
    it('matches when adjective is present and correct', () => {
      const phrase: NounPhrase = {
        noun: 'sword',
        adjective: 'elvish',
        isAll: false,
        isIt: false,
      };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      expect(result[0].id).toBe('sword');
    });

    it('returns not-found-error when adjective does not match', () => {
      const phrase: NounPhrase = {
        noun: 'lamp',
        adjective: 'rusty', // lamp is 'brass', not 'rusty'
        isAll: false,
        isIt: false,
      };
      const err = asNotFound(resolveNouns(phrase, BASE_STATE));
      expect(err.kind).toBe('not-found-error');
      expect(err.noun).toContain('rusty');
    });

    it('disambiguates between two objects with the same noun via adjective', () => {
      const stateWithTwo: GameState = {
        ...BASE_STATE,
        objects: [SWORD, RUSTY_SWORD, LAMP, TROPHY_CASE],
      };
      const phrase: NounPhrase = {
        noun: 'sword',
        adjective: 'rusty',
        isAll: false,
        isIt: false,
      };
      const result = asObjects(resolveNouns(phrase, stateWithTwo));
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('rusty-sword');
    });
  });

  describe('conjunction (AND)', () => {
    it('resolves GET LAMP AND SWORD to both objects', () => {
      const phrase: NounPhrase = {
        isAll: false,
        isIt: false,
        conjuncts: [
          { noun: 'lamp', isAll: false, isIt: false },
          { noun: 'sword', isAll: false, isIt: false },
        ],
      };
      const result = asObjects(resolveNouns(phrase, BASE_STATE));
      expect(result.map(o => o.id)).toEqual(['lamp', 'sword']);
    });

    it('propagates the first error encountered in a conjunction', () => {
      const phrase: NounPhrase = {
        isAll: false,
        isIt: false,
        conjuncts: [
          { noun: 'lamp', isAll: false, isIt: false },
          { noun: 'chest', isAll: false, isIt: false }, // doesn't exist
        ],
      };
      const err = asNotFound(resolveNouns(phrase, BASE_STATE));
      expect(err.kind).toBe('not-found-error');
      expect(err.noun).toContain('chest');
    });
  });

  describe('not-found (not here) error', () => {
    it('returns not-found-error for a noun with no accessible match', () => {
      const phrase: NounPhrase = { noun: 'troll', isAll: false, isIt: false };
      const stateWithTroll: GameState = {
        ...BASE_STATE,
        objects: [...BASE_STATE.objects, DISTANT_TROLL],
      };
      const err = asNotFound(resolveNouns(phrase, stateWithTroll));
      expect(err.kind).toBe('not-found-error');
      expect(err.message).toMatch(/can't see any troll/i);
    });

    it('returns not-found-error for a noun that does not exist at all', () => {
      const phrase: NounPhrase = { noun: 'unicorn', isAll: false, isIt: false };
      const err = asNotFound(resolveNouns(phrase, BASE_STATE));
      expect(err.kind).toBe('not-found-error');
      expect(err.noun).toBe('unicorn');
    });
  });

  describe('ambiguity error', () => {
    it('returns ambiguity-error when multiple objects share the same noun', () => {
      const stateWithTwo: GameState = {
        ...BASE_STATE,
        objects: [SWORD, RUSTY_SWORD, LAMP, TROPHY_CASE],
      };
      const phrase: NounPhrase = { noun: 'sword', isAll: false, isIt: false };
      const err = asAmbiguity(resolveNouns(phrase, stateWithTwo));
      expect(err.kind).toBe('ambiguity-error');
      expect(err.matches).toHaveLength(2);
      expect(err.message).toMatch(/which sword/i);
    });
  });
});
