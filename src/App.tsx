import { FleetMap } from './FleetMap';
import { LeftRail } from './panels/LeftRail';
import { RightRail } from './panels/RightRail';
import { TopBar } from './panels/TopBar';
import { useStore } from './store';
import { AnalyticsView } from './views/AnalyticsView';
import { CrewView } from './views/CrewView';
import { FleetView } from './views/FleetView';

export default function App() {
  const view = useStore((s) => s.view);

  return (
    <div className="app">
      {/* map stays mounted so the simulation keeps running behind the other views */}
      <FleetMap />
      <TopBar />

      {view === 'map' && (
        <>
          <LeftRail />
          <RightRail />
        </>
      )}
      {view === 'fleet' && <FleetView />}
      {view === 'analytics' && <AnalyticsView />}
      {view === 'crew' && <CrewView />}
    </div>
  );
}
