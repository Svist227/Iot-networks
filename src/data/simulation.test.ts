import { describe, expect, it } from 'vitest';
import { makeProject, makeRun } from './model';
import { calculate, calculationConclusion } from './simulation';

function fixture() {
  const project = makeProject('Контроль', 'single');
  project.nodes = project.nodes.filter((n) => !['v', 'p'].includes(n.id));
  project.edges = project.edges.filter((e) => !['v', 'p'].includes(e.source));
  project.nodes[0].data.count = 1000;
  const scenario = project.scenarios[1];
  return { project, scenario };
}
function balance(r: ReturnType<typeof calculate>['results'][number]) {
  expect(r.generated).toBe(r.delivered + r.lost + r.remaining + r.inTransit);
  expect(r.peak).toBeLessThanOrEqual(r.buffer);
}
describe('Finite FIFO gateway model', () => {
  it('does not recommend a buffer when no messages were generated', () => {
    const { project } = fixture();
    project.nodes[0].data.count = 1;
    project.nodes[0].data.interval = 10000;
    const c = calculate(project, project.scenarios[0]);
    expect(c.results[0].generated).toBe(0);
    expect(calculationConclusion(c)).toContain('сообщения не поступили');
    c.results.forEach(balance);
  });
  it('matches the independent queue formulas for 60 s outage, including continuing input', () => {
    const { project, scenario } = fixture();
    const c = calculate(project, scenario);
    const small = c.results.find((r) => r.buffer === 4000)!;
    const enough = c.results.find((r) => r.buffer === 6000)!;
    expect(enough.generated).toBe(60000);
    expect(enough.peak).toBe(100 * 60);
    // Fluid formulas omit the one message already being transmitted at failure.
    // This model keeps that message in the gateway buffer until service completes.
    expect(enough.lost).toBe(1);
    expect(enough.recovery).toBeCloseTo(6000 / (150 - 100), 1);
    expect(small.lost).toBe(2001);
    expect(small.recovery).toBeCloseTo(4000 / (150 - 100), 1);
    c.results.forEach(balance);
    scenario.comparisonBuffers = [6001];
    expect(calculate(project, scenario).results.find((r) => r.buffer === 6001)!.lost).toBe(0);
  });
  it('responds to source counts and intervals rather than selecting a fixture', () => {
    const { project, scenario } = fixture();
    project.nodes[0].data.interval = 20;
    const slow = calculate(project, scenario).results[1];
    expect(slow.generated).toBe(30000);
    expect(slow.peak).toBe(3000);
    project.nodes[0].data.count *= 2;
    expect(calculate(project, scenario).results[1].peak).toBe(6000);
  });
  it('changes the queue and losses for synchronized bursts with the same average load', () => {
    const { project } = fixture();
    const scenario = {
      ...project.scenarios[0],
      comparisonBuffers: [100],
      sendingMode: 'uniform' as const,
    };
    const uniform = calculate(project, scenario).results[0];
    const burst = calculate(project, { ...scenario, sendingMode: 'synchronized' }).results[0];
    expect(uniform.generated).toBe(burst.generated);
    expect(uniform.lost).toBe(0);
    expect(burst.lost).toBe(54000);
    expect(burst.peak).toBe(100);
    balance(burst);
  });
  it('computes delivered-message delays and nearest-rank p95', () => {
    const { project } = fixture();
    project.nodes[0].data.count = 2;
    project.nodes[0].data.interval = 60;
    project.nodes.find((n) => n.id === 'c')!.data.capacity = 1;
    project.nodes.find((n) => n.id === 'c')!.data.latency = 100;
    const [r] = calculate(project, {
      ...project.scenarios[0],
      duration: 60,
      sendingMode: 'synchronized',
    }).results;
    expect(r.delivered).toBe(2);
    expect(r.meanDelay).toBeCloseTo(1.6, 8);
    expect(r.p95Delay).toBeCloseTo(2.1, 8);
    expect(r.recovery).toBeNull();
    balance(r);
  });
  it('keeps unfinished queues and transit separate from loss and reports incomplete recovery', () => {
    const { project, scenario } = fixture();
    scenario.duration = 360;
    const c = calculate(project, scenario);
    const r = c.results[1];
    expect(r.recovery).toBeNull();
    expect(r.remaining).toBeGreaterThan(2900);
    expect(r.lost).toBe(1);
    expect(r.inTransit).toBeGreaterThan(0);
    balance(r);
  });
  it('models a server outage as backpressure at the gateway', () => {
    const { project, scenario } = fixture();
    const channel = calculate(project, scenario).results;
    scenario.events[0].target = 's';
    scenario.events[0].kind = 'node';
    expect(calculate(project, scenario).results).toEqual(channel);
  });
  it('unions overlapping failures instead of doubling downtime', () => {
    const { project, scenario } = fixture();
    scenario.events[0].start = 20;
    scenario.events[0].duration = 15;
    const merged = calculate(project, scenario).results;
    scenario.events[0].duration = 10;
    scenario.events.push({
      ...scenario.events[0],
      id: 'second',
      target: 's',
      start: 25,
      duration: 10,
    });
    expect(calculate(project, scenario).results).toEqual(merged);
  });
  it('accounts for a load increase at all sources or a selected source', () => {
    const project = makeProject('Load', 'single');
    const scenario = project.scenarios[2];
    expect(calculate(project, scenario).results[1].generated).toBe(72000);
    scenario.events[0].target = 't';
    expect(calculate(project, scenario).results[1].generated).toBe(64800);
  });
  it('returns null delays with no deliveries and loses all input with a zero buffer', () => {
    const { project, scenario } = fixture();
    scenario.comparisonBuffers = [0];
    const r = calculate(project, scenario).results[0];
    expect(r.generated).toBe(r.lost);
    expect(r.p95Delay).toBeNull();
    expect(r.meanDelay).toBeNull();
    balance(r);
  });
  it('changes capacity based on the slowest component and pauses an in-progress message', () => {
    const { project, scenario } = fixture();
    project.nodes[0].data.count = 1;
    project.nodes[0].data.interval = 60;
    project.nodes.find((n) => n.id === 's')!.data.capacity = 1;
    scenario.duration = 60;
    scenario.sendingMode = 'synchronized';
    scenario.events[0] = { ...scenario.events[0], start: 0.5, duration: 10 };
    const c = calculate(project, scenario);
    expect(c.capacity).toBe(1);
    expect(c.results[0].meanDelay).toBeCloseTo(11.01, 8);
    expect(c.results[0].recovery).toBeCloseTo(0.5, 8);
  });
  it('snapshots calculated values and parameters', () => {
    const { project, scenario } = fixture();
    const run = makeRun(project, scenario);
    scenario.comparisonBuffers = [10];
    project.nodes[0].data.count = 1;
    expect(run.calculation?.results[1].peak).toBe(6000);
    expect(run.nodes[0].data.count).toBe(1000);
    expect(JSON.parse(JSON.stringify(run)).calculation).toEqual(run.calculation);
  });
});

