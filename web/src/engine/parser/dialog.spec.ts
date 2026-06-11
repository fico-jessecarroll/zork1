import {
  handleAgain,
  handleOops,
  handleOrphan,
  ParsedCommand,
  ParseError,
  ParserState,
  StillAmbiguous,
} from './dialog';

function baseState(overrides: Partial<ParserState> = {}): ParserState {
  return {
    lastCommand: null,
    unknownWordContext: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// handleAgain
// ---------------------------------------------------------------------------

describe('handleAgain', () => {
  it('replays the last command', () => {
    const last: ParsedCommand = { verb: 'TAKE', directObject: 'LEAFLET' };
    const result = handleAgain(baseState({ lastCommand: last }));
    expect(result).toEqual(last);
  });

  it('replays a direction-only command', () => {
    const last: ParsedCommand = { verb: 'WALK', directObject: 'NORTH' };
    const result = handleAgain(baseState({ lastCommand: last }));
    expect(result).toEqual(last);
  });

  it('replays a command with a preposition and indirect object', () => {
    const last: ParsedCommand = {
      verb: 'PUT',
      directObject: 'LEAFLET',
      prep: 'IN',
      indirectObject: 'MAILBOX',
    };
    const result = handleAgain(baseState({ lastCommand: last }));
    expect(result).toEqual(last);
  });

  it('throws when no prior command exists', () => {
    expect(() => handleAgain(baseState())).toThrow('Beg pardon?');
  });

  it('throws when called while an orphan is pending', () => {
    const state = baseState({
      lastCommand: { verb: 'OPEN' },
      pendingOrphanVerb: 'OPEN',
    });
    expect(() => handleAgain(state)).toThrow("It's difficult to repeat fragments.");
  });
});

// ---------------------------------------------------------------------------
// handleOops
// ---------------------------------------------------------------------------

describe('handleOops', () => {
  it('replaces the last unknown token and returns a corrected command', () => {
    const state = baseState({
      unknownWordContext: {
        tokens: ['TAKE', 'FROBOZZ'],
        unknownIndex: 1,
      },
    });
    const result = handleOops('LEAFLET', state);
    expect(result).toEqual<ParsedCommand>({ verb: 'TAKE', directObject: 'LEAFLET' });
  });

  it('replaces an unknown verb token', () => {
    const state = baseState({
      unknownWordContext: {
        tokens: ['GRUE', 'MAILBOX'],
        unknownIndex: 0,
      },
    });
    const result = handleOops('OPEN', state);
    expect(result).toEqual<ParsedCommand>({ verb: 'OPEN', directObject: 'MAILBOX' });
  });

  it('normalises correction to uppercase', () => {
    const state = baseState({
      unknownWordContext: {
        tokens: ['EXAMINE', 'thingy'],
        unknownIndex: 1,
      },
    });
    const result = handleOops('leaflet', state);
    expect(result).toEqual<ParsedCommand>({ verb: 'EXAMINE', directObject: 'LEAFLET' });
  });

  it('returns ParseError when there is no unknown word context', () => {
    const result = handleOops('LEAFLET', baseState()) as ParseError;
    expect(result.kind).toBe('error');
    expect(result.message).toBe('There was no word to replace!');
  });
});

// ---------------------------------------------------------------------------
// handleOrphan
// ---------------------------------------------------------------------------

describe('handleOrphan', () => {
  it('resolves OPEN followed by MAILBOX into OPEN MAILBOX', () => {
    const result = handleOrphan('MAILBOX', 'OPEN', baseState());
    expect(result).toEqual<ParsedCommand>({ verb: 'OPEN', directObject: 'MAILBOX' });
  });

  it('resolves TAKE followed by LEAFLET', () => {
    const result = handleOrphan('LEAFLET', 'TAKE', baseState());
    expect(result).toEqual<ParsedCommand>({ verb: 'TAKE', directObject: 'LEAFLET' });
  });

  it('normalises verb and noun to uppercase', () => {
    const result = handleOrphan('mailbox', 'open', baseState());
    expect(result).toEqual<ParsedCommand>({ verb: 'OPEN', directObject: 'MAILBOX' });
  });

  it('uses pendingPrep to form an indirect-object command', () => {
    const state = baseState({ pendingPrep: 'IN' });
    const result = handleOrphan('MAILBOX', 'PUT', state);
    expect(result).toEqual<ParsedCommand>({
      verb: 'PUT',
      prep: 'IN',
      indirectObject: 'MAILBOX',
    });
  });

  it('returns StillAmbiguous when the player input is empty', () => {
    const result = handleOrphan('', 'OPEN', baseState()) as StillAmbiguous;
    expect(result.kind).toBe('ambiguous');
    expect(result.prompt).toContain('open');
  });

  it('returns StillAmbiguous when the player input is only whitespace', () => {
    const result = handleOrphan('   ', 'TAKE', baseState()) as StillAmbiguous;
    expect(result.kind).toBe('ambiguous');
    expect(result.prompt).toContain('take');
  });
});
