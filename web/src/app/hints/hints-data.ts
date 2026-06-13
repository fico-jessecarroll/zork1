export const HINTS: Map<string, string[]> = new Map([
  ['WEST-OF-HOUSE', [
    'You are just getting started. Explore the area around the house.',
    'Check the mailbox near the front door.',
    'OPEN MAILBOX — there is a leaflet inside.',
  ]],
  ['NORTH-OF-HOUSE', [
    'There is a way into the house from here.',
    'The window on this side of the house is relevant.',
    'OPEN WINDOW, then go IN through the window.',
  ]],
  ['BEHIND-HOUSE', [
    'The kitchen window is accessible from here.',
    'The window can be opened.',
    'OPEN WINDOW then go IN.',
  ]],
  ['LIVING-ROOM', [
    'The trophy case is where treasures must be deposited to score points.',
    'There is a way down into the cellar.',
    'The trap door leads underground. You will need a light source.',
    'OPEN TRAP DOOR then go DOWN. Take the brass lantern first.',
  ]],
  ['KITCHEN', [
    'Look around carefully — items on the table are useful.',
    'The bottle of water and the sack of garlic are important early items.',
    'TAKE BOTTLE, TAKE SACK. The sandwich inside the sack is food.',
  ]],
  ['ATTIC', [
    'Something useful is stored up here.',
    'The rope has a purpose.',
    'TAKE ROPE and TAKE KNIFE.',
  ]],
  ['CELLAR', [
    'It is dark without a light source — the lantern is essential.',
    'There are paths in multiple directions from here.',
    'Turn on the lantern: TURN ON LANTERN.',
  ]],
  ['TROLL-ROOM', [
    'The troll blocks passage east.',
    'You need to fight or disable the troll.',
    'Use your sword: KILL TROLL WITH SWORD. Keep fighting until it is dead.',
  ]],
  ['CLEARING', [
    'The clearing looks bare, but the ground is interesting.',
    'Something is buried here.',
    'DIG (you need the shovel from the house). A coffin is buried here.',
  ]],
  ['GRATING-ROOM', [
    'The grating is a locked exit.',
    'You need a key.',
    'Use the skeleton key found in the maze: UNLOCK GRATING WITH KEY, then OPEN GRATING.',
  ]],
  ['MAZE-1', [
    'Mazes are identical-looking — you must map them.',
    'Drop items in each room to mark which rooms you have visited.',
    'Leave one inventory item per room as a breadcrumb.',
  ]],
  ['MAZE-2', [
    'Keep dropping items to map your position.',
    'The skeleton key is hidden somewhere in the maze.',
    'Systematically explore every exit from every room.',
  ]],
  ['LOUD-ROOM', [
    'The sound here interferes with normal actions.',
    'Normal commands do not work in this room.',
    'Type ECHO to break the spell, then take the platinum bar.',
  ]],
  ['ROUND-ROOM', [
    'There are many exits — count them carefully.',
    'Not all directions are obvious.',
    'Try all compass directions including NE, NW, SE, SW.',
  ]],
  ['CYCLOPS-ROOM', [
    'The cyclops blocks passage.',
    'Violence is not the answer here.',
    'Say the magic word: ULYSSES (or ODYSSEUS). The cyclops flees.',
  ]],
  ['TREASURE-ROOM', [
    'The thief operates in this area.',
    'The thief may steal items from you.',
    'You can fight the thief — KILL THIEF WITH SWORD. Recover stolen items afterward.',
  ]],
  ['EGYPT-ROOM', [
    'There is treasure here.',
    'The scarab is in this room.',
    'TAKE SCARAB.',
  ]],
  ['TORCH-ROOM', [
    'The torch is a permanent light source.',
    'Unlike the lantern, the torch never runs out.',
    'TAKE TORCH. You can leave the lantern behind after this.',
  ]],
  ['NORTH-TEMPLE', [
    'The altar is significant.',
    'Certain items should be left here.',
    'Place the sceptre on the altar.',
  ]],
  ['SOUTH-TEMPLE', [
    'Explore both temple rooms.',
    'There is a connection between the two.',
    'The candles and matches are both useful here.',
  ]],
  ['DAM-ROOM', [
    'The dam controls the water level in the reservoir.',
    'The switch does something useful.',
    'TURN BOLT — this drains the reservoir and reveals the dam base area.',
  ]],
  ['DAM-LOBBY', [
    'The desk may have something useful.',
    'EXAMINE DESK and look inside.',
    'There is a manual inside the desk.',
  ]],
  ['MAINTENANCE-ROOM', [
    'Look behind things.',
    'EXAMINE PANEL.',
    'There are tools here needed for a later puzzle.',
  ]],
  ['END-OF-RAINBOW', [
    'A pot of gold is here — but how to get it?',
    'You need to make the rainbow solid.',
    'Use the prism with the sunlight: WAVE SCEPTRE (when sunlight is present).',
  ]],
  ['MACHINE-ROOM', [
    'The machine can process certain items.',
    'The coal needs to be processed.',
    'PUT COAL IN MACHINE, then TURN SWITCH. You get a diamond.',
  ]],
  ['ENGRAVINGS-CAVE', [
    'Read the engravings carefully.',
    'The inscription gives a hint about navigation.',
    'EXAMINE ENGRAVINGS — the message tells you which direction to take in the round room.',
  ]],
  ['FOREST-1', [
    'Forest paths are disorienting.',
    'Keep a mental map of which direction you came from.',
    'Head south to reach the clearing; north leads back toward the house.',
  ]],
  ['GRATING-CLEARING', [
    'There is a grating in the ground here.',
    'The grating is a way into the underground.',
    'OPEN GRATING (requires the skeleton key), then go DOWN.',
  ]],
  ['SANDY-CAVE', [
    'The sand is hiding something.',
    'Try looking more carefully at the floor.',
    'EXAMINE SAND — there is an emerald here.',
  ]],
  ['DOME-ROOM', [
    'There is a way down but it looks risky.',
    'You need a rope.',
    'TIE ROPE TO RAILING, then go DOWN.',
  ]],
]);
