import { tokenize, Token } from './tokenizer';

describe('tokenize — direction synonyms', () => {
  it('maps N to canonical NORTH', () => {
    const [tok] = tokenize('N');
    expect(tok).toEqual<Token>({ raw: 'N', canonical: 'NORTH', partOfSpeech: 'direction' });
  });

  it('maps S to canonical SOUTH', () => {
    const [tok] = tokenize('S');
    expect(tok).toEqual<Token>({ raw: 'S', canonical: 'SOUTH', partOfSpeech: 'direction' });
  });

  it('maps E to canonical EAST', () => {
    const [tok] = tokenize('E');
    expect(tok).toEqual<Token>({ raw: 'E', canonical: 'EAST', partOfSpeech: 'direction' });
  });

  it('maps W to canonical WEST', () => {
    const [tok] = tokenize('W');
    expect(tok).toEqual<Token>({ raw: 'W', canonical: 'WEST', partOfSpeech: 'direction' });
  });

  it('maps U to canonical UP', () => {
    const [tok] = tokenize('U');
    expect(tok).toEqual<Token>({ raw: 'U', canonical: 'UP', partOfSpeech: 'direction' });
  });

  it('maps D to canonical DOWN', () => {
    const [tok] = tokenize('D');
    expect(tok).toEqual<Token>({ raw: 'D', canonical: 'DOWN', partOfSpeech: 'direction' });
  });

  it('maps NORTHWEST to canonical NW', () => {
    const [tok] = tokenize('NORTHWEST');
    expect(tok).toEqual<Token>({ raw: 'NORTHWEST', canonical: 'NW', partOfSpeech: 'direction' });
  });

  it('preserves raw case while resolving canonical', () => {
    const [tok] = tokenize('n');
    expect(tok.raw).toBe('n');
    expect(tok.canonical).toBe('NORTH');
    expect(tok.partOfSpeech).toBe('direction');
  });
});

describe('tokenize — AGAIN and other buzz words', () => {
  it('tags AGAIN as buzzword', () => {
    const [tok] = tokenize('AGAIN');
    expect(tok).toEqual<Token>({ raw: 'AGAIN', canonical: 'AGAIN', partOfSpeech: 'buzzword' });
  });

  it('tags G (repeat alias) as buzzword', () => {
    const [tok] = tokenize('G');
    expect(tok).toEqual<Token>({ raw: 'G', canonical: 'G', partOfSpeech: 'buzzword' });
  });

  it('tags THE as buzzword', () => {
    const [tok] = tokenize('THE');
    expect(tok).toEqual<Token>({ raw: 'THE', canonical: 'THE', partOfSpeech: 'buzzword' });
  });
});

describe('tokenize — multiple-word inputs', () => {
  it('tokenizes a two-word command with a known verb', () => {
    const tokens = tokenize('TAKE LAMP');
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toEqual<Token>({ raw: 'TAKE', canonical: 'TAKE', partOfSpeech: 'verb' });
    expect(tokens[1]).toEqual<Token>({ raw: 'LAMP', canonical: null, partOfSpeech: 'unknown' });
  });

  it('resolves synonyms within a multi-word input', () => {
    const tokens = tokenize('GO NORTH');
    expect(tokens[0]).toEqual<Token>({ raw: 'GO', canonical: 'WALK', partOfSpeech: 'verb' });
    expect(tokens[1]).toEqual<Token>({ raw: 'NORTH', canonical: 'NORTH', partOfSpeech: 'direction' });
  });

  it('handles extra whitespace between words', () => {
    const tokens = tokenize('  PUT   SWORD   IN   CASE  ');
    expect(tokens).toHaveLength(4);
    expect(tokens[0].canonical).toBe('PUT');
    expect(tokens[1].canonical).toBeNull();  // SWORD is a dungeon object, not in base vocab
    expect(tokens[2].canonical).toBe('IN');
    expect(tokens[3].canonical).toBeNull();  // CASE is a dungeon object, not in base vocab
  });

  it('handles a preposition synonym within a command', () => {
    const tokens = tokenize('PUT SWORD INTO CASE');
    expect(tokens[2]).toEqual<Token>({ raw: 'INTO', canonical: 'IN', partOfSpeech: 'preposition' });
  });
});

describe('tokenize — unknown words', () => {
  it('returns unknown for an unrecognized word', () => {
    const [tok] = tokenize('XANTHOPHYLL');
    expect(tok).toEqual<Token>({ raw: 'XANTHOPHYLL', canonical: null, partOfSpeech: 'unknown' });
  });

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(tokenize('   ')).toEqual([]);
  });

  it('mixes known and unknown words correctly', () => {
    const tokens = tokenize('EXAMINE ELVISH SWORD');
    expect(tokens[0].canonical).toBe('EXAMINE');
    expect(tokens[0].partOfSpeech).toBe('verb');
    expect(tokens[1].canonical).toBeNull();
    expect(tokens[1].partOfSpeech).toBe('unknown');
    expect(tokens[2].canonical).toBeNull();
    expect(tokens[2].partOfSpeech).toBe('unknown');
  });
});
