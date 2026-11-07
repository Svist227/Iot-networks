import type { DeviceNode, Project, Scenario } from './model';

export const ENGINE_VERSION = 'queue-1.1';
const LIMIT = 500_000;
const EPS = 1e-8;
export type QueuePoint = {
  time: number;
  queue: number;
  generated?: number;
  delivered?: number;
  lost?: number;
  inTransit?: number;
};
export type BufferResult = {
  buffer: number;
  generated: number;
  delivered: number;
  lost: number;
  remaining: number;
  inTransit: number;
  peak: number;
  firstOverflow: number | null;
  meanDelay: number | null;
  p95Delay: number | null;
  recovery: number | null;
  points: QueuePoint[];
};
export type Calculation = {
  version: string;
  duration: number;
  sendingMode: 'uniform' | 'synchronized';
  capacity: number;
  latencyMs: number;
  configuredBuffer: number;
  path: string[];
  excludedNodes: string[];
  recoveryFrom: number | null;
  results: BufferResult[];
};
const sensor = (n: DeviceNode) => ['temperature', 'vibration', 'pressure'].includes(n.data.kind);
const fail = (message: string): never => {
  throw new Error(message);
};

/** Supported topology is checked, never inferred from unrelated node totals. */
export function calculationInput(project: Pick<Project, 'nodes' | 'edges'>, scenario: Scenario) {
  if (scenario.reserve)
    fail(
      'Для расчёта буфера выключите резервный маршрут в сценарии. Переключение на резерв пока не рассчитывается.',
    );
  if (!Number.isFinite(scenario.duration) || scenario.duration < 60 || scenario.duration > 3600)
    fail('Расчёт поддерживает длительность от 60 до 3600 секунд.');
  if (scenario.sendingMode && !['uniform', 'synchronized'].includes(scenario.sendingMode))
    fail('Выберите равномерную или одновременную отправку.');
  const { nodes, edges } = project;
  if (nodes.length > 100 || edges.length > 300 || scenario.events.length > 100)
    fail('Для одного расчёта доступны до 100 групп и узлов, 300 связей и 100 событий.');
  if (new Set(nodes.map((n) => n.id)).size !== nodes.length)
    fail('В схеме повторяются идентификаторы узлов.');
  if (
    edges.some(
      (e) => !nodes.some((n) => n.id === e.source) || !nodes.some((n) => n.id === e.target),
    )
  )
    fail('В схеме есть связь с удалённым узлом.');
  const active = nodes.filter((n) => !n.data.reserve);
  const one = (kind: string) => {
    const found = active.filter((n) => n.data.kind === kind);
    if (found.length !== 1)
      fail('Для расчёта нужна одна основная цепочка: датчики → шлюз → канал → сервер.');
    return found[0];
  };
  const gateway = one('gateway'),
    channel = one('channel'),
    server = one('server');
  const sources = active.filter(sensor);
  if (!sources.length || sources.length !== nodes.filter(sensor).length)
    fail('Нужна хотя бы одна группа датчиков; источники нельзя помечать резервными.');
  const activeIds = new Set(active.map((n) => n.id));
  const actualEdges = edges.filter((e) => activeIds.has(e.source) && activeIds.has(e.target));
  const required = [
    ...sources.map((n) => [n.id, gateway.id]),
    [gateway.id, channel.id],
    [channel.id, server.id],
  ];
  if (
    actualEdges.length !== required.length ||
    required.some(
      ([a, b]) => actualEdges.filter((e) => e.source === a && e.target === b).length !== 1,
    )
  )
    fail(
      'Соедините каждую группу датчиков с основным шлюзом, шлюз с каналом, канал с сервером. Ветвления и дополнительные пути пока не рассчитываются.',
    );
  for (const n of sources) {
    if (
      !Number.isInteger(n.data.count) ||
      n.data.count < 1 ||
      !Number.isFinite(n.data.interval) ||
      n.data.interval <= 0
    )
      fail(`Проверьте количество датчиков и интервал отправки: ${n.data.label}.`);
  }
  for (const n of [gateway, channel, server]) {
    if (!Number.isFinite(n.data.capacity) || n.data.capacity <= 0 || n.data.capacity > 1_000_000)
      fail(
        `Пропускная способность должна быть от 0 до 1 000 000 сообщений/с (не включая 0): ${n.data.label}.`,
      );
  }
  if (
    !Number.isFinite(channel.data.latency) ||
    channel.data.latency < 0 ||
    channel.data.latency > 3_600_000
  )
    fail('Задержка канала должна быть от 0 до 3 600 000 мс.');
  const alternatives = scenario.comparisonBuffers ?? [4000, 6000, 12000];
  if (!Array.isArray(alternatives) || alternatives.length > 3)
    fail('Укажите не больше трёх дополнительных размеров буфера.');
  const buffers = [...new Set([gateway.data.buffer, ...alternatives])].sort((a, b) => a - b);
  if (buffers.some((b) => !Number.isInteger(b) || b < 0 || b > 1_000_000))
    fail('Размеры буфера — целые числа от 0 до 1 000 000 сообщений.');
  for (const e of scenario.events) {
    if (
      !Number.isFinite(e.start) ||
      !Number.isFinite(e.duration) ||
      e.start < 0 ||
      e.duration <= 0 ||
      e.start + e.duration > scenario.duration
    )
      fail('Событие должно полностью помещаться в длительность сценария.');
    if (e.kind === 'load') {
      if (e.target !== gateway.id && !sources.some((n) => n.id === e.target))
        fail('Рост нагрузки задаётся на группе датчиков или основном шлюзе (для всех групп).');
      if (!Number.isInteger(e.multiplier) || e.multiplier < 1 || e.multiplier > 100)
        fail('Множитель нагрузки — целое число от 1 до 100.');
    } else if (
      (e.kind !== 'outage' && e.kind !== 'node') ||
      ![channel.id, server.id].includes(e.target)
    ) {
      fail(
        'В этой модели доступен отказ канала или принимающего сервера. Отказ шлюза с потерей памяти требует отдельной модели.',
      );
    }
  }
  return { sources, gateway, channel, server, buffers, active };
}

