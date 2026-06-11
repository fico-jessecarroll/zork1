/**
 * Dam, reservoir, and flood control actions — mirrors BOLT-F, BUTTON-F,
 * DAM-FUNCTION, RESERVOIR-*-FCN, I-RFILL, I-REMPTY, and RIVR4-ROOM from
 * 1actions.zil (subtitle: "FLOOD CONTROL DAM #3").
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface DamState {
  /** GATE-FLAG: green indicator light on the control panel is glowing */
  gateFlag: boolean;
  /** GATES-OPEN: sluice gates are currently open */
  gatesOpen: boolean;
  /** LOW-TIDE: reservoir has been drained (I-REMPTY has fired) */
  lowTide: boolean;
  /** TRUNK invisible bit cleared — trunk of jewels visible in reservoir */
  trunkVisible: boolean;
  /** BUOY-FLAG: first-carry hint not yet delivered */
  buoyFlag: boolean;
}

export const initialDamState: DamState = {
  gateFlag: false,
  gatesOpen: false,
  lowTide: false,
  trunkVisible: false,
  buoyFlag: true,
};

// ---------------------------------------------------------------------------
// BOLT-F — the large metal bolt on the dam control panel
// ---------------------------------------------------------------------------

export interface BoltResult {
  handled: boolean;
  message: string;
  state: DamState;
  /** Schedule I-REMPTY to fire in this many ticks (gates opened → draining) */
  scheduleREmpty?: number;
  /** Schedule I-RFILL to fire in this many ticks (gates closed → filling) */
  scheduleRFill?: number;
}

/**
 * BOLT-F: handles TURN, TAKE, and OIL verbs on the control-panel bolt.
 *
 * Only TURN with WRENCH as the instrument moves the sluice gates.
 * Returns schedule hints the caller must wire into the clock system.
 */
export function boltAction(
  verb: 'TURN' | 'TAKE' | 'OIL',
  /** Instrument used (prsi), e.g. 'WRENCH' */
  prsi: string | null,
  state: DamState,
): BoltResult {
  switch (verb) {
    case 'TAKE':
      return { handled: true, message: 'It is an integral part of the control panel.', state };

    case 'OIL':
      return {
        handled: true,
        message:
          "Hmm. It appears the tube contained glue, not oil. Turning the bolt won't get any easier....",
        state,
      };

    case 'TURN': {
      if (prsi !== 'WRENCH') {
        const instrument = prsi ?? 'your hands';
        return {
          handled: true,
          message: `The bolt won't turn using the ${instrument}.`,
          state,
        };
      }

      if (state.gatesOpen) {
        // Close gates → reservoir starts filling
        const next: DamState = { ...state, gatesOpen: false };
        return {
          handled: true,
          message: 'The sluice gates close and water starts to collect behind the dam.',
          state: next,
          scheduleRFill: 8,
        };
      } else {
        // Open gates → reservoir starts draining
        const next: DamState = { ...state, gatesOpen: true };
        return {
          handled: true,
          message: 'The sluice gates open and water pours through the dam.',
          state: next,
          scheduleREmpty: 8,
        };
      }
    }
  }
}

// ---------------------------------------------------------------------------
// BUTTON-F — control-panel buttons (yellow/brown toggle gateFlag; blue/red other)
// ---------------------------------------------------------------------------

export type ButtonId = 'YELLOW' | 'BROWN' | 'BLUE' | 'RED';

export interface ButtonResult {
  handled: boolean;
  message: string;
  state: DamState;
  /** BLUE button only: start the maintenance-room leak */
  startLeak?: boolean;
  /** RED button only: toggle maintenance-room lights */
  toggleLights?: boolean;
}

/**
 * BUTTON-F: handles PUSH and READ verbs on the four control-panel buttons.
 */
export function buttonAction(
  verb: 'PUSH' | 'READ',
  prso: ButtonId,
  state: DamState,
  waterLevel: number,
): ButtonResult {
  if (verb === 'READ') {
    return { handled: true, message: "They're greek to you.", state };
  }

  switch (prso) {
    case 'YELLOW':
      return {
        handled: true,
        message: 'Click.',
        state: { ...state, gateFlag: true },
      };

    case 'BROWN':
      return {
        handled: true,
        message: 'Click.',
        state: { ...state, gateFlag: false },
      };

    case 'BLUE':
      if (waterLevel === 0) {
        return {
          handled: true,
          message:
            'There is a rumbling sound and a stream of water appears to burst from the east wall of the room (apparently, a leak has occurred in a pipe).',
          state,
          startLeak: true,
        };
      }
      return { handled: true, message: 'The blue button appears to be jammed.', state };

    case 'RED':
      return {
        handled: true,
        message: '',
        state,
        toggleLights: true,
      };
  }
}

