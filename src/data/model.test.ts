import { describe, expect, it } from 'vitest';
import {
  initialProjects,
  makeProject,
  makeRun,
  messageRate,
  sensorCount,
  validateScenario,
} from './model';

describe('Project templates', () => {
  it('starts with a consistent 1,000-sensor network at 100 messages/s', () => {
    const p = initialProjects()[0];
    expect(sensorCount(p.nodes)).toBe(1000);
    expect(messageRate(p.nodes)).toBe(100);
    expect(
      p.edges.every(
        (e) => p.nodes.some((n) => n.id === e.source) && p.nodes.some((n) => n.id === e.target),
      ),
    ).toBe(true);
  });
  it('gives projects independent scenarios and the requested topology', () => {
    const single = makeProject('Single', 'single');
    const reserve = makeProject('Reserve', 'reserve');
    expect(single.nodes.some((n) => n.data.reserve)).toBe(false);
    expect(reserve.nodes.some((n) => n.data.reserve)).toBe(true);
    expect(single.scenarios[0].id).not.toBe(reserve.scenarios[0].id);
  });
});
describe('Scenario validation', () => {
  it('rejects events extending beyond the scenario duration', () => {
    const p = makeProject('Test');
    const scenario = p.scenarios[1];
    scenario.events[0].start = 590;
    expect(validateScenario(scenario, p.nodes)).toContain('полностью помещаться');
  });
  it('rejects targets removed from the network', () => {
    const p = makeProject('Test');
    expect(
      validateScenario(
        p.scenarios[1],
        p.nodes.filter((n) => n.id !== 'c'),
      ),
    ).toContain('существующий объект');
    expect(() => makeRun({ ...p, nodes: [] }, p.scenarios[1])).toThrow();
  });
});
describe('Run snapshots', () => {
  it('keeps topology and event settings unchanged when the project is edited', () => {
    const p = makeProject('Test');
    const run = makeRun(p, p.scenarios[1]);
    p.nodes[0].data.count = 5;
    p.nodes[0].position.x = 999;
    p.edges.splice(0);
    p.scenarios[1].events[0].duration = 120;
    expect(run.nodes[0].data.count).toBe(400);
    expect(run.nodes[0].position.x).toBe(30);
    expect(run.edges.length).toBeGreaterThan(0);
    expect(run.scenario.events[0].duration).toBe(60);
  });
  it('selects prepared datasets by event type, independently of numeric inputs', () => {
    const p = makeProject('Test');
    expect(makeRun(p, p.scenarios[0]).preset).toBe('normal');
    expect(makeRun(p, p.scenarios[1]).preset).toBe('outage');
    expect(makeRun(p, p.scenarios[2]).preset).toBe('load');
  });
});