type Arrival = { time: number; count: number };
/** A load multiplier means more messages per period; phases restart at a load boundary. */
function arrivalsFor(sources: DeviceNode[], gatewayId: string, scenario: Scenario): Arrival[] {
  const arrivals: Arrival[] = [];
  let total = 0;
  for (const n of sources) {
    const loads = scenario.events.filter(
      (e) => e.kind === 'load' && [n.id, gatewayId].includes(e.target),
    );
    const boundaries = [
      ...new Set([0, scenario.duration, ...loads.flatMap((e) => [e.start, e.start + e.duration])]),
    ].sort((a, b) => a - b);
    for (let i = 0; i < boundaries.length - 1; i++) {
      const start = boundaries[i],
        end = boundaries[i + 1];
      const multiplier = loads
        .filter((e) => e.start <= start && start < e.start + e.duration)
        .reduce((m, e) => m * e.multiplier, 1);
      const count = n.data.count * multiplier;
      const synchronized = scenario.sendingMode === 'synchronized';
      const step = synchronized ? n.data.interval : n.data.interval / count;
      const batch = synchronized ? count : 1;
      const offset = synchronized ? 0 : step / 2;
      const number = Math.max(0, Math.ceil((end - start - offset) / step - EPS));
      if (!Number.isFinite(number * batch) || total + number * batch > LIMIT)
        fail(
          'Расчёт ограничен 500 000 сообщениями. Уменьшите длительность, число датчиков или множитель нагрузки.',
        );
      total += number * batch;
      for (let j = 0; j < number; j++)
        arrivals.push({ time: start + offset + j * step, count: batch });
    }
  }
  return arrivals.sort((a, b) => a.time - b.time);
}

