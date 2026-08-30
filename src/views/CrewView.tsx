import { useMemo, useState } from 'react';
import { JOBS } from '../mock';
import { useStore } from '../store';
import { hm, restFraction, tenure } from '../util';
import { Avatar } from '../ui/Avatar';

const jobById = new Map(JOBS.map((j) => [j.id, j]));

export function CrewView() {
  const drivers = useStore((s) => s.drivers);
  const trucks = useStore((s) => s.trucks);
  const selectedDriverId = useStore((s) => s.selectedDriverId);
  const selectTruck = useStore((s) => s.selectTruck);
  const setView = useStore((s) => s.setView);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<'name' | 'tenure' | 'rest'>('name');

  const truckById = useMemo(() => new Map(trucks.map((t) => [t.id, t])), [trucks]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = drivers.filter(
      (d) =>
        !needle ||
        d.name.toLowerCase().includes(needle) ||
        d.truckId.toLowerCase().includes(needle),
    );
    list.sort((a, b) => {
      if (sort === 'tenure') return b.hiredMonthsAgo - a.hiredMonthsAgo;
      if (sort === 'rest') return restFraction(b) - restFraction(a);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [drivers, q, sort]);

  const open = (truckId: string) => {
    selectTruck(truckId);
    setView('map');
  };

  return (
    <section className="view">
      <div className="view__head">
        <h1>Crew</h1>
        <span className="view__count">{rows.length} of {drivers.length} drivers</span>
      </div>

      <div className="filters panel">
        <div className="chips chips--row">
          {(['name', 'tenure', 'rest'] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={sort === s ? 'chip chip--on' : 'chip'}
              onClick={() => setSort(s)}
            >
              {s === 'name' ? 'A–Z' : s === 'tenure' ? 'Longest serving' : 'Closest to rest'}
            </button>
          ))}
        </div>
        <div className="filters__right">
          <input
            placeholder="Search driver or plate…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      <div className="table panel">
        <div className="table__head table__head--crew">
          <span>Driver</span>
          <span>Truck</span>
          <span>With us</span>
          <span>Experience</span>
          <span>Rating</span>
          <span>Hours-of-service</span>
        </div>
        <div className="table__body">
          {rows.map((d) => {
            const truck = truckById.get(d.truckId);
            const job = truck ? jobById.get(truck.jobId) : undefined;
            const frac = restFraction(d);
            return (
              <button
                key={d.id}
                type="button"
                className={d.id === selectedDriverId ? 'trow trow--crew trow--on' : 'trow trow--crew'}
                onClick={() => open(d.truckId)}
              >
                <span className="trow__veh">
                  <Avatar name={d.name} photo={d.photo} size={38} />
                  <span>
                    <b>{d.name}</b>
                    <i>{d.phone}</i>
                  </span>
                </span>
                <span>
                  {d.truckId}
                  <i className="trow__dim"> · {job ? `${job.origin.name} → ${job.dest.name}` : 'no job'}</i>
                </span>
                <span>{tenure(d.hiredMonthsAgo)}</span>
                <span>{d.experienceYears} yrs</span>
                <span>★ {d.rating.toFixed(1)}</span>
                <span className="hos">
                  <span className="hos__bar">
                    <i
                      style={{
                        width: `${Math.round((d.resting ? 1 : frac) * 100)}%`,
                        background: d.resting
                          ? 'var(--green)'
                          : frac > 0.85
                            ? 'var(--red)'
                            : 'linear-gradient(90deg, var(--green), var(--amber))',
                      }}
                    />
                  </span>
                  <em className={d.resting ? 'hos__lbl hos__lbl--rest' : 'hos__lbl'}>
                    {d.resting ? `resting ${Math.ceil(d.restLeftSec / 60)}m` : hm(270 - d.drivingMinSinceBreak)}
                  </em>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <p className="view__note">
        Hours-of-service = time until the mandatory 45-minute break (4.5 h continuous driving).
      </p>
    </section>
  );
}
