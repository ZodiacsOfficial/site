import type { VNode } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const harness=vi.hoisted(()=>({slots:[]as any[],cursor:0,effects:[]as {deps:unknown[];cleanup?:()=>void}[],effectCursor:0,pending:[]as (()=>void)[],
  load:vi.fn(),prepare:vi.fn(),share:vi.fn(),download:vi.fn(),writes:vi.fn()}));
vi.mock('preact/hooks',()=>({
  useMemo:(fn:()=>unknown)=>fn(),
  useRef:(value:unknown)=>{const i=harness.cursor++;if(!(i in harness.slots))harness.slots[i]={current:value};return harness.slots[i];},
  useState:(value:unknown)=>{const i=harness.cursor++;if(!(i in harness.slots))harness.slots[i]=value;return [harness.slots[i],(next:unknown)=>{harness.writes(i,next);harness.slots[i]=next;}];},
  useLayoutEffect:(effect:()=>void|(()=>void),deps:unknown[])=>{const i=harness.effectCursor++,old=harness.effects[i];
    if(!old||deps.some((x,n)=>x!==old.deps[n])){old?.cleanup?.();harness.pending.push(()=>{harness.effects[i]={deps,cleanup:effect()||undefined};});}},
}));
vi.mock('../../lib/module-load',()=>({loadModule:()=>harness.load()}));
import ChartContext, { type ChartContextProps } from './ChartContext';
import { SHAPE_BODIES } from '../../lib/chart-shape';
const ready={blob:new Blob(['unit-only-png'],{type:'image/png'}),filename:'context.png'};
const module={prepareChartContextCard:harness.prepare,shareChartContextCard:harness.share,downloadChartContextCard:harness.download};
let props:ChartContextProps,currentRevision:number;
let details:Record<string,{open:boolean;querySelector:ReturnType<typeof vi.fn>}>;
const focus=vi.fn();
function nodes(value:unknown):VNode<Record<string,any>>[]{
  if(Array.isArray(value))return value.flatMap(nodes);if(!value||typeof value!=='object'||!('props'in value))return [];
  const node=value as VNode<Record<string,any>>;return [node,...nodes(node.props.children)];
}
function render(changes:Partial<ChartContextProps>={}){
  props={...props,...changes};harness.cursor=0;harness.effectCursor=0;
  const view=ChartContext(props);
  for(const node of nodes(view))if(node.props['data-context-section']){
    const section=node.props['data-context-section'];details[section]??={open:true,querySelector:vi.fn(()=>({focus}))};
    (node.ref as (element:unknown)=>void)(details[section]);
  }
  harness.pending.splice(0).forEach(fn=>fn());return view;
}
function find(hook:string,value?:string,view=render()){
  const node=nodes(view).find(n=>Object.hasOwn(n.props,hook)&&(value===undefined||n.props[hook]===value));
  if(!node)throw new Error(`Missing ${hook}:${value}`);return node;
}
function deferred<T>(){let resolve!:(value:T)=>void;let reject!:(cause:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
const flush=async()=>{for(let i=0;i<8;i++)await Promise.resolve();};
beforeEach(()=>{
  harness.slots=[];harness.effects=[];harness.pending=[];harness.writes.mockClear();details={};currentRevision=1;focus.mockClear();
  harness.load.mockReset().mockResolvedValue(module);harness.prepare.mockReset().mockResolvedValue(ready);
  harness.share.mockReset().mockResolvedValue('shared');harness.download.mockReset().mockReturnValue('downloaded');
  props={input:{bodies:SHAPE_BODIES.map((body,i)=>({body,lon:i*30})),timeKnown:true,angles:null,houses:null},locale:'en',
    inputRevision:1,isInputCurrent:r=>r===currentRevision,selection:null,onShowOnChart:vi.fn()};
  vi.spyOn(URL,'createObjectURL').mockReturnValue('blob:context');vi.spyOn(URL,'revokeObjectURL').mockImplementation(()=>{});
  render();
});
afterEach(()=>{harness.effects.forEach(e=>e.cleanup?.());vi.restoreAllMocks();vi.useRealTimers();});
describe('context image operation lifetime',()=>{
  it('loads only on intent, retries a rejected import and retains chart controls',async()=>{
    expect(harness.load).not.toHaveBeenCalled();harness.load.mockRejectedValueOnce(new Error('offline'));
    await find('data-context-create','shape').props.onClick();expect(find('data-context-entity','body:Sun')).toBeDefined();
    await find('data-context-create','shape').props.onClick();expect(find('data-context-image').props.src).toBe('blob:context');
    expect(harness.prepare.mock.calls[0][0]).not.toHaveProperty('identity');expect(harness.prepare.mock.calls[0][0]).not.toHaveProperty('inputRevision');
  });
  it('deduplicates preparation and rejects a late image when the input changes before render',async()=>{
    const pending=deferred<typeof ready>();harness.prepare.mockReturnValueOnce(pending.promise);
    const click=find('data-context-create','shape').props.onClick,first=click();void click();await flush();
    expect(harness.load).toHaveBeenCalledOnce();currentRevision=2;
    pending.resolve(ready);await first;expect(URL.createObjectURL).not.toHaveBeenCalled();
    await click();expect(harness.load).toHaveBeenCalledOnce();render({inputRevision:2});
    await find('data-context-create','shape').props.onClick();expect(find('data-context-image')).toBeDefined();
  });
  it('checks the live disclosure state before its queued toggle event',async()=>{
    const pending=deferred<typeof ready>();harness.prepare.mockReturnValueOnce(pending.promise);
    const first=find('data-context-create','shape').props.onClick();await flush();details.shape.open=false;
    pending.resolve(ready);await first;expect(URL.createObjectURL).not.toHaveBeenCalled();
    find('data-context-section','shape').props.onToggle({currentTarget:details.shape});
    expect(nodes(render()).some(n=>Object.hasOwn(n.props,'data-context-export'))).toBe(false);
  });
  it('keeps one active section and ignores old completion when another section starts',async()=>{
    const old=deferred<typeof ready>(),next=deferred<typeof ready>();harness.prepare.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const first=find('data-context-create','shape').props.onClick();await flush();
    const second=find('data-context-create','rulers').props.onClick();await flush();old.resolve(ready);await first;
    expect(URL.createObjectURL).not.toHaveBeenCalled();next.resolve(ready);await second;
    expect(find('data-context-image')).toBeDefined();expect(nodes(render()).filter(n=>Object.hasOwn(n.props,'data-context-export'))).toHaveLength(1);
  });
  it('Close cancels pending work and restores focus without discarding factual controls',async()=>{
    const pending=deferred<typeof ready>();harness.prepare.mockReturnValueOnce(pending.promise);
    const first=find('data-context-create','shape').props.onClick();await flush();find('data-context-close').props.onClick();
    pending.resolve(ready);await first;expect(URL.createObjectURL).not.toHaveBeenCalled();expect(focus).toHaveBeenCalled();expect(find('data-context-entity','body:Sun')).toBeDefined();
  });
  it.each(['shared','downloaded','cancelled'])('reports the actual %s outcome while preserving the image',async outcome=>{
    await find('data-context-create','shape').props.onClick();harness.share.mockResolvedValueOnce(outcome);
    await find('data-context-share').props.onClick();expect(find('data-context-status').props.children).toBe(outcome==='shared'?'Image shared.':outcome==='downloaded'?'Image download started.':'');
    expect(find('data-context-image')).toBeDefined();
  });
  it('does not attach a delivery result to an identical recomputation',async()=>{
    await find('data-context-create','shape').props.onClick();const pending=deferred<string>();harness.share.mockReturnValueOnce(pending.promise);
    const first=find('data-context-share').props.onClick();currentRevision=2;render({inputRevision:2});
    const count=harness.writes.mock.calls.length;pending.resolve('shared');await first;expect(harness.writes).toHaveBeenCalledTimes(count);expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:context');
  });
});
