import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Clock3,
  FilePlus2,
  GitBranch,
  Play,
  ShieldCheck,
} from 'lucide-react';
import { useProject, useStore } from '../data/store';
import { date, demoResults, fmt, type DemoPreset } from '../data/model';
import { Badge, Button, Empty, Heading } from '../components/ui';
import { ResultChart } from '../components/ResultChart';
import s from '../styles/App.module.scss';

export function Metrics({ preset }: { preset: DemoPreset }) {
  const result = demoResults[preset];
  return (
    <div className={s.tableWrap}>
      <table className={s.metrics}>
        <thead>
          <tr>
            <th>Показатель</th>
            <th>Без резерва</th>
            <th>С резервом</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Пиковая очередь, сообщений</td>
            <td>{fmt(result.peak[0])}</td>
            <td>{fmt(result.peak[1])}</td>
          </tr>
          <tr>
            <td>Потерянные сообщения</td>
            <td>{fmt(result.lost[0])}</td>
            <td>{fmt(result.lost[1])}</td>
          </tr>
          <tr>
            <td>Очистка очереди после события</td>
            <td>{result.recovery[0]} с</td>
            <td>{result.recovery[1]} с</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
export default function Results() {
  const p = useProject();
  const runs = useStore((s) => s.runs);
  const createReport = useStore((s) => s.createReport);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const completionNotice = useStore((s) => s.profile.completionNotice);
  const [notice, setNotice] = useState(Boolean(location.state?.justRan) && completionNotice);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(false), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const projectRuns = runs.filter((r) => r.projectId === p.id);
  const run = projectRuns.find((r) => r.id === params.get('run')) ?? projectRuns[0];
  if (!run)
    return (
      <>
        <Heading
          title="Результаты экспериментов"
          description="Сравните поведение сети с резервным маршрутом и без него."
        />
        <div className={s.panel}>
          <Empty
            title="Начните с первого сценария"
            action={
              <Button variant="primary" onClick={() => navigate('/scenarios')}>
                <Play size={17} />
                Перейти к сценариям
              </Button>
            }
          >
            После запуска здесь появятся графики и ключевые показатели сценария.
          </Empty>
        </div>
      </>
    );
  const result = demoResults[run.preset];
  return (
    <>
      {notice && (
        <div className={s.toast} role="status">
          <ShieldCheck size={20} />
          Результат сценария готов
          <Button variant="ghost" onClick={() => setNotice(false)}>
            Закрыть
          </Button>
        </div>
      )}
      <Heading
        title={
          run.preset === 'outage'
            ? 'Что произойдёт при обрыве связи?'
            : run.preset === 'load'
              ? 'Справится ли сеть с пиковой нагрузкой?'
              : 'Сеть в штатном режиме'
        }
        description={`Сравнение вариантов · ${run.projectName}`}
        action={
          <Button
            onClick={() => {
              const id = createReport(run.id);
              navigate(`/reports?report=${id}`);
            }}
          >
            <FilePlus2 size={18} />
            Создать отчёт
          </Button>
        }
      />
      <div className={s.resultControls}>
        <div className={s.inline}>
          <Badge>Завершён</Badge>
          <span className={s.muted}>{date(run.createdAt)}</span>
        </div>
        <select
          aria-label="Выбрать запуск"
          value={run.id}
          onChange={(e) => setParams({ run: e.target.value })}
        >
          {projectRuns.map((r) => (
            <option key={r.id} value={r.id}>
              {r.scenario.name} · {date(r.createdAt)}
            </option>
          ))}
        </select>
      </div>
      <div className={s.successBanner}>
        <ShieldCheck size={31} />
        <div>
          <strong>{result.conclusion}</strong>
          <p>Сравните очередь, потери сообщений и время восстановления.</p>
        </div>
      </div>
      <div className={s.resultsGrid}>
        <section className={`${s.panel} ${s.chartPanel}`}>
          <div className={s.sectionHeading}>
            <h2>Сообщения в очереди</h2>
            <div className={s.legend}>
              <span>
                <i className={s.orangeDot} />
                Без резерва
              </span>
              <span>
                <i />С резервом
              </span>
            </div>
          </div>
          <ResultChart preset={run.preset} />
        </section>
        <aside className={`${s.panel} ${s.insights}`}>
          <h2>Что изменилось</h2>
          {[
            {
              icon: BarChart3,
              title: 'Пиковая очередь',
              text: `${fmt(result.peak[0])} → ${fmt(result.peak[1])} сообщений в очереди.`,
            },
            {
              icon: Clock3,
              title: 'Время восстановления',
              text: `${result.recovery[0]} → ${result.recovery[1]} с на очистку очереди после события.`,
            },
            {
              icon: GitBranch,
              title: 'Дополнительный маршрут',
              text: 'Сравнение показывает, как резерв может принимать сообщения во время сбоя.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <div className={s.insight} key={title}>
              <span>
                <Icon size={23} />
              </span>
              <div>
                <h3>{title}</h3>
                <p>{text}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
      <div className={`${s.panel} ${s.metricsPanel}`}>
        <Metrics preset={run.preset} />
      </div>
      <details className={s.comparisonDetails}>
        <summary>Параметры сравнения</summary>
        <p>
          Набор показателей: {result.label} · 10 минут. Настройки запуска:{' '}
          {run.scenario.duration / 60} мин, событий — {run.scenario.events.length}. Сравнение
          использует фиксированный набор показателей; изменения схемы не пересчитывают эти значения.
        </p>
      </details>
      <div className={`${s.panel} ${s.nextStep}`}>
        <div>
          <h3>Следующий эксперимент</h3>
          <p>Исследуйте другой тип события или измените схему.</p>
        </div>
        <div className={s.inline}>
          <Button onClick={() => navigate('/editor')}>
            <ArrowLeft size={16} />
            Вернуться к схеме
          </Button>
          <Button variant="primary" onClick={() => navigate('/scenarios')}>
            Изменить сценарий
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </>
  );
}
