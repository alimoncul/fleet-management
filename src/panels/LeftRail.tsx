import { useMemo } from 'react';
import { Sparkline } from '../Sparkline';
import { CLASS_COLOR, CLASS_LABEL, JOBS } from '../mock';
import { jobStatus } from '../sim';
import { useStore } from '../store';
import type { TruckClass } from '../types';

const CLASSES: TruckClass[] = ['tractor', 'box', 'flatbed', 'tanker', 'reefer'];
const jobById = new Map(JOBS.map((j) => [j.id, j]));

export function LeftRail() {
  const trucks = useStore((s) => s.trucks);
  const drivers = useStore((s) => s.drivers);
  const cls = useStore((s) => s.fleetFilter.cls);
  const toggleClass = useStore((s) => s.toggleClass);
  const utilHistory = useStore((s) => s.utilHistory);
  const selectedId = useStore((s) => s.selectedTruckId);
  const selectTruck = useStore((s) => s.selectTruck);

  const driverName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of drivers) m.set(d.truckId, d.name);
    return m;
  }, [drivers]);

  const { counts, online } = useMemo(() => {
    const counts: Record<TruckClass, number> = { tractor: 0, box: 0, flatbed: 0, tanker: 0, reefer: 0 };
    let online = 0;
    for (const t of trucks) {
      counts[t.cls]++;
      if (t.status === 'online') online++;
    }
    return { counts, online };
  }, [trucks]);

  const list = useMemo(
    () => trucks.filter((t) => cls.has(t.cls)).sort((a, b) => a.id.localeCompare(b.id)),
    [trucks, cls],
  );

  const util = utilHistory[utilHistory.length - 1] ?? 0;

  return (
    <aside className="rail rail--left panel">
      <div className="chips">
        {CLASSES.map((c) => (
          <button
            key={c}
            type="button"
            className={cls.has(c) ? 'chip chip--on' : 'chip'}
            onClick={() => toggleClass(c)}
            title={CLASS_LABEL[c]}
          >
            <i className="chip__dot" style={{ background: CLASS_COLOR[c] }} />
            {counts[c]} {CLASS_LABEL[c]}
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
          <b>{trucks.length - online}</b>
        </div>
      </div>

      <div className="card">
        <div className="card__h">Fleet Utilisation</div>
        <div className="card__big">
          {util}
          <small>%</small>
        </div>
        <Sparkline data={utilHistory} />
      </div>

      <div className="veh-list">
        {list.map((t) => {
          const job = jobById.get(t.jobId);
          return (
            <button
              key={t.id}
              type="button"
              className={t.id === selectedId ? 'vrow vrow--on' : 'vrow'}
              onClick={() => selectTruck(t.id === selectedId ? null : t.id)}
            >
              <i
                className="vrow__dot"
                style={{ background: CLASS_COLOR[t.cls], opacity: t.status === 'online' ? 1 : 0.35 }}
              />
              <div className="vrow__main">
                <div className="vrow__id">{t.id}</div>
                <div className="vrow__sub">
                  {driverName.get(t.id)} · {job ? `${job.origin.name} → ${job.dest.name}` : '—'}
                </div>
              </div>
              <div className="vrow__meta">
                <span className={t.status === 'online' ? 'tag tag--ok' : 'tag tag--bad'}>
                  {jobStatus(t)}
                </span>
                <span className="vrow__off">{Math.round(t.fuelPct)}%</span>
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
