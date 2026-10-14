import { useId } from 'react';
import type { Project } from '../data/model';
import { DeviceIcon } from './ui';
import s from '../styles/App.module.scss';

type Playback = {
  activeIds: string[];
  loadIds: string[];
  running: boolean;
  reserve: boolean;
  hasEvent: boolean;
};
export function NetworkPreview({
  project,
  compact = false,
  playback,
}: {
  project: Pick<Project, 'nodes' | 'edges'>;
  compact?: boolean;
  playback?: Playback;
}) {
  const marker = useId().replaceAll(':', '');
  const minX = Math.min(0, ...project.nodes.map((n) => n.position.x - 15));
  const minY = Math.min(0, ...project.nodes.map((n) => n.position.y - 15));
  const maxX = Math.max(1080, ...project.nodes.map((n) => n.position.x + 205));
  const maxY = Math.max(490, ...project.nodes.map((n) => n.position.y + 115));
  return (
    <div className={`${s.networkPreview} ${compact ? s.compactPreview : ''}`}>
      <svg
        viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
        role="img"
        aria-label={playback ? 'Ход сценария на схеме сети' : 'Предпросмотр схемы сети'}
      >
        <defs>
          <marker id={marker} markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0 0L7 3.5L0 7" fill="#348e90" />
          </marker>
        </defs>
        {project.edges.map((edge) => {
          const a = project.nodes.find((n) => n.id === edge.source),
            b = project.nodes.find((n) => n.id === edge.target);
          if (!a || !b) return null;
          const x1 = a.position.x + 185,
            y1 = a.position.y + 43,
            x2 = b.position.x,
            y2 = b.position.y + 43;
          const reserveEdge = a.data.reserve || b.data.reserve;
          const affected = playback?.activeIds.includes(a.id) || playback?.activeIds.includes(b.id);
          const flowing =
            playback?.running &&
            !affected &&
            (!reserveEdge || (playback.reserve && playback.hasEvent));
          return (
            <path
              key={edge.id}
              d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
              className={flowing ? s.flowingConnection : ''}
              fill="none"
              stroke={affected ? '#d97b56' : '#348e90'}
              strokeWidth={playback ? 3 : 2}
              opacity={playback && reserveEdge && !flowing ? 0.35 : 1}
              strokeDasharray={affected || reserveEdge || flowing ? '7 6' : undefined}
              markerEnd={`url(#${marker})`}
            />
          );
        })}
        {project.nodes.map((node) => {
          const affected = playback?.activeIds.includes(node.id);
          const loaded = playback?.loadIds.includes(node.id);
          const reserveActive = node.data.reserve && playback?.reserve && playback.hasEvent;
          return (
            <foreignObject
              key={node.id}
              x={node.position.x}
              y={node.position.y}
              width="188"
              height="95"
            >
              <div
                className={`${s.previewNode} ${node.data.reserve ? s.reserveNode : ''} ${affected || loaded ? s.affectedNode : reserveActive ? s.workingReserve : ''}`}
              >
                <DeviceIcon kind={node.data.kind} size={28} />
                <div>
                  <strong>{node.data.label}</strong>
                  <small>
                    {affected
                      ? 'Временно недоступен'
                      : loaded
                        ? 'Нагрузка повышена'
                        : reserveActive
                          ? 'Резерв включён'
                          : ['temperature', 'vibration', 'pressure'].includes(node.data.kind)
                            ? `${node.data.count} датчиков`
                            : node.data.reserve
                              ? 'Резервный'
                              : node.data.kind === 'channel'
                                ? `${node.data.latency} мс`
                                : 'Онлайн'}
                  </small>
                </div>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}
