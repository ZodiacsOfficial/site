/* Generated from src/exchange/ by scripts/build-exchange.mjs — do not edit directly. */
"use strict";(()=>{var Ge=`
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

/* \u2500\u2500 the rail \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 chart \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 tape \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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

/* \u2500\u2500 desk column \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */
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
`;var ee=[{slug:"aries",name:"Aries",glyph:"\u2648",hue:"#DE8E79"},{slug:"taurus",name:"Taurus",glyph:"\u2649",hue:"#B9D4BE"},{slug:"gemini",name:"Gemini",glyph:"\u264A",hue:"#B29DD0"},{slug:"cancer",name:"Cancer",glyph:"\u264B",hue:"#B6D4E4"},{slug:"leo",name:"Leo",glyph:"\u264C",hue:"#E0A9B4"},{slug:"virgo",name:"Virgo",glyph:"\u264D",hue:"#B7D9B0"},{slug:"libra",name:"Libra",glyph:"\u264E",hue:"#D3A9DE"},{slug:"scorpio",name:"Scorpio",glyph:"\u264F",hue:"#B9DCE8"},{slug:"sagittarius",name:"Sagittarius",glyph:"\u2650",hue:"#E0B080"},{slug:"capricorn",name:"Capricorn",glyph:"\u2651",hue:"#C0DEA8"},{slug:"aquarius",name:"Aquarius",glyph:"\u2652",hue:"#AE8FC9"},{slug:"pisces",name:"Pisces",glyph:"\u2653",hue:"#A9D4C4"}];var Nt={aries:"HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS",taurus:"2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu",gemini:"HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9",cancer:null,leo:"48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ",virgo:"5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh",libra:"DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9",scorpio:"3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta",sagittarius:null,capricorn:"549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin",aquarius:"BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv",pisces:"Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko"};function Mt(t,n){if(!Array.isArray(t)||!n)return null;let e=null,r=-1;for(let o of t){if(o?.chainId!=="solana"||!o?.pairAddress||o?.baseToken?.address!==n)continue;let i=Number(o?.liquidity?.usd)||0;i>r&&(r=i,e=String(o.pairAddress))}return e}function He({slug:t,mint:n,rows:e}){return Nt[t]??Mt(e,n)}var Ve="https://api.geckoterminal.com/api/v2",We="https://www.geckoterminal.com/";var fn=Object.freeze(["network","rate_limited","unavailable","not_indexed"]),we=class extends Error{constructor(n,e,{cause:r}={}){super(e,r?{cause:r}:void 0),this.name="ExchangeDataError",this.code=n}};function P(t,n,e){throw new we(t,n,e)}var ve=Object.freeze({"15m":{path:"minute",aggregate:15,limit:192},"1h":{path:"hour",aggregate:1,limit:168},"4h":{path:"hour",aggregate:4,limit:180},"1d":{path:"day",aggregate:1,limit:180}});function Dt({pool:t,timeframe:n,baseUrl:e=Ve}){let r=ve[n];r||P("unavailable",`Unknown timeframe: ${n}`);let o=new URL(`${e}/networks/solana/pools/${encodeURIComponent(t)}/ohlcv/${r.path}`);return o.searchParams.set("aggregate",String(r.aggregate)),o.searchParams.set("limit",String(r.limit)),o.toString()}function Ut({pool:t,baseUrl:n=Ve}){return new URL(`${n}/networks/solana/pools/${encodeURIComponent(t)}/trades`).toString()}function It(t){let n=t?.data?.attributes?.ohlcv_list;Array.isArray(n)||P("unavailable","The chart data was not readable.");let e=[];for(let r of n){if(!Array.isArray(r)||r.length<6)continue;let[o,i,l,d,m,h]=r.map(Number);[o,i,l,d,m,h].every(Number.isFinite)&&(o<=0||i<=0||l<=0||d<=0||m<=0||h<0||e.push({ts:o,o:i,h:l,l:d,c:m,v:h}))}return e.sort((r,o)=>r.ts-o.ts),e}function Lt(t,n){let e=t?.data;Array.isArray(e)||P("unavailable","The trade data was not readable.");let r=[];for(let o of e){let i=o?.attributes;if(!i)continue;let l=Date.parse(i.block_timestamp??"");if(!Number.isFinite(l))continue;let d,m;if(i.to_token_address===n)d=Number(i.to_token_amount),m=Number(i.price_to_in_usd);else if(i.from_token_address===n)d=Number(i.from_token_amount),m=Number(i.price_from_in_usd);else continue;let h=i.kind==="buy"||i.kind==="sell"?i.kind:null,g=Number(i.volume_in_usd);!h||!Number.isFinite(d)||d<=0||!Number.isFinite(m)||m<=0||r.push({id:String(o.id??`${i.tx_hash}-${l}`),ts:l,side:h,tokenAmount:d,priceUsd:m,volumeUsd:Number.isFinite(g)?g:null,tx:typeof i.tx_hash=="string"?i.tx_hash:null})}return r.sort((o,i)=>i.ts-o.ts),r}function Je({limit:t=24,windowMs:n=6e4,now:e=()=>Date.now()}={}){let r=[];return{take(){let o=e()-n;for(;r.length&&r[0]<=o;)r.shift();return r.length>=t?!1:(r.push(e()),!0)}}}async function Ke(t,{fetchImpl:n=globalThis.fetch,signal:e}={}){let r;try{r=await n(t,{method:"GET",signal:e,headers:{accept:"application/json"}})}catch(o){if(o?.name==="AbortError")throw o;P("network","The chart service could not be reached just now.",{cause:o})}r.status===429&&P("rate_limited","The chart service is rate limiting requests."),r.status===404&&P("not_indexed","This pool is not indexed by the chart service."),r.ok||P("unavailable","The chart service did not answer.");try{return await r.json()}catch(o){P("unavailable","The chart service did not return a readable answer.",{cause:o})}}async function Ye({pool:t,timeframe:n,baseUrl:e,fetchImpl:r,signal:o}){let i=await Ke(Dt({pool:t,timeframe:n,baseUrl:e}),{fetchImpl:r,signal:o});return It(i)}async function Ze({pool:t,mint:n,baseUrl:e,fetchImpl:r,signal:o}){let i=await Ke(Ut({pool:t,baseUrl:e}),{fetchImpl:r,signal:o});return Lt(i,n)}function Xe(t,n){let e=String(n||"");if(!e||!Array.isArray(t))return null;let r=new Set,o=0;for(let i of t){if(i?.chainId!=="solana"||i?.baseToken?.address!==e)continue;let l=String(i?.pairAddress||"");if(!l||r.has(l))continue;let d=Number(i?.liquidity?.usd);!Number.isFinite(d)||d<=0||(r.add(l),o+=d)}return o>0?o:null}var Qe="https://api.dexscreener.com/tokens/v1/solana";function Ft(t,n=Qe){return`${n}/${t.map(e=>encodeURIComponent(e)).join(",")}`}function Rt(t,n){let e={};if(!Array.isArray(t))return e;for(let r of n){let o=null,i=-1;for(let m of t){if(m?.chainId!=="solana"||m?.baseToken?.address!==r)continue;let h=Number(m?.liquidity?.usd)||0;h>i&&(i=h,o=m)}if(!o)continue;let l=Number(o.priceUsd),d=Number(o.priceChange?.h24);e[r]={priceUsd:Number.isFinite(l)&&l>0?l:null,change24hPct:Number.isFinite(d)?d:null,liquidityUsd:Xe(t,r)}}return e}async function et({mints:t,baseUrl:n=Qe,fetchImpl:e=globalThis.fetch,signal:r}={}){if(!Array.isArray(t)||t.length===0)return{stats:{},rows:[]};let o=await e(Ft(t,n),{method:"GET",headers:{accept:"application/json"},signal:r});if(!o.ok)throw new Error(`stats ${o.status}`);let i=await o.json();return{stats:Rt(i,t),rows:Array.isArray(i)?i:[]}}var $t="https://lite-api.jup.ag";var xn=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_failed"]),ze=class extends Error{constructor(n,e,{cause:r}={}){super(e,r?{cause:r}:void 0),this.name="TradeError",this.code=n}};function M(t,n,e){throw new ze(t,n,e)}function Se(t,n){let e=String(t??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(e)||M("invalid_amount","Enter an amount using digits and a single decimal point.");let[r="",o=""]=e.split(".");o.length>n&&M("invalid_amount",`That amount is finer than this token's ${n} decimals.`);let i=BigInt((r||"0")+o.padEnd(n,"0"));return i<=0n&&M("invalid_amount","Enter an amount greater than zero."),i}function Ee(t,n,{maxFractionDigits:e=n}={}){let r=BigInt(t),o=r<0n,i=(o?-r:r).toString().padStart(n+1,"0"),l=i.slice(0,i.length-n),d=n>0?i.slice(i.length-n):"";return e<d.length&&(d=d.slice(0,e)),d=d.replace(/0+$/,""),`${o?"-":""}${l}${d?`.${d}`:""}`}function Bt(t,n){let e=new URL("/ultra/v1/order",t);for(let[r,o]of Object.entries(n))o!=null&&o!==""&&e.searchParams.set(r,String(o));return e.toString()}async function Pt(t){try{return await t.json()}catch(n){M("unavailable","The venue did not return a readable answer.",{cause:n})}}async function tt({inputMint:t,outputMint:n,amount:e,taker:r,baseUrl:o=$t,fetchImpl:i=globalThis.fetch,signal:l}){let d=Bt(o,{inputMint:t,outputMint:n,amount:String(e),taker:r}),m;try{m=await i(d,{method:"GET",signal:l,headers:{accept:"application/json"}})}catch(g){if(g?.name==="AbortError")throw g;M("network","The price could not be reached just now.",{cause:g})}m.status===429&&M("rate_limited","The venue is rate limiting requests. Try again shortly."),m.status>=500&&M("unavailable","The venue did not answer.");let h=await Pt(m);if(h?.error||!m.ok){let g=typeof h?.error=="string"?h.error:"no route";/quote|route|liquidity/i.test(g)&&M("no_route","No route is available for that amount right now."),M("unavailable","The venue could not price that trade.")}return Ot(h)}function Ot(t){(!t||typeof t!="object")&&M("unavailable","The venue returned no order.");let{inputMint:n,outputMint:e,inAmount:r,outAmount:o,requestId:i}=t;(!n||!e||!r||!o)&&M("unavailable","The venue returned an incomplete order.");let l=Number(t.platformFee?.feeBps??t.feeBps??0);return{inputMint:n,outputMint:e,inAmount:BigInt(r),outAmount:BigInt(o),priceImpactPct:Number(t.priceImpactPct??0),feeBps:Number.isFinite(l)?l:0,routeLabels:Array.isArray(t.routePlan)?t.routePlan.map(d=>d?.swapInfo?.label).filter(Boolean):[],requestId:i??null,transaction:t.transaction??null,inUsdValue:Number(t.inUsdValue??0),outUsdValue:Number(t.outUsdValue??0)}}var zn=Object.freeze(["card","usdc"]),Sn=Object.freeze(["idle","quoting","ready","signing","done","error"]),Te="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",nt=6;var En=Object.freeze(["25","50","100","250"]),Tn=Object.freeze([{name:"Coinbase",mark:"coinbase",href:"https://www.coinbase.com/",note:"Fund a wallet with USDC."},{name:"fomo",mark:"fomo",href:"https://fomo.family/",applePay:!0,note:"Fund in-app; verify the mint."},{name:"MoonPay",mark:"moonpay",href:"https://www.moonpay.com/",note:"Buy USDC by card or bank."},{name:"Ramp Network",mark:"ramp",href:"https://rampnetwork.com/",note:"Buy USDC with mobile pay."}]);var ot=6,Ce=Object.freeze(["25","100","250","500","1000"]),it=12,qt=10n**BigInt(it);function rt(t,n){let e=BigInt(t),r=BigInt(n);return e<=0n||r<=0n?null:e*qt/r}function jt(t){return t==null?null:Ee(t,it)}function Gt(t,n,e){if(!t||!n||n<=0n)return null;let o=(e==="sell"?n-t:t-n)*10000n/n;return o<0n?0:Number(o)}function Ht(t,n){let e=Number(t),r=Number(n);if(!Number.isFinite(e)||e<=0||!Number.isFinite(r)||r<=0)return null;let o=e/r;return!Number.isFinite(o)||o<=0?null:o.toFixed(ot)}var Vt=250,Wt=t=>new Promise(n=>{setTimeout(n,t)});async function Ae({mint:t,side:n,notionals:e=Ce,midPriceUsd:r=null,fetchImpl:o,signal:i,spacingMs:l=Vt,sleep:d=Wt}){let m=[],h=null;for(let g=0;g<e.length;g+=1){let E=e[g];if(i?.aborted||(g>0&&l>0&&await d(l),i?.aborted))break;let y;if(n==="sell"){let c=Ht(E,r);if(!c){m.push({notional:E,error:"unavailable"});continue}y={inputMint:t,outputMint:Te,amount:Se(c,ot)}}else y={inputMint:Te,outputMint:t,amount:Se(E,nt)};try{let c=await tt({...y,fetchImpl:o,signal:i}),b=n==="sell"?rt(c.outAmount,c.inAmount):rt(c.inAmount,c.outAmount);h=h??b,m.push({notional:E,priceScaled:b,price:jt(b),impactBps:Gt(b,h,n),priceImpactPct:c.priceImpactPct})}catch(c){if(c?.name==="AbortError")throw c;m.push({notional:E,error:c?.code??"unavailable"})}}return{side:n,rungs:m}}function st(t){let n=1/0,e=-1/0;for(let o of t)o.l<n&&(n=o.l),o.h>e&&(e=o.h);if(!Number.isFinite(n)||!Number.isFinite(e))return null;if(n===e){let o=n===0?1:Math.abs(n)*.05;return{min:n-o,max:e+o}}let r=(e-n)*.08;return{min:Math.max(0,n-r),max:e+r}}function ct(t){let n=0;for(let e of t)e.v>n&&(n=e.v);return n}function lt(t,n,e=4){if(!(n>t)||e<1)return[];let r=(n-t)/(e+1),o=10**Math.floor(Math.log10(r)),i=r/o,l=(i>=5?5:i>=2?2:1)*o,d=[];for(let m=Math.ceil(t/l)*l;m<=n;m+=l)d.push(m);return d}function ut(t,n){if(t<=0||n<=0)return{step:0,bodyWidth:0,centers:[]};let e=n/t,r=Math.max(1,Math.min(e*.68,13)),o=[];for(let i=0;i<t;i+=1)o.push(e*i+e/2);return{step:e,bodyWidth:r,centers:o}}function J(t,n,e){let r=n.max-n.min;return r<=0?e/2:e-(t-n.min)/r*e}function dt(t,n,e){if(n<=0||e<=0||t<0||t>=e)return null;let r=Math.floor(t/e*n);return r>=0&&r<n?r:null}function mt(t,n,e=6){if(!t.length)return[];let r=[],o=Math.max(1,Math.ceil(t.length/e));for(let i=0;i<t.length;i+=o)r.push(i);return r}function C(t){let n=Number(t);if(!Number.isFinite(n))return"\u2014";if(n===0)return"0";let e=Math.max(0,3-Math.floor(Math.log10(Math.abs(n))));return n.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:Math.min(e,12)})}function le(t){let n=Number(t);return Number.isFinite(n)?Math.abs(n)>=1e3?`$${n.toLocaleString("en-US",{maximumFractionDigits:0})}`:`$${n.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"\u2014"}function pt(t){let n=Number(t);return Number.isFinite(n)?n>=1e3?n.toLocaleString("en-US",{maximumFractionDigits:0}):n.toLocaleString("en-US",{maximumFractionDigits:2}):"\u2014"}var at=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function ke(t,n){let e=new Date(t*1e3);if(Number.isNaN(e.getTime()))return"\u2014";if(n==="1d")return`${e.getUTCDate()} ${at[e.getUTCMonth()]}`;let r=String(e.getUTCHours()).padStart(2,"0"),o=String(e.getUTCMinutes()).padStart(2,"0");return`${e.getUTCDate()} ${at[e.getUTCMonth()]} ${r}:${o}`}function ft(t,n){let e=Math.max(0,Math.round((n-t)/1e3));if(e<60)return`${e}s ago`;let r=Math.floor(e/60);if(r<60)return`${r}m ago`;let o=Math.floor(r/60);return o<24?`${o}h ago`:`${Math.floor(o/24)}d ago`}var ht=74,gt=22,Jt=.16;var ue="#8E96AB",Kt="rgba(198,204,218,0.10)",Yt="rgba(198,204,218,0.22)",Zt="11px 'JetBrains Mono', ui-monospace, monospace";function _t({canvas:t,readout:n}){let e=t.getContext("2d"),r=[],o="1h",i=ue,l=null;function d(){let c=t.getBoundingClientRect();return{width:c.width,height:c.height}}function m(){let{width:c,height:b}=d();if(c<=0||b<=0)return;let T=window.devicePixelRatio||1;if((t.width!==Math.round(c*T)||t.height!==Math.round(b*T))&&(t.width=Math.round(c*T),t.height=Math.round(b*T)),e.setTransform(T,0,0,T,0,0),e.clearRect(0,0,c,b),!r.length)return;let U=c-ht,O=b-gt,Y=Math.round(O*Jt),R=O-Y-6,w=st(r);if(!w)return;let{bodyWidth:I,centers:q}=ut(r.length,U),L=ct(r);e.font=Zt,e.textBaseline="middle";for(let _ of lt(w.min,w.max)){let x=J(_,w,R);e.strokeStyle=Kt,e.beginPath(),e.moveTo(0,x+.5),e.lineTo(U,x+.5),e.stroke(),e.fillStyle=ue,e.textAlign="left",e.fillText(C(_),U+8,x)}if(L>0)for(let _=0;_<r.length;_+=1){let x=r[_],N=Math.max(1,x.v/L*Y);e.fillStyle=x.c>=x.o?`${i}55`:"rgba(142,150,171,0.30)",e.fillRect(q[_]-I/2,O-N,I,N)}for(let _=0;_<r.length;_+=1){let x=r[_],N=q[_],F=x.c>=x.o,te=F?i:ue,ne=J(x.h,w,R),re=J(x.l,w,R),Z=J(x.o,w,R),oe=J(x.c,w,R);e.strokeStyle=te,e.lineWidth=1,e.beginPath(),e.moveTo(N+.5,ne),e.lineTo(N+.5,re),e.stroke();let $=Math.min(Z,oe),B=Math.max(1,Math.abs(oe-Z));F?(e.fillStyle=te,e.fillRect(N-I/2,$,I,B)):e.strokeRect(N-I/2+.5,$+.5,I-1,Math.max(1,B-1))}e.fillStyle=ue,e.textAlign="center";for(let _ of mt(r,o)){let x=ke(r[_].ts,o),N=Math.min(Math.max(q[_],24),U-24);e.fillText(x,N,b-gt/2)}if(l!==null&&r[l]){let _=q[l];e.strokeStyle=Yt,e.setLineDash([3,3]),e.beginPath(),e.moveTo(_+.5,0),e.lineTo(_+.5,O),e.stroke(),e.setLineDash([])}}function h(){if(!n)return;let c=l!==null?r[l]:r[r.length-1];if(!c){n.textContent="";return}n.textContent=[ke(c.ts,o),`O ${C(c.o)}`,`H ${C(c.h)}`,`L ${C(c.l)}`,`C ${C(c.c)}`,`Vol $${C(c.v)}`].join("  ")}function g(c){let b=t.getBoundingClientRect(),T=dt(c.clientX-b.left,r.length,b.width-ht);T!==l&&(l=T,m(),h())}function E(){l=null,m(),h()}t.addEventListener("pointermove",g),t.addEventListener("pointerleave",E);let y=typeof ResizeObserver=="function"?new ResizeObserver(()=>m()):null;return y?.observe(t),{set({candles:c,timeframe:b,hue:T}){r=Array.isArray(c)?c:[],b&&(o=b),T&&(i=T),l=null,m(),h()},clear(){r=[],l=null,m(),h()},destroy(){y?.disconnect(),t.removeEventListener("pointermove",g),t.removeEventListener("pointerleave",E)}}}var Xt=40;function D(t,n,e){let r=document.createElement(t);return n&&(r.className=n),e!=null&&(r.textContent=e),r}function bt({host:t,now:n=()=>Date.now()}){let e=D("table","zme-tape__table"),r=D("thead"),o=D("tr");for(let d of["Age","Side","Amount","Price","Value"])o.append(D("th",null,d));r.append(o);let i=D("tbody");e.append(r,i),t.append(e);let l=0;return{set(d,{symbol:m}={}){let h=d.slice(0,Xt),g=n(),E=l;i.replaceChildren(...h.map(y=>{let c=D("tr",y.side==="buy"?"zme-tape__row--buy":"zme-tape__row--sell");return E>0&&y.ts>E&&c.classList.add("is-fresh"),c.append(D("td",null,ft(y.ts,g)),D("td","zme-tape__side",y.side==="buy"?"Buy":"Sell"),D("td",null,`${pt(y.tokenAmount)}${m?` ${m}`:""}`),D("td",null,C(y.priceUsd)),D("td",null,y.volumeUsd===null?"\u2014":le(y.volumeUsd))),c})),h.length&&(l=Math.max(l,h[0].ts))},clear(){i.replaceChildren(),l=0},destroy(){e.remove()}}}var Qt="/registry/zodiacs.registry.json",en=12e3,tn=6e4,nn=6e4,rn=2e4,on=3e4,an="These pools have no order book. Each rung is Jupiter\u2019s own executable quote for that size \u2014 the price you would actually get, venue fee and price impact included.";function s(t,n,e){let r=document.createElement(t);return n&&(r.className=n),e!=null&&(r.textContent=e),r}function K(t){return s("p","zme__state",t)}function sn(t,n){let e=new AbortController,r=setTimeout(()=>e.abort(),n);return fetch(t,{cache:"no-store",signal:e.signal}).finally(()=>clearTimeout(r))}async function cn(){let t=await sn(Qt,en);if(!t.ok)throw new Error(`registry ${t.status}`);let n=await t.json(),e=new Map;for(let r of n?.assets??[]){let o=r?.native;o?.chain!=="solana"||!o?.address||e.set(r.sign,{mint:o.address,symbol:o.symbol??""})}if(e.size!==ee.length)throw new Error("registry: incomplete");return e}var de=null;function ln(){return de||(de=new Promise(t=>{if(window.zodiacsTrade){t(window.zodiacsTrade);return}let n=document.createElement("script");n.src="/assets/trade.js",n.defer=!0,n.addEventListener("load",()=>t(window.zodiacsTrade??null),{once:!0}),n.addEventListener("error",()=>t(null),{once:!0}),document.body.appendChild(n)}),de)}function xt({host:t}){let n=Je(),e=s("div","zme__grid"),r=s("section","zme__card zme__rail");r.setAttribute("aria-label","The twelve records");let o=s("ul","zme__rail-list");r.append(o);let i=s("div","zme__center");i.style.minWidth="0",i.style.display="flex",i.style.flexDirection="column",i.style.gap="14px";let l=s("section","zme__card"),d=s("div","zme__card-head"),m=s("h2","zme__card-title","\u2014"),h=s("div","zme__frames");h.setAttribute("role","group"),h.setAttribute("aria-label","Chart timeframe"),d.append(m,h);let g=s("p","zme__readout"),E=s("div","zme__canvas-box"),y=s("canvas","zme__canvas");E.append(y);let c=K("");c.hidden=!0;let b=s("div","zme__chart-foot"),T=s("span",null,"Independent third-party data, not a valuation or recommendation."),U=s("a",null,"Chart data by GeckoTerminal");U.href=We,U.target="_blank",U.rel="noopener noreferrer external nofollow",b.append(T,U),l.append(d,g,E,c,b);let O=s("section","zme__card"),Y=s("div","zme__card-head");Y.append(s("h2","zme__card-title","Recent trades"),s("span","zme__card-note","pool trades \xB7 newest first"));let R=s("div","zme-tape__scroll"),w=K("");w.hidden=!0,O.append(Y,R,w),i.append(l,O);let I=s("div","zme__desk"),q=s("section","zme__card"),L=s("div","zme__panel-host");q.append(L);let _=s("section","zme__card"),x=s("div","zme__card-head"),N=s("h2","zme__card-title","Depth"),F=s("button","zme__ladder-refresh","Refresh");F.type="button",x.append(N,F);let te=s("span","zme__card-note","modelled from venue quotes"),ne=s("table","zme__ladder-table"),re=s("thead"),Z=s("tr"),oe=s("th","zme__ladder-side","Side");for(let a of[null,"Size","Price","vs best"])Z.append(a===null?oe:s("th",null,a));re.append(Z);let $=s("tbody");ne.append(re,$);let B=K("");B.hidden=!0;let wt=s("p","zme__ladder-caption",an);_.append(x,te,ne,B,wt);let Ne=s("section","zme__card"),Me=s("div","zme__card-head");Me.append(s("h2","zme__card-title","Market"),s("span","zme__card-note","Dex Screener \xB7 indexed"));let De=s("div","zme__stats"),me=a=>{let u=s("div","zme__stat"),f=s("span","zme__stat-value","\u2014");return u.append(s("span","zme__stat-label",a),f),De.append(u),f},vt=me("Price"),zt=me("24h"),St=me("Indexed liquidity");Ne.append(Me,De),I.append(q,_,Ne),e.append(r,i,I),t.append(e);let ie=null,Ue=[],Ie={},S=null,j="1h",A=null,ae=null,pe=null,fe=null,Le=null,se=0,G=!1,H=_t({canvas:y,readout:g}),V=bt({host:R}),he=new Map;for(let a of ee){let u=s("li"),f=s("button","zme__rail-item");f.type="button",f.style.setProperty("--sign",a.hue),f.setAttribute("aria-pressed","false");let p=document.createElement("picture"),k=document.createElement("source");k.srcset=`/assets/zodiac-icons/128/${a.slug}.avif`,k.type="image/avif";let z=document.createElement("img");z.className="zme__rail-disc",z.src=`/assets/zodiac-icons/128/${a.slug}.webp`,z.width=30,z.height=30,z.alt="",z.loading="lazy",z.decoding="async",p.append(k,z);let X=s("span","zme__rail-name",a.name),Q=s("span","zme__rail-quote"),qe=s("span","zme__rail-price","\u2014"),je=s("span","zme__rail-change","");Q.append(qe,je),f.append(p,X,Q),f.addEventListener("click",()=>ye(a.slug)),u.append(f),o.append(u),he.set(a.slug,{button:f,price:qe,change:je})}let Fe=new Map;for(let a of Object.keys(ve)){let u=s("button","zme__frame",a);u.type="button",u.setAttribute("aria-pressed",String(a===j)),u.addEventListener("click",()=>{if(a!==j){j=a;for(let[f,p]of Fe)p.setAttribute("aria-pressed",String(f===j));Ct()}}),h.append(u),Fe.set(a,u)}let ge=a=>ee.find(u=>u.slug===a)??null,W=a=>ie?.get(a)??null,_e=a=>{let u=W(a);return u?Ie[u.mint]??null:null};function v(a,u){a.textContent=u,a.hidden=!u}function Et(){for(let a of ee){let u=he.get(a.slug),f=_e(a.slug);if(!f?.priceUsd){u.price.textContent="\u2014",u.change.textContent="";continue}if(u.price.textContent=C(f.priceUsd),f.change24hPct===null)u.change.textContent="";else{let p=f.change24hPct>0;u.change.textContent=`${p?"+":""}${f.change24hPct.toFixed(2)}%`,u.change.classList.toggle("zme__rail-change--up",p)}}}function Re(){let a=S?_e(S):null;vt.textContent=a?.priceUsd?C(a.priceUsd):"\u2014",zt.textContent=a?.change24hPct===null||a?.change24hPct===void 0?"\u2014":`${a.change24hPct>0?"+":""}${a.change24hPct.toFixed(2)}%`,St.textContent=a?.liquidityUsd?le(a.liquidityUsd):"\u2014"}async function be(){if(!ie)return;let a=new AbortController,u=setTimeout(()=>a.abort(),1e4);try{let f=[...ie.values()].map(k=>k.mint),p=await et({mints:f,signal:a.signal});Ie=p.stats,Ue=p.rows,Et(),Re()}catch{}finally{clearTimeout(u)}}function $e(){let a=W(S);return a?He({slug:S,mint:a.mint,rows:Ue}):null}async function ce(a){let u=ge(S),f=$e();if(!f){H.clear(),v(c,"No indexed pool to chart. The trade panel still quotes the venue directly.");return}if(n.take())try{let p=await Ye({pool:f,timeframe:j,signal:a});if(a.aborted)return;if(!p.length){H.clear(),v(c,"No trades in this window yet.");return}v(c,""),H.set({candles:p,timeframe:j,hue:u?.hue})}catch(p){if(p?.name==="AbortError")return;H.clear(),v(c,p?.code==="rate_limited"?"The chart service is rate limiting requests. It will retry shortly.":"Chart unavailable. The trade panel still quotes the venue directly.")}}async function xe(a){let u=W(S),f=$e();if(!u||!f){V.clear(),v(w,"No indexed pool to read trades from.");return}if(n.take())try{let p=await Ze({pool:f,mint:u.mint,signal:a});if(a.aborted)return;if(!p.length){V.clear(),v(w,"No recent trades in this pool.");return}v(w,""),V.set(p,{symbol:u.symbol})}catch(p){if(p?.name==="AbortError")return;V.clear(),v(w,p?.code==="rate_limited"?"The trade feed is rate limiting requests. It will retry shortly.":"Trade feed unavailable.")}}function Be(){clearInterval(pe),clearInterval(fe),pe=null,fe=null}function Tt(){if(Be(),!A)return;let{signal:a}=A;pe=setInterval(()=>{document.visibilityState!=="hidden"&&ce(a)},nn),fe=setInterval(()=>{document.visibilityState!=="hidden"&&xe(a)},rn)}function Ct(){A&&(v(c,""),ce(A.signal))}function At(a){$.replaceChildren();for(let{side:u,rungs:f}of a)for(let p of f){let k=s("tr",u==="buy"?"zme__ladder-row--buy":"zme__ladder-row--sell"),z=[s("td","zme__ladder-side",u==="buy"?"Buy":"Sell"),s("td",null,`$${p.notional}`)];if(p.error){let X=p.error==="no_route"?"no route":"unavailable",Q=s("td",null,X);Q.colSpan=2,z.push(Q)}else z.push(s("td",null,C(p.price)),s("td",null,p.impactBps===null?"\u2014":`${(p.impactBps/100).toFixed(2)}%`));k.append(...z),$.append(k)}}async function Pe(){let a=W(S);if(!a||!A)return;let u=Date.now();if(u<se)return;se=u+on,F.disabled=!0;let{signal:f}=A;v(B,"");try{let p=_e(S),k=await Ae({mint:a.mint,side:"buy",signal:f}),z=p?.priceUsd?await Ae({mint:a.mint,side:"sell",midPriceUsd:p.priceUsd,signal:f}):{side:"sell",rungs:Ce.map(X=>({notional:X,error:"unavailable"}))};if(f.aborted)return;At([k,z])}catch(p){p?.name!=="AbortError"&&($.replaceChildren(),v(B,"Venue quotes unavailable just now."))}finally{setTimeout(()=>{G||(F.disabled=!1)},Math.max(0,se-Date.now()))}}F.addEventListener("click",()=>Pe());function kt(){let a=ge(S),u=W(S);if(ae?.destroy?.(),ae=null,L.replaceChildren(),!a||!u){L.append(K("The registry could not be read, so there is nothing to trade against."));return}let f=S;ln().then(p=>{if(G||f!==S||!p){!p&&!G&&f===S&&L.append(K("The trade panel could not load. The record page lists the venue route directly."));return}ae=p.mount(L,{name:a.name,slug:a.slug,mint:u.mint,hue:a.hue,iconUrl:`/assets/zodiac-icons/128/${a.slug}.webp`})})}function ye(a){if(a===S)return;S=a,A?.abort(),A=new AbortController,se=0,F.disabled=!1,$.replaceChildren(),v(B,"");let u=ge(a);e.style.setProperty("--sign",u?.hue??"#C6CCDA");for(let[k,z]of he)z.button.setAttribute("aria-pressed",String(k===a));let f=W(a);m.textContent=f?.symbol?`${f.symbol} / USD`:u?.name??"\u2014",H.clear(),V.clear(),v(c,"Reading the chart\u2026"),v(w,"Reading recent trades\u2026"),Re(),kt();let{signal:p}=A;ce(p),xe(p),Tt(),Pe()}function Oe(){if(document.visibilityState!=="visible"||!A)return;let{signal:a}=A;ce(a),xe(a),be()}return document.addEventListener("visibilitychange",Oe),v(c,"Reading the registry\u2026"),v(w,""),cn().then(a=>{G||(ie=a,ye("aries"),be(),Le=setInterval(()=>{document.visibilityState!=="hidden"&&be()},tn))}).catch(()=>{G||(v(c,"The registry could not be read. Nothing verified, nothing shown \u2014 try again shortly."),L.append(K("The registry could not be read, so there is nothing to trade against.")))}),{select:ye,destroy(){G=!0,A?.abort(),Be(),clearInterval(Le),document.removeEventListener("visibilitychange",Oe),ae?.destroy?.(),H.destroy(),V.destroy(),e.remove()}}}function un(){if(document.querySelector("style[data-zme-styles]"))return;let t=document.createElement("style");t.setAttribute("data-zme-styles",""),t.textContent=Ge,document.head.appendChild(t)}function yt(){let t=document.querySelector("[data-zme-terminal]");!t||t.dataset.zmeMounted||(t.dataset.zmeMounted="1",un(),xt({host:t}))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",yt,{once:!0}):yt();})();
