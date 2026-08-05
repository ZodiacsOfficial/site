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

/* Four ways to pay, one row each: mark, name, what the company does. */
.tp .ramps { list-style: none; margin: 0; padding: 0; }
.tp .ramps li { border-top: 1px solid var(--tp-hair); }
.tp .ramps li:first-child { border-top: 0; }
.tp .ramp {
  display: flex; align-items: center; gap: 12px;
  min-height: 52px; padding: 6px 2px;
  color: var(--tp-ink-2); text-decoration: none;
  transition: color 200ms ease;
}
.tp .ramp:hover { color: var(--tp-ink); }
.tp .ramp__who { display: inline-flex; align-items: center; gap: 8px; flex: none; }
.tp .ramp__name { font-size: 14px; color: inherit; }
.tp .ramp__note {
  flex: 1 1 auto; min-width: 0;
  color: var(--tp-dim); font-size: 12px; text-align: right;
}
.tp .ramps .go { color: var(--tp-dim); font-size: 11px; flex: none; }
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
.tp .after li::before { content: '·'; position: absolute; left: 4px; color: var(--tp-dim); }
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
`;
