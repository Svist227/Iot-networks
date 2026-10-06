import type { Project } from '../data/model';
import { DeviceIcon } from './ui';
import s from '../styles/App.module.scss';

export function NetworkPreview({
  project,
  compact = false,
}: {
  project: Pick<Project, 'nodes' | 'edges'>;
  compact?: boolean;
}) {
  const maxX = Math.max(1080, ...project.nodes.map((n) => n.position.x + 205));
  const maxY = Math.max(490, ...project.nodes.map((n) => n.position.y + 115));
  return (
    <div className={`${s.networkPreview} ${compact ? s.compactPreview : ''}`}>
      <svg viewBox={`0 0 ${maxX} ${maxY}`} role="img" aria-label="Предпросмотр схемы сети">
        <defs>
          <marker
            id={compact ? 'arrow-small' : 'arrow'}
            markerWidth="7"
            markerHeight="7"
            refX="6"
            refY="3.5"
            orient="auto"
          >
            <path d="M0 0L7 3.5L0 7" fill="#348e90" />
          </marker>
        </defs>
        {project.edges.map((edge) => {
          const a = project.nodes.find((n) => n.id === edge.source);
          const b = project.nodes.find((n) => n.id === edge.target);
          if (!a || !b) return null;
          const x1 = a.position.x + 185,
            y1 = a.position.y + 43,
            x2 = b.position.x,
            y2 = b.position.y + 43;
          return (
            <path
              key={edge.id}
              d={`M${x1},${y1} C${(x1 + x2) / 2},${y1} ${(x1 + x2) / 2},${y2} ${x2},${y2}`}
              fill="none"
              stroke="#348e90"
              strokeWidth="2"
              strokeDasharray={a.data.reserve || b.data.reserve ? '7 6' : undefined}
              markerEnd={`url(#${compact ? 'arrow-small' : 'arrow'})`}
            />
          );
        })}
        {project.nodes.map((node) => (
          <foreignObject
            key={node.id}
            x={node.position.x}
            y={node.position.y}
            width="188"
            height="95"
          >
            <div className={`${s.previewNode} ${node.data.reserve ? s.reserveNode : ''}`}>
              <DeviceIcon kind={node.data.kind} size={28} />
              <div>
                <strong>{node.data.label}</strong>
                <small>
                  {['temperature', 'vibration', 'pressure'].includes(node.data.kind)
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
        ))}
      </svg>
    </div>
  );
}
