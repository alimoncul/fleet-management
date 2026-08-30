import { useMemo } from 'react';
import { CLASS_LABEL, JOBS } from '../mock';
import { jobStatus } from '../sim';
import { useStore } from '../store';
import { TruckIcon } from '../ui/TruckIcon';

const jobById = new Map(JOBS.map((j) => [j.id, j]));

export function FleetView() {
  const trucks = useStore((s) => s.trucks);
  const drivers = useStore((s) => s.drivers);
  const filter = useStore((s) => s.fleetFilter);
  const setFleetFilter = useStore((s) => s.setFleetFilter);
  const toggleClass = useStore((s) => s.toggleClass);
  const selectTruck = useStore((s) => s.selectTruck);
  const setView = useStore((s) => s.setView);

  const driverName = useMemo(() => {
    const m = new Map<string, string>();
    for (const d of drivers) m.set(d.truckId, d.name);
    return m;
  }, [drivers]);

  const brands = useMemo(
    () => [...new Set(trucks.map((t) => t.brand))].sort(),
    [trucks],
  );

  const rows = useMemo(() => {
    const q = filter.q.trim().toLowerCase();
    return trucks
      .filter((t) => filter.cls.has(t.cls))
      .filter((t) => filter.status === 'all' || t.status === filter.status)
      .filter((t) => filter.brand === 'all' || t.brand === filter.brand)
      .filter((t) => {
        if (!q) return true;
        const job = jobById.get(t.jobId);
        return (
          t.id.toLowerCase().includes(q) ||
          `${t.brand} ${t.model}`.toLowerCase().includes(q) ||
          (driverName.get(t.id) ?? '').toLowerCase().includes(q) ||
          (job?.cargo ?? '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [trucks, filter, driverName]);

  const open = (id: string) => {
    selectTruck(id);
    setView('map');
  };

  return (
    <section className="view">
      <div className="view__head">
        <h1>Fleet</h1>
        <span className="view__count">{rows.length} of {trucks.length} vehicles</span>
      </div>

      <div className="filters panel">
        <div className="chips chips--row">
          {(['tractor', 'box', 'flatbed', 'tanker', 'reefer'] as const).map((c) => (
            <button
              key={c}
              type="button"
              className={filter.cls.has(c) ? 'chip chip--on' : 'chip'}
              onClick={() => toggleClass(c)}
            >
              {CLASS_LABEL[c]}
            </button>
          ))}
        </div>
        <div className="filters__right">
          <select
            value={filter.brand}
            onChange={(e) => setFleetFilter({ brand: e.target.value })}
          >
            <option value="all">All brands</option>
            {brands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
          <select
            value={filter.status}
            onChange={(e) =>
              setFleetFilter({ status: e.target.value as typeof filter.status })
            }
          >
            <option value="all">Any status</option>
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </select>
          <input
            placeholder="Search plate, model, driver, cargo…"
            value={filter.q}
            onChange={(e) => setFleetFilter({ q: e.target.value })}
          />
        </div>
      </div>

      <div className="table panel">
        <div className="table__head">
          <span>Vehicle</span>
          <span>Driver</span>
          <span>Cargo</span>
          <span>Job</span>
          <span>Status</span>
          <span>Fuel</span>
        </div>
        <div className="table__body">
          {rows.map((t) => {
            const job = jobById.get(t.jobId);
            return (
              <button key={t.id} type="button" className="trow" onClick={() => open(t.id)}>
                <span className="trow__veh">
                  <TruckIcon cls={t.cls} size={46} />
                  <span>
                    <b>{t.id}</b>
                    <i>{t.brand} {t.model}</i>
                  </span>
                </span>
                <span>{driverName.get(t.id) ?? '—'}</span>
                <span>
                  {job?.cargo ?? '—'}
                  <i className="trow__dim"> · {job ? (job.weightKg / 1000).toFixed(1) : '0'} t</i>
                </span>
                <span className="trow__dim">
                  {job ? `${job.origin.name} → ${job.dest.name}` : '—'}
                </span>
                <span>
                  <em className={t.status === 'online' ? 'tag tag--ok' : 'tag tag--bad'}>
                    {jobStatus(t)}
                  </em>
                </span>
                <span className={t.fuelPct < 15 ? 'trow__fuel trow__fuel--low' : 'trow__fuel'}>
                  {Math.round(t.fuelPct)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
