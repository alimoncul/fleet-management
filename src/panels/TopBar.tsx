import { useStore } from '../store';

const TABS = ['Live Map', 'Fleet', 'Routes', 'Analytics', 'Maintenance', 'Incidents', 'Crew'];

export function TopBar() {
  const alertCount = useStore((s) => s.alerts.length);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" />
        FleetView
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t} className={t === 'Live Map' ? 'tab tab--on' : 'tab'} type="button">
            {t}
          </button>
        ))}
      </nav>

      <div className="topbar__right">
        <input className="search" placeholder="Search    Ctrl+Shift+F" aria-label="Search" />
        <span className="bell" aria-label={`${alertCount} alerts`}>
          {'◉'}
          {alertCount > 0 && <i className="bell__dot">{alertCount}</i>}
        </span>
      </div>
    </header>
  );
}
