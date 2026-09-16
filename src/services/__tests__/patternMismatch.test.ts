// #70: a trip's stop_time whose stop isn't the pattern's stop at that sequence
// must be detected, not silently shown under (and written through) the wrong
// column.
import { describe, expect, it } from 'vitest';
import { findOffPatternRows, stopTimeMatchesSlot } from '../patternMismatch';
import type { StopTime } from '../../types/gtfs';

const st = (stop_id: string, stop_sequence: number, time = ''): StopTime => ({
  trip_id: 'T', stop_id, stop_sequence, arrival_time: time, departure_time: time,
});

// Pattern A/B/C/D/G at 0/1/2/3/6 — the shape of the #70 repro.
const pattern = [
  { stop_sequence: 0, stop_id: 'A' },
  { stop_sequence: 1, stop_id: 'B' },
  { stop_sequence: 2, stop_id: 'C' },
  { stop_sequence: 3, stop_id: 'D' },
  { stop_sequence: 6, stop_id: 'G' },
];

describe('findOffPatternRows', () => {
  it('flags rows whose stop differs from the pattern stop at the same sequence (#70 repro)', () => {
    const rows = findOffPatternRows(pattern, [
      st('ER', 1, '14:16:00'), st('ER', 0, '14:15:00'), st('C', 2), st('D', 3), st('Y', 6, '14:23:00'),
    ]);
    expect(rows.map((r) => [r.stopTime.stop_sequence, r.stopTime.stop_id, r.kind, r.patternStopId])).toEqual([
      [0, 'ER', 'mismatch', 'A'],
      [1, 'ER', 'mismatch', 'B'],
      [6, 'Y', 'mismatch', 'G'],
    ]);
  });

  it('flags a row at a sequence the pattern has no column for as extra', () => {
    const rows = findOffPatternRows(pattern, [st('A', 0), st('Z', 4)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe('extra');
    expect(rows[0].patternStopId).toBeUndefined();
  });

  it('returns nothing for a trip that matches, including one that skips stops', () => {
    expect(findOffPatternRows(pattern, [st('A', 0), st('B', 1), st('C', 2), st('D', 3), st('G', 6)])).toEqual([]);
    expect(findOffPatternRows(pattern, [st('A', 0), st('G', 6)])).toEqual([]);
  });

  it('does not treat a loop (same stop_id at two sequences) as off-pattern', () => {
    const loop = [
      { stop_sequence: 0, stop_id: 'L1' },
      { stop_sequence: 1, stop_id: 'L2' },
      { stop_sequence: 2, stop_id: 'L1' },
    ];
    expect(findOffPatternRows(loop, [st('L1', 0), st('L2', 1), st('L1', 2)])).toEqual([]);
  });
});

describe('stopTimeMatchesSlot', () => {
  it('requires both sequence and stop to match', () => {
    expect(stopTimeMatchesSlot(st('A', 0), 0, 'A')).toBe(true);
    expect(stopTimeMatchesSlot(st('ER', 0), 0, 'A')).toBe(false);
    expect(stopTimeMatchesSlot(st('A', 1), 0, 'A')).toBe(false);
    expect(stopTimeMatchesSlot(undefined, 0, 'A')).toBe(false);
  });
});