// ---------------------------------------------------------------------------
// DAM-FUNCTION — the dam structure itself (not the bolt)
// ---------------------------------------------------------------------------

export interface DamFunctionResult {
  handled: boolean;
  message: string;
}

/**
 * DAM-FUNCTION: handles OPEN, CLOSE, and PLUG on the dam itself.
 */
export function damFunction(
  verb: 'OPEN' | 'CLOSE' | 'PLUG',
  prsi: string | null,
): DamFunctionResult {
  if (verb === 'OPEN' || verb === 'CLOSE') {
    return { handled: true, message: "Sounds reasonable, but this isn't how." };
  }
  if (prsi === 'HANDS' || prsi === null) {
    return {
      handled: true,
      message: 'Are you the little Dutch boy, then? Sorry, this is a big dam.',
    };
  }
  return {
    handled: true,
    message: `With a ${prsi}? Do you know how big this dam is? You could only stop a tiny leak with that.`,
  };
}

// ---------------------------------------------------------------------------
// I-REMPTY — fires 8 turns after gates open; reservoir drains to low tide
// ---------------------------------------------------------------------------

export interface REmptyResult {
  state: DamState;
  /** Contextual message for the player's current location, or null if none */
  message: string | null;
  /** True if the player drowns/dies (in reservoir without vehicle) */
  fatal: boolean;
}

/**
 * I-REMPTY: reservoir empties after sluice gates have been open for 8 turns.
 *
 * Sets LOW-TIDE, reveals the trunk of jewels, and produces a location-specific
 * message.  The caller must check `fatal` and handle death separately.
 */
export function iREmpty(
  state: DamState,
  /** Player's current room id */
  playerLocation: string,
  /** True when player is inside a vehicle (VEHBIT) */
  playerInVehicle: boolean,
): REmptyResult {
  const next: DamState = { ...state, lowTide: true, trunkVisible: true };

  if (playerLocation === 'RESERVOIR') {
    if (playerInVehicle) {
      return {
        state: next,
        message:
          'The water level has dropped to the point at which the boat can no longer stay afloat. It sinks into the mud.',
        fatal: false,
      };
    }
  }

  let message: string | null = null;
  if (playerLocation === 'DEEP-CANYON') {
    message = 'The roar of rushing water is quieter now.';
  } else if (
    playerLocation === 'RESERVOIR-NORTH' ||
    playerLocation === 'RESERVOIR-SOUTH'
  ) {
    message =
      'The water level is now quite low here and you could easily cross over to the other side.';
  }

  return { state: next, message, fatal: false };
}

// ---------------------------------------------------------------------------
// I-RFILL — fires 8 turns after gates close; reservoir refills
// ---------------------------------------------------------------------------

export interface RFillResult {
  state: DamState;
  message: string | null;
  fatal: boolean;
}

/**
 * I-RFILL: reservoir fills after sluice gates have been closed for 8 turns.
 *
 * Clears LOW-TIDE, hides the trunk, and produces location-specific messages.
 */
export function iRFill(
  state: DamState,
  playerLocation: string,
  playerInVehicle: boolean,
): RFillResult {
  const next: DamState = { ...state, lowTide: false, trunkVisible: false };

  if (playerLocation === 'RESERVOIR') {
    if (playerInVehicle) {
      return {
        state: next,
        message: 'The boat lifts gently out of the mud and is now floating on the reservoir.',
        fatal: false,
      };
    }
    return {
      state: next,
      message: null,
      fatal: true,
    };
  }

  let message: string | null = null;
  if (playerLocation === 'DEEP-CANYON') {
    message = 'A sound, like that of flowing water, starts to come from below.';
  } else if (
    playerLocation === 'RESERVOIR-NORTH' ||
    playerLocation === 'RESERVOIR-SOUTH'
  ) {
    message =
      'You notice that the water level has risen to the point that it is impossible to cross.';
  }

  return { state: next, message, fatal: false };
}

