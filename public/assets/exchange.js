/* Generated from src/exchange/ by scripts/build-exchange.mjs — do not edit directly. */
"use strict";(()=>{var rt=`
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
`;var J=[{slug:"aries",name:"Aries",glyph:"♈",hue:"#DE8E79"},{slug:"taurus",name:"Taurus",glyph:"♉",hue:"#B9D4BE"},{slug:"gemini",name:"Gemini",glyph:"♊",hue:"#B29DD0"},{slug:"cancer",name:"Cancer",glyph:"♋",hue:"#B6D4E4"},{slug:"leo",name:"Leo",glyph:"♌",hue:"#E0A9B4"},{slug:"virgo",name:"Virgo",glyph:"♍",hue:"#B7D9B0"},{slug:"libra",name:"Libra",glyph:"♎",hue:"#D3A9DE"},{slug:"scorpio",name:"Scorpio",glyph:"♏",hue:"#B9DCE8"},{slug:"sagittarius",name:"Sagittarius",glyph:"♐",hue:"#E0B080"},{slug:"capricorn",name:"Capricorn",glyph:"♑",hue:"#C0DEA8"},{slug:"aquarius",name:"Aquarius",glyph:"♒",hue:"#AE8FC9"},{slug:"pisces",name:"Pisces",glyph:"♓",hue:"#A9D4C4"}];var Vt={aries:"HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS",taurus:"2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu",gemini:"HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9",cancer:null,leo:"48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ",virgo:"5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh",libra:"DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9",scorpio:"3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta",sagittarius:null,capricorn:"549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin",aquarius:"BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv",pisces:"Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko"};function Wt(t,n){if(!Array.isArray(t)||!n)return null;let e=null,r=-1;for(let o of t){if(o?.chainId!=="solana"||!o?.pairAddress||o?.baseToken?.address!==n)continue;let a=Number(o?.liquidity?.usd)||0;a>r&&(r=a,e=String(o.pairAddress))}return e}function ot({slug:t,mint:n,rows:e}){return Vt[t]??Wt(e,n)}var it="https://api.geckoterminal.com/api/v2",at="https://www.geckoterminal.com/";var Ln=Object.freeze(["network","rate_limited","unavailable","not_indexed"]),De=class extends Error{constructor(n,e,{cause:r}={}){super(e,r?{cause:r}:void 0),this.name="ExchangeDataError",this.code=n}};function I(t,n,e){throw new De(t,n,e)}var Re=Object.freeze({"15m":{path:"minute",aggregate:15,limit:192},"1h":{path:"hour",aggregate:1,limit:168},"4h":{path:"hour",aggregate:4,limit:180},"1d":{path:"day",aggregate:1,limit:180}});function Jt({pool:t,timeframe:n,baseUrl:e=it}){let r=Re[n];r||I("unavailable",`Unknown timeframe: ${n}`);let o=new URL(`${e}/networks/solana/pools/${encodeURIComponent(t)}/ohlcv/${r.path}`);return o.searchParams.set("aggregate",String(r.aggregate)),o.searchParams.set("limit",String(r.limit)),o.toString()}function Kt({pool:t,baseUrl:n=it}){return new URL(`${n}/networks/solana/pools/${encodeURIComponent(t)}/trades`).toString()}function Yt(t){(!t?.data||typeof t.data!="object")&&I("unavailable","The chart data was not readable.");let n=t.data.attributes?.ohlcv_list;if(n===void 0)return[];Array.isArray(n)||I("unavailable","The chart data was not readable.");let e=[];for(let r of n){if(!Array.isArray(r)||r.length<6)continue;let[o,a,l,u,d,g]=r.map(Number);[o,a,l,u,d,g].every(Number.isFinite)&&(o<=0||a<=0||l<=0||u<=0||d<=0||g<0||e.push({ts:o,o:a,h:l,l:u,c:d,v:g}))}return e.sort((r,o)=>r.ts-o.ts),e}function Zt(t,n){let e=t?.data;Array.isArray(e)||I("unavailable","The trade data was not readable.");let r=[];for(let o of e){let a=o?.attributes;if(!a)continue;let l=Date.parse(a.block_timestamp??"");if(!Number.isFinite(l))continue;let u,d;if(a.to_token_address===n)u=Number(a.to_token_amount),d=Number(a.price_to_in_usd);else if(a.from_token_address===n)u=Number(a.from_token_amount),d=Number(a.price_from_in_usd);else continue;let g=a.kind==="buy"||a.kind==="sell"?a.kind:null,x=Number(a.volume_in_usd);!g||!Number.isFinite(u)||u<=0||!Number.isFinite(d)||d<=0||r.push({id:String(o.id??`${a.tx_hash}-${l}`),ts:l,side:g,tokenAmount:u,priceUsd:d,volumeUsd:Number.isFinite(x)?x:null,tx:typeof a.tx_hash=="string"?a.tx_hash:null})}return r.sort((o,a)=>a.ts-o.ts),r}function st({limit:t=24,windowMs:n=6e4,now:e=()=>Date.now()}={}){let r=[];return{take(){let o=e()-n;for(;r.length&&r[0]<=o;)r.shift();return r.length>=t?!1:(r.push(e()),!0)}}}async function ct(t,{fetchImpl:n=globalThis.fetch,signal:e}={}){let r;try{r=await n(t,{method:"GET",signal:e,headers:{accept:"application/json"}})}catch(o){if(o?.name==="AbortError")throw o;I("network","The chart service could not be reached just now.",{cause:o})}r.status===429&&I("rate_limited","The chart service is rate limiting requests."),r.status===404&&I("not_indexed","This pool is not indexed by the chart service."),r.ok||I("unavailable","The chart service did not answer.");try{return await r.json()}catch(o){if(o?.name==="AbortError")throw o;I("unavailable","The chart service did not return a readable answer.",{cause:o})}}function lt({baseMs:t=1e4,maxMs:n=12e4,now:e=()=>Date.now()}={}){let r=0,o=0;return{active(){return e()<r},remainingMs(){return Math.max(0,r-e())},fail(){r=e()+Math.min(t*2**o,n),o+=1},ok(){r=0,o=0}}}async function ut({pool:t,timeframe:n,baseUrl:e,fetchImpl:r,signal:o}){let a=await ct(Jt({pool:t,timeframe:n,baseUrl:e}),{fetchImpl:r,signal:o});return Yt(a)}async function dt({pool:t,mint:n,baseUrl:e,fetchImpl:r,signal:o}){let a=await ct(Kt({pool:t,baseUrl:e}),{fetchImpl:r,signal:o});return Zt(a,n)}function mt(t,n){let e=String(n||"");if(!e||!Array.isArray(t))return null;let r=new Set,o=0;for(let a of t){if(a?.chainId!=="solana"||a?.baseToken?.address!==e)continue;let l=String(a?.pairAddress||"");if(!l||r.has(l))continue;let u=Number(a?.liquidity?.usd);!Number.isFinite(u)||u<=0||(r.add(l),o+=u)}return o>0?o:null}var pt="https://api.dexscreener.com/tokens/v1/solana";function Xt(t,n=pt){return`${n}/${t.map(e=>encodeURIComponent(e)).join(",")}`}function Qt(t,n){let e={};if(!Array.isArray(t))return e;for(let r of n){let o=null,a=-1;for(let d of t){if(d?.chainId!=="solana"||!d?.pairAddress||d?.baseToken?.address!==r)continue;let g=Number(d?.liquidity?.usd)||0;g>a&&(a=g,o=d)}if(!o)continue;let l=Number(o.priceUsd),u=Number(o.priceChange?.h24);e[r]={priceUsd:Number.isFinite(l)&&l>0?l:null,change24hPct:Number.isFinite(u)?u:null,liquidityUsd:mt(t,r)}}return e}async function ft({mints:t,baseUrl:n=pt,fetchImpl:e=globalThis.fetch,signal:r}={}){if(!Array.isArray(t)||t.length===0)return{stats:{},rows:[]};let o=await e(Xt(t,n),{method:"GET",headers:{accept:"application/json"},signal:r});if(!o.ok)throw new Error(`stats ${o.status}`);let a=await o.json();return{stats:Qt(a,t),rows:Array.isArray(a)?a:[]}}var en="https://lite-api.jup.ag";var Pn=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_failed"]),Ue=class extends Error{constructor(n,e,{cause:r}={}){super(e,r?{cause:r}:void 0),this.name="TradeError",this.code=n}};function D(t,n,e){throw new Ue(t,n,e)}function Le(t,n){let e=String(t??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(e)||D("invalid_amount","Enter an amount using digits and a single decimal point.");let[r="",o=""]=e.split(".");o.length>n&&D("invalid_amount",`That amount is finer than this token's ${n} decimals.`);let a=BigInt((r||"0")+o.padEnd(n,"0"));return a<=0n&&D("invalid_amount","Enter an amount greater than zero."),a}function Ie(t,n,{maxFractionDigits:e=n}={}){let r=BigInt(t),o=r<0n,a=(o?-r:r).toString().padStart(n+1,"0"),l=a.slice(0,a.length-n),u=n>0?a.slice(a.length-n):"";return e<u.length&&(u=u.slice(0,e)),u=u.replace(/0+$/,""),`${o?"-":""}${l}${u?`.${u}`:""}`}function tn(t,n){let e=new URL("/ultra/v1/order",t);for(let[r,o]of Object.entries(n))o!=null&&o!==""&&e.searchParams.set(r,String(o));return e.toString()}async function nn(t){try{return await t.json()}catch(n){D("unavailable","The venue did not return a readable answer.",{cause:n})}}async function ht({inputMint:t,outputMint:n,amount:e,taker:r,baseUrl:o=en,fetchImpl:a=globalThis.fetch,signal:l}){let u=tn(o,{inputMint:t,outputMint:n,amount:String(e),taker:r}),d;try{d=await a(u,{method:"GET",signal:l,headers:{accept:"application/json"}})}catch(x){if(x?.name==="AbortError")throw x;D("network","The price could not be reached just now.",{cause:x})}d.status===429&&D("rate_limited","The venue is rate limiting requests. Try again shortly."),d.status>=500&&D("unavailable","The venue did not answer.");let g=await nn(d);if(g?.error||!d.ok){let x=typeof g?.error=="string"?g.error:"no route";/quote|route|liquidity/i.test(x)&&D("no_route","No route is available for that amount right now."),D("unavailable","The venue could not price that trade.")}return rn(g)}function rn(t){(!t||typeof t!="object")&&D("unavailable","The venue returned no order.");let{inputMint:n,outputMint:e,inAmount:r,outAmount:o,requestId:a}=t;(!n||!e||!r||!o)&&D("unavailable","The venue returned an incomplete order.");let l=Number(t.platformFee?.feeBps??t.feeBps??0);return{inputMint:n,outputMint:e,inAmount:BigInt(r),outAmount:BigInt(o),priceImpactPct:Number(t.priceImpactPct??0),feeBps:Number.isFinite(l)?l:51,routeLabels:Array.isArray(t.routePlan)?t.routePlan.map(u=>u?.swapInfo?.label).filter(Boolean):[],requestId:a??null,transaction:t.transaction??null,inUsdValue:Number(t.inUsdValue??0),outUsdValue:Number(t.outUsdValue??0)}}var Gn=Object.freeze(["card","usdc"]),Hn=Object.freeze(["idle","quoting","ready","signing","done","error"]),Fe="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",gt=6;var Vn=Object.freeze(["25","50","100","250"]),Wn=Object.freeze([{name:"Coinbase",mark:"coinbase",href:"https://www.coinbase.com/",note:"Fund a wallet with USDC."},{name:"fomo",mark:"fomo",href:"https://fomo.family/",applePay:!0,note:"Fund in-app; verify the mint."},{name:"MoonPay",mark:"moonpay",href:"https://www.moonpay.com/",note:"Buy USDC by card or bank."},{name:"Ramp Network",mark:"ramp",href:"https://rampnetwork.com/",note:"Buy USDC with mobile pay."}]);var bt=6,on=Object.freeze(["25","100","250","500","1000"]),xt=12,an=10n**BigInt(xt);function _t(t,n){let e=BigInt(t),r=BigInt(n);return e<=0n||r<=0n?null:e*an/r}function sn(t){return t==null?null:Ie(t,xt)}function cn(t,n,e){if(!t||!n||n<=0n)return null;let o=(e==="sell"?n-t:t-n)*10000n/n;return o<0n?0:Number(o)}function ln(t,n){let e=Number(t),r=Number(n);if(!Number.isFinite(e)||e<=0||!Number.isFinite(r)||r<=0)return null;let o=e/r;return!Number.isFinite(o)||o<=0?null:o.toFixed(bt)}var un=250,dn=t=>new Promise(n=>{setTimeout(n,t)});async function $e({mint:t,side:n,notionals:e=on,midPriceUsd:r=null,fetchImpl:o,signal:a,spacingMs:l=un,sleep:u=dn}){let d=[],g=null;for(let x=0;x<e.length;x+=1){let A=e[x];if(a?.aborted||(x>0&&l>0&&await u(l),a?.aborted))break;try{let _;if(n==="sell"){let f=ln(A,r);if(!f){d.push({notional:A,error:"unavailable"});continue}_={inputMint:t,outputMint:Fe,amount:Le(f,bt)}}else _={inputMint:Fe,outputMint:t,amount:Le(A,gt)};let p=await ht({..._,fetchImpl:o,signal:a}),y=n==="sell"?_t(p.outAmount,p.inAmount):_t(p.inAmount,p.outAmount);if(!y){d.push({notional:A,error:"unavailable"});continue}x===0&&(g=y),d.push({notional:A,priceScaled:y,price:sn(y),impactBps:cn(y,g,n),priceImpactPct:p.priceImpactPct})}catch(_){if(_?.name==="AbortError")throw _;d.push({notional:A,error:_?.code??"unavailable"})}}return{side:n,rungs:d}}function vt(t){let n=1/0,e=-1/0;for(let o of t)o.l<n&&(n=o.l),o.h>e&&(e=o.h);if(!Number.isFinite(n)||!Number.isFinite(e))return null;if(n===e){let o=n===0?1:Math.abs(n)*.05;return{min:n-o,max:e+o}}let r=(e-n)*.08;return{min:Math.max(0,n-r),max:e+r}}function wt(t){let n=0;for(let e of t)e.v>n&&(n=e.v);return n}function zt(t,n,e=4){if(!(n>t)||e<1)return[];let r=n-t,o=10**Math.floor(Math.log10(r/(e+1))),a=o*10;for(let u of[1,2,5,10])if(r/(o*u)<=e+1){a=o*u;break}let l=[];for(let u=Math.ceil(t/a)*a;u<=n;u+=a)l.push(u);return l}function St(t,n){if(t<=0||n<=0)return{step:0,bodyWidth:0,centers:[]};let e=n/t,r=Math.max(1,Math.min(e*.68,13)),o=[];for(let a=0;a<t;a+=1)o.push(e*a+e/2);return{step:e,bodyWidth:r,centers:o}}function K(t,n,e){let r=n.max-n.min;return r<=0?e/2:e-(t-n.min)/r*e}function Et(t,n,e){if(n<=0||e<=0||t<0||t>=e)return null;let r=Math.floor(t/e*n);return r>=0&&r<n?r:null}function Tt(t,n,e=6){if(!t.length)return[];let r=[],o=Math.max(1,Math.ceil(t.length/e));for(let a=0;a<t.length;a+=o)r.push(a);return r}function k(t){let n=Number(t);if(!Number.isFinite(n))return"—";if(n===0)return"0";let e=Math.max(0,3-Math.floor(Math.log10(Math.abs(n))));return n.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:Math.min(e,12)})}function pe(t){let n=Number(t);return Number.isFinite(n)?Math.abs(n)>=1e3?`$${n.toLocaleString("en-US",{maximumFractionDigits:0})}`:`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}function Ct(t){let n=Number(t);return Number.isFinite(n)?n>=1e3?n.toLocaleString("en-US",{maximumFractionDigits:0}):n.toLocaleString("en-US",{maximumFractionDigits:2}):"—"}var yt=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function Be(t,n){let e=new Date(t*1e3);if(Number.isNaN(e.getTime()))return"—";if(n==="1d")return`${e.getUTCDate()} ${yt[e.getUTCMonth()]}`;let r=String(e.getUTCHours()).padStart(2,"0"),o=String(e.getUTCMinutes()).padStart(2,"0");return`${e.getUTCDate()} ${yt[e.getUTCMonth()]} ${r}:${o}`}function At(t,n){let e=Math.max(0,Math.round((n-t)/1e3));if(e<60)return`${e}s ago`;let r=Math.floor(e/60);if(r<60)return`${r}m ago`;let o=Math.floor(r/60);return o<24?`${o}h ago`:`${Math.floor(o/24)}d ago`}var kt=74,Nt=22,mn=.16;var fe="#8E96AB",pn="rgba(198,204,218,0.10)",fn="rgba(198,204,218,0.22)",hn="11px 'JetBrains Mono', ui-monospace, monospace";function Mt({canvas:t,readout:n}){let e=t.getContext("2d"),r=[],o="1h",a=fe,l=null;function u(){let p=t.getBoundingClientRect();return{width:p.width,height:p.height}}function d(){let{width:p,height:y}=u();if(p<=0||y<=0)return;let f=window.devicePixelRatio||1;if((t.width!==Math.round(p*f)||t.height!==Math.round(y*f))&&(t.width=Math.round(p*f),t.height=Math.round(y*f)),e.setTransform(f,0,0,f,0,0),e.clearRect(0,0,p,y),!r.length)return;let B=p-kt,H=y-Nt,P=Math.round(H*mn),F=H-P-6,M=vt(r);if(!M)return;let{bodyWidth:U,centers:T}=St(r.length,B),Y=wt(r);e.font=hn,e.textBaseline="middle";for(let w of zt(M.min,M.max)){let z=K(w,M,F);e.strokeStyle=pn,e.beginPath(),e.moveTo(0,z+.5),e.lineTo(B,z+.5),e.stroke(),e.fillStyle=fe,e.textAlign="left",e.fillText(k(w),B+8,z)}if(Y>0)for(let w=0;w<r.length;w+=1){let z=r[w],E=Math.max(1,z.v/Y*P);e.fillStyle=z.c>=z.o?`${a}55`:"rgba(142,150,171,0.30)",e.fillRect(T[w]-U/2,H-E,U,E)}for(let w=0;w<r.length;w+=1){let z=r[w],E=T[w],Z=z.c>=z.o,X=Z?a:fe,ge=K(z.h,M,F),$=K(z.l,M,F),se=K(z.o,M,F),Q=K(z.c,M,F);e.strokeStyle=X,e.lineWidth=1,e.beginPath(),e.moveTo(E+.5,ge),e.lineTo(E+.5,$),e.stroke();let ee=Math.min(se,Q),te=Math.max(1,Math.abs(Q-se));Z?(e.fillStyle=X,e.fillRect(E-U/2,ee,U,te)):e.strokeRect(E-U/2+.5,ee+.5,U-1,Math.max(1,te-1))}e.fillStyle=fe,e.textAlign="center";for(let w of Tt(r,o)){let z=Be(r[w].ts,o),E=Math.min(Math.max(T[w],24),B-24);e.fillText(z,E,y-Nt/2)}if(l!==null&&r[l]){let w=T[l];e.strokeStyle=fn,e.setLineDash([3,3]),e.beginPath(),e.moveTo(w+.5,0),e.lineTo(w+.5,H),e.stroke(),e.setLineDash([])}}function g(){if(!n)return;let p=l!==null?r[l]:r[r.length-1];if(!p){n.textContent="";return}n.textContent=[Be(p.ts,o),`O ${k(p.o)}`,`H ${k(p.h)}`,`L ${k(p.l)}`,`C ${k(p.c)}`,`Vol $${k(p.v)}`].join("  ")}function x(p){let y=t.getBoundingClientRect(),f=Et(p.clientX-y.left,r.length,y.width-kt);f!==l&&(l=f,d(),g())}function A(){l=null,d(),g()}t.addEventListener("pointermove",x),t.addEventListener("pointerleave",A);let _=typeof ResizeObserver=="function"?new ResizeObserver(()=>d()):null;return _?.observe(t),{set({candles:p,timeframe:y,hue:f}){r=Array.isArray(p)?p:[],y&&(o=y),f&&(a=f),l=null,d(),g()},clear(){r=[],l=null,d(),g()},destroy(){_?.disconnect(),t.removeEventListener("pointermove",x),t.removeEventListener("pointerleave",A)}}}var gn=40;function R(t,n,e){let r=document.createElement(t);return n&&(r.className=n),e!=null&&(r.textContent=e),r}function Dt({host:t,now:n=()=>Date.now()}){let e=R("table","zme-tape__table"),r=R("thead"),o=R("tr");for(let u of["Age","Side","Amount","Price","Value"])o.append(R("th",null,u));r.append(o);let a=R("tbody");e.append(r,a),t.append(e);let l=null;return{set(u,{symbol:d}={}){let g=u.slice(0,gn),x=n(),A=l;a.replaceChildren(...g.map(_=>{let p=R("tr",_.side==="buy"?"zme-tape__row--buy":"zme-tape__row--sell");return A&&!A.has(_.id)&&p.classList.add("is-fresh"),p.append(R("td",null,At(_.ts,x)),R("td","zme-tape__side",_.side==="buy"?"Buy":"Sell"),R("td",null,`${Ct(_.tokenAmount)}${d?` ${d}`:""}`),R("td",null,k(_.priceUsd)),R("td",null,_.volumeUsd===null?"—":pe(_.volumeUsd))),p})),l=new Set(g.map(_=>_.id))},clear(){a.replaceChildren(),l=null},destroy(){e.remove()}}}var _n="/registry/zodiacs.registry.json",bn=12e3,xn=6e4,yn=6e4,vn=2e4,wn=3e4,Rt=8e3,zn="These pools have no order book. Each rung is Jupiter’s own executable quote for that size — the price you would actually get, venue fee and price impact included.",Sn="Reference market — the sign’s canonical pool. Orders execute through Jupiter and may route beyond it.",En="Aggregated venue quote — Jupiter may route across several pools.";function c(t,n,e){let r=document.createElement(t);return n&&(r.className=n),e!=null&&(r.textContent=e),r}function G(t){return c("p","zme__state",t)}function Tn(t,n){let e=new AbortController,r=setTimeout(()=>e.abort(),n);return fetch(t,{cache:"no-store",signal:e.signal}).finally(()=>clearTimeout(r))}async function Cn(){let t=await Tn(_n,bn);if(!t.ok)throw new Error(`registry ${t.status}`);let n=await t.json(),e=new Map;for(let r of n?.assets??[]){let o=r?.native;o?.chain!=="solana"||!o?.address||e.set(r.sign,{mint:o.address,symbol:o.symbol??""})}if(e.size!==J.length)throw new Error("registry: incomplete");return e}var he=null;function An(){return he||(he=new Promise(t=>{if(window.zodiacsTrade){t(window.zodiacsTrade);return}let n=document.createElement("script");n.src="/assets/trade.js",n.defer=!0,n.addEventListener("load",()=>t(window.zodiacsTrade??null),{once:!0}),n.addEventListener("error",()=>t(null),{once:!0}),document.body.appendChild(n)}),he)}var kn=new Set(J.map(t=>t.slug));function Nn(){let t=(window.location.hash||"").replace(/^#/,"");return kn.has(t)?t:"aries"}function Ut({host:t}){let n=st(),e=lt(),r=c("div","zme__grid"),o=c("section","zme__card zme__rail");o.setAttribute("aria-label","The twelve records");let a=c("ul","zme__rail-list");o.append(a);let l=c("div","zme__center"),u=c("section","zme__card"),d=c("div","zme__card-head"),g=c("h2","zme__card-title","—"),x=c("div","zme__frames");x.setAttribute("role","group"),x.setAttribute("aria-label","Chart timeframe"),d.append(g,x);let A=c("p","zme__scope",Sn),_=c("p","zme__readout");_.id="zme-chart-readout";let p=c("div","zme__canvas-box"),y=c("canvas","zme__canvas");y.setAttribute("role","img"),y.setAttribute("aria-label","Candlestick chart of recent prices in the canonical pool"),y.setAttribute("aria-describedby","zme-chart-readout"),p.append(y);let f=G("");f.hidden=!0;let B=c("div","zme__chart-foot"),H=c("span",null,"Independent third-party data, not a valuation or recommendation."),P=c("a",null,"Chart data by GeckoTerminal");P.href=at,P.target="_blank",P.rel="noopener noreferrer external nofollow",B.append(H,P),u.append(d,A,_,p,f,B);let F=c("section","zme__card"),M=c("div","zme__card-head");M.append(c("h2","zme__card-title","Recent trades"),c("span","zme__card-note","canonical pool · newest first"));let U=c("div","zme-tape__scroll"),T=G("");T.hidden=!0,F.append(M,U,T),l.append(u,F);let Y=c("div","zme__desk"),w=c("section","zme__card"),z=c("p","zme__scope",En),E=c("div","zme__panel-host");w.append(z,E);let Z=c("section","zme__card"),X=c("div","zme__card-head"),ge=c("h2","zme__card-title","Depth"),$=c("button","zme__ladder-refresh","Refresh");$.type="button",X.append(ge,$);let se=c("span","zme__card-note","modelled from venue quotes"),Q=c("table","zme__ladder-table"),ee=c("thead"),te=c("tr"),It=c("th","zme__ladder-side","Side");for(let i of[null,"Size","Price","vs best"])te.append(i===null?It:c("th",null,i));ee.append(te);let ne=c("tbody");Q.append(ee,ne);let re=G("");re.hidden=!0;let Ft=c("p","zme__ladder-caption",zn);Z.append(X,se,Q,re,Ft);let Pe=c("section","zme__card"),Oe=c("div","zme__card-head");Oe.append(c("h2","zme__card-title","Market"),c("span","zme__card-note","Dex Screener · indexed"));let qe=c("div","zme__stats"),_e=i=>{let s=c("div","zme__stat"),m=c("span","zme__stat-value","—");return s.append(c("span","zme__stat-label",i),m),qe.append(s),m},$t=_e("Price"),Bt=_e("24h"),Pt=_e("Indexed liquidity");Pe.append(Oe,qe),Y.append(w,Z,Pe),r.append(o,l,Y),t.append(r);let oe=null,ce=!1,be=!1,xe=null,je=[],Ge={},S=null,V="1h",N=null,le=null,He=0,ye=null,ve=null,we=null,ze=null,Se=null,ue=null,de=0,O=!1,q=Mt({canvas:y,readout:_}),j=Dt({host:U}),Ee=new Map;for(let i of J){let s=c("li"),m=c("button","zme__rail-item");m.type="button",m.style.setProperty("--sign",i.hue),m.setAttribute("aria-pressed","false");let h=document.createElement("picture"),C=document.createElement("source");C.srcset=`/assets/zodiac-icons/128/${i.slug}.avif`,C.type="image/avif";let v=document.createElement("img");v.className="zme__rail-disc",v.src=`/assets/zodiac-icons/128/${i.slug}.webp`,v.width=30,v.height=30,v.alt="",v.loading="lazy",v.decoding="async",h.append(C,v);let L=c("span","zme__rail-name",i.name),ae=c("span","zme__rail-quote"),tt=c("span","zme__rail-price","—"),nt=c("span","zme__rail-change","");ae.append(tt,nt),m.append(h,L,ae),m.addEventListener("click",()=>Me(i.slug)),s.append(m),a.append(s),Ee.set(i.slug,{button:m,price:tt,change:nt})}let Ve=new Map;for(let i of Object.keys(Re)){let s=c("button","zme__frame",i);s.type="button",s.setAttribute("aria-pressed",String(i===V)),s.addEventListener("click",()=>{if(i!==V){V=i;for(let[m,h]of Ve)h.setAttribute("aria-pressed",String(m===V));jt()}}),x.append(s),Ve.set(i,s)}let Te=i=>J.find(s=>s.slug===i)??null,W=i=>oe?.get(i)??null,Ce=i=>{let s=W(i);return s?Ge[s.mint]??null:null};function b(i,s){i.textContent=s,i.hidden=!s}function We(i){let s=Te(i);r.style.setProperty("--sign",s?.hue??"#C6CCDA");for(let[h,C]of Ee)C.button.setAttribute("aria-pressed",String(h===i));let m=W(i);g.textContent=m?.symbol?`${m.symbol} / USD`:s?.name??"—"}function Je(){let i=c("div");i.append(G("The registry could not be read, so there is nothing to trade against."));let s=c("button","zme__ladder-refresh","Try again");return s.type="button",s.style.display="block",s.style.margin="0 auto 10px",s.addEventListener("click",()=>et()),i.append(s),i}function Ot(){for(let i of J){let s=Ee.get(i.slug),m=Ce(i.slug);if(!m?.priceUsd){s.price.textContent="—",s.change.textContent="";continue}if(s.price.textContent=k(m.priceUsd),m.change24hPct===null)s.change.textContent="";else{let h=m.change24hPct>0;s.change.textContent=`${h?"+":""}${m.change24hPct.toFixed(2)}%`,s.change.classList.toggle("zme__rail-change--up",h)}}}function Ke(){let i=S?Ce(S):null;$t.textContent=i?.priceUsd?k(i.priceUsd):"—",Bt.textContent=i?.change24hPct===null||i?.change24hPct===void 0?"—":`${i.change24hPct>0?"+":""}${i.change24hPct.toFixed(2)}%`,Pt.textContent=i?.liquidityUsd?pe(i.liquidityUsd):"—"}async function Ae(){if(oe)try{let i=[...oe.values()].map(m=>m.mint),s=await ft({mints:i});Ge=s.stats,je=s.rows,Ot(),Ke()}catch{}}function Ye(){let i=W(S);return i?ot({slug:S,mint:i.mint,rows:je}):null}function ke(i,s){clearTimeout(ze),ze=setTimeout(()=>{!i.aborted&&document.visibilityState==="visible"&&ie(i)},s)}function Ne(i,s){clearTimeout(Se),Se=setTimeout(()=>{!i.aborted&&document.visibilityState==="visible"&&me(i)},s)}async function ie(i){let s=Te(S),m=V,h=S,C=()=>!i.aborted&&m===V&&h===S,v=Ye();if(!v){q.clear(),b(f,"No indexed pool to chart. The trade panel still quotes the venue directly.");return}if(e.active()){b(f,"The chart service asked for a pause. Retrying shortly."),ke(i,e.remainingMs()+250);return}if(!n.take()){b(f,"Waiting for the chart service — retrying shortly."),ke(i,Rt);return}try{let L=await ut({pool:v,timeframe:m,signal:i});if(!C())return;if(e.ok(),!L.length){q.clear(),b(f,"No trades in this window yet.");return}b(f,""),q.set({candles:L,timeframe:m,hue:s?.hue})}catch(L){if(L?.name==="AbortError"||!C())return;if(L?.code==="rate_limited"){e.fail(),q.clear(),b(f,"The chart service asked for a pause. Retrying shortly."),ke(i,e.remainingMs()+250);return}q.clear(),b(f,"Chart unavailable. The trade panel still quotes the venue directly.")}}async function me(i){let s=W(S),m=S,h=()=>!i.aborted&&m===S,C=Ye();if(!s||!C){j.clear(),b(T,"No indexed pool to read trades from.");return}if(e.active()){b(T,"The trade feed asked for a pause. Retrying shortly."),Ne(i,e.remainingMs()+250);return}if(!n.take()){b(T,"Waiting for the trade feed — retrying shortly."),Ne(i,Rt);return}try{let v=await dt({pool:C,mint:s.mint,signal:i});if(!h())return;if(e.ok(),!v.length){j.clear(),b(T,"No recent trades in this pool.");return}b(T,""),j.set(v,{symbol:s.symbol})}catch(v){if(v?.name==="AbortError"||!h())return;if(v?.code==="rate_limited"){e.fail(),j.clear(),b(T,"The trade feed asked for a pause. Retrying shortly."),Ne(i,e.remainingMs()+250);return}j.clear(),b(T,"Trade feed unavailable.")}}function Ze(){clearInterval(ye),clearInterval(ve),clearTimeout(ze),clearTimeout(Se),ye=null,ve=null}function qt(){if(Ze(),!N)return;let{signal:i}=N;ye=setInterval(()=>{document.visibilityState!=="hidden"&&ie(i)},yn),ve=setInterval(()=>{document.visibilityState!=="hidden"&&me(i)},vn)}function jt(){N&&(b(f,""),ie(N.signal))}function Gt(i){ne.replaceChildren();for(let{side:s,rungs:m}of i)for(let h of m){let C=c("tr",s==="buy"?"zme__ladder-row--buy":"zme__ladder-row--sell"),v=[c("td","zme__ladder-side",s==="buy"?"Buy":"Sell"),c("td",null,`$${h.notional}`)];if(h.error||!h.priceScaled){let L=h.error==="no_route"?"no route":"unavailable",ae=c("td",null,L);ae.colSpan=2,v.push(ae)}else v.push(c("td",null,k(h.price)),c("td",null,h.impactBps===null?"—":`${(h.impactBps/100).toFixed(2)}%`));C.append(...v),ne.append(C)}}async function Xe(){let i=W(S);if(!i||!N)return;let s=Date.now();if(s<de)return;de=s+wn,$.disabled=!0;let{signal:m}=N;b(re,"");try{let h=Ce(S),C=await $e({mint:i.mint,side:"buy",signal:m}),v=await $e({mint:i.mint,side:"sell",midPriceUsd:h?.priceUsd??null,signal:m});if(m.aborted)return;Gt([C,v])}catch(h){h?.name!=="AbortError"&&!m.aborted&&(ne.replaceChildren(),b(re,"Venue quotes unavailable just now."))}finally{clearTimeout(ue);let h=S;ue=setTimeout(()=>{!O&&h===S&&($.disabled=!1)},Math.max(0,de-Date.now()))}}$.addEventListener("click",()=>Xe());function Ht(){let i=Te(S),s=W(S),m=++He;if(le?.destroy?.(),le=null,E.replaceChildren(),!i||!s){E.append(ce?Je():G("Reading the registry…"));return}An().then(h=>{if(!(O||m!==He)){if(!h){E.append(G("The trade panel could not load. The record page lists the venue route directly."));return}le=h.mount(E,{name:i.name,slug:i.slug,mint:s.mint,hue:i.hue,iconUrl:`/assets/zodiac-icons/128/${i.slug}.webp`})}})}function Me(i){if(!oe){xe=i,We(i),ce?b(f,"The registry could not be read. Nothing verified, nothing shown."):b(f,"Reading the registry…");return}if(i===S)return;S=i,N?.abort(),N=new AbortController,clearTimeout(ue),de=0,$.disabled=!1,ne.replaceChildren(),b(re,""),We(i);try{window.history.replaceState(null,"",`#${i}`)}catch{}q.clear(),j.clear(),b(f,"Reading the chart…"),b(T,"Reading recent trades…"),Ke(),Ht();let{signal:s}=N;ie(s),me(s),qt(),Xe()}function Qe(){if(document.visibilityState!=="visible"||!N)return;let{signal:i}=N;ie(i),me(i),Ae()}document.addEventListener("visibilitychange",Qe);function et(){be||O||(be=!0,ce=!1,b(f,"Reading the registry…"),b(T,""),E.replaceChildren(G("Reading the registry…")),Cn().then(async i=>{if(O||(oe=i,await Ae(),O))return;clearInterval(we),we=setInterval(()=>{document.visibilityState!=="hidden"&&Ae()},xn);let s=xe??Nn();xe=null,Me(s)}).catch(()=>{O||(ce=!0,b(f,"The registry could not be read. Nothing verified, nothing shown."),E.replaceChildren(Je()))}).finally(()=>{be=!1}))}return et(),{select:Me,destroy(){O=!0,N?.abort(),Ze(),clearInterval(we),clearTimeout(ue),document.removeEventListener("visibilitychange",Qe),le?.destroy?.(),q.destroy(),j.destroy(),r.remove()}}}function Mn(){if(document.querySelector("style[data-zme-styles]"))return;let t=document.createElement("style");t.setAttribute("data-zme-styles",""),t.textContent=rt,document.head.appendChild(t)}function Lt(){let t=document.querySelector("[data-zme-terminal]");!t||t.dataset.zmeMounted||(t.dataset.zmeMounted="1",Mn(),Ut({host:t}))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Lt,{once:!0}):Lt();})();
