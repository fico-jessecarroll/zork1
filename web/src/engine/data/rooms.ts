export type RoomId =
  | 'west-of-house'
  | 'stone-barrow'
  | 'north-of-house'
  | 'south-of-house'
  | 'east-of-house'
  | 'forest-1'
  | 'forest-2'
  | 'mountains'
  | 'forest-3'
  | 'path'
  | 'up-a-tree'
  | 'grating-clearing'
  | 'clearing'
  | 'kitchen'
  | 'attic'
  | 'living-room'
  | 'cellar'
  | 'troll-room'
  | 'east-of-chasm'
  | 'gallery'
  | 'studio'
  | 'maze-1'
  | 'maze-2'
  | 'maze-3'
  | 'maze-4'
  | 'dead-end-1'
  | 'maze-5'
  | 'dead-end-2'
  | 'maze-6'
  | 'maze-7'
  | 'maze-8'
  | 'dead-end-3'
  | 'maze-9'
  | 'maze-10'
  | 'maze-11'
  | 'grating-room'
  | 'maze-12'
  | 'dead-end-4'
  | 'maze-13'
  | 'maze-14'
  | 'maze-15'
  | 'cyclops-room'
  | 'strange-passage'
  | 'treasure-room'
  | 'reservoir-south'
  | 'reservoir'
  | 'reservoir-north'
  | 'stream-view'
  | 'in-stream'
  | 'mirror-room-1'
  | 'mirror-room-2'
  | 'small-cave'
  | 'tiny-cave'
  | 'cold-passage'
  | 'narrow-passage'
  | 'winding-passage'
  | 'twisting-passage'
  | 'atlantis-room'
  | 'ew-passage'
  | 'round-room'
  | 'deep-canyon'
  | 'damp-cave'
  | 'loud-room'
  | 'ns-passage'
  | 'chasm-room'
  | 'entrance-to-hades'
  | 'land-of-living-dead'
  | 'engravings-cave'
  | 'egypt-room'
  | 'dome-room'
  | 'torch-room'
  | 'north-temple'
  | 'south-temple'
  | 'dam-room'
  | 'dam-lobby'
  | 'maintenance-room'
  | 'dam-base'
  | 'river-1'
  | 'river-2'
  | 'river-3'
  | 'white-cliffs-north'
  | 'white-cliffs-south'
  | 'river-4'
  | 'river-5'
  | 'shore'
  | 'sandy-beach'
  | 'sandy-cave'
  | 'aragain-falls'
  | 'on-rainbow'
  | 'end-of-rainbow'
  | 'canyon-bottom'
  | 'cliff-middle'
  | 'canyon-view'
  | 'mine-entrance'
  | 'squeeky-room'
  | 'bat-room'
  | 'shaft-room'
  | 'smelly-room'
  | 'gas-room'
  | 'ladder-top'
  | 'ladder-bottom'
  | 'dead-end-5'
  | 'timber-room'
  | 'lower-shaft'
  | 'machine-room'
  | 'mine-1'
  | 'mine-2'
  | 'mine-3'
  | 'mine-4'
  | 'slide-room';

export type Direction =
  | 'north'
  | 'east'
  | 'west'
  | 'south'
  | 'ne'
  | 'nw'
  | 'se'
  | 'sw'
  | 'up'
  | 'down'
  | 'in'
  | 'out'
  | 'land';

export type RoomFlag =
  | 'RLANDBIT'
  | 'ONBIT'
  | 'SACREDBIT'
  | 'MAZEBIT'
  | 'NONLANDBIT';

export type Exit =
  | { direction: Direction; destination: RoomId }
  | { direction: Direction; condition: string; destination: RoomId }
  | { direction: Direction; message: string };

export interface Room {
  id: RoomId;
  desc: string;
  flags: RoomFlag[];
  exits: Exit[];
}

