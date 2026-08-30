import { FleetMap } from './FleetMap';
import { LeftRail } from './panels/LeftRail';
import { RightRail } from './panels/RightRail';
import { TopBar } from './panels/TopBar';

export default function App() {
  return (
    <div className="app">
      <FleetMap />
      <TopBar />
      <LeftRail />
      <RightRail />
    </div>
  );
}
