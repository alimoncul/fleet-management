import { useMemo } from 'react';
import { Sparkline } from '../Sparkline';
import { mulberry32 } from '../geo';
import { JOBS } from '../mock';
import { useStore } from '../store';

const jobById = new Map(JOBS.map((j) => [j.id, j]));

// seeded "historical" numbers so the page looks populated
const seed = mulberry32(4242);
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DELIVERIES_7D = WEEK.map((d) => ({ d, n: 34 + Math.floor(seed() * 34) }));
const ON_TIME_PCT = 88 + Math.floor(seed() * 9);
const DIST_WEEK_KM = 46000 + Math.floor(seed() * 12000);
const TONNAGE_WEEK = 1080 + Math.floor(seed() * 320);

export function AnalyticsView() {
  const trucks = useStore((s) => s.trucks);
  const utilHistory = useStore((s) => s.utilHistory);

  const { avgFuel, cargoMix, active } = useMemo(() => {
    const online = trucks.filter((t) => t.status === 'online');
    const avgFuel = online.length
      ? Math.round(online.reduce((a, t) => a + t.fuelPct, 0) / online.length)
      : 0;
    const mix = new Map<string, number>();
    for (const t of trucks) {
      const c = jobById.get(t.jobId)?.cargo ?? 'Other';
      mix.set(c, (mix.get(c) ?? 0) + 1);
    }
    const cargoMix = [...mix.entries()].sort((a, b) => b[1] - a[1]);
    return { avgFuel, cargoMix, active: online.length };
  }, [trucks]);

  const util = utilHistory[utilHistory.length - 1] ?? 0;
  const maxDeliveries = Math.max(...DELIVERIES_7D.map((x) => x.n));
  const maxMix = Math.max(...cargoMix.map(([, n]) => n));
  const deliveriesWeek = DELIVERIES_7D.reduce((a, x) => a + x.n, 0);

  return (
    <section className="view">
      <div className="view__head">
        <h1>Analytics</h1>
        <span className="view__count">last 7 days · mock data</span>
      </div>

      <div className="kpi-grid">
        <Kpi label="Fleet utilisation" value={`${util}%`} spark={utilHistory} />
        <Kpi label="On-time delivery" value={`${ON_TIME_PCT}%`} />
        <Kpi label="Deliveries / week" value={deliveriesWeek.toString()} />
        <Kpi label="Distance / week" value={`${(DIST_WEEK_KM / 1000).toFixed(1)}k km`} />
        <Kpi label="Cargo moved / week" value={`${TONNAGE_WEEK} t`} />
        <Kpi label="Active trucks" value={`${active} / ${trucks.length}`} />
        <Kpi label="Avg fuel level" value={`${avgFuel}%`} />
      </div>

      <div className="chart-row">
        <div className="chartcard panel">
          <div className="card__h">Deliveries per day</div>
          <div className="bars">
            {DELIVERIES_7D.map(({ d, n }) => (
              <div className="bars__col" key={d}>
                <div className="bars__bar" style={{ height: `${(n / maxDeliveries) * 100}%` }}>
                  <span>{n}</span>
                </div>
                <div className="bars__lbl">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chartcard panel">
          <div className="card__h">Active cargo mix</div>
          <div className="hbars">
            {cargoMix.map(([c, n]) => (
              <div className="hbars__row" key={c}>
                <span className="hbars__lbl">{c}</span>
                <div className="hbars__track">
                  <i style={{ width: `${(n / maxMix) * 100}%` }} />
                </div>
                <span className="hbars__val">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Kpi({ label, value, spark }: { label: string; value: string; spark?: number[] }) {
  return (
    <div className="kpi panel">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {spark && <Sparkline data={spark} height={30} />}
    </div>
  );
}