describe('Calculation scope and resource limits', () => {
  it('rejects reserve, disconnected sources, extra paths and unsupported failures', () => {
    const { project, scenario } = fixture();
    expect(() => calculate(project, { ...scenario, reserve: true })).toThrow('выключите');
    expect(() => calculate({ ...project, edges: project.edges.slice(1) }, scenario)).toThrow(
      'Соедините',
    );
    expect(() =>
      calculate(
        { ...project, edges: [...project.edges, { id: 'extra', source: 't', target: 's' }] },
        scenario,
      ),
    ).toThrow('Ветвления');
    scenario.events[0].target = 'g';
    expect(() => calculate(project, scenario)).toThrow('Отказ шлюза');
  });
  it('explicitly excludes disabled reserve nodes but rejects sensors only connected to reserve', () => {
    const project = makeProject('Reserve');
    expect(calculate(project, project.scenarios[1]).excludedNodes).toEqual(['r']);
    const segments = makeProject('Segments', 'segments');
    expect(() => calculate(segments, segments.scenarios[1])).toThrow('Соедините');
  });
  it('rejects invalid inputs and caps generated messages before allocation', () => {
    const { project, scenario } = fixture();
    expect(() => calculate(project, { ...scenario, comparisonBuffers: [NaN] })).toThrow('целые');
    project.nodes[0].data.count = 1000000;
    expect(() => calculate(project, scenario)).toThrow('500 000');
    project.nodes[0].data.count = 1.5;
    expect(() => calculate(project, scenario)).toThrow('количество');
  });
  it('keeps conservation for a matrix of rates, buffers, outage durations and source patterns', () => {
    const { project, scenario } = fixture();
    scenario.duration = 120;
    project.nodes[0].data.count = 15;
    scenario.events[0].start = 20;
    scenario.comparisonBuffers = [0, 20, 80];
    for (const capacity of [1, 10, 100]) {
      project.nodes.find((n) => n.id === 'c')!.data.capacity = capacity;
      for (const duration of [10, 30, 90]) {
        scenario.events[0].duration = duration;
        for (const sendingMode of ['uniform', 'synchronized'] as const) {
          scenario.sendingMode = sendingMode;
          calculate(project, scenario).results.forEach(balance);
        }
      }
    }
  });
});

describe('Playback calculation trace', () => {
  it('conserves messages at every sampled instant, including latency in flight', () => {
    const { project, scenario } = fixture();
    project.nodes.find((n) => n.id === 'c')!.data.latency = 1500;
    const c = calculate(project, scenario);
    for (const r of c.results) {
      for (const p of r.points) {
        expect(p.generated).toBe(p.delivered! + p.lost! + p.queue + p.inTransit!);
        expect(p.queue).toBeLessThanOrEqual(r.buffer);
      }
      const end = r.points.at(-1)!;
      expect(end.delivered).toBe(r.delivered);
      expect(end.lost).toBe(r.lost);
      expect(end.queue).toBe(r.remaining);
    }
  });
  it('runs the large station and responds to a buffer change', () => {
    const p = makeProject('Станция', 'station');
    expect(p.nodes).toHaveLength(11);
    const c = calculate(p, p.scenarios[1]);
    expect(c.capacity).toBe(160);
    expect(c.results[0].generated).toBe(78000);
    expect(c.results.find((r) => r.buffer === 4000)!.lost).toBeGreaterThan(3000);
    expect(c.results.find((r) => r.buffer === 8000)!.lost).toBe(0);
    c.results.forEach(balance);
  });
});
