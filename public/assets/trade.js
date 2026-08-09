/* Generated from src/trade/ by scripts/build-trade.mjs — do not edit directly. */
"use strict";(()=>{var se="https://lite-api.jup.ag";var tt=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_failed"]),E=class extends Error{constructor(t,n,{cause:i}={}){super(n,i?{cause:i}:void 0),this.name="TradeError",this.code=t}};function f(e,t,n){throw new E(e,t,n)}function J(e,t){let n=String(e??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(n)||f("invalid_amount","Enter an amount using digits and a single decimal point.");let[i="",c=""]=n.split(".");c.length>t&&f("invalid_amount",`That amount is finer than this token's ${t} decimals.`);let d=BigInt((i||"0")+c.padEnd(t,"0"));return d<=0n&&f("invalid_amount","Enter an amount greater than zero."),d}function ce(e,t,{maxFractionDigits:n=t}={}){let i=BigInt(e),c=i<0n,d=(c?-i:i).toString().padStart(t+1,"0"),o=d.slice(0,d.length-t),s=t>0?d.slice(d.length-t):"";return n<s.length&&(s=s.slice(0,n)),s=s.replace(/0+$/,""),`${c?"-":""}${o}${s?`.${s}`:""}`}function le(e){let t=Number(e);if(!Number.isFinite(t))return"unknown";let n=Math.abs(t);return n<1?"low":n<5?"notable":"severe"}function Ae(e,t){let n=new URL("/ultra/v1/order",e);for(let[i,c]of Object.entries(t))c!=null&&c!==""&&n.searchParams.set(i,String(c));return n.toString()}async function de(e){try{return await e.json()}catch(t){f("unavailable","The venue did not return a readable answer.",{cause:t})}}async function pe({inputMint:e,outputMint:t,amount:n,taker:i,baseUrl:c=se,fetchImpl:d=globalThis.fetch,signal:o}){let s=Ae(c,{inputMint:e,outputMint:t,amount:String(n),taker:i}),p;try{p=await d(s,{method:"GET",signal:o,headers:{accept:"application/json"}})}catch(a){if(a?.name==="AbortError")throw a;f("network","The price could not be reached just now.",{cause:a})}p.status===429&&f("rate_limited","The venue is rate limiting requests. Try again shortly."),p.status>=500&&f("unavailable","The venue did not answer.");let u=await de(p);if(u?.error||!p.ok){let a=typeof u?.error=="string"?u.error:"no route";/quote|route|liquidity/i.test(a)&&f("no_route","No route is available for that amount right now."),f("unavailable","The venue could not price that trade.")}return Se(u)}function Se(e){(!e||typeof e!="object")&&f("unavailable","The venue returned no order.");let{inputMint:t,outputMint:n,inAmount:i,outAmount:c,requestId:d}=e;(!t||!n||!i||!c)&&f("unavailable","The venue returned an incomplete order.");let o=Number(e.platformFee?.feeBps??e.feeBps??0);return{inputMint:t,outputMint:n,inAmount:BigInt(i),outAmount:BigInt(c),priceImpactPct:Number(e.priceImpactPct??0),feeBps:Number.isFinite(o)?o:0,routeLabels:Array.isArray(e.routePlan)?e.routePlan.map(s=>s?.swapInfo?.label).filter(Boolean):[],requestId:d??null,transaction:e.transaction??null,inUsdValue:Number(e.inUsdValue??0),outUsdValue:Number(e.outUsdValue??0)}}function Q(e,t){return(e.inputMint!==t.inputMint||e.outputMint!==t.outputMint)&&f("order_mismatch","The venue answered for a different token than the one shown."),e.inAmount!==BigInt(t.amount)&&f("order_mismatch","The venue answered for a different amount than the one entered."),e.outAmount<=0n&&f("order_mismatch","The venue returned an empty amount."),e.feeBps>50&&f("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet."),e}function ue(e){return typeof e.transaction=="string"&&e.transaction.length>0&&typeof e.requestId=="string"&&e.requestId.length>0}async function me({signedTransaction:e,requestId:t,baseUrl:n=se,fetchImpl:i=globalThis.fetch,signal:c}){(!e||!t)&&f("execute_failed","The signed transaction was incomplete.");let d;try{d=await i(new URL("/ultra/v1/execute",n).toString(),{method:"POST",signal:c,headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({signedTransaction:e,requestId:t})})}catch(s){if(s?.name==="AbortError")throw s;f("network","The result could not be confirmed from here.",{cause:s})}let o=await de(d);if(!d.ok||o?.status==="Failed"||o?.error){let s=o?.error||o?.status||"the venue rejected it";f("execute_failed",`The trade did not go through: ${s}.`)}return{signature:o?.signature??null,slot:o?.slot??null,status:o?.status??"Success"}}var fe=`
.tp {
  --tp-ink: #EEF1F7;
  --tp-ink-2: #C6CCDA;
  --tp-dim: #8E96AB;
  --tp-hair: rgba(198,204,218,.10);
  --tp-hair-2: rgba(198,204,218,.22);
  --tp-hair-3: rgba(198,204,218,.42);
  --tp-surface: rgba(21,25,37,.72);
  --tp-red: #D4603F;
  container-type: inline-size;
  display: block;
  width: 100%;
  min-width: 0;
  margin: 0;
  padding: 20px;
  border: 1px solid color-mix(in srgb, var(--tp-sign, #C6CCDA) 30%, var(--tp-hair));
  border-radius: 20px;
  background:
    radial-gradient(120% 100% at 0% 0%, color-mix(in srgb, var(--tp-sign, #C6CCDA) 11%, transparent), transparent 64%),
    var(--tp-surface);
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

.tp__head { display: flex; align-items: center; gap: 11px; margin-bottom: 20px; }
.tp__disc { width: 36px; height: 36px; border-radius: 50%; display: block; flex: none; }
.tp__who { display: flex; flex-direction: column; min-width: 0; }
.tp__name { color: var(--tp-ink); font-size: 15px; font-weight: 600; }
.tp__sub { color: var(--tp-dim); font-size: 12px; }
.tp__venue {
  margin-left: auto; padding-left: 10px;
  color: var(--tp-dim); font-size: 10.5px; letter-spacing: .1em;
  text-transform: uppercase; text-align: right;
}

.tp .lab {
  display: block; margin-bottom: 7px;
  color: var(--tp-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: .16em; text-transform: uppercase;
}
.tp .pay, .tp .get {
  display: flex; align-items: baseline; gap: 8px;
  min-height: 64px; padding: 12px 16px;
  border: 1px solid var(--tp-hair-2); border-radius: 14px;
  background: rgba(6,7,9,.5);
}
.tp .pay { border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 26%, var(--tp-hair-2)); }
.tp .pay__input {
  flex: 1 1 auto; min-width: 0; width: 100%;
  border: 0; background: transparent; padding: 0;
  color: var(--tp-ink);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 30px; letter-spacing: -.01em;
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
  margin-top: 12px;
}
.tp .amts button {
  min-width: 0; min-height: 44px; padding: 0 10px;
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

.tp .meet { display: flex; align-items: center; gap: 10px; margin: 14px 0; color: var(--tp-dim); font-size: 12px; }
.tp .meet i { flex: 1; height: 1px; background: var(--tp-hair); }

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

.tp .facts { display: flex; flex-direction: column; gap: 4px; margin-top: 14px; }
.tp .fact { color: var(--tp-dim); font-size: 12px; }
.tp .fact.severe { color: var(--tp-red); }
.tp .warn {
  margin: 12px 0 0; padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--tp-red) 40%, transparent);
  border-radius: 10px; color: var(--tp-ink-2); font-size: 12.5px;
}
.tp .warn[hidden], .tp .err[hidden], .tp .after[hidden] { display: none; }

.tp .payq { margin: 20px 0 0; }
.tp .payseg {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.tp .payseg button {
  min-width: 0; min-height: 48px; padding: 8px 12px;
  border: 1px solid var(--tp-hair-2); border-radius: 12px;
  background: transparent; color: var(--tp-ink-2);
  font-family: inherit; font-size: 13px; line-height: 1.25; cursor: pointer;
  transition:
    transform 140ms cubic-bezier(.23,1,.32,1),
    border-color 220ms cubic-bezier(.23,1,.32,1),
    color 220ms cubic-bezier(.23,1,.32,1),
    background 220ms cubic-bezier(.23,1,.32,1);
}
.tp .payseg button:active { transform: scale(.985); }
.tp .payseg button[aria-pressed='true'] {
  color: var(--tp-ink);
  border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 70%, transparent);
  background: color-mix(in srgb, var(--tp-sign, #C6CCDA) 14%, transparent);
}

.tp .action { margin-top: 16px; }
.tp__go {
  display: flex; align-items: center; justify-content: center;
  width: 100%; min-height: 52px; padding: 0 20px;
  border: 0; border-radius: 999px;
  background: var(--tp-ink); color: #060709;
  font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer;
  transition:
    transform 140ms cubic-bezier(.23,1,.32,1),
    opacity 220ms cubic-bezier(.23,1,.32,1);
}
.tp__go:active:not(:disabled) { transform: scale(.985); }
.tp__go:disabled { opacity: .42; cursor: default; }
.tp .nowallet { margin: 10px 0 0; color: var(--tp-dim); font-size: 12px; text-align: center; }

/* Four ways to pay, one row each: mark, name, what the company does. */
.tp .ramps { list-style: none; margin: 0; padding: 0; }
.tp .ramps li { border-top: 1px solid var(--tp-hair); }
.tp .ramps li:first-child { border-top: 0; }
.tp .ramp {
  display: flex; align-items: center; gap: 12px;
  min-height: 50px; padding: 7px 2px;
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

.tp button:focus-visible, .tp a:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--tp-sign, #C6CCDA) 74%, white);
  outline-offset: 3px;
}

@container (max-width: 340px) {
  .tp { padding: 16px; }
  .tp .pay__input { font-size: 26px; }
  .tp .out { font-size: 22px; }
  .tp .amts { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .tp .payseg { grid-template-columns: 1fr; }
  /* Name over note rather than name beside note: a six-word line has nowhere
     to go on a phone once the mark and the arrow have taken their room. */
  .tp .ramp {
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 12px;
    padding: 10px 2px;
  }
  /* Explicit order so the arrow stays on the name's line and only the note
     wraps beneath it \u2014 left to itself it would land on a third line alone. */
  .tp .ramp__who { order: 1; flex: 1 1 auto; }
  .tp .ramps .go { order: 2; }
  .tp .ramp__note { order: 3; flex-basis: 100%; text-align: left; }
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
`;var Te="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",ot=new Map([...Te].map((e,t)=>[e,BigInt(t)]));function Pe(){return globalThis.CustomEvent}function he(e,t=window){let n=new Set,i=()=>e([...n].sort((s,p)=>s.name.localeCompare(p.name))),c=Object.freeze({register:(...s)=>{for(let p of s)p?.features?.["standard:connect"]&&n.add(p);return i(),()=>{for(let p of s)n.delete(p);i()}}}),d=(s=>{let p=s.detail;typeof p=="function"&&p(c)});t.addEventListener("wallet-standard:register-wallet",d);let o=Pe();return t.dispatchEvent(new o("wallet-standard:app-ready",{detail:c})),i(),()=>t.removeEventListener("wallet-standard:register-wallet",d)}var Le="solana:mainnet",ze="solana:signTransaction";function I(){let e=new Error("The wallet was dismissed.");return e.name="WalletDismissed",e}function ge(e){return e?e.name==="WalletDismissed"||e.code===4001||e.code===-32603?!0:/reject|refus|denied|declin|cancel|dismiss|user closed/i.test(String(e.message??"")):!1}function De(e){let t=atob(e),n=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)n[i]=t.charCodeAt(i);return n}function Ne(e){let t="";for(let n=0;n<e.length;n+=32768)t+=String.fromCharCode(...e.subarray(n,n+32768));return btoa(t)}function Me(e,t){return[...(t?.accounts?.length?t.accounts:e.accounts)??[]].find(i=>!i.chains?.length||i.chains.some(c=>c.startsWith("solana:")))??null}function Be(e,t){return e.length===1?Promise.resolve(e[0]):new Promise((n,i)=>{let c=document.createElement("div");c.className="tp-pick";let d=document.createElement("div");d.className="tp-pick__box",d.setAttribute("role","dialog"),d.setAttribute("aria-modal","true"),d.setAttribute("aria-label","Choose a wallet");let o=document.createElement("p");o.className="tp-pick__title",o.textContent="Choose a wallet",d.append(o);let s=()=>{c.remove(),document.removeEventListener("keydown",p)},p=a=>{a.key==="Escape"&&(s(),i(I()))};for(let a of e){let h=document.createElement("button");if(h.type="button",h.className="tp-pick__w",a.icon){let b=document.createElement("img");b.src=a.icon,b.alt="",b.width=24,b.height=24,h.append(b)}h.append(document.createTextNode(a.name)),h.addEventListener("click",()=>{s(),n(a)}),d.append(h)}let u=document.createElement("button");u.type="button",u.className="tp-pick__x",u.textContent="Cancel",u.addEventListener("click",()=>{s(),i(I())}),d.append(u),c.addEventListener("click",a=>{a.target===c&&(s(),i(I()))}),document.addEventListener("keydown",p),c.append(d),(t?.ownerDocument??document).body.append(c),d.querySelector("button")?.focus()})}function be({host:e=null,target:t=void 0,choose:n=void 0}={}){let i=[],c=he(s=>{i=s},t??window),d=n??(s=>Be(s,e)),o=null;return{getAddress(){return o?.account.address??null},async connect(){if(o)return o.account.address;if(!i.length)throw new E("unavailable","No Solana wallet was found in this browser.");let s=await d(i),p;try{p=await s.features["standard:connect"].connect()}catch(a){throw ge(a)?I():a}let u=Me(s,p);if(!u)throw new E("unavailable","That wallet has no Solana account.");return o={wallet:s,account:u},u.address},async signTransaction(s){if(!o)throw new E("unavailable","No wallet is connected.");let p=o.wallet.features[ze];if(!p)throw new E("unavailable","That wallet cannot sign here.");let u;try{u=await p.signTransaction({transaction:De(s),account:o.account,chain:Le})}catch(h){throw ge(h)?I():h}let a=u?.[0]?.signedTransaction;if(!a)throw new E("unavailable","The wallet returned nothing to submit.");return Ne(a)},destroy(){c(),o=null}}}var $e=Object.freeze(["card","usdc"]),Ie=Object.freeze(["idle","quoting","ready","signing","done","error"]),W="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",Y=6,We=6,Fe=Object.freeze(["25","50","100","250"]),qe=Object.freeze([{name:"Coinbase",mark:"coinbase",href:"https://www.coinbase.com/",note:"Dollars to USDC, no trading fee."},{name:"fomo",mark:"fomo",href:"https://fomo.family/",applePay:!0,note:"Apple Pay, trades in the app."},{name:"MoonPay",mark:"moonpay",href:"https://www.moonpay.com/",note:"Cards and bank transfer."},{name:"Ramp Network",mark:"ramp",href:"https://rampnetwork.com/",note:"Cards, Apple Pay, Google Pay."}]);function Ue(e){let t=Number(e);return Number.isFinite(t)?t<1?`${Math.round(t*100)}\xA2`:`$${t.toFixed(2)}`:""}function Oe(e,t=We){let n=ce(e,t,{maxFractionDigits:0});return Number(n).toLocaleString("en-US",{maximumFractionDigits:0})}function Re(e,t){let n=(Number(e)||0)*((Number(t)||0)/1e4);return`Jupiter\u2019s fee \u2014 about ${Ue(n)} on this trade.`}function je(e){let t=le(e),n=Math.abs(Number(e)||0).toFixed(2);return{band:t,text:`Buying this much moves the price ${n}%.`,severe:t==="severe"}}function He(e,t){let n=Math.abs(Number(t)||0).toFixed(2);return`Not much ${e} is for sale right now, so buying this much would push the price up ${n}%. Buying less costs you less.`}function Ve(e){return e==="card"?"Whichever you pick, the payment and any ID checks happen with that company \u2014 Zodiacs.org never sees your card and never holds your money. Prices here move fast, and a Zodiac can lose all its value.":"Your wallet will ask you to approve this before anything happens. Jupiter does the trade, not us \u2014 Zodiacs.org never holds your money and can\u2019t undo a trade once it\u2019s made. Prices here move fast, and a Zodiac can lose all its value."}function Ge(e){return["They are in your wallet already. Nobody else can move them \u2014 not us, not Jupiter.","You do not need to do anything else. There is nothing to claim and nothing to renew.","Sell them whenever you like, the same way you bought them.",`${e} now shows in your Cabinet of Twelve.`]}function Je(e){switch(e){case"no_route":return"No price right now. Try again in a moment, or try a smaller amount.";case"rate_limited":return"Too many requests just now. Wait a moment and try again.";case"invalid_amount":return"Enter an amount using digits and a single decimal point.";case"order_mismatch":case"unexpected_fee":return"The price that came back did not match what you were shown, so nothing was sent to your wallet. Try again.";case"execute_failed":return"The trade did not go through. Nothing left your wallet.";case"network":return"That could not be confirmed from here. Check your wallet before trying again \u2014 it may still have gone through.";default:return"Something went wrong. Nothing was sent to your wallet."}}function xe({state:e="idle",payMethod:t="card",sign:n,amount:i="25",quote:c=null,error:d=null}){if(!Ie.includes(e))throw new Error(`panel-model: unknown state ${e}`);if(!$e.includes(t))throw new Error(`panel-model: unknown pay method ${t}`);let o={state:e,payMethod:t,heading:`${n.name}`,subheading:`The official ${n.name} token`,venue:"Quote via Jupiter",payLabel:"You pay",payUnit:"USDC",payHint:"US dollars, held as USDC",presets:Fe,amount:i,methods:[{id:"card",label:"Card or Apple Pay"},{id:"usdc",label:"USDC I already have"}],payWays:qe,note:Ve(t),showQuote:!1,showAction:e!=="done",facts:[],warning:null,error:null,after:null};if(e==="error")return o.error=Je(d),o;if(e==="done")return o.after=Ge(n.name),o.note="Zodiacs.org never held your keys or funds, and cannot reverse a trade.",o;if(e==="quoting")return o.getLabel="You get",o.actionLabel="Finding the best price\u2026",o.actionDisabled=!0,o;if(c){let s=je(c.priceImpactPct);o.showQuote=!0,o.getLabel="You get, about",o.receive=Oe(c.outAmount),o.receiveUnit=n.name,o.receiveWorth=c.outUsdValue?`worth about $${c.outUsdValue.toFixed(2)} right now`:"",o.facts=[Re(i,c.feeBps),s.text],o.impactBand=s.band,s.severe&&(o.warning=He(n.name,c.priceImpactPct))}return o.actionLabel=e==="signing"?"Approve it in your wallet":"Review in your wallet",o.actionDisabled=e==="signing",o.walletHint="No wallet yet? Phantom and Solflare are free, and hold what you buy.",o}var Qe=100,Ye=350;function Ze(e,t){if(!e||e<=0n)return!1;let n=e*BigInt(1e4-Qe)/10000n;return t<n}function ve({sign:e,deps:t,amount:n="25",payMethod:i="card"}){let{fetchOrder:c,executeOrder:d,wallet:o,onChange:s,setTimeout:p=setTimeout,clearTimeout:u=clearTimeout}=t,a={state:"idle",payMethod:i,amount:n,quote:null,error:null,signature:null,awaitingReview:!1},h=0,b=null,y=!1,w=()=>{y||s?.(z(),{...a})},z=()=>xe({state:a.state,payMethod:a.payMethod,sign:e,amount:a.amount,quote:a.quote,error:a.error});function _(x){a.state="error",a.error=x instanceof E?x.code:"unknown",a.quote=null,w()}async function D(){if(y)return;let x=++h,A;try{A=J(a.amount,Y)}catch(v){_(v);return}a.state="quoting",a.error=null,w();try{let v=await c({inputMint:W,outputMint:e.mint,amount:A});if(x!==h)return;Q(v,{inputMint:W,outputMint:e.mint,amount:A}),a.quote=v,a.state="ready",w()}catch(v){if(x!==h)return;_(v)}}function F(x){a.amount=String(x),a.awaitingReview=!1,b&&u(b),b=p(()=>{b=null,D()},Ye),w()}function q(x){a.payMethod=x,w()}async function N(){if(y||a.state==="signing")return;let x;try{x=J(a.amount,Y)}catch(v){_(v);return}let A=a.quote?.outAmount??null;a.state="signing",a.error=null,w();try{let v=o.getAddress()||await o.connect(),k=await c({inputMint:W,outputMint:e.mint,amount:x,taker:v});if(Q(k,{inputMint:W,outputMint:e.mint,amount:x}),!ue(k))throw new E("unavailable","The venue returned no transaction.");if(Ze(A,k.outAmount)){a.quote=k,a.state="ready",a.awaitingReview=!0,w();return}let M=await o.signTransaction(k.transaction),S=await d({signedTransaction:M,requestId:k.requestId});a.quote=k,a.signature=S.signature,a.state="done",w()}catch(v){if(v?.name==="WalletDismissed"){a.state=a.quote?"ready":"idle",w();return}_(v)}}function U(){y=!0,h+=1,b&&u(b),b=null}return{get state(){return{...a}},view:z,setAmount:F,setPayMethod:q,refreshQuote:D,review:N,destroy:U}}var T="tp";function l(e,t,n){let i=document.createElement(e);return t&&(i.className=t),n!=null&&(i.textContent=n),i}function ye(e,t){let n=l("span",`${T}__mark`);return n.setAttribute("aria-hidden","true"),n.style.width=`${t}px`,n.style.maskImage=`url(${e})`,n.style.webkitMaskImage=`url(${e})`,n}function Ke(e,t){let n=l("a",null,t);return n.href=e,n.target="_blank",n.rel="noopener noreferrer external nofollow",n}function we({host:e,sign:t,deps:n,marks:i={}}){let c=l("div",T);c.style.setProperty("--tp-sign",t.hue);let d=l("div",`${T}__head`);if(t.iconUrl){let r=document.createElement("img");r.className=`${T}__disc`,r.src=t.iconUrl,r.alt="",r.width=34,r.height=34,d.append(r)}let o=l("span",`${T}__who`),s=l("span",`${T}__name`),p=l("span",`${T}__sub`);o.append(s,p);let u=l("span",`${T}__venue`);d.append(o,u);let a=l("div",`${T}__body`),h=l("span","lab"),b=l("div","pay"),y=document.createElement("input");y.className="pay__input",y.inputMode="decimal",y.spellcheck=!1,y.setAttribute("aria-label","Amount in US dollars");let w=l("span","unit");b.append(y,w);let z=l("p","sub"),_=l("div","amts");_.setAttribute("role","group"),_.setAttribute("aria-label","Choose an amount");let D=l("div","meet");D.innerHTML='<i></i><span aria-hidden="true">\u2193</span><i></i>';let F=l("span","lab"),q=l("div","get"),N=l("span","out"),U=l("span","unit");q.append(N,U);let x=l("p","usd"),A=l("div","quote");A.setAttribute("aria-live","polite"),A.append(F,q,x);let v=l("div","facts"),k=l("p","warn");k.hidden=!0;let M=l("p","lab payq","How are you paying?"),S=l("div","payseg");S.setAttribute("role","group"),S.setAttribute("aria-label","How are you paying");let O=l("div","action"),L=l("button","tp__go");L.type="button";let Z=l("p","nowallet"),G=l("div","routes"),R=l("p","err");R.hidden=!0;let j=l("ul","after");j.hidden=!0;let K=l("p","note");a.append(h,b,z,_,D,A,v,k,M,S,O,R,j,K),c.append(d,a),e.replaceChildren(c);let X=()=>{},P=ve({sign:t,deps:{...n,onChange:r=>X(r)}}),ee=null,te=null;function ne(r){s.textContent=r.heading,p.textContent=r.subheading,u.textContent=r.venue,h.textContent=r.payLabel,w.textContent=r.payUnit,z.textContent=r.payHint,document.activeElement!==y&&(y.value=r.amount),ee!==r.presets&&(_.replaceChildren(...r.presets.map(m=>{let g=l("button",null,`$${m}`);return g.type="button",g.dataset.amount=m,g})),ee=r.presets);for(let m of _.children)m.setAttribute("aria-pressed",String(m.dataset.amount===r.amount));te!==r.methods&&(S.replaceChildren(...r.methods.map(m=>{let g=l("button",null,m.label);return g.type="button",g.dataset.method=m.id,g})),te=r.methods);for(let m of S.children)m.setAttribute("aria-pressed",String(m.dataset.method===r.payMethod));A.hidden=!r.showQuote&&r.state!=="quoting",F.textContent=r.getLabel||"",N.textContent=r.showQuote?r.receive:"",U.textContent=r.showQuote?r.receiveUnit:"",x.textContent=r.showQuote?r.receiveWorth:"",N.classList.toggle("is-waiting",r.state==="quoting"),v.replaceChildren(...(r.facts||[]).map((m,g)=>{let B=l("span","fact",m);return g===1&&r.impactBand==="severe"&&B.classList.add("severe"),B})),k.hidden=!r.warning,k.textContent=r.warning||"",R.hidden=!r.error,R.textContent=r.error||"",j.hidden=!r.after,r.after&&j.replaceChildren(...r.after.map(m=>l("li",null,m))),K.textContent=r.note;let C=r.payMethod==="card";O.replaceChildren(),r.showAction&&!r.error&&(C?O.append(Ee(r,i)):(L.textContent=r.actionLabel,L.disabled=!!r.actionDisabled,Z.textContent=r.walletHint||"",O.append(L,Z))),M.hidden=!r.showAction||!!r.error,S.hidden=M.hidden}function Ee(r,C){G.replaceChildren();let m=l("ul","ramps");for(let g of r.payWays){let B=l("li"),H=Ke(g.href,"");H.className="ramp",H.setAttribute("aria-label",`${g.name} \u2014 opens in a new tab`);let V=l("span","ramp__who");if(C[g.mark]&&V.append(ye(C[g.mark],22)),V.append(l("span","ramp__name",g.name)),g.applePay&&C.applepay){let $=ye(C.applepay,36);$.className="tp__mark ap",$.setAttribute("role","img"),$.setAttribute("aria-label","Apple Pay"),$.removeAttribute("aria-hidden"),V.append($)}H.append(V,l("span","ramp__note",g.note),l("span","go","\u2197")),B.append(H),m.append(B)}return G.append(m),G}let re=()=>P.setAmount(y.value),oe=r=>{let C=r.target.closest("[data-amount]");C&&P.setAmount(C.dataset.amount)},ae=r=>{let C=r.target.closest("[data-method]");C&&P.setPayMethod(C.dataset.method)},ie=()=>P.review();return y.addEventListener("input",re),_.addEventListener("click",oe),S.addEventListener("click",ae),L.addEventListener("click",ie),X=ne,ne(P.view()),P.refreshQuote(),{controller:P,destroy(){y.removeEventListener("input",re),_.removeEventListener("click",oe),S.removeEventListener("click",ae),L.removeEventListener("click",ie),P.destroy(),e.replaceChildren()}}}var _e="data-tp-styles",Xe=Object.freeze({coinbase:"/assets/venues/coinbase.svg",fomo:"/assets/venues/fomo.svg",moonpay:"/assets/venues/moonpay.svg",ramp:"/assets/venues/ramp.svg",applepay:"/assets/venues/applepay.svg"});function et(){if(document.querySelector(`[${_e}]`))return;let e=document.createElement("style");e.setAttribute(_e,""),e.textContent=fe,document.head.append(e)}function Ce(e,t){if(!e||!t?.mint)return null;et();let n=be({host:e}),i=we({host:e,sign:t,deps:{fetchOrder:pe,executeOrder:me,wallet:n},marks:Xe});return{controller:i.controller,destroy(){i.destroy(),n.destroy()}}}function ke(){for(let e of document.querySelectorAll("[data-trade-panel]")){let t=e.dataset.tradeSign;!t||e.dataset.tradeMounted||(e.dataset.tradeMounted="1",Ce(e,{name:e.dataset.tradeName??t,slug:t,mint:e.dataset.tradeMint,hue:e.dataset.tradeHue||null,iconUrl:`/assets/zodiac-icons/128/${t}.webp`}))}}window.zodiacsTrade=Object.freeze({mount:Ce});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ke,{once:!0}):ke();})();
