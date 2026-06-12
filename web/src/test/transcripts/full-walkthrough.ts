/**
 * Full 350-point walkthrough command sequence.
 *
 * Scoring breakdown (verified against ZIL source):
 *   Treasure values taken  : 143 pts  (19 treasures × their P?VALUE)
 *   Room bonuses           :  65 pts  (Kitchen 10, Cellar 25, E-of-Chasm 5, Treasure Room 25)
 *   LIGHT-SHAFT event      :  13 pts  (entering Lower Shaft from Machine Room with lamp on)
 *   OTVAL-FROB (tvalues)   : 129 pts  (19 treasures deposited in trophy case)
 *   TOTAL                  : 350 pts
 */
export const COMMANDS: string[] = [
  // ── Phase 1: above-ground setup ──────────────────────────────────────────
  'OPEN MAILBOX',
  'TAKE LEAFLET',
  'N',                        // North of House
  'E',                        // Behind House
  'OPEN WINDOW',
  'IN',                       // Kitchen  [+10 room bonus]
  'TAKE SACK',                // brown sack (contains garlic clove for cyclops)
  'UP',                       // Attic
  'TAKE ROPE',
  'DOWN',                     // Kitchen
  'W',                        // Living Room
  'TAKE LAMP',                // brass lantern  [LAMP is in LIVING-ROOM]
  'TAKE SWORD',
  'TURN ON LAMP',
  'MOVE RUG',
  'OPEN TRAP DOOR',

  // ── Phase 2: get egg, canary, and bauble from the tree ───────────────────
  'E',                        // Kitchen
  'E',                        // Behind House
  'E',                        // Clearing
  'N',                        // Forest
  'W',                        // Forest Path
  'U',                        // Up a Tree
  'TAKE EGG',                 // jewel-encrusted egg  [value +5]
  'OPEN EGG',                 // reveals golden clockwork canary
  'TAKE CANARY',              // golden clockwork canary  [value +6]
  'WIND CANARY',              // sings once in forest → bauble drops to Path
  'D',                        // Forest Path  (bauble is here now)
  'TAKE BAUBLE',              // beautiful brass bauble  [value +1]
  'S',                        // North of House
  'E',                        // Behind House
  'IN',                       // Kitchen
  'W',                        // Living Room

  // ── Phase 3: enter dungeon ────────────────────────────────────────────────
  'D',                        // Cellar  [+25 room bonus]
  'S',                        // East of Chasm  [+5 room bonus]
  'E',                        // Gallery
  'TAKE PAINTING',            // beautiful painting  [value +4]
  'W',                        // East of Chasm
  'N',                        // Cellar

  // ── Phase 4: kill troll, collect maze treasures ───────────────────────────
  'N',                        // Troll Room
  'KILL TROLL WITH SWORD',
  'W',                        // Maze (1)
  'S',                        // Maze (2)
  'E',                        // Maze (3)
  'U',                        // Maze (5) — has bag of coins and skeleton key
  'TAKE BAG OF COINS',        // leather bag of coins  [value +10]
  'TAKE KEY',                 // skeleton key (needed for grate)
  'SW',                       // Maze (6)
  'E',                        // Maze (7)
  'U',                        // Maze (14)
  'W',                        // Maze (15)
  'SE',                       // Cyclops Room

  // ── Phase 5: cyclops + Treasure Room ─────────────────────────────────────
  'GIVE GARLIC TO CYCLOPS',
  'U',                        // Treasure Room  [+25 room bonus]
  'TAKE CHALICE',             // silver chalice  [value +10]
  'D',                        // Cyclops Room

  // ── Phase 6: navigate to grating room, then back to Round Room ───────────
  'NW',                       // Maze (15)
  'S',                        // Maze (7)
  'W',                        // Maze (6)
  'U',                        // Maze (9)
  'E',                        // Maze (10)
  'U',                        // Maze (11)
  'NE',                       // Grating Room
  'UNLOCK GRATE WITH KEY',
  'OPEN GRATE',
  'SW',                       // Maze (11)
  'D',                        // Maze (10)
  'W',                        // Maze (13)
  'W',                        // Maze (11)
  'SW',                       // Maze (12)
  'U',                        // Maze (9)
  'N',                        // Maze (6)
  'D',                        // Maze (5)
  'N',                        // Maze (3)
  'W',                        // Maze (2)
  'S',                        // Maze (1)
  'E',                        // Troll Room
  'E',                        // East-West Passage
  'E',                        // Round Room

  // ── Phase 7: Loud Room ────────────────────────────────────────────────────
  'E',                        // Loud Room
  'TAKE BAR',                 // platinum bar  [value +10]
  'W',                        // Round Room

  // ── Phase 8: Dome Room → Torch Room → Temple → Egypt → Hades ─────────────
  'SE',                       // Engravings Cave
  'E',                        // Dome Room
  'TIE ROPE TO RAILING',      // enables rope descent to Torch Room
  'D',                        // Torch Room  (via rope)
  'TAKE TORCH',               // ivory torch  [value +14]
  'S',                        // North Temple
  'TAKE BELL',
  'E',                        // Egyptian Room
  'TAKE COFFIN',              // gold coffin  [value +10]
  'OPEN COFFIN',              // reveals sceptre inside
  'TAKE SCEPTRE',             // sceptre  [value +4]
  'W',                        // North Temple
  'S',                        // South Temple / Altar
  'TAKE BOOK',
  'TAKE CANDLES',
  'D',                        // Tiny Cave  (via COFFIN-CURE exit from Altar)
  'D',                        // Entrance to Hades
  'RING BELL',
  'READ BOOK',
  'S',                        // Land of the Dead
  'TAKE SKULL',               // crystal skull  [value +10]
  'N',                        // Entrance to Hades
  'U',                        // Tiny Cave
  'N',                        // Mirror Room (south)  [MIRROR-ROOM-2]
  'N',                        // Narrow Passage       [N from MIRROR-ROOM-2, not W]
  'N',                        // Round Room

  // ── Phase 9: dam, maintenance room, drain reservoir, get trunk ────────────
  'N',                        // North-South Passage
  'N',                        // Chasm
  'NE',                       // Reservoir South
  'E',                        // Dam
  'N',                        // Dam Lobby
  'N',                        // Maintenance Room
  'TAKE SCREWDRIVER',
  'TAKE WRENCH',
  'PUSH YELLOW BUTTON',       // drains reservoir; trunk becomes visible
  'S',                        // Dam Lobby
  'S',                        // Dam
  'D',                        // Dam Base
  'TAKE INFLATABLE BOAT',
  'N',                        // Dam  (dam base N → dam room)
  'W',                        // Reservoir South
  'N',                        // Reservoir  (drained — low tide)
  'TAKE TRUNK',               // trunk of jewels  [value +15]
  'N',                        // Reservoir North
  'TAKE PUMP',
  'N',                        // Atlantis Room
  'TAKE TRIDENT',             // crystal trident  [value +4]

  // ── Phase 10: coal mine — jade, bracelet, machine diamond ─────────────────
  'U',                        // Small Cave
  'N',                        // Mirror Room (north)  [MIRROR-ROOM-1]
  'N',                        // Cold Passage
  'W',                        // Slide Room
  'N',                        // Mine Entrance
  'W',                        // Squeaky Room
  'N',                        // Bat Room
  'TAKE JADE',                // jade figurine  [value +5]
  'E',                        // Shaft Room
  'N',                        // Smelly Room
  'D',                        // Gas Room
  'TAKE BRACELET',            // sapphire bracelet  [value +5]
  'E',                        // Coal Mine (1)
  'NE',                       // Coal Mine (2)
  'SE',                       // Coal Mine (3)
  'SW',                       // Coal Mine (4)
  'D',                        // Ladder Top
  'D',                        // Ladder Bottom
  'W',                        // Timber Room
  'W',                        // Lower Shaft (Drafty Room)
  'S',                        // Machine Room
  'TURN SWITCH WITH SCREWDRIVER',  // converts coal → diamond
  'OPEN MACHINE',
  'TAKE DIAMOND',             // huge diamond  [value +10]
  'N',                        // Lower Shaft  [+13 LIGHT-SHAFT bonus — came from MACHINE-ROOM]
  'E',                        // Timber Room
  'E',                        // Ladder Bottom
  'U',                        // Ladder Top
  'U',                        // Coal Mine (4)
  'N',                        // Coal Mine (3)
  'E',                        // Coal Mine (2)
  'S',                        // Coal Mine (1)
  'N',                        // Gas Room
  'U',                        // Smelly Room
  'S',                        // Shaft Room
  'W',                        // Bat Room
  'S',                        // Squeaky Room
  'E',                        // Mine Entrance
  'S',                        // Slide Room
  'D',                        // Cellar
  'N',                        // Troll Room
  'E',                        // East-West Passage
  'E',                        // Round Room

  // ── Phase 11: inflate boat, navigate river, beach, rainbow ───────────────
  'N',                        // North-South Passage
  'N',                        // Chasm
  'NE',                       // Reservoir South
  'E',                        // Dam
  'D',                        // Dam Base
  'INFLATE BOAT WITH PUMP',
  'BOARD BOAT',               // → Frigid River (river-1)
  'D',                        // Frigid River (river-2)
  'D',                        // Frigid River (river-3)
  'D',                        // Frigid River (river-4)
  'TAKE BUOY',                // red buoy (contains large emerald)
  'OPEN BUOY',
  'TAKE EMERALD',             // large emerald  [value +5]
  'D',                        // Frigid River (river-5)
  'E',                        // Shore
  'N',                        // Sandy Beach
  'TAKE SHOVEL',              // [SHOVEL is at SANDY-BEACH, take before going NE]
  'NE',                       // Sandy Cave
  'DIG',                      // uncovers the scarab
  'TAKE SCARAB',              // jeweled scarab  [value +5]
  'SW',                       // Sandy Beach
  'S',                        // Shore
  'S',                        // Aragain Falls
  'WAVE SCEPTRE',             // creates rainbow; reveals pot of gold
  'W',                        // On the Rainbow
  'W',                        // End of Rainbow
  'TAKE POT OF GOLD',         // pot of gold  [value +10]
  'SW',                       // Canyon Bottom
  'U',                        // Rocky Ledge
  'U',                        // Canyon View
  'NW',                       // Clearing
  'W',                        // Behind House
  'IN',                       // Kitchen
  'W',                        // Living Room

  // ── Phase 12: deposit all 19 treasures in trophy case ────────────────────
  'PUT EGG IN TROPHY CASE',           // tvalue +5
  'PUT CANARY IN TROPHY CASE',        // tvalue +4
  'PUT BAUBLE IN TROPHY CASE',        // tvalue +1
  'PUT PAINTING IN TROPHY CASE',      // tvalue +6
  'PUT BAG OF COINS IN TROPHY CASE',  // tvalue +5
  'PUT CHALICE IN TROPHY CASE',       // tvalue +5
  'PUT BAR IN TROPHY CASE',           // tvalue +5
  'PUT TORCH IN TROPHY CASE',         // tvalue +6
  'PUT COFFIN IN TROPHY CASE',        // tvalue +15
  'PUT SCEPTRE IN TROPHY CASE',       // tvalue +6
  'PUT SKULL IN TROPHY CASE',         // tvalue +10
  'PUT TRUNK IN TROPHY CASE',         // tvalue +5
  'PUT TRIDENT IN TROPHY CASE',       // tvalue +11
  'PUT JADE IN TROPHY CASE',          // tvalue +5
  'PUT BRACELET IN TROPHY CASE',      // tvalue +5
  'PUT DIAMOND IN TROPHY CASE',       // tvalue +10
  'PUT EMERALD IN TROPHY CASE',       // tvalue +10
  'PUT SCARAB IN TROPHY CASE',        // tvalue +5
  'PUT POT OF GOLD IN TROPHY CASE',   // tvalue +10

  // ── Final score ───────────────────────────────────────────────────────────
  'SCORE',
];

/**
 * The SCORE command (last entry in COMMANDS) must return '350'.
 * All other commands must not return an "I don't know" response.
 * All PUT commands must return 'Done.'.
 */
export const EXPECTED_SCORE = '350';
export const PUT_RESPONSE = 'Done.';
export const SCORE_INDEX = COMMANDS.length - 1;
export const FIRST_PUT_INDEX = COMMANDS.indexOf('PUT EGG IN TROPHY CASE');
