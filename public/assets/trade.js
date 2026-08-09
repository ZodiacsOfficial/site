/* Generated from src/trade/ by scripts/build-trade.mjs — do not edit directly. */
"use strict";(()=>{var Ae="https://lite-api.jup.ag";var Lt=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_failed"]),E=class extends Error{constructor(t,n,{cause:a}={}){super(n,a?{cause:a}:void 0),this.name="TradeError",this.code=t}};function k(e,t,n){throw new E(e,t,n)}function ie(e,t){let n=String(e??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(n)||k("invalid_amount","Enter an amount using digits and a single decimal point.");let[a="",i=""]=n.split(".");i.length>t&&k("invalid_amount",`That amount is finer than this token's ${t} decimals.`);let p=BigInt((a||"0")+i.padEnd(t,"0"));return p<=0n&&k("invalid_amount","Enter an amount greater than zero."),p}function Se(e,t,{maxFractionDigits:n=t}={}){let a=BigInt(e),i=a<0n,p=(i?-a:a).toString().padStart(t+1,"0"),l=p.slice(0,p.length-t),c=t>0?p.slice(p.length-t):"";return n<c.length&&(c=c.slice(0,n)),c=c.replace(/0+$/,""),`${i?"-":""}${l}${c?`.${c}`:""}`}function Te(e){let t=Number(e);if(!Number.isFinite(t))return"unknown";let n=Math.abs(t);return n<1?"low":n<5?"notable":"severe"}function Ye(e,t){let n=new URL("/ultra/v1/order",e);for(let[a,i]of Object.entries(t))i!=null&&i!==""&&n.searchParams.set(a,String(i));return n.toString()}async function Ne(e){try{return await e.json()}catch(t){k("unavailable","The venue did not return a readable answer.",{cause:t})}}async function Le({inputMint:e,outputMint:t,amount:n,taker:a,baseUrl:i=Ae,fetchImpl:p=globalThis.fetch,signal:l}){let c=Ye(i,{inputMint:e,outputMint:t,amount:String(n),taker:a}),m;try{m=await p(c,{method:"GET",signal:l,headers:{accept:"application/json"}})}catch(d){if(d?.name==="AbortError")throw d;k("network","The price could not be reached just now.",{cause:d})}m.status===429&&k("rate_limited","The venue is rate limiting requests. Try again shortly."),m.status>=500&&k("unavailable","The venue did not answer.");let b=await Ne(m);if(b?.error||!m.ok){let d=typeof b?.error=="string"?b.error:"no route";/quote|route|liquidity/i.test(d)&&k("no_route","No route is available for that amount right now."),k("unavailable","The venue could not price that trade.")}return Ke(b)}function Ke(e){(!e||typeof e!="object")&&k("unavailable","The venue returned no order.");let{inputMint:t,outputMint:n,inAmount:a,outAmount:i,requestId:p}=e;(!t||!n||!a||!i)&&k("unavailable","The venue returned an incomplete order.");let l=Number(e.platformFee?.feeBps??e.feeBps??0);return{inputMint:t,outputMint:n,inAmount:BigInt(a),outAmount:BigInt(i),priceImpactPct:Number(e.priceImpactPct??0),feeBps:Number.isFinite(l)?l:51,routeLabels:Array.isArray(e.routePlan)?e.routePlan.map(c=>c?.swapInfo?.label).filter(Boolean):[],requestId:p??null,transaction:e.transaction??null,inUsdValue:Number(e.inUsdValue??0),outUsdValue:Number(e.outUsdValue??0)}}function se(e,t){return(e.inputMint!==t.inputMint||e.outputMint!==t.outputMint)&&k("order_mismatch","The venue answered for a different token than the one shown."),e.inAmount!==BigInt(t.amount)&&k("order_mismatch","The venue answered for a different amount than the one entered."),e.outAmount<=0n&&k("order_mismatch","The venue returned an empty amount."),e.feeBps>50&&k("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet."),e}function qe(e){return typeof e.transaction=="string"&&e.transaction.length>0&&typeof e.requestId=="string"&&e.requestId.length>0}async function ze({signedTransaction:e,requestId:t,baseUrl:n=Ae,fetchImpl:a=globalThis.fetch,signal:i}){(!e||!t)&&k("execute_failed","The signed transaction was incomplete.");let p;try{p=await a(new URL("/ultra/v1/execute",n).toString(),{method:"POST",signal:i,headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({signedTransaction:e,requestId:t})})}catch(c){if(c?.name==="AbortError")throw c;k("network","The result could not be confirmed from here.",{cause:c})}let l=await Ne(p);if(!p.ok||l?.status==="Failed"||l?.error){let c=l?.error||l?.status||"the venue rejected it";k("execute_failed",`The trade did not go through: ${c}.`)}return{signature:l?.signature??null,slot:l?.slot??null,status:l?.status??"Success"}}var De=`
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
`;var Xe="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",Dt=new Map([...Xe].map((e,t)=>[e,BigInt(t)]));function et(){return globalThis.CustomEvent}function $e(e,t=window){let n=new Set,a=()=>e([...n].sort((c,m)=>c.name.localeCompare(m.name))),i=Object.freeze({register:(...c)=>{for(let m of c)m?.features?.["standard:connect"]&&n.add(m);return a(),()=>{for(let m of c)n.delete(m);a()}}}),p=(c=>{let m=c.detail;typeof m=="function"&&m(i)});t.addEventListener("wallet-standard:register-wallet",p);let l=et();return t.dispatchEvent(new l("wallet-standard:app-ready",{detail:i})),a(),()=>t.removeEventListener("wallet-standard:register-wallet",p)}var tt="solana:mainnet",nt="solana:signTransaction";function H(){let e=new Error("The wallet was dismissed.");return e.name="WalletDismissed",e}function Be(e){return e?e.name==="WalletDismissed"||e.code===4001||e.code===-32603?!0:/reject|refus|denied|declin|cancel|dismiss|user closed/i.test(String(e.message??"")):!1}function ot(e){let t=atob(e),n=new Uint8Array(t.length);for(let a=0;a<t.length;a+=1)n[a]=t.charCodeAt(a);return n}function rt(e){let t="";for(let n=0;n<e.length;n+=32768)t+=String.fromCharCode(...e.subarray(n,n+32768));return btoa(t)}function at(e,t){return[...(t?.accounts?.length?t.accounts:e.accounts)??[]].find(a=>!a.chains?.length||a.chains.some(i=>i.startsWith("solana:")))??null}function it(e,t){return e.length===1?Promise.resolve(e[0]):new Promise((n,a)=>{let i=document.createElement("div");i.className="tp-pick";let p=document.createElement("div");p.className="tp-pick__box",p.setAttribute("role","dialog"),p.setAttribute("aria-modal","true"),p.setAttribute("aria-label","Choose a wallet");let l=document.createElement("p");l.className="tp-pick__title",l.textContent="Choose a wallet",p.append(l);let c=()=>{i.remove(),document.removeEventListener("keydown",m)},m=d=>{d.key==="Escape"&&(c(),a(H()))};for(let d of e){let v=document.createElement("button");if(v.type="button",v.className="tp-pick__w",d.icon){let s=document.createElement("img");s.src=d.icon,s.alt="",s.width=24,s.height=24,v.append(s)}v.append(document.createTextNode(d.name)),v.addEventListener("click",()=>{c(),n(d)}),p.append(v)}let b=document.createElement("button");b.type="button",b.className="tp-pick__x",b.textContent="Cancel",b.addEventListener("click",()=>{c(),a(H())}),p.append(b),i.addEventListener("click",d=>{d.target===i&&(c(),a(H()))}),document.addEventListener("keydown",m),i.append(p),(t?.ownerDocument??document).body.append(i),p.querySelector("button")?.focus()})}function Me({host:e=null,target:t=void 0,choose:n=void 0}={}){let a=[],i=$e(c=>{a=c},t??window),p=n??(c=>it(c,e)),l=null;return{getAddress(){return l?.account.address??null},async connect(){if(l)return l.account.address;if(!a.length)throw new E("unavailable","No Solana wallet was found in this browser.");let c=await p(a),m;try{m=await c.features["standard:connect"].connect()}catch(d){throw Be(d)?H():d}let b=at(c,m);if(!b)throw new E("unavailable","That wallet has no Solana account.");return l={wallet:c,account:b},b.address},async signTransaction(c){if(!l)throw new E("unavailable","No wallet is connected.");let m=l.wallet.features[nt];if(!m)throw new E("unavailable","That wallet cannot sign here.");let b;try{b=await m.signTransaction({transaction:ot(c),account:l.account,chain:tt})}catch(v){throw Be(v)?H():v}let d=b?.[0]?.signedTransaction;if(!d)throw new E("unavailable","The wallet returned nothing to submit.");return rt(d)},destroy(){i(),l=null}}}var st=Object.freeze(["card","usdc"]),ct=Object.freeze(["idle","quoting","ready","signing","done","error"]),G="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",ce=6,dt=6,pt=Object.freeze(["25","50","100","250"]),lt=Object.freeze([{name:"Coinbase",mark:"coinbase",href:"https://www.coinbase.com/",note:"Fund a wallet with USDC."},{name:"fomo",mark:"fomo",href:"https://fomo.family/",applePay:!0,note:"Fund in-app; verify the mint."},{name:"MoonPay",mark:"moonpay",href:"https://www.moonpay.com/",note:"Buy USDC by card or bank."},{name:"Ramp Network",mark:"ramp",href:"https://rampnetwork.com/",note:"Buy USDC with mobile pay."}]);function ut(e){let t=Number(e);return Number.isFinite(t)?t<1?`${Math.round(t*100)}\xA2`:`$${t.toFixed(2)}`:""}function mt(e,t=dt){let n=Se(e,t,{maxFractionDigits:0});return Number(n).toLocaleString("en-US",{maximumFractionDigits:0})}function ft(e,t){let n=(Number(e)||0)*((Number(t)||0)/1e4);return`Jupiter\u2019s fee \u2014 about ${ut(n)} on this trade.`}function ht(e){let t=Te(e),n=Math.abs(Number(e)||0).toFixed(2);return{band:t,text:`Buying this much moves the price ${n}%.`,severe:t==="severe"}}function Pe(e){let t=Number(e);return!Number.isFinite(t)||t<=0?"":new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",notation:"compact",maximumFractionDigits:t<1e4?1:0}).format(t)}function gt(e,t=Date.now()){let n=Math.max(0,Math.floor((Number(t)-Number(e))/1e3));return!Number.isFinite(n)||!e?"":n<10?"Just now":n<60?`${n}s ago`:`${Math.floor(n/60)}m ago`}function bt(e){let t=String(e||"");return t.length<13?t:`${t.slice(0,5)}\u2026${t.slice(-5)}`}function xt(e,t){let n=Math.abs(Number(t)||0).toFixed(2);return`Not much ${e} is for sale right now, so buying this much would push the price up ${n}%. Buying less costs you less.`}function yt(e){return e==="card"?"Funding and any ID checks happen with the provider you choose. Zodiacs.org never sees your card or holds your money. Funding USDC is not the Zodiac swap; return here to complete it. Prices move fast, and a Zodiac can lose all its value.":"Your wallet will ask you to approve this before anything happens. Jupiter does the trade, not us \u2014 Zodiacs.org never holds your money and can\u2019t undo a trade once it\u2019s made. Prices here move fast, and a Zodiac can lose all its value."}function vt(e){return["They are in your wallet already. Nobody else can move them \u2014 not us, not Jupiter.","You do not need to do anything else. There is nothing to claim and nothing to renew.","Sell them whenever you like, the same way you bought them.",`${e} now shows in your Cabinet of Twelve.`]}function wt(e){switch(e){case"no_route":return"No price right now. Try again in a moment, or try a smaller amount.";case"rate_limited":return"Too many requests just now. Wait a moment and try again.";case"invalid_amount":return"Enter an amount using digits and a single decimal point.";case"order_mismatch":case"unexpected_fee":return"The price that came back did not match what you were shown, so nothing was sent to your wallet. Try again.";case"execute_failed":return"The trade did not go through. Nothing left your wallet.";case"network":return"That could not be confirmed from here. Check your wallet before trying again \u2014 it may still have gone through.";default:return"Something went wrong. Nothing was sent to your wallet."}}function Ie({state:e="idle",payMethod:t="card",sign:n,amount:a="25",quote:i=null,error:p=null,quotedAt:l=null,nowMs:c=Date.now(),indexedLiquidityUsd:m=null,awaitingReview:b=!1}){if(!ct.includes(e))throw new Error(`panel-model: unknown state ${e}`);if(!st.includes(t))throw new Error(`panel-model: unknown pay method ${t}`);let d={state:e,payMethod:t,heading:`Buy ${n.name}`,subheading:`Official ${n.name} fungible token`,venue:"Acquisition desk",assetNote:`The gold sculpture is symbolic collection art. You are buying the official fungible ${n.name} token \u2014 not the sculpture, a physical object, or a 1-of-1 NFT.`,spendTitle:"Choose your spend",routeTitle:"Choose your route",quoteTitle:t==="card"?"Reference quote":"Live swap quote",actionTitle:t==="card"?"Fund with USDC":"Review & approve",actionIntro:t==="card"?"These providers fund a wallet. They do not complete this Zodiac order here.":`Your wallet swaps USDC directly for official ${n.name} through Jupiter.`,payLabel:"Spend",payUnit:"USDC",payHint:"1 USDC is designed to track 1 US dollar",presets:pt,amount:a,methods:[{id:"card",eyebrow:"Fund first",label:"I\u2019m new to crypto"},{id:"usdc",eyebrow:"Direct swap",label:"I already have USDC"}],routeHint:t==="card"?"Get USDC from a provider, then return and choose the direct swap route.":"One wallet approval completes the USDC \u2192 Zodiac swap.",payWays:lt,note:yt(t),showQuote:!1,showAction:e==="ready"||e==="signing",facts:[],warning:null,reviewNotice:b?"The price moved by more than 1% before approval. Nothing was sent to your wallet. Review the refreshed quote and approve again if it still works for you.":null,error:null,after:null,details:[{label:"Official mint",value:bt(n.mint),title:n.mint,href:n.mint?`https://solscan.io/token/${encodeURIComponent(n.mint)}`:null},...Pe(m)?[{label:"Indexed liquidity",value:Pe(m)}]:[]]};if(e==="error")return d.error=wt(p),d;if(e==="done")return d.after=vt(n.name),d.note="Zodiacs.org never held your keys or funds, and cannot reverse a trade.",d;if(e==="quoting")return d.getLabel="You get",d.actionLabel="Finding the best price\u2026",d.actionDisabled=!0,d;if(i){let v=ht(i.priceImpactPct);d.showQuote=!0,d.getLabel="You get, about",d.receive=mt(i.outAmount),d.receiveUnit=n.name,d.receiveWorth=i.outUsdValue?`worth about $${i.outUsdValue.toFixed(2)} right now`:"",d.facts=[ft(a,i.feeBps),v.text];let s=gt(l,c);s&&d.details.splice(1,0,{label:"Quote age",value:s}),d.impactBand=v.band,v.severe&&(d.warning=xt(n.name,i.priceImpactPct))}return d.actionLabel=e==="signing"?"Approve in your wallet":b?"Review refreshed quote":"Review swap in wallet",d.actionDisabled=e==="signing",d.walletHint="No wallet yet? Phantom and Solflare are free, and hold what you buy.",d}var _t=100,kt=350;function Ct(e,t){if(!e||e<=0n)return!1;let n=e*BigInt(1e4-_t)/10000n;return t<n}function Fe({sign:e,deps:t,amount:n="25",payMethod:a="card"}){let{fetchOrder:i,executeOrder:p,wallet:l,onChange:c,setTimeout:m=setTimeout,clearTimeout:b=clearTimeout,now:d=Date.now,fetchLiquidity:v}=t,s={state:"idle",payMethod:a,amount:n,quote:null,error:null,signature:null,awaitingReview:!1,quotedAt:null,indexedLiquidityUsd:Number(e.indexedLiquidityUsd)||null},D=0,A=null,C=!1,U=!!s.indexedLiquidityUsd,B=null,_=()=>{C||c?.(W(),{...s})},W=()=>Ie({state:s.state,payMethod:s.payMethod,sign:e,amount:s.amount,quote:s.quote,error:s.error,quotedAt:s.quotedAt,nowMs:d(),indexedLiquidityUsd:s.indexedLiquidityUsd,awaitingReview:s.awaitingReview});function $(x){s.state="error",s.error=x instanceof E?x.code:"unknown",s.quote=null,s.quotedAt=null,_()}async function M(){return U||typeof v!="function"||(U=!0,B=(async()=>{try{let x=Number(await v({mint:e.mint}));if(C||!Number.isFinite(x)||x<=0)return;s.indexedLiquidityUsd=x,_()}catch{}})()),B}async function R(){if(C)return;M();let x=++D,S;try{S=ie(s.amount,ce)}catch(y){$(y);return}s.state="quoting",s.error=null,_();try{let y=await i({inputMint:G,outputMint:e.mint,amount:S});if(x!==D)return;se(y,{inputMint:G,outputMint:e.mint,amount:S}),s.quote=y,s.quotedAt=d(),s.state="ready",_()}catch(y){if(x!==D)return;$(y)}}function J(x){s.state!=="signing"&&(s.amount=String(x),s.awaitingReview=!1,A&&b(A),A=m(()=>{A=null,R()},kt),_())}function P(x){s.state!=="signing"&&(s.payMethod=x,_())}async function V(){if(C||s.state==="signing")return;let x;try{x=ie(s.amount,ce)}catch(y){$(y);return}let S=s.quote?.outAmount??null;s.state="signing",s.error=null,_();try{let y=l.getAddress()||await l.connect(),T=await i({inputMint:G,outputMint:e.mint,amount:x,taker:y});if(se(T,{inputMint:G,outputMint:e.mint,amount:x}),!qe(T))throw new E("unavailable","The venue returned no transaction.");if(Ct(S,T.outAmount)){s.quote=T,s.quotedAt=d(),s.state="ready",s.awaitingReview=!0,_();return}let I=await l.signTransaction(T.transaction),Q=await p({signedTransaction:I,requestId:T.requestId});s.quote=T,s.signature=Q.signature,s.state="done",_()}catch(y){if(y?.name==="WalletDismissed"){s.state=s.quote?"ready":"idle",_();return}$(y)}}function O(){C=!0,D+=1,A&&b(A),A=null}return{get state(){return{...s}},view:W,setAmount:J,setPayMethod:P,refreshQuote:R,refreshMarketContext:M,review:V,destroy:O}}var g="tp";function r(e,t,n){let a=document.createElement(e);return t&&(a.className=t),n!=null&&(a.textContent=n),a}function Ue(e,t){let n=r("span",`${g}__mark`);return n.setAttribute("aria-hidden","true"),n.style.width=`${t}px`,n.style.maskImage=`url(${e})`,n.style.webkitMaskImage=`url(${e})`,n}function We(e,t){let n=r("a",null,t);return n.href=e,n.target="_blank",n.rel="noopener noreferrer external nofollow",n}function X(e){let t=r("div",`${g}__step-head`);return t.append(r("span",`${g}__step-number`,String(e)),r("h3",`${g}__step-title`)),t}function Re({host:e,sign:t,deps:n,marks:a={}}){let i=r("div",g);i.style.setProperty("--tp-sign",t.hue);let p=r("div",`${g}__head`);if(t.iconUrl){let o=document.createElement("img");o.className=`${g}__disc`,o.src=t.iconUrl,o.alt="",o.width=34,o.height=34,p.append(o)}let l=r("span",`${g}__who`),c=r("span",`${g}__name`),m=r("span",`${g}__sub`);l.append(c,m);let b=r("span",`${g}__venue`);p.append(l,b);let d=r("div",`${g}__body`),v=r("p",`${g}__asset-note`),s=r("div",`${g}__flow`),D=r("span","lab"),A=r("div","pay"),C=document.createElement("input");C.className="pay__input",C.inputMode="decimal",C.spellcheck=!1,C.setAttribute("aria-label","Amount in US dollars");let U=r("span","unit");A.append(C,U);let B=r("p","sub"),_=r("div","amts");_.setAttribute("role","group"),_.setAttribute("aria-label","Choose an amount");let W=r("span","lab"),$=r("div","get"),M=r("span","out"),R=r("span","unit");$.append(M,R);let J=r("p","usd"),P=r("div","quote");P.setAttribute("aria-live","polite"),P.append(W,$,J);let V=r("div","facts"),O=r("dl","details"),x=r("p","warn");x.hidden=!0;let S=r("p","review-notice");S.hidden=!0;let y=r("div","payseg");y.setAttribute("role","group"),y.setAttribute("aria-label","How are you paying");let T=r("p","route-hint"),I=r("div","action"),Q=r("p","action-intro"),F=r("button","tp__go");F.type="button";let de=r("p","nowallet"),ee=r("div","routes"),Z=r("p","err");Z.hidden=!0;let Y=r("ul","after");Y.hidden=!0;let pe=r("p","note"),te=r("section",`${g}__step ${g}__step--spend`),le=X(1);te.append(le,D,A,B,_);let ne=r("section",`${g}__step ${g}__step--route`),ue=X(2);ne.append(ue,y,T);let oe=r("section",`${g}__step ${g}__step--quote`),me=X(3);oe.append(me,P,V,O,x,S);let re=r("section",`${g}__step ${g}__step--action`),fe=X(4);re.append(fe,Q,I),s.append(te,ne,oe,re,Z);let K=r("div",`${g}__complete`);K.hidden=!0,K.append(r("p",`${g}__complete-kicker`,"Swap complete"),Y),d.append(v,s,K,pe),i.append(p,d),e.replaceChildren(i);let he=()=>{},N=Fe({sign:t,deps:{...n,onChange:o=>he(o)}}),ge=null,be=null,xe=null,j=new Map,ae=null;function Ve(o=[]){let w=new Set;for(let[L,f]of o.entries()){let h=f.label;w.add(h);let u=j.get(h);if(!u){let z=r("div","detail"),Ce=r("dt"),Ee=r("dd");z.append(Ce,Ee),u={wrap:z,term:Ce,value:Ee,link:null},j.set(h,u)}u.term.textContent=f.label,f.href?(u.link||(u.link=We(f.href,f.value),u.value.replaceChildren(u.link)),u.link.href=f.href,u.link.textContent=f.value,f.title?(u.link.title=f.title,u.link.setAttribute("aria-label",`${f.label}: ${f.title}`)):(u.link.removeAttribute("title"),u.link.removeAttribute("aria-label"))):(u.link&&(u.value.replaceChildren(),u.link=null),u.value.textContent=f.value);let q=O.children[L]??null;q!==u.wrap&&O.insertBefore(u.wrap,q)}for(let[L,f]of j)w.has(L)||(f.wrap.remove(),j.delete(L));ae=j.get("Quote age")?.value??null}function ye(o){i.dataset.state=o.state,c.textContent=o.heading,m.textContent=o.subheading,b.textContent=o.venue,D.textContent=o.payLabel,U.textContent=o.payUnit,B.textContent=o.payHint,v.textContent=o.assetNote,le.querySelector(`.${g}__step-title`).textContent=o.spendTitle,ue.querySelector(`.${g}__step-title`).textContent=o.routeTitle,me.querySelector(`.${g}__step-title`).textContent=o.quoteTitle,fe.querySelector(`.${g}__step-title`).textContent=o.actionTitle,T.textContent=o.routeHint,Q.textContent=o.actionIntro;let w=o.state==="signing";C.disabled=w,document.activeElement!==C&&(C.value=o.amount),ge!==o.presets&&(_.replaceChildren(...o.presets.map(h=>{let u=r("button",null,`$${h}`);return u.type="button",u.dataset.amount=h,u})),ge=o.presets);for(let h of _.children)h.setAttribute("aria-pressed",String(h.dataset.amount===o.amount)),h.disabled=w;let L=o.methods.map(h=>`${h.id}:${h.label}`).join("|");be!==L&&(y.replaceChildren(...o.methods.map(h=>{let u=r("button");return u.type="button",u.dataset.method=h.id,u.append(r("span","payseg__eyebrow",h.eyebrow),r("span","payseg__label",h.label)),u})),be=L);for(let h of y.children)h.setAttribute("aria-pressed",String(h.dataset.method===o.payMethod)),h.disabled=w;oe.hidden=!o.showQuote&&o.state!=="quoting",P.hidden=!o.showQuote&&o.state!=="quoting",W.textContent=o.getLabel||"",M.textContent=o.showQuote?o.receive:o.state==="quoting"?"Finding price\u2026":"",R.textContent=o.showQuote?o.receiveUnit:"",J.textContent=o.showQuote?o.receiveWorth:"",M.classList.toggle("is-waiting",o.state==="quoting"),V.replaceChildren(...(o.facts||[]).map((h,u)=>{let q=r("span","fact",h);return u===1&&o.impactBand==="severe"&&q.classList.add("severe"),q})),Ve(o.details),x.hidden=!o.warning,x.textContent=o.warning||"",S.hidden=!o.reviewNotice,S.textContent=o.reviewNotice||"",Z.hidden=!o.error,Z.textContent=o.error||"",Y.hidden=!o.after,o.after&&Y.replaceChildren(...o.after.map(h=>r("li",null,h))),pe.textContent=o.note;let f=!o.showAction||o.error?"hidden":o.payMethod==="card"?"card":"usdc";f!==xe&&(I.replaceChildren(),f==="card"?I.append(Qe(o,a)):f==="usdc"&&I.append(F,de),xe=f),f==="usdc"&&(F.textContent=o.actionLabel,F.disabled=!!o.actionDisabled,de.textContent=o.walletHint||""),re.hidden=f==="hidden",ne.hidden=o.state==="done",te.hidden=o.state==="done",s.hidden=o.state==="done",K.hidden=!o.after}function Qe(o,w){ee.replaceChildren();let L=r("ul","ramps");for(let f of o.payWays){let h=r("li"),u=We(f.href,"");u.className="ramp",u.setAttribute("aria-label",`${f.name} \u2014 opens in a new tab`);let q=r("span","ramp__who");if(w[f.mark]&&q.append(Ue(w[f.mark],22)),q.append(r("span","ramp__name",f.name)),f.applePay&&w.applepay){let z=Ue(w.applepay,36);z.className="tp__mark ap",z.setAttribute("role","img"),z.setAttribute("aria-label","Apple Pay"),z.removeAttribute("aria-hidden"),q.append(z)}u.append(q,r("span","ramp__note",f.note),r("span","go","\u2197")),h.append(u),L.append(h)}return ee.append(L),ee}let ve=()=>N.setAmount(C.value),we=o=>{let w=o.target.closest("[data-amount]");w&&N.setAmount(w.dataset.amount)},_e=o=>{let w=o.target.closest("[data-method]");w&&N.setPayMethod(w.dataset.method)},ke=()=>N.review();C.addEventListener("input",ve),_.addEventListener("click",we),y.addEventListener("click",_e),F.addEventListener("click",ke),he=ye,ye(N.view()),N.refreshQuote();let Ze=window.setInterval(()=>{if(!N.state.quote||!ae)return;let o=N.view().details?.find(w=>w.label==="Quote age");o&&(ae.textContent=o.value)},1e4);return{controller:N,destroy(){C.removeEventListener("input",ve),_.removeEventListener("click",we),y.removeEventListener("click",_e),F.removeEventListener("click",ke),window.clearInterval(Ze),N.destroy(),e.replaceChildren()}}}var Et="https://api.dexscreener.com/tokens/v1/solana";function At(e,t){let n=String(t||"");if(!n||!Array.isArray(e))return null;let a=new Set,i=0;for(let p of e){if(p?.chainId!=="solana"||p?.baseToken?.address!==n)continue;let l=String(p?.pairAddress||"");if(!l||a.has(l))continue;let c=Number(p?.liquidity?.usd);!Number.isFinite(c)||c<=0||(a.add(l),i+=c)}return i>0?i:null}async function Oe({mint:e,fetchImpl:t=globalThis.fetch,baseUrl:n=Et,signal:a}={}){if(!e||typeof t!="function")return null;let i=await t(`${n}/${encodeURIComponent(e)}`,{method:"GET",headers:{accept:"application/json"},signal:a});return i.ok?At(await i.json(),e):null}var je="data-tp-styles",St=Object.freeze({coinbase:"/assets/venues/coinbase.svg",fomo:"/assets/venues/fomo.svg",moonpay:"/assets/venues/moonpay.svg",ramp:"/assets/venues/ramp.svg",applepay:"/assets/venues/applepay.svg"}),He=new Map;function Tt(e){let t=He.get(e);if(t)return t;let n=Oe({mint:e}).catch(()=>null);return He.set(e,n),n}function Nt(){if(document.querySelector(`[${je}]`))return;let e=document.createElement("style");e.setAttribute(je,""),e.textContent=De,document.head.append(e)}function Je(e,t){if(!e||!t?.mint)return null;Nt();let n=Me({host:e}),a=Re({host:e,sign:t,deps:{fetchOrder:Le,executeOrder:ze,wallet:n,fetchLiquidity:({mint:i})=>Tt(i)},marks:St});return{controller:a.controller,destroy(){a.destroy(),n.destroy()}}}function Ge(){for(let e of document.querySelectorAll("[data-trade-panel]")){let t=e.dataset.tradeSign;!t||e.dataset.tradeMounted||(e.dataset.tradeMounted="1",Je(e,{name:e.dataset.tradeName??t,slug:t,mint:e.dataset.tradeMint,hue:e.dataset.tradeHue||null,iconUrl:`/assets/zodiac-icons/128/${t}.webp`}))}}window.zodiacsTrade=Object.freeze({mount:Je});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Ge,{once:!0}):Ge();})();
