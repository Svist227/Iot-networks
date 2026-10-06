import type { Edge, Node } from '@xyflow/react';

export type DeviceKind =
  'temperature' | 'vibration' | 'pressure' | 'gateway' | 'channel' | 'server';
export type DeviceData = {
  label: string;
  kind: DeviceKind;
  count: number;
  interval: number;
  capacity: number;
  buffer: number;
  latency: number;
  reserve: boolean;
  [key: string]: unknown;
};
export type DeviceNode = Node<DeviceData, 'device'>;
export type EventKind = 'outage' | 'load' | 'node';
export type ScenarioEvent = {
  id: string;
  kind: EventKind;
  target: string;
  start: number;
  duration: number;
  multiplier: number;
};
export type Scenario = {
  id: string;
  name: string;
  duration: number;
  reserve: boolean;
  events: ScenarioEvent[];
};
export type Project = {
  id: string;
  name: string;
  description: string;
  favorite: boolean;
  archived: boolean;
  updatedAt: string;
  nodes: DeviceNode[];
  edges: Edge[];
  scenarios: Scenario[];
  selectedScenarioId: string;
};
export type DemoPreset = 'normal' | 'outage' | 'load';
export type Run = {
  id: string;
  projectId: string;
  projectName: string;
  scenario: Scenario;
  createdAt: string;
  preset: DemoPreset;
  sensors: number;
  nodeCount: number;
  messageRate: number;
  nodes: DeviceNode[];
  edges: Edge[];
};
export type Report = { id: string; runId: string; name: string; createdAt: string };
export type Profile = {
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  bio: string;
  completionNotice: boolean;
};
export const kindLabels: Record<DeviceKind, string> = {
  temperature: 'Температура',
  vibration: 'Вибрация',
  pressure: 'Давление',
  gateway: 'Шлюз',
  channel: 'Канал связи',
  server: 'Сервер',
};
export const isSensor = (kind: DeviceKind) =>
  ['temperature', 'vibration', 'pressure'].includes(kind);
export const sensorCount = (nodes: DeviceNode[]) =>
  nodes.filter((n) => isSensor(n.data.kind)).reduce((sum, n) => sum + n.data.count, 0);
export const messageRate = (nodes: DeviceNode[]) =>
  nodes
    .filter((n) => isSensor(n.data.kind))
    .reduce((sum, n) => sum + n.data.count / n.data.interval, 0);
export const uid = () => crypto.randomUUID();
export const fmt = (n: number) =>
  new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(n);
export const date = (value: string) =>
  new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));

export function makeDevice(
  kind: DeviceKind,
  id: string,
  x: number,
  y: number,
  label = kindLabels[kind],
): DeviceNode {
  return {
    id,
    type: 'device',
    position: { x, y },
    data: {
      kind,
      label,
      count: 100,
      interval: 10,
      capacity: 150,
      buffer: 6000,
      latency: 10,
      reserve: false,
    },
  };
}
export function makeProject(name: string, template = 'reserve'): Project {
  const nodes = [
    makeDevice('temperature', 't', 30, 45),
    makeDevice('vibration', 'v', 30, 175),
    makeDevice('pressure', 'p', 30, 305),
    makeDevice('gateway', 'g', 340, 175, 'Шлюз A'),
    makeDevice('channel', 'c', 620, 175),
    makeDevice('server', 's', 880, 175),
  ];
  nodes[0].data.count = 400;
  nodes[1].data.count = 350;
  nodes[2].data.count = 250;
  const links = [
    ['t', 'g'],
    ['v', 'g'],
    ['p', 'g'],
    ['g', 'c'],
    ['c', 's'],
  ];
  if (template !== 'single') {
    const reserve = makeDevice('gateway', 'r', 450, 370, 'Шлюз B');
    reserve.data.reserve = true;
    nodes.push(reserve);
    links.push(['t', 'r'], ['r', 's']);
  }
  if (template === 'segments') {
    nodes.push(makeDevice('temperature', 't2', 30, 500, 'Участок № 2'));
    links.push(['t2', 'r']);
  }
  const edges: Edge[] = links.map(([source, target]) => ({
    id: `${source}-${target}`,
    source,
    target,
    type: 'default',
    style: {
      stroke: source === 'r' || target === 'r' ? '#8ba9ac' : '#18898b',
      strokeWidth: 2,
      strokeDasharray: source === 'r' || target === 'r' ? '6 5' : undefined,
    },
  }));
  const scenarios: Scenario[] = [
    { id: uid(), name: 'Штатный режим', duration: 600, reserve: true, events: [] },
    {
      id: uid(),
      name: 'Обрыв канала',
      duration: 600,
      reserve: true,
      events: [{ id: uid(), kind: 'outage', target: 'c', start: 240, duration: 60, multiplier: 2 }],
    },
    {
      id: uid(),
      name: 'Пиковая нагрузка',
      duration: 600,
      reserve: true,
      events: [{ id: uid(), kind: 'load', target: 'g', start: 180, duration: 120, multiplier: 2 }],
    },
  ];
  return {
    id: uid(),
    name,
    description: 'Сеть телеметрии',
    favorite: false,
    archived: false,
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
    scenarios,
    selectedScenarioId: scenarios[1].id,
  };
}
export function initialProjects() {
  const main = makeProject('Цех № 2');
  main.favorite = true;
  const bench = makeProject('Испытательный стенд', 'single');
  bench.nodes
    .filter((n) => isSensor(n.data.kind))
    .forEach((n) => {
      n.data.count = 8;
    });
  bench.description = 'Лаборатория · один шлюз';
  const draft = makeProject('Новая конфигурация', 'segments');
  draft.description = 'Распределённая сеть';
  return [main, bench, draft];
}

