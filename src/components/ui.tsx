import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import {
  Activity,
  Gauge,
  RadioTower,
  Router,
  Server,
  Thermometer,
  X,
  Info,
  Network,
} from 'lucide-react';
import type { DeviceKind, Scenario } from '../data/model';
import s from '../styles/App.module.scss';

export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}) {
  return (
    <button className={`${s.button} ${s[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className={s.iconButton} aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Badge({ children, warm = false }: { children: ReactNode; warm?: boolean }) {
  return <span className={`${s.badge} ${warm ? s.warm : ''}`}>{children}</span>;
}
export function Heading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <header className={s.heading}>
      <div>
        {eyebrow && <div className={s.eyebrow}>{eyebrow}</div>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </header>
  );
}
export function Notice({ children, warm = false }: { children: ReactNode; warm?: boolean }) {
  return (
    <div className={`${s.notice} ${warm ? s.warm : ''}`}>
      <Info size={19} />
      <div>{children}</div>
    </div>
  );
}
export function Empty({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={s.empty}>
      <Network size={38} />
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={s.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className={s.toggle}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={s.toggleTrack} />
      <span>{label}</span>
    </label>
  );
}
export const deviceIcons = {
  temperature: Thermometer,
  vibration: Activity,
  pressure: Gauge,
  gateway: Router,
  channel: RadioTower,
  server: Server,
};
export function DeviceIcon({ kind, size = 26 }: { kind: DeviceKind; size?: number }) {
  const Icon = deviceIcons[kind];
  return <Icon size={size} strokeWidth={1.65} />;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={s.modal}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className={s.modalHeader}>
        <h2>{title}</h2>
        <IconButton label="Закрыть" onClick={onClose}>
          <X size={20} />
        </IconButton>
      </div>
      {children}
    </dialog>
  );
}
export function Timeline({ scenario }: { scenario: Scenario }) {
  return (
    <div className={s.timeline}>
      <div className={s.timelineTrack}>
        {scenario.events.map((event) => (
          <span
            key={event.id}
            title={`${event.start}–${event.start + event.duration} с`}
            style={{
              left: `${(100 * event.start) / scenario.duration}%`,
              width: `${Math.min((100 * event.duration) / scenario.duration, 100 - (100 * event.start) / scenario.duration)}%`,
            }}
          />
        ))}
      </div>
      <div className={s.timelineLabels}>
        {Array.from({ length: 6 }, (_, i) => (
          <span key={i}>
            {Math.floor((scenario.duration * i) / 5 / 60)}:
            {String(Math.floor(((scenario.duration * i) / 5) % 60)).padStart(2, '0')}
          </span>
        ))}
      </div>
      <div className={s.legend}>
        <span>
          <i />
          Штатный режим
        </span>
        <span>
          <i className={s.orangeDot} />
          Событие сценария
        </span>
      </div>
    </div>
  );
}
