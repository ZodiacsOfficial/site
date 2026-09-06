/** Genuine calculated charts and native PNGs; synthetic geometry stays in units. */
import { mkdir,readFile,writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PNG } from 'pngjs';
import { inspectPatternInk } from './aspect-pattern-browser-checks.mjs';
export const inspectContextInk=inspectPatternInk;
export function contextConsoleFailure(entry,expected){return !(entry.text==='Failed to load resource: net::ERR_FAILED'&&entry.argumentCount===0&&expected.has(entry.url));}
const titles={en:'Shape and classical rulers',es:'Forma y regentes clásicos',pt:'Forma e regentes clássicos',fr:'Forme et maîtres classiques',it:'Forma e governatori classici',ru:'Форма и классические управители'};
const sections=['shape','rulers','dispositors','dignities'];
const fragment=known=>`#c=1.${Buffer.from(JSON.stringify({d:'1999-08-11',z:'Etc/UTC',la:51.5,lo:0,...(known?{t:'12:00'}:{})})).toString('base64url')}`;
const normalize=text=>text.replace(/\s+/gu,' ').trim();
async function instrument(context){
  await context.addInitScript(()=>{
    window.__contextProbe={ink:[],shares:[],revoked:[],outcome:'shared'};
    const original=CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...rest){
      if(this.canvas.width===1080&&this.canvas.height===1350){const m=this.measureText(text),matrix=this.getTransform();
        const corners=[[x-m.actualBoundingBoxLeft,y-m.actualBoundingBoxAscent],[x+m.actualBoundingBoxRight,y-m.actualBoundingBoxAscent],
          [x-m.actualBoundingBoxLeft,y+m.actualBoundingBoxDescent],[x+m.actualBoundingBoxRight,y+m.actualBoundingBoxDescent]].map(([a,b])=>matrix.transformPoint(new DOMPoint(a,b)));
        window.__contextProbe.ink.push({text:String(text),left:Math.min(...corners.map(p=>p.x)),right:Math.max(...corners.map(p=>p.x)),top:Math.min(...corners.map(p=>p.y)),bottom:Math.max(...corners.map(p=>p.y))});}
      return original.call(this,text,x,y,...rest);
    };
    const revoke=URL.revokeObjectURL;URL.revokeObjectURL=function(url){window.__contextProbe.revoked.push(url);return revoke.call(this,url);};
    Object.defineProperty(Navigator.prototype,'canShare',{configurable:true,value:()=>true});
    Object.defineProperty(Navigator.prototype,'share',{configurable:true,value:async payload=>{
      window.__contextProbe.shares.push({active:navigator.userActivation.isActive,keys:Object.keys(payload),type:payload.files?.[0]?.type});
      if(window.__contextProbe.outcome==='cancelled')throw new DOMException('Cancelled','AbortError');
    }});
  });
}
export async function runChartContextChecks({browser,baseURL,check,outDir}){
  if(outDir)await mkdir(outDir,{recursive:true});const measurements=[];
  for(const width of [390,1440])for(const locale of Object.keys(titles)){
    const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce'});
    const errors=[],requests=[];
    context.on('page',page=>{page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('requestfailed',r=>requests.push(r.url()));});
    try{
      await instrument(context);const page=await context.newPage();const prefix=locale==='en'?'':`/${locale}`;
      await page.goto(`${baseURL}${prefix}/birth-chart/${fragment(true)}`,{waitUntil:'networkidle'});
      await page.locator('.wheel--interactive').waitFor({timeout:30_000});const feature=page.locator('[data-chart-context]');await feature.waitFor({timeout:15_000});
      check(`context ${locale}/${width}: localized full-result title`,await feature.getAttribute('aria-label')===titles[locale]);
      for(const section of sections){
        const owner=feature.locator(`[data-context-section="${section}"]`),summary=owner.locator(':scope > summary');
        await summary.focus();await page.keyboard.press('Enter');
        check(`context ${locale}/${width}/${section}: native Enter opens disclosure`,await owner.evaluate(n=>n.open));
        const body=owner.locator('[data-context-entity="body:Sun"]').first();
        if(await body.count()){await body.focus();await page.keyboard.press('Space');check(`context ${locale}/${width}/${section}: native body selection reaches Sun`,await body.getAttribute('aria-pressed')==='true');}
        check(`context ${locale}/${width}/${section}: controls fit and retain 44px targets`,await owner.evaluate(n=>document.documentElement.scrollWidth<=innerWidth&&n.scrollWidth<=n.clientWidth+1
          &&[...n.querySelectorAll('button,summary')].filter(el=>el.getClientRects().length).every(el=>el.getBoundingClientRect().height>=44)));
        const facts=await owner.locator('[data-context-facts] p').allTextContents();await page.evaluate(()=>{window.__contextProbe.ink=[];});
        await owner.locator('[data-context-create]').click();await owner.locator('[data-context-image]').waitFor({timeout:20_000});
        const waiting=page.waitForEvent('download');await owner.locator('[data-context-save]').click();const download=await waiting,path=await download.path();if(!path)throw new Error('Context PNG missing');
        const bytes=await readFile(path),png=PNG.sync.read(bytes),rows=await page.evaluate(()=>window.__contextProbe.ink);
        const text=normalize(rows.map(r=>r.text).join(' ')),layout=inspectContextInk(rows);let ink=0;for(let i=0;i<png.data.length;i+=16)if(Math.max(...png.data.subarray(i,i+3))>95)ink++;
        check(`context ${locale}/${width}/${section}: real PNG preserves every visible fact`,png.width===1080&&png.height===1350&&ink>1000&&facts.every(line=>text.includes(normalize(line))));
        check(`context ${locale}/${width}/${section}: real glyph ink stays readable`,rows.length>5&&!layout.clipped.length&&!layout.overlaps.length,JSON.stringify(layout));
        check(`context ${locale}/${width}/${section}: image excludes birth inputs`,!['1999-08-11','12:00','Etc/UTC'].some(value=>text.includes(value)));
        await owner.locator('[data-context-share]').click();check(`context ${locale}/${width}/${section}: native share is activated and file-only`,await page.evaluate(()=>{const s=window.__contextProbe.shares.at(-1);return s?.active&&s.type==='image/png'&&s.keys.length===1&&s.keys[0]==='files';}));
        await page.evaluate(()=>{window.__contextProbe.outcome='cancelled';});await owner.locator('[data-context-share]').click();
        check(`context ${locale}/${width}/${section}: cancellation is neutral`,await owner.locator('[data-context-status]').textContent()===''&&await owner.locator('[data-context-image]').isVisible());
        await page.evaluate(()=>{window.__contextProbe.outcome='shared';});
        if(outDir){await writeFile(`${outDir}/${locale}-${width}-${section}-card.png`,bytes);await owner.screenshot({path:`${outDir}/${locale}-${width}-${section}.png`,animations:'disabled'});}
        measurements.push({locale,width,section,filename:download.suggestedFilename(),sha256:createHash('sha256').update(bytes).digest('hex'),layout,text});
        await owner.locator('[data-context-close]').click();check(`context ${locale}/${width}/${section}: Close restores focus`,await owner.locator('[data-context-create]').evaluate(n=>document.activeElement===n)&&await owner.locator('[data-context-image]').count()===0);
        await summary.click();
      }
      if(locale==='en'){
        await page.goto(`${baseURL}/birth-chart/${fragment(false)}`,{waitUntil:'networkidle'});await page.locator('.wheel--interactive').waitFor({timeout:30_000});
        const unknown=page.locator('[data-chart-context]');await unknown.waitFor({timeout:15_000});check(`context unknown/${width}: no invented house or angle controls`,await unknown.locator('[data-context-entity^="house:"],[data-context-entity^="angle:"]').count()===0);
        const shape=unknown.locator('[data-context-section="shape"]');await shape.locator(':scope > summary').click();
        check(`context unknown/${width}: reference scope remains explicit`,(await shape.textContent()).includes('Reference positions only; birth time unknown'));
        await shape.locator('[data-context-create]').click();await shape.locator('[data-context-image]').waitFor({timeout:20_000});
        const old=await shape.locator('[data-context-image]').getAttribute('src');await page.locator('#birth-date').fill('1999-08-12');
        check(`context unknown/${width}: form edit cancels image before recomputation`,await shape.locator('[data-context-image]').count()===0&&await page.evaluate(url=>window.__contextProbe.revoked.includes(url),old));
        if(outDir)await unknown.screenshot({path:`${outDir}/unknown-${width}.png`,animations:'disabled'});
      }
      check(`context ${locale}/${width}: no unexpected browser failures`,!errors.length&&!requests.length,JSON.stringify({errors,requests}));
    }finally{await context.close();}
  }
  const recovery=await browser.newContext({viewport:{width:390,height:1000},reducedMotion:'reduce'});
  try{
    const errors=[],consoleErrors=[],requests=[],expected=new Set();
    const page=await recovery.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')consoleErrors.push({text:m.text().trim(),url:m.location().url,argumentCount:m.args().length});});
    page.on('requestfailed',r=>requests.push({url:r.url(),error:r.failure()?.errorText}));
    const matcher=url=>/^\/_astro\/chart-context-card\.[^/]+\.js$/u.test(url.pathname);
    await page.route(matcher,route=>{expected.add(route.request().url());return route.abort('failed');});
    await page.goto(`${baseURL}/birth-chart/${fragment(true)}`,{waitUntil:'networkidle'});
    const shape=page.locator('[data-context-section="shape"]');await shape.waitFor({timeout:30_000});await shape.locator(':scope > summary').click();
    await shape.locator('[data-context-create]').click();await shape.locator('[role="alert"]').waitFor({timeout:20_000});
    check('context recovery: failed renderer preserves facts and explicit reload',expected.size===1&&await shape.locator('[data-context-entity="body:Sun"]').count()===1&&await shape.getByRole('button',{name:'Reload page',exact:true}).count()===1);
    await page.unroute(matcher);await shape.getByRole('button',{name:'Reload page',exact:true}).click();
    await page.locator('.wheel--interactive').waitFor({timeout:30_000});await shape.locator(':scope > summary').click();
    await shape.locator('[data-context-create]').click();await shape.locator('[data-context-image]').waitFor({timeout:20_000});
    check('context recovery: reloaded real renderer prepares an image',await shape.locator('[data-context-image]').isVisible());
    check('context recovery: no unexpected browser failures',!errors.length&&!consoleErrors.some(e=>contextConsoleFailure(e,expected))&&!requests.some(r=>!expected.has(r.url)||r.error!=='net::ERR_FAILED'),JSON.stringify({errors,consoleErrors,requests}));
  }finally{await recovery.close();}
  if(outDir)await writeFile(`${outDir}/measurements.json`,JSON.stringify(measurements,null,2));
}
