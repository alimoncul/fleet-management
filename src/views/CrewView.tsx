import { useMemo } from 'react';
import { JOBS } from '../mock';
import { useStore } from '../store';
import { hm, restFraction, restLabel, tenure } from '../util';
import { Avatar } from '../ui/Avatar';
import { TruckIcon } from '../ui/TruckIcon';

const jobById = new Map(JOBS.map((j) => [j.id, j]));

export function CrewView() {
  const drivers = useStore((s) => s.drivers);
  const trucks = useStore((s) => s.trucks);
  const selectedId = useStore((s) => s.selectedDriverId);
  const selectDriver = useStore((s) => s.selectDriver);
  const selectTruck = useStore((s) => s.selectTruck);
  const setView = useStore((s) => s.setView);

  const truckById = useMemo(() => new Map(trucks.map((t) => [t.id, t])), [trucks]);
  const list = useMemo(() => [...drivers].sort((a, b) => a.name.localeCompare(b.name)), [drivers]);
  const active = list.find((d) => d.id === selectedId) ?? list[0] ?? null;

  return (
    <section className="view view--split">
      <div className="view__head">
        <h1>Crew</h1>
        <span className="view__count">{drivers.length} drivers</span>
      </div>

      <div className="split">
        <div className="crew-list panel">
          {list.map((d) => (
            <button
              key={d.id}
              type="button"
              className={d.id === active?.id ? 'crow crow--on' : 'crow'}
              onClick={() => selectDriver(d.id)}
            >
              <Avatar name={d.name} size={38} />
              <div className="crow__main">
                <div className="crow__name">{d.name}</div>
                <div className="crow__sub">
                  {d.truckId} · with us {tenure(d.hiredMonthsAgo)}
                </div>
              </div>
              <div className={d.resting ? 'crow__rest crow__rest--now' : 'crow__rest'}>
                {d.resting ? 'resting' : hm(270 - d.drivingMinSinceBreak)}
              </div>
            </button>
          ))}
        </div>

        {active && (
          <div className="crew-detail panel">
            <div className="cdetail__top">
              <Avatar name={active.name} size={72} />
              <div>
                <div className="cdetail__name">{active.name}</div>
                <div className="cdetail__sub">★ {active.rating.toFixed(1)} · {active.phone}</div>
              </div>
            </div>

            <div className="kv">
              <div>
                <span>With us</span>
                <b>{tenure(active.hiredMonthsAgo)}</b>
              </div>
              <div>
                <span>Experience</span>
                <b>{active.experienceYears} yrs</b>
              </div>
              <div>
                <span>Safety rating</span>
                <b>{active.rating.toFixed(1)} / 5</b>
              </div>
              <div>
                <span>Shift driving</span>
                <b>{hm(active.drivingMinSinceBreak)}</b>
              </div>
            </div>

            <div className="load">
              <div className="load__h">
                Hours-of-service <b>{restLabel(active)}</b>
              </div>
              <div className="load__bar">
                <i
                  style={{
                    width: `${Math.round(restFraction(active) * 100)}%`,
                    background: active.resting
                      ? 'var(--green)'
                      : restFraction(active) > 0.85
                        ? 'var(--red)'
                        : 'linear-gradient(90deg, var(--green), var(--amber))',
                  }}
                />
              </div>
            </div>

            {(() => {
              const truck = truckById.get(active.truckId);
              const job = truck ? jobById.get(truck.jobId) : undefined;
              if (!truck) return null;
              return (
                <button
                  className="cdetail__truck"
                  type="button"
                  onClick={() => {
                    selectTruck(truck.id);
                    setView('map');
                  }}
                >
                  <TruckIcon cls={truck.cls} size={64} />
                  <div>
                    <div className="drivercard__name">
                      {truck.brand} {truck.model}
                    </div>
                    <div className="drivercard__sub">
                      {truck.id} · {job ? `${job.origin.name} → ${job.dest.name}` : 'no job'}
                    </div>
                  </div>
                </button>
              );
            })()}
          </div>
        )}
      </div>
    </section>
  );
}
