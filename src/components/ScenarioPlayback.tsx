import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  LoaderCircle,
  Pause,
  Play,
  X,
} from 'lucide-react';
import { validateScenario, type Project, type Run, type Scenario } from '../data/model';
import { calculationInput } from '../data/simulation';
import { clockLabel, playbackFrame, playbackSchedule } from '../data/playback';
import { useStore } from '../data/store';
import { Button, IconButton, Modal, Notice } from './ui';
import { NetworkPreview } from './NetworkPreview';
import s from '../styles/Playback.module.scss';
import { fmt } from '../data/model';

export function useScenarioPlayback() {
  const [run, setRun] = useState<Run | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const worker = useRef<Worker | null>(null);
  useEffect(() => () => worker.current?.terminate(), []);
  const navigate = useNavigate();
  const start = (project: Project, scenario: Scenario) => {
    if (run || worker.current) return;
    const problem = validateScenario(scenario, project.nodes);
    if (problem) throw new Error(problem);
    calculationInput(project, scenario);
    setError('');
    const job = new Worker(new URL('../data/calculation.worker.ts', import.meta.url), {
      type: 'module',
    });
    worker.current = job;
    setPending(true);
    const finish = () => {
      job.terminate();
      worker.current = null;
      setPending(false);
    };
    job.onmessage = ({ data }: MessageEvent<{ run?: Run; error?: string }>) => {
      finish();
      if (data.run) setRun(data.run);
      else setError(data.error ?? 'Не удалось выполнить расчёт.');
    };
    job.onerror = () => {
      finish();
      setError('Не удалось запустить расчёт. Перезагрузите страницу и повторите попытку.');
    };
    job.postMessage({ project, scenario });
  };
  const cancel = () => {
    worker.current?.terminate();
    worker.current = null;
    setPending(false);
  };
  return {
    start,
    playback: (
      <>
        {error && <Notice warm>{error}</Notice>}
        {pending && (
          <Modal title="Рассчитываем варианты буфера" onClose={cancel}>
            <p role="status">Обрабатываем сообщения, очередь и события сценария…</p>
            <Button onClick={cancel}>Отменить расчёт</Button>
          </Modal>
        )}
        {run && (
          <ScenarioPlayback
            key={run.id}
            run={run}
            onComplete={() => useStore.getState().saveRun(run)}
            onClose={() => setRun(null)}
            onOpen={() => {
              setRun(null);
              navigate(`/results?run=${run.id}`, { state: { justRan: true } });
            }}
          />
        )}
      </>
    ),
  };
}

