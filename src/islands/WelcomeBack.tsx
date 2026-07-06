/**
 * The returning-visitor strip. If this device holds saved charts, the
 * homepage acknowledges it — one quiet row, no fanfare. First-time
 * visitors get nothing at all: the section only exists after mount,
 * and only when a profile does.
 */
import { useEffect, useState } from 'preact/hooks';
import SignChip from './SignChip';
import { loadProfile } from '../lib/profile/store';
import type { SavedChart } from '../lib/profile/schema';

export default function WelcomeBack() {
  const [chart, setChart] = useState<SavedChart | null>(null);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const pick = () => {
      const p = loadProfile();
      const latest = [...p.charts]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] ?? null;
      setChart(latest);
      setCount(p.charts.length);
    };
    pick();
    window.addEventListener('zodiacs:profile', pick);
    return () => window.removeEventListener('zodiacs:profile', pick);
  }, []);

  if (!chart) return null;

  const find = (name: string) => chart.summary.bodies.find((b) => b.body === name);
  const sun = find('Sun');
  const moon = find('Moon');
  const asc = chart.summary.angles?.asc ?? null;

  return (
    <section class="container" aria-label="Your saved chart">
      <div class="wb">
        <p class="wb__lead">Welcome back.</p>
        <div class="wb__chips">
          {sun && <span class="wb__chip"><span class="mono--label">Sun</span><SignChip lon={sun.lon} /></span>}
          {moon && <span class="wb__chip"><span class="mono--label">Moon</span><SignChip lon={moon.lon} /></span>}
          {asc !== null && <span class="wb__chip"><span class="mono--label">Rising</span><SignChip lon={asc} /></span>}
        </div>
        <div class="wb__links">
          <a href="/transits/">Today against your chart →</a>
          <a href="/profile/">{count > 1 ? `Your ${count} charts →` : 'Your profile →'}</a>
        </div>
      </div>
    </section>
  );
}
