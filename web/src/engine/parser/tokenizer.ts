export type PartOfSpeech =
  | 'verb'
  | 'noun'
  | 'adjective'
  | 'preposition'
  | 'direction'
  | 'buzzword'
  | 'unknown';

export interface Token {
  raw: string;
  canonical: string | null;
  partOfSpeech: PartOfSpeech;
}

interface VocabEntry {
  canonical: string;
  partOfSpeech: PartOfSpeech;
}

function buildVocab(): Map<string, VocabEntry> {
  const v = new Map<string, VocabEntry>();

  function addWords(pos: PartOfSpeech, canonical: string, ...synonyms: string[]): void {
    v.set(canonical, { canonical, partOfSpeech: pos });
    for (const syn of synonyms) v.set(syn, { canonical, partOfSpeech: pos });
  }

  // Directions — from <SYNONYM> declarations in gsyntax.zil
  addWords('direction', 'NORTH', 'N');
  addWords('direction', 'SOUTH', 'S');
  addWords('direction', 'EAST', 'E');
  addWords('direction', 'WEST', 'W');
  addWords('direction', 'UP', 'U');
  addWords('direction', 'DOWN', 'D');
  addWords('direction', 'NW', 'NORTHWEST');
  addWords('direction', 'NE', 'NORTHE');
  addWords('direction', 'SW', 'SOUTHWEST');
  addWords('direction', 'SE', 'SOUTHE');

  // Prepositions — from <SYNONYM> declarations in gsyntax.zil
  addWords('preposition', 'WITH', 'USING', 'THROUGH', 'THRU');
  addWords('preposition', 'IN', 'INSIDE', 'INTO');
  addWords('preposition', 'ON', 'ONTO');
  addWords('preposition', 'UNDER', 'UNDERNEATH', 'BENEATH', 'BELOW');

  // Buzz words — from <BUZZ> declarations in gsyntax.zil; discarded by the parser
  for (const w of [
    'AGAIN', 'G', 'OOPS',
    'A', 'AN', 'THE', 'IS', 'AND', 'OF', 'THEN', 'ALL', 'ONE',
    'BUT', 'EXCEPT', 'YES', 'NO', 'Y', 'HERE',
  ]) {
    v.set(w, { canonical: w, partOfSpeech: 'buzzword' });
  }

  // Verbs — from <SYNTAX> and <SYNONYM> declarations in gsyntax.zil
  addWords('verb', 'ACTIVATE');
  addWords('verb', 'ANSWER', 'REPLY');
  addWords('verb', 'APPLY');
  addWords('verb', 'ATTACK', 'FIGHT', 'HURT', 'INJURE', 'HIT');
  addWords('verb', 'BACK');
  addWords('verb', 'BLAST');
  addWords('verb', 'BLOW');
  addWords('verb', 'BOARD');
  addWords('verb', 'BRIEF');
  addWords('verb', 'BRUSH', 'CLEAN');
  addWords('verb', 'BUG');
  addWords('verb', 'BURN', 'INCINERATE', 'IGNITE');
  addWords('verb', 'CHOMP', 'LOSE', 'BARF');
  addWords('verb', 'CLIMB', 'SIT');
  addWords('verb', 'CLOSE');
  addWords('verb', 'COMMAND');
  addWords('verb', 'COUNT');
  addWords('verb', 'CROSS', 'FORD');
  addWords('verb', 'CUT', 'SLICE', 'PIERCE');
  addWords('verb', 'CURSE', 'SHIT', 'FUCK', 'DAMN');
  addWords('verb', 'DEFLATE');
  addWords('verb', 'DESTROY', 'DAMAGE', 'BREAK', 'BLOCK', 'SMASH');
  addWords('verb', 'DIAGNOSE');
  addWords('verb', 'DIG');
  addWords('verb', 'DISEMBARK');
  addWords('verb', 'DISENCHANT');
  addWords('verb', 'DRINK', 'IMBIBE', 'SWALLOW');
  addWords('verb', 'DROP');
  addWords('verb', 'EAT', 'CONSUME', 'TASTE', 'BITE');
  addWords('verb', 'ECHO');
  addWords('verb', 'ENCHANT');
  addWords('verb', 'ENTER');
  addWords('verb', 'EXIT');
  addWords('verb', 'EXAMINE', 'DESCRIBE', 'WHAT', 'WHATS');
  addWords('verb', 'EXORCISE', 'BANISH', 'CAST', 'DRIVE', 'BEGONE');
  addWords('verb', 'EXTINGUISH', 'DOUSE');
  addWords('verb', 'FILL');
  addWords('verb', 'FIND', 'WHERE', 'SEEK', 'SEE');
  addWords('verb', 'FOLLOW', 'PURSUE', 'CHASE', 'COME');
  addWords('verb', 'FROBOZZ');
  addWords('verb', 'GIVE', 'DONATE', 'OFFER', 'FEED', 'HAND');
  addWords('verb', 'HATCH');
  addWords('verb', 'HELLO', 'HI');
  addWords('verb', 'INCANT', 'CHANT');
  addWords('verb', 'INFLAT');
  addWords('verb', 'INVENTORY', 'I');
  addWords('verb', 'JUMP', 'LEAP', 'DIVE');
  addWords('verb', 'KICK', 'TAUNT');
  addWords('verb', 'KILL', 'MURDER', 'SLAY', 'DISPATCH');
  addWords('verb', 'KISS');
  addWords('verb', 'KNOCK', 'RAP');
  addWords('verb', 'LAUNCH');
  addWords('verb', 'LEAN');
  addWords('verb', 'LEAVE');
  addWords('verb', 'LIGHT');
  addWords('verb', 'LISTEN');
  addWords('verb', 'LOCK');
  addWords('verb', 'LOOK', 'L', 'STARE', 'GAZE');
  addWords('verb', 'LOWER');
  addWords('verb', 'LUBRICATE', 'OIL', 'GREASE');
  addWords('verb', 'MAKE');
  addWords('verb', 'MELT', 'LIQUIFY');
  addWords('verb', 'MOVE');
  addWords('verb', 'MUMBLE', 'SIGH');
  addWords('verb', 'ODYSSEUS', 'ULYSSES');
  addWords('verb', 'OPEN');
  addWords('verb', 'PICK');
  addWords('verb', 'PLAY');
  addWords('verb', 'PLUG', 'GLUE', 'PATCH', 'REPAIR', 'FIX');
  addWords('verb', 'PLUGH', 'XYZZY');
  addWords('verb', 'POKE');
  addWords('verb', 'POUR', 'SPILL');
  addWords('verb', 'PRAY');
  addWords('verb', 'PULL', 'TUG', 'YANK');
  addWords('verb', 'PUMP');
  addWords('verb', 'PUNCTURE');
  addWords('verb', 'PUSH', 'PRESS');
  addWords('verb', 'PUT', 'STUFF', 'INSERT', 'PLACE', 'HIDE');
  addWords('verb', 'QUIT', 'Q');
  addWords('verb', 'RAISE', 'LIFT');
  addWords('verb', 'RAPE', 'MOLEST');
  addWords('verb', 'READ', 'SKIM');
  addWords('verb', 'REPENT');
  addWords('verb', 'RESTART');
  addWords('verb', 'RESTORE');
  addWords('verb', 'RING', 'PEAL');
  addWords('verb', 'ROLL');
  addWords('verb', 'RUB', 'TOUCH', 'FEEL', 'PAT', 'PET');
  addWords('verb', 'SAVE');
  addWords('verb', 'SAY');
  addWords('verb', 'SCORE');
  addWords('verb', 'SCRIPT');
  addWords('verb', 'SEARCH');
  addWords('verb', 'SEND');
  addWords('verb', 'SHAKE');
  addWords('verb', 'SKIP', 'HOP');
  addWords('verb', 'SLIDE');
  addWords('verb', 'SMELL', 'SNIFF');
  addWords('verb', 'SPIN');
  addWords('verb', 'SPRAY');
  addWords('verb', 'SQUEEZE');
  addWords('verb', 'STAB');
  addWords('verb', 'STAND');
  addWords('verb', 'STAY');
  addWords('verb', 'STRIKE');
  addWords('verb', 'SUPER', 'SUPERBRIEF');
  addWords('verb', 'SWIM', 'BATHE', 'WADE');
  addWords('verb', 'SWING', 'THRUST');
  addWords('verb', 'TAKE', 'GET', 'HOLD', 'CARRY', 'REMOVE', 'GRAB', 'CATCH');
  addWords('verb', 'TALK');
  addWords('verb', 'TELL', 'ASK');
  addWords('verb', 'THROW', 'HURL', 'CHUCK', 'TOSS');
  addWords('verb', 'TIE', 'FASTEN', 'SECURE', 'ATTACH');
  addWords('verb', 'TREASURE', 'TEMPLE');
  addWords('verb', 'TURN', 'SET', 'FLIP', 'SHUT');
  addWords('verb', 'UNLOCK');
  addWords('verb', 'UNSCRIPT');
  addWords('verb', 'UNTIE', 'FREE', 'RELEASE', 'UNFASTEN', 'UNATTACH', 'UNHOOK');
  addWords('verb', 'VERBOSE');
  addWords('verb', 'VERSION');
  addWords('verb', 'WAIT', 'Z');
  addWords('verb', 'WAKE', 'AWAKE', 'SURPRISE', 'STARTLE');
  addWords('verb', 'WALK', 'GO', 'RUN', 'PROCEED', 'STEP');
  addWords('verb', 'WAVE', 'BRANDISH');
  addWords('verb', 'WEAR');
  addWords('verb', 'WIN', 'WINNAGE');
  addWords('verb', 'WIND');
  addWords('verb', 'WISH');
  addWords('verb', 'YELL', 'SCREAM', 'SHOUT');
  addWords('verb', 'ZORK');

  return v;
}

const VOCAB: Map<string, VocabEntry> = buildVocab();

export function tokenize(input: string): Token[] {
  return input
    .trim()
    .split(/\s+/)
    .filter(w => w.length > 0)
    .map(raw => {
      const entry = VOCAB.get(raw.toUpperCase());
      if (!entry) {
        return { raw, canonical: null, partOfSpeech: 'unknown' as PartOfSpeech };
      }
      return { raw, canonical: entry.canonical, partOfSpeech: entry.partOfSpeech };
    });
}
