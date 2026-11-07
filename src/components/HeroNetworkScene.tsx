import { useId } from 'react';
import { Gauge, Router, Server, Thermometer, Waves } from 'lucide-react';
import s from '../styles/HeroNetworkScene.module.scss';

const channels = [
  'M112 76 H144 Q168 76 168 100 V146 Q168 170 192 170 H232',
  'M90 170 H232',
  'M112 264 H144 Q168 264 168 240 V194 Q168 170 192 170 H232',
  'M308 170 H408',
];

export function HeroNetworkScene() {
  const id = useId().replace(/:/g, '');
  return (
    <div className={s.scene}>
      <svg
        className={s.network}
        viewBox="0 0 540 340"
        role="img"
        aria-label="Схема телеметрии: датчики температуры, давления и потока передают данные через шлюз на сервер"
      >
        <defs>
          <radialGradient id={id + '-halo'}>
            <stop stopColor="#78e7c6" stopOpacity=".13" />
            <stop offset="1" stopColor="#78e7c6" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={id + '-device'} x2="1" y2="1">
            <stop stopColor="#e5fff1" />
            <stop offset="1" stopColor="#a4dfcb" />
          </linearGradient>
          <linearGradient id={id + '-glass'} x2="1" y2="1">
            <stop stopColor="#326d72" />
            <stop offset="1" stopColor="#1a505b" />
          </linearGradient>
          <pattern id={id + '-grid'} width="22" height="22" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r=".8" fill="#b2e7db" opacity=".12" />
          </pattern>
        </defs>
        <ellipse cx="285" cy="170" rx="245" ry="160" fill={'url(#' + id + '-halo)'} />
        <rect x="38" y="25" width="470" height="290" rx="90" fill={'url(#' + id + '-grid)'} />
        <circle className={s.orbit} cx="270" cy="170" r="100" />
        <circle className={s.orbitOuter} cx="270" cy="170" r="140" />
        <g className={s.links}>
          {channels.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        <g className={s.packets}>
          {channels.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>
        {[
          { x: 84, y: 76, label: 'Температура', Icon: Thermometer },
          { x: 62, y: 170, label: 'Давление', Icon: Gauge },
          { x: 84, y: 264, label: 'Поток', Icon: Waves },
        ].map(({ x, y, label, Icon }) => (
          <g key={label}>
            <circle cx={x} cy={y + 4} r="27" fill="#0b3541" opacity=".6" />
            <circle className={s.sensor} cx={x} cy={y} r="27" fill={'url(#' + id + '-glass)'} />
            <Icon
              x={x - 11}
              y={y - 11}
              width="22"
              height="22"
              strokeWidth="1.4"
              className={s.icon}
            />
            <circle
              className={s.led}
              cx={x + 21}
              cy={y - 18}
              r="3"
              style={{ animationDelay: `${-y / 80}s` }}
            />
            <text className={s.sourceLabel} x={x} y={y + 45}>
              {label}
            </text>
          </g>
        ))}
        <g className={s.hub}>
          <rect x="232" y="140" width="76" height="76" rx="21" fill="#10424b" />
          <rect
            x="232"
            y="134"
            width="76"
            height="76"
            rx="21"
            fill={'url(#' + id + '-device)'}
            stroke="#e3fff0"
            strokeOpacity=".8"
          />
          <Router x="253" y="149" width="34" height="34" color="#215e5d" strokeWidth="1.5" />
          <g className={s.hubLeds} fill="#378b77">
            <rect x="256" y="192" width="5" height="3" rx="1.5" />
            <rect x="265" y="192" width="5" height="3" rx="1.5" />
            <rect x="274" y="192" width="10" height="3" rx="1.5" opacity=".35" />
          </g>
          <text className={s.deviceLabel} x="270" y="240">
            Шлюз
          </text>
        </g>
        <g>
          <rect x="408" y="134" width="76" height="84" rx="19" fill="#0c3844" opacity=".8" />
          <rect
            className={s.server}
            x="408"
            y="128"
            width="76"
            height="84"
            rx="19"
            fill={'url(#' + id + '-glass)'}
          />
          <Server x="429" y="149" width="34" height="34" className={s.icon} strokeWidth="1.3" />
          <circle className={s.led} cx="446" cy="198" r="2.5" />
          <text className={s.deviceLabel} x="446" y="240">
            Сервер
          </text>
        </g>
      </svg>
    </div>
  );
}
