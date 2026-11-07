import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Archive,
  BarChart3,
  ChevronRight,
  Clock3,
  FolderPlus,
  GitBranch,
  Network,
  Pencil,
  Play,
  Plus,
  Router,
  Search,
  Settings2,
  Star,
  Thermometer,
  Undo2,
} from 'lucide-react';
import { useStore } from '../data/store';
import { fmt, sensorCount, type Project } from '../data/model';
import { Badge, Button, Empty, Field, Heading, IconButton, Modal } from '../components/ui';
import { HeroNetworkScene } from '../components/HeroNetworkScene';
import { NetworkPreview } from '../components/NetworkPreview';
import s from '../styles/App.module.scss';

export function Projects() {
  const projects = useStore((s) => s.projects);
  const runs = useStore((s) => s.runs);
  const activeId = useStore((s) => s.activeProjectId);
  const recent = projects.find((p) => p.id === activeId && !p.archived);
  const addProject = useStore((s) => s.addProject);
  const update = useStore((s) => s.updateProject);
  const select = useStore((s) => s.selectProject);
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<'create' | Project | null>(null);
  const [name, setName] = useState('');
  const [template, setTemplate] = useState('single');
  const visible = projects.filter(
    (p) =>
      (filter === 'archive' ? p.archived : !p.archived && (filter !== 'favorites' || p.favorite)) &&
      p.name.toLocaleLowerCase().includes(search.toLocaleLowerCase()),
  );
  const open = (p: Project, path = '/editor') => {
    select(p.id);
    navigate(path);
  };
  const create = (preset = 'single') => {
    setTemplate(preset);
    setName('');
    setModal('create');
  };
  function actions(p: Project) {
    return (
      <div className={s.cardActions}>
        <IconButton
          label={p.favorite ? 'Убрать из избранного' : 'В избранное'}
          onClick={() => update(p.id, { favorite: !p.favorite })}
        >
          <Star size={18} fill={p.favorite ? 'currentColor' : 'none'} />
        </IconButton>
        <IconButton
          label={`Переименовать ${p.name}`}
          onClick={() => {
            setName(p.name);
            setModal(p);
          }}
        >
          <Pencil size={16} />
        </IconButton>
        <IconButton
          label={p.archived ? 'Восстановить проект' : `Архивировать ${p.name}`}
          onClick={() => update(p.id, { archived: !p.archived })}
        >
          {p.archived ? <Undo2 size={17} /> : <Archive size={17} />}
        </IconButton>
      </div>
    );
  }
  return (
    <>
      <section className={s.homeHero}>
        <div>
          <span className={s.eyebrow}>СЕТЬ ПОД КОНТРОЛЕМ</span>
          <h1>
            Увидьте, как сеть
            <br />
            переживёт отказ.
          </h1>
          <p>
            От схемы телеметрии до обоснованного выбора буфера. Задайте событие и проследите путь
            каждого изменения.
          </p>
          <div className={s.inline}>
            <Button
              variant="primary"
              onClick={() => {
                const id =
                  projects.find((p) => p.templateId === 'station' && !p.archived)?.id ??
                  addProject('Насосная станция Северная', 'station');
                select(id);
                navigate('/editor');
              }}
            >
              Исследовать насосную станцию <ArrowRight size={18} />
            </Button>
            <Button onClick={() => create()}>Новая сеть</Button>
          </div>
          <small>8 групп источников · 700 датчиков · 130 сообщений/с</small>
        </div>
        <HeroNetworkScene />
      </section>
      {recent && (
        <div className={s.resumeProject}>
          <div>
            <span className={s.eyebrow}>ПРОДОЛЖИТЬ ИССЛЕДОВАНИЕ</span>
            <strong>{recent.name}</strong>
            <small>
              {runs.find((r) => r.projectId === recent.id)?.scenario.name ??
                'Схема готова к вашему следующему эксперименту'}
            </small>
          </div>
          <Button onClick={() => open(recent)}>
            Открыть проект <ArrowRight size={16} />
          </Button>
          {runs.some((r) => r.projectId === recent.id) && (
            <Button onClick={() => open(recent, '/results')}>Последний результат</Button>
          )}
        </div>
      )}
      <Heading
        eyebrow="ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО"
        title="Ваши сети и эксперименты"
        description="Откройте проект или начните с готовой схемы."
        action={
          <Button variant="primary" onClick={() => create()}>
            <Plus size={19} />
            Создать проект
          </Button>
        }
      />
      <div className={s.filterRow}>
        <div className={s.tabs}>
          {[
            ['all', 'Все проекты'],
            ['favorites', 'Избранное'],
            ['archive', 'Архив'],
          ].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={filter === id ? s.activeTab : ''}
            >
              {label}
              {id === 'all' && <span>{projects.filter((p) => !p.archived).length}</span>}
            </button>
          ))}
        </div>
        <label className={s.search}>
          <Search size={18} />
          <input
            placeholder="Найти проект"
            aria-label="Найти проект"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
      </div>
      <div className={s.projectsLayout}>
        <div className={s.projectCards}>
          {visible.length === 0 ? (
            <div className={s.panel}>
              <Empty
                title="Здесь пока нет проектов"
                action={
                  <Button onClick={() => create()}>
                    <Plus size={17} />
                    Создать проект
                  </Button>
                }
              >
                Измените поиск или добавьте новую сеть.
              </Empty>
            </div>
          ) : (
            visible.map((p, i) => (
              <article
                key={p.id}
                className={`${s.panel} ${s.projectCard} ${i === 0 ? s.featuredProject : ''}`}
              >
                <div className={s.cardHeader}>
                  <div>
                    <div className={s.inline}>
                      <h2>{p.name}</h2>
                      {i === 0 && <Badge>Сеть телеметрии</Badge>}
                    </div>
                    <p>{p.description}</p>
                  </div>
                  {actions(p)}
                </div>
                <NetworkPreview project={p} compact={i !== 0} />
                <div className={s.projectMeta}>
                  <span>
                    <Thermometer size={16} />
                    <strong>{fmt(sensorCount(p.nodes))}</strong> датчиков
                  </span>
                  <span>
                    <GitBranch size={16} />
                    {p.scenarios.length} сценария
                  </span>
                </div>
                <div className={s.cardFooter}>
                  <span className={s.muted}>
                    <Clock3 size={15} />
                    Изменено {new Date(p.updatedAt).toLocaleDateString('ru-RU')}
                  </span>
                  <div className={s.inline}>
                    <Button variant={i === 0 ? 'primary' : 'secondary'} onClick={() => open(p)}>
                      {i === 0 ? (
                        <>
                          <Play size={15} />
                          Открыть редактор
                        </>
                      ) : (
                        <>
                          Открыть
                          <ArrowRight size={16} />
                        </>
                      )}
                    </Button>
                    {i === 0 && <Button onClick={() => open(p, '/scenarios')}>Сценарии</Button>}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        <aside className={`${s.panel} ${s.quickStart}`}>
          <div className={s.eyebrow}>ОТ СХЕМЫ К РЕЗУЛЬТАТУ</div>
          <h2>Как начать</h2>
          {[
            {
              icon: Network,
              title: 'Соберите схему',
              text: 'Добавьте датчики, шлюзы и каналы связи. Настройте параметры устройств.',
            },
            {
              icon: Settings2,
              title: 'Выберите событие',
              text: 'Проверьте обрыв канала, отказ узла или рост потока сообщений.',
            },
            {
              icon: BarChart3,
              title: 'Сравните результаты',
              text: 'Сравните размеры буфера по потерям сообщений, очереди и задержкам.',
            },
          ].map(({ icon: Icon, title, text }, i) => (
            <div className={s.step} key={title}>
              <span className={s.stepNumber}>0{i + 1}</span>
              <Icon size={31} strokeWidth={1.5} />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
          <div className={s.guideFooter}>
            <span className={s.liveDot} />
            Можно экспериментировать.
            <br />
            Все изменения сохранятся здесь.
          </div>
        </aside>
      </div>
      <section className={`${s.panel} ${s.templates}`}>
        <div className={s.sectionHeading}>
          <h3>Начать с шаблона</h3>
          <span>Готовая основа для вашей сети</span>
        </div>
        <div className={s.templateGrid}>
          {[
            {
              id: 'single',
              icon: Router,
              name: 'Один шлюз',
              description: 'Базовая схема с сервером',
            },
            {
              id: 'reserve',
              icon: GitBranch,
              name: 'Резервный канал',
              description: 'Расчёт основного пути; резерв — в плане',
            },
            {
              id: 'segments',
              icon: Network,
              name: 'Несколько сегментов',
              description: 'Для схемы; расчёт сегментов — в плане',
            },
          ].map(({ id, icon: Icon, name, description }) => (
            <button key={id} className={s.template} onClick={() => create(id)}>
              <Icon size={30} strokeWidth={1.5} />
              <span>
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
              <ChevronRight size={18} />
            </button>
          ))}
        </div>
      </section>
      {modal && (
        <Modal
          title={modal === 'create' ? 'Новый проект' : 'Переименовать проект'}
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              if (modal === 'create') {
                addProject(name, template);
                setModal(null);
                navigate('/editor');
              } else {
                update(modal.id, { name: name.trim() });
                setModal(null);
              }
            }}
          >
            <Field label="Название проекта">
              <input
                autoFocus
                required
                maxLength={80}
                placeholder="Например, производственный участок"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            {modal === 'create' && (
              <Field label="Начальная схема">
                <select value={template} onChange={(e) => setTemplate(e.target.value)}>
                  <option value="station">Насосная станция · 700 датчиков</option>
                  <option value="single">Один шлюз</option>
                  <option value="reserve">Резервный канал</option>
                  <option value="segments">Несколько сегментов</option>
                </select>
              </Field>
            )}
            <div className={s.modalFooter}>
              <Button type="button" onClick={() => setModal(null)}>
                Отмена
              </Button>
              <Button variant="primary" disabled={!name.trim()}>
                <FolderPlus size={17} />
                {modal === 'create' ? 'Создать и открыть' : 'Сохранить'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
