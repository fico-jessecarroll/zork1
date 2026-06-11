import { OBJECTS, OBJECTS_BY_ID, GameFlag, GameObject } from './objects';

function get(id: string): GameObject {
  const obj = OBJECTS_BY_ID.get(id);
  if (!obj) throw new Error(`No object with id "${id}"`);
  return obj;
}

function hasFlag(obj: GameObject, flag: GameFlag): boolean {
  return obj.flags.has(flag);
}

describe('OBJECTS catalogue', () => {
  it('contains no duplicate ids', () => {
    const ids = OBJECTS.map(o => o.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('every object has a non-empty desc', () => {
    const missing = OBJECTS.filter(o => !o.desc);
    expect(missing.map(o => o.id)).toEqual([]);
  });
});

describe('SWORD', () => {
  const obj = get('SWORD');

  it('starts in LIVING-ROOM', () => {
    expect(obj.location).toBe('LIVING-ROOM');
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });

  it('is a weapon', () => {
    expect(hasFlag(obj, GameFlag.WEAPONBIT)).toBe(true);
  });

  it('has TRYTAKEBIT', () => {
    expect(hasFlag(obj, GameFlag.TRYTAKEBIT)).toBe(true);
  });

  it('has synonyms ORCRIST and GLAMDRING', () => {
    expect(obj.synonyms).toContain('ORCRIST');
    expect(obj.synonyms).toContain('GLAMDRING');
  });

  it('has adjective ELVISH', () => {
    expect(obj.adjectives).toContain('ELVISH');
  });

  it('is not a light source', () => {
    expect(hasFlag(obj, GameFlag.LIGHTBIT)).toBe(false);
  });
});

describe('LAMP (brass lantern)', () => {
  const obj = get('LAMP');

  it('starts in LIVING-ROOM', () => {
    expect(obj.location).toBe('LIVING-ROOM');
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });

  it('is a light source', () => {
    expect(hasFlag(obj, GameFlag.LIGHTBIT)).toBe(true);
  });

  it('is not a weapon', () => {
    expect(hasFlag(obj, GameFlag.WEAPONBIT)).toBe(false);
  });

  it('has synonym LANTERN', () => {
    expect(obj.synonyms).toContain('LANTERN');
  });

  it('has size 15', () => {
    expect(obj.size).toBe(15);
  });
});

describe('TROLL', () => {
  const obj = get('TROLL');

  it('starts in TROLL-ROOM', () => {
    expect(obj.location).toBe('TROLL-ROOM');
  });

  it('is an actor', () => {
    expect(hasFlag(obj, GameFlag.ACTORBIT)).toBe(true);
  });

  it('has OPENBIT', () => {
    expect(hasFlag(obj, GameFlag.OPENBIT)).toBe(true);
  });

  it('has TRYTAKEBIT', () => {
    expect(hasFlag(obj, GameFlag.TRYTAKEBIT)).toBe(true);
  });

  it('is not takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(false);
  });

  it('has strength 2', () => {
    expect(obj.strength).toBe(2);
  });
});

describe('GRATE', () => {
  const obj = get('GRATE');

  it('starts in LOCAL-GLOBALS', () => {
    expect(obj.location).toBe('LOCAL-GLOBALS');
  });

  it('is a door', () => {
    expect(hasFlag(obj, GameFlag.DOORBIT)).toBe(true);
  });

  it('is invisible initially', () => {
    expect(hasFlag(obj, GameFlag.INVISIBLE)).toBe(true);
  });

  it('has NDESCBIT', () => {
    expect(hasFlag(obj, GameFlag.NDESCBIT)).toBe(true);
  });
});

describe('BOTTLE', () => {
  const obj = get('BOTTLE');

  it('starts in KITCHEN-TABLE', () => {
    expect(obj.location).toBe('KITCHEN-TABLE');
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });

  it('is a container', () => {
    expect(hasFlag(obj, GameFlag.CONTBIT)).toBe(true);
  });

  it('is transparent', () => {
    expect(hasFlag(obj, GameFlag.TRANSBIT)).toBe(true);
  });
});

describe('EGG', () => {
  const obj = get('EGG');

  it('starts in NEST', () => {
    expect(obj.location).toBe('NEST');
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });

  it('is a container', () => {
    expect(hasFlag(obj, GameFlag.CONTBIT)).toBe(true);
  });

  it('is searchable', () => {
    expect(hasFlag(obj, GameFlag.SEARCHBIT)).toBe(true);
  });

  it('has capacity 6', () => {
    expect(obj.capacity).toBe(6);
  });
});

describe('THIEF', () => {
  const obj = get('THIEF');

  it('starts in ROUND-ROOM', () => {
    expect(obj.location).toBe('ROUND-ROOM');
  });

  it('is an actor', () => {
    expect(hasFlag(obj, GameFlag.ACTORBIT)).toBe(true);
  });

  it('is initially invisible', () => {
    expect(hasFlag(obj, GameFlag.INVISIBLE)).toBe(true);
  });

  it('is a container', () => {
    expect(hasFlag(obj, GameFlag.CONTBIT)).toBe(true);
  });

  it('has strength 5', () => {
    expect(obj.strength).toBe(5);
  });
});

describe('CANDLES', () => {
  const obj = get('CANDLES');

  it('starts in SOUTH-TEMPLE', () => {
    expect(obj.location).toBe('SOUTH-TEMPLE');
  });

  it('is a light source', () => {
    expect(hasFlag(obj, GameFlag.LIGHTBIT)).toBe(true);
  });

  it('has FLAMEBIT', () => {
    expect(hasFlag(obj, GameFlag.FLAMEBIT)).toBe(true);
  });

  it('has ONBIT', () => {
    expect(hasFlag(obj, GameFlag.ONBIT)).toBe(true);
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });
});

describe('COFFIN', () => {
  const obj = get('COFFIN');

  it('starts in EGYPT-ROOM', () => {
    expect(obj.location).toBe('EGYPT-ROOM');
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });

  it('is a container', () => {
    expect(hasFlag(obj, GameFlag.CONTBIT)).toBe(true);
  });

  it('is sacred', () => {
    expect(hasFlag(obj, GameFlag.SACREDBIT)).toBe(true);
  });

  it('is searchable', () => {
    expect(hasFlag(obj, GameFlag.SEARCHBIT)).toBe(true);
  });

  it('has capacity 35', () => {
    expect(obj.capacity).toBe(35);
  });
});

describe('ADVERTISEMENT (leaflet)', () => {
  const obj = get('ADVERTISEMENT');

  it('starts in MAILBOX', () => {
    expect(obj.location).toBe('MAILBOX');
  });

  it('is readable', () => {
    expect(hasFlag(obj, GameFlag.READBIT)).toBe(true);
  });

  it('is takeable', () => {
    expect(hasFlag(obj, GameFlag.TAKEBIT)).toBe(true);
  });

  it('is burnable', () => {
    expect(hasFlag(obj, GameFlag.BURNBIT)).toBe(true);
  });

  it('has synonym LEAFLET', () => {
    expect(obj.synonyms).toContain('LEAFLET');
  });
});
