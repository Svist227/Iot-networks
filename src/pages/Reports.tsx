import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, Network, Plus, Printer, Search } from 'lucide-react';
import { useProject, useStore } from '../data/store';
import { date, demoResults, fmt } from '../data/model';
import { Badge, Button, Empty, Field, Heading, Modal, Notice } from '../components/ui';
import { NetworkPreview } from '../components/NetworkPreview';
import { Metrics } from './Results';
import s from '../styles/App.module.scss';

export default function Reports() {
  const p = useProject();
  const reports = useStore((s) => s.reports);
  const runs = useStore((s) => s.runs);
  const createReport = useStore((s) => s.createReport);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const projectRuns = runs.filter((r) => r.projectId === p.id);
  const [runId, setRunId] = useState(projectRuns[0]?.id ?? '');
  const projectReports = reports.filter((report) =>
    projectRuns.some((run) => run.id === report.runId),
  );
  const filtered = projectReports.filter((r) =>
    r.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const report = projectReports.find((r) => r.id === params.get('report')) ?? projectReports[0];
  const run = runs.find((r) => r.id === report?.runId);
  return (
    <>
      <Heading
        title="Результаты, которыми можно поделиться"
        description="Схема, настройки и выводы в одном документе."
        action={
          <Button
            variant="primary"
            onClick={() => {
              setRunId(projectRuns[0]?.id ?? '');
              setModal(true);
            }}
          >
            <Plus size={18} />
            Создать отчёт
          </Button>
        }
      />
      <div className={s.reportsLayout}>
        <aside className={`${s.panel} ${s.reportList}`}>
          <h2>Отчёты проекта</h2>
          <label className={s.search}>
            <Search size={18} />
            <input
              aria-label="Найти отчёт"
              placeholder="Найти отчёт"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {filtered.map((r) => (
            <button
              key={r.id}
              className={`${s.reportChoice} ${report?.id === r.id ? s.selectedChoice : ''}`}
              onClick={() => setParams({ report: r.id })}
            >
              <FileText size={29} />
              <span>
                <strong>{r.name}</strong>
                <small>{date(r.createdAt)}</small>
                <small>Сравнение вариантов · Демо</small>
              </span>
              <Badge>PDF</Badge>
            </button>
          ))}
          {!filtered.length && <p className={s.muted}>Отчёты не найдены.</p>}
          <div className={s.reportHelp}>
            <h3>Что входит в отчёт</h3>
            <p>Снимок конфигурации сети</p>
            <p>Настройки выбранного сценария</p>
            <p>Демонстрационные показатели</p>
            <p>Допущения и ограничения</p>
          </div>
        </aside>
        <section className={`${s.panel} ${s.reportPreview}`}>
          <div className={s.sectionHeading}>
            <h3>Предпросмотр</h3>
            <Button disabled={!run} onClick={() => window.print()}>
              <Printer size={17} />
              Печать / PDF
            </Button>
          </div>
          {run && report ? (
            <article className={s.reportPaper} id="print-report">
              <div className={s.paperHeader}>
                <span className={s.brand}>
                  <Network size={28} />
                  СетьРезерв
                </span>
                <small>
                  {run.projectName}
                  <br />
                  {date(report.createdAt)} МСК
                </small>
              </div>
              <div className={s.eyebrow}>ОТЧЁТ ОБ ЭКСПЕРИМЕНТЕ</div>
              <h1>{report.name}</h1>
              <p>{run.projectName} · Демонстрационный результат</p>
              <hr />
              <h3>Исходная конфигурация</h3>
              <p>
                {fmt(run.sensors)} датчиков · {fmt(run.messageRate)} сообщений/с · {run.nodeCount}{' '}
                устройств
              </p>
              <NetworkPreview project={run} />
              <h3>Настройки запуска</h3>
              <p>
                Длительность: {run.scenario.duration / 60} мин. Резервный маршрут:{' '}
                {run.scenario.reserve ? 'включён' : 'выключен'}.
              </p>
              {run.scenario.events.length ? (
                <ul>
                  {run.scenario.events.map((e) => (
                    <li key={e.id}>
                      {e.kind === 'load'
                        ? `Нагрузка ×${e.multiplier}`
                        : e.kind === 'node'
                          ? 'Отказ узла'
                          : 'Отключение канала'}{' '}
                      · {run.nodes.find((n) => n.id === e.target)?.data.label ?? 'Объект'} · с{' '}
                      {e.start} по {e.start + e.duration} с
                    </li>
                  ))}
                </ul>
              ) : (
                <p>Штатный режим без событий.</p>
              )}
              <h3>Сравнение: {demoResults[run.preset].label}</h3>
              <Metrics preset={run.preset} />
              <div className={s.paperColumns}>
                <div>
                  <h3>Вывод примера</h3>
                  <p>{demoResults[run.preset].conclusion}</p>
                </div>
                <div>
                  <h3>Допущения</h3>
                  <p>Готовый набор данных, 10 минут. Оба варианта приведены для сравнения.</p>
                </div>
              </div>
              <Notice warm>
                Демонстрация интерфейса. Показатели подготовлены заранее и не рассчитаны по
                конфигурации выше. Не является инженерным заключением.
              </Notice>
              <div className={s.paperFooter}>
                СетьРезерв · Демо-пространство<span>01</span>
              </div>
            </article>
          ) : (
            <Empty
              title="Ваш первый отчёт"
              action={<Button onClick={() => navigate('/scenarios')}>Перейти к сценариям</Button>}
            >
              Запустите сценарий и сохраните результат в отчёт.
            </Empty>
          )}
        </section>
      </div>
      {modal && (
        <Modal title="Создать отчёт" onClose={() => setModal(false)}>
          {projectRuns.length ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const id = createReport(runId);
                setParams({ report: id });
                setModal(false);
              }}
            >
              <Field label="Сохранённый запуск">
                <select value={runId} onChange={(e) => setRunId(e.target.value)}>
                  {projectRuns.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.scenario.name} · {date(r.createdAt)}
                    </option>
                  ))}
                </select>
              </Field>
              <Notice>Отчёт использует схему и настройки на момент запуска.</Notice>
              <div className={s.modalFooter}>
                <Button type="button" onClick={() => setModal(false)}>
                  Отмена
                </Button>
                <Button variant="primary">Создать отчёт</Button>
              </div>
            </form>
          ) : (
            <Empty
              title="Сначала запустите сценарий"
              action={
                <Button variant="primary" onClick={() => navigate('/scenarios')}>
                  К сценариям
                </Button>
              }
            >
              Для отчёта нужен сохранённый результат.
            </Empty>
          )}
        </Modal>
      )}
    </>
  );
}
