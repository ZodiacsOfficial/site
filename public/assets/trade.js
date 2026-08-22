/* Generated from src/trade/ by scripts/build-trade.mjs — do not edit directly. */
"use strict";(()=>{var Ne="https://lite-api.jup.ag";var Ut=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_unconfirmed","execute_failed"]),D=class extends Error{constructor(t,n,{cause:a,retryAfterMs:o=null}={}){super(n,a?{cause:a}:void 0),this.name="TradeError",this.code=t,this.retryAfterMs=o}};function _(e,t,n){throw new D(e,t,n)}var se=Object.freeze({background:0,quote:1,trade:2}),ce=Symbol.for("zodiacs.registry.jupiter-request-gate");function le(){return Object.assign(new Error("The request was cancelled."),{name:"AbortError"})}function nt({spacingMs:e=2100,now:t=Date.now,setTimeout:n=setTimeout,clearTimeout:a=clearTimeout}={}){let o=0,u=!1,p=null,l=Number.NEGATIVE_INFINITY,c=[];function f(g){let b=c.indexOf(g);b>=0&&c.splice(b,1),g.signal?.removeEventListener?.("abort",g.onAbort)}function d(){let g=0;for(let b=1;b<c.length;b+=1){let x=c[b],A=c[g],T=se[x.requestClass],C=se[A.requestClass];(T>C||T===C&&x.sequence<A.sequence)&&(g=b)}return c.splice(g,1)[0]}function m(){if(u||p)return;for(let x=c.length-1;x>=0;x-=1){if(!c[x].signal?.aborted)continue;let A=c[x];f(A),A.reject(le())}if(!c.length)return;let g=Math.max(0,l+e-t());if(g>0){p=n(()=>{p=null,m()},g);return}let b=d();b.started=!0,b.signal?.removeEventListener?.("abort",b.onAbort),u=!0,l=t(),Promise.resolve().then(()=>b.task()).then(b.resolve,b.reject).finally(()=>{u=!1,m()})}function i(g,{requestClass:b="quote",signal:x}={}){return x?.aborted?Promise.reject(le()):new Promise((A,T)=>{let C={task:g,requestClass:Object.prototype.hasOwnProperty.call(se,b)?b:"quote",signal:x,sequence:o+=1,started:!1,resolve:A,reject:T,onAbort:null};C.onAbort=()=>{C.started||(f(C),T(le()),!c.length&&p&&(a(p),p=null),m())},x?.addEventListener?.("abort",C.onAbort,{once:!0}),c.push(C),m()})}return Object.freeze({schedule:i})}function rt(){return typeof window>"u"?null:(globalThis[ce]||(globalThis[ce]=nt()),globalThis[ce])}function qe(e,t){let n=rt();return n?n.schedule(e,t):e()}function Le(e,t){let n=new AbortController,a=!1,o=()=>n.abort();e?.aborted?n.abort():e?.addEventListener?.("abort",o,{once:!0});let u=setTimeout(()=>{a=!0,n.abort()},t);return{signal:n.signal,timedOut:()=>a,cleanup(){clearTimeout(u),e?.removeEventListener?.("abort",o)}}}function ot(e,t=Date.now()){let n=e?.headers?.get?.("retry-after");if(!n)return null;let a=Number(n),o=Number.isFinite(a)?a*1e3:Date.parse(n)-t;return!Number.isFinite(o)||o<0?null:Math.min(12e4,Math.round(o))}function de(e,t){let n=String(e??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(n)||_("invalid_amount","Enter an amount using digits and a single decimal point.");let[a="",o=""]=n.split(".");o.length>t&&_("invalid_amount",`That amount is finer than this token's ${t} decimals.`);let u=BigInt((a||"0")+o.padEnd(t,"0"));return u<=0n&&_("invalid_amount","Enter an amount greater than zero."),u}function De(e,t,{maxFractionDigits:n=t}={}){let a=BigInt(e),o=a<0n,u=(o?-a:a).toString().padStart(t+1,"0"),p=u.slice(0,u.length-t),l=t>0?u.slice(u.length-t):"";return n<l.length&&(l=l.slice(0,n)),l=l.replace(/0+$/,""),`${o?"-":""}${p}${l?`.${l}`:""}`}function ze(e){let t=Number(e);if(!Number.isFinite(t))return"unknown";let n=Math.abs(t);return n<1?"low":n<5?"notable":"severe"}function at(e,t){let n=new URL("/ultra/v1/order",e);for(let[a,o]of Object.entries(t))o!=null&&o!==""&&n.searchParams.set(a,String(o));return n.toString()}async function Me(e){try{return await e.json()}catch(t){if(t?.name==="AbortError")throw t;_("unavailable","The venue did not return a readable answer.",{cause:t})}}async function $e({inputMint:e,outputMint:t,amount:n,taker:a,baseUrl:o=Ne,fetchImpl:u=globalThis.fetch,signal:p,requestClass:l=a?"trade":"quote",deadlineMs:c=12e3}){let f=at(o,{inputMint:e,outputMint:t,amount:String(n),taker:a}),d=null;try{let m;try{m=await qe(()=>(d=Le(p,c),u(f,{method:"GET",signal:d.signal,headers:{accept:"application/json"}})),{requestClass:l,signal:p})}catch(g){if(g?.name==="AbortError"&&!d?.timedOut())throw g;_("network","The price could not be reached just now.",{cause:g})}m.status===429&&_("rate_limited","The venue is rate limiting requests. Try again shortly.",{retryAfterMs:ot(m)}),m.status>=500&&_("unavailable","The venue did not answer.");let i;try{i=await Me(m)}catch(g){throw g?.name==="AbortError"&&d?.timedOut()&&_("network","The price could not be reached just now.",{cause:g}),g}if(i?.error||!m.ok){let g=typeof i?.error=="string"?i.error:"no route";/quote|route|liquidity/i.test(g)&&_("no_route","No route is available for that amount right now."),_("unavailable","The venue could not price that trade.")}return it(i)}catch(m){if(m instanceof D||m?.name==="AbortError")throw m;_("network","The price could not be reached just now.",{cause:m})}finally{d?.cleanup()}}function it(e){(!e||typeof e!="object")&&_("unavailable","The venue returned no order.");let{inputMint:t,outputMint:n,inAmount:a,outAmount:o,requestId:u}=e;(!t||!n||!a||!o)&&_("unavailable","The venue returned an incomplete order.");let p,l;try{p=BigInt(a),l=BigInt(o)}catch(b){_("unavailable","The venue returned unreadable amounts.",{cause:b})}let c=e.platformFee?.feeBps??e.feeBps,f=typeof c=="number"||typeof c=="string"&&c.trim()!=="",d=Number(c);(!f||!Number.isInteger(d)||d<0||d>10)&&_("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet.");let m=e.priceImpactPct,i=typeof m=="number"||typeof m=="string"&&m.trim()!=="",g=Number(m);return(!i||!Number.isFinite(g))&&_("unavailable","The venue returned no readable price impact."),{inputMint:t,outputMint:n,inAmount:p,outAmount:l,priceImpactPct:g,feeBps:d,routeLabels:Array.isArray(e.routePlan)?e.routePlan.map(b=>b?.swapInfo?.label).filter(Boolean):[],requestId:u??null,transaction:e.transaction??null,inUsdValue:Number(e.inUsdValue??0),outUsdValue:Number(e.outUsdValue??0)}}function ue(e,t){return(e.inputMint!==t.inputMint||e.outputMint!==t.outputMint)&&_("order_mismatch","The venue answered for a different token than the one shown."),e.inAmount!==BigInt(t.amount)&&_("order_mismatch","The venue answered for a different amount than the one entered."),e.outAmount<=0n&&_("order_mismatch","The venue returned an empty amount."),(!Number.isInteger(e.feeBps)||e.feeBps<0||e.feeBps>10)&&_("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet."),e}function Pe(e){return typeof e.transaction=="string"&&e.transaction.length>0&&typeof e.requestId=="string"&&e.requestId.length>0}async function Ie({signedTransaction:e,requestId:t,baseUrl:n=Ne,fetchImpl:a=globalThis.fetch,signal:o,deadlineMs:u=2e4}){(!e||!t)&&_("execute_failed","The signed transaction was incomplete.");let p=null;try{let l;try{l=await qe(()=>(p=Le(o,u),a(new URL("/ultra/v1/execute",n).toString(),{method:"POST",signal:p.signal,headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({signedTransaction:e,requestId:t})})),{requestClass:"trade",signal:o})}catch(f){if(f?.name==="AbortError"&&!p?.timedOut())throw f;_("execute_unconfirmed","The result could not be confirmed from here.",{cause:f})}let c;try{c=await Me(l)}catch(f){if(f?.name==="AbortError"&&!p?.timedOut())throw f;_("execute_unconfirmed","The result could not be confirmed from here.",{cause:f})}if(l.ok||_("execute_unconfirmed","The result could not be confirmed from here."),c?.status==="Failed"){let f=c?.error||c?.status||"the venue rejected it";_("execute_failed",`The trade did not go through: ${f}.`)}return(c?.status!=="Success"||c?.code!==0||typeof c?.signature!="string"||c.signature.length===0)&&_("execute_unconfirmed","The result could not be confirmed from here."),{signature:c.signature,slot:c?.slot??null,status:c.status}}catch(l){if(l instanceof D||l?.name==="AbortError")throw l;_("execute_unconfirmed","The result could not be confirmed from here.",{cause:l})}finally{p?.cleanup()}}var Ue=`
.tp {
  --tp-ink: #EEF1F7;
  --tp-ink-2: #C6CCDA;
  --tp-dim: #8E96AB;
  --tp-hair: rgba(198,204,218,.10);
  --tp-hair-2: rgba(198,204,218,.22);
  --tp-hair-3: rgba(198,204,218,.42);
  --tp-surface: rgba(13,16,25,.94);
  --tp-gold: #E7C879;
  --tp-gold-dim: rgba(231,200,121,.58);
  --tp-red: #D4603F;
  container-type: inline-size;
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 22px;
  border: 1px solid color-mix(in srgb, var(--tp-sign, #C6CCDA) 30%, var(--tp-hair));
  border-radius: 24px;
  background:
    radial-gradient(90% 60% at 4% 0%, color-mix(in srgb, var(--tp-sign, #C6CCDA) 13%, transparent), transparent 70%),
    radial-gradient(65% 45% at 100% 2%, rgba(231,200,121,.075), transparent 72%),
    linear-gradient(150deg, rgba(255,255,255,.025), transparent 34%),
    var(--tp-surface);
  box-shadow:
    inset 0 0 0 1px rgba(255,255,255,.025),
    0 22px 60px rgba(0,0,0,.24);
  color: var(--tp-ink-2);
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.5;
  text-align: left;
}
.tp *, .tp *::before, .tp *::after { box-sizing: border-box; }

/* The landing-page sheet is already the machined outer surface. Flatten the
   portable panel inside it so the checkout reads as one object, and clear the
   sheet's close affordance in older shells where it was floated. Catalogue
   pages still get the bordered standalone panel above. */
.stage-sheet .consumer-trade {
  display: flow-root;
  clear: both;
  width: 100%;
  min-width: 0;
}
.stage-sheet .tp {
  width: 100%;
  max-width: none;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.tp__head {
  display: flex; align-items: center; gap: 12px;
  margin-bottom: 14px; padding-bottom: 14px;
  border-bottom: 1px solid var(--tp-hair);
}
.tp__disc {
  width: 40px; height: 40px; padding: 2px;
  border: 1px solid color-mix(in srgb, var(--tp-sign, #C6CCDA) 55%, transparent);
  border-radius: 50%; display: block; flex: none;
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tp-sign, #C6CCDA) 7%, transparent);
}
.tp__who { display: flex; flex-direction: column; min-width: 0; }
.tp__name {
  color: var(--tp-ink);
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 21px; font-weight: 500; line-height: 1.05;
}
.tp__sub { margin-top: 3px; color: var(--tp-dim); font-size: 11.5px; }
.tp__venue {
  margin-left: auto; padding: 5px 8px;
  border: 1px solid rgba(231,200,121,.18); border-radius: 999px;
  color: var(--tp-gold-dim); font-size: 9px; letter-spacing: .13em;
  text-transform: uppercase; text-align: right;
}

.tp__asset-note {
  margin: 0; padding: 11px 12px;
  border: 1px solid rgba(231,200,121,.17); border-radius: 12px;
  background: linear-gradient(100deg, rgba(231,200,121,.065), transparent 76%);
  color: var(--tp-ink-2); font-size: 11.5px; line-height: 1.48;
}
.tp__flow { display: block; }
.tp__step {
  position: relative;
  padding: 16px 0;
  border-top: 1px solid var(--tp-hair);
}
.tp__step:first-child { border-top: 0; }
.tp__step[hidden], .tp__complete[hidden] { display: none; }
.tp__step-head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }
.tp__step-number {
  display: inline-grid; place-items: center;
  width: 21px; height: 21px; border: 1px solid rgba(231,200,121,.27);
  border-radius: 50%; color: var(--tp-gold-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 8.5px; letter-spacing: .02em;
}
.tp__step-title {
  margin: 0; color: var(--tp-ink);
  font-family: 'EB Garamond', Georgia, serif;
  font-size: 18px; font-weight: 500; line-height: 1;
}

.tp .lab {
  display: block; margin-bottom: 7px;
  color: var(--tp-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase;
}
.tp .pay, .tp .get {
  display: flex; align-items: baseline; gap: 8px;
  min-height: 58px; padding: 11px 15px;
  border: 1px solid var(--tp-hair-2); border-radius: 14px;
  background: rgba(6,7,9,.5);
}
.tp .pay { border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 26%, var(--tp-hair-2)); }
.tp .pay__input {
  flex: 1 1 auto; min-width: 0; width: 100%;
  border: 0; background: transparent; padding: 0;
  color: var(--tp-ink);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 28px; letter-spacing: -.025em;
}
.tp .pay__input:focus { outline: none; }
.tp .pay:focus-within {
  border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 66%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--tp-sign, #C6CCDA) 10%, transparent);
}
.tp .unit { color: var(--tp-dim); font-size: 13px; flex: none; }
.tp .sub { margin: 7px 0 0; color: var(--tp-dim); font-size: 12px; }

.tp .amts {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.tp .amts button {
  min-width: 0; min-height: 45px; padding: 0 10px;
  border: 1px solid var(--tp-hair-2); border-radius: 12px;
  background: transparent; color: var(--tp-ink-2);
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition:
    transform 140ms cubic-bezier(.23,1,.32,1),
    border-color 220ms cubic-bezier(.23,1,.32,1),
    color 220ms cubic-bezier(.23,1,.32,1),
    background 220ms cubic-bezier(.23,1,.32,1);
}
.tp .amts button:active { transform: scale(.98); }
.tp .amts button[aria-pressed='true'] {
  color: var(--tp-ink);
  border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 70%, transparent);
  background: color-mix(in srgb, var(--tp-sign, #C6CCDA) 14%, transparent);
}

.tp .quote[hidden] { display: none; }
.tp .out {
  flex: 1 1 auto; min-width: 0;
  color: var(--tp-ink);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 26px; letter-spacing: -.01em;
  overflow-wrap: anywhere;
}
.tp .out.is-waiting { color: var(--tp-dim); }
.tp .usd { margin: 7px 0 0; color: var(--tp-dim); font-size: 12px; }

.tp .facts {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px; margin-top: 10px;
}
.tp .fact {
  min-width: 0; padding: 8px 9px;
  border: 1px solid var(--tp-hair); border-radius: 9px;
  background: rgba(255,255,255,.018);
  color: var(--tp-dim); font-size: 10.5px; line-height: 1.35;
}
.tp .fact.severe { color: var(--tp-red); }
.tp .details {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px; margin: 9px 0 0; padding: 0;
  overflow: hidden; border: 1px solid var(--tp-hair); border-radius: 10px;
  background: var(--tp-hair);
}
.tp .detail { min-width: 0; padding: 8px 9px; background: rgba(8,10,16,.92); }
.tp .detail dt {
  margin: 0 0 3px; color: var(--tp-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 7.5px; letter-spacing: .12em; text-transform: uppercase;
}
.tp .detail dd {
  min-width: 0; margin: 0; color: var(--tp-ink-2);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 10.5px; overflow-wrap: anywhere;
}
.tp .detail a { color: inherit; text-decoration-color: rgba(231,200,121,.3); text-underline-offset: 3px; }
.tp .warn {
  margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--tp-red) 40%, transparent);
  border-radius: 10px; color: var(--tp-ink-2); font-size: 12.5px;
}
.tp .review-notice {
  margin: 10px 0 0; padding: 10px 11px;
  border: 1px solid rgba(231,200,121,.3); border-radius: 10px;
  background: rgba(231,200,121,.055);
  color: var(--tp-ink-2); font-size: 11.5px; line-height: 1.45;
}
.tp .warn[hidden], .tp .review-notice[hidden], .tp .err[hidden], .tp .after[hidden] { display: none; }

.tp .payseg {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.tp .payseg button {
  display: flex; flex-direction: column; align-items: flex-start; justify-content: center;
  min-width: 0; min-height: 58px; padding: 9px 11px;
  border: 1px solid var(--tp-hair-2); border-radius: 12px;
  background: transparent; color: var(--tp-ink-2);
  font-family: inherit; text-align: left; cursor: pointer;
  transition:
    transform 140ms cubic-bezier(.23,1,.32,1),
    border-color 220ms cubic-bezier(.23,1,.32,1),
    color 220ms cubic-bezier(.23,1,.32,1),
    background 220ms cubic-bezier(.23,1,.32,1);
}
.tp .payseg__eyebrow {
  color: var(--tp-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 7.5px; letter-spacing: .11em; line-height: 1.2; text-transform: uppercase;
}
.tp .payseg__label { margin-top: 4px; color: inherit; font-size: 12px; line-height: 1.2; }
.tp .payseg button:active { transform: scale(.985); }
.tp .payseg button[aria-pressed='true'] {
  color: var(--tp-ink);
  border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 70%, transparent);
  background: color-mix(in srgb, var(--tp-sign, #C6CCDA) 14%, transparent);
}
.tp .amts button:disabled, .tp .payseg button:disabled { opacity: .5; cursor: wait; }
.tp .route-hint, .tp .action-intro {
  margin: 8px 0 0; color: var(--tp-dim); font-size: 11.5px; line-height: 1.45;
}
.tp .action-intro { margin: 0 0 10px; color: var(--tp-ink-2); }

.tp .action { margin-top: 0; }
.tp__go {
  display: flex; align-items: center; justify-content: center;
  width: 100%; min-height: 52px; padding: 0 20px;
  border: 1px solid rgba(255,255,255,.14); border-radius: 999px;
  background: linear-gradient(135deg, #F1E5BC, var(--tp-gold)); color: #090B10;
  font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
  transition:
    transform 140ms cubic-bezier(.23,1,.32,1),
    opacity 220ms cubic-bezier(.23,1,.32,1);
}
.tp__go:active:not(:disabled) { transform: scale(.985); }
.tp__go:disabled { opacity: .42; cursor: default; }
.tp .nowallet { margin: 10px 0 0; color: var(--tp-dim); font-size: 12px; text-align: center; }

/* Four ways to fund, one row each: mark, name, what the company does. */
.tp .ramps { display: grid; gap: 6px; list-style: none; margin: 0; padding: 0; }
.tp .ramps li { border: 0; }
.tp .ramp {
  display: flex; align-items: center; gap: 12px;
  min-height: 48px; padding: 7px 9px;
  border: 1px solid var(--tp-hair); border-radius: 10px;
  background: rgba(255,255,255,.016);
  color: var(--tp-ink-2); text-decoration: none;
  transition: color 200ms cubic-bezier(.23,1,.32,1);
}
.tp .ramp__who { display: inline-flex; align-items: center; gap: 8px; flex: none; }
.tp .ramp__name { font-size: 14px; color: inherit; }
.tp .ramp__note {
  flex: 1 1 auto; min-width: 0;
  color: var(--tp-dim); font-size: 12px; text-align: right;
}
.tp .ramps .go {
  display: inline-grid; place-items: center;
  width: 26px; height: 26px; flex: none;
  border-radius: 50%;
  background: rgba(198,204,218,.06);
  color: var(--tp-dim); font-size: 11px;
  transition:
    transform 180ms cubic-bezier(.23,1,.32,1),
    background 180ms cubic-bezier(.23,1,.32,1),
    color 180ms cubic-bezier(.23,1,.32,1);
}
/* Brand marks are single-colour masks: currentColor does not reach an <img>. */
.tp__mark {
  display: inline-block; height: 21px;
  background: currentColor;
  mask-repeat: no-repeat; mask-position: center; mask-size: contain;
  -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
}
/* The Apple Pay lockup rides beside the name of a provider that takes it. */
.tp__mark.ap { height: 15px; opacity: .9; }

.tp .err {
  margin: 14px 0 0; padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--tp-red) 45%, transparent);
  border-radius: 10px; color: var(--tp-ink-2); font-size: 13px;
}
.tp .after { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tp .after li { padding-left: 16px; position: relative; color: var(--tp-ink-2); font-size: 13px; }
.tp .after li::before { content: '\xB7'; position: absolute; left: 4px; color: var(--tp-dim); }
.tp .note {
  margin: 16px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--tp-hair);
  color: var(--tp-dim);
  font-size: 11.5px;
  line-height: 1.55;
}
.tp__complete {
  margin-top: 16px; padding: 16px;
  border: 1px solid color-mix(in srgb, var(--tp-sign, #C6CCDA) 32%, var(--tp-hair));
  border-radius: 14px;
  background: color-mix(in srgb, var(--tp-sign, #C6CCDA) 7%, transparent);
}
.tp__complete-kicker {
  margin: 0; color: var(--tp-gold-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 8px; letter-spacing: .14em; text-transform: uppercase;
}

.tp button:focus-visible, .tp a:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--tp-sign, #C6CCDA) 74%, white);
  outline-offset: 3px;
}

@container (max-width: 340px) {
  .tp { padding: 14px; border-radius: 18px; }
  .tp__head { margin-bottom: 10px; padding-bottom: 10px; }
  .tp__asset-note { padding: 9px 10px; font-size: 10.5px; line-height: 1.4; }
  .tp__step { padding: 12px 0; }
  .tp__step-head { margin-bottom: 9px; }
  .tp .pay__input { font-size: 26px; }
  .tp .out { font-size: 22px; }
  .tp .amts {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 6px; margin-top: 8px;
  }
  .tp .amts button { min-height: 45px; padding: 0 4px; font-size: 12px; }
  .tp .payseg { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  .tp .payseg button { min-height: 54px; padding: 7px 8px; }
  .tp .payseg__label { font-size: 11.5px; }
  .tp .facts, .tp .details { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tp .facts { gap: 6px; margin-top: 8px; }
  .tp .fact, .tp .detail { padding: 7px 8px; }
  /* Provider rows remain horizontal at phone width. Notes may take two lines,
     but four separate full-width sub-rows make the funding path needlessly tall. */
  .tp .ramp {
    gap: 8px;
    padding: 7px;
  }
  .tp .ramp__who { gap: 6px; }
  .tp .ramp__name { font-size: 12.5px; }
  .tp .ramp__note { font-size: 10.5px; line-height: 1.25; }
}

/* The wallet chooser, only ever raised when more than one is installed. */
.tp-pick {
  position: fixed; inset: 0; z-index: 110;
  display: flex; align-items: center; justify-content: center;
  padding: 20px; background: rgba(6,7,9,.72);
}
.tp-pick__box {
  width: 100%; max-width: 320px; padding: 20px;
  border: 1px solid rgba(198,204,218,.22); border-radius: 18px;
  background: #0F121A; color: #C6CCDA;
  font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
}
.tp-pick__title {
  margin: 0 0 14px; color: #EEF1F7;
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase;
}
.tp-pick__w, .tp-pick__x {
  display: flex; align-items: center; gap: 10px;
  width: 100%; min-height: 48px; margin-bottom: 8px; padding: 0 14px;
  border: 1px solid rgba(198,204,218,.22); border-radius: 12px;
  background: transparent; color: #C6CCDA;
  font-family: inherit; font-size: 14px; cursor: pointer;
  transition:
    transform 140ms cubic-bezier(.23,1,.32,1),
    border-color 200ms cubic-bezier(.23,1,.32,1),
    color 200ms cubic-bezier(.23,1,.32,1);
}
.tp-pick__w:active, .tp-pick__x:active { transform: scale(.985); }
.tp-pick__w:focus-visible, .tp-pick__x:focus-visible { outline: 2px solid #C6CCDA; outline-offset: 3px; }
.tp-pick__x { justify-content: center; margin-bottom: 0; color: #8E96AB; }

@media (hover: hover) and (pointer: fine) {
  .tp .amts button:hover,
  .tp .payseg button:hover { color: var(--tp-ink); border-color: var(--tp-hair-3); }
  .tp .ramp:hover { color: var(--tp-ink); }
  .tp .ramp:hover .go {
    transform: translate(1px,-1px);
    background: rgba(198,204,218,.10);
    color: var(--tp-ink);
  }
  .tp__go:hover { opacity: .9; }
  .tp-pick__w:hover, .tp-pick__x:hover { color: #EEF1F7; border-color: rgba(198,204,218,.42); }
}

@media (prefers-reduced-motion: reduce) {
  .tp *, .tp-pick * { transition-duration: 0.01ms !important; }
}
`;var st="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",Rt=new Map([...st].map((e,t)=>[e,BigInt(t)]));function ct(){return globalThis.CustomEvent}function Be(e,t=window){let n=new Set,a=()=>e([...n].sort((l,c)=>l.name.localeCompare(c.name))),o=Object.freeze({register:(...l)=>{for(let c of l)c?.features?.["standard:connect"]&&n.add(c);return a(),()=>{for(let c of l)n.delete(c);a()}}}),u=(l=>{let c=l.detail;typeof c=="function"&&c(o)});t.addEventListener("wallet-standard:register-wallet",u);let p=ct();return t.dispatchEvent(new p("wallet-standard:app-ready",{detail:o})),a(),()=>t.removeEventListener("wallet-standard:register-wallet",u)}var lt="solana:mainnet",dt="solana:signTransaction";function K(){let e=new Error("The wallet was dismissed.");return e.name="WalletDismissed",e}function Fe(e){return e?e.name==="WalletDismissed"||e.code===4001||e.code===-32603?!0:/reject|refus|denied|declin|cancel|dismiss|user closed/i.test(String(e.message??"")):!1}function ut(e){let t=atob(e),n=new Uint8Array(t.length);for(let a=0;a<t.length;a+=1)n[a]=t.charCodeAt(a);return n}function pt(e){let t="";for(let n=0;n<e.length;n+=32768)t+=String.fromCharCode(...e.subarray(n,n+32768));return btoa(t)}function mt(e,t){return[...(t?.accounts?.length?t.accounts:e.accounts)??[]].find(a=>!a.chains?.length||a.chains.some(o=>o.startsWith("solana:")))??null}function ft(e,t){return e.length===1?Promise.resolve(e[0]):new Promise((n,a)=>{let o=document.createElement("div");o.className="tp-pick";let u=document.createElement("div");u.className="tp-pick__box",u.setAttribute("role","dialog"),u.setAttribute("aria-modal","true"),u.setAttribute("aria-label","Choose a wallet");let p=document.createElement("p");p.className="tp-pick__title",p.textContent="Choose a wallet",u.append(p);let l=()=>{o.remove(),document.removeEventListener("keydown",c)},c=d=>{d.key==="Escape"&&(l(),a(K()))};for(let d of e){let m=document.createElement("button");if(m.type="button",m.className="tp-pick__w",d.icon){let i=document.createElement("img");i.src=d.icon,i.alt="",i.width=24,i.height=24,m.append(i)}m.append(document.createTextNode(d.name)),m.addEventListener("click",()=>{l(),n(d)}),u.append(m)}let f=document.createElement("button");f.type="button",f.className="tp-pick__x",f.textContent="Cancel",f.addEventListener("click",()=>{l(),a(K())}),u.append(f),o.addEventListener("click",d=>{d.target===o&&(l(),a(K()))}),document.addEventListener("keydown",c),o.append(u),(t?.ownerDocument??document).body.append(o),u.querySelector("button")?.focus()})}function Re({host:e=null,target:t=void 0,choose:n=void 0}={}){let a=[],o=Be(l=>{a=l},t??window),u=n??(l=>ft(l,e)),p=null;return{getAddress(){return p?.account.address??null},async connect(){if(p)return p.account.address;if(!a.length)throw new D("unavailable","No Solana wallet was found in this browser.");let l=await u(a),c;try{c=await l.features["standard:connect"].connect()}catch(d){throw Fe(d)?K():d}let f=mt(l,c);if(!f)throw new D("unavailable","That wallet has no Solana account.");return p={wallet:l,account:f},f.address},async signTransaction(l){if(!p)throw new D("unavailable","No wallet is connected.");let c=p.wallet.features[dt];if(!c)throw new D("unavailable","That wallet cannot sign here.");let f;try{f=await c.signTransaction({transaction:ut(l),account:p.account,chain:lt})}catch(m){throw Fe(m)?K():m}let d=f?.[0]?.signedTransaction;if(!d)throw new D("unavailable","The wallet returned nothing to submit.");return pt(d)},destroy(){o(),p=null}}}var ht=Object.freeze(["card","usdc"]),gt=Object.freeze(["idle","quoting","ready","signing","done","error"]),X="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",pe=6,bt=6,xt=Object.freeze(["25","50","100","250"]),yt=Object.freeze([{name:"Coinbase",mark:"coinbase",href:"https://www.coinbase.com/",note:"Fund a wallet with USDC."},{name:"fomo",mark:"fomo",href:"https://fomo.family/",applePay:!0,note:"Fund in-app; verify the mint."},{name:"MoonPay",mark:"moonpay",href:"https://www.moonpay.com/",note:"Buy USDC by card or bank."},{name:"Ramp Network",mark:"ramp",href:"https://rampnetwork.com/",note:"Buy USDC with mobile pay."}]);function vt(e){let t=Number(e);return Number.isFinite(t)?t<1?`${Math.round(t*100)}\xA2`:`$${t.toFixed(2)}`:""}function wt(e,t=bt){let n=De(e,t,{maxFractionDigits:0});return Number(n).toLocaleString("en-US",{maximumFractionDigits:0})}function _t(e,t){let n=(Number(e)||0)*((Number(t)||0)/1e4);return`Jupiter\u2019s fee \u2014 about ${vt(n)} on this trade.`}function Et(e){let t=ze(e),n=Math.abs(Number(e)||0).toFixed(2);return{band:t,text:`Buying this much moves the price ${n}%.`,severe:t==="severe"}}function Oe(e){let t=Number(e);return!Number.isFinite(t)||t<=0?"":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:t<1e4?1:0}).format(t)}function Ct(e,t=Date.now()){let n=Math.max(0,Math.floor((Number(t)-Number(e))/1e3));return!Number.isFinite(n)||!e?"":n<10?"Just now":n<60?`${n}s ago`:`${Math.floor(n/60)}m ago`}function kt(e){let t=String(e||"");return t.length<13?t:`${t.slice(0,5)}\u2026${t.slice(-5)}`}function At(e,t){let n=Math.abs(Number(t)||0).toFixed(2);return`Not much ${e} is for sale right now, so buying this much would push the price up ${n}%. Buying less costs you less.`}function St(e){return e==="card"?"Funding and any ID checks happen with the provider you choose. Zodiacs.org never sees your card or holds your money. Funding USDC is not the Zodiac swap; return here to complete it. Prices move fast, and a Zodiac can lose all its value.":"Your wallet will ask you to approve this before anything happens. Jupiter does the trade, not us \u2014 Zodiacs.org never holds your money and can\u2019t undo a trade once it\u2019s made. Prices here move fast, and a Zodiac can lose all its value."}function Tt(e){return["They are in your wallet already. Nobody else can move them \u2014 not us, not Jupiter.","You do not need to do anything else. There is nothing to claim and nothing to renew.","Sell them whenever you like, the same way you bought them.",`${e} now shows in your Cabinet of Twelve.`]}function Nt(e){switch(e){case"no_route":return"No price right now. Try again in a moment, or try a smaller amount.";case"rate_limited":return"Too many requests just now. Wait a moment and try again.";case"invalid_amount":return"Enter an amount using digits and a single decimal point.";case"order_mismatch":case"unexpected_fee":return"The price that came back did not match what you were shown, so nothing was sent to your wallet. Try again.";case"execute_failed":return"The trade did not go through. Nothing left your wallet.";case"network":return"The price could not be reached just now. Nothing was sent to your wallet. Try again.";case"execute_unconfirmed":return"That could not be confirmed from here. Check your wallet before trying again \u2014 it may still have gone through.";default:return"Something went wrong. Nothing was sent to your wallet."}}function We({state:e="idle",payMethod:t="card",sign:n,amount:a="25",quote:o=null,error:u=null,quotedAt:p=null,nowMs:l=Date.now(),indexedLiquidityUsd:c=null,awaitingReview:f=!1}){if(!gt.includes(e))throw new Error(`panel-model: unknown state ${e}`);if(!ht.includes(t))throw new Error(`panel-model: unknown pay method ${t}`);let d={state:e,payMethod:t,heading:`Buy ${n.name}`,subheading:`Official ${n.name} fungible token`,venue:"Acquisition desk",assetNote:`You are buying the official fungible ${n.name} token \u2014 not a physical item or a 1-of-1 NFT.`,spendTitle:"Choose your spend",routeTitle:"Choose your route",quoteTitle:t==="card"?"Reference quote":"Live swap quote",actionTitle:t==="card"?"Fund with USDC":"Review & approve",actionIntro:t==="card"?"These providers fund a wallet. They do not complete this Zodiac order here.":`Your wallet swaps USDC directly for official ${n.name} through Jupiter.`,payLabel:"Spend",payUnit:"USDC",payHint:"1 USDC is designed to track 1 US dollar",presets:xt,amount:a,methods:[{id:"card",eyebrow:"Fund first",label:"I\u2019m new to crypto"},{id:"usdc",eyebrow:"Direct swap",label:"I already have USDC"}],routeHint:t==="card"?"Get USDC from a provider, then return and choose the direct swap route.":"One wallet approval completes the USDC \u2192 Zodiac swap.",payWays:yt,note:St(t),showQuote:!1,showAction:e==="ready"||e==="signing",facts:[],warning:null,reviewNotice:f?"The price moved by more than 1% before approval. Nothing was sent to your wallet. Review the refreshed quote and approve again if it still works for you.":null,error:null,after:null,details:[{label:"Official mint",value:kt(n.mint),title:n.mint,href:n.mint?`https://solscan.io/token/${encodeURIComponent(n.mint)}`:null},...Oe(c)?[{label:"Indexed liquidity",value:Oe(c)}]:[]]};if(e==="error")return d.error=Nt(u),d;if(e==="done")return d.after=Tt(n.name),d.note="Zodiacs.org never held your keys or funds, and cannot reverse a trade.",d;if(e==="quoting")return d.getLabel="You get",d.actionLabel="Finding the best price\u2026",d.actionDisabled=!0,d;if(o){let m=Et(o.priceImpactPct);d.showQuote=!0,d.getLabel="You get, about",d.receive=wt(o.outAmount),d.receiveUnit=n.name,d.receiveWorth=o.outUsdValue?`worth about $${o.outUsdValue.toFixed(2)} right now`:"",d.facts=[_t(a,o.feeBps),m.text];let i=Ct(p,l);i&&d.details.splice(1,0,{label:"Quote age",value:i}),d.impactBand=m.band,m.severe&&(d.warning=At(n.name,o.priceImpactPct))}return d.actionLabel=e==="signing"?"Approve in your wallet":f?"Review refreshed quote":"Review swap in wallet",d.actionDisabled=e==="signing",d.walletHint="No wallet yet? Phantom and Solflare are free, and hold what you buy.",d}var qt=100,Lt=350;function Dt(e,t){if(!e||e<=0n)return!1;let n=e*BigInt(1e4-qt)/10000n;return t<n}function je({sign:e,deps:t,amount:n="25",payMethod:a="card"}){let{fetchOrder:o,executeOrder:u,wallet:p,onChange:l,setTimeout:c=setTimeout,clearTimeout:f=clearTimeout,now:d=Date.now,fetchLiquidity:m}=t,i={state:"idle",payMethod:a,amount:n,quote:null,error:null,signature:null,awaitingReview:!1,quotedAt:null,indexedLiquidityUsd:Number(e.indexedLiquidityUsd)||null},g=0,b=null,x=!1,A=null,T=null,C=!1,H=!!i.indexedLiquidityUsd,O=null,N=()=>{if(!x)try{l?.(Q(),{...i})}catch{}},Q=()=>We({state:i.state,payMethod:i.payMethod,sign:e,amount:i.amount,quote:i.quote,error:i.error,quotedAt:i.quotedAt,nowMs:d(),indexedLiquidityUsd:i.indexedLiquidityUsd,awaitingReview:i.awaitingReview});function F(k){i.state="error",i.error=k instanceof D?k.code:"unknown",i.quote=null,i.quotedAt=null,N()}async function R(){return H||typeof m!="function"||(H=!0,O=(async()=>{try{let k=Number(await m({mint:e.mint}));if(x||!Number.isFinite(k)||k<=0)return;i.indexedLiquidityUsd=k,N()}catch{}})()),O}async function J(){if(x)return;R(),A?.abort();let k=++g,q;try{q=de(i.amount,pe)}catch(S){F(S);return}let L=new AbortController;A=L,i.state="quoting",i.error=null,N();try{let S=await o({inputMint:X,outputMint:e.mint,amount:q,signal:L.signal});if(x||L.signal.aborted||k!==g)return;ue(S,{inputMint:X,outputMint:e.mint,amount:q}),i.quote=S,i.quotedAt=d(),i.state="ready",N()}catch(S){if(x||L.signal.aborted||S?.name==="AbortError"||k!==g)return;F(S)}finally{A===L&&(A=null)}}function Y(k){i.state!=="signing"&&(g+=1,A?.abort(),i.amount=String(k),i.awaitingReview=!1,b&&f(b),b=c(()=>{b=null,J()},Lt),N())}function W(k){i.state!=="signing"&&(i.payMethod=k,N())}async function j(){if(x||i.state==="signing")return;g+=1,A?.abort(),T?.abort();let k;try{k=de(i.amount,pe)}catch(M){F(M);return}let q=new AbortController;T=q;let L=()=>x||q.signal.aborted,S=i.quote?.outAmount??null;i.state="signing",i.error=null,N();try{let M=p.getAddress()||await p.connect();if(L())return;let z=await o({inputMint:X,outputMint:e.mint,amount:k,taker:M,signal:q.signal});if(L())return;if(ue(z,{inputMint:X,outputMint:e.mint,amount:k}),!Pe(z))throw new D("unavailable","The venue returned no transaction.");if(Dt(S,z.outAmount)){i.quote=z,i.quotedAt=d(),i.state="ready",i.awaitingReview=!0,N();return}let V=await p.signTransaction(z.transaction);if(L())return;C=!0;let G=await u({signedTransaction:V,requestId:z.requestId,signal:q.signal});if(L())return;i.quote=z,i.signature=G.signature,i.state="done",N()}catch(M){if(L()||M?.name==="AbortError")return;if(M?.name==="WalletDismissed"){i.state=i.quote?"ready":"idle",N();return}F(M)}finally{C=!1,T===q&&(T=null)}}function U(){x=!0,g+=1,A?.abort(),C||T?.abort(),b&&f(b),b=null}return{get state(){return{...i}},view:Q,setAmount:Y,setPayMethod:W,refreshQuote:J,refreshMarketContext:R,review:j,destroy:U}}var w="tp";function s(e,t,n){let a=document.createElement(e);return t&&(a.className=t),n!=null&&(a.textContent=n),a}function Ve(e,t){let n=s("span",`${w}__mark`);return n.setAttribute("aria-hidden","true"),n.style.width=`${t}px`,n.style.maskImage=`url(${e})`,n.style.webkitMaskImage=`url(${e})`,n}function Ge(e,t){let n=s("a",null,t);return n.href=e,n.target="_blank",n.rel="noopener noreferrer external nofollow",n}function te(e){let t=s("div",`${w}__step-head`);return t.append(s("span",`${w}__step-number`,String(e)),s("h3",`${w}__step-title`)),t}function He({host:e,sign:t,deps:n,marks:a={}}){let o=s("div",w);o.style.setProperty("--tp-sign",t.hue);let u=s("div",`${w}__head`);if(t.iconUrl){let r=document.createElement("img");r.className=`${w}__disc`,r.src=t.iconUrl,r.alt="",r.width=34,r.height=34,u.append(r)}let p=s("span",`${w}__who`),l=s("span",`${w}__name`),c=s("span",`${w}__sub`);p.append(l,c);let f=s("span",`${w}__venue`);u.append(p,f);let d=s("div",`${w}__body`),m=s("p",`${w}__asset-note`),i=s("div",`${w}__flow`),g=s("span","lab"),b=s("div","pay"),x=document.createElement("input");x.className="pay__input",x.inputMode="decimal",x.spellcheck=!1,x.setAttribute("aria-label","Amount in US dollars");let A=s("span","unit");b.append(x,A);let T=s("p","sub"),C=s("div","amts");C.setAttribute("role","group"),C.setAttribute("aria-label","Choose an amount");let H=s("span","lab"),O=s("div","get"),N=s("span","out"),Q=s("span","unit");O.append(N,Q);let F=s("p","usd"),R=s("div","quote");R.setAttribute("aria-live","polite"),R.append(H,O,F);let J=s("div","facts"),Y=s("dl","details"),W=s("p","warn");W.hidden=!0;let j=s("p","review-notice");j.hidden=!0;let U=s("div","payseg");U.setAttribute("role","group"),U.setAttribute("aria-label","How are you paying");let k=s("p","route-hint"),q=s("div","action"),L=s("p","action-intro"),S=s("button","tp__go");S.type="button";let M=s("p","nowallet"),z=s("div","routes"),V=s("p","err");V.hidden=!0;let G=s("ul","after");G.hidden=!0;let me=s("p","note"),ne=s("section",`${w}__step ${w}__step--spend`),fe=te(1);ne.append(fe,g,b,T,C);let re=s("section",`${w}__step ${w}__step--route`),he=te(2);re.append(he,U,k);let oe=s("section",`${w}__step ${w}__step--quote`),ge=te(3);oe.append(ge,R,J,Y,W,j);let ae=s("section",`${w}__step ${w}__step--action`),be=te(4);ae.append(be,L,q),i.append(ne,re,oe,ae,V);let ee=s("div",`${w}__complete`);ee.hidden=!0,ee.append(s("p",`${w}__complete-kicker`,"Swap complete"),G),d.append(m,i,ee,me),o.append(u,d),e.replaceChildren(o);let xe=()=>{},$=je({sign:t,deps:{...n,onChange:(r,E)=>{xe(r);try{n.onStateChange?.(r,E)}catch{}}}}),ye=null,ve=null,we=null,Z=new Map,ie=null;function Xe(r=[]){let E=new Set;for(let[P,y]of r.entries()){let v=y.label;E.add(v);let h=Z.get(v);if(!h){let B=s("div","detail"),Se=s("dt"),Te=s("dd");B.append(Se,Te),h={wrap:B,term:Se,value:Te,link:null},Z.set(v,h)}h.term.textContent=y.label,y.href?(h.link||(h.link=Ge(y.href,y.value),h.value.replaceChildren(h.link)),h.link.href=y.href,h.link.textContent=y.value,y.title?(h.link.title=y.title,h.link.setAttribute("aria-label",`${y.label}: ${y.title}`)):(h.link.removeAttribute("title"),h.link.removeAttribute("aria-label"))):(h.link&&(h.value.replaceChildren(),h.link=null),h.value.textContent=y.value);let I=Y.children[P]??null;I!==h.wrap&&Y.insertBefore(h.wrap,I)}for(let[P,y]of Z)E.has(P)||(y.wrap.remove(),Z.delete(P));ie=Z.get("Quote age")?.value??null}function _e(r){o.dataset.state=r.state,l.textContent=r.heading,c.textContent=r.subheading,f.textContent=r.venue,g.textContent=r.payLabel,A.textContent=r.payUnit,T.textContent=r.payHint,m.textContent=r.assetNote,fe.querySelector(`.${w}__step-title`).textContent=r.spendTitle,he.querySelector(`.${w}__step-title`).textContent=r.routeTitle,ge.querySelector(`.${w}__step-title`).textContent=r.quoteTitle,be.querySelector(`.${w}__step-title`).textContent=r.actionTitle,k.textContent=r.routeHint,L.textContent=r.actionIntro;let E=r.state==="signing";x.disabled=E,document.activeElement!==x&&(x.value=r.amount),ye!==r.presets&&(C.replaceChildren(...r.presets.map(v=>{let h=s("button",null,`$${v}`);return h.type="button",h.dataset.amount=v,h})),ye=r.presets);for(let v of C.children)v.setAttribute("aria-pressed",String(v.dataset.amount===r.amount)),v.disabled=E;let P=r.methods.map(v=>`${v.id}:${v.label}`).join("|");ve!==P&&(U.replaceChildren(...r.methods.map(v=>{let h=s("button");return h.type="button",h.dataset.method=v.id,h.append(s("span","payseg__eyebrow",v.eyebrow),s("span","payseg__label",v.label)),h})),ve=P);for(let v of U.children)v.setAttribute("aria-pressed",String(v.dataset.method===r.payMethod)),v.disabled=E;oe.hidden=!r.showQuote&&r.state!=="quoting",R.hidden=!r.showQuote&&r.state!=="quoting",H.textContent=r.getLabel||"",N.textContent=r.showQuote?r.receive:r.state==="quoting"?"Finding price\u2026":"",Q.textContent=r.showQuote?r.receiveUnit:"",F.textContent=r.showQuote?r.receiveWorth:"",N.classList.toggle("is-waiting",r.state==="quoting"),J.replaceChildren(...(r.facts||[]).map((v,h)=>{let I=s("span","fact",v);return h===1&&r.impactBand==="severe"&&I.classList.add("severe"),I})),Xe(r.details),W.hidden=!r.warning,W.textContent=r.warning||"",j.hidden=!r.reviewNotice,j.textContent=r.reviewNotice||"",V.hidden=!r.error,V.textContent=r.error||"",G.hidden=!r.after,r.after&&G.replaceChildren(...r.after.map(v=>s("li",null,v))),me.textContent=r.note;let y=!r.showAction||r.error?"hidden":r.payMethod==="card"?"card":"usdc";y!==we&&(q.replaceChildren(),y==="card"?q.append(et(r,a)):y==="usdc"&&q.append(S,M),we=y),y==="usdc"&&(S.textContent=r.actionLabel,S.disabled=!!r.actionDisabled,M.textContent=r.walletHint||""),ae.hidden=y==="hidden",re.hidden=r.state==="done",ne.hidden=r.state==="done",i.hidden=r.state==="done",ee.hidden=!r.after}function et(r,E){z.replaceChildren();let P=s("ul","ramps");for(let y of r.payWays){let v=s("li"),h=Ge(y.href,"");h.className="ramp",h.setAttribute("aria-label",`${y.name} \u2014 opens in a new tab`);let I=s("span","ramp__who");if(E[y.mark]&&I.append(Ve(E[y.mark],22)),I.append(s("span","ramp__name",y.name)),y.applePay&&E.applepay){let B=Ve(E.applepay,36);B.className="tp__mark ap",B.setAttribute("role","img"),B.setAttribute("aria-label","Apple Pay"),B.removeAttribute("aria-hidden"),I.append(B)}h.append(I,s("span","ramp__note",y.note),s("span","go","\u2197")),v.append(h),P.append(v)}return z.append(P),z}let Ee=()=>$.setAmount(x.value),Ce=r=>{let E=r.target.closest("[data-amount]");E&&$.setAmount(E.dataset.amount)},ke=r=>{let E=r.target.closest("[data-method]");E&&$.setPayMethod(E.dataset.method)},Ae=()=>$.review();x.addEventListener("input",Ee),C.addEventListener("click",Ce),U.addEventListener("click",ke),S.addEventListener("click",Ae),xe=_e,_e($.view()),$.refreshQuote();let tt=window.setInterval(()=>{if(!$.state.quote||!ie)return;let r=$.view().details?.find(E=>E.label==="Quote age");r&&(ie.textContent=r.value)},1e4);return{controller:$,destroy(){x.removeEventListener("input",Ee),C.removeEventListener("click",Ce),U.removeEventListener("click",ke),S.removeEventListener("click",Ae),window.clearInterval(tt),$.destroy(),e.replaceChildren()}}}var zt="https://api.dexscreener.com/tokens/v1/solana";function Mt(e,t){let n=String(t||"");if(!n||!Array.isArray(e))return null;let a=new Set,o=0;for(let u of e){if(u?.chainId!=="solana"||u?.baseToken?.address!==n)continue;let p=String(u?.pairAddress||"");if(!p||a.has(p))continue;let l=Number(u?.liquidity?.usd);!Number.isFinite(l)||l<=0||(a.add(p),o+=l)}return o>0?o:null}async function Qe({mint:e,fetchImpl:t=globalThis.fetch,baseUrl:n=zt,signal:a}={}){if(!e||typeof t!="function")return null;let o=await t(`${n}/${encodeURIComponent(e)}`,{method:"GET",headers:{accept:"application/json"},signal:a});return o.ok?Mt(await o.json(),e):null}var Je="data-tp-styles",$t=Object.freeze({coinbase:"/assets/venues/coinbase.svg",fomo:"/assets/venues/fomo.svg",moonpay:"/assets/venues/moonpay.svg",ramp:"/assets/venues/ramp.svg",applepay:"/assets/venues/applepay.svg"}),Ye=new Map;function Pt(e){let t=Ye.get(e);if(t)return t;let n=Qe({mint:e}).catch(()=>null);return Ye.set(e,n),n}function It(){if(document.querySelector(`[${Je}]`))return;let e=document.createElement("style");e.setAttribute(Je,""),e.textContent=Ue,document.head.append(e)}function Ke(e,t,n={}){if(!e||!t?.mint)return null;It();let a=Re({host:e}),o=He({host:e,sign:t,deps:{fetchOrder:$e,executeOrder:Ie,wallet:a,fetchLiquidity:({mint:u})=>Pt(u),onStateChange:n.onStateChange},marks:$t});return{controller:o.controller,destroy(){o.destroy(),a.destroy()}}}function Ze(){for(let e of document.querySelectorAll("[data-trade-panel]")){let t=e.dataset.tradeSign;!t||e.dataset.tradeMounted||(e.dataset.tradeMounted="1",Ke(e,{name:e.dataset.tradeName??t,slug:t,mint:e.dataset.tradeMint,hue:e.dataset.tradeHue||null,iconUrl:`/assets/zodiac-icons/128/${t}.webp`}))}}window.zodiacsTrade=Object.freeze({mount:Ke});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ze,{once:!0}):Ze();})();
