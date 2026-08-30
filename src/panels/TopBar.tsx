import { useStore } from '../store';
import type { View } from '../types';

const TABS: { id: View; label: string }[] = [
  { id: 'map', label: 'Live Map' },
  { id: 'fleet', label: 'Fleet' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'crew', label: 'Crew' },
];

export function TopBar() {
  const view = useStore((s) => s.view);
  const setView = useStore((s) => s.setView);
  const alertCount = useStore((s) => s.alerts.length);

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand__mark" />
        FleetView
      </div>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={t.id === view ? 'tab tab--on' : 'tab'}
            onClick={() => setView(t.id)}
          >
            {t.label}
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
