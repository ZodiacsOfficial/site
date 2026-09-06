import { describe, expect, it } from 'vitest';
import { measureChartShape, SHAPE_BODIES, shapeGrid } from './chart-shape';
const points = (longitudes: number[]) => longitudes.map((lon, i) => ({ body: SHAPE_BODIES[i], lon }));
const fixtures = [
  ['bundle', [0,10,20,30,40,50,60,70,80,100], 260, 100],
  ['bowl', [0,20,40,60,80,100,120,140,155,170], 190, 170],
  ['locomotive', [0,25,50,75,100,125,150,175,205,240], 120, 240],
  ['bucket', [0,20,40,60,80,100,120,140,160,260], 100, 260],
  ['seesaw', [0,15,30,45,60,180,195,210,225,240], 120, 240],
  ['splash', [0,36,72,108,144,180,216,252,288,324], 36, 324],
] as const;
describe('declared circular geometry', () => {
  it.each(fixtures)('%s preserves independently stated gap/span', (kind, longitudes, gap, span) => {
    const model = measureChartShape(points([...longitudes]), true);
    expect(model.status).toBe('clear'); expect(model.kind).toBe(kind);
    expect(model.largestGap).toBe(gap); expect(model.occupiedSpan).toBe(span);
    expect(model.points.map(p => p.originalLongitude).sort((a,b) => a-b)).toEqual([...longitudes]);
    if (kind === 'bucket') { expect(model.candidates[0].handle).toBe('Pluto'); expect(model.candidates[0].spans).toEqual([160]); }
    if (kind === 'seesaw') expect(model.candidates[0].groups).toEqual([
      ['Sun','Moon','Mercury','Venus','Mars'], ['Jupiter','Saturn','Uranus','Neptune','Pluto'],
    ].sort((a,b) => a.join(',').localeCompare(b.join(','))));
  });
  it.each(fixtures)('%s survives integer-grid rotation, reflection and reorder', (kind, longitudes) => {
    for (const rotation of [0, 0.001, 29.999, 180, 359.999]) for (const direction of [1,-1]) {
      const p = points(longitudes.map(x => x * direction + rotation)).reverse();
      expect(measureChartShape(p, true).kind).toBe(kind);
    }
  });
  it('does not force a named shape outside the six conventions', () => {
    const model = measureChartShape(points([0,15,30,45,60,75,90,105,120,135]), true);
    expect(model.status).toBe('no-clear'); expect(model.reason).toBe('outside-conventions'); expect(model.kind).toBeNull();
  });
  it.each([118.001,119.999,120,120.001,121.999,122])('withholds bundle boundary %s', end => {
    const model = measureChartShape(points([0,10,20,30,40,50,60,70,80,end]), true);
    expect(model.status).toBe('no-clear'); expect(model.reason).toBe('near-threshold');
  });
  it('accepts the inclusive tightened bundle edge and declines the relaxed outer edge', () => {
    expect(measureChartShape(points([0,10,20,30,40,50,60,70,80,118]),true).kind).toBe('bundle');
    expect(measureChartShape(points([0,10,20,30,40,50,60,70,80,122.001]),true).reason).toBe('outside-conventions');
  });
  it.each(fixtures)('%s is only a reference without a known time', (_, lons) => {
    const model = measureChartShape(points([...lons]), false);
    expect(model.status).toBe('reference-only'); expect(model.kind).toBeNull();
  });
  it('keeps coincident bodies distinct and rejects incomplete/duplicate/nonfinite bodies', () => {
    expect(measureChartShape(points(Array(10).fill(0)),true).kind).toBe('bundle');
    const p = points([0,10,20,30,40,50,60,70,80,100]);
    for (const bad of [p.slice(1), [...p,p[0]], p.map(x=>x.body==='Moon'?{...x,lon:NaN}:x)])
      expect(measureChartShape(bad,true).status).toBe('unavailable');
  });
  it('uses wrapped millidegrees without overwriting raw signs or creating negative zero', () => {
    expect(shapeGrid(359.9996)).toBe(0); expect(shapeGrid(-0.0004)).toBe(0);
    expect(shapeGrid(29.9994)).toBe(29999); expect(shapeGrid(29.9996)).toBe(30000);
    expect(Object.is(shapeGrid(-360),-0)).toBe(false);
  });
  it.each([
    ['bowl',152,true],['bowl',151.999,false],['bowl',150,false],['bowl',178,true],['bowl',178.001,false],['bowl',180,false],
    ['locomotive',227,true],['locomotive',226.999,false],['locomotive',225,false],['locomotive',253,true],['locomotive',253.001,false],['locomotive',255,false],
  ] as const)('%s span %s respects both exclusion bands', (kind,end,clear)=>{
    const lons=kind==='bowl'?[0,18,36,54,72,90,108,126,140,end]:[0,25,50,75,100,125,150,175,205,end];
    expect(measureChartShape(points(lons),true).kind===kind).toBe(clear);
  });
  it.each([58,58.001,60,61.999,62,62.001])('checks the bowl internal-gap threshold at %s',gap=>{
    const model=measureChartShape(points([0,gap,70,85,100,115,130,145,160,170]),true);
    expect(model.kind==='bowl').toBe(gap<=58);
    expect(model.candidates.some(c=>c.kind==='bowl')).toBe(gap<=62);
  });
  it.each([28,28.001,30,31.999,32,32.001])('checks bucket opposition offset %s',offset=>{
    const model=measureChartShape(points([0,20,40,60,80,100,120,140,160,260+offset]),true);
    expect(model.kind==='bucket').toBe(offset<=28);
    expect(model.candidates.some(c=>c.kind==='bucket')).toBe(offset<=32);
  });
  it.each([88,88.001,90,91.999,92,92.001])('checks each seesaw cluster span %s',span=>{
    const left=[0,22,44,66,span];
    const model=measureChartShape(points([...left,...left.map(x=>x+180)]),true);
    expect(model.kind==='seesaw').toBe(span<=88);
    expect(model.candidates.some(c=>c.kind==='seesaw')).toBe(span<=92);
  });
  it('does not gain certainty after a same-grid codec round trip',()=>{
    const p=points([359.9996,10,20,30,40,50,60,70,80,118.0004]);
    const before=measureChartShape(p,true),after=measureChartShape(p.map(x=>({...x,lon:shapeGrid(x.lon)/1000})),true);
    expect(after.status).toBe(before.status);expect(after.kind).toBe(before.kind);expect(after.candidates).toEqual(before.candidates);
  });
});
