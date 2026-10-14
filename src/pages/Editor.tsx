import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type NodeProps,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from '@xyflow/react';
import { ArrowRight, Clock3, Play, Plus, Trash2 } from 'lucide-react';
import { useProject, useStore } from '../data/store';
import {
  date,
  fmt,
  isSensor,
  kindLabels,
  makeDevice,
  messageRate,
  sensorCount,
  uid,
  type DeviceKind,
  type DeviceNode,
} from '../data/model';
import {
  Badge,
  Button,
  DeviceIcon,
  Empty,
  Field,
  Heading,
  Notice,
  Timeline,
  Toggle,
} from '../components/ui';
import { useScenarioPlayback } from '../components/ScenarioPlayback';
import s from '../styles/App.module.scss';

function Device({ data, selected }: NodeProps<DeviceNode>) {
  return (
    <div
      className={`${s.flowNode} ${selected ? s.selectedNode : ''} ${data.reserve ? s.reserveNode : ''}`}
    >
      <Handle type="target" position={Position.Left} />
      <DeviceIcon kind={data.kind} size={30} />
      <div>
        <strong>{data.label}</strong>
        <small>
          {isSensor(data.kind)
            ? `${fmt(data.count)} датчиков · ${fmt(data.count / data.interval)} сообщ./с`
            : data.reserve
              ? 'Резерв · ожидает'
              : data.kind === 'channel'
                ? `${data.latency} мс · канал связи`
                : `${data.capacity} сообщений/с`}
        </small>
      </div>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { device: Device };

export default function Editor() {
  const p = useProject();
  const update = useStore((s) => s.updateProject);
  const { start, playback } = useScenarioPlayback();
  const runs = useStore((s) => s.runs);
  const navigate = useNavigate();
  const [tab, setTab] = useState('scheme');
  const [selectedId, setSelectedId] = useState('g');
  const [error, setError] = useState('');
  const selected = p.nodes.find((n) => n.id === selectedId);
  const scenario = p.scenarios.find((s) => s.id === p.selectedScenarioId) ?? p.scenarios[0];
  const patchNode = (id: string, data: Partial<DeviceNode['data']>) =>
    update(p.id, {
      nodes: p.nodes.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...data } } : n)),
    });
  const remove = (id: string) =>
    update(p.id, {
      nodes: p.nodes.filter((n) => n.id !== id),
      edges: p.edges.filter((e) => e.source !== id && e.target !== id),
    });
  const add = (kind: DeviceKind) => {
    const id = uid();
    update(p.id, {
      nodes: [
        ...p.nodes,
        makeDevice(
          kind,
          id,
          80 + (p.nodes.length % 4) * 230,
          80 + Math.floor(p.nodes.length / 4) * 150,
        ),
      ],
    });
    setSelectedId(id);
  };
  const run = () => {
    try {
      setError('');
      start(p, scenario);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const onNodesChange = (changes: NodeChange<DeviceNode>[]) => {
    const nodes = applyNodeChanges(changes, p.nodes);
    update(p.id, {
      nodes,
      edges: p.edges.filter(
        (e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target),
      ),
    });
  };
  const onEdgesChange = (changes: EdgeChange[]) =>
    update(p.id, { edges: applyEdgeChanges(changes, p.edges) });
  const connect = (connection: Connection) => {
    if (connection.source === connection.target) return;
    update(p.id, {
      edges: addEdge({ ...connection, style: { stroke: '#16878a', strokeWidth: 2 } }, p.edges),
    });
  };
  return (
    <>
      {playback}
      <Heading
        title={
          tab === 'parameters'
            ? 'Параметры модели'
            : tab === 'history'
              ? 'История запусков'
              : 'Соберите сеть. Проверьте её запас.'
        }
        description={
          tab === 'parameters'
            ? 'Настройте источники телеметрии и устройства вашей сети.'
            : 'Добавьте устройства, задайте нагрузку и выберите сценарий.'
        }
        action={
          <Button variant="primary" onClick={run}>
            <Play size={17} />
            Запустить сценарий
          </Button>
        }
      />
      <div className={s.tabs}>
        {[
          ['scheme', 'Схема сети'],
          ['parameters', 'Параметры'],
          ['history', 'История'],
        ].map(([id, label]) => (
          <button key={id} className={tab === id ? s.activeTab : ''} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {error && <Notice warm>{error}</Notice>}
      {tab === 'scheme' && (
        <div className={s.editorGrid}>
          <div className={s.canvas}>
            <div className={s.canvasToolbar}>
              <select
                aria-label="Добавить устройство"
                value=""
                onChange={(e) => add(e.target.value as DeviceKind)}
              >
                <option value="" disabled>
                  ＋ Добавить устройство
                </option>
                {Object.entries(kindLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <Badge>{p.nodes.length} устройств</Badge>
            </div>
            <ReactFlow
              key={p.id}
              nodes={p.nodes}
              edges={p.edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={connect}
              onNodeClick={(_, node) => setSelectedId(node.id)}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              minZoom={0.3}
              maxZoom={2}
              deleteKeyCode={['Backspace', 'Delete']}
            >
              <Background gap={18} size={1} color="#cbd7d2" />
              <Controls showInteractive={false} />
              <MiniMap nodeColor="#a0ceca" maskColor="#f7f7f180" />
            </ReactFlow>
            <div className={s.canvasHint}>
              Перетащите узел · Соедините точки по краям · Delete — удалить
            </div>
          </div>
          <aside className={`${s.panel} ${s.nodeProperties}`}>
            {selected ? (
              <>
                <div className={s.inline}>
                  <DeviceIcon kind={selected.data.kind} />
                  <div>
                    <h2>{selected.data.label}</h2>
                    <p>Параметры узла</p>
                  </div>
                </div>
                <Field label="Название">
                  <input
                    value={selected.data.label}
                    maxLength={45}
                    onChange={(e) => patchNode(selected.id, { label: e.target.value })}
                  />
                </Field>
                {isSensor(selected.data.kind) ? (
                  <>
                    <Numeric
                      label="Количество датчиков"
                      value={selected.data.count}
                      min={1}
                      onChange={(count) => patchNode(selected.id, { count })}
                    />
                    <Numeric
                      label="Интервал отправки, с"
                      value={selected.data.interval}
                      min={1}
                      onChange={(interval) => patchNode(selected.id, { interval })}
                    />
                  </>
                ) : selected.data.kind === 'channel' ? (
                  <Numeric
                    label="Задержка канала, мс"
                    value={selected.data.latency}
                    min={0}
                    onChange={(latency) => patchNode(selected.id, { latency })}
                  />
                ) : (
                  <>
                    <Numeric
                      label="Пропускная способность, сообщ./с"
                      value={selected.data.capacity}
                      min={1}
                      onChange={(capacity) => patchNode(selected.id, { capacity })}
                    />
                    <Numeric
                      label="Размер буфера, сообщений"
                      value={selected.data.buffer}
                      min={0}
                      onChange={(buffer) => patchNode(selected.id, { buffer })}
                    />
                  </>
                )}
                {selected.data.kind === 'gateway' && (
                  <Toggle
                    checked={selected.data.reserve}
                    onChange={(reserve) => patchNode(selected.id, { reserve })}
                    label="Резервный шлюз"
                  />
                )}
                <Notice>
                  Параметры сохраняются автоматически. Выберите сценарий, чтобы проследить ход
                  событий.
                </Notice>
                <Button variant="danger" onClick={() => remove(selected.id)}>
                  <Trash2 size={16} />
                  Удалить устройство
                </Button>
              </>
            ) : (
              <Empty title="Выберите устройство">
                Нажмите на узел, чтобы изменить его параметры.
              </Empty>
            )}
          </aside>
        </div>
      )}
      {tab === 'parameters' && (
        <div className={s.panel}>
          <div className={s.sectionHeading}>
            <h2>Источники телеметрии</h2>
            <Badge>Автосохранение</Badge>
          </div>
          <div className={s.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Группа</th>
                  <th>Датчиков</th>
                  <th>Интервал, с</th>
                  <th>Сообщений/с</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {p.nodes
                  .filter((n) => isSensor(n.data.kind))
                  .map((n) => (
                    <tr key={n.id}>
                      <td>
                        <span className={s.inline}>
                          <DeviceIcon kind={n.data.kind} />
                          {n.data.label}
                        </span>
                      </td>
                      <td>
                        <input
                          aria-label={`Количество: ${n.data.label}`}
                          type="number"
                          min="1"
                          value={n.data.count}
                          onChange={(e) =>
                            patchNode(n.id, { count: Math.max(1, Number(e.target.value)) })
                          }
                        />
                      </td>
                      <td>
                        <input
                          aria-label={`Интервал: ${n.data.label}`}
                          type="number"
                          min="1"
                          value={n.data.interval}
                          onChange={(e) =>
                            patchNode(n.id, { interval: Math.max(1, Number(e.target.value)) })
                          }
                        />
                      </td>
                      <td>{fmt(n.data.count / n.data.interval)}</td>
                      <td>
                        <Button
                          aria-label={`Удалить ${n.data.label}`}
                          variant="ghost"
                          onClick={() => remove(n.id)}
                        >
                          <Trash2 size={17} />
                        </Button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <Button onClick={() => add('temperature')}>
            <Plus size={17} />
            Добавить группу
          </Button>
          <div className={s.successBanner}>
            Итого: {fmt(sensorCount(p.nodes))} датчиков · {fmt(messageRate(p.nodes))} сообщений/с
          </div>
          <Notice warm>
            Количество датчиков и интервал отправки определяют входящий поток сообщений.
          </Notice>
        </div>
      )}
      {tab === 'history' && (
        <div className={s.panel}>
          {runs.filter((r) => r.projectId === p.id).length ? (
            runs
              .filter((r) => r.projectId === p.id)
              .map((r) => (
                <button
                  className={s.listRow}
                  key={r.id}
                  onClick={() => navigate(`/results?run=${r.id}`)}
                >
                  <Clock3 />
                  <span>
                    <strong>{r.scenario.name}</strong>
                    <small>{date(r.createdAt)} · Результат сценария</small>
                  </span>
                  <ArrowRight size={18} />
                </button>
              ))
          ) : (
            <Empty
              title="Запусков пока нет"
              action={<Button onClick={run}>Запустить сценарий</Button>}
            >
              Здесь появятся сохранённые снимки сценариев и схем.
            </Empty>
          )}
        </div>
      )}
      {tab !== 'history' && (
        <section className={`${s.panel} ${s.scenarioStrip}`}>
          <div className={s.sectionHeading}>
            <div className={s.inline}>
              <h3>Сценарий</h3>
              <select
                aria-label="Выбрать сценарий"
                value={scenario.id}
                onChange={(e) => update(p.id, { selectedScenarioId: e.target.value })}
              >
                {p.scenarios.map((sc) => (
                  <option value={sc.id} key={sc.id}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>
            <Button variant="ghost" onClick={() => navigate('/scenarios')}>
              Настроить
              <ArrowRight size={16} />
            </Button>
          </div>
          <Timeline scenario={scenario} />
        </section>
      )}
    </>
  );
}
function Numeric({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (n: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={min}
        max={1000000}
        value={value}
        onChange={(e) => onChange(Math.min(1000000, Math.max(min, Number(e.target.value))))}
      />
    </Field>
  );
}
