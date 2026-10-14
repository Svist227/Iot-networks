import type { Scenario } from './model';

export type PlaybackPhase = 'prepare' | 'normal' | 'event' | 'recovery' | 'finalize' | 'complete';
export type PlaybackSegment = { from: number; to: number; ms: number; phase: PlaybackPhase };

// Every event boundary gets screen time, including short and overlapping events.
export function playbackSchedule(scenario: Scenario): PlaybackSegment[] {
  const boundaries = [
    ...new Set([
      0,
      scenario.duration,
      ...scenario.events.flatMap((e) => [e.start, e.start + e.duration]),
    ]),
  ].sort((a, b) => a - b);
  const segments: PlaybackSegment[] = [{ from: 0, to: 0, ms: 900, phase: 'prepare' }];
  for (let i = 0; i < boundaries.length - 1; i++) {
    const from = boundaries[i],
      to = boundaries[i + 1];
    if (to <= from) continue;
    const active = scenario.events.some((e) => e.start <= from && e.start + e.duration > from);
    const afterEvent = scenario.events.some((e) => e.start + e.duration <= from);
    segments.push({
      from,
      to,
      ms: active ? 2800 : 2200,
      phase: active ? 'event' : afterEvent ? 'recovery' : 'normal',
    });
  }
  segments.push({ from: scenario.duration, to: scenario.duration, ms: 800, phase: 'finalize' });
  return segments;
}

export function playbackFrame(scenario: Scenario, schedule: PlaybackSegment[], elapsed: number) {
  const total = schedule.reduce((sum, segment) => sum + segment.ms, 0);
  let remaining = Math.max(0, elapsed);
  let time = scenario.duration;
  let phase: PlaybackPhase = 'complete';
  for (const segment of schedule) {
    if (remaining < segment.ms) {
      phase = segment.phase;
      time = segment.from + ((segment.to - segment.from) * remaining) / segment.ms;
      break;
    }
    remaining -= segment.ms;
  }
  const active = scenario.events.filter(
    (e) => phase !== 'prepare' && e.start <= time && time < e.start + e.duration,
  );
  return {
    time,
    phase,
    active,
    progress: Math.min(100, (Math.max(0, elapsed) / total) * 100),
    total,
  };
}

export const clockLabel = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
