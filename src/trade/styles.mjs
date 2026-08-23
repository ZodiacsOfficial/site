/**
 * The panel's stylesheet, as a string the bundle injects once.
 *
 * Token VALUES rather than var() references: the panel mounts on wing pages
 * (`public/registry/…`), which are plain HTML and cannot link the hashed Astro
 * bundle that defines the custom properties. The values below are the Cosmic
 * Void ramp, copied — not invented. `--tp-sign` is set per mount and is the
 * only chroma in here.
 */

export const TP_CSS = `
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
.tp .detail:last-child:nth-child(odd) { grid-column: 1 / -1; }
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
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  margin: 14px 0 0; padding: 11px 13px;
  border: 1px solid color-mix(in srgb, var(--tp-red) 45%, transparent);
  border-radius: 10px; color: var(--tp-ink-2); font-size: 13px;
}
.tp .err__message { margin: 0; }
.tp .err__retry {
  min-height: 44px; flex: none; padding: 0 14px;
  border: 1px solid var(--tp-hair-2); border-radius: 999px;
  background: transparent; color: var(--tp-ink);
  font-family: inherit; font-size: 12px; font-weight: 600; line-height: 1;
  cursor: pointer;
}
.tp .after { list-style: none; margin: 14px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.tp .after li { padding-left: 16px; position: relative; color: var(--tp-ink-2); font-size: 13px; }
.tp .after li::before { content: '·'; position: absolute; left: 4px; color: var(--tp-dim); }
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
`;
