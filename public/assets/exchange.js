/* Generated from src/exchange/ by scripts/build-exchange.mjs — do not edit directly. */
"use strict";(()=>{var gt=`
.zme {
  --zx-ink: #EEF1F7;
  --zx-ink-2: #C6CCDA;
  --zx-dim: #8E96AB;
  --zx-hair: rgba(198,204,218,.10);
  --zx-hair-2: rgba(198,204,218,.22);
  --zx-surface: rgba(13,16,25,.94);
  display: block;
  margin: 34px 0 0;
  color: var(--zx-ink-2);
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
}
.zme *, .zme *::before, .zme *::after { box-sizing: border-box; }
.zme__noscript { color: var(--zx-dim); }
.zme a { color: var(--zx-ink); }

.zme__grid {
  display: grid;
  grid-template-columns: 218px minmax(0, 1fr) 340px;
  gap: 14px;
  align-items: start;
}
@media (max-width: 1180px) {
  .zme__grid { grid-template-columns: minmax(0, 1fr) 340px; }
  .zme__rail { grid-column: 1 / -1; }
}
@media (max-width: 800px) {
  .zme__grid { grid-template-columns: minmax(0, 1fr); }
}

.zme__card {
  border: 1px solid var(--zx-hair);
  border-radius: 18px;
  background: var(--zx-surface);
  padding: 16px;
  min-width: 0;
}
.zme__card-head {
  display: flex; align-items: baseline; justify-content: space-between; gap: 10px;
  margin: 0 0 12px; padding: 0 0 10px;
  border-bottom: 1px solid var(--zx-hair);
}
.zme__card-title {
  margin: 0;
  color: var(--zx-ink);
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 17px;
  font-weight: 500;
  letter-spacing: 0.01em;
}
.zme__card-note {
  color: var(--zx-dim);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  letter-spacing: 0.05em;
}
.zme__center { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.zme__scope {
  margin: -4px 0 10px;
  color: var(--zx-dim);
  font-size: 11.5px;
  line-height: 1.5;
}

/* ── the rail ─────────────────────────────────────────────────────────── */
.zme__rail { padding: 8px; }
.zme__rail-list { display: flex; flex-direction: column; gap: 2px; margin: 0; padding: 0; list-style: none; }
@media (max-width: 1180px) {
  .zme__rail-list { flex-direction: row; overflow-x: auto; padding-bottom: 4px; }
}
.zme__rail-item {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 10px;
  width: 100%;
  padding: 8px 10px;
  border: 0;
  border-radius: 12px;
  background: none;
  color: var(--zx-ink-2);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background 200ms cubic-bezier(0.4,0,0.2,1);
}
@media (max-width: 1180px) {
  .zme__rail-item { width: auto; min-width: 168px; flex: 0 0 auto; }
}
.zme__rail-item:hover { background: color-mix(in srgb, var(--sign, #C6CCDA) 10%, transparent); }
.zme__rail-item:disabled { cursor: wait; opacity: 0.58; }
.zme__rail-item[aria-pressed='true'] {
  background: color-mix(in srgb, var(--sign, #C6CCDA) 15%, transparent);
  color: var(--zx-ink);
}
.zme__rail-disc { width: 30px; height: 30px; border-radius: 50%; display: block; }
.zme__rail-name { font-weight: 550; font-size: 13.5px; line-height: 1.2; }
.zme__rail-quote {
  display: flex; flex-direction: column; align-items: flex-end;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px; line-height: 1.35;
}
.zme__rail-price { color: var(--zx-ink); }
.zme__rail-change { color: var(--zx-dim); }
.zme__rail-change--up { color: color-mix(in srgb, var(--sign, #C6CCDA) 78%, #EEF1F7); }

/* ── chart ────────────────────────────────────────────────────────────── */
.zme__frames { display: inline-flex; gap: 2px; }
.zme__frame {
  padding: 4px 9px;
  border: 0; border-radius: 8px;
  background: none;
  color: var(--zx-dim);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  cursor: pointer;
}
.zme__frame:hover { color: var(--zx-ink); }
.zme__frame[aria-pressed='true'] { background: var(--zx-hair); color: var(--zx-ink); }
.zme__readout {
  min-height: 16px;
  margin: 0 0 6px;
  color: var(--zx-dim);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px;
  letter-spacing: 0.02em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.zme__canvas-box { position: relative; height: 320px; }
.zme__canvas { display: block; width: 100%; height: 100%; }
.zme__chart-foot {
  display: flex; justify-content: space-between; gap: 10px;
  margin-top: 8px;
  color: var(--zx-dim);
  font-size: 11.5px;
}
.zme__chart-foot a { color: var(--zx-dim); }
.zme__chart-foot a:hover { color: var(--zx-ink); }

/* ── tape ─────────────────────────────────────────────────────────────── */
.zme-tape__scroll { overflow-x: auto; }
.zme-tape__table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
}
.zme-tape__table th {
  padding: 4px 8px;
  border-bottom: 1px solid var(--zx-hair);
  color: var(--zx-dim);
  font-weight: 400;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: right;
}
.zme-tape__table th:first-child, .zme-tape__table td:first-child { text-align: left; }
.zme-tape__table td { padding: 4px 8px; border-bottom: 1px solid var(--zx-hair); text-align: right; white-space: nowrap; }
.zme-tape__table td:first-child { color: var(--zx-dim); }
.zme-tape__row--buy .zme-tape__side { color: color-mix(in srgb, var(--sign, #C6CCDA) 82%, #EEF1F7); }
.zme-tape__row--sell .zme-tape__side { color: var(--zx-dim); }
.zme-tape__table tr.is-fresh td { background: color-mix(in srgb, var(--sign, #C6CCDA) 6%, transparent); }

/* ── desk column ──────────────────────────────────────────────────────── */
.zme__desk { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.zme__panel-host { min-height: 120px; }

.zme__ladder-refresh {
  padding: 4px 10px;
  border: 1px solid var(--zx-hair-2);
  border-radius: 999px;
  background: none;
  color: var(--zx-ink-2);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px;
  cursor: pointer;
}
.zme__ladder-refresh:hover { color: var(--zx-ink); }
.zme__ladder-refresh[disabled] { color: var(--zx-dim); cursor: default; }
.zme__ladder-table {
  width: 100%;
  border-collapse: collapse;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px;
}
.zme__ladder-table th {
  padding: 4px 8px;
  border-bottom: 1px solid var(--zx-hair);
  color: var(--zx-dim);
  font-weight: 400;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  text-align: right;
}
.zme__ladder-table td { padding: 4px 8px; text-align: right; white-space: nowrap; }
.zme__ladder-table .zme__ladder-side { text-align: left; color: var(--zx-dim); }
.zme__ladder-row--buy .zme__ladder-side { color: color-mix(in srgb, var(--sign, #C6CCDA) 82%, #EEF1F7); }
.zme__ladder-caption {
  margin: 10px 0 0;
  color: var(--zx-dim);
  font-size: 11.5px;
  line-height: 1.55;
}

.zme__stats { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }
.zme__stat { display: flex; flex-direction: column; gap: 3px; }
.zme__stat-label {
  color: var(--zx-dim);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.zme__stat-value {
  color: var(--zx-ink);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 12.5px;
}

.zme__state {
  padding: 26px 10px;
  color: var(--zx-dim);
  font-size: 12.5px;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .zme__rail-item, .zme__frame { transition: none; }
}
`;var te=[{slug:"aries",name:"Aries",glyph:"♈",hue:"#DE8E79"},{slug:"taurus",name:"Taurus",glyph:"♉",hue:"#B9D4BE"},{slug:"gemini",name:"Gemini",glyph:"♊",hue:"#B29DD0"},{slug:"cancer",name:"Cancer",glyph:"♋",hue:"#B6D4E4"},{slug:"leo",name:"Leo",glyph:"♌",hue:"#E0A9B4"},{slug:"virgo",name:"Virgo",glyph:"♍",hue:"#B7D9B0"},{slug:"libra",name:"Libra",glyph:"♎",hue:"#D3A9DE"},{slug:"scorpio",name:"Scorpio",glyph:"♏",hue:"#B9DCE8"},{slug:"sagittarius",name:"Sagittarius",glyph:"♐",hue:"#E0B080"},{slug:"capricorn",name:"Capricorn",glyph:"♑",hue:"#C0DEA8"},{slug:"aquarius",name:"Aquarius",glyph:"♒",hue:"#AE8FC9"},{slug:"pisces",name:"Pisces",glyph:"♓",hue:"#A9D4C4"}];var dn={aries:"HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS",taurus:"2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu",gemini:"HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9",cancer:null,leo:"48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ",virgo:"5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh",libra:"DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9",scorpio:"3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta",sagittarius:null,capricorn:"549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin",aquarius:"BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv",pisces:"Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko"};function mn(e,n){if(!Array.isArray(e)||!n)return null;let t=null,r=-1;for(let o of e){if(o?.chainId!=="solana"||!o?.pairAddress||o?.baseToken?.address!==n)continue;let i=Number(o?.liquidity?.usd);!Number.isFinite(i)||i<=0||i>r&&(r=i,t=String(o.pairAddress))}return t}function bt({slug:e,mint:n,rows:t}){return dn[e]??mn(t,n)}var _t="https://api.geckoterminal.com/api/v2",xt="https://www.geckoterminal.com/";var fn="zodiacs.exchange.gecko-budget.v1",pn="zodiacs.exchange.gecko-cooloff.v1",dr=Object.freeze(["network","rate_limited","unavailable","not_indexed"]),qe=class extends Error{constructor(n,t,{cause:r,retryAfterMs:o=null}={}){super(t,r?{cause:r}:void 0),this.name="ExchangeDataError",this.code=n,this.retryAfterMs=Number.isFinite(o)&&o>=0?o:null}};function q(e,n,t){throw new qe(e,n,t)}var Pe=Object.freeze({"15m":{path:"minute",aggregate:15,limit:192},"1h":{path:"hour",aggregate:1,limit:168},"4h":{path:"hour",aggregate:4,limit:180},"1d":{path:"day",aggregate:1,limit:180}});function hn({pool:e,timeframe:n,baseUrl:t=_t}){let r=Pe[n];r||q("unavailable",`Unknown timeframe: ${n}`);let o=new URL(`${t}/networks/solana/pools/${encodeURIComponent(e)}/ohlcv/${r.path}`);return o.searchParams.set("aggregate",String(r.aggregate)),o.searchParams.set("limit",String(r.limit)),o.toString()}function gn({pool:e,baseUrl:n=_t}){return new URL(`${n}/networks/solana/pools/${encodeURIComponent(e)}/trades`).toString()}function bn(e){(!e?.data||typeof e.data!="object")&&q("unavailable","The chart data was not readable.");let n=e.data.attributes?.ohlcv_list;if(n===void 0)return[];Array.isArray(n)||q("unavailable","The chart data was not readable.");let t=[];for(let r of n){if(!Array.isArray(r)||r.length<6)continue;let[o,i,s,m,d,l]=r.map(Number);[o,i,s,m,d,l].every(Number.isFinite)&&(o<=0||i<=0||s<=0||m<=0||d<=0||l<0||t.push({ts:o,o:i,h:s,l:m,c:d,v:l}))}return t.sort((r,o)=>r.ts-o.ts),t}function _n(e,n){let t=e?.data;Array.isArray(t)||q("unavailable","The trade data was not readable.");let r=[];for(let o of t){let i=o?.attributes;if(!i)continue;let s=Date.parse(i.block_timestamp??"");if(!Number.isFinite(s))continue;let m,d;if(i.to_token_address===n)m=Number(i.to_token_amount),d=Number(i.price_to_in_usd);else if(i.from_token_address===n)m=Number(i.from_token_amount),d=Number(i.price_from_in_usd);else continue;let l=i.kind==="buy"||i.kind==="sell"?i.kind:null,_=Number(i.volume_in_usd);!l||!Number.isFinite(m)||m<=0||!Number.isFinite(d)||d<=0||r.push({id:String(o.id??`${i.tx_hash}-${s}`),ts:s,side:l,tokenAmount:m,priceUsd:d,volumeUsd:Number.isFinite(_)?_:null,tx:typeof i.tx_hash=="string"?i.tx_hash:null})}return r.sort((o,i)=>i.ts-o.ts),r}function yt({limit:e=12,windowMs:n=6e4,now:t=()=>Date.now(),storage:r=null,storageKey:o=fn}={}){let i=[],s=!!r;function m(){if(!s)return i;try{let l=JSON.parse(r.getItem(o)??"[]");if(Array.isArray(l))return l.filter(Number.isFinite)}catch{s=!1}return i}function d(l){if(i=l,!!s)try{r.setItem(o,JSON.stringify(l))}catch{s=!1}}return{take(){let l=t(),_=l-n,h=m().filter(b=>b>_&&b<=l);return h.length>=e?(d(h),!1):(h.push(l),d(h),!0)}}}function xn(e,{now:n=()=>Date.now(),maxMs:t=12e4}={}){if(typeof e!="string"||!e.trim())return null;let r=e.trim(),o=Number(r);if(Number.isFinite(o)&&o>=0)return Math.min(Math.ceil(o*1e3),t);let i=Date.parse(r);return Number.isFinite(i)?Math.min(Math.max(0,i-n()),t):null}async function vt(e,{fetchImpl:n=globalThis.fetch,signal:t,deadlineMs:r=12e3}={}){let o=new AbortController,i=!1,s=()=>o.abort();t?.aborted?s():t?.addEventListener("abort",s,{once:!0});let m=setTimeout(()=>{i=!0,o.abort()},r);try{let d;try{d=await n(e,{method:"GET",signal:o.signal,headers:{accept:"application/json"}})}catch(l){if(t?.aborted||(i&&q("network","The chart service timed out.",{cause:l}),l?.name==="AbortError"))throw l;q("network","The chart service could not be reached just now.",{cause:l})}d.status===429&&q("rate_limited","The chart service is rate limiting requests.",{retryAfterMs:xn(d.headers?.get?.("retry-after")??null)}),d.status===404&&q("not_indexed","This pool is not indexed by the chart service."),d.ok||q("unavailable","The chart service did not answer.");try{return await d.json()}catch(l){if(t?.aborted||(i&&q("network","The chart service timed out.",{cause:l}),l?.name==="AbortError"))throw l;q("unavailable","The chart service did not return a readable answer.",{cause:l})}}finally{clearTimeout(m),t?.removeEventListener("abort",s)}}function wt({baseMs:e=1e4,maxMs:n=12e4,now:t=()=>Date.now(),storage:r=null,storageKey:o=pn}={}){let i={until:0,step:0,revision:0},s=!!r;function m(){if(!s)return i;try{let l=JSON.parse(r.getItem(o)??"null");l&&[l.until,l.step,l.revision].every(Number.isFinite)&&(i=l)}catch{s=!1}return i}function d(l){if(i=l,!!s)try{r.setItem(o,JSON.stringify(l))}catch{s=!1}}return{active(){return t()<m().until},remainingMs(){return Math.max(0,m().until-t())},token(){return m().revision},fail(l=null){let _=m(),h=Math.min(e*2**_.step,n),b=Number.isFinite(l)?Math.min(Math.max(0,l),n):0,c=t()+Math.max(h,b);d({until:Math.max(_.until,c),step:_.step+1,revision:_.revision+1})},ok(l=null){let _=m();return l!==null&&l!==_.revision?!1:(d({until:0,step:0,revision:_.revision+1}),!0)}}}async function Et({pool:e,timeframe:n,baseUrl:t,fetchImpl:r,signal:o,deadlineMs:i}){let s=await vt(hn({pool:e,timeframe:n,baseUrl:t}),{fetchImpl:r,signal:o,deadlineMs:i});return bn(s)}async function zt({pool:e,mint:n,baseUrl:t,fetchImpl:r,signal:o,deadlineMs:i}){let s=await vt(gn({pool:e,baseUrl:t}),{fetchImpl:r,signal:o,deadlineMs:i});return _n(s,n)}function Tt(e,n){let t=String(n||"");if(!t||!Array.isArray(e))return null;let r=new Set,o=0;for(let i of e){if(i?.chainId!=="solana"||i?.baseToken?.address!==t)continue;let s=String(i?.pairAddress||"");if(!s||r.has(s))continue;let m=Number(i?.liquidity?.usd);!Number.isFinite(m)||m<=0||(r.add(s),o+=m)}return o>0?o:null}var St="https://api.dexscreener.com/tokens/v1/solana";function yn(e,n=St){return`${n}/${e.map(t=>encodeURIComponent(t)).join(",")}`}function vn(e,n){let t={};if(!Array.isArray(e))return t;for(let r of n){let o=null,i=-1;for(let d of e){if(d?.chainId!=="solana"||!d?.pairAddress||d?.baseToken?.address!==r)continue;let l=Number(d?.liquidity?.usd)||0;l>i&&(i=l,o=d)}if(!o)continue;let s=Number(o.priceUsd),m=Number(o.priceChange?.h24);t[r]={priceUsd:Number.isFinite(s)&&s>0?s:null,change24hPct:Number.isFinite(m)?m:null,liquidityUsd:Tt(e,r)}}return t}async function At({mints:e,baseUrl:n=St,fetchImpl:t=globalThis.fetch,signal:r}={}){if(!Array.isArray(e)||e.length===0)return{stats:{},rows:[]};let o=await t(yn(e,n),{method:"GET",headers:{accept:"application/json"},signal:r});if(!o.ok)throw new Error(`stats ${o.status}`);let i=await o.json();return{stats:vn(i,e),rows:Array.isArray(i)?i:[]}}var wn="https://lite-api.jup.ag";var gr=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_unconfirmed","execute_failed"]),ve=class extends Error{constructor(n,t,{cause:r,retryAfterMs:o=null}={}){super(t,r?{cause:r}:void 0),this.name="TradeError",this.code=n,this.retryAfterMs=o}};function C(e,n,t){throw new ve(e,n,t)}var Be=Object.freeze({background:0,quote:1,trade:2}),$e=Symbol.for("zodiacs.registry.jupiter-request-gate");function je(){return Object.assign(new Error("The request was cancelled."),{name:"AbortError"})}function En({spacingMs:e=2100,now:n=Date.now,setTimeout:t=setTimeout,clearTimeout:r=clearTimeout}={}){let o=0,i=!1,s=null,m=Number.NEGATIVE_INFINITY,d=[];function l(c){let g=d.indexOf(c);g>=0&&d.splice(g,1),c.signal?.removeEventListener?.("abort",c.onAbort)}function _(){let c=0;for(let g=1;g<d.length;g+=1){let y=d[g],N=d[c],M=Be[y.requestClass],z=Be[N.requestClass];(M>z||M===z&&y.sequence<N.sequence)&&(c=g)}return d.splice(c,1)[0]}function h(){if(i||s)return;for(let y=d.length-1;y>=0;y-=1){if(!d[y].signal?.aborted)continue;let N=d[y];l(N),N.reject(je())}if(!d.length)return;let c=Math.max(0,m+e-n());if(c>0){s=t(()=>{s=null,h()},c);return}let g=_();g.started=!0,g.signal?.removeEventListener?.("abort",g.onAbort),i=!0,m=n(),Promise.resolve().then(()=>g.task()).then(g.resolve,g.reject).finally(()=>{i=!1,h()})}function b(c,{requestClass:g="quote",signal:y}={}){return y?.aborted?Promise.reject(je()):new Promise((N,M)=>{let z={task:c,requestClass:Object.prototype.hasOwnProperty.call(Be,g)?g:"quote",signal:y,sequence:o+=1,started:!1,resolve:N,reject:M,onAbort:null};z.onAbort=()=>{z.started||(l(z),M(je()),!d.length&&s&&(r(s),s=null),h())},y?.addEventListener?.("abort",z.onAbort,{once:!0}),d.push(z),h()})}return Object.freeze({schedule:b})}function zn(){return typeof window>"u"?null:(globalThis[$e]||(globalThis[$e]=En()),globalThis[$e])}function Tn(e,n){let t=zn();return t?t.schedule(e,n):e()}function Sn(e,n){let t=new AbortController,r=!1,o=()=>t.abort();e?.aborted?t.abort():e?.addEventListener?.("abort",o,{once:!0});let i=setTimeout(()=>{r=!0,t.abort()},n);return{signal:t.signal,timedOut:()=>r,cleanup(){clearTimeout(i),e?.removeEventListener?.("abort",o)}}}function An(e,n=Date.now()){let t=e?.headers?.get?.("retry-after");if(!t)return null;let r=Number(t),o=Number.isFinite(r)?r*1e3:Date.parse(t)-n;return!Number.isFinite(o)||o<0?null:Math.min(12e4,Math.round(o))}function Ge(e,n){let t=String(e??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(t)||C("invalid_amount","Enter an amount using digits and a single decimal point.");let[r="",o=""]=t.split(".");o.length>n&&C("invalid_amount",`That amount is finer than this token's ${n} decimals.`);let i=BigInt((r||"0")+o.padEnd(n,"0"));return i<=0n&&C("invalid_amount","Enter an amount greater than zero."),i}function Ve(e,n,{maxFractionDigits:t=n}={}){let r=BigInt(e),o=r<0n,i=(o?-r:r).toString().padStart(n+1,"0"),s=i.slice(0,i.length-n),m=n>0?i.slice(i.length-n):"";return t<m.length&&(m=m.slice(0,t)),m=m.replace(/0+$/,""),`${o?"-":""}${s}${m?`.${m}`:""}`}function Cn(e,n){let t=new URL("/ultra/v1/order",e);for(let[r,o]of Object.entries(n))o!=null&&o!==""&&t.searchParams.set(r,String(o));return t.toString()}async function Nn(e){try{return await e.json()}catch(n){if(n?.name==="AbortError")throw n;C("unavailable","The venue did not return a readable answer.",{cause:n})}}async function Ct({inputMint:e,outputMint:n,amount:t,taker:r,baseUrl:o=wn,fetchImpl:i=globalThis.fetch,signal:s,requestClass:m=r?"trade":"quote",deadlineMs:d=12e3}){let l=Cn(o,{inputMint:e,outputMint:n,amount:String(t),taker:r}),_=null;try{let h;try{h=await Tn(()=>(_=Sn(s,d),i(l,{method:"GET",signal:_.signal,headers:{accept:"application/json"}})),{requestClass:m,signal:s})}catch(c){if(c?.name==="AbortError"&&!_?.timedOut())throw c;C("network","The price could not be reached just now.",{cause:c})}h.status===429&&C("rate_limited","The venue is rate limiting requests. Try again shortly.",{retryAfterMs:An(h)}),h.status>=500&&C("unavailable","The venue did not answer.");let b;try{b=await Nn(h)}catch(c){throw c?.name==="AbortError"&&_?.timedOut()&&C("network","The price could not be reached just now.",{cause:c}),c}if(b?.error||!h.ok){let c=typeof b?.error=="string"?b.error:"no route";/quote|route|liquidity/i.test(c)&&C("no_route","No route is available for that amount right now."),C("unavailable","The venue could not price that trade.")}return kn(b)}catch(h){if(h instanceof ve||h?.name==="AbortError")throw h;C("network","The price could not be reached just now.",{cause:h})}finally{_?.cleanup()}}function kn(e){(!e||typeof e!="object")&&C("unavailable","The venue returned no order.");let{inputMint:n,outputMint:t,inAmount:r,outAmount:o,requestId:i}=e;(!n||!t||!r||!o)&&C("unavailable","The venue returned an incomplete order.");let s,m;try{s=BigInt(r),m=BigInt(o)}catch(g){C("unavailable","The venue returned unreadable amounts.",{cause:g})}let d=e.platformFee?.feeBps??e.feeBps,l=typeof d=="number"||typeof d=="string"&&d.trim()!=="",_=Number(d);(!l||!Number.isInteger(_)||_<0||_>10)&&C("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet.");let h=e.priceImpactPct,b=typeof h=="number"||typeof h=="string"&&h.trim()!=="",c=Number(h);return(!b||!Number.isFinite(c))&&C("unavailable","The venue returned no readable price impact."),{inputMint:n,outputMint:t,inAmount:s,outAmount:m,priceImpactPct:c,feeBps:_,routeLabels:Array.isArray(e.routePlan)?e.routePlan.map(g=>g?.swapInfo?.label).filter(Boolean):[],requestId:i??null,transaction:e.transaction??null,inUsdValue:Number(e.inUsdValue??0),outUsdValue:Number(e.outUsdValue??0)}}function Nt(e,n){return(e.inputMint!==n.inputMint||e.outputMint!==n.outputMint)&&C("order_mismatch","The venue answered for a different token than the one shown."),e.inAmount!==BigInt(n.amount)&&C("order_mismatch","The venue answered for a different amount than the one entered."),e.outAmount<=0n&&C("order_mismatch","The venue returned an empty amount."),(!Number.isInteger(e.feeBps)||e.feeBps<0||e.feeBps>10)&&C("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet."),e}var yr=Object.freeze(["card","usdc"]),vr=Object.freeze(["idle","quoting","ready","signing","done","error"]),He="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",kt=6;var wr=Object.freeze(["25","50","100","250"]),Er=Object.freeze([{name:"Coinbase",mark:"coinbase",href:"https://www.coinbase.com/",note:"Fund a wallet with USDC."},{name:"fomo",mark:"fomo",href:"https://fomo.family/",applePay:!0,note:"Fund in-app; verify the mint."},{name:"MoonPay",mark:"moonpay",href:"https://www.moonpay.com/",note:"Buy USDC by card or bank."},{name:"Ramp Network",mark:"ramp",href:"https://rampnetwork.com/",note:"Buy USDC with mobile pay."}]);var Rt=6,Rn=Object.freeze(["25","100","250","500","1000"]),Dt=12,Dn=10n**BigInt(Dt),Je=2100;function Mt(e,n){let t=BigInt(e),r=BigInt(n);return t<=0n||r<=0n?null:t*Dn/r}function Ln(e){return e==null?null:Ve(e,Dt)}function Un(e,n,t){if(!e||!n||n<=0n)return null;let o=(t==="sell"?n-e:e-n)*10000n/n;return o<0n?0:Number(o)}function In(e,n){let t=Number(e),r=Number(n);if(!Number.isFinite(t)||t<=0||!Number.isFinite(r)||r<=0)return null;let o=t/r;return!Number.isFinite(o)||o<=0?null:o.toFixed(Rt)}var On=e=>new Promise(n=>{setTimeout(n,e)});async function Ke({mint:e,side:n,notionals:t=Rn,midPriceUsd:r=null,fetchImpl:o,signal:i,spacingMs:s=Je,sleep:m=On,deadlineMs:d}){let l=[],_=null;for(let h=0;h<t.length;h+=1){let b=t[h];if(i?.aborted||(h>0&&s>0&&await m(s),i?.aborted))break;try{let c;if(n==="sell"){let N=In(b,r);if(!N){l.push({notional:b,error:"unavailable"});continue}c={inputMint:e,outputMint:He,amount:Ge(N,Rt)}}else c={inputMint:He,outputMint:e,amount:Ge(b,kt)};let g=await Ct({...c,fetchImpl:o,signal:i,requestClass:"background",deadlineMs:d});Nt(g,c);let y=n==="sell"?Mt(g.outAmount,g.inAmount):Mt(g.inAmount,g.outAmount);if(!y){l.push({notional:b,error:"unavailable"});continue}h===0&&(_=y),l.push({notional:b,priceScaled:y,price:Ln(y),impactBps:Un(y,_,n),priceImpactPct:g.priceImpactPct})}catch(c){if(c?.name==="AbortError")throw c;if(c?.code==="rate_limited")return{side:n,rungs:l,halted:"rate_limited",retryAfterMs:c.retryAfterMs};l.push({notional:b,error:c?.code??"unavailable"})}}return{side:n,rungs:l}}function Ut(e){let n=1/0,t=-1/0;for(let o of e)o.l<n&&(n=o.l),o.h>t&&(t=o.h);if(!Number.isFinite(n)||!Number.isFinite(t))return null;if(n===t){let o=n===0?1:Math.abs(n)*.05;return{min:n-o,max:t+o}}let r=(t-n)*.08;return{min:Math.max(0,n-r),max:t+r}}function It(e){let n=0;for(let t of e)t.v>n&&(n=t.v);return n}function Ot(e,n,t=4){if(!(n>e)||t<1)return[];let r=n-e,o=10**Math.floor(Math.log10(r/(t+1))),i=o*10;for(let m of[1,2,5,10])if(r/(o*m)<=t+1){i=o*m;break}let s=[];for(let m=Math.ceil(e/i)*i;m<=n;m+=i)s.push(m);return s}function Ft(e,n){if(e<=0||n<=0)return{step:0,bodyWidth:0,centers:[]};let t=n/e,r=Math.max(1,Math.min(t*.68,13)),o=[];for(let i=0;i<e;i+=1)o.push(t*i+t/2);return{step:t,bodyWidth:r,centers:o}}function ne(e,n,t){let r=n.max-n.min;return r<=0?t/2:t-(e-n.min)/r*t}function qt(e,n,t){if(n<=0||t<=0||e<0||e>=t)return null;let r=Math.floor(e/t*n);return r>=0&&r<n?r:null}function Pt(e,n,t=6){if(!e.length)return[];let r=[],o=Math.max(1,Math.ceil(e.length/t));for(let i=0;i<e.length;i+=o)r.push(i);return r}function L(e){let n=Number(e);if(!Number.isFinite(n))return"—";if(n===0)return"0";let t=Math.max(0,3-Math.floor(Math.log10(Math.abs(n))));return n.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:Math.min(t,12)})}function we(e){let n=Number(e);return Number.isFinite(n)?Math.abs(n)>=1e3?`$${n.toLocaleString("en-US",{maximumFractionDigits:0})}`:`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}function Bt(e){let n=Number(e);return Number.isFinite(n)?n>=1e3?n.toLocaleString("en-US",{maximumFractionDigits:0}):n.toLocaleString("en-US",{maximumFractionDigits:2}):"—"}var Lt=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function Ye(e,n){let t=new Date(e*1e3);if(Number.isNaN(t.getTime()))return"—";if(n==="1d")return`${t.getUTCDate()} ${Lt[t.getUTCMonth()]}`;let r=String(t.getUTCHours()).padStart(2,"0"),o=String(t.getUTCMinutes()).padStart(2,"0");return`${t.getUTCDate()} ${Lt[t.getUTCMonth()]} ${r}:${o}`}function $t(e,n){let t=Math.max(0,Math.round((n-e)/1e3));if(t<60)return`${t}s ago`;let r=Math.floor(t/60);if(r<60)return`${r}m ago`;let o=Math.floor(r/60);return o<24?`${o}h ago`:`${Math.floor(o/24)}d ago`}var jt=74,Gt=22,Fn=.16;var Ee="#8E96AB",qn="rgba(198,204,218,0.10)",Pn="rgba(198,204,218,0.22)",Bn="11px 'JetBrains Mono', ui-monospace, monospace";function Vt({canvas:e,readout:n}){let t=e.getContext("2d"),r=[],o="1h",i=Ee,s=null;function m(){let c=e.getBoundingClientRect();return{width:c.width,height:c.height}}function d(){let{width:c,height:g}=m();if(c<=0||g<=0)return;let y=window.devicePixelRatio||1;if((e.width!==Math.round(c*y)||e.height!==Math.round(g*y))&&(e.width=Math.round(c*y),e.height=Math.round(g*y)),t.setTransform(y,0,0,y,0,0),t.clearRect(0,0,c,g),!r.length)return;let N=c-jt,M=g-Gt,z=Math.round(M*Fn),G=M-z-6,B=Ut(r);if(!B)return;let{bodyWidth:F,centers:J}=Ft(r.length,N),re=It(r);t.font=Bn,t.textBaseline="middle";for(let S of Ot(B.min,B.max)){let E=ne(S,B,G);t.strokeStyle=qn,t.beginPath(),t.moveTo(0,E+.5),t.lineTo(N,E+.5),t.stroke(),t.fillStyle=Ee,t.textAlign="left",t.fillText(L(S),N+8,E)}if(re>0)for(let S=0;S<r.length;S+=1){let E=r[S],U=Math.max(1,E.v/re*z);t.fillStyle=E.c>=E.o?`${i}55`:"rgba(142,150,171,0.30)",t.fillRect(J[S]-F/2,M-U,F,U)}for(let S=0;S<r.length;S+=1){let E=r[S],U=J[S],oe=E.c>=E.o,fe=oe?i:Ee,j=ne(E.h,B,G),pe=ne(E.l,B,G),ie=ne(E.o,B,G),he=ne(E.c,B,G);t.strokeStyle=fe,t.lineWidth=1,t.beginPath(),t.moveTo(U+.5,j),t.lineTo(U+.5,pe),t.stroke();let I=Math.min(ie,he),ge=Math.max(1,Math.abs(he-ie));oe?(t.fillStyle=fe,t.fillRect(U-F/2,I,F,ge)):t.strokeRect(U-F/2+.5,I+.5,F-1,Math.max(1,ge-1))}t.fillStyle=Ee,t.textAlign="center";for(let S of Pt(r,o)){let E=Ye(r[S].ts,o),U=Math.min(Math.max(J[S],24),N-24);t.fillText(E,U,g-Gt/2)}if(s!==null&&r[s]){let S=J[s];t.strokeStyle=Pn,t.setLineDash([3,3]),t.beginPath(),t.moveTo(S+.5,0),t.lineTo(S+.5,M),t.stroke(),t.setLineDash([])}}function l(){if(!n)return;let c=s!==null?r[s]:r[r.length-1];if(!c){n.textContent="";return}n.textContent=[Ye(c.ts,o),`O ${L(c.o)}`,`H ${L(c.h)}`,`L ${L(c.l)}`,`C ${L(c.c)}`,`Vol $${L(c.v)}`].join("  ")}function _(c){let g=e.getBoundingClientRect(),y=qt(c.clientX-g.left,r.length,g.width-jt);y!==s&&(s=y,d(),l())}function h(){s=null,d(),l()}e.addEventListener("pointermove",_),e.addEventListener("pointerleave",h);let b=typeof ResizeObserver=="function"?new ResizeObserver(()=>d()):null;return b?.observe(e),{set({candles:c,timeframe:g,hue:y}){r=Array.isArray(c)?c:[],g&&(o=g),y&&(i=y),s=null,d(),l()},clear(){r=[],s=null,d(),l()},destroy(){b?.disconnect(),e.removeEventListener("pointermove",_),e.removeEventListener("pointerleave",h)}}}var $n=40;function P(e,n,t){let r=document.createElement(e);return n&&(r.className=n),t!=null&&(r.textContent=t),r}function Ht({host:e,now:n=()=>Date.now()}){let t=P("table","zme-tape__table"),r=P("thead"),o=P("tr");for(let m of["Age","Side","Amount","Price","Value"])o.append(P("th",null,m));r.append(o);let i=P("tbody");t.append(r,i),e.append(t);let s=null;return{set(m,{symbol:d}={}){let l=m.slice(0,$n),_=n(),h=s;i.replaceChildren(...l.map(b=>{let c=P("tr",b.side==="buy"?"zme-tape__row--buy":"zme-tape__row--sell");return h&&!h.has(b.id)&&c.classList.add("is-fresh"),c.append(P("td",null,$t(b.ts,_)),P("td","zme-tape__side",b.side==="buy"?"Buy":"Sell"),P("td",null,`${Bt(b.tokenAmount)}${d?` ${d}`:""}`),P("td",null,L(b.priceUsd)),P("td",null,b.volumeUsd===null?"—":we(b.volumeUsd))),c})),s=new Set(l.map(b=>b.id))},clear(){i.replaceChildren(),s=null},destroy(){t.remove()}}}var jn=Object.freeze({exchange_room_mount:Object.freeze({}),exchange_market_state:Object.freeze({surface:Object.freeze(["chart","tape","ladder","panel"]),outcome:Object.freeze(["ready","empty","partial","not_indexed","rate_limited","unavailable"])})});function Gn(e,n={}){let t=jn[e];if(!t)return null;let r={};for(let[o,i]of Object.entries(t)){let s=n[o];if(typeof s!="string"||!i.includes(s))return null;r[o]=s}return r}function ze(e,n={},t=globalThis.window?.plausible){let r=Gn(e,n);if(!r||typeof t!="function")return!1;try{return t(e,{props:r}),!0}catch{return!1}}var Vn="/registry/zodiacs.registry.json",Hn=12e3,Jn=1e4,Kn=6e4,Yn=6e4,Wn=2e4,We=3e4,Jt=8e3,Kt=.12;function Yt(e,n=Math.random){let t=Math.min(1,Math.max(0,Number(n())||0)),r=1-Kt+t*Kt*2;return Math.round(e*r)}function Qn(e,n){return e!==n}function Wt(e,n,t){if(!e?.controller.signal.aborted&&!Qn(e?.key??null,n))return null;e?.controller.abort();let r=new AbortController,o=()=>r.abort();return t.aborted?r.abort():t.addEventListener("abort",o,{once:!0}),{key:n,controller:r,detach(){t.removeEventListener("abort",o)}}}function Qt(e,n){return e===n&&!n.controller.signal.aborted}function Zn(e){return e?.controller?.state?.state==="signing"}var Xn="These pools have no order book. Each rung is an indicative Jupiter quote at the time requested; price comes from the returned atomic amounts and “vs best” compares the smallest rung. Sell sizes are estimates from the indexed mid. Quotes with unreadable fee or impact fields, or a fee above 0.10%, are refused. A trade is quoted again before wallet review.",er="Reference market — the sign’s canonical pool. Orders execute through Jupiter and may route beyond it.",tr="Indicative aggregate quote — Jupiter may route across several pools; a trade is quoted again before wallet review.";function f(e,n,t){let r=document.createElement(e);return n&&(r.className=n),t!=null&&(r.textContent=t),r}function Z(e){return f("p","zme__state",e)}function nr(e,n){let t=new AbortController,r=setTimeout(()=>t.abort(),n);return fetch(e,{cache:"no-store",signal:t.signal}).finally(()=>clearTimeout(r))}async function rr(){let e=await nr(Vn,Hn);if(!e.ok)throw new Error(`registry ${e.status}`);let n=await e.json(),t=new Map;for(let r of n?.assets??[]){let o=r?.native;o?.chain!=="solana"||!o?.address||t.set(r.sign,{mint:o.address,symbol:o.symbol??""})}if(t.size!==te.length)throw new Error("registry: incomplete");return t}var Te=null;function or(){return Te||(Te=new Promise(e=>{if(window.zodiacsTrade){e(window.zodiacsTrade);return}let n=document.createElement("script");n.src="/assets/trade.js",n.defer=!0,n.addEventListener("load",()=>e(window.zodiacsTrade??null),{once:!0}),n.addEventListener("error",()=>e(null),{once:!0}),document.body.appendChild(n)}),Te)}var ir=new Set(te.map(e=>e.slug));function ar(){let e=(window.location.hash||"").replace(/^#/,"");return ir.has(e)?e:"aries"}function Zt({host:e}){let n=null;try{n=window.localStorage}catch{}let t=yt({storage:n}),r=wt({storage:n}),o=new Map;function i(a,u){o.get(a)!==u&&(o.set(a,u),ze("exchange_market_state",{surface:a,outcome:u}))}let s=f("div","zme__grid"),m=f("section","zme__card zme__rail");m.setAttribute("aria-label","The twelve records");let d=f("ul","zme__rail-list");m.append(d);let l=f("div","zme__center"),_=f("section","zme__card"),h=f("div","zme__card-head"),b=f("h2","zme__card-title","—"),c=f("div","zme__frames");c.setAttribute("role","group"),c.setAttribute("aria-label","Chart timeframe"),h.append(b,c);let g=f("p","zme__scope",er),y=f("p","zme__readout");y.id="zme-chart-readout";let N=f("div","zme__canvas-box"),M=f("canvas","zme__canvas");M.setAttribute("role","img"),M.setAttribute("aria-label","Candlestick chart of recent prices in the canonical pool"),M.setAttribute("aria-describedby","zme-chart-readout"),N.append(M);let z=Z("");z.hidden=!0;let G=f("div","zme__chart-foot"),B=f("span",null,"Independent third-party data, not a valuation or recommendation."),F=f("a",null,"Chart data by GeckoTerminal");F.href=xt,F.target="_blank",F.rel="noopener noreferrer external nofollow",G.append(B,F),_.append(h,g,y,N,z,G);let J=f("section","zme__card"),re=f("div","zme__card-head");re.append(f("h2","zme__card-title","Recent trades"),f("span","zme__card-note","canonical pool · newest first"));let S=f("div","zme-tape__scroll"),E=Z("");E.hidden=!0,J.append(re,S,E),l.append(_,J);let U=f("div","zme__desk"),oe=f("section","zme__card"),fe=f("p","zme__scope",tr),j=f("div","zme__panel-host");oe.append(fe,j);let pe=f("section","zme__card"),ie=f("div","zme__card-head"),he=f("h2","zme__card-title","Depth"),I=f("button","zme__ladder-refresh","Load depth");I.type="button",ie.append(he,I);let ge=f("span","zme__card-note","10 taker-less quotes · about 20 seconds"),Qe=f("table","zme__ladder-table"),Ze=f("thead"),Xe=f("tr"),en=f("th","zme__ladder-side","Side");for(let a of[null,"Size","Price","vs best"])Xe.append(a===null?en:f("th",null,a));Ze.append(Xe);let ae=f("tbody");Qe.append(Ze,ae);let V=Z("Load depth to request ten taker-less venue quotes."),tn=f("p","zme__ladder-caption",Xn);pe.append(ie,ge,Qe,V,tn);let et=f("section","zme__card"),tt=f("div","zme__card-head");tt.append(f("h2","zme__card-title","Market"),f("span","zme__card-note","Dex Screener · indexed"));let nt=f("div","zme__stats"),Se=a=>{let u=f("div","zme__stat"),p=f("span","zme__stat-value","—");return u.append(f("span","zme__stat-label",a),p),nt.append(u),p},nn=Se("Price"),rn=Se("24h"),on=Se("Indexed liquidity");et.append(tt,nt),U.append(oe,pe,et),s.append(m,l,U),e.append(s);let se=null,be=!1,Ae=!1,Ce=null,rt=[],ot={},A=null,K="1h",O=null,X=null,it=0,Ne=null,ke=null,Me=null,le=null,Re=null,ce=null,ue=null,de=null,_e=null,H=0,Y=!1,W=Vt({canvas:M,readout:y}),Q=Ht({host:S}),xe=new Map;for(let a of te){let u=f("li"),p=f("button","zme__rail-item");p.type="button",p.style.setProperty("--sign",a.hue),p.setAttribute("aria-pressed","false");let x=document.createElement("picture"),T=document.createElement("source");T.srcset=`/assets/zodiac-icons/128/${a.slug}.avif`,T.type="image/avif";let v=document.createElement("img");v.className="zme__rail-disc",v.src=`/assets/zodiac-icons/128/${a.slug}.webp`,v.width=30,v.height=30,v.alt="",v.loading="lazy",v.decoding="async",x.append(T,v);let D=f("span","zme__rail-name",a.name),k=f("span","zme__rail-quote"),R=f("span","zme__rail-price","—"),$=f("span","zme__rail-change","");k.append(R,$),p.append(x,D,k),p.addEventListener("click",()=>Fe(a.slug)),u.append(p),d.append(u),xe.set(a.slug,{button:p,price:R,change:$})}let at=new Map;for(let a of Object.keys(Pe)){let u=f("button","zme__frame",a);u.type="button",u.setAttribute("aria-pressed",String(a===K)),u.addEventListener("click",()=>{if(a!==K){K=a;for(let[p,x]of at)x.setAttribute("aria-pressed",String(p===K));ln()}}),c.append(u),at.set(a,u)}let De=a=>te.find(u=>u.slug===a)??null,ee=a=>se?.get(a)??null,Le=a=>{let u=ee(a);return u?ot[u.mint]??null:null};function w(a,u){a.textContent=u,a.hidden=!u}function st(a){let u=De(a);s.style.setProperty("--sign",u?.hue??"#C6CCDA");for(let[x,T]of xe)T.button.setAttribute("aria-pressed",String(x===a));let p=ee(a);b.textContent=p?.symbol?`${p.symbol} / USD`:u?.name??"—"}function lt(a){for(let{button:u}of xe.values())u.disabled=a,a?u.title="Finish or dismiss the wallet review before changing signs.":u.removeAttribute("title")}function ct(){let a=f("div");a.append(Z("The registry could not be read, so there is nothing to trade against."));let u=f("button","zme__ladder-refresh","Try again");return u.type="button",u.style.display="block",u.style.margin="0 auto 10px",u.addEventListener("click",()=>ht()),a.append(u),a}function an(){for(let a of te){let u=xe.get(a.slug),p=Le(a.slug);if(!p?.priceUsd){u.price.textContent="—",u.change.textContent="";continue}if(u.price.textContent=L(p.priceUsd),p.change24hPct===null)u.change.textContent="";else{let x=p.change24hPct>0;u.change.textContent=`${x?"+":""}${p.change24hPct.toFixed(2)}%`,u.change.classList.toggle("zme__rail-change--up",x)}}}function ut(){let a=A?Le(A):null;nn.textContent=a?.priceUsd?L(a.priceUsd):"—",rn.textContent=a?.change24hPct===null||a?.change24hPct===void 0?"—":`${a.change24hPct>0?"+":""}${a.change24hPct.toFixed(2)}%`,on.textContent=a?.liquidityUsd?we(a.liquidityUsd):"—"}async function Ue(){if(!se)return;if(de)return de;let a=new AbortController,u=setTimeout(()=>a.abort(),Jn),p=(async()=>{try{let x=[...se.values()].map(v=>v.mint),T=await At({mints:x,signal:a.signal});ot=T.stats,rt=T.rows,an(),ut()}catch{}finally{clearTimeout(u)}})();de=p;try{return await p}finally{de===p&&(de=null)}}function dt(){let a=ee(A);return a?bt({slug:A,mint:a.mint,rows:rt}):null}function Ie(a,u){clearTimeout(le),le=setTimeout(()=>{!a.aborted&&document.visibilityState==="visible"&&me(a)},u)}function Oe(a,u){clearTimeout(Re),Re=setTimeout(()=>{!a.aborted&&document.visibilityState==="visible"&&ye(a)},u)}async function me(a){let u=`${A}:${K}`,p=Wt(ce,u,a);if(p){ce=p;try{let x=De(A),T=K,v=A,D=()=>Qt(ce,p)&&T===K&&v===A,k=dt();if(!k){W.clear(),w(z,"No indexed pool to chart. The trade panel still quotes the venue directly."),i("chart","not_indexed");return}if(r.active()){w(z,"The chart service asked for a pause. Retrying shortly."),Ie(a,r.remainingMs()+250);return}if(!t.take()){w(z,"Waiting for the chart service — retrying shortly."),Ie(a,Jt);return}try{let R=r.token(),$=await Et({pool:k,timeframe:T,signal:p.controller.signal});if(!D())return;if(r.ok(R),!$.length){W.clear(),w(z,"No trades in this window yet."),i("chart","empty");return}w(z,""),W.set({candles:$,timeframe:T,hue:x?.hue}),i("chart","ready")}catch(R){if(R?.name==="AbortError")return;if(R?.code==="rate_limited"){if(r.fail(R.retryAfterMs),!D())return;W.clear(),w(z,"The chart service asked for a pause. Retrying shortly."),i("chart","rate_limited"),Ie(a,r.remainingMs()+250);return}if(!D())return;W.clear(),w(z,"Chart unavailable. The trade panel still quotes the venue directly."),i("chart",R?.code==="not_indexed"?"not_indexed":"unavailable")}}finally{p.detach(),ce===p&&(ce=null)}}}async function ye(a){let p=Wt(ue,A,a);if(p){ue=p;try{let x=ee(A),T=A,v=()=>Qt(ue,p)&&T===A,D=dt();if(!x||!D){Q.clear(),w(E,"No indexed pool to read trades from."),i("tape","not_indexed");return}if(r.active()){w(E,"The trade feed asked for a pause. Retrying shortly."),Oe(a,r.remainingMs()+250);return}if(!t.take()){w(E,"Waiting for the trade feed — retrying shortly."),Oe(a,Jt);return}try{let k=r.token(),R=await zt({pool:D,mint:x.mint,signal:p.controller.signal});if(!v())return;if(r.ok(k),!R.length){Q.clear(),w(E,"No recent trades in this pool."),i("tape","empty");return}w(E,""),Q.set(R,{symbol:x.symbol}),i("tape","ready")}catch(k){if(k?.name==="AbortError")return;if(k?.code==="rate_limited"){if(r.fail(k.retryAfterMs),!v())return;Q.clear(),w(E,"The trade feed asked for a pause. Retrying shortly."),i("tape","rate_limited"),Oe(a,r.remainingMs()+250);return}if(!v())return;Q.clear(),w(E,"Trade feed unavailable."),i("tape",k?.code==="not_indexed"?"not_indexed":"unavailable")}}finally{p.detach(),ue===p&&(ue=null)}}}function mt(){clearTimeout(Ne),clearTimeout(ke),clearTimeout(le),clearTimeout(Re),Ne=null,ke=null}function sn(){if(mt(),!O)return;let{signal:a}=O,u=()=>{Ne=setTimeout(async()=>{!a.aborted&&document.visibilityState!=="hidden"&&await me(a),a.aborted||u()},Yt(Yn))},p=()=>{ke=setTimeout(async()=>{!a.aborted&&document.visibilityState!=="hidden"&&await ye(a),a.aborted||p()},Yt(Wn))};u(),p()}function ln(){O&&(clearTimeout(le),le=null,w(z,""),me(O.signal))}function ft(a){ae.replaceChildren();for(let{side:u,rungs:p}of a)for(let x of p){let T=f("tr",u==="buy"?"zme__ladder-row--buy":"zme__ladder-row--sell"),v=[f("td","zme__ladder-side",u==="buy"?"Buy":"Sell"),f("td",null,`${u==="sell"?"≈":""}$${x.notional}`)];if(x.error||!x.priceScaled){let D=x.error==="no_route"?"no route":"unavailable",k=f("td",null,D);k.colSpan=2,v.push(k)}else v.push(f("td",null,L(x.price)),f("td",null,x.impactBps===null?"—":`${(x.impactBps/100).toFixed(2)}%`));T.append(...v),ae.append(T)}}async function cn(){let a=ee(A);if(!a||!O)return;let u=A,p=Date.now();if(p<H)return;H=p+We,I.disabled=!0,I.textContent="Reading…";let{signal:x}=O;w(V,"Reading buy quotes from the venue…");try{let T=Le(A),v=await Ke({mint:a.mint,side:"buy",signal:x});if(x.aborted)return;if(ft([v]),v.halted==="rate_limited"){H=Math.max(H,Date.now()+Math.max(We,Number(v.retryAfterMs)||0)),w(V,"The venue asked for a pause. Try depth again later."),i("ladder","rate_limited");return}if(w(V,"Reading sell quotes from the venue…"),await new Promise($=>{setTimeout($,Je)}),x.aborted)return;let D=await Ke({mint:a.mint,side:"sell",midPriceUsd:T?.priceUsd??null,signal:x});if(x.aborted)return;if(ft([v,D]),D.halted==="rate_limited"){H=Math.max(H,Date.now()+Math.max(We,Number(D.retryAfterMs)||0)),w(V,"The venue asked for a pause. Partial depth is shown."),i("ladder","rate_limited");return}let k=[...v.rungs,...D.rungs],R=k.filter($=>$.error||!$.priceScaled).length;i("ladder",R===0?"ready":R===k.length?"unavailable":"partial"),w(V,R===0?"":"Some venue quotes were unavailable.")}catch(T){T?.name!=="AbortError"&&!x.aborted&&(ae.replaceChildren(),w(V,"Venue quotes unavailable just now."),i("ladder","unavailable"))}finally{clearTimeout(_e),_e=setTimeout(()=>{!Y&&u===A&&(I.disabled=!1,I.textContent="Refresh")},Math.max(0,H-Date.now()))}}I.addEventListener("click",()=>cn());function un(){let a=De(A),u=ee(A),p=++it;if(X?.destroy?.(),X=null,lt(!1),j.replaceChildren(),!a||!u){j.append(be?ct():Z("Reading the registry…"));return}or().then(x=>{if(!(Y||p!==it)){if(!x){j.append(Z("The trade panel could not load. The record page lists the venue route directly.")),i("panel","unavailable");return}X=x.mount(j,{name:a.name,slug:a.slug,mint:u.mint,hue:a.hue,iconUrl:`/assets/zodiac-icons/128/${a.slug}.webp`},{onStateChange:(T,v)=>{lt(v.state==="signing"),v.state==="ready"&&i("panel","ready"),v.state==="error"&&i("panel",v.error==="rate_limited"?"rate_limited":"unavailable")}}),X||i("panel","unavailable")}})}function Fe(a){if(a!==A&&Zn(X))return!1;if(!se){Ce=a,st(a),be?w(z,"The registry could not be read. Nothing verified, nothing shown."):w(z,"Reading the registry…");return}if(a===A)return;A=a,O?.abort(),O=new AbortController,clearTimeout(_e),H=0,I.disabled=!1,I.textContent="Load depth",ae.replaceChildren(),w(V,"Load depth to request ten taker-less venue quotes."),st(a);try{window.history.replaceState(null,"",`#${a}`)}catch{}W.clear(),Q.clear(),w(z,"Reading the chart…"),w(E,"Reading recent trades…"),ut(),un();let{signal:u}=O;sn(),me(u),ye(u)}function pt(){if(document.visibilityState!=="visible"||!O)return;let{signal:a}=O;me(a),ye(a),Ue()}document.addEventListener("visibilitychange",pt);function ht(){Ae||Y||(Ae=!0,be=!1,w(z,"Reading the registry…"),w(E,""),j.replaceChildren(Z("Reading the registry…")),rr().then(async a=>{if(Y||(se=a,await Ue(),Y))return;clearInterval(Me),Me=setInterval(()=>{document.visibilityState!=="hidden"&&Ue()},Kn);let u=Ce??ar();Ce=null,Fe(u)}).catch(()=>{Y||(be=!0,w(z,"The registry could not be read. Nothing verified, nothing shown."),j.replaceChildren(ct()))}).finally(()=>{Ae=!1}))}return ht(),{select:Fe,destroy(){Y=!0,O?.abort(),mt(),clearInterval(Me),clearTimeout(_e),document.removeEventListener("visibilitychange",pt),X?.destroy?.(),W.destroy(),Q.destroy(),s.remove()}}}function sr(){if(document.querySelector("style[data-zme-styles]"))return;let e=document.createElement("style");e.setAttribute("data-zme-styles",""),e.textContent=gt,document.head.appendChild(e)}function Xt(){let e=document.querySelector("[data-zme-terminal]");!e||e.dataset.zmeMounted||(e.dataset.zmeMounted="1",sr(),Zt({host:e}),ze("exchange_room_mount"))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Xt,{once:!0}):Xt();})();
