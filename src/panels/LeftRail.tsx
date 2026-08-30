import { useMemo } from 'react';
import { Sparkline } from '../Sparkline';
import { TYPE_COLOR } from '../mock';
import { useStore } from '../store';
import type { VehicleType } from '../types';

const TYPES: VehicleType[] = ['bus', 'taxi', 'train', 'tram'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function LeftRail() {
  const vehicles = useStore((s) => s.vehicles);
  const typeFilter = useStore((s) => s.typeFilter);
  const toggleType = useStore((s) => s.toggleType);
  const effHistory = useStore((s) => s.effHistory);
  const selectedId = useStore((s) => s.selectedId);
  const select = useStore((s) => s.select);

  const { counts, online } = useMemo(() => {
    const counts: Record<VehicleType, number> = { bus: 0, taxi: 0, train: 0, tram: 0 };
    let online = 0;
    for (const v of vehicles) {
      counts[v.type]++;
      if (v.status === 'online') online++;
    }
    return { counts, online };
  }, [vehicles]);

  const list = useMemo(
    () =>
      vehicles
        .filter((v) => typeFilter.has(v.type))
        .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true })),
    [vehicles, typeFilter],
  );

  const eff = effHistory[effHistory.length - 1] ?? 0;

  return (
    <aside className="rail rail--left panel">
      <div className="chips">
        {TYPES.map((t) => (
          <button
            key={t}
            type="button"
            className={typeFilter.has(t) ? 'chip chip--on' : 'chip'}
            onClick={() => toggleType(t)}
          >
            <i className="chip__dot" style={{ background: TYPE_COLOR[t] }} />
            {counts[t]} {cap(t)}
          </button>
        ))}
      </div>

      <div className="stat-row">
        <div className="stat">
          <span className="stat__k stat__k--ok">Online</span>
          <b>{online}</b>
        </div>
        <div className="stat">
          <span className="stat__k stat__k--bad">Offline</span>
          <b>{vehicles.length - online}</b>
        </div>
      </div>

      <div className="card card--eff">
        <div className="card__h">Operational Efficiency</div>
        <div className="card__big">
          {eff}
          <small>%</small>
        </div>
        <Sparkline data={effHistory} />
      </div>

      <div className="veh-list">
        {list.map((v) => (
          <button
            key={v.id}
            type="button"
            className={v.id === selectedId ? 'vrow vrow--on' : 'vrow'}
            onClick={() => select(v.id === selectedId ? null : v.id)}
          >
            <i
              className="vrow__dot"
              style={{ background: TYPE_COLOR[v.type], opacity: v.status === 'online' ? 1 : 0.35 }}
            />
            <div className="vrow__main">
              <div className="vrow__id">{v.id}</div>
              <div className="vrow__sub">{v.nextStop}</div>
            </div>
            <div className="vrow__meta">
              <span className={v.status === 'online' ? 'tag tag--ok' : 'tag tag--bad'}>
                {v.status}
              </span>
              <span className="vrow__off">
                {v.scheduleOffsetMin > 0 ? '+' : ''}
                {Math.round(v.scheduleOffsetMin)}m
              </span>
            </div>
          </button>
        ))}
      </div>
    </aside>
  );
}
