import { useState } from 'react';
import { Bell, Database, Save, ShieldCheck, Users } from 'lucide-react';
import { useStore } from '../data/store';
import { Badge, Button, Field, Heading, Notice, Toggle } from '../components/ui';
import s from '../styles/App.module.scss';

export default function Profile() {
  const profile = useStore((s) => s.profile);
  const update = useStore((s) => s.updateProfile);
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState('personal');
  const patch = (data: Partial<typeof draft>) => {
    setDraft((d) => ({ ...d, ...data }));
    setSaved(false);
  };
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!draft.firstName.trim() || !draft.lastName.trim()) return;
        update({ ...draft, firstName: draft.firstName.trim(), lastName: draft.lastName.trim() });
        setSaved(true);
      }}
    >
      <Heading
        title="Ваш профиль"
        description="Личные данные и настройки рабочего пространства."
        action={
          <Button variant="primary" type="submit">
            <Save size={17} />
            Сохранить изменения
          </Button>
        }
      />
      <div className={s.tabs}>
        {[
          ['personal', 'Личные данные'],
          ['settings', 'Настройки'],
          ['security', 'Хранение данных'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={tab === id ? s.activeTab : ''}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className={s.profileGrid}>
        <aside className={`${s.panel} ${s.profileCard}`}>
          <div className={s.largeAvatar}>
            {draft.firstName[0]}
            {draft.lastName[0]}
          </div>
          <h2>
            {draft.firstName} {draft.lastName}
          </h2>
          <p>Участник команды</p>
          <Badge>Личное пространство</Badge>
          <div className={s.team}>
            <h3>
              <Users size={21} />
              Команда СетьРезерв
            </h3>
            <div>
              <span>Роль</span>
              <strong>Владелец</strong>
            </div>
            <div>
              <span>Доступ</span>
              <strong>Локальный</strong>
            </div>
          </div>
        </aside>
        <div className={s.profileContent}>
          <section className={s.panel} hidden={tab !== 'personal'}>
            <h2>Личные данные</h2>
            <div className={s.formGrid}>
              <Field label="Имя">
                <input
                  required
                  maxLength={35}
                  value={draft.firstName}
                  onChange={(e) => patch({ firstName: e.target.value })}
                />
              </Field>
              <Field label="Фамилия">
                <input
                  required
                  maxLength={35}
                  value={draft.lastName}
                  onChange={(e) => patch({ lastName: e.target.value })}
                />
              </Field>
              <Field label="Электронная почта">
                <input
                  type="email"
                  required
                  value={draft.email}
                  onChange={(e) => patch({ email: e.target.value })}
                />
              </Field>
              <Field label="Специализация">
                <select value={draft.role} onChange={(e) => patch({ role: e.target.value })}>
                  <option>Frontend-разработка</option>
                  <option>Сетевой инженер</option>
                  <option>Исследователь</option>
                  <option>Студент</option>
                </select>
              </Field>
            </div>
            <Field label="О себе (необязательно)">
              <textarea
                rows={4}
                maxLength={500}
                value={draft.bio}
                onChange={(e) => patch({ bio: e.target.value })}
              />
            </Field>
          </section>
          {tab === 'settings' && (
            <section className={s.panel}>
              <h2>Рабочее пространство</h2>
              <div className={s.settingRow}>
                <span>Язык интерфейса</span>
                <strong>Русский</strong>
              </div>
              <div className={s.settingRow}>
                <span>Часовой пояс отчётов</span>
                <strong>Москва · UTC+3</strong>
              </div>
              <div className={s.settingRow}>
                <span>Тема оформления</span>
                <strong>Светлая</strong>
              </div>
              <h3 className={s.settingTitle}>
                <Bell size={20} />
                Уведомления в приложении
              </h3>
              <Toggle
                checked={draft.completionNotice}
                onChange={(completionNotice) => patch({ completionNotice })}
                label="Показывать уведомление о готовности результата"
              />
              <Notice>Настройки хранятся в этом браузере вместе с проектами.</Notice>
            </section>
          )}
          {tab === 'security' && (
            <section className={s.panel}>
              <h2>
                <ShieldCheck size={23} />
                Данные рабочего пространства
              </h2>
              <p>
                Ваши проекты и настройки сохраняются на этом устройстве. Для работы с ними
                используйте тот же браузер.
              </p>
              <Notice>
                Проекты, сценарии и отчёты доступны в текущем браузере. Очистка данных сайта удалит
                локальные изменения.
              </Notice>
            </section>
          )}
          <div className={s.panel}>
            <div className={s.inline}>
              <Database size={22} />
              <h3>Ваше пространство для экспериментов</h3>
            </div>
            <p>
              Собирайте схемы, сравнивайте события и сохраняйте результаты — изменения остаются с
              вами после перезагрузки страницы.
            </p>
          </div>
          {saved && (
            <div className={s.feedback} role="status">
              Изменения профиля сохранены.
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
