import { useState } from 'react';
import { ResultAssistant } from './ResultAssistant';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { fmt, type Run } from '../data/model';
import { calculationConclusion, type BufferResult, type Calculation } from '../data/simulation';
import s from '../styles/App.module.scss';

const seconds = (n: number | null) =>
  n === null
    ? 'Нет доставок'
    : `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(n)} с`;
const colors = ['#d16a48', '#087f84', '#7366ac', '#527946'];
export function CalculatedMetrics({ calculation: c }: { calculation: Calculation }) {
  const rows: [string, (r: BufferResult) => string][] = [
    ['Создано сообщений', (r) => fmt(r.generated)],
    ['Доставлено к концу сценария', (r) => fmt(r.delivered)],
    ['Потеряно при переполнении', (r) => fmt(r.lost)],
    [
      'Доля потерь',
      (r) =>
        `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 3 }).format(r.generated ? (r.lost / r.generated) * 100 : 0)} %`,
    ],
    ['Пиковая очередь, сообщений', (r) => fmt(r.peak)],
    ['Осталось в шлюзе', (r) => fmt(r.remaining)],
    ['Осталось в пути', (r) => fmt(r.inTransit)],
    ['Средняя задержка доставки', (r) => seconds(r.meanDelay)],
    ['p95 задержки доставки', (r) => seconds(r.p95Delay)],
    [
      'Первое переполнение от начала',
      (r) => (r.firstOverflow === null ? 'Не было' : seconds(r.firstOverflow)),
    ],
    [
      'Очистка после последнего события',
      (r) =>
        c.recoveryFrom === null
          ? 'Без событий'
          : r.recovery === null
            ? 'Не завершилась'
            : seconds(r.recovery),
    ],
  ];
  return (
    <div className={s.tableWrap}>
      <table className={`${s.metrics} ${s.calculatedMetrics}`}>
        <thead>
          <tr>
            <th>Показатель</th>
            {c.results.map((r) => (
              <th key={r.buffer}>
                Буфер {fmt(r.buffer)}
                {r.buffer === c.configuredBuffer && <small>В схеме</small>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, get]) => (
            <tr key={name}>
              <td>{name}</td>
              {c.results.map((r) => (
                <td key={r.buffer}>{get(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CalculationDetails({ run }: { run: Run }) {
  const c = run.calculation!;
  return (
    <>
      <p>
        Модель {c.version}. Длительность {fmt(c.duration)} с. Отправка:{' '}
        {c.sendingMode === 'synchronized'
          ? 'одновременно в начале интервала'
          : 'равномерно в течение интервала'}
        . Пропускная способность цепочки: {fmt(c.capacity)} сообщений/с, задержка канала:{' '}
        {fmt(c.latencyMs)} мс.
      </p>
      <p>
        Расчётный путь:{' '}
        {c.path.map((id) => run.nodes.find((n) => n.id === id)?.data.label ?? id).join(' → ')}.
      </p>
      <p>
        Пропускные способности:{' '}
        {c.path
          .map((id) => {
            const node = run.nodes.find((n) => n.id === id)!;
            return `${node.data.label} — ${fmt(node.data.capacity)} сообщ./с`;
          })
          .join('; ')}
        .
      </p>
      {c.excludedNodes.length > 0 && (
        <p>
          Резерв выключен. Не участвуют в расчёте:{' '}
          {c.excludedNodes
            .map((id) => run.nodes.find((n) => n.id === id)?.data.label ?? id)
            .join(', ')}
          .
        </p>
      )}
      <p>
        Буфер хранит сообщения по порядку поступления, включая передаваемое сообщение. При
        заполнении новые сообщения теряются. Скорость цепочки равна минимальной скорости шлюза,
        канала и сервера. Отказ останавливает передачу из шлюза; уже переданные сообщения не
        теряются. Протоколы MQTT/TCP и переключение на резерв не моделируются.
      </p>
      <p>
        Средняя задержка и p95 учитывают только доставленные сообщения. p95 — время, в которое
        уложились 95% доставок. Очистка — первое опустошение шлюза после последнего события при
        продолжающейся отправке датчиков. Остаток на конец сценария показан отдельно от потерь.
      </p>
      {run.scenario.events.some((e) => e.kind === 'load') && (
        <p>
          Рост нагрузки увеличивает число сообщений за период. Наложенные множители перемножаются.
          При начале и окончании роста нагрузки отсчёт отправки соответствующих групп начинается
          заново.
        </p>
      )}
    </>
  );
}

export function CalculationView({ run }: { run: Run }) {
  const c = run.calculation!;
  const [hidden, setHidden] = useState<number[]>([]);
  const configured = c.results.find((r) => r.buffer === c.configuredBuffer)!;
  const points = c.results[0].points.map((point, i) => ({
    time: point.time,
    ...Object.fromEntries(c.results.map((r, j) => [`b${j}`, r.points[i]?.queue ?? 0])),
  }));
  return (
    <>
      <div className={s.resultKpis}>
        {[
          ['Доставлено', fmt(configured.delivered)],
          ['Потеряно', fmt(configured.lost)],
          ['Пик очереди', fmt(configured.peak)],
          ['p95 задержки', seconds(configured.p95Delay)],
        ].map(([label, value]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
            <span>Буфер {fmt(configured.buffer)}</span>
          </div>
        ))}
      </div>
      <div className={s.successBanner}>
        <div>
          <strong>{calculationConclusion(c)}</strong>
          <p>
            Вывод относится к потерям от переполнения. Сравните также задержки и остаток сообщений
            на конец сценария.
          </p>
        </div>
      </div>
      <section className={`${s.panel} ${s.chartPanel}`}>
        <div className={s.sectionHeading}>
          <h2>Сообщения в шлюзе</h2>
          <div className={s.legend}>
            {c.results.map((r, i) => (
              <button
                key={r.buffer}
                aria-pressed={!hidden.includes(r.buffer)}
                onClick={() =>
                  setHidden((v) =>
                    v.includes(r.buffer) ? v.filter((x) => x !== r.buffer) : [...v, r.buffer],
                  )
                }
                style={{ opacity: hidden.includes(r.buffer) ? 0.35 : 1 }}
              >
                <i style={{ background: colors[i] }} />
                Буфер {fmt(r.buffer)}
              </button>
            ))}
          </div>
        </div>
        <div className={s.chart} role="img" aria-label="Расчёт очереди для разных размеров буфера">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 20, right: 20, left: 12, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e7e5" />
              <XAxis
                type="number"
                dataKey="time"
                domain={[0, c.duration]}
                label={{ value: 'Время, секунды', position: 'insideBottom', offset: -15 }}
              />
              <YAxis width={60} allowDecimals={false} />
              <Tooltip
                labelFormatter={(value) => `${fmt(Number(value))} с`}
                formatter={(value, name) => [`${fmt(Number(value))} сообщ.`, name]}
              />
              {run.scenario.events.map((e) => (
                <ReferenceArea
                  key={e.id}
                  x1={e.start}
                  x2={e.start + e.duration}
                  fill="#e8ae8e"
                  fillOpacity={0.18}
                />
              ))}
              {c.results.map((r, i) => (
                <Line
                  key={r.buffer}
                  type="linear"
                  dataKey={`b${i}`}
                  name={`Буфер ${fmt(r.buffer)}`}
                  stroke={colors[i]}
                  strokeWidth={2.5}
                  hide={hidden.includes(r.buffer)}
                  dot={false}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className={s.muted}>
          Затенены интервалы событий. График показывает 301 временной срез; точные пики приведены в
          таблице.
        </p>
      </section>
      <ResultAssistant run={run} />
      <div className={`${s.panel} ${s.metricsPanel}`}>
        <CalculatedMetrics calculation={c} />
      </div>
      <details className={s.comparisonDetails}>
        <summary>Параметры и метод расчёта</summary>
        <CalculationDetails run={run} />
      </details>
    </>
  );
}