// Curated presentation fixtures. These are deliberately independent of topology and numeric inputs.
export const demoResults = {
  normal: {
    label: 'Штатный режим',
    peak: [40, 40],
    lost: [0, 0],
    recovery: [0, 0],
    conclusion: 'В штатном режиме оба варианта справляются с нагрузкой.',
    points: [
      [0, 0, 0],
      [1, 20, 20],
      [2, 40, 40],
      [3, 15, 15],
      [4, 25, 25],
      [5, 0, 0],
      [6, 20, 20],
      [8, 10, 10],
      [10, 0, 0],
    ],
  },
  outage: {
    label: 'Обрыв канала · 60 с',
    peak: [6000, 100],
    lost: [0, 0],
    recovery: [120, 2],
    conclusion: 'Резервный канал помогает сохранить данные.',
    points: [
      [0, 0, 0],
      [2, 0, 0],
      [3.9, 0, 0],
      [4, 0, 0],
      [4.05, 300, 100],
      [4.2, 1200, 0],
      [5, 6000, 0],
      [6, 2500, 0],
      [7, 0, 0],
      [8, 0, 0],
      [10, 0, 0],
    ],
  },
  load: {
    label: 'Пиковая нагрузка · ×2',
    peak: [4800, 800],
    lost: [600, 0],
    recovery: [96, 16],
    conclusion: 'Резерв распределяет пиковую нагрузку между маршрутами.',
    points: [
      [0, 0, 0],
      [2, 0, 0],
      [3, 0, 0],
      [4, 2400, 400],
      [5, 4800, 800],
      [5.27, 3900, 0],
      [6, 1800, 0],
      [6.6, 0, 0],
      [8, 0, 0],
      [10, 0, 0],
    ],
  },
};
export function validateScenario(scenario: Scenario, nodes: DeviceNode[]): string | null {
  if (!scenario.name.trim()) return 'Укажите название сценария.';
  if (!Number.isFinite(scenario.duration) || scenario.duration < 60)
    return 'Длительность сценария — не менее 60 секунд.';
  for (const event of scenario.events) {
    if (!nodes.some((n) => n.id === event.target))
      return 'Выберите существующий объект для каждого события.';
    if (
      !Number.isFinite(event.start) ||
      !Number.isFinite(event.duration) ||
      event.start < 0 ||
      event.duration <= 0 ||
      event.start + event.duration > scenario.duration
    )
      return 'Событие должно полностью помещаться в длительность сценария.';
    if (event.kind === 'load' && (!Number.isFinite(event.multiplier) || event.multiplier < 1))
      return 'Множитель нагрузки должен быть не меньше 1.';
  }
  return null;
}
export function makeRun(project: Project, scenario: Scenario): Run {
  const error = validateScenario(scenario, project.nodes);
  if (error) throw new Error(error);
  return {
    id: uid(),
    projectId: project.id,
    projectName: project.name,
    scenario: structuredClone(scenario),
    createdAt: new Date().toISOString(),
    preset: scenario.events.some((e) => e.kind !== 'load')
      ? 'outage'
      : scenario.events.length
        ? 'load'
        : 'normal',
    sensors: sensorCount(project.nodes),
    messageRate: messageRate(project.nodes),
    nodeCount: project.nodes.length,
    nodes: structuredClone(project.nodes),
    edges: structuredClone(project.edges),
  };
}
