import type { StopTime } from '../types/gtfs';

/**
 * Off-pattern stop_times (#70).
 *
 * The timetable builds its columns from a pattern's route_stops and binds each
 * cell to a trip's stop_time by stop_sequence. `backfillMissingRouteStops`
 * (services/routeStopMigration.ts) already covers a stop_time whose sequence the
 * pattern LACKS, but nothing noticed a stop_time whose sequence the pattern HAS
 * while the stop differs: the row then rendered under the wrong stop's column,
 * and every sequence-keyed write (cell edit, skip, interpolate) landed on it.
 *
 * This module is the single definition of "this row doesn't belong to this
 * column" — shared by the grid (which renders such cells read-only), the trip
 * panel that lists them, and the store guards that refuse to write through them.
 */

/** One column of a pattern: the stop the timetable expects at a sequence. */
export interface PatternSlot {
  stop_sequence: number;
  stop_id: string;
}

/**
 * - `mismatch`: the pattern has this stop_sequence, but for a different stop.
 * - `extra`: the pattern has no column at this stop_sequence at all.
 */
export type OffPatternKind = 'mismatch' | 'extra';

export interface OffPatternRow {
  stopTime: StopTime;
  kind: OffPatternKind;
  /** The pattern's stop at this sequence — set only for `mismatch`. */
  patternStopId?: string;
}

/** A stop_time belongs to a column only when BOTH its sequence and stop match. */
export function stopTimeMatchesSlot(st: StopTime | undefined, seq: number, stopId: string): boolean {
  return !!st && st.stop_sequence === seq && st.stop_id === stopId;
}

/**
 * The rows of ONE trip that the pattern can't show as-is, in stop_sequence
 * order. A pattern that legitimately repeats a stop_id (a loop) yields nothing
 * here as long as each instance sits at its own sequence.
 */
export function findOffPatternRows(pattern: PatternSlot[], tripStopTimes: StopTime[]): OffPatternRow[] {
  const stopAtSeq = new Map(pattern.map((p) => [p.stop_sequence, p.stop_id]));
  const out: OffPatternRow[] = [];
  for (const st of tripStopTimes) {
    const expected = stopAtSeq.get(st.stop_sequence);
    if (expected === undefined) out.push({ stopTime: st, kind: 'extra' });
    else if (expected !== st.stop_id) out.push({ stopTime: st, kind: 'mismatch', patternStopId: expected });
  }
  return out.sort((a, b) => a.stopTime.stop_sequence - b.stopTime.stop_sequence);
}
