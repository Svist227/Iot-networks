import type { Scenario, ScenarioEvent } from '../data/model';
import { clockLabel } from '../data/playback';
import s from '../styles/App.module.scss';
export function EventTimeline({
  scenario,
  onChange,
}: {
  scenario: Scenario;
  onChange: (events: ScenarioEvent[]) => void;
}) {
  return (
    <section className={s.eventStudio}>
      <div className={s.sectionHeading}>
        <div>
          <span className={s.eyebrow}>ИСТОРИЯ ЭКСПЕРИМЕНТА</span>
          <h2>Что произойдёт с сетью?</h2>
        </div>
        <span>
          {clockLabel(scenario.duration)} · {scenario.events.length} событий
        </span>
      </div>
      <div className={s.timeRuler}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i}>{clockLabel((scenario.duration * i) / 5)}</span>
        ))}
      </div>
      {scenario.events.map((event, i) => {
        const overlap = scenario.events.some(
          (e) =>
            e.id !== event.id &&
            e.start < event.start + event.duration &&
            e.start + e.duration > event.start,
        );
        return (
          <div key={event.id} className={s.eventLane}>
            <div className={s.eventTrack}>
              <div
                className={s.eventBlock}
                style={{
                  left: `${(event.start / scenario.duration) * 100}%`,
                  width: `${(event.duration / scenario.duration) * 100}%`,
                  background: event.kind === 'load' ? '#278eae' : '#dc855f',
                }}
              />
              <input
                type="range"
                min={0}
                max={scenario.duration}
                step={1}
                value={event.start}
                aria-label={`Начало события ${i + 1} на шкале`}
                onChange={(e) =>
                  onChange(
                    scenario.events.map((item) =>
                      item.id === event.id
                        ? {
                            ...item,
                            start: Math.min(
                              Number(e.target.value),
                              Math.max(0, scenario.duration - event.duration),
                            ),
                          }
                        : item,
                    ),
                  )
                }
              />
            </div>
            <div className={s.eventCaption}>
              <b>
                {event.kind === 'load'
                  ? 'Рост нагрузки'
                  : event.kind === 'outage'
                    ? 'Обрыв канала'
                    : 'Отказ узла'}
              </b>
              <span>
                {clockLabel(event.start)} — {clockLabel(event.start + event.duration)}{' '}
                {overlap ? '· пересекается с другим событием' : ''}
              </span>
            </div>
          </div>
        );
      })}
      {!scenario.events.length && (
        <p>
          Все устройства работают штатно. Добавьте событие ниже, чтобы исследовать отказ или рост
          потока.
        </p>
      )}
      <small>
        Перемещайте маркер события по шкале. Точное время и длительность можно задать в настройках
        ниже.
      </small>
    </section>
  );
}
