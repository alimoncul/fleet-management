import { ROUTES } from '../mock';
import { useStore } from '../store';
import { ago } from '../util';

export function VehicleDetail() {
  const v = useStore((s) => s.vehicles.find((x) => x.id === s.selectedId) ?? null);
  const select = useStore((s) => s.select);

  if (!v) return null;
  const route = ROUTES.find((r) => r.id === v.routeId);
  const load = Math.round(v.passengerLoad * 100);

  return (
    <>
      <div className="rail__h">
        {v.id}
        <button className="x" type="button" onClick={() => select(null)} aria-label="Close">
          ✕
        </button>
      </div>

      <div className="detail">
        <div className="detail__badges">
          <span className={v.status === 'online' ? 'tag tag--ok' : 'tag tag--bad'}>{v.status}</span>
          <span className="tag">{v.type}</span>
          <span className="tag">{v.gps ? 'GPS' : 'no GPS'}</span>
          <span className="tag">{v.lte ? 'LTE' : 'no LTE'}</span>
        </div>

        <div className="kv">
          <div>
            <span>Speed</span>
            <b>{Math.round(v.speedKmh)} km/h</b>
          </div>
          <div>
            <span>Heading</span>
            <b>{Math.round(v.heading)}°</b>
          </div>
          <div>
            <span>Schedule</span>
            <b>
              {v.scheduleOffsetMin > 0 ? '+' : ''}
              {Math.round(v.scheduleOffsetMin)} min
            </b>
          </div>
          <div>
            <span>Updated</span>
            <b>{ago(v.lastUpdate)}</b>
          </div>
        </div>

        <div className="load">
          <div className="load__h">
            Passenger load <b>{load}%</b>
          </div>
          <div className="load__bar">
            <i style={{ width: `${load}%` }} />
          </div>
        </div>

        {route && (
          <div className="stops">
            <div className="stops__h">{route.name}</div>
            {route.stops.map((s) => (
              <div key={s.name} className={s.name === v.nextStop ? 'stop stop--next' : 'stop'}>
                <i />
                {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
