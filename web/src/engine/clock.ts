// M-HANDLED constant from gmain.zil: returned when at least one interrupt fired
export const M_HANDLED = 1 as const;

export interface ClockEntry {
  routineId: string;
  enabled: boolean;
  ticks: number;
}

export type ClockTable = ClockEntry[];

type Routine = (state: unknown) => boolean;

const _table: ClockTable = [];
const _routines = new Map<string, Routine>();

export function registerRoutine(id: string, fn: Routine): void {
  _routines.set(id, fn);
}

// Finds or creates the entry for routineId and arms it with the given tick count.
export function queue(routineId: string, ticks: number): ClockEntry {
  let entry = _table.find(e => e.routineId === routineId);
  if (entry) {
    entry.ticks = ticks;
    entry.enabled = true;
  } else {
    entry = { routineId, enabled: true, ticks };
    _table.push(entry);
  }
  return entry;
}

export function enable(entry: ClockEntry): void {
  entry.enabled = true;
}

export function disable(entry: ClockEntry): void {
  entry.enabled = false;
}

// Mirrors ZIL CLOCKER: decrement each enabled entry; invoke routines whose
// counter reaches 0. Returns M_HANDLED if at least one routine fired.
export function clocker(state: unknown): typeof M_HANDLED | false {
  let handled = false;
  for (const entry of _table) {
    if (!entry.enabled || entry.ticks === 0) continue;
    entry.ticks -= 1;
    if (entry.ticks === 0) {
      const fn = _routines.get(entry.routineId);
      if (fn?.(state)) {
        handled = true;
      }
    }
  }
  return handled ? M_HANDLED : false;
}

export function _reset(): void {
  _table.length = 0;
  _routines.clear();
}