export function ScenarioPlayback({
  run,
  onComplete,
  onClose,
  onOpen,
}: {
  run: Run;
  onComplete: () => void;
  onClose: () => void;
  onOpen: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const committed = useRef(false);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const schedule = useMemo(() => playbackSchedule(run.scenario), [run.scenario]);
  const frame = playbackFrame(run.scenario, schedule, elapsed);
  const done = frame.phase === 'complete';
  const calculated = run.calculation?.results.find(
    (r) => r.buffer === run.calculation?.configuredBuffer,
  );
  const snapshot = calculated?.points.reduce(
    (previous, point) => (point.time <= frame.time ? point : previous),
    calculated.points[0],
  );
  const fill =
    calculated && snapshot
      ? Math.min(100, (snapshot.queue / Math.max(1, calculated.buffer)) * 100)
      : 0;
  const seek = (time: number) => {
    let ms = 0;
    for (const segment of schedule) {
      if (segment.to > segment.from && time >= segment.from && time <= segment.to) {
        ms += ((time - segment.from) / (segment.to - segment.from)) * segment.ms;
        break;
      }
      ms += segment.ms;
    }
    setElapsed(ms);
    setPaused(true);
  };
  const eventStarted = run.scenario.events.some((e) => e.start <= frame.time);
  const eventName = (kind: string) =>
    kind === 'load' ? 'Рост нагрузки' : kind === 'node' ? 'Отказ узла' : 'Обрыв канала';
  const headings = {
    prepare: 'Подготавливаем сеть',
    normal: 'Сеть работает в штатном режиме',
    event: frame.active.map((e) => eventName(e.kind)).join(' · '),
    recovery: 'Событие завершилось',
    finalize: 'Собираем результаты',
    complete: 'Сценарий завершён',
  };
  const descriptions = {
    prepare: 'Загружаем схему и отмечаем события на временной шкале.',
    normal: 'Проследите путь сообщений от датчиков к серверу.',
    event: frame.active
      .map(
        (e) =>
          `${run.nodes.find((n) => n.id === e.target)?.data.label ?? 'Узел'}: ${e.kind === 'load' ? `нагрузка ×${e.multiplier}` : 'временно недоступен'}.`,
      )
      .join(' '),
    recovery: 'Наблюдаем работу сети после окончания события.',
    finalize: 'Сохраняем снимок схемы и параметры этого запуска.',
    complete: 'Теперь можно сравнить показатели и создать отчёт.',
  };

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const current = dialog.current;
    current?.showModal();
    return () => {
      current?.close();
      previous?.focus();
    };
  }, []);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) setPaused(true);
    };
    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, []);

  useEffect(() => {
    if (paused || done) return;
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const delta = Math.min(now - last, 150);
      last = now;
      setElapsed((value) => Math.min(frame.total, value + delta * speed));
    }, 50);
    return () => window.clearInterval(timer);
  }, [paused, done, speed, frame.total]);

  useEffect(() => {
    if (done && !committed.current) {
      committed.current = true;
      onComplete();
    }
  }, [done, onComplete]);

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="playback-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <div className={s.header}>
        <div>
          <span className={s.eyebrow}>ВОСПРОИЗВЕДЕНИЕ СЦЕНАРИЯ</span>
          <h2 id="playback-title">{run.scenario.name}</h2>
          <p>{run.projectName}</p>
        </div>
        <IconButton label={done ? 'Закрыть воспроизведение' : 'Отменить запуск'} onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      <div className={s.steps} aria-label="Этапы запуска">
        {['Подготовка', 'Работа сети', 'События', 'Результаты'].map((label, index) => {
          const current =
            frame.phase === 'prepare'
              ? 0
              : frame.phase === 'normal'
                ? 1
                : frame.phase === 'finalize' || done
                  ? 3
                  : 2;
          return (
            <div
              key={label}
              className={index === current ? s.currentStep : index < current ? s.passedStep : ''}
            >
              <span>{index < current || done ? <Check size={13} /> : index + 1}</span>
              {label}
            </div>
          );
        })}
      </div>
      <div className={s.scene}>
        <NetworkPreview
          project={run}
          playback={{
            activeIds: frame.active.filter((e) => e.kind !== 'load').map((e) => e.target),
            loadIds: frame.active.filter((e) => e.kind === 'load').map((e) => e.target),
            running: !paused && !done && frame.phase !== 'prepare' && frame.phase !== 'finalize',
            reserve: run.scenario.reserve,
            hasEvent: frame.active.length > 0,
            queue: snapshot?.queue,
            buffer: calculated?.buffer,
          }}
        />
        <div className={s.sceneCaption}>
          <span>
            <Activity size={14} />
            {paused && !done ? 'На паузе' : done ? 'Завершено' : 'Воспроизведение'}
          </span>
          <span>Резерв {run.scenario.reserve ? 'включён' : 'выключен'}</span>
        </div>
      </div>
      {snapshot && calculated && (
        <section className={s.telemetry} aria-label="Рассчитанное состояние сети">
          <div>
            <small>Очередь шлюза</small>
            <strong>
              {fmt(snapshot.queue)} <em>/ {fmt(calculated.buffer)}</em>
            </strong>
            <div className={s.queueGauge}>
              <i style={{ width: `${fill}%` }} />
            </div>
          </div>
          <div>
            <small>Доставлено</small>
            <strong>{snapshot.delivered === undefined ? '—' : fmt(snapshot.delivered)}</strong>
          </div>
          <div>
            <small>Потеряно</small>
            <strong>{snapshot.lost === undefined ? '—' : fmt(snapshot.lost)}</strong>
          </div>
          <div>
            <small>Срез расчёта</small>
            <strong>{clockLabel(snapshot.time)}</strong>
          </div>
          <svg viewBox="0 0 1000 100" role="img" aria-label="Очередь во времени">
            <path
              d={calculated.points
                .filter((p) => p.time <= frame.time)
                .map(
                  (p, i) =>
                    `${i ? 'L' : 'M'}${(p.time / run.scenario.duration) * 1000},${94 - (p.queue / Math.max(1, calculated.peak)) * 85}`,
                )
                .join(' ')}
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <line
              x1={(frame.time / run.scenario.duration) * 1000}
              x2={(frame.time / run.scenario.duration) * 1000}
              y1="0"
              y2="100"
              stroke="currentColor"
              strokeDasharray="4 4"
            />
          </svg>
        </section>
      )}
      <label className={s.scrubber}>
        Время сценария · переместите ползунок для исследования
        <input
          type="range"
          min="0"
          max={run.scenario.duration}
          step={run.scenario.duration / 300}
          value={frame.time}
          onChange={(e) => seek(Number(e.target.value))}
          aria-label="Время воспроизведения"
        />
      </label>
      <div className={s.status} role="status" aria-live="polite">
        <span className={`${s.statusIcon} ${done ? s.completeIcon : ''}`}>
          {done ? <CheckCircle2 /> : paused ? <Pause /> : <LoaderCircle className={s.spin} />}
        </span>
        <div>
          <h3>{paused && !done ? 'Воспроизведение приостановлено' : headings[frame.phase]}</h3>
          <p>
            {paused && !done
              ? 'Нажмите «Продолжить», чтобы наблюдать следующий этап.'
              : descriptions[frame.phase]}
          </p>
        </div>
      </div>
      <div className={s.progressLabel}>
        <span>
          <Clock3 size={15} />
          <strong>{clockLabel(frame.time)}</strong> / {clockLabel(run.scenario.duration)}
        </span>
        <span>{Math.floor(frame.progress)}%</span>
      </div>
      <div
        className={s.progress}
        role="progressbar"
        aria-label="Ход сценария"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.floor(frame.progress)}
      >
        <span style={{ width: `${frame.progress}%` }} />
      </div>
      <div className={s.events}>
        {run.scenario.events.length ? (
          [...run.scenario.events]
            .sort((a, b) => a.start - b.start)
            .map((event) => {
              const active = frame.active.some((e) => e.id === event.id);
              const ended = eventStarted && frame.time >= event.start + event.duration;
              return (
                <div key={event.id} className={active ? s.activeEvent : ''}>
                  {ended ? (
                    <CheckCircle2 size={16} />
                  ) : active ? (
                    <Activity size={16} />
                  ) : (
                    <Circle size={14} />
                  )}
                  <span>
                    {eventName(event.kind)}{' '}
                    <small>{run.nodes.find((n) => n.id === event.target)?.data.label}</small>
                  </span>
                  <time>
                    {clockLabel(event.start)}–{clockLabel(event.start + event.duration)}
                  </time>
                  <b>{ended ? 'Завершено' : active ? 'Сейчас' : 'Ожидает'}</b>
                </div>
              );
            })
        ) : (
          <p>Штатный режим · события отказа не заданы</p>
        )}
      </div>
      <div className={s.footer}>
        <span>Время сценария показано в ускоренном режиме.</span>
        <div>
          {done ? (
            <Button variant="primary" onClick={onOpen}>
              Открыть результаты
              <ArrowRight size={17} />
            </Button>
          ) : (
            <>
              <Button variant="ghost" onClick={onClose}>
                Отменить
              </Button>
              <Button
                aria-label={
                  speed === 1 ? 'Ускорить воспроизведение' : 'Обычная скорость воспроизведения'
                }
                onClick={() => setSpeed((value) => (value === 1 ? 2 : value === 2 ? 4 : 1))}
              >
                {speed}×
              </Button>
              <Button variant="primary" onClick={() => setPaused((value) => !value)}>
                {paused ? <Play size={16} /> : <Pause size={16} />}
                {paused ? 'Продолжить' : 'Пауза'}
              </Button>
            </>
          )}
        </div>
      </div>
    </dialog>
  );
}
