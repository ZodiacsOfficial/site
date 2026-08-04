/* Generated from src/trade/ by scripts/build-trade.mjs — do not edit directly. */
"use strict";(()=>{var ue="https://lite-api.jup.ag";var at=Object.freeze(["invalid_amount","no_route","unavailable","rate_limited","order_mismatch","unexpected_fee","network","execute_failed"]),E=class extends Error{constructor(t,n,{cause:i}={}){super(n,i?{cause:i}:void 0),this.name="TradeError",this.code=t}};function f(e,t,n){throw new E(e,t,n)}function Q(e,t){let n=String(e??"").trim();/^\d+(?:\.\d+)?$|^\.\d+$|^\d+\.$/.test(n)||f("invalid_amount","Enter an amount using digits and a single decimal point.");let[i="",l=""]=n.split(".");l.length>t&&f("invalid_amount",`That amount is finer than this token's ${t} decimals.`);let d=BigInt((i||"0")+l.padEnd(t,"0"));return d<=0n&&f("invalid_amount","Enter an amount greater than zero."),d}function me(e,t,{maxFractionDigits:n=t}={}){let i=BigInt(e),l=i<0n,d=(l?-i:i).toString().padStart(t+1,"0"),r=d.slice(0,d.length-t),s=t>0?d.slice(d.length-t):"";return n<s.length&&(s=s.slice(0,n)),s=s.replace(/0+$/,""),`${l?"-":""}${r}${s?`.${s}`:""}`}function fe(e){let t=Number(e);if(!Number.isFinite(t))return"unknown";let n=Math.abs(t);return n<1?"low":n<5?"notable":"severe"}function Ne(e,t){let n=new URL("/ultra/v1/order",e);for(let[i,l]of Object.entries(t))l!=null&&l!==""&&n.searchParams.set(i,String(l));return n.toString()}async function he(e){try{return await e.json()}catch(t){f("unavailable","The venue did not return a readable answer.",{cause:t})}}async function ge({inputMint:e,outputMint:t,amount:n,taker:i,baseUrl:l=ue,fetchImpl:d=globalThis.fetch,signal:r}){let s=Ne(l,{inputMint:e,outputMint:t,amount:String(n),taker:i}),p;try{p=await d(s,{method:"GET",signal:r,headers:{accept:"application/json"}})}catch(a){if(a?.name==="AbortError")throw a;f("network","The price could not be reached just now.",{cause:a})}p.status===429&&f("rate_limited","The venue is rate limiting requests. Try again shortly."),p.status>=500&&f("unavailable","The venue did not answer.");let u=await he(p);if(u?.error||!p.ok){let a=typeof u?.error=="string"?u.error:"no route";/quote|route|liquidity/i.test(a)&&f("no_route","No route is available for that amount right now."),f("unavailable","The venue could not price that trade.")}return Me(u)}function Me(e){(!e||typeof e!="object")&&f("unavailable","The venue returned no order.");let{inputMint:t,outputMint:n,inAmount:i,outAmount:l,requestId:d}=e;(!t||!n||!i||!l)&&f("unavailable","The venue returned an incomplete order.");let r=Number(e.platformFee?.feeBps??e.feeBps??0);return{inputMint:t,outputMint:n,inAmount:BigInt(i),outAmount:BigInt(l),priceImpactPct:Number(e.priceImpactPct??0),feeBps:Number.isFinite(r)?r:0,routeLabels:Array.isArray(e.routePlan)?e.routePlan.map(s=>s?.swapInfo?.label).filter(Boolean):[],requestId:d??null,transaction:e.transaction??null,inUsdValue:Number(e.inUsdValue??0),outUsdValue:Number(e.outUsdValue??0)}}function Y(e,t){return(e.inputMint!==t.inputMint||e.outputMint!==t.outputMint)&&f("order_mismatch","The venue answered for a different token than the one shown."),e.inAmount!==BigInt(t.amount)&&f("order_mismatch","The venue answered for a different amount than the one entered."),e.outAmount<=0n&&f("order_mismatch","The venue returned an empty amount."),e.feeBps>50&&f("unexpected_fee","The venue quoted an unexpected fee, so nothing was sent to your wallet."),e}function xe(e){return typeof e.transaction=="string"&&e.transaction.length>0&&typeof e.requestId=="string"&&e.requestId.length>0}async function be({signedTransaction:e,requestId:t,baseUrl:n=ue,fetchImpl:i=globalThis.fetch,signal:l}){(!e||!t)&&f("execute_failed","The signed transaction was incomplete.");let d;try{d=await i(new URL("/ultra/v1/execute",n).toString(),{method:"POST",signal:l,headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({signedTransaction:e,requestId:t})})}catch(s){if(s?.name==="AbortError")throw s;f("network","The result could not be confirmed from here.",{cause:s})}let r=await he(d);if(!d.ok||r?.status==="Failed"||r?.error){let s=r?.error||r?.status||"the venue rejected it";f("execute_failed",`The trade did not go through: ${s}.`)}return{signature:r?.signature??null,slot:r?.slot??null,status:r?.status??"Success"}}var ye=`
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

.tp__head { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; }
.tp__disc { width: 34px; height: 34px; border-radius: 50%; display: block; flex: none; }
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
  min-height: 62px; padding: 12px 16px;
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
.tp .pay:focus-within { border-color: color-mix(in srgb, var(--tp-sign, #C6CCDA) 62%, transparent); }
.tp .unit { color: var(--tp-dim); font-size: 13px; flex: none; }
.tp .sub { margin: 7px 0 0; color: var(--tp-dim); font-size: 12px; }

.tp .amts { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.tp .amts button {
  min-height: 38px; padding: 0 16px;
  border: 1px solid var(--tp-hair-2); border-radius: 999px;
  background: transparent; color: var(--tp-ink-2);
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition: border-color 220ms ease, color 220ms ease, background 220ms ease;
}
.tp .amts button:hover { color: var(--tp-ink); border-color: var(--tp-hair-3); }
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
.tp .payseg { display: flex; flex-wrap: wrap; gap: 8px; }
.tp .payseg button {
  flex: 1 1 auto; min-height: 44px; padding: 0 14px;
  border: 1px solid var(--tp-hair-2); border-radius: 12px;
  background: transparent; color: var(--tp-ink-2);
  font-family: inherit; font-size: 13px; cursor: pointer;
  transition: border-color 220ms ease, color 220ms ease, background 220ms ease;
}
.tp .payseg button:hover { color: var(--tp-ink); border-color: var(--tp-hair-3); }
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
  transition: opacity 220ms ease;
}
.tp__go:hover { opacity: .9; }
.tp__go:disabled { opacity: .42; cursor: default; }
.tp .nowallet { margin: 10px 0 0; color: var(--tp-dim); font-size: 12px; text-align: center; }

.tp .route { padding: 14px 0; border-top: 1px solid var(--tp-hair); }
.tp .route--first { border-top: 0; padding-top: 0; }
.tp .route__k {
  margin: 0 0 6px; color: var(--tp-dim);
  font-family: ui-monospace, 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: .14em; text-transform: uppercase;
}
.tp .route__t { margin: 0; color: var(--tp-ink); font-size: 15px; font-weight: 600; }
.tp .route__d { margin: 5px 0 0; color: var(--tp-dim); font-size: 12.5px; }
.tp .route__go {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 12px; min-height: 52px; padding: 0 20px;
  border-radius: 999px; background: var(--tp-ink); color: #060709;
  font-size: 15px; font-weight: 600; text-decoration: none;
}
.tp .route__go:hover { opacity: .9; }

.tp .ramps { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 2px; }
.tp .ramps li { display: flex; align-items: center; gap: 10px; min-height: 44px; color: var(--tp-dim); font-size: 12px; }
.tp .ramps a {
  display: inline-flex; align-items: center; gap: 7px;
  color: var(--tp-ink-2); font-size: 13.5px; text-decoration: none; flex: none;
}
.tp .ramps a:hover { color: var(--tp-ink); }
.tp .ramps .go { color: var(--tp-dim); font-size: 11px; }
/* Brand marks are single-colour masks: currentColor does not reach an <img>. */
.tp__mark {
  display: inline-block; height: 21px;
  background: currentColor;
  mask-repeat: no-repeat; mask-position: center; mask-size: contain;
  -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; -webkit-mask-size: contain;
}
.tp .ap { display: inline-flex; align-items: center; color: var(--tp-ink-2); }
.tp .ap .tp__mark { height: 15px; }

.tp .err {
  margin: 14px 0 0; padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--tp-red) 45%, transparent);
  border-radius: 10px; color: var(--tp-ink-2); font-size: 13px;
}
.tp .after { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tp .after li { padding-left: 16px; position: relative; color: var(--tp-ink-2); font-size: 13px; }
.tp .after li::before { content: '\xB7'; position: absolute; left: 4px; color: var(--tp-dim); }
.tp .note { margin: 16px 0 0; color: var(--tp-dim); font-size: 11.5px; line-height: 1.5; }

@container (max-width: 340px) {
  .tp { padding: 16px; }
  .tp .pay__input { font-size: 26px; }
  .tp .out { font-size: 22px; }
}

/* The wallet chooser, only ever raised when more than one is installed. */
.tp-pick {
  position: fixed; inset: 0; z-index: 9999;
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
}
.tp-pick__w:hover, .tp-pick__x:hover { color: #EEF1F7; border-color: rgba(198,204,218,.42); }
.tp-pick__x { justify-content: center; margin-bottom: 0; color: #8E96AB; }
`;var Be="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",ct=new Map([...Be].map((e,t)=>[e,BigInt(t)]));function ze(){return globalThis.CustomEvent}function ve(e,t=window){let n=new Set,i=()=>e([...n].sort((s,p)=>s.name.localeCompare(p.name))),l=Object.freeze({register:(...s)=>{for(let p of s)p?.features?.["standard:connect"]&&n.add(p);return i(),()=>{for(let p of s)n.delete(p);i()}}}),d=(s=>{let p=s.detail;typeof p=="function"&&p(l)});t.addEventListener("wallet-standard:register-wallet",d);let r=ze();return t.dispatchEvent(new r("wallet-standard:app-ready",{detail:l})),i(),()=>t.removeEventListener("wallet-standard:register-wallet",d)}var qe="solana:mainnet",$e="solana:signTransaction";function I(){let e=new Error("The wallet was dismissed.");return e.name="WalletDismissed",e}function we(e){return e?e.name==="WalletDismissed"||e.code===4001||e.code===-32603?!0:/reject|refus|denied|declin|cancel|dismiss|user closed/i.test(String(e.message??"")):!1}function Ie(e){let t=atob(e),n=new Uint8Array(t.length);for(let i=0;i<t.length;i+=1)n[i]=t.charCodeAt(i);return n}function Ue(e){let t="";for(let n=0;n<e.length;n+=32768)t+=String.fromCharCode(...e.subarray(n,n+32768));return btoa(t)}function Fe(e,t){return[...(t?.accounts?.length?t.accounts:e.accounts)??[]].find(i=>!i.chains?.length||i.chains.some(l=>l.startsWith("solana:")))??null}function We(e,t){return e.length===1?Promise.resolve(e[0]):new Promise((n,i)=>{let l=document.createElement("div");l.className="tp-pick";let d=document.createElement("div");d.className="tp-pick__box",d.setAttribute("role","dialog"),d.setAttribute("aria-modal","true"),d.setAttribute("aria-label","Choose a wallet");let r=document.createElement("p");r.className="tp-pick__title",r.textContent="Choose a wallet",d.append(r);let s=()=>{l.remove(),document.removeEventListener("keydown",p)},p=a=>{a.key==="Escape"&&(s(),i(I()))};for(let a of e){let h=document.createElement("button");if(h.type="button",h.className="tp-pick__w",a.icon){let g=document.createElement("img");g.src=a.icon,g.alt="",g.width=24,g.height=24,h.append(g)}h.append(document.createTextNode(a.name)),h.addEventListener("click",()=>{s(),n(a)}),d.append(h)}let u=document.createElement("button");u.type="button",u.className="tp-pick__x",u.textContent="Cancel",u.addEventListener("click",()=>{s(),i(I())}),d.append(u),l.addEventListener("click",a=>{a.target===l&&(s(),i(I()))}),document.addEventListener("keydown",p),l.append(d),(t?.ownerDocument??document).body.append(l),d.querySelector("button")?.focus()})}function _e({host:e=null,target:t=void 0,choose:n=void 0}={}){let i=[],l=ve(s=>{i=s},t??window),d=n??(s=>We(s,e)),r=null;return{getAddress(){return r?.account.address??null},async connect(){if(r)return r.account.address;if(!i.length)throw new E("unavailable","No Solana wallet was found in this browser.");let s=await d(i),p;try{p=await s.features["standard:connect"].connect()}catch(a){throw we(a)?I():a}let u=Fe(s,p);if(!u)throw new E("unavailable","That wallet has no Solana account.");return r={wallet:s,account:u},u.address},async signTransaction(s){if(!r)throw new E("unavailable","No wallet is connected.");let p=r.wallet.features[$e];if(!p)throw new E("unavailable","That wallet cannot sign here.");let u;try{u=await p.signTransaction({transaction:Ie(s),account:r.account,chain:qe})}catch(h){throw we(h)?I():h}let a=u?.[0]?.signedTransaction;if(!a)throw new E("unavailable","The wallet returned nothing to submit.");return Ue(a)},destroy(){l(),r=null}}}var Oe=Object.freeze(["card","usdc"]),Re=Object.freeze(["idle","quoting","ready","signing","done","error"]),U="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",Z=6,je=6,He=Object.freeze(["25","50","100","250"]),Ve=Object.freeze([{name:"Coinbase",href:"https://www.coinbase.com/",wordmark:!0,applePay:!1,note:"Converts dollars to USDC with no spread or trading fee."},{name:"MoonPay",href:"https://www.moonpay.com/",wordmark:!1,applePay:!1,note:"Cards and bank transfer, USDC on Solana, around 160 countries."},{name:"Ramp Network",href:"https://rampnetwork.com/",wordmark:!1,applePay:!0,note:"Cards, Apple Pay, Google Pay and bank transfer."}]);function Je(e){let t=Number(e);return Number.isFinite(t)?t<1?`${Math.round(t*100)}\xA2`:`$${t.toFixed(2)}`:""}function Ge(e,t=je){let n=me(e,t,{maxFractionDigits:0});return Number(n).toLocaleString("en-US",{maximumFractionDigits:0})}function Qe(e,t){let n=(Number(e)||0)*((Number(t)||0)/1e4);return`Jupiter\u2019s fee \u2014 about ${Je(n)} on this trade.`}function Ye(e){let t=fe(e),n=Math.abs(Number(e)||0).toFixed(2);return{band:t,text:`Buying this much moves the price ${n}%.`,severe:t==="severe"}}function Ze(e,t){let n=Math.abs(Number(t)||0).toFixed(2);return`Not much ${e} is for sale right now, so buying this much would push the price up ${n}%. Buying less costs you less.`}function Ke(e){return e==="card"?"Whichever you pick, the payment and any ID checks happen with that company \u2014 Zodiacs.org never sees your card and never holds your money. Prices here move fast, and a Zodiac can lose all its value.":"Your wallet will ask you to approve this before anything happens. Jupiter does the trade, not us \u2014 Zodiacs.org never holds your money and can\u2019t undo a trade once it\u2019s made. Prices here move fast, and a Zodiac can lose all its value."}function Xe(e){return["They are in your wallet already. Nobody else can move them \u2014 not us, not Jupiter.","You do not need to do anything else. There is nothing to claim and nothing to renew.","Sell them whenever you like, the same way you bought them.",`${e} now shows in your Cabinet of Twelve.`]}function et(e){switch(e){case"no_route":return"No price right now. Try again in a moment, or try a smaller amount.";case"rate_limited":return"Too many requests just now. Wait a moment and try again.";case"invalid_amount":return"Enter an amount using digits and a single decimal point.";case"order_mismatch":case"unexpected_fee":return"The price that came back did not match what you were shown, so nothing was sent to your wallet. Try again.";case"execute_failed":return"The trade did not go through. Nothing left your wallet.";case"network":return"That could not be confirmed from here. Check your wallet before trying again \u2014 it may still have gone through.";default:return"Something went wrong. Nothing was sent to your wallet."}}function ke({state:e="idle",payMethod:t="card",sign:n,amount:i="25",quote:l=null,error:d=null}){if(!Re.includes(e))throw new Error(`panel-model: unknown state ${e}`);if(!Oe.includes(t))throw new Error(`panel-model: unknown pay method ${t}`);let r={state:e,payMethod:t,heading:`${n.name}`,subheading:`The official ${n.name} token`,venue:"Bought through Jupiter",payLabel:"You pay",payUnit:"USDC",payHint:"US dollars, held as USDC",presets:He,amount:i,methods:[{id:"card",label:"Card or Apple Pay"},{id:"usdc",label:"USDC I already have"}],onRamps:Ve,quickRoute:{kicker:"Quickest \u2014 no USDC needed",title:"Use an app that takes Apple Pay",body:`Apps like fomo let you add money with Apple Pay and trade Solana tokens in the app, so you never touch USDC yourself. You would buy ${n.name} there rather than here.`,href:"https://fomo.family/"},note:Ke(t),showQuote:!1,showAction:e!=="done",facts:[],warning:null,error:null,after:null};if(e==="error")return r.error=et(d),r;if(e==="done")return r.after=Xe(n.name),r.note="Zodiacs.org never held your keys or funds, and cannot reverse a trade.",r;if(e==="quoting")return r.getLabel="You get",r.actionLabel="Finding the best price\u2026",r.actionDisabled=!0,r;if(l){let s=Ye(l.priceImpactPct);r.showQuote=!0,r.getLabel="You get, about",r.receive=Ge(l.outAmount),r.receiveUnit=n.name,r.receiveWorth=l.outUsdValue?`worth about $${l.outUsdValue.toFixed(2)} right now`:"",r.facts=[Qe(i,l.feeBps),s.text],r.impactBand=s.band,s.severe&&(r.warning=Ze(n.name,l.priceImpactPct))}return r.actionLabel=e==="signing"?"Approve it in your wallet":"Review in your wallet",r.actionDisabled=e==="signing",r.walletHint="No wallet yet? Phantom and Solflare are free, and hold what you buy.",r}var tt=100,nt=350;function ot(e,t){if(!e||e<=0n)return!1;let n=e*BigInt(1e4-tt)/10000n;return t<n}function Ce({sign:e,deps:t,amount:n="25",payMethod:i="card"}){let{fetchOrder:l,executeOrder:d,wallet:r,onChange:s,setTimeout:p=setTimeout,clearTimeout:u=clearTimeout}=t,a={state:"idle",payMethod:i,amount:n,quote:null,error:null,signature:null,awaitingReview:!1},h=0,g=null,y=!1,v=()=>{y||s?.(M(),{...a})},M=()=>ke({state:a.state,payMethod:a.payMethod,sign:e,amount:a.amount,quote:a.quote,error:a.error});function w(x){a.state="error",a.error=x instanceof E?x.code:"unknown",a.quote=null,v()}async function B(){if(y)return;let x=++h,A;try{A=Q(a.amount,Z)}catch(b){w(b);return}a.state="quoting",a.error=null,v();try{let b=await l({inputMint:U,outputMint:e.mint,amount:A});if(x!==h)return;Y(b,{inputMint:U,outputMint:e.mint,amount:A}),a.quote=b,a.state="ready",v()}catch(b){if(x!==h)return;w(b)}}function F(x){a.amount=String(x),a.awaitingReview=!1,g&&u(g),g=p(()=>{g=null,B()},nt),v()}function W(x){a.payMethod=x,v()}async function z(){if(y||a.state==="signing")return;let x;try{x=Q(a.amount,Z)}catch(b){w(b);return}let A=a.quote?.outAmount??null;a.state="signing",a.error=null,v();try{let b=r.getAddress()||await r.connect(),_=await l({inputMint:U,outputMint:e.mint,amount:x,taker:b});if(Y(_,{inputMint:U,outputMint:e.mint,amount:x}),!xe(_))throw new E("unavailable","The venue returned no transaction.");if(ot(A,_.outAmount)){a.quote=_,a.state="ready",a.awaitingReview=!0,v();return}let q=await r.signTransaction(_.transaction),S=await d({signedTransaction:q,requestId:_.requestId});a.quote=_,a.signature=S.signature,a.state="done",v()}catch(b){if(b?.name==="WalletDismissed"){a.state=a.quote?"ready":"idle",v();return}w(b)}}function O(){y=!0,h+=1,g&&u(g),g=null}return{get state(){return{...a}},view:M,setAmount:F,setPayMethod:W,refreshQuote:B,review:z,destroy:O}}var T="tp";function c(e,t,n){let i=document.createElement(e);return t&&(i.className=t),n!=null&&(i.textContent=n),i}function Ee(e,t){let n=c("span",`${T}__mark`);return n.setAttribute("aria-hidden","true"),n.style.width=`${t}px`,n.style.maskImage=`url(${e})`,n.style.webkitMaskImage=`url(${e})`,n}function Ae(e,t){let n=c("a",null,t);return n.href=e,n.target="_blank",n.rel="noopener noreferrer external nofollow",n}function Se({host:e,sign:t,deps:n,marks:i={}}){let l=c("div",T);l.style.setProperty("--tp-sign",t.hue);let d=c("div",`${T}__head`);if(t.iconUrl){let o=document.createElement("img");o.className=`${T}__disc`,o.src=t.iconUrl,o.alt="",o.width=34,o.height=34,d.append(o)}let r=c("span",`${T}__who`),s=c("span",`${T}__name`),p=c("span",`${T}__sub`);r.append(s,p);let u=c("span",`${T}__venue`);d.append(r,u);let a=c("div",`${T}__body`),h=c("span","lab"),g=c("div","pay"),y=document.createElement("input");y.className="pay__input",y.inputMode="decimal",y.spellcheck=!1,y.setAttribute("aria-label","Amount in US dollars");let v=c("span","unit");g.append(y,v);let M=c("p","sub"),w=c("div","amts");w.setAttribute("role","group"),w.setAttribute("aria-label","Choose an amount");let B=c("div","meet");B.innerHTML='<i></i><span aria-hidden="true">\u2193</span><i></i>';let F=c("span","lab"),W=c("div","get"),z=c("span","out"),O=c("span","unit");W.append(z,O);let x=c("p","usd"),A=c("div","quote");A.setAttribute("aria-live","polite"),A.append(F,W,x);let b=c("div","facts"),_=c("p","warn");_.hidden=!0;let q=c("p","lab payq","How are you paying?"),S=c("div","payseg");S.setAttribute("role","group"),S.setAttribute("aria-label","How are you paying");let R=c("div","action"),D=c("button","tp__go");D.type="button";let K=c("p","nowallet"),G=c("div","routes"),j=c("p","err");j.hidden=!0;let H=c("ul","after");H.hidden=!0;let X=c("p","note");a.append(h,g,M,w,B,A,b,_,q,S,R,j,H,X),l.append(d,a),e.replaceChildren(l);let ee=()=>{},P=Ce({sign:t,deps:{...n,onChange:o=>ee(o)}}),te=null,ne=null;function oe(o){s.textContent=o.heading,p.textContent=o.subheading,u.textContent=o.venue,h.textContent=o.payLabel,v.textContent=o.payUnit,M.textContent=o.payHint,document.activeElement!==y&&(y.value=o.amount),te!==o.presets&&(w.replaceChildren(...o.presets.map(m=>{let C=c("button",null,`$${m}`);return C.type="button",C.dataset.amount=m,C})),te=o.presets);for(let m of w.children)m.setAttribute("aria-pressed",String(m.dataset.amount===o.amount));ne!==o.methods&&(S.replaceChildren(...o.methods.map(m=>{let C=c("button",null,m.label);return C.type="button",C.dataset.method=m.id,C})),ne=o.methods);for(let m of S.children)m.setAttribute("aria-pressed",String(m.dataset.method===o.payMethod));A.hidden=!o.showQuote&&o.state!=="quoting",F.textContent=o.getLabel||"",z.textContent=o.showQuote?o.receive:"",O.textContent=o.showQuote?o.receiveUnit:"",x.textContent=o.showQuote?o.receiveWorth:"",z.classList.toggle("is-waiting",o.state==="quoting"),b.replaceChildren(...(o.facts||[]).map((m,C)=>{let N=c("span","fact",m);return C===1&&o.impactBand==="severe"&&N.classList.add("severe"),N})),_.hidden=!o.warning,_.textContent=o.warning||"",j.hidden=!o.error,j.textContent=o.error||"",H.hidden=!o.after,o.after&&H.replaceChildren(...o.after.map(m=>c("li",null,m))),X.textContent=o.note;let k=o.payMethod==="card";R.replaceChildren(),o.showAction&&!o.error&&(k?R.append(De(o,i)):(D.textContent=o.actionLabel,D.disabled=!!o.actionDisabled,K.textContent=o.walletHint||"",R.append(D,K))),q.hidden=!o.showAction||!!o.error,S.hidden=q.hidden}function De(o,k){G.replaceChildren();let m=c("div","route route--first");m.append(c("p","route__k",o.quickRoute.kicker),c("p","route__t",o.quickRoute.title),c("p","route__d",o.quickRoute.body));let C=Ae(o.quickRoute.href,"Open fomo \u2197");C.className="route__go",m.append(C);let N=c("div","route");N.append(c("p","route__k","Or buy USDC first, then swap here"));let ce=c("ul","ramps");for(let L of o.onRamps){let V=c("li"),le=L.name.split(" ")[0].toLowerCase(),$=Ae(L.href,"");$.setAttribute("aria-label",L.name);let de=!!k[le];if(de&&$.append(Ee(k[le],L.wordmark?84:21)),(!L.wordmark||!de)&&$.append(document.createTextNode(L.name)),$.append(c("span","go","\u2197")),V.append($),L.applePay&&k.applepay){let pe=c("span","ap"),J=Ee(k.applepay,34);J.setAttribute("role","img"),J.setAttribute("aria-label","Apple Pay"),J.removeAttribute("aria-hidden"),pe.append(J),V.append(pe)}V.append(c("span",null,L.note)),ce.append(V)}return N.append(ce),G.append(m,N),G}let re=()=>P.setAmount(y.value),ae=o=>{let k=o.target.closest("[data-amount]");k&&P.setAmount(k.dataset.amount)},ie=o=>{let k=o.target.closest("[data-method]");k&&P.setPayMethod(k.dataset.method)},se=()=>P.review();return y.addEventListener("input",re),w.addEventListener("click",ae),S.addEventListener("click",ie),D.addEventListener("click",se),ee=oe,oe(P.view()),P.refreshQuote(),{controller:P,destroy(){y.removeEventListener("input",re),w.removeEventListener("click",ae),S.removeEventListener("click",ie),D.removeEventListener("click",se),P.destroy(),e.replaceChildren()}}}var Te="data-tp-styles";function rt(){if(document.querySelector(`[${Te}]`))return;let e=document.createElement("style");e.setAttribute(Te,""),e.textContent=ye,document.head.append(e)}function Le(e,t){if(!e||!t?.mint)return null;rt();let n=_e({host:e}),i=Se({host:e,sign:t,deps:{fetchOrder:ge,executeOrder:be,wallet:n}});return{controller:i.controller,destroy(){i.destroy(),n.destroy()}}}function Pe(){for(let e of document.querySelectorAll("[data-trade-panel]")){let t=e.dataset.tradeSign;!t||e.dataset.tradeMounted||(e.dataset.tradeMounted="1",Le(e,{name:e.dataset.tradeName??t,slug:t,mint:e.dataset.tradeMint,hue:e.dataset.tradeHue||null,iconUrl:`/assets/zodiac-icons/128/${t}.webp`}))}}window.zodiacsTrade=Object.freeze({mount:Le});document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Pe,{once:!0}):Pe();})();
