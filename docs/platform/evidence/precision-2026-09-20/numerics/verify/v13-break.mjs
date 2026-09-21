import { Backend, DEFAULTS } from '../src/apparent2.mjs';
const de = new Backend('/tmp/claude-0/swisslab/de440s.bsp');
const cov = de.coverage();
const T = (label, fn) => { try { const r = fn(); console.log('NO THROW  ', label, '->', typeof r === 'object' ? JSON.stringify(r).slice(0,140) : r); }
                           catch (e) { console.log('threw     ', label, '->', e.message.slice(0,120)); } };
console.log('coverage etDays', (cov.start/86400).toFixed(3), (cov.stop/86400).toFixed(3));
const inside = cov.start/86400 + 0.001;

T('1 far out of range (year 1700)', () => de.apparent('Mars', -109573, DEFAULTS).lon);
T('2 Pluto 0.001 d inside coverage start (light-time lookback 0.29 d)', () => de.apparent('Pluto', inside, DEFAULTS).lon);
T('3 Pluto 0.4 d inside coverage start', () => de.apparent('Pluto', cov.start/86400 + 0.4, DEFAULTS).lon);
T('4 unknown body', () => de.apparent('Ceres', 0, DEFAULTS).lon);
T('5 NaN epoch', () => de.apparent('Mars', NaN, DEFAULTS).lon);
T('6 Infinity epoch', () => de.apparent('Mars', Infinity, DEFAULTS).lon);
T('7 nutation typo "2000B"', () => de.apparent('Mars', 0, {...DEFAULTS, nutation:'2000B'}).lon);
T('8 deflection typo "Sun"', () => {
  const a = de.apparent('Mercury', 0, {...DEFAULTS, deflection:'Sun'});
  const on = de.apparent('Mercury', 0, DEFAULTS);
  const off = de.apparent('Mercury', 0, {...DEFAULTS, deflection:'none'});
  return `typo lon===deflection-OFF? ${a.lon===off.lon}  (silently disables; true on-off = ${((on.lon-off.lon)*3600).toFixed(5)}")`;
});
T('9 timescale typo "TDB"', () => {
  const a = de.apparent('Moon', 0, {...DEFAULTS, timescale:'TDB'});
  const tt = de.apparent('Moon', 0, {...DEFAULTS, timescale:'tt'});
  return `typo === TT path? ${a.lon===tt.lon}`;
});
T('10 aberration typo "First"', () => {
  const a = de.apparent('Mars', 0, {...DEFAULTS, aberration:'First'});
  const full = de.apparent('Mars', 0, {...DEFAULTS, aberration:'full'});
  const first = de.apparent('Mars', 0, {...DEFAULTS, aberration:'first'});
  return `typo===full? ${a.lon===full.lon}  typo===first? ${a.lon===first.lon}`;
});
T('11 observerVelocity typo', () => {
  const a = de.apparent('Mars', 0, {...DEFAULTS, observerVelocity:'Analytic'});
  const an = de.apparent('Mars', 0, {...DEFAULTS, observerVelocity:'analytic'});
  const c60 = de.apparent('Mars', 0, {...DEFAULTS, observerVelocity:'central60'});
  return `typo===analytic? ${a.lon===an.lon}  typo===central60? ${a.lon===c60.lon}`;
});
T('12 lightTimeIters: 0', () => {
  const r = de.apparent('Pluto', 0, {...DEFAULTS, lightTimeIters:0});
  const g = de.apparent('Pluto', 0, DEFAULTS);
  return `tau=${r.lightTimeSec} converged=${r.lightTimeConverged} iters=${r.lightTimeIters}  dLon vs best = ${((r.lon-g.lon)*3600).toFixed(4)}"`;
});
T('13 lightTimeIters: 1 (non-convergent) still returns', () => {
  const r = de.apparent('Pluto', 0, {...DEFAULTS, lightTimeIters:1});
  return `converged=${r.lightTimeConverged} (no error raised)`;
});
T('14 deflectionLimit 0 at a limb-grazing epoch', () => {
  const r = de.apparent('Uranus', 2475612.828881469-2451545.0, {...DEFAULTS, deflectionLimit:0});
  return `lon=${r.lon} limiter=${r.deflectionLimiterBound}`;
});
