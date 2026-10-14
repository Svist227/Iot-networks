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
import { demoResults, type DemoPreset } from '../data/model';
import s from '../styles/App.module.scss';
export function ResultChart({ preset }: { preset: DemoPreset }) {
  const data = demoResults[preset].points.map(([time, without, withReserve]) => ({
    time,
    without,
    withReserve,
  }));
  return (
    <div className={s.chart} role="img" aria-label={`График очереди: ${demoResults[preset].label}`}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 25, right: 20, left: 8, bottom: 15 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e3e7e5" />
          <XAxis
            type="number"
            dataKey="time"
            domain={[0, 10]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#7a8990', fontSize: 12 }}
            label={{
              value: 'Время, минуты',
              position: 'insideBottom',
              offset: -10,
              fill: '#7a8990',
              fontSize: 12,
            }}
          />
          <YAxis
            width={48}
            tickLine={false}
            axisLine={false}
            tick={{ fill: '#7a8990', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{ borderRadius: 10, borderColor: '#e1e7e4', fontSize: 13 }}
            labelFormatter={(v) => `${v} мин`}
            formatter={(value, name) => [Number(value).toLocaleString('ru-RU') + ' сообщ.', name]}
          />
          {preset !== 'normal' && (
            <ReferenceArea
              x1={preset === 'outage' ? 4 : 3}
              x2={5}
              fill="#edb29c"
              fillOpacity={0.17}
              label={{
                value: preset === 'outage' ? 'Обрыв · 60 с' : 'Нагрузка ×2',
                fill: '#c46d4c',
                fontSize: 12,
                position: 'insideTop',
              }}
            />
          )}
          <Line
            type="linear"
            dataKey="without"
            name="Без резерва"
            stroke="#db7658"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
          <Line
            type="linear"
            dataKey="withReserve"
            name="С резервом"
            stroke="#16888b"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
