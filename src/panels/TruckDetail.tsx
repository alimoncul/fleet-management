import { JOBS } from '../mock';
import { jobStatus } from '../sim';
import { useStore } from '../store';
import { ago, restLabel } from '../util';
import { Avatar } from '../ui/Avatar';
import { TruckIcon } from '../ui/TruckIcon';

const jobById = new Map(JOBS.map((j) => [j.id, j]));

export function TruckDetail() {
  const t = useStore((s) => s.trucks.find((x) => x.id === s.selectedTruckId) ?? null);
  const driver = useStore((s) =>
    t ? (s.drivers.find((d) => d.id === t.driverId) ?? null) : null,
  );
  const selectTruck = useStore((s) => s.selectTruck);

  if (!t) return null;
  const job = jobById.get(t.jobId);
  const load = job ? Math.round((job.weightKg / 26000) * 100) : 0;
  const done = t.leg === 'out' ? t.progress : 1 - t.progress;

  return (
    <>
      <div className="rail__h">
        {t.id}
        <button className="x" type="button" onClick={() => selectTruck(null)} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="detail">
        <div className="detail__truck">
          <TruckIcon cls={t.cls} size={78} />
          <div>
            <div className="detail__brand">
              {t.brand} {t.model}
            </div>
            <div className="detail__badges">
              <span className={t.status === 'online' ? 'tag tag--ok' : 'tag tag--bad'}>
                {jobStatus(t)}
              </span>
              <span className="tag">{t.cls}</span>
            </div>
          </div>
        </div>

        {driver && (
          <button
            className="drivercard"
            type="button"
            onClick={() => {
              useStore.getState().selectDriver(driver.id);
              useStore.getState().setView('crew');
            }}
          >
            <Avatar name={driver.name} photo={driver.photo} size={42} />
            <div className="drivercard__main">
              <div className="drivercard__name">{driver.name}</div>
              <div className="drivercard__sub">
                ★ {driver.rating.toFixed(1)} · {driver.experienceYears} yr exp
              </div>
            </div>
            <div className="drivercard__rest">{restLabel(driver)}</div>
          </button>
        )}

        {job && (
          <div className="cargo">
            <div className="cargo__route">
              <span className="dot dot--o" /> {job.origin.name}
              <span className="cargo__arrow">→</span>
              <span className="dot dot--d" /> {job.dest.name}
            </div>
            <div className="kv">
              <div>
                <span>Cargo</span>
                <b>{job.cargo}</b>
              </div>
              <div>
                <span>Weight</span>
                <b>{(job.weightKg / 1000).toFixed(1)} t</b>
              </div>
            </div>
            <div className="load">
              <div className="load__h">
                Trailer load <b>{load}%</b>
              </div>
              <div className="load__bar">
                <i style={{ width: `${Math.min(100, load)}%` }} />
              </div>
            </div>
            <div className="load">
              <div className="load__h">
                Trip progress <b>{Math.round(done * 100)}%</b>
              </div>
              <div className="load__bar">
                <i style={{ width: `${Math.round(done * 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        <div className="kv">
          <div>
            <span>Speed</span>
            <b>{jobStatus(t) === 'en route' || jobStatus(t) === 'returning' ? Math.round(t.speedKmh) : 0} km/h</b>
          </div>
          <div>
            <span>Heading</span>
            <b>{Math.round(t.heading)}°</b>
          </div>
          <div>
            <span>Fuel</span>
            <b>{Math.round(t.fuelPct)}%</b>
          </div>
          <div>
            <span>Odometer</span>
            <b>{Math.round(t.odometerKm).toLocaleString()} km</b>
          </div>
          <div>
            <span>GPS</span>
            <b>{t.status === 'online' ? 'live' : 'lost'}</b>
          </div>
          <div>
            <span>Updated</span>
            <b>{ago(t.lastUpdate)}</b>
          </div>
        </div>
      </div>
    </>
  );
}