export const rooms: Room[] = [
  {
    id: 'west-of-house',
    desc: 'West of House',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'north', destination: 'north-of-house' },
      { direction: 'south', destination: 'south-of-house' },
      { direction: 'ne', destination: 'north-of-house' },
      { direction: 'se', destination: 'south-of-house' },
      { direction: 'west', destination: 'forest-1' },
      { direction: 'east', message: "The door is boarded and you can't remove the boards." },
      { direction: 'sw', condition: 'WON-FLAG', destination: 'stone-barrow' },
      { direction: 'in', condition: 'WON-FLAG', destination: 'stone-barrow' },
    ],
  },
  {
    id: 'stone-barrow',
    desc: 'Stone Barrow',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'ne', destination: 'west-of-house' },
    ],
  },
  {
    id: 'north-of-house',
    desc: 'North of House',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'sw', destination: 'west-of-house' },
      { direction: 'se', destination: 'east-of-house' },
      { direction: 'west', destination: 'west-of-house' },
      { direction: 'east', destination: 'east-of-house' },
      { direction: 'north', destination: 'path' },
      { direction: 'south', message: 'The windows are all boarded.' },
    ],
  },
  {
    id: 'south-of-house',
    desc: 'South of House',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'west', destination: 'west-of-house' },
      { direction: 'east', destination: 'east-of-house' },
      { direction: 'ne', destination: 'east-of-house' },
      { direction: 'nw', destination: 'west-of-house' },
      { direction: 'south', destination: 'forest-3' },
      { direction: 'north', message: 'The windows are all boarded.' },
    ],
  },
  {
    id: 'east-of-house',
    desc: 'Behind House',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'north', destination: 'north-of-house' },
      { direction: 'south', destination: 'south-of-house' },
      { direction: 'sw', destination: 'south-of-house' },
      { direction: 'nw', destination: 'north-of-house' },
      { direction: 'east', destination: 'clearing' },
      { direction: 'west', condition: 'KITCHEN-WINDOW IS OPEN', destination: 'kitchen' },
      { direction: 'in', condition: 'KITCHEN-WINDOW IS OPEN', destination: 'kitchen' },
    ],
  },
  {
    id: 'forest-1',
    desc: 'Forest',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'There is no tree here suitable for climbing.' },
      { direction: 'north', destination: 'grating-clearing' },
      { direction: 'east', destination: 'path' },
      { direction: 'south', destination: 'forest-3' },
      { direction: 'west', message: 'You would need a machete to go further west.' },
    ],
  },
  {
    id: 'forest-2',
    desc: 'Forest',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'There is no tree here suitable for climbing.' },
      { direction: 'north', message: 'The forest becomes impenetrable to the north.' },
      { direction: 'east', destination: 'mountains' },
      { direction: 'south', destination: 'clearing' },
      { direction: 'west', destination: 'path' },
    ],
  },
  {
    id: 'mountains',
    desc: 'Forest',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'The mountains are impassable.' },
      { direction: 'north', destination: 'forest-2' },
      { direction: 'east', message: 'The mountains are impassable.' },
      { direction: 'south', destination: 'forest-2' },
      { direction: 'west', destination: 'forest-2' },
    ],
  },
  {
    id: 'forest-3',
    desc: 'Forest',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'There is no tree here suitable for climbing.' },
      { direction: 'north', destination: 'clearing' },
      { direction: 'east', message: 'The rank undergrowth prevents eastward movement.' },
      { direction: 'south', message: 'Storm-tossed trees block your way.' },
      { direction: 'west', destination: 'forest-1' },
      { direction: 'nw', destination: 'south-of-house' },
    ],
  },
  {
    id: 'path',
    desc: 'Forest Path',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', destination: 'up-a-tree' },
      { direction: 'north', destination: 'grating-clearing' },
      { direction: 'east', destination: 'forest-2' },
      { direction: 'south', destination: 'north-of-house' },
      { direction: 'west', destination: 'forest-1' },
    ],
  },
  {
    id: 'up-a-tree',
    desc: 'Up a Tree',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'down', destination: 'path' },
      { direction: 'up', message: 'You cannot climb any higher.' },
    ],
  },
  {
    id: 'grating-clearing',
    desc: 'Clearing',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'north', message: 'The forest becomes impenetrable to the north.' },
      { direction: 'east', destination: 'forest-2' },
      { direction: 'west', destination: 'forest-1' },
      { direction: 'south', destination: 'path' },
      { direction: 'down', condition: 'GRATING-EXIT', destination: 'grating-room' },
    ],
  },
  {
    id: 'clearing',
    desc: 'Clearing',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'There is no tree here suitable for climbing.' },
      { direction: 'east', destination: 'canyon-view' },
      { direction: 'north', destination: 'forest-2' },
      { direction: 'south', destination: 'forest-3' },
      { direction: 'west', destination: 'east-of-house' },
    ],
  },
  {
    id: 'kitchen',
    desc: 'Kitchen',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'east', condition: 'KITCHEN-WINDOW IS OPEN', destination: 'east-of-house' },
      { direction: 'west', destination: 'living-room' },
      { direction: 'out', condition: 'KITCHEN-WINDOW IS OPEN', destination: 'east-of-house' },
      { direction: 'up', destination: 'attic' },
      { direction: 'down', condition: 'FALSE-FLAG', destination: 'studio' },
    ],
  },
  {
    id: 'attic',
    desc: 'Attic',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'down', destination: 'kitchen' },
    ],
  },
  {
    id: 'living-room',
    desc: 'Living Room',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'east', destination: 'kitchen' },
      { direction: 'west', condition: 'MAGIC-FLAG', destination: 'strange-passage' },
      { direction: 'down', condition: 'TRAP-DOOR-EXIT', destination: 'cellar' },
    ],
  },
  {
    id: 'cellar',
    desc: 'Cellar',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'troll-room' },
      { direction: 'south', destination: 'east-of-chasm' },
      { direction: 'up', condition: 'TRAP-DOOR IS OPEN', destination: 'living-room' },
      { direction: 'west', message: 'You try to ascend the ramp, but it is impossible, and you slide back down.' },
    ],
  },
  {
    id: 'troll-room',
    desc: 'The Troll Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'cellar' },
      { direction: 'east', condition: 'TROLL-FLAG', destination: 'ew-passage' },
      { direction: 'west', condition: 'TROLL-FLAG', destination: 'maze-1' },
    ],
  },
  {
    id: 'east-of-chasm',
    desc: 'East of Chasm',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'cellar' },
      { direction: 'east', destination: 'gallery' },
      { direction: 'down', message: 'The chasm probably leads straight to the infernal regions.' },
    ],
  },
  {
    id: 'gallery',
    desc: 'Gallery',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'west', destination: 'east-of-chasm' },
      { direction: 'north', destination: 'studio' },
    ],
  },
  {
    id: 'studio',
    desc: 'Studio',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'gallery' },
      { direction: 'up', condition: 'UP-CHIMNEY-FUNCTION', destination: 'kitchen' },
    ],
  },
  {
    id: 'maze-1',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'east', destination: 'troll-room' },
      { direction: 'north', destination: 'maze-1' },
      { direction: 'south', destination: 'maze-2' },
      { direction: 'west', destination: 'maze-4' },
    ],
  },
  {
    id: 'maze-2',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'south', destination: 'maze-1' },
      { direction: 'down', condition: 'MAZE-DIODES', destination: 'maze-4' },
      { direction: 'east', destination: 'maze-3' },
    ],
  },
  {
    id: 'maze-3',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'west', destination: 'maze-2' },
      { direction: 'north', destination: 'maze-4' },
      { direction: 'up', destination: 'maze-5' },
    ],
  },
  {
    id: 'maze-4',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'west', destination: 'maze-3' },
      { direction: 'north', destination: 'maze-1' },
      { direction: 'east', destination: 'dead-end-1' },
    ],
  },
  {
    id: 'dead-end-1',
    desc: 'Dead End',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'south', destination: 'maze-4' },
    ],
  },
  {
    id: 'maze-5',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'east', destination: 'dead-end-2' },
      { direction: 'north', destination: 'maze-3' },
      { direction: 'sw', destination: 'maze-6' },
    ],
  },
  {
    id: 'dead-end-2',
    desc: 'Dead End',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'west', destination: 'maze-5' },
    ],
  },
  {
    id: 'maze-6',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'down', destination: 'maze-5' },
      { direction: 'east', destination: 'maze-7' },
      { direction: 'west', destination: 'maze-6' },
      { direction: 'up', destination: 'maze-9' },
    ],
  },
  {
    id: 'maze-7',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'up', destination: 'maze-14' },
      { direction: 'west', destination: 'maze-6' },
      { direction: 'down', condition: 'MAZE-DIODES', destination: 'dead-end-1' },
      { direction: 'east', destination: 'maze-8' },
      { direction: 'south', destination: 'maze-15' },
    ],
  },
  {
    id: 'maze-8',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'ne', destination: 'maze-7' },
      { direction: 'west', destination: 'maze-8' },
      { direction: 'se', destination: 'dead-end-3' },
    ],
  },
  {
    id: 'dead-end-3',
    desc: 'Dead End',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'north', destination: 'maze-8' },
    ],
  },
  {
    id: 'maze-9',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'north', destination: 'maze-6' },
      { direction: 'down', condition: 'MAZE-DIODES', destination: 'maze-11' },
      { direction: 'east', destination: 'maze-10' },
      { direction: 'south', destination: 'maze-13' },
      { direction: 'west', destination: 'maze-12' },
      { direction: 'nw', destination: 'maze-9' },
    ],
  },
  {
    id: 'maze-10',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'east', destination: 'maze-9' },
      { direction: 'west', destination: 'maze-13' },
      { direction: 'up', destination: 'maze-11' },
    ],
  },
  {
    id: 'maze-11',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'ne', destination: 'grating-room' },
      { direction: 'down', destination: 'maze-10' },
      { direction: 'nw', destination: 'maze-13' },
      { direction: 'sw', destination: 'maze-12' },
    ],
  },
  {
    id: 'grating-room',
    desc: 'Grating Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'sw', destination: 'maze-11' },
      { direction: 'up', condition: 'GRATE IS OPEN', destination: 'grating-clearing' },
    ],
  },
  {
    id: 'maze-12',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'down', condition: 'MAZE-DIODES', destination: 'maze-5' },
      { direction: 'sw', destination: 'maze-11' },
      { direction: 'east', destination: 'maze-13' },
      { direction: 'up', destination: 'maze-9' },
      { direction: 'north', destination: 'dead-end-4' },
    ],
  },
  {
    id: 'dead-end-4',
    desc: 'Dead End',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'south', destination: 'maze-12' },
    ],
  },
  {
    id: 'maze-13',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'east', destination: 'maze-9' },
      { direction: 'down', destination: 'maze-12' },
      { direction: 'south', destination: 'maze-10' },
      { direction: 'west', destination: 'maze-11' },
    ],
  },
  {
    id: 'maze-14',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'west', destination: 'maze-15' },
      { direction: 'nw', destination: 'maze-14' },
      { direction: 'ne', destination: 'maze-7' },
      { direction: 'south', destination: 'maze-7' },
    ],
  },
  {
    id: 'maze-15',
    desc: 'Maze',
    flags: ['RLANDBIT', 'MAZEBIT'],
    exits: [
      { direction: 'west', destination: 'maze-14' },
      { direction: 'south', destination: 'maze-7' },
      { direction: 'se', destination: 'cyclops-room' },
    ],
  },
  {
    id: 'cyclops-room',
    desc: 'Cyclops Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'nw', destination: 'maze-15' },
      { direction: 'east', condition: 'MAGIC-FLAG', destination: 'strange-passage' },
      { direction: 'up', condition: 'CYCLOPS-FLAG', destination: 'treasure-room' },
    ],
  },
  {
    id: 'strange-passage',
    desc: 'Strange Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'west', destination: 'cyclops-room' },
      { direction: 'in', destination: 'cyclops-room' },
      { direction: 'east', destination: 'living-room' },
    ],
  },
  {
    id: 'treasure-room',
    desc: 'Treasure Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'down', destination: 'cyclops-room' },
    ],
  },
  {
    id: 'reservoir-south',
    desc: 'Reservoir South',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'se', destination: 'deep-canyon' },
      { direction: 'sw', destination: 'chasm-room' },
      { direction: 'east', destination: 'dam-room' },
      { direction: 'west', destination: 'stream-view' },
      { direction: 'north', condition: 'LOW-TIDE', destination: 'reservoir' },
    ],
  },
  {
    id: 'reservoir',
    desc: 'Reservoir',
    flags: ['NONLANDBIT'],
    exits: [
      { direction: 'north', destination: 'reservoir-north' },
      { direction: 'south', destination: 'reservoir-south' },
      { direction: 'up', destination: 'in-stream' },
      { direction: 'west', destination: 'in-stream' },
      { direction: 'down', message: 'The dam blocks your way.' },
    ],
  },
  {
    id: 'reservoir-north',
    desc: 'Reservoir North',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'atlantis-room' },
      { direction: 'south', condition: 'LOW-TIDE', destination: 'reservoir' },
    ],
  },
  {
    id: 'stream-view',
    desc: 'Stream View',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'east', destination: 'reservoir-south' },
      { direction: 'west', message: 'The stream emerges from a spot too small for you to enter.' },
    ],
  },
  {
    id: 'in-stream',
    desc: 'Stream',
    flags: ['NONLANDBIT'],
    exits: [
      { direction: 'up', message: 'The channel is too narrow.' },
      { direction: 'west', message: 'The channel is too narrow.' },
      { direction: 'land', destination: 'stream-view' },
      { direction: 'down', destination: 'reservoir' },
      { direction: 'east', destination: 'reservoir' },
    ],
  },
  {
    id: 'mirror-room-1',
    desc: 'Mirror Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'cold-passage' },
      { direction: 'west', destination: 'twisting-passage' },
      { direction: 'east', destination: 'small-cave' },
    ],
  },
  {
    id: 'mirror-room-2',
    desc: 'Mirror Room',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'west', destination: 'winding-passage' },
      { direction: 'north', destination: 'narrow-passage' },
      { direction: 'east', destination: 'tiny-cave' },
    ],
  },
  {
    id: 'small-cave',
    desc: 'Cave',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'mirror-room-1' },
      { direction: 'down', destination: 'atlantis-room' },
      { direction: 'south', destination: 'atlantis-room' },
      { direction: 'west', destination: 'twisting-passage' },
    ],
  },
  {
    id: 'tiny-cave',
    desc: 'Cave',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'mirror-room-2' },
      { direction: 'west', destination: 'winding-passage' },
      { direction: 'down', destination: 'entrance-to-hades' },
    ],
  },
  {
    id: 'cold-passage',
    desc: 'Cold Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'mirror-room-1' },
      { direction: 'west', destination: 'slide-room' },
    ],
  },
  {
    id: 'narrow-passage',
    desc: 'Narrow Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'round-room' },
      { direction: 'south', destination: 'mirror-room-2' },
    ],
  },
  {
    id: 'winding-passage',
    desc: 'Winding Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'mirror-room-2' },
      { direction: 'east', destination: 'tiny-cave' },
    ],
  },
  {
    id: 'twisting-passage',
    desc: 'Twisting Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'mirror-room-1' },
      { direction: 'east', destination: 'small-cave' },
    ],
  },
  {
    id: 'atlantis-room',
    desc: 'Atlantis Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'up', destination: 'small-cave' },
      { direction: 'south', destination: 'reservoir-north' },
    ],
  },
  {
    id: 'ew-passage',
    desc: 'East-West Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'east', destination: 'round-room' },
      { direction: 'west', destination: 'troll-room' },
      { direction: 'down', destination: 'chasm-room' },
      { direction: 'north', destination: 'chasm-room' },
    ],
  },
  {
    id: 'round-room',
    desc: 'Round Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'east', destination: 'loud-room' },
      { direction: 'west', destination: 'ew-passage' },
      { direction: 'north', destination: 'ns-passage' },
      { direction: 'south', destination: 'narrow-passage' },
      { direction: 'se', destination: 'engravings-cave' },
    ],
  },
  {
    id: 'deep-canyon',
    desc: 'Deep Canyon',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'nw', destination: 'reservoir-south' },
      { direction: 'east', destination: 'dam-room' },
      { direction: 'sw', destination: 'ns-passage' },
      { direction: 'down', destination: 'loud-room' },
    ],
  },
  {
    id: 'damp-cave',
    desc: 'Damp Cave',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'west', destination: 'loud-room' },
      { direction: 'east', destination: 'white-cliffs-north' },
      { direction: 'south', message: 'It is too narrow for most insects.' },
    ],
  },
  {
    id: 'loud-room',
    desc: 'Loud Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'east', destination: 'damp-cave' },
      { direction: 'west', destination: 'round-room' },
      { direction: 'up', destination: 'deep-canyon' },
    ],
  },
  {
    id: 'ns-passage',
    desc: 'North-South Passage',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'chasm-room' },
      { direction: 'ne', destination: 'deep-canyon' },
      { direction: 'south', destination: 'round-room' },
    ],
  },
  {
    id: 'chasm-room',
    desc: 'Chasm',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'ne', destination: 'reservoir-south' },
      { direction: 'sw', destination: 'ew-passage' },
      { direction: 'up', destination: 'ew-passage' },
      { direction: 'south', destination: 'ns-passage' },
      { direction: 'down', message: 'Are you out of your mind?' },
    ],
  },
  {
    id: 'entrance-to-hades',
    desc: 'Entrance to Hades',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'up', destination: 'tiny-cave' },
      { direction: 'in', condition: 'LLD-FLAG', destination: 'land-of-living-dead' },
      { direction: 'south', condition: 'LLD-FLAG', destination: 'land-of-living-dead' },
    ],
  },
  {
    id: 'land-of-living-dead',
    desc: 'Land of the Dead',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'out', destination: 'entrance-to-hades' },
      { direction: 'north', destination: 'entrance-to-hades' },
    ],
  },
  {
    id: 'engravings-cave',
    desc: 'Engravings Cave',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'nw', destination: 'round-room' },
      { direction: 'east', destination: 'dome-room' },
    ],
  },
  {
    id: 'egypt-room',
    desc: 'Egyptian Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'west', destination: 'north-temple' },
      { direction: 'up', destination: 'north-temple' },
    ],
  },
  {
    id: 'dome-room',
    desc: 'Dome Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'west', destination: 'engravings-cave' },
      { direction: 'down', condition: 'DOME-FLAG', destination: 'torch-room' },
    ],
  },
  {
    id: 'torch-room',
    desc: 'Torch Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'up', message: 'You cannot reach the rope.' },
      { direction: 'south', destination: 'north-temple' },
      { direction: 'down', destination: 'north-temple' },
    ],
  },
  {
    id: 'north-temple',
    desc: 'Temple',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'down', destination: 'egypt-room' },
      { direction: 'east', destination: 'egypt-room' },
      { direction: 'north', destination: 'torch-room' },
      { direction: 'out', destination: 'torch-room' },
      { direction: 'up', destination: 'torch-room' },
      { direction: 'south', destination: 'south-temple' },
    ],
  },
  {
    id: 'south-temple',
    desc: 'Altar',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'north', destination: 'north-temple' },
      { direction: 'down', condition: 'COFFIN-CURE', destination: 'tiny-cave' },
    ],
  },
  {
    id: 'dam-room',
    desc: 'Dam',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'south', destination: 'deep-canyon' },
      { direction: 'down', destination: 'dam-base' },
      { direction: 'east', destination: 'dam-base' },
      { direction: 'north', destination: 'dam-lobby' },
      { direction: 'west', destination: 'reservoir-south' },
    ],
  },
  {
    id: 'dam-lobby',
    desc: 'Dam Lobby',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'south', destination: 'dam-room' },
      { direction: 'north', destination: 'maintenance-room' },
      { direction: 'east', destination: 'maintenance-room' },
    ],
  },
  {
    id: 'maintenance-room',
    desc: 'Maintenance Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'dam-lobby' },
      { direction: 'west', destination: 'dam-lobby' },
    ],
  },
  {
    id: 'dam-base',
    desc: 'Dam Base',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'north', destination: 'dam-room' },
      { direction: 'up', destination: 'dam-room' },
    ],
  },
  {
    id: 'river-1',
    desc: 'Frigid River',
    flags: ['NONLANDBIT', 'SACREDBIT', 'ONBIT'],
    exits: [
      { direction: 'up', message: 'You cannot go upstream due to strong currents.' },
      { direction: 'west', destination: 'dam-base' },
      { direction: 'land', destination: 'dam-base' },
      { direction: 'down', destination: 'river-2' },
      { direction: 'east', message: 'The White Cliffs prevent your landing here.' },
    ],
  },
  {
    id: 'river-2',
    desc: 'Frigid River',
    flags: ['NONLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'You cannot go upstream due to strong currents.' },
      { direction: 'down', destination: 'river-3' },
      { direction: 'land', message: 'There is no safe landing spot here.' },
      { direction: 'east', message: 'The White Cliffs prevent your landing here.' },
      { direction: 'west', message: 'Just in time you steer away from the rocks.' },
    ],
  },
  {
    id: 'river-3',
    desc: 'Frigid River',
    flags: ['NONLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'You cannot go upstream due to strong currents.' },
      { direction: 'down', destination: 'river-4' },
      { direction: 'land', destination: 'white-cliffs-north' },
      { direction: 'west', destination: 'white-cliffs-north' },
    ],
  },
  {
    id: 'white-cliffs-north',
    desc: 'White Cliffs Beach',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'south', condition: 'DEFLATE', destination: 'white-cliffs-south' },
      { direction: 'west', condition: 'DEFLATE', destination: 'damp-cave' },
    ],
  },
  {
    id: 'white-cliffs-south',
    desc: 'White Cliffs Beach',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'north', condition: 'DEFLATE', destination: 'white-cliffs-north' },
    ],
  },
  {
    id: 'river-4',
    desc: 'Frigid River',
    flags: ['NONLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', message: 'You cannot go upstream due to strong currents.' },
      { direction: 'down', destination: 'river-5' },
      { direction: 'land', message: 'You can land either to the east or the west.' },
      { direction: 'west', destination: 'white-cliffs-south' },
      { direction: 'east', destination: 'sandy-beach' },
    ],
  },
  {
    id: 'river-5',
    desc: 'Frigid River',
    flags: ['NONLANDBIT', 'SACREDBIT', 'ONBIT'],
    exits: [
      { direction: 'up', message: 'You cannot go upstream due to strong currents.' },
      { direction: 'east', destination: 'shore' },
      { direction: 'land', destination: 'shore' },
    ],
  },
  {
    id: 'shore',
    desc: 'Shore',
    flags: ['RLANDBIT', 'SACREDBIT', 'ONBIT'],
    exits: [
      { direction: 'north', destination: 'sandy-beach' },
      { direction: 'south', destination: 'aragain-falls' },
    ],
  },
  {
    id: 'sandy-beach',
    desc: 'Sandy Beach',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'ne', destination: 'sandy-cave' },
      { direction: 'south', destination: 'shore' },
    ],
  },
  {
    id: 'sandy-cave',
    desc: 'Sandy Cave',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'sw', destination: 'sandy-beach' },
    ],
  },
  {
    id: 'aragain-falls',
    desc: 'Aragain Falls',
    flags: ['RLANDBIT', 'SACREDBIT', 'ONBIT'],
    exits: [
      { direction: 'west', condition: 'RAINBOW-FLAG', destination: 'on-rainbow' },
      { direction: 'down', message: "It's a long way..." },
      { direction: 'north', destination: 'shore' },
      { direction: 'up', condition: 'RAINBOW-FLAG', destination: 'on-rainbow' },
    ],
  },
  {
    id: 'on-rainbow',
    desc: 'On the Rainbow',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'west', destination: 'end-of-rainbow' },
      { direction: 'east', destination: 'aragain-falls' },
    ],
  },
  {
    id: 'end-of-rainbow',
    desc: 'End of Rainbow',
    flags: ['RLANDBIT', 'ONBIT'],
    exits: [
      { direction: 'up', condition: 'RAINBOW-FLAG', destination: 'on-rainbow' },
      { direction: 'ne', condition: 'RAINBOW-FLAG', destination: 'on-rainbow' },
      { direction: 'east', condition: 'RAINBOW-FLAG', destination: 'on-rainbow' },
      { direction: 'sw', destination: 'canyon-bottom' },
    ],
  },
  {
    id: 'canyon-bottom',
    desc: 'Canyon Bottom',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', destination: 'cliff-middle' },
      { direction: 'north', destination: 'end-of-rainbow' },
    ],
  },
  {
    id: 'cliff-middle',
    desc: 'Rocky Ledge',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', destination: 'canyon-view' },
      { direction: 'down', destination: 'canyon-bottom' },
    ],
  },
  {
    id: 'canyon-view',
    desc: 'Canyon View',
    flags: ['RLANDBIT', 'ONBIT', 'SACREDBIT'],
    exits: [
      { direction: 'east', destination: 'cliff-middle' },
      { direction: 'down', destination: 'cliff-middle' },
      { direction: 'nw', destination: 'clearing' },
      { direction: 'west', destination: 'forest-3' },
      { direction: 'south', message: 'Storm-tossed trees block your way.' },
    ],
  },
  {
    id: 'mine-entrance',
    desc: 'Mine Entrance',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'slide-room' },
      { direction: 'in', destination: 'squeeky-room' },
      { direction: 'west', destination: 'squeeky-room' },
    ],
  },
  {
    id: 'squeeky-room',
    desc: 'Squeaky Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'bat-room' },
      { direction: 'east', destination: 'mine-entrance' },
    ],
  },
  {
    id: 'bat-room',
    desc: 'Bat Room',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'south', destination: 'squeeky-room' },
      { direction: 'east', destination: 'shaft-room' },
    ],
  },
  {
    id: 'shaft-room',
    desc: 'Shaft Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'down', message: "You wouldn't fit and would die if you could." },
      { direction: 'west', destination: 'bat-room' },
      { direction: 'north', destination: 'smelly-room' },
    ],
  },
  {
    id: 'smelly-room',
    desc: 'Smelly Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'down', destination: 'gas-room' },
      { direction: 'south', destination: 'shaft-room' },
    ],
  },
  {
    id: 'gas-room',
    desc: 'Gas Room',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'up', destination: 'smelly-room' },
      { direction: 'east', destination: 'mine-1' },
    ],
  },
  {
    id: 'ladder-top',
    desc: 'Ladder Top',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'down', destination: 'ladder-bottom' },
      { direction: 'up', destination: 'mine-4' },
    ],
  },
  {
    id: 'ladder-bottom',
    desc: 'Ladder Bottom',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'dead-end-5' },
      { direction: 'west', destination: 'timber-room' },
      { direction: 'up', destination: 'ladder-top' },
    ],
  },
  {
    id: 'dead-end-5',
    desc: 'Dead End',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'ladder-bottom' },
    ],
  },
  {
    id: 'timber-room',
    desc: 'Timber Room',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'east', destination: 'ladder-bottom' },
      { direction: 'west', condition: 'EMPTY-HANDED', destination: 'lower-shaft' },
    ],
  },
  {
    id: 'lower-shaft',
    desc: 'Drafty Room',
    flags: ['RLANDBIT', 'SACREDBIT'],
    exits: [
      { direction: 'south', destination: 'machine-room' },
      { direction: 'out', condition: 'EMPTY-HANDED', destination: 'timber-room' },
      { direction: 'east', condition: 'EMPTY-HANDED', destination: 'timber-room' },
    ],
  },
  {
    id: 'machine-room',
    desc: 'Machine Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'lower-shaft' },
    ],
  },
  {
    id: 'mine-1',
    desc: 'Coal Mine',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'gas-room' },
      { direction: 'east', destination: 'mine-1' },
      { direction: 'ne', destination: 'mine-2' },
    ],
  },
  {
    id: 'mine-2',
    desc: 'Coal Mine',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'mine-2' },
      { direction: 'south', destination: 'mine-1' },
      { direction: 'se', destination: 'mine-3' },
    ],
  },
  {
    id: 'mine-3',
    desc: 'Coal Mine',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'south', destination: 'mine-3' },
      { direction: 'sw', destination: 'mine-4' },
      { direction: 'east', destination: 'mine-2' },
    ],
  },
  {
    id: 'mine-4',
    desc: 'Coal Mine',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'north', destination: 'mine-3' },
      { direction: 'west', destination: 'mine-4' },
      { direction: 'down', destination: 'ladder-top' },
    ],
  },
  {
    id: 'slide-room',
    desc: 'Slide Room',
    flags: ['RLANDBIT'],
    exits: [
      { direction: 'east', destination: 'cold-passage' },
      { direction: 'north', destination: 'mine-entrance' },
      { direction: 'down', destination: 'cellar' },
    ],
  },
];
