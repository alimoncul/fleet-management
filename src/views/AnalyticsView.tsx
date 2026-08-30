import { useMemo } from 'react';
import { Sparkline } from '../Sparkline';
import { mulberry32 } from '../geo';
import { JOBS } from '../mock';
import { useStore } from '../store';

const jobById = new Map(JOBS.map((j) => [j.id, j]));

// seeded "historical" numbers so the page looks populated
const seed = mulberry32(4242);
const WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY = WEEK.map((d) => {
  const deliveries = 34 + Math.floor(seed() * 34);
  const revenue = 240_000 + Math.floor(seed() * 180_000); // ₺ per day
  const cost = Math.round(revenue * (0.56 + seed() * 0.13));
  return { d, deliveries, revenue, cost };
});

const ON_TIME_PCT = 88 + Math.floor(seed() * 9);
const DIST_WEEK_KM = 46_000 + Math.floor(seed() * 12_000);
const TONNAGE_WEEK = 1_080 + Math.floor(seed() * 320);
const OUTSTANDING = 720_000 + Math.floor(seed() * 500_000);

const REV_WEEK = DAY.reduce((a, x) => a + x.revenue, 0);
const COST_WEEK = DAY.reduce((a, x) => a + x.cost, 0);
const DELIVERIES_WEEK = DAY.reduce((a, x) => a + x.deliveries, 0);
const MARGIN_PCT = Math.round(((REV_WEEK - COST_WEEK) / REV_WEEK) * 100);

const money = (n: number): string => {
  if (n >= 1_000_000) return `₺${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 10_000) return `₺${Math.round(n / 1000)}k`;
  return `₺${(n / 1000).toFixed(1)}k`;
};

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
    return {
      avgFuel,
      cargoMix: [...mix.entries()].sort((a, b) => b[1] - a[1]),
      active: online.length,
    };
  }, [trucks]);

  const util = utilHistory[utilHistory.length - 1] ?? 0;
  const maxDeliveries = Math.max(...DAY.map((x) => x.deliveries));
  const maxRC = Math.max(...DAY.map((x) => x.revenue));
  const maxMix = Math.max(...cargoMix.map(([, n]) => n));

  return (
    <section className="view">
      <div className="view__head">
        <h1>Analytics</h1>
        <span className="view__count">last 7 days · mock data</span>
      </div>

      <h2 className="view__sub">Financials</h2>
      <div className="kpi-grid">
        <Kpi label="Revenue / week" value={money(REV_WEEK)} accent />
        <Kpi label="Gross margin" value={`${MARGIN_PCT}%`} accent />
        <Kpi label="Operating cost / week" value={money(COST_WEEK)} />
        <Kpi label="Revenue / truck" value={money(REV_WEEK / trucks.length)} />
        <Kpi label="Revenue per km" value={`₺${(REV_WEEK / DIST_WEEK_KM).toFixed(1)}`} />
        <Kpi label="Cost per km" value={`₺${(COST_WEEK / DIST_WEEK_KM).toFixed(1)}`} />
        <Kpi label="Profit / delivery" value={money((REV_WEEK - COST_WEEK) / DELIVERIES_WEEK)} />
        <Kpi label="Outstanding invoices" value={money(OUTSTANDING)} />
      </div>

      <h2 className="view__sub">Operations</h2>
      <div className="kpi-grid">
        <Kpi label="Fleet utilisation" value={`${util}%`} spark={utilHistory} />
        <Kpi label="On-time delivery" value={`${ON_TIME_PCT}%`} />
        <Kpi label="Deliveries / week" value={DELIVERIES_WEEK.toString()} />
        <Kpi label="Distance / week" value={`${(DIST_WEEK_KM / 1000).toFixed(1)}k km`} />
        <Kpi label="Cargo moved / week" value={`${TONNAGE_WEEK} t`} />
        <Kpi label="Active trucks" value={`${active} / ${trucks.length}`} />
        <Kpi label="Avg fuel level" value={`${avgFuel}%`} />
      </div>

      <div className="chart-row">
        <div className="chartcard panel">
          <div className="card__h">Revenue vs operating cost</div>
          <div className="legend">
            <span><i style={{ background: 'var(--green)' }} /> Revenue</span>
            <span><i style={{ background: 'var(--dim-2)' }} /> Cost</span>
          </div>
          <div className="bars">
            {DAY.map(({ d, revenue, cost }) => (
              <div className="bars__col" key={d}>
                <div className="bars__pair">
                  <div
                    className="bars__bar bars__bar--rev"
                    style={{ height: `${(revenue / maxRC) * 100}%` }}
                  />
                  <div
                    className="bars__bar bars__bar--cost"
                    style={{ height: `${(cost / maxRC) * 100}%` }}
                  />
                </div>
                <div className="bars__lbl">{d}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="chartcard panel">
          <div className="card__h">Deliveries per day</div>
          <div className="bars">
            {DAY.map(({ d, deliveries }) => (
              <div className="bars__col" key={d}>
                <div
                  className="bars__bar"
                  style={{ height: `${(deliveries / maxDeliveries) * 100}%` }}
                >
                  <span>{deliveries}</span>
                </div>
                <div className="bars__lbl">{d}</div>
              </div>
            ))}
          </div>
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
    </section>
  );
}

function Kpi({
  label,
  value,
  spark,
  accent,
}: {
  label: string;
  value: string;
  spark?: number[];
  accent?: boolean;
}) {
  return (
    <div className={accent ? 'kpi kpi--accent panel' : 'kpi panel'}>
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value}</div>
      {spark && <Sparkline data={spark} height={30} />}
    </div>
  );
}
