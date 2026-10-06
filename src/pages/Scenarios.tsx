import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  ChevronRight,
  Link2Off,
  Play,
  Plus,
  Save,
  Settings2,
  Trash2,
} from 'lucide-react';
import { useProject, useStore } from '../data/store';
import { uid, validateScenario, type Scenario, type ScenarioEvent } from '../data/model';
import {
  Badge,
  Button,
  Field,
  Heading,
  IconButton,
  Notice,
  Timeline,
  Toggle,
} from '../components/ui';
import s from '../styles/App.module.scss';

export default function Scenarios() {
  const p = useProject();
  const update = useStore((s) => s.updateProject);
  const save = useStore((s) => s.saveScenario);
  const runScenario = useStore((s) => s.runScenario);
  const navigate = useNavigate();
  const selected = p.scenarios.find((s) => s.id === p.selectedScenarioId) ?? p.scenarios[0];
  const [draft, setDraft] = useState<Scenario>(structuredClone(selected));
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const patch = (data: Partial<Scenario>) => {
    setDraft((d) => ({ ...d, ...data }));
    setFeedback('');
    setError('');
  };
  const eventPatch = (id: string, data: Partial<ScenarioEvent>) =>
    patch({ events: draft.events.map((e) => (e.id === id ? { ...e, ...data } : e)) });
  const persistDraft = () => {
    const problem = validateScenario(draft, p.nodes);
    if (problem) {
      setError(problem);
      return false;
    }
    save(p.id, { ...draft, name: draft.name.trim() });
    setError('');
    return true;
  };
  const choose = (next: Scenario) => {
    if (!persistDraft()) return;
    setDraft(structuredClone(next));
    update(p.id, { selectedScenarioId: next.id });
    setFeedback('');
  };
  const create = () => {
    if (!persistDraft()) return;
    const next: Scenario = {
      id: uid(),
      name: `Сценарий ${p.scenarios.length + 1}`,
      duration: 600,
      reserve: true,
      events: [],
    };
    save(p.id, next);
    setDraft(next);
    setFeedback('');
  };
  const addEvent = () => {
    const target = p.nodes.find((n) => n.data.kind === 'channel') ?? p.nodes[0];
    patch({
      events: [
        ...draft.events,
        {
          id: uid(),
          kind: 'outage',
          target: target?.id ?? '',
          start: Math.min(240, draft.duration - 60),
          duration: 60,
          multiplier: 2,
        },
      ],
    });
  };
  return (
    <>
      <Heading
        title="Проверьте сеть в разных условиях"
        description="Настройте нагрузку, отказы и время событий в вашей сети."
        action={
          <Button
            variant="primary"
            onClick={() => {
              if (persistDraft()) {
                const id = runScenario(p.id, draft.id);
                navigate(`/results?run=${id}`, { state: { justRan: true } });
              }
            }}
          >
            <Play size={17} />
            Запустить сценарий
          </Button>
        }
      />
      <div className={s.scenariosLayout}>
        <aside className={`${s.panel} ${s.scenarioList}`}>
          <h2>Сценарии проекта</h2>
          {p.scenarios.map((sc) => {
            const Icon = !sc.events.length
              ? Settings2
              : sc.events.some((e) => e.kind === 'load')
                ? BarChart3
                : Link2Off;
            return (
              <button
                key={sc.id}
                className={`${s.scenarioChoice} ${draft.id === sc.id ? s.selectedChoice : ''}`}
                onClick={() => choose(sc)}
              >
                <Icon size={28} />
                <span>
                  <strong>{sc.name}</strong>
                  <small>
                    {sc.events.length
                      ? `${sc.events.length} событие · ${sc.duration / 60} мин`
                      : 'Без отказов и перегрузок'}
                  </small>
                </span>
                <ChevronRight size={18} />
              </button>
            );
          })}
          <Button onClick={create}>
            <Plus size={18} />
            Новый сценарий
          </Button>
          <div className={s.scenarioTip}>
            Одна сеть — разные условия.
            <br />
            Сравните вариант с резервом и без него.
          </div>
        </aside>
        <section className={`${s.panel} ${s.scenarioDetail}`}>
          <div className={s.sectionHeading}>
            <div className={s.inline}>
              <Link2Off size={27} />
              <h2>{draft.name || 'Новый сценарий'}</h2>
            </div>
            <Badge warm>Демо</Badge>
          </div>
          <Field label="Название сценария">
            <input
              maxLength={80}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </Field>
          {draft.events.map((event, i) => (
            <div className={s.eventCard} key={event.id}>
              <div className={s.sectionHeading}>
                <h3>
                  <span className={s.eventNumber}>{String(i + 1).padStart(2, '0')}</span>Событие{' '}
                  {i + 1}
                </h3>
                <IconButton
                  label={`Удалить событие ${i + 1}`}
                  onClick={() => patch({ events: draft.events.filter((e) => e.id !== event.id) })}
                >
                  <Trash2 size={17} />
                </IconButton>
              </div>
              <div className={s.eventFields}>
                <Field label="Тип события">
                  <select
                    value={event.kind}
                    onChange={(e) =>
                      eventPatch(event.id, { kind: e.target.value as ScenarioEvent['kind'] })
                    }
                  >
                    <option value="outage">Отключение канала</option>
                    <option value="node">Отказ узла</option>
                    <option value="load">Рост нагрузки</option>
                  </select>
                </Field>
                <Field label="Объект">
                  <select
                    value={event.target}
                    onChange={(e) => eventPatch(event.id, { target: e.target.value })}
                  >
                    <option value="" disabled>
                      Выберите объект
                    </option>
                    {p.nodes.map((n) => (
                      <option value={n.id} key={n.id}>
                        {n.data.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Начало, с">
                  <input
                    type="number"
                    min="0"
                    max={draft.duration}
                    value={event.start}
                    onChange={(e) => eventPatch(event.id, { start: Number(e.target.value) })}
                  />
                </Field>
                <Field label="Длительность, с">
                  <input
                    type="number"
                    min="1"
                    max={draft.duration}
                    value={event.duration}
                    onChange={(e) => eventPatch(event.id, { duration: Number(e.target.value) })}
                  />
                </Field>
                {event.kind === 'load' && (
                  <Field label="Множитель нагрузки">
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={event.multiplier}
                      onChange={(e) => eventPatch(event.id, { multiplier: Number(e.target.value) })}
                    />
                  </Field>
                )}
              </div>
            </div>
          ))}
          {!draft.events.length && (
            <Notice>Штатный режим: все устройства работают без дополнительных событий.</Notice>
          )}
          <Button className={s.addEvent} onClick={addEvent} disabled={!p.nodes.length}>
            <Plus size={18} />
            Добавить событие
          </Button>
          <Toggle
            checked={draft.reserve}
            onChange={(reserve) => patch({ reserve })}
            label="Использовать резервный маршрут"
          />
          <div className={s.timelineSection}>
            <h3>
              Временная шкала сценария <span>({draft.duration / 60} минут)</span>
            </h3>
            <Timeline scenario={draft} />
          </div>
          <div className={s.sectionHeading}>
            <Field label="Длительность сценария">
              <select
                value={draft.duration}
                onChange={(e) => patch({ duration: Number(e.target.value) })}
              >
                <option value={300}>5 минут</option>
                <option value={600}>10 минут</option>
                <option value={1800}>30 минут</option>
              </select>
            </Field>
            <Button
              onClick={() => {
                if (persistDraft()) setFeedback('Сценарий сохранён');
              }}
            >
              <Save size={17} />
              Сохранить сценарий
            </Button>
          </div>
          {error && (
            <p className={s.error} role="alert">
              {error}
            </p>
          )}
          {feedback && (
            <p className={s.feedback} role="status">
              {feedback}
            </p>
          )}
          <Notice>
            Запуск сохранит ваши настройки и откроет подготовленный пример для выбранного типа
            события. Это демонстрация интерфейса, а не расчёт схемы.
          </Notice>
        </section>
      </div>
    </>
  );
}
