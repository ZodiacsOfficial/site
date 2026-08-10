/**
 * Runtime styles for Registry Pro.
 *
 * The terminal is dense by design, but not decorative: provider state,
 * freshness, and quote provenance remain legible at every breakpoint. Status
 * is never communicated through a red/green pair.
 */

export const REGISTRY_PRO_CSS = String.raw`
.registry-pro {
  margin-top: 28px;
}

.registry-pro__fallback {
  padding: 16px;
  border: 1px solid var(--hair-2, rgba(198,204,218,.17));
  border-radius: 14px;
  background: var(--surface, rgba(13,16,25,.94));
  color: var(--ink-2, #c6ccda);
}

.registry-pro__fallback p { margin: 4px 0 0; }

.rp {
  --rp-bg: #090b10;
  --rp-surface: rgba(14,17,25,.96);
  --rp-surface-2: rgba(20,24,34,.9);
  --rp-ink: #eef1f7;
  --rp-ink-2: #c6ccda;
  --rp-muted: #8a93a6;
  --rp-line: rgba(198,204,218,.1);
  --rp-line-2: rgba(198,204,218,.18);
  --rp-accent: #b6d4e4;
  --rp-ready: #a9d4c4;
  --rp-waiting: #b29dd0;
  --rp-serif: 'EB Garamond', Georgia, serif;
  --rp-sans: 'Instrument Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --rp-mono: 'JetBrains Mono', ui-monospace, monospace;
  --rp-ease-out: cubic-bezier(.23,1,.32,1);
  min-width: 0;
  overflow: hidden;
  overflow: clip;
  border: 1px solid var(--rp-line-2);
  border-radius: 18px;
  background: var(--rp-bg);
  box-shadow: inset 0 1px rgba(238,241,247,.035), 0 36px 100px -68px #000;
  color: var(--rp-ink-2);
  font-family: var(--rp-sans);
  font-size: 13px;
  line-height: 1.45;
}

.rp *,
.rp *::before,
.rp *::after {
  box-sizing: border-box;
}

.rp button,
.rp input,
.rp select {
  font: inherit;
}

.rp button,
.rp select {
  color: inherit;
}

.rp [hidden] {
  display: none !important;
}

.rp .sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.rp :focus-visible {
  outline: 2px solid color-mix(in srgb, var(--rp-accent) 78%, white);
  outline-offset: 2px;
}

.rp__topbar {
  display: flex;
  min-height: 69px;
  gap: 18px;
  align-items: center;
  justify-content: space-between;
  padding: 13px 15px 13px 18px;
  border-bottom: 1px solid var(--rp-line);
  background: linear-gradient(110deg, rgba(21,25,36,.96), rgba(13,16,24,.94));
}

.rp__eyebrow {
  display: block;
  margin: 0 0 4px;
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 8.5px;
  font-weight: 500;
  letter-spacing: .16em;
  line-height: 1.2;
  text-transform: uppercase;
}

.rp__title {
  margin: 0;
  color: var(--rp-ink);
  font-family: var(--rp-serif);
  font-size: clamp(20px, 2.5vw, 27px);
  font-weight: 500;
  letter-spacing: .005em;
  line-height: 1;
}

.rp__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: flex-end;
}

.rp-badge {
  display: inline-flex;
  min-height: 26px;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border: 1px solid var(--rp-line-2);
  border-radius: 999px;
  background: rgba(198,204,218,.035);
  color: var(--rp-ink-2);
  font-family: var(--rp-mono);
  font-size: 8.5px;
  letter-spacing: .075em;
  line-height: 1;
  text-transform: uppercase;
}

.rp-badge::before {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--rp-muted);
  content: '';
}

.rp-badge.is-ready::before { background: var(--rp-ready); box-shadow: 0 0 0 3px color-mix(in srgb, var(--rp-ready) 12%, transparent); }
.rp-badge.is-waiting::before { background: var(--rp-waiting); }
.rp-badge.is-unavailable { color: var(--rp-muted); }

.rp-status {
  margin: 0;
  padding: 8px 11px;
  border-bottom: 1px solid var(--rp-line);
  background: rgba(198,204,218,.025);
  color: var(--rp-muted);
  font-size: 9.5px;
}

.rp-status.is-ready { color: var(--rp-ready); }
.rp-status.is-waiting { color: var(--rp-ink-2); }
.rp-status.is-unavailable { color: var(--rp-muted); }

.rp__rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(108px, 1fr);
  min-width: 0;
  overflow-x: auto;
  border-bottom: 1px solid var(--rp-line);
  background: rgba(9,11,16,.9);
  scrollbar-color: var(--rp-line-2) transparent;
  scrollbar-width: thin;
  overscroll-behavior-inline: contain;
}

.rp-market {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr);
  grid-template-rows: auto auto;
  min-width: 0;
  gap: 2px 8px;
  align-items: center;
  padding: 10px 11px;
  border: 0;
  border-right: 1px solid var(--rp-line);
  border-radius: 0;
  background: transparent;
  color: var(--rp-ink-2);
  cursor: pointer;
  text-align: left;
  transition: background-color 150ms ease, transform 120ms var(--rp-ease-out);
}

.rp-market::after {
  position: absolute;
  right: 9px;
  bottom: 0;
  left: 9px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--sign-hue, var(--sign, var(--rp-accent)));
  content: '';
  opacity: 0;
  transform: scaleX(.72);
  transition: opacity 150ms ease, transform 150ms var(--rp-ease-out);
}

.rp-market:active { transform: scale(.98); }
.rp-market.is-selected { background: color-mix(in srgb, var(--sign-hue, var(--sign, var(--rp-accent))) 7%, transparent); color: var(--rp-ink); }
.rp-market.is-selected::after { opacity: .78; transform: scaleX(1); }

.rp-market__glyph {
  grid-row: span 2;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 1px solid color-mix(in srgb, var(--sign-hue, var(--rp-accent)) 42%, var(--rp-line));
  border-radius: 50%;
  background: color-mix(in srgb, var(--sign-hue, var(--rp-accent)) 9%, transparent);
  color: var(--sign-hue, var(--rp-ink-2));
  font-family: var(--rp-serif);
  font-size: 15px;
  line-height: 1;
}

.rp-market__label,
.rp-market__figures {
  grid-column: 2;
  display: flex;
  min-width: 0;
  gap: 5px;
  align-items: baseline;
  justify-content: space-between;
}

.rp-market__label { grid-row: 1; }
.rp-market__figures { grid-row: 2; }

.rp-market__symbol {
  overflow: hidden;
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 7.5px;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rp-market__name {
  overflow: hidden;
  color: var(--rp-ink);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rp-market__price,
.rp-market__change {
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 8.5px;
  line-height: 1.2;
  white-space: nowrap;
}

.rp-market__change { margin-left: 4px; text-align: right; }
.rp-market__change.is-ready { color: var(--rp-ink-2); }
.rp-market__change.is-unavailable { color: var(--rp-muted); }

.rp__workspace {
  display: grid;
  grid-template-columns: minmax(0, 3fr) minmax(280px, 1fr);
  min-width: 0;
  align-items: start;
}

.rp__market-column {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding: 10px;
  border-right: 1px solid var(--rp-line);
}

.rp__side-column {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding: 10px;
}

.rp-panel,
.rp-ticket,
.rp-chat {
  min-width: 0;
  border: 1px solid var(--rp-line);
  border-radius: 12px;
  background: var(--rp-surface);
  box-shadow: inset 0 1px rgba(238,241,247,.025);
}

.rp-panel__head {
  display: flex;
  min-height: 46px;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-bottom: 1px solid var(--rp-line);
}

.rp-panel__title {
  margin: 0;
  color: var(--rp-ink);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: .025em;
}

.rp-panel__meta {
  margin: 0;
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 8.5px;
  line-height: 1.35;
  text-align: right;
}

.rp-chart {
  position: relative;
  min-width: 0;
}

.rp-chart__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
  align-items: center;
  justify-content: space-between;
  padding: 8px 11px;
  border-bottom: 1px solid var(--rp-line);
}

.rp-chart__canvas {
  position: relative;
  min-height: 330px;
  background:
    linear-gradient(var(--rp-line) 1px, transparent 1px),
    linear-gradient(90deg, var(--rp-line) 1px, transparent 1px),
    #0a0c12;
  background-size: 100% 25%, 16.666% 100%;
}

.rp-chart__canvas canvas {
  display: block;
  width: 100%;
  height: 330px;
}

.rp-chart__readout {
  display: flex;
  min-height: 31px;
  flex-wrap: wrap;
  gap: 6px 13px;
  align-items: center;
  padding: 7px 11px;
  border-top: 1px solid var(--rp-line);
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 8.5px;
}

.rp-chart-data {
  border-top: 1px solid var(--rp-line);
  color: var(--rp-muted);
}

.rp-chart-data summary {
  padding: 8px 11px;
  cursor: pointer;
  color: var(--rp-ink-2);
  font-size: 10px;
  font-weight: 600;
}

.rp-chart-data__scroll {
  max-height: 260px;
  overflow: auto;
  scrollbar-color: var(--rp-line-2) transparent;
  scrollbar-width: thin;
}

.rp-chart-data__table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--rp-mono);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.rp-chart-data__table th,
.rp-chart-data__table td {
  padding: 7px 9px;
  border-top: 1px solid var(--rp-line);
  text-align: right;
  white-space: nowrap;
}

.rp-chart-data__table th:first-child,
.rp-chart-data__table td:first-child { text-align: left; }
.rp-chart-data__table th { color: var(--rp-ink-2); font-weight: 550; }

.rp-chart__state {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  margin: 0;
  background: rgba(9,11,16,.78);
  color: var(--rp-muted);
  text-align: center;
}

.rp-chart__state.is-ready { pointer-events: none; background: transparent; color: transparent; }
.rp-chart__state.is-waiting { color: var(--rp-ink-2); }

.rp-timeframes {
  display: inline-flex;
  padding: 2px;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  background: rgba(9,11,16,.72);
}

.rp-timeframe {
  min-width: 33px;
  padding: 5px 7px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--rp-muted);
  cursor: pointer;
  font-family: var(--rp-mono);
  font-size: 8.5px;
  transition: background-color 140ms ease, color 140ms ease, transform 120ms var(--rp-ease-out);
}

.rp-timeframe:active { transform: scale(.96); }
.rp-timeframe.is-selected { background: rgba(198,204,218,.1); color: var(--rp-ink); }

.rp-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--rp-line);
  border-radius: 11px;
  background: var(--rp-surface);
}

.rp-stat {
  min-width: 0;
  padding: 10px 11px;
}

.rp-stat + .rp-stat { border-left: 1px solid var(--rp-line); }
.rp-stat span { display: block; margin: 0 0 4px; color: var(--rp-muted); font-size: 8.5px; letter-spacing: .06em; text-transform: uppercase; }
.rp-stat strong { display: block; overflow: hidden; color: var(--rp-ink); font-family: var(--rp-mono); font-size: 11px; font-weight: 500; text-overflow: ellipsis; white-space: nowrap; }

.rp-tape {
  min-width: 0;
  overflow: hidden;
}

.rp-tape__scroll {
  max-height: 290px;
  overflow: auto;
  scrollbar-color: var(--rp-line-2) transparent;
  scrollbar-width: thin;
}

.rp-tape table {
  width: 100%;
  border-collapse: collapse;
  font-family: var(--rp-mono);
  font-size: 9px;
  font-variant-numeric: tabular-nums;
}

.rp-tape th,
.rp-tape td {
  padding: 8px 10px;
  border-bottom: 1px solid var(--rp-line);
  text-align: right;
  white-space: nowrap;
}

.rp-tape th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--rp-surface);
  color: var(--rp-muted);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.rp-tape th:first-child,
.rp-tape td:first-child { text-align: left; }
.rp-tape tbody tr:last-child td { border-bottom: 0; }
.rp-tape__row--buy .rp-tape__side::before { color: var(--rp-ready); content: '↑ '; }
.rp-tape__row--sell .rp-tape__side::before { color: var(--rp-waiting); content: '↓ '; }

.rp-button {
  min-height: 32px;
  padding: 6px 9px;
  border: 1px solid var(--rp-line-2);
  border-radius: 8px;
  background: rgba(198,204,218,.055);
  color: var(--rp-ink-2);
  cursor: pointer;
  font-size: 9.5px;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 120ms var(--rp-ease-out);
}

.rp-button:active { transform: scale(.97); }
.rp-button--quiet { background: transparent; color: var(--rp-muted); }
.rp-button:disabled { cursor: not-allowed; opacity: .5; }

.rp-ticket {
  position: sticky;
  top: 84px;
  padding: 13px;
}

.rp-ticket > .rp-panel__head {
  margin: -13px -13px 13px;
}

.rp-ticket__attribution {
  margin: -4px 0 12px;
  color: var(--rp-ink);
  font-family: var(--rp-mono);
  font-size: 10px;
  font-weight: 650;
  line-height: 1.5;
}

.rp-ticket__form {
  display: block;
  min-width: 0;
}

.rp-ticket__sides {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 3px;
  border: 1px solid var(--rp-line);
  border-radius: 10px;
  background: rgba(9,11,16,.7);
}

.rp-ticket__sides button {
  padding: 8px 10px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--rp-muted);
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  transition: background-color 140ms ease, color 140ms ease, transform 120ms var(--rp-ease-out);
}

.rp-ticket__sides button:active { transform: scale(.97); }
.rp-ticket__sides button.is-selected { background: rgba(198,204,218,.1); color: var(--rp-ink); }

.rp-ticket__field {
  display: grid;
  gap: 6px;
  margin-top: 12px;
  color: var(--rp-muted);
  font-size: 9px;
  font-weight: 500;
  letter-spacing: .07em;
  text-transform: uppercase;
}

.rp-ticket__input,
.rp-ticket__select {
  width: 100%;
  min-height: 42px;
  padding: 9px 10px;
  border: 1px solid var(--rp-line-2);
  border-radius: 9px;
  outline: 0;
  background: rgba(8,10,15,.86);
  color: var(--rp-ink);
  font-family: var(--rp-mono);
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0;
  text-transform: none;
  transition: border-color 140ms ease, box-shadow 140ms ease;
}

.rp-ticket__input {
  display: flex;
  gap: 8px;
  align-items: center;
}

.rp-ticket__input input {
  flex: 1;
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font-family: var(--rp-mono);
  font-size: 12px;
}

.rp-ticket__input > span {
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 9px;
}

.rp-ticket__input:focus-within,
.rp-ticket__select:focus {
  border-color: color-mix(in srgb, var(--rp-accent) 58%, var(--rp-line-2));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--rp-accent) 9%, transparent);
}

.rp-ticket__input::placeholder { color: color-mix(in srgb, var(--rp-muted) 72%, transparent); }

.rp-ticket__help {
  margin: -2px 0 0;
  color: var(--rp-muted);
  font-size: 9px;
  line-height: 1.45;
}

.rp-ticket__button {
  width: 100%;
  min-height: 44px;
  margin-top: 13px;
  padding: 10px 14px;
  border: 1px solid color-mix(in srgb, var(--rp-accent) 36%, var(--rp-line-2));
  border-radius: 10px;
  background: color-mix(in srgb, var(--rp-accent) 14%, var(--rp-surface-2));
  color: var(--rp-ink);
  cursor: pointer;
  font-size: 11px;
  font-weight: 650;
  transition: background-color 150ms ease, border-color 150ms ease, transform 120ms var(--rp-ease-out);
}

.rp-ticket__button:active { transform: scale(.98); }
.rp-ticket__button:disabled { cursor: not-allowed; opacity: .48; }
.rp-ticket__button[aria-disabled='true'] { cursor: wait; opacity: .62; }

.rp-ticket__status {
  min-height: 32px;
  margin-top: 9px;
  padding: 8px 9px;
  border-radius: 8px;
  background: rgba(198,204,218,.035);
  color: var(--rp-muted);
  font-size: 10px;
}

.rp-ticket__status.is-ready { color: var(--rp-ready); }
.rp-ticket__status.is-waiting { color: var(--rp-ink-2); }
.rp-ticket__status.is-unavailable { color: var(--rp-muted); }

.rp-ticket__quotes {
  display: grid;
  gap: 7px;
  margin-top: 10px;
}

.rp-quote {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--rp-line);
  border-radius: 10px;
  background: rgba(9,11,16,.67);
}

.rp-quote.is-selected { border-color: color-mix(in srgb, var(--rp-accent) 42%, var(--rp-line)); background: color-mix(in srgb, var(--rp-accent) 5%, rgba(9,11,16,.67)); }
.rp-quote.is-unavailable { opacity: .62; }

.rp-quote__head {
  display: flex;
  gap: 10px;
  align-items: baseline;
  justify-content: space-between;
  color: var(--rp-muted);
  font-size: 9px;
  text-transform: uppercase;
}

.rp-quote__head strong { color: var(--rp-ink); font-size: 10px; font-weight: 650; letter-spacing: .03em; }
.rp-quote__amount { margin-top: 7px; color: var(--rp-ink); font-family: var(--rp-mono); font-size: 14px; font-variant-numeric: tabular-nums; }
.rp-quote__meta { display: flex; flex-wrap: wrap; gap: 4px 10px; margin-top: 6px; color: var(--rp-muted); font-family: var(--rp-mono); font-size: 8px; }
.rp-quote__route { margin: 7px 0 0; overflow-wrap: anywhere; color: var(--rp-ink-2); font-size: 9px; line-height: 1.45; }

.rp-callout {
  margin-top: 11px;
  padding: 10px;
  border: 1px solid var(--rp-line);
  border-radius: 9px;
  background: rgba(182,212,228,.035);
  color: var(--rp-muted);
  font-size: 9.5px;
  line-height: 1.55;
}

.rp-callout strong { color: var(--rp-ink-2); font-weight: 600; }
.rp-callout p { margin: 4px 0 0; }

.rp-chat {
  overflow: hidden;
}

.rp-chat .rp-chat {
  border: 0;
  border-radius: inherit;
  background: transparent;
  box-shadow: none;
}

.rp-chat__header {
  padding: 11px 12px;
  border-bottom: 1px solid var(--rp-line);
}

.rp-chat__room,
.rp-chat__status,
.rp-chat__title {
  margin: 0;
}

.rp-chat__room,
.rp-chat__rules-label,
.rp-chat__composer-label {
  color: var(--rp-muted);
  font-family: var(--rp-mono);
  font-size: 8px;
  font-weight: 500;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.rp-chat__title {
  margin-top: 3px;
  color: var(--rp-ink);
  font-family: var(--rp-serif);
  font-size: 18px;
  font-weight: 500;
  line-height: 1.1;
}

.rp-chat__status {
  margin-top: 5px;
  color: var(--rp-muted);
  font-size: 9px;
}

.rp-chat__log {
  display: grid;
  max-height: 250px;
  overflow-y: auto;
  scrollbar-color: var(--rp-line-2) transparent;
  scrollbar-width: thin;
}

.rp-chat__messages {
  display: grid;
  max-height: 260px;
  gap: 0;
  overflow-y: auto;
  scrollbar-color: var(--rp-line-2) transparent;
  scrollbar-width: thin;
}

.rp-chat__message {
  display: block;
  padding: 9px 11px;
  border-bottom: 1px solid var(--rp-line);
  color: var(--rp-ink-2);
  font-size: 10px;
}

.rp-chat__message:last-child { border-bottom: 0; }
.rp-chat__message p { margin: 0; }
.rp-chat__message-label { color: var(--rp-ink); font-family: var(--rp-mono); font-size: 8.5px; font-weight: 550; }
.rp-chat__message-body { margin-top: 4px !important; color: var(--rp-muted); font-size: 9.5px; line-height: 1.5; }

.rp-chat__rules {
  padding: 9px 11px;
  border-top: 1px solid var(--rp-line);
  background: rgba(182,212,228,.025);
}

.rp-chat__rules p { margin: 0; }
.rp-chat__rules-list { margin-top: 4px !important; color: var(--rp-muted); font-size: 8.5px; line-height: 1.55; }

.rp-chat__composer {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 44px;
  padding: 9px 11px;
  border-top: 1px solid var(--rp-line);
  background: rgba(9,11,16,.55);
  color: var(--rp-muted);
  font-size: 9px;
}

.rp-chat__composer-label,
.rp-chat__composer-explanation { grid-column: 1 / -1; }

.rp-chat__composer-input {
  width: 100%;
  min-height: 48px;
  resize: none;
  padding: 8px 9px;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  background: rgba(8,10,15,.72);
  color: var(--rp-muted);
  font-size: 9.5px;
}

.rp-chat__composer-explanation { margin: 0; color: var(--rp-muted); font-size: 8.5px; line-height: 1.5; }

.rp-chat__submit {
  align-self: stretch;
  padding: 7px 10px;
  border: 1px solid var(--rp-line);
  border-radius: 8px;
  background: rgba(198,204,218,.045);
  color: var(--rp-muted);
  font-size: 9px;
}

.rp-footnote {
  margin: 0;
  padding: 9px 11px 11px;
  color: var(--rp-muted);
  font-size: 9px;
  line-height: 1.55;
}

.rp-footnote a { color: var(--rp-ink-2); }

.rp .is-ready { --rp-status: var(--rp-ready); }
.rp .is-waiting { --rp-status: var(--rp-waiting); }
.rp .is-unavailable { --rp-status: var(--rp-muted); }

@media (hover: hover) and (pointer: fine) {
  .rp-market:hover { background: rgba(198,204,218,.045); }
  .rp-button:hover:not(:disabled) { border-color: var(--rp-line-2); background: rgba(198,204,218,.08); color: var(--rp-ink); }
  .rp-timeframe:hover,
  .rp-ticket__sides button:hover { color: var(--rp-ink); }
  .rp-ticket__button:hover:not(:disabled):not([aria-disabled='true']) { border-color: color-mix(in srgb, var(--rp-accent) 54%, var(--rp-line-2)); background: color-mix(in srgb, var(--rp-accent) 19%, var(--rp-surface-2)); }
}

@media (max-width: 980px) {
  .rp__workspace { grid-template-columns: minmax(0, 1fr) 280px; }
  .rp-chart__canvas,
  .rp-chart__canvas canvas { min-height: 290px; height: 290px; }
}

@media (max-width: 760px) {
  .rp { border-radius: 15px; }
  .rp__topbar { align-items: flex-start; }
  .rp__badges { max-width: 50%; }
  .rp__workspace { grid-template-columns: minmax(0, 1fr); }
  .rp__market-column { border-right: 0; border-bottom: 1px solid var(--rp-line); }
  .rp-ticket { position: static; }
  .rp-chart__canvas,
  .rp-chart__canvas canvas { min-height: 260px; height: 260px; }
}

@media (max-width: 480px) {
  .rp__topbar { display: block; }
  .rp__badges { max-width: none; margin-top: 11px; justify-content: flex-start; }
  .rp__rail { grid-auto-columns: 106px; }
  .rp-chart__toolbar { align-items: flex-start; }
  .rp-chart__canvas,
  .rp-chart__canvas canvas { min-height: 230px; height: 230px; }
  .rp-panel__meta { max-width: 48%; }
  .rp-chat__composer { grid-template-columns: 1fr; }
  .rp-chat__submit { min-height: 36px; }
}

@media (prefers-reduced-motion: reduce) {
  .rp-market,
  .rp-market::after,
  .rp-timeframe,
  .rp-ticket__sides button,
  .rp-ticket__button,
  .rp-ticket__input,
  .rp-ticket__select,
  .rp-button {
    transition: none;
  }
}
`;

// Compact alias for browser entries; the descriptive export is canonical.
export const PRO_CSS = REGISTRY_PRO_CSS;
