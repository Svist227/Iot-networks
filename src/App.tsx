import { useEffect, useState, lazy, Suspense } from 'react';
import { BrowserRouter, NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import {
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Folder,
  Menu,
  Network,
  Play,
  X,
} from 'lucide-react';
import { useProject, useStore } from './data/store';
import { Notice } from './components/ui';
import { Projects } from './pages/Projects';
import s from './styles/App.module.scss';
const Editor = lazy(() => import('./pages/Editor'));
const Scenarios = lazy(() => import('./pages/Scenarios'));
const Results = lazy(() => import('./pages/Results'));
const Reports = lazy(() => import('./pages/Reports'));
const Profile = lazy(() => import('./pages/Profile'));
const links = [
  { to: '/projects', icon: Folder, label: 'Проекты' },
  { to: '/editor', icon: Network, label: 'Редактор сети' },
  { to: '/scenarios', icon: Play, label: 'Сценарии' },
  { to: '/results', icon: BarChart3, label: 'Результаты' },
  { to: '/reports', icon: FileText, label: 'Отчёты' },
];
function Workspace() {
  const project = useProject();
  const profile = useStore((s) => s.profile);
  const storageError = useStore((s) => s.storageError);
  const location = useLocation();
  const [menu, setMenu] = useState(false);
  const initials = `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`;
  const pageName = links.find((l) => location.pathname.startsWith(l.to))?.label ?? 'Профиль';
  useEffect(() => {
    document.title = `${pageName} · СетьРезерв`;
    setMenu(false);
  }, [location.pathname, pageName]);
  return (
    <div className={s.app}>
      <a href="#main" className={s.skipLink}>
        К содержимому
      </a>
      {menu && (
        <button aria-label="Закрыть меню" className={s.scrim} onClick={() => setMenu(false)} />
      )}
      <aside className={`${s.sidebar} ${menu ? s.sidebarOpen : ''}`}>
        <NavLink to="/projects" className={s.brand}>
          <Network size={34} strokeWidth={2} />
          <span>СетьРезерв</span>
        </NavLink>
        <div className={s.navLabel}>РАБОЧЕЕ ПРОСТРАНСТВО</div>
        <nav>
          {links.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `${s.navItem} ${isActive ? s.activeNav : ''}`}
            >
              <Icon size={21} />
              <span>{label}</span>
              {to === '/projects' && (
                <span className={s.navCount}>
                  {useStore.getState().projects.filter((p) => !p.archived).length}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className={s.sidebarBottom}>
          <div className={s.demoMark}>
            <span className={s.liveDot} />
            Демонстрационная версия
          </div>
          <NavLink to="/projects" className={s.workspaceLink}>
            <Database size={21} />
            <span>
              Демо-пространство<small>Локально в браузере</small>
            </span>
            <ChevronRight size={16} />
          </NavLink>
          <NavLink
            to="/profile"
            className={`${s.profileLink} ${location.pathname === '/profile' ? s.activeNav : ''}`}
          >
            <span className={s.avatar}>{initials}</span>
            <span>
              {profile.firstName} {profile.lastName}
              <small>Личный профиль</small>
            </span>
            <ChevronRight size={16} />
          </NavLink>
        </div>
      </aside>
      <div className={s.workspace}>
        <header className={s.topbar}>
          <button className={s.mobileMenu} aria-label="Открыть меню" onClick={() => setMenu(!menu)}>
            {menu ? <X /> : <Menu />}
          </button>
          <div className={s.breadcrumb}>
            {location.pathname === '/projects'
              ? 'Рабочее пространство'
              : location.pathname === '/profile'
                ? 'Личный кабинет'
                : project.name}
            <span>/</span>
            <strong>{pageName}</strong>
          </div>
          <div className={s.saveState}>
            <CheckCircle2 size={16} />
            {storageError ? 'Хранилище недоступно' : 'Данные хранятся в браузере'}
          </div>
          <NavLink aria-label="Открыть профиль" to="/profile" className={s.avatar}>
            {initials}
          </NavLink>
        </header>
        <main id="main" className={s.main}>
          {storageError && (
            <Notice warm>
              Браузер не разрешил сохранение. Изменения доступны только до закрытия страницы.
            </Notice>
          )}
          <Suspense fallback={<div className={s.empty}>Загружаем рабочее пространство…</div>}>
            <Routes>
              <Route path="/projects" element={<Projects />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/scenarios" element={<Scenarios />} />
              <Route path="/results" element={<Results />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/projects" replace />} />
            </Routes>
          </Suspense>
          <footer className={s.footer}>
            <span>
              СетьРезерв <span className={s.footerDivider}>/</span> Исследуйте устойчивость вашей
              сети
            </span>
            <span>Демо · v0.1</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
export default function App() {
  return (
    <BrowserRouter>
      <Workspace />
    </BrowserRouter>
  );
}
