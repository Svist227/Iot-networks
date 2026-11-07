import { useState } from 'react';
import type { Run } from '../data/model';
import { fmt } from '../data/model';
import { calculationConclusion } from '../data/simulation';
import s from '../styles/App.module.scss';
export function ResultAssistant({ run }: { run: Run }) {
  const [question, setQuestion] = useState(0);
  const c = run.calculation!;
  const r = c.results.find((r) => r.buffer === c.configuredBuffer)!;
  const replies = [
    `При выбранном буфере ${fmt(r.buffer)} сообщений пиковая очередь составила ${fmt(r.peak)}. Потеряно ${fmt(r.lost)} сообщений. ${r.lost ? 'Буфер заполнился: новые сообщения не помещались.' : 'Переполнения не было. Проверьте также задержку доставки.'}`,
    calculationConclusion(c),
    `Входящий поток — ${fmt(run.messageRate)} сообщ./с, скорость цепочки — ${fmt(c.capacity)} сообщ./с. Увеличение буфера даёт место для ожидания, но само по себе не ускоряет передачу. Сравните вариант с большей скоростью канала.`,
    r.recovery === null
      ? 'За время наблюдения очистка после события не зафиксирована. Для сценария без событий эта метрика не применяется.'
      : `После завершения последнего события очередь впервые опустела через ${fmt(r.recovery)} с. В это время датчики продолжали отправлять сообщения.`,
  ];
  return (
    <aside className={s.resultAssistant}>
      <div>
        <span className={s.eyebrow}>ПОМОЩНИК ПО РЕЗУЛЬТАТУ</span>
        <h2>Разберём, что произошло</h2>
        <p aria-live="polite">{replies[question]}</p>
        <small>Объяснения по показателям этого запуска</small>
      </div>
      <div className={s.assistantQuestions}>
        {[
          'Почему возникли потери?',
          'Какой буфер выбрать?',
          'Что попробовать дальше?',
          'Когда сеть восстановилась?',
        ].map((q, i) => (
          <button
            key={q}
            className={question === i ? s.selectedQuestion : ''}
            onClick={() => setQuestion(i)}
          >
            {q}
            <span>↗</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
