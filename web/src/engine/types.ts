export enum Direction {
  NORTH = 'NORTH',
  SOUTH = 'SOUTH',
  EAST = 'EAST',
  WEST = 'WEST',
  NE = 'NE',
  NW = 'NW',
  SE = 'SE',
  SW = 'SW',
  UP = 'UP',
  DOWN = 'DOWN',
  IN = 'IN',
  OUT = 'OUT',
  LAND = 'LAND',
}

export enum ObjectFlag {
  TAKEBIT = 'TAKEBIT',
  CONTBIT = 'CONTBIT',
  DOORBIT = 'DOORBIT',
  OPENBIT = 'OPENBIT',
  LOCKBIT = 'LOCKBIT',
  LIGHTBIT = 'LIGHTBIT',
  TOUCHBIT = 'TOUCHBIT',
  VEHBIT = 'VEHBIT',
  BURNBIT = 'BURNBIT',
  FLAMEBIT = 'FLAMEBIT',
  ONBIT = 'ONBIT',
  WEAPONBIT = 'WEAPONBIT',
  WEARBIT = 'WEARBIT',
  READBIT = 'READBIT',
  TRANSBIT = 'TRANSBIT',
  TRYTAKEBIT = 'TRYTAKEBIT',
  NDESCBIT = 'NDESCBIT',
  SACREDBIT = 'SACREDBIT',
  ACTORBIT = 'ACTORBIT',
  CLIMBBIT = 'CLIMBBIT',
  DRINKBIT = 'DRINKBIT',
  FOODBIT = 'FOODBIT',
  FIGHTBIT = 'FIGHTBIT',
  MAZEBIT = 'MAZEBIT',
  NONLANDBIT = 'NONLANDBIT',
  SEARCHBIT = 'SEARCHBIT',
  SURFACEBIT = 'SURFACEBIT',
  TOOLBIT = 'TOOLBIT',
  TURNBIT = 'TURNBIT',
  INVISIBLE = 'INVISIBLE',
}

export enum RoomFlag {
  RMUNGBIT = 'RMUNGBIT',
  RLANDBIT = 'RLANDBIT',
  LIGHTBIT = 'LIGHTBIT',
  ONBIT = 'ONBIT',
  SACREDBIT = 'SACREDBIT',
  MAZEBIT = 'MAZEBIT',
}

export type UnconditionalExit = {
  kind: 'unconditional';
  to: string;
};

export type BlockedExit = {
  kind: 'blocked';
  message: string;
};

export type ConditionalExit = {
  kind: 'conditional';
  to: string;
  condition: string;
  elseMessage?: string;
};

export type FunctionExit = {
  kind: 'function';
  fn: string;
};

export type Exit = UnconditionalExit | BlockedExit | ConditionalExit | FunctionExit;

export interface Room {
  id: string;
  desc: string;
  ldesc?: string;
  exits: Partial<Record<Direction, Exit>>;
  flags: Set<RoomFlag>;
  globals?: string[];
  action?: string;
}

export interface GameObject {
  id: string;
  desc: string;
  ldesc?: string;
  synonyms?: string[];
  adjectives?: string[];
  flags: Set<ObjectFlag>;
  initialLocation: string;
  action?: string;
  size?: number;
  capacity?: number;
  strength?: number;
}

export interface GameState {
  objectLocations: Map<string, string>;
  flagOverrides: Map<string, Set<ObjectFlag | RoomFlag>>;
  score: number;
  moves: number;
  winner: string;
  here: string;
}
