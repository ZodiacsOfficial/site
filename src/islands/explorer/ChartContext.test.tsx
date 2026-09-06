import { h, type VNode } from 'preact';
import { render } from 'preact-render-to-string';
import { describe, expect, it, vi } from 'vitest';
vi.mock('preact/hooks',()=>({useMemo:(factory:()=>unknown)=>factory(),useRef:(value:unknown)=>({current:value}),useState:(value:unknown)=>[value,vi.fn()],useLayoutEffect:()=>{}}));
import ChartContext, { type ChartContextProps } from './ChartContext';
import { CONTEXT_COPY, CONTEXT_SECTIONS, contextSectionLines } from './chart-context-copy';
import { buildChartContext } from '../../lib/chart-context';
import { SHAPE_BODIES } from '../../lib/chart-shape';
import type { CatalogLocale } from '../../lib/i18n';
const props = (locale:CatalogLocale='en'):ChartContextProps=>({
  input:{bodies:SHAPE_BODIES.map((body,i)=>({body,lon:[60,90,150,60,60,60,60,240,270,300][i]})),timeKnown:true,
    angles:{asc:35},houses:{system:'whole',cusps:Array.from({length:12},(_,i)=>(i*30+30)%360)}},
  locale,inputRevision:1,isInputCurrent:revision=>revision===1,selection:{kind:'body',body:'Mercury'},onShowOnChart:vi.fn(),
});
function nodes(value:unknown):VNode<Record<string,any>>[]{
  if(Array.isArray(value))return value.flatMap(nodes);
  if(!value||typeof value!=='object'||!('props'in value))return [];
  const node=value as VNode<Record<string,any>>;return [node,...nodes(node.props.children)];
}
describe('native context receipts',()=>{
  it.each(['en','es','pt','fr','it','ru'] as const)('renders four localized disclosures and coexisting labels in %s',locale=>{
    const p=props(locale),html=render(h(ChartContext,p));
    for(const section of CONTEXT_SECTIONS) expect(html).toContain(`data-context-section="${section}"`);
    expect(html).toContain(CONTEXT_COPY[locale].title);
    expect(html).toContain(`${CONTEXT_COPY[locale].domicile} + ${CONTEXT_COPY[locale].exaltation}`);
    expect(html).toContain('data-context-entity="house:10"'); expect(html).toContain('data-context-entity="angle:asc"');
    expect(html).not.toContain('undefined');
  });
  it('native ruler and house controls select the original entities with immediate motion',()=>{
    const p=props();const all=nodes(ChartContext(p));
    for(const id of ['angle:asc','house:10','body:Venus','sign:virgo']){
      const button=all.find(n=>n.props['data-context-entity']===id)!;
      expect(button.type).toBe('button');expect(button.props.type).toBe('button');button.props.onClick();
    }
    expect(p.onShowOnChart).toHaveBeenNthCalledWith(1,{kind:'angle',angle:'asc'},'instant');
    expect(p.onShowOnChart).toHaveBeenNthCalledWith(2,{kind:'house',house:10},'instant');
    expect(p.onShowOnChart).toHaveBeenNthCalledWith(3,{kind:'body',body:'Venus'},'instant');
    expect(p.onShowOnChart).toHaveBeenNthCalledWith(4,{kind:'sign',sign:'virgo'},'instant');
    expect(all.find(n=>n.props['data-context-entity']==='body:Mercury')?.props['aria-pressed']).toBe(true);
  });
  it('does not offer nonexistent house/angle controls after unknown-time replacement',()=>{
    const p=props();p.input={...p.input,timeKnown:false};
    const html=render(h(ChartContext,p));
    expect(html).not.toContain('data-context-entity="house:');expect(html).not.toContain('data-context-entity="angle:');
    expect(html).toContain(CONTEXT_COPY.en.reference);
    for(const section of CONTEXT_SECTIONS)expect(contextSectionLines(buildChartContext(p.input),section,'en')[0]).toBe(CONTEXT_COPY.en.reference);
  });
});
