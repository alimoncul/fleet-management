import { useStore } from '../store';
import { ago } from '../util';
import { TruckDetail } from './TruckDetail';

export function RightRail() {
  const selectedId = useStore((s) => s.selectedTruckId);
  return (
    <aside className="rail rail--right panel">
      {selectedId ? <TruckDetail /> : <WarningsFeed />}
    </aside>
  );
}

function WarningsFeed() {
  const alerts = useStore((s) => s.alerts);
  const selectTruck = useStore((s) => s.selectTruck);

  return (
    <>
      <div className="rail__h">
        Warnings
        <span className="rail__count">{alerts.length}</span>
      </div>
      <div className="feed">
        {alerts.length === 0 && <div className="feed__empty">All clear.</div>}
        {alerts.map((a) => (
          <button
            key={a.id}
            type="button"
            className="alert"
            onClick={() => selectTruck(a.truckId)}
          >
            <i
              className={
                a.severity === 'crit' ? 'alert__dot alert__dot--crit' : 'alert__dot alert__dot--warn'
              }
            />
            <div className="alert__body">
              <div className="alert__text">{a.text}</div>
              <div className="alert__time">{ago(a.ts)}</div>
            </div>
          </button>
        ))}
      </div>
    </>
  );
}