function simulate(
  arrivals: Arrival[],
  scenario: Scenario,
  capacity: number,
  latency: number,
  buffer: number,
  recoveryFrom: number | null,
): BufferResult {
  const outages = scenario.events.filter((e) => e.kind !== 'load');
  const boundaries = [...new Set(outages.flatMap((e) => [e.start, e.start + e.duration]))].sort(
    (a, b) => a - b,
  );
  // FIFO holds messages until transmission completes; drop-tail rejects new arrivals.
  const queue: number[] = [];
  let head = 0,
    arrivalIndex = 0,
    boundaryIndex = 0,
    time = 0,
    work = 0;
  let generated = 0,
    delivered = 0,
    lost = 0,
    inTransit = 0,
    peak = 0;
  let firstOverflow: number | null = null,
    recovery: number | null = null;
  const delays: number[] = [],
    points: QueuePoint[] = [];
  const sampleStep = scenario.duration / 300;
  let sampleIndex = 0;
  const deliveryTimes: number[] = [];
  let deliveryHead = 0;
  let blocked = outages.some((e) => e.start === 0);
  while (time < scenario.duration - EPS) {
    const length = queue.length - head;
    const completeAt = length && !blocked ? time + work : Infinity;
    const next = Math.min(
      arrivals[arrivalIndex]?.time ?? Infinity,
      boundaries[boundaryIndex] ?? Infinity,
      completeAt,
      sampleIndex * sampleStep,
      recoveryFrom !== null && time < recoveryFrom ? recoveryFrom : Infinity,
      scenario.duration,
    );
    if (length && !blocked) work -= next - time;
    time = next;
    // Completions at a boundary precede failures and new arrivals. No loss in flight.
    if (length && !blocked && work <= EPS) {
      const created = queue[head++];
      deliveryTimes.push(time + latency);
      if (time + latency <= scenario.duration + EPS) {
        delivered++;
        delays.push(time + latency - created);
      } else inTransit++;
      work = queue.length > head ? 1 / capacity : 0;
    }
    while ((boundaries[boundaryIndex] ?? Infinity) <= time + EPS) boundaryIndex++;
    blocked = outages.some((e) => e.start <= time + EPS && time < e.start + e.duration - EPS);
    if (
      recoveryFrom !== null &&
      time >= recoveryFrom - EPS &&
      queue.length === head &&
      recovery === null
    )
      recovery = Math.max(0, time - recoveryFrom);
    // Batch all simultaneous arrivals before service starts.
    while (
      (arrivals[arrivalIndex]?.time ?? Infinity) <= time + EPS &&
      time < scenario.duration - EPS
    ) {
      const { count } = arrivals[arrivalIndex++];
      generated += count;
      const accepted = Math.min(count, buffer - (queue.length - head));
      if (accepted && queue.length === head) work = 1 / capacity;
      for (let j = 0; j < accepted; j++) queue.push(time);
      if (accepted < count) {
        lost += count - accepted;
        firstOverflow ??= time;
      }
    }
    peak = Math.max(peak, queue.length - head);
    if (time + EPS >= sampleIndex * sampleStep) {
      while (deliveryHead < deliveryTimes.length && deliveryTimes[deliveryHead] <= time + EPS)
        deliveryHead++;
      points.push({
        time,
        queue: queue.length - head,
        generated,
        delivered: deliveryHead,
        lost,
        inTransit: deliveryTimes.length - deliveryHead,
      });
      sampleIndex++;
    }
  }
  delays.sort((a, b) => a - b);
  return {
    buffer,
    generated,
    delivered,
    lost,
    inTransit,
    remaining: queue.length - head,
    peak,
    firstOverflow,
    meanDelay: delays.length ? delays.reduce((a, b) => a + b, 0) / delays.length : null,
    p95Delay: delays.length ? delays[Math.ceil(delays.length * 0.95) - 1] : null,
    recovery,
    points,
  };
}

export function calculate(
  project: Pick<Project, 'nodes' | 'edges'>,
  scenario: Scenario,
): Calculation {
  const { sources, gateway, channel, server, buffers, active } = calculationInput(
    project,
    scenario,
  );
  const arrivals = arrivalsFor(sources, gateway.id, scenario);
  const capacity = Math.min(gateway.data.capacity, channel.data.capacity, server.data.capacity);
  const recoveryFrom = scenario.events.length
    ? Math.max(...scenario.events.map((e) => e.start + e.duration))
    : null;
  return {
    version: ENGINE_VERSION,
    duration: scenario.duration,
    sendingMode: scenario.sendingMode ?? 'uniform',
    capacity,
    latencyMs: channel.data.latency,
    configuredBuffer: gateway.data.buffer,
    path: [gateway.id, channel.id, server.id],
    excludedNodes: project.nodes.filter((n) => !active.includes(n)).map((n) => n.id),
    recoveryFrom,
    results: buffers.map((buffer) =>
      simulate(arrivals, scenario, capacity, channel.data.latency / 1000, buffer, recoveryFrom),
    ),
  };
}

export function calculationConclusion(c: Calculation) {
  if (!c.results[0]?.generated)
    return 'За время сценария сообщения не поступили. Увеличьте длительность или уменьшите интервал отправки.';
  const fitting = c.results.find((r) => r.lost === 0);
  return fitting
    ? `Буфер ${fitting.buffer.toLocaleString('ru-RU')} сообщений — наименьший из проверенных без потерь от переполнения в этом сценарии.`
    : 'Во всех проверенных вариантах буфера есть потери. Увеличьте буфер или пропускную способность и повторите расчёт.';
}
