// Flag constants matching ZIL bit names
export const ACTORBIT   = 'ACTORBIT';
export const CLIMBBIT   = 'CLIMBBIT';
export const CONTBIT    = 'CONTBIT';
export const DOORBIT    = 'DOORBIT';
export const INVISIBLE  = 'INVISIBLE';
export const LOCKBIT    = 'LOCKBIT';
export const NDESCBIT   = 'NDESCBIT';
export const OPENBIT    = 'OPENBIT';
export const READBIT    = 'READBIT';
export const SURFACEBIT = 'SURFACEBIT';
export const TAKEBIT    = 'TAKEBIT';
export const TOUCHBIT   = 'TOUCHBIT';
export const TRANSBIT   = 'TRANSBIT';
export const TRYTAKEBIT = 'TRYTAKEBIT';
export const VEHBIT     = 'VEHBIT';
export const WEAPONBIT  = 'WEAPONBIT';
export const WEARBIT    = 'WEARBIT';

/** Runtime representation of a game object used by verb handlers. */
export interface GameObject {
  readonly id: string;
  readonly desc: string;
  readonly parent: string | null;
  readonly flags: ReadonlySet<string>;
  /** Object size / carry weight (P?SIZE). Default: 5. */
  readonly size: number;
  /** Max capacity for containers (P?CAPACITY). 0 = not a real openable container. */
  readonly capacity: number;
  /** Readable / examinable text property (P?TEXT). */
  readonly text?: string;
}

/** Runtime game state threaded through all verb handlers. */
export interface GameState {
  readonly objects: ReadonlyMap<string, GameObject>;
  /** Room exit table: roomId → (directionKey → target roomId, or null when blocked). */
  readonly roomExits: ReadonlyMap<string, ReadonlyMap<string, string | null>>;
  readonly player: string;
  readonly here: string;
  readonly globalObjects: string;
  readonly score: number;
  readonly moves: number;
  readonly verbose: boolean;
  readonly superBrief: boolean;
  /** Maximum carry weight before overload (LOAD-ALLOWED). Default: 70. */
  readonly loadAllowed: number;
}
