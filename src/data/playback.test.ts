import { describe, expect, it } from 'vitest';
import { makeProject } from './model';
import { playbackFrame, playbackSchedule } from './playback';

describe('Scenario playback', () => {
  it('holds the preparation stage before advancing simulation time', () => {
    const scenario = makeProject('Test').scenarios[1];
    expect(playbackFrame(scenario, playbackSchedule(scenario), 400)).toMatchObject({
      time: 0,
      phase: 'prepare',
      active: [],
    });
  });
  it('gives even a one-second event a visible playback interval', () => {
    const scenario = makeProject('Test').scenarios[1];
    scenario.duration = 1800;
    scenario.events[0].start = 1400;
    scenario.events[0].duration = 1;
    const schedule = playbackSchedule(scenario);
    const event = schedule.find((s) => s.phase === 'event')!;
    expect(event).toMatchObject({ from: 1400, to: 1401 });
    expect(event.ms).toBeGreaterThanOrEqual(2000);
    const offset = schedule.slice(0, schedule.indexOf(event)).reduce((sum, s) => sum + s.ms, 0);
    expect(playbackFrame(scenario, schedule, offset + event.ms / 2).active[0].id).toBe(
      scenario.events[0].id,
    );
  });
  it('shows overlapping events together and preserves their individual end times', () => {
    const scenario = makeProject('Test').scenarios[1];
    scenario.events.push({ ...scenario.events[0], id: 'second', start: 270, duration: 90 });
    const schedule = playbackSchedule(scenario);
    const segment = schedule.find((s) => s.from === 270)!;
    const offset = schedule.slice(0, schedule.indexOf(segment)).reduce((sum, s) => sum + s.ms, 0);
    expect(playbackFrame(scenario, schedule, offset + 100).active).toHaveLength(2);
    const next = schedule.find((s) => s.from === 300)!;
    const nextOffset = schedule.slice(0, schedule.indexOf(next)).reduce((sum, s) => sum + s.ms, 0);
    expect(playbackFrame(scenario, schedule, nextOffset + 100).active.map((e) => e.id)).toEqual([
      'second',
    ]);
  });
  it('finishes precisely at the scenario duration, with no active events', () => {
    const scenario = makeProject('Test').scenarios[1];
    const schedule = playbackSchedule(scenario);
    const total = schedule.reduce((sum, s) => sum + s.ms, 0);
    expect(playbackFrame(scenario, schedule, total)).toMatchObject({
      time: scenario.duration,
      phase: 'complete',
      progress: 100,
      active: [],
    });
    expect(playbackFrame(scenario, schedule, total + 999)).toMatchObject({
      progress: 100,
      time: scenario.duration,
    });
  });
  it('does not invent failure events for a normal scenario', () => {
    const scenario = makeProject('Test').scenarios[0];
    const schedule = playbackSchedule(scenario);
    expect(schedule.some((s) => s.phase === 'event' || s.phase === 'recovery')).toBe(false);
    expect(playbackFrame(scenario, schedule, 1500).active).toEqual([]);
  });
  it('includes failures beginning at zero and ending at the last second', () => {
    const scenario = makeProject('Test').scenarios[1];
    scenario.events[0].start = 0;
    scenario.events[0].duration = scenario.duration;
    const schedule = playbackSchedule(scenario);
    expect(playbackFrame(scenario, schedule, 901).active).toHaveLength(1);
    const total = schedule.reduce((sum, s) => sum + s.ms, 0);
    expect(playbackFrame(scenario, schedule, total).active).toHaveLength(0);
  });
});
