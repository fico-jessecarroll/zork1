/**
 * Above-ground opening sequence — commands and expected transcript output.
 *
 * The sequence walks the player from the starting location (West of House)
 * through the classic opening: opening the mailbox, reading the leaflet,
 * navigating around the house, opening the kitchen window, and entering.
 *
 * Regenerating from Frotz
 * -------------------------
 * The canonical Zork I transcript for this sequence can be captured with:
 *
 *   dfrotz -R /tmp/zork1-transcript.txt COMPILED/zork1.z3
 *
 * Then at the > prompt, type each command in COMMANDS in order, then QUIT.
 * The raw transcript is in /tmp/zork1-transcript.txt.  Strip the "> COMMAND"
 * prompt lines; the remaining lines are the Frotz reference output.
 *
 * To update EXPECTED to match the TypeScript port's current output, run:
 *
 *   npx jest --testPathPattern above-ground.spec -- --updateSnapshot
 *
 * Or manually run the runner and copy the output:
 *
 *   const actual = runTranscript(COMMANDS);
 *   console.log(JSON.stringify(actual, null, 2));
 *
 * Whenever EXPECTED is updated intentionally, add a comment explaining why
 * the TypeScript port's output differs from the Frotz reference.
 */

export const COMMANDS: string[] = [
  'LOOK',
  'OPEN MAILBOX',
  'READ LEAFLET',
  'TAKE LEAFLET',
  'N',
  'E',
  'OPEN WINDOW',
  'IN',
  'W',
  'LOOK',
];

/**
 * Expected output for each command in COMMANDS (one entry per command).
 *
 * Differences from the Frotz/original Zork I output are noted inline.
 */
export const EXPECTED: string[] = [
  // LOOK — room short description only; Frotz also prints the long desc.
  'West of House',

  // OPEN MAILBOX
  'Opening the small mailbox reveals a leaflet.',

  // READ LEAFLET — leaflet text not yet ported; Frotz prints the WELCOME text.
  'The leaflet appears to be blank.',

  // TAKE LEAFLET
  'Taken.',

  // N — vWalk succeeds silently; runner auto-appends room short description.
  'North of House',

  // E — east side of house ("Behind House" in the port; Frotz says "Behind House").
  'Behind House',

  // OPEN WINDOW — generic door-open message; Frotz says
  // "With great effort, you open the window far enough to allow entry."
  'The kitchen window opens.',

  // IN — conditional exit treated as unconditional; runner auto-appends room desc.
  'Kitchen',

  // W
  'Living Room',

  // LOOK
  'Living Room',
];
