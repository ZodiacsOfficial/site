import { describe, expect, it } from 'vitest';
import { buildChartContext, CLASSICAL_BODIES, classicalRuler, type ChartContextInput } from './chart-context';
import { dignitiesFor, dignityFor } from './dignities';
const input = (lons: number[], more: Partial<ChartContextInput> = {}): ChartContextInput => ({
  bodies: CLASSICAL_BODIES.map((body,i)=>({body,lon:lons[i]})), timeKnown:true, angles:null, houses:null, ...more,
});
describe('coexisting classical labels', () => {
  const signs=['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
  const table={
    Sun:'exaltation||||domicile||fall||||detriment|',
    Moon:'|exaltation||domicile||||fall||detriment||',
    Mercury:'||domicile|||domicile,exaltation|||detriment|||detriment,fall',
    Venus:'detriment|domicile||||fall|domicile|detriment||||exaltation',
    Mars:'domicile|detriment||fall|||detriment|domicile||exaltation||',
    Jupiter:'||detriment|exaltation||detriment|||domicile|fall||domicile',
    Saturn:'fall|||detriment|detriment||exaltation|||domicile|domicile|',
  };
  it.each(Object.entries(table).flatMap(([body,row])=>row.split('|').map((labels,i)=>({body,sign:signs[i],expected:labels?labels.split(','):[]}))))('locks $body in $sign independently',({body,sign,expected})=>{
    expect(sign).toBeDefined();expect(dignitiesFor(body,sign)).toEqual(expected);
  });
  it('preserves both Mercury overlaps and the legacy priority', () => {
    expect(dignitiesFor('Mercury','virgo')).toEqual(['domicile','exaltation']); expect(dignityFor('Mercury','virgo')).toBe('exaltation');
    expect(dignitiesFor('Mercury','pisces')).toEqual(['detriment','fall']); expect(dignityFor('Mercury','pisces')).toBe('fall');
  });
  it.each(['constructor','toString','__proto__','Uranus','NorthNode'])('rejects unsupported %s',body=>expect(dignitiesFor(body,'virgo')).toEqual([]));
  it('locks all twelve classical rulers without modern substitutions', () => {
    const signs = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];
    expect(signs.map(classicalRuler)).toEqual(['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter']);
  });
});
describe('bounded dispositor graph and independent certainty', () => {
  it('all seven reach the one Mercury domicile, without treating exaltation as a separate edge', () => {
    const model=buildChartContext(input([60,60,150,60,60,60,60]));
    expect(model.dispositors.final).toBe('Mercury');
    expect(model.dispositors.terminals).toEqual([{id:'Mercury',members:['Mercury'],kind:'self'}]);
    expect(model.placements.find(x=>x.body==='Mercury')?.dignities).toEqual(['domicile','exaltation']);
  });
  it('keeps split Sun/Moon terminals, mutual reception and longer cycles distinct', () => {
    const split=buildChartContext(input([120,90,120,90,120,90,120]));
    expect(split.dispositors.final).toBeNull(); expect(split.dispositors.terminals).toHaveLength(2);
    const mutual=buildChartContext(input([0,0,0,0,30,0,0]));
    expect(mutual.dispositors.terminals).toEqual([{id:'Venus>Mars',members:['Venus','Mars'],kind:'mutual'}]); expect(mutual.dispositors.final).toBeNull();
    const cycle=buildChartContext(input([60,60,30,0,60,60,60]));
    expect(cycle.dispositors.terminals).toEqual([{id:'Mercury>Venus>Mars',members:['Mercury','Venus','Mars'],kind:'cycle'}]);
    expect(cycle.dispositors.chains.every(x=>x.members.length<=8)).toBe(true);
  });
  it('unresolved Moon stops its incoming chain while retaining unrelated Mercury facts', () => {
    const model=buildChartContext(input([90,90,60,60,60,60,60],{timeKnown:false}));
    expect(model.dispositors.chains.find(x=>x.body==='Sun')).toMatchObject({members:['Sun','Moon'],status:'incomplete',missing:'Moon'});
    expect(model.dispositors.chains.find(x=>x.body==='Mercury')).toMatchObject({status:'terminal',endpoint:'Mercury'});
    expect(model.dispositors.final).toBeNull(); expect(model.dispositors.reference).toBe(true);
  });
  it('known time needs no location to establish Moon sign; unknown singleton establishes sign only', () => {
    const known=buildChartContext(input([60,90,150,60,60,60,60]));
    expect(known.placements.find(x=>x.body==='Moon')).toMatchObject({status:'established',sign:'cancer',house:null});
    expect(known.rulers.chart).toBeNull(); expect(known.rulers.houses).toEqual([]);
    const reference=buildChartContext(input([60,90,150,60,60,60,60],{timeKnown:false,moonSignCandidates:['cancer']}));
    expect(reference.placements.find(x=>x.body==='Moon')?.sign).toBe('cancer'); expect(reference.dispositors.final).toBeNull();
  });
  it.each([[],['cancer','cancer'],['leo'],['invalid'],['cancer','leo']].map(moonSignCandidates=>({moonSignCandidates})))('does not turn candidate metadata $moonSignCandidates into a timed Moon claim',({moonSignCandidates})=>{
    const model=buildChartContext(input([60,90,150,60,60,60,60],{moonSignCandidates}));
    expect(model.placements.find(x=>x.body==='Moon')?.sign).toBeNull();
  });
  it.each([null,'a',{},7])('fails closed for malformed Moon candidate metadata %j',value=>{
    const model=buildChartContext(input([60,90,150,60,60,60,60],{moonSignCandidates:value as unknown as string[]}));
    expect(model.placements.find(x=>x.body==='Moon')?.sign).toBeNull();
  });
  it('rejects duplicate positions locally, preserves other sections and is reorder-stable', () => {
    const source=input([60,90,150,60,60,60,60]);
    const a=buildChartContext(source),b=buildChartContext({...source,bodies:[...source.bodies].reverse()});
    expect(a.identity).toBe(b.identity); expect(a.dispositors).toEqual(b.dispositors);
    const duplicate=buildChartContext({...source,bodies:[...source.bodies,source.bodies[1]]});
    expect(duplicate.placements.find(x=>x.body==='Moon')?.status).toBe('invalid');
    expect(duplicate.placements.find(x=>x.body==='Mercury')?.sign).toBe('virgo'); expect(duplicate.dispositors.final).toBeNull();
  });
  it('uses actual cusps and effective system, separately from the Ascendant and MC', () => {
    const model=buildChartContext(input([60,90,150,60,60,60,60],{angles:{asc:35},houses:{system:'whole',cusps:Array.from({length:12},(_,i)=>(i*30+30)%360)}}));
    expect(model.rulers.chart).toMatchObject({cusp:35,sign:'taurus',ruler:'Venus'});
    expect(model.rulers.houses).toHaveLength(12); expect(model.rulers.houses[9]).toMatchObject({house:10,cusp:300,sign:'aquarius',ruler:'Saturn'});
    expect(model.rulers.system).toBe('whole');
    const unknown=buildChartContext(input([60,90,150,60,60,60,60],{timeKnown:false,angles:{asc:35},houses:{system:'whole',cusps:Array.from({length:12},(_,i)=>i*30)}}));
    expect(unknown.rulers.chart).toBeNull(); expect(unknown.rulers.houses).toEqual([]);
  });
  it('retains repeated cusp rulers instead of filling intercepted signs or natural house rulers',()=>{
    const model=buildChartContext(input([60,90,150,60,60,60,60],{angles:{asc:35},houses:{system:'placidus',cusps:[0,20,55,90,110,145,180,200,235,270,290,325]}}));
    expect(model.rulers.chart?.ruler).toBe('Venus');
    expect(model.rulers.houses.map(h=>h.ruler)).toEqual(['Mars','Mars','Venus','Moon','Moon','Sun','Venus','Venus','Mars','Saturn','Saturn','Saturn']);
    expect(model.rulers.houses[0].placement.house).toBe(3);
  });
  it('uses raw sign boundaries rather than the shape measurement grid',()=>{
    const model=buildChartContext(input([29.9996,90,150,60,60,60,60]));
    expect(model.placements.find(p=>p.body==='Sun')?.sign).toBe('aries');
    expect(model.placements.find(p=>p.body==='Sun')?.dignities).toEqual(['exaltation']);
  });
  it('rejects invalid cusp topology without erasing valid dignity facts',()=>{
    for(const cusps of [Array(12).fill(0),[0,60,30,90,120,150,180,210,240,270,300,330],[0,30,60]]){
      const model=buildChartContext(input([60,90,150,60,60,60,60],{houses:{system:'whole',cusps}}));
      expect(model.rulers.houses).toEqual([]);expect(model.placements.find(p=>p.body==='Mercury')?.dignities).toEqual(['domicile','exaltation']);
    }
  });
});