// ---------------------------------------------------------------------------
// RIVR4-ROOM (M-END handler) — "you notice something funny about the buoy"
// ---------------------------------------------------------------------------

export interface River4Result {
  message: string | null;
  /** Caller should clear buoyFlag on state when true */
  clearBuoyFlag: boolean;
}

/**
 * RIVR4-ROOM M-END: fires once when the player first carries the buoy through
 * RIVER-4, delivering a hint that the buoy contains a hidden treasure.
 */
export function river4EndAction(
  carryingBuoy: boolean,
  state: DamState,
): River4Result {
  if (carryingBuoy && state.buoyFlag) {
    return {
      message: 'You notice something funny about the feel of the buoy.',
      clearBuoyFlag: true,
    };
  }
  return { message: null, clearBuoyFlag: false };
}

// ---------------------------------------------------------------------------
// Room look descriptions
// ---------------------------------------------------------------------------

/**
 * DAM-ROOM-FCN M-LOOK: generate the dam-top room description suffix that
 * describes the current state of the sluice gates and reservoir.
 */
export function damRoomLookDesc(state: DamState): string {
  let waterDesc: string;
  if (state.lowTide && state.gatesOpen) {
    waterDesc =
      'The water level behind the dam is low: The sluice gates have been opened. Water rushes through the dam and downstream.';
  } else if (state.gatesOpen) {
    waterDesc =
      'The sluice gates are open, and water rushes through the dam. The water level behind the dam is still high.';
  } else if (state.lowTide) {
    waterDesc =
      'The sluice gates are closed. The water level in the reservoir is quite low, but the level is rising quickly.';
  } else {
    waterDesc =
      'The sluice gates on the dam are closed. Behind the dam, there can be seen a wide reservoir. Water is pouring over the top of the now abandoned dam.';
  }

  const bubbleDesc = state.gateFlag ? ' which is\nglowing serenely' : '';
  const panelDesc = `There is a control panel here, on which a large metal bolt is mounted. Directly above the bolt is a small green plastic bubble${bubbleDesc}.`;

  return `${waterDesc}\n${panelDesc}`;
}

/**
 * RESERVOIR-FCN M-LOOK: describes the reservoir room itself.
 */
export function reservoirLookDesc(state: DamState): string {
  if (state.lowTide) {
    return 'You are on what used to be a large lake, but which is now a large mud pile. There are "shores" to the north and south.';
  }
  return 'You are on the lake. Beaches can be seen north and south.\nUpstream a small stream enters the lake through a narrow cleft in the rocks. The dam can be seen downstream.';
}

/**
 * RESERVOIR-SOUTH-FCN M-LOOK: describes the south shore / crossing area.
 */
export function reservoirSouthLookDesc(state: DamState): string {
  if (state.lowTide && state.gatesOpen) {
    return (
      'You are in a long room, to the north of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through the center of the room.'
    );
  }
  if (state.gatesOpen) {
    return (
      'You are in a long room. To the north is a large lake, too deep to cross. You notice, however, that the water level appears to be dropping at a rapid rate. Before long, it might be possible to cross to the other side from here.'
    );
  }
  if (state.lowTide) {
    return (
      'You are in a long room, to the north of which is a wide area which was formerly a reservoir, but now is merely a stream. You notice, however, that the level of the stream is rising quickly and that before long it will be impossible to cross here.'
    );
  }
  return 'You are in a long room on the south shore of a large lake, far too deep and wide for crossing.';
}

/**
 * RESERVOIR-NORTH-FCN M-LOOK: describes the north shore / cavernous area.
 */
export function reservoirNorthLookDesc(state: DamState): string {
  if (state.lowTide && state.gatesOpen) {
    return (
      'You are in a large cavernous room, the south of which was formerly a lake. However, with the water level lowered, there is merely a wide stream running through there.'
    );
  }
  if (state.gatesOpen) {
    return (
      'You are in a large cavernous area. To the south is a wide lake, whose water level appears to be falling rapidly.'
    );
  }
  if (state.lowTide) {
    return (
      'You are in a cavernous area, to the south of which is a very wide stream. The level of the stream is rising rapidly, and it appears that before long it will be impossible to cross to the other side.'
    );
  }
  return 'You are in a large cavernous room, north of a large lake.';
}
