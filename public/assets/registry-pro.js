/* Generated from src/pro/ by scripts/build-registry-pro.mjs — do not edit directly. */
"use strict";(()=>{var vt=String.raw`
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
`;function wt(r){let t=1/0,e=-1/0;for(let n of r)n.l<t&&(t=n.l),n.h>e&&(e=n.h);if(!Number.isFinite(t)||!Number.isFinite(e))return null;if(t===e){let n=t===0?1:Math.abs(t)*.05;return{min:t-n,max:e+n}}let a=(e-t)*.08;return{min:Math.max(0,t-a),max:e+a}}function kt(r){let t=0;for(let e of r)e.v>t&&(t=e.v);return t}function St(r,t,e=4){if(!(t>r)||e<1)return[];let a=t-r,n=10**Math.floor(Math.log10(a/(e+1))),o=n*10;for(let c of[1,2,5,10])if(a/(n*c)<=e+1){o=n*c;break}let p=[];for(let c=Math.ceil(r/o)*o;c<=t;c+=o)p.push(c);return p}function At(r,t){if(r<=0||t<=0)return{step:0,bodyWidth:0,centers:[]};let e=t/r,a=Math.max(1,Math.min(e*.68,13)),n=[];for(let o=0;o<r;o+=1)n.push(e*o+e/2);return{step:e,bodyWidth:a,centers:n}}function et(r,t,e){let a=t.max-t.min;return a<=0?e/2:e-(r-t.min)/a*e}function Tt(r,t,e){if(t<=0||e<=0||r<0||r>=e)return null;let a=Math.floor(r/e*t);return a>=0&&a<t?a:null}function Et(r,t,e=6){if(!r.length)return[];let a=[],n=Math.max(1,Math.ceil(r.length/e));for(let o=0;o<r.length;o+=n)a.push(o);return a}function D(r){let t=Number(r);if(!Number.isFinite(t))return"—";if(t===0)return"0";let e=Math.max(0,3-Math.floor(Math.log10(Math.abs(t))));return t.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:Math.min(e,12)})}function ht(r){let t=Number(r);return Number.isFinite(t)?Math.abs(t)>=1e3?`$${t.toLocaleString("en-US",{maximumFractionDigits:0})}`:`$${t.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:"—"}function Ct(r){let t=Number(r);return Number.isFinite(t)?t>=1e3?t.toLocaleString("en-US",{maximumFractionDigits:0}):t.toLocaleString("en-US",{maximumFractionDigits:2}):"—"}var yt=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function ft(r,t){let e=new Date(r*1e3);if(Number.isNaN(e.getTime()))return"—";if(t==="1d")return`${e.getUTCDate()} ${yt[e.getUTCMonth()]}`;let a=String(e.getUTCHours()).padStart(2,"0"),n=String(e.getUTCMinutes()).padStart(2,"0");return`${e.getUTCDate()} ${yt[e.getUTCMonth()]} ${a}:${n}`}function Mt(r,t){let e=Math.max(0,Math.round((t-r)/1e3));if(e<60)return`${e}s ago`;let a=Math.floor(e/60);if(a<60)return`${a}m ago`;let n=Math.floor(a/60);return n<24?`${n}h ago`:`${Math.floor(n/24)}d ago`}var Nt=74,Rt=22,oe=.16;var ut="#8E96AB",ie="rgba(198,204,218,0.10)",se="rgba(198,204,218,0.22)",pe="11px 'JetBrains Mono', ui-monospace, monospace";function Ot({canvas:r,readout:t}){let e=r.getContext("2d"),a=[],n="1h",o=ut,p=null;function c(){let h=r.getBoundingClientRect();return{width:h.width,height:h.height}}function d(){let{width:h,height:v}=c();if(h<=0||v<=0)return;let x=window.devicePixelRatio||1;if((r.width!==Math.round(h*x)||r.height!==Math.round(v*x))&&(r.width=Math.round(h*x),r.height=Math.round(v*x)),e.setTransform(x,0,0,x,0,0),e.clearRect(0,0,h,v),!a.length)return;let U=h-Nt,R=v-Rt,Q=Math.round(R*oe),O=R-Q-6,A=wt(a);if(!A)return;let{bodyWidth:y,centers:k}=At(a.length,U),j=kt(a);e.font=pe,e.textBaseline="middle";for(let g of St(A.min,A.max)){let f=et(g,A,O);e.strokeStyle=ie,e.beginPath(),e.moveTo(0,f+.5),e.lineTo(U,f+.5),e.stroke(),e.fillStyle=ut,e.textAlign="left",e.fillText(D(g),U+8,f)}if(j>0)for(let g=0;g<a.length;g+=1){let f=a[g],E=Math.max(1,f.v/j*Q);e.fillStyle=f.c>=f.o?`${o}55`:"rgba(142,150,171,0.30)",e.fillRect(k[g]-y/2,R-E,y,E)}for(let g=0;g<a.length;g+=1){let f=a[g],E=k[g],G=f.c>=f.o,P=G?o:ut,L=et(f.h,A,O),M=et(f.l,A,O),$=et(f.o,A,O),K=et(f.c,A,O);e.strokeStyle=P,e.lineWidth=1,e.beginPath(),e.moveTo(E+.5,L),e.lineTo(E+.5,M),e.stroke();let X=Math.min($,K),W=Math.max(1,Math.abs(K-$));G?(e.fillStyle=P,e.fillRect(E-y/2,X,y,W)):e.strokeRect(E-y/2+.5,X+.5,y-1,Math.max(1,W-1))}e.fillStyle=ut,e.textAlign="center";for(let g of Et(a,n)){let f=ft(a[g].ts,n),E=Math.min(Math.max(k[g],24),U-24);e.fillText(f,E,v-Rt/2)}if(p!==null&&a[p]){let g=k[p];e.strokeStyle=se,e.setLineDash([3,3]),e.beginPath(),e.moveTo(g+.5,0),e.lineTo(g+.5,R),e.stroke(),e.setLineDash([])}}function l(){if(!t)return;let h=p!==null?a[p]:a[a.length-1];if(!h){t.textContent="";return}t.textContent=[ft(h.ts,n),`O ${D(h.o)}`,`H ${D(h.h)}`,`L ${D(h.l)}`,`C ${D(h.c)}`,`Vol $${D(h.v)}`].join("  ")}function s(h){let v=r.getBoundingClientRect(),x=Tt(h.clientX-v.left,a.length,v.width-Nt);x!==p&&(p=x,d(),l())}function _(){p=null,d(),l()}r.addEventListener("pointermove",s),r.addEventListener("pointerleave",_);let z=typeof ResizeObserver=="function"?new ResizeObserver(()=>d()):null;return z?.observe(r),{set({candles:h,timeframe:v,hue:x}){a=Array.isArray(h)?h:[],v&&(n=v),x&&(o=x),p=null,d(),l()},clear(){a=[],p=null,d(),l()},destroy(){z?.disconnect(),r.removeEventListener("pointermove",s),r.removeEventListener("pointerleave",_)}}}var Pt="https://api.geckoterminal.com/api/v2";var le="zodiacs.exchange.gecko-budget.v1",ce="zodiacs.exchange.gecko-cooloff.v1",Be=Object.freeze(["network","rate_limited","unavailable","not_indexed"]),rt=class extends Error{constructor(t,e,{cause:a,retryAfterMs:n=null}={}){super(e,a?{cause:a}:void 0),this.name="ExchangeDataError",this.code=t,this.retryAfterMs=Number.isFinite(n)&&n>=0?n:null}};function H(r,t,e){throw new rt(r,t,e)}var ue=Object.freeze({"15m":{path:"minute",aggregate:15,limit:192},"1h":{path:"hour",aggregate:1,limit:168},"4h":{path:"hour",aggregate:4,limit:180},"1d":{path:"day",aggregate:1,limit:180}});function de({pool:r,timeframe:t,baseUrl:e=Pt}){let a=ue[t];a||H("unavailable",`Unknown timeframe: ${t}`);let n=new URL(`${e}/networks/solana/pools/${encodeURIComponent(r)}/ohlcv/${a.path}`);return n.searchParams.set("aggregate",String(a.aggregate)),n.searchParams.set("limit",String(a.limit)),n.toString()}function me({pool:r,baseUrl:t=Pt}){return new URL(`${t}/networks/solana/pools/${encodeURIComponent(r)}/trades`).toString()}function he(r){(!r?.data||typeof r.data!="object")&&H("unavailable","The chart data was not readable.");let t=r.data.attributes?.ohlcv_list;if(t===void 0)return[];Array.isArray(t)||H("unavailable","The chart data was not readable.");let e=[];for(let a of t){if(!Array.isArray(a)||a.length<6)continue;let[n,o,p,c,d,l]=a.map(Number);[n,o,p,c,d,l].every(Number.isFinite)&&(n<=0||o<=0||p<=0||c<=0||d<=0||l<0||e.push({ts:n,o,h:p,l:c,c:d,v:l}))}return e.sort((a,n)=>a.ts-n.ts),e}function fe(r,t){let e=r?.data;Array.isArray(e)||H("unavailable","The trade data was not readable.");let a=[];for(let n of e){let o=n?.attributes;if(!o)continue;let p=Date.parse(o.block_timestamp??"");if(!Number.isFinite(p))continue;let c,d;if(o.to_token_address===t)c=Number(o.to_token_amount),d=Number(o.price_to_in_usd);else if(o.from_token_address===t)c=Number(o.from_token_amount),d=Number(o.price_from_in_usd);else continue;let l=o.kind==="buy"||o.kind==="sell"?o.kind:null,s=Number(o.volume_in_usd);!l||!Number.isFinite(c)||c<=0||!Number.isFinite(d)||d<=0||a.push({id:String(n.id??`${o.tx_hash}-${p}`),ts:p,side:l,tokenAmount:c,priceUsd:d,volumeUsd:Number.isFinite(s)?s:null,tx:typeof o.tx_hash=="string"?o.tx_hash:null})}return a.sort((n,o)=>o.ts-n.ts),a}function qt({limit:r=12,windowMs:t=6e4,now:e=()=>Date.now(),storage:a=null,storageKey:n=le}={}){let o=[],p=!!a;function c(){if(!p)return o;try{let l=JSON.parse(a.getItem(n)??"[]");if(Array.isArray(l))return l.filter(Number.isFinite)}catch{p=!1}return o}function d(l){if(o=l,!!p)try{a.setItem(n,JSON.stringify(l))}catch{p=!1}}return{take(){let l=e(),s=l-t,_=c().filter(z=>z>s&&z<=l);return _.length>=r?(d(_),!1):(_.push(l),d(_),!0)}}}function ge(r,{now:t=()=>Date.now(),maxMs:e=12e4}={}){if(typeof r!="string"||!r.trim())return null;let a=r.trim(),n=Number(a);if(Number.isFinite(n)&&n>=0)return Math.min(Math.ceil(n*1e3),e);let o=Date.parse(a);return Number.isFinite(o)?Math.min(Math.max(0,o-t()),e):null}async function Dt(r,{fetchImpl:t=globalThis.fetch,signal:e,deadlineMs:a=12e3}={}){let n=new AbortController,o=!1,p=()=>n.abort();e?.aborted?p():e?.addEventListener("abort",p,{once:!0});let c=setTimeout(()=>{o=!0,n.abort()},a);try{let d;try{d=await t(r,{method:"GET",signal:n.signal,headers:{accept:"application/json"}})}catch(l){if(e?.aborted||(o&&H("network","The chart service timed out.",{cause:l}),l?.name==="AbortError"))throw l;H("network","The chart service could not be reached just now.",{cause:l})}d.status===429&&H("rate_limited","The chart service is rate limiting requests.",{retryAfterMs:ge(d.headers?.get?.("retry-after")??null)}),d.status===404&&H("not_indexed","This pool is not indexed by the chart service."),d.ok||H("unavailable","The chart service did not answer.");try{return await d.json()}catch(l){if(e?.aborted||(o&&H("network","The chart service timed out.",{cause:l}),l?.name==="AbortError"))throw l;H("unavailable","The chart service did not return a readable answer.",{cause:l})}}finally{clearTimeout(c),e?.removeEventListener("abort",p)}}function zt({baseMs:r=1e4,maxMs:t=12e4,now:e=()=>Date.now(),storage:a=null,storageKey:n=ce}={}){let o={until:0,step:0,revision:0},p=!!a;function c(){if(!p)return o;try{let l=JSON.parse(a.getItem(n)??"null");l&&[l.until,l.step,l.revision].every(Number.isFinite)&&(o=l)}catch{p=!1}return o}function d(l){if(o=l,!!p)try{a.setItem(n,JSON.stringify(l))}catch{p=!1}}return{active(){return e()<c().until},remainingMs(){return Math.max(0,c().until-e())},token(){return c().revision},fail(l=null){let s=c(),_=Math.min(r*2**s.step,t),z=Number.isFinite(l)?Math.min(Math.max(0,l),t):0,h=e()+Math.max(_,z);d({until:Math.max(s.until,h),step:s.step+1,revision:s.revision+1})},ok(l=null){let s=c();return l!==null&&l!==s.revision?!1:(d({until:0,step:0,revision:s.revision+1}),!0)}}}async function Ut({pool:r,timeframe:t,baseUrl:e,fetchImpl:a,signal:n,deadlineMs:o}){let p=await Dt(de({pool:r,timeframe:t,baseUrl:e}),{fetchImpl:a,signal:n,deadlineMs:o});return he(p)}async function Lt({pool:r,mint:t,baseUrl:e,fetchImpl:a,signal:n,deadlineMs:o}){let p=await Dt(me({pool:r,baseUrl:e}),{fetchImpl:a,signal:n,deadlineMs:o});return fe(p,t)}var be={aries:"HRn98YLGigP475eS1GaQYRMbqk1V4dkV6tdKyLhVh2iS",taurus:"2GNtxia4fLW3URj5MLqVfgoKrAgDpphtAVazK41eTPfu",gemini:"HxhdKrB1UpSwfuMoZMVzPVELzbPWHdyN6PHU9CBFium9",cancer:null,leo:"48ErBGMqiZekyLoCcebd7cS5KNQPzqr7QQAK9mzAPQGQ",virgo:"5WcVjf8fzPkHaZqTSZDdbDFL6p2bLbAgEigxpevNrcRh",libra:"DTXPQjK4ae4h2Wc7D5Rpij8YmSQxqLuTcNKrpBCjcAN9",scorpio:"3d2KYuMgj2yotNC6SKX4HNoeSWp4n8zqZSQ9kFH81Yta",sagittarius:null,capricorn:"549aknNCvxbiqmikS6sAnY6Dbg37MeENWn6ZFBfc7sin",aquarius:"BygCEAhCNyWC8Co9yPa4K84NGkgkgMWdib2FG5hhuiUv",pisces:"Fzz8QrSV8sPKsTtHocwYARE8Zo6Rd4Wv2Ee4JtCuiDko"};function _e(r,t){if(!Array.isArray(r)||!t)return null;let e=null,a=-1;for(let n of r){if(n?.chainId!=="solana"||!n?.pairAddress||n?.baseToken?.address!==t)continue;let o=Number(n?.liquidity?.usd);!Number.isFinite(o)||o<=0||o>a&&(a=o,e=String(n.pairAddress))}return e}function $t({slug:r,mint:t,rows:e}){return be[r]??_e(e,t)}function It(r,t){let e=String(t||"");if(!e||!Array.isArray(r))return null;let a=new Set,n=0;for(let o of r){if(o?.chainId!=="solana"||o?.baseToken?.address!==e)continue;let p=String(o?.pairAddress||"");if(!p||a.has(p))continue;let c=Number(o?.liquidity?.usd);!Number.isFinite(c)||c<=0||(a.add(p),n+=c)}return n>0?n:null}var Ft="https://api.dexscreener.com/tokens/v1/solana";function xe(r,t=Ft){return`${t}/${r.map(e=>encodeURIComponent(e)).join(",")}`}function ve(r,t){let e={};if(!Array.isArray(r))return e;for(let a of t){let n=null,o=-1;for(let d of r){if(d?.chainId!=="solana"||!d?.pairAddress||d?.baseToken?.address!==a)continue;let l=Number(d?.liquidity?.usd)||0;l>o&&(o=l,n=d)}if(!n)continue;let p=Number(n.priceUsd),c=Number(n.priceChange?.h24);e[a]={priceUsd:Number.isFinite(p)&&p>0?p:null,change24hPct:Number.isFinite(c)?c:null,liquidityUsd:It(r,a)}}return e}async function Bt({mints:r,baseUrl:t=Ft,fetchImpl:e=globalThis.fetch,signal:a}={}){if(!Array.isArray(r)||r.length===0)return{stats:{},rows:[]};let n=await e(xe(r,t),{method:"GET",headers:{accept:"application/json"},signal:a});if(!n.ok)throw new Error(`stats ${n.status}`);let o=await n.json();return{stats:ve(o,r),rows:Array.isArray(o)?o:[]}}var Ht="preview",gt=Object.freeze({id:"global",label:"All markets"}),jt=Object.freeze(["No links","No wallet or contract addresses","No images","No direct messages"]),Gt=Object.freeze([Object.freeze({id:"connection",label:"System",body:"Market Chat is not connected in this build."}),Object.freeze({id:"approval",label:"System",body:"Posting remains closed until wallet sign-in, moderation, retention and privacy controls are separately approved."})]),We=Object.freeze(["spam","scam","manipulation","harassment","impersonation","privacy","threats","unlawful_content"]),Ye=Object.freeze(["quarantine","remove","restore","mute","ban","revoke_session","pause_posting"]),V=Object.freeze({title:"Market Chat",status:"Read-only design preview",rulesLabel:"Room rules",composerLabel:"Message",composerPlaceholder:"Posting is not available in this preview.",composerExplanation:"The composer is disabled. This preview makes no wallet, network or storage request.",submitLabel:"Post"});var dt=0;function N(r,t,e,a,n){let o=r.createElement(e);return a&&(o.className=a),n!==void 0&&(o.textContent=n),t.appendChild(o),o}function Qt({host:r}={}){let t=r?.ownerDocument;if(!r||typeof r.appendChild!="function"||!t?.createElement)throw new TypeError("A DOM host is required to mount read-only Market Chat.");dt+=1;let e=`rp-chat-title-${dt}`,a=`rp-chat-explanation-${dt}`,n=t.createElement("aside");n.className="rp-chat",n.setAttribute("data-chat-mode",Ht),n.setAttribute("aria-labelledby",e);let o=N(t,n,"header","rp-chat__header");N(t,o,"p","rp-chat__room",gt.label);let p=N(t,o,"h2","rp-chat__title",V.title);p.id=e,N(t,o,"p","rp-chat__status",V.status).setAttribute("role","status");let c=N(t,n,"div","rp-chat__log");c.setAttribute("role","log"),c.setAttribute("aria-label",`${gt.label} system notices`),c.setAttribute("aria-live","polite"),c.setAttribute("aria-relevant","additions text");for(let v of Gt){let x=N(t,c,"article","rp-chat__message rp-chat__message--system");x.setAttribute("data-system-state",v.id),N(t,x,"p","rp-chat__message-label",v.label),N(t,x,"p","rp-chat__message-body",v.body)}let d=N(t,n,"section","rp-chat__rules");d.setAttribute("aria-label",V.rulesLabel),N(t,d,"p","rp-chat__rules-label",V.rulesLabel),N(t,d,"p","rp-chat__rules-list",jt.join(" · "));let l=N(t,n,"div","rp-chat__composer");l.setAttribute("aria-disabled","true");let s=N(t,l,"label","rp-chat__composer-label",V.composerLabel),_=N(t,l,"textarea","rp-chat__composer-input");_.id=`rp-chat-input-${dt}`,_.disabled=!0,_.rows=2,_.maxLength=280,_.placeholder=V.composerPlaceholder,_.setAttribute("aria-describedby",a),s.setAttribute("for",_.id);let z=N(t,l,"p","rp-chat__composer-explanation",V.composerExplanation);z.id=a;let h=N(t,l,"button","rp-chat__submit",V.submitLabel);return h.type="button",h.disabled=!0,r.appendChild(n),Object.freeze({destroy(){n.remove()}})}var Kt="EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";var ye=Object.freeze(["invalid_intent","unsupported_pair","no_route","rate_limited","schema_changed","network","unavailable","stale"]),Ze=Object.freeze({quote:!0,prepare:!1,sign:!1,submit:!1}),we="123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",ke=new Map([...we].map((r,t)=>[r,t])),tr=Object.freeze(["taker","wallet","walletAddress","receiver","payer","referrer","referralAccount","referralFee","feeBps"]),C=class extends Error{constructor(t,e,{retryAfterMs:a=0,cause:n}={}){super(e,n===void 0?void 0:{cause:n}),this.name="ProQuoteError",this.code=ye.includes(t)?t:"unavailable",this.retryAfterMs=Number.isFinite(a)&&a>0?Math.floor(a):0}};function Se(r){if(typeof r!="string"||r.length<32||r.length>44)return null;let t=[0];for(let a of r){let n=ke.get(a);if(n===void 0)return null;let o=n;for(let p=0;p<t.length;p+=1){let c=t[p]*58+o;t[p]=c&255,o=c>>8}for(;o>0;)t.push(o&255),o>>=8}let e=0;for(;e<r.length-1&&r[e]==="1";)e+=1;for(;e>0;)t.push(0),e-=1;return Uint8Array.from(t.reverse())}function Wt(r){return Se(r)?.byteLength===32}function Yt(r,{positive:t=!0}={}){let e=typeof r=="bigint"?r.toString():typeof r=="string"?r:"";if(!/^(?:0|[1-9]\d*)$/u.test(e)||e.length>24)throw new C("invalid_intent","The exact input amount is invalid.");let a=BigInt(e);if(t&&a<=0n)throw new C("invalid_intent","The exact input amount must be positive.");return e}function Vt(r,t){let e=String(r??"").trim();if(!Number.isInteger(t)||t<0||t>18)throw new C("invalid_intent","The token precision is unsupported.");if(!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(e))throw new C("invalid_intent","Enter an ordinary decimal amount.");let[a,n=""]=e.split(".");if(n.length>t)throw new C("invalid_intent",`Use no more than ${t} decimal places.`);let o=`${a}${n.padEnd(t,"0")}`.replace(/^0+(?=\d)/u,"");return Yt(o||"0")}function bt(r,t,{trim:e=!0}={}){let a=Yt(r,{positive:!1});if(!Number.isInteger(t)||t<0||t>18)throw new C("schema_changed","The provider returned unsupported precision.");let n=a.padStart(t+1,"0"),o=t===0?n:n.slice(0,-t),p=t===0?"":n.slice(-t);return e&&(p=p.replace(/0+$/u,"")),p?`${o}.${p}`:o}var Xt=Object.freeze([{slug:"aries",name:"Aries",glyph:"♈",hue:"#DE8E79"},{slug:"taurus",name:"Taurus",glyph:"♉",hue:"#B9D4BE"},{slug:"gemini",name:"Gemini",glyph:"♊",hue:"#B29DD0"},{slug:"cancer",name:"Cancer",glyph:"♋",hue:"#B6D4E4"},{slug:"leo",name:"Leo",glyph:"♌",hue:"#E0A9B4"},{slug:"virgo",name:"Virgo",glyph:"♍",hue:"#B7D9B0"},{slug:"libra",name:"Libra",glyph:"♎",hue:"#D3A9DE"},{slug:"scorpio",name:"Scorpio",glyph:"♏",hue:"#B9DCE8"},{slug:"sagittarius",name:"Sagittarius",glyph:"♐",hue:"#E0B080"},{slug:"capricorn",name:"Capricorn",glyph:"♑",hue:"#C0DEA8"},{slug:"aquarius",name:"Aquarius",glyph:"♒",hue:"#AE8FC9"},{slug:"pisces",name:"Pisces",glyph:"♓",hue:"#A9D4C4"}]);function Ae(r){if(!r||!Array.isArray(r.assets))throw new C("unavailable","The Registry is unavailable.");let t=new Map,e=new Set;for(let a of Xt){let o=r.assets.find(p=>p?.sign===a.slug)?.native;if(!o||o.chain!=="solana"||o.tokenStandard!=="SPL"||o.isCanonicalOrigin!==!0||o.isOfficialRepresentation!==!0||o.sign!==a.slug||o.decimals!==6||typeof o.address!="string"||!Wt(o.address)||o.address===Kt||e.has(o.address)||typeof o.symbol!="string")throw new C("unavailable",`The ${a.name} Registry record is invalid.`);t.set(a.slug,Object.freeze({...a,mint:o.address,decimals:o.decimals,symbol:o.symbol})),e.add(o.address)}if(t.size!==Xt.length)throw new C("unavailable","The Registry does not contain all twelve markets.");return t}async function Jt({fetchImpl:r=globalThis.fetch,url:t="/registry/zodiacs.registry.json",signal:e}={}){let a=await r(t,{headers:{accept:"application/json"},signal:e,cache:"no-store"});if(!a.ok)throw new C("unavailable",`The Registry could not be read (${a.status}).`);return Ae(await a.json())}var Te=Object.freeze(["15m","1h","4h","1d"]),Zt=1e4,Ee=15e3;function i(r,t,e){let a=document.createElement(r);return t&&(a.className=t),e!==void 0&&(a.textContent=e),a}function at(r,t,e="button"){let a=i("button",r,t);return a.type=e,a}function _t(r,t){let e=new AbortController,a=!1,n=()=>e.abort(r?.reason);r?.aborted?n():r?.addEventListener("abort",n,{once:!0});let o=setTimeout(()=>{a=!0,e.abort(new DOMException("Request timed out.","TimeoutError"))},t);return{signal:e.signal,timedOut:()=>a,cleanup(){clearTimeout(o),r?.removeEventListener("abort",n)}}}function te(r){let t=Number(r);return Number.isFinite(t)?`${t>0?"+":""}${t.toFixed(2)}%`:"—"}function ee(r){let t=Number(r);return Number.isFinite(t)&&t>0?`$${D(t)}`:"—"}function Ce(r){return Array.isArray(r)&&r.length?r.join(" · "):"Route not disclosed"}function re(r,t){let e=Date.parse(String(r??""));return Number.isFinite(e)?new Intl.DateTimeFormat(void 0,{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(e):t}function Me(){try{return globalThis.localStorage??null}catch{return null}}function Ne(r){return{rate_limited:"Provider budget is cooling down.",no_route:"No route for this exact size.",stale:"The quote expired before it could be shown.",schema_changed:"Provider answer failed validation.",network:"Provider did not answer before the deadline.",unavailable:"Provider is unavailable."}[r]??"Quote unavailable."}function Re(r){if(r instanceof rt){if(r.code==="rate_limited")return"Provider rate limit — waiting before another read.";if(r.code==="not_indexed")return"This reference pool is not indexed."}return"Market data is unavailable just now."}function Oe(r,t){let e=at("rp-market");e.dataset.sign=r.slug,e.setAttribute("aria-pressed","false");let a=i("span","rp-market__glyph",r.glyph);a.setAttribute("aria-hidden","true");let n=i("span","rp-market__label");n.append(i("span","rp-market__name",r.name),i("span","rp-market__symbol",r.symbol));let o=i("span","rp-market__figures");return o.append(i("span","rp-market__price","Indexing…"),i("span","rp-market__change","24h —")),e.append(a,n,o),e.style.setProperty("--sign-hue",r.hue),e.addEventListener("click",()=>t(r.slug)),e}function Pe(r){let t=i("table","rp-tape__table"),e=i("caption","sr-only","Recent canonical-pool trades"),a=i("thead"),n=i("tr");for(let p of["Age","Side","Amount","Price","Value"])n.append(i("th",null,p));a.append(n);let o=i("tbody");return t.append(e,a,o),r.append(t),{set(p,c,d=Date.now()){o.replaceChildren(...p.slice(0,24).map(l=>{let s=i("tr",`rp-tape__row rp-tape__row--${l.side}`);return s.append(i("td",null,Mt(l.ts,d)),i("td","rp-tape__side",l.side==="buy"?"Buy":"Sell"),i("td",null,`${Ct(l.tokenAmount)} ${c.symbol}`),i("td",null,`$${D(l.priceUsd)}`),i("td",null,l.volumeUsd===null?"—":ht(l.volumeUsd))),s}))},clear(){o.replaceChildren()}}}function qe(r){let t=i("table","rp-chart-data__table"),e=i("thead"),a=i("tr");for(let o of["UTC","Open","High","Low","Close","Volume"])a.append(i("th",null,o));e.append(a);let n=i("tbody");return t.append(e,n),r.append(t),{set(o){n.replaceChildren(...o.map(p=>{let c=i("tr");return c.append(i("td",null,new Date(p.ts*1e3).toISOString()),i("td",null,D(p.o)),i("td",null,D(p.h)),i("td",null,D(p.l)),i("td",null,D(p.c)),i("td",null,D(p.v))),c}))},clear(){n.replaceChildren()}}}function De(r,t,e,a){let n=i("article","rp-quote"),o=r.provider==="jupiter"?"Swap V2 Meta-Aggregator · Ultra mode":"Raydium",p=i("div","rp-quote__head");if(p.append(i("strong",null,o)),t.highestQuotedOutputProvider===r.provider&&r.status==="ready"&&p.append(i("span","rp-badge","Highest quoted output")),n.append(p),r.status!=="ready")return n.classList.add("is-unavailable"),n.append(i("p","rp-quote__meta",Ne(r.error))),n;let c=r.quote,d=a==="buy"?e.symbol:"USDC",l=c.minimumOutput===null?"Minimum not reported":`Minimum ${bt(c.minimumOutput,6)} ${d}`,s=c.feeBps===null?"Fee not separately reported":`Reported fee ${c.feeBps} bps`,_=r.provider==="jupiter"?`Jupiter RTSE ${c.slippageBps} bps`:`Selected Raydium guard ${c.slippageBps} bps`;return n.append(i("div","rp-quote__amount",`${bt(c.outputAmount,6)} ${d}`),i("p","rp-quote__meta",[l,_,`Impact ${c.priceImpactPct??"not reported"}%`,s].join(" · ")),i("p","rp-quote__route",Ce(c.route)),i("p","rp-quote__meta",`Observed ${re(c.observedAt,"unknown")} · ${c.expiresAt?`expires ${re(c.expiresAt,"soon")}`:"15-second local freshness limit"}`)),n}function ze(r){let t=i("div","rp"),e=i("header","rp__topbar"),a=i("div");a.append(i("p","rp__eyebrow","Twelve markets · Phase 1"),i("h2","rp__title","Zodiac Markets"));let n=i("div","rp__badges");n.append(i("span","rp-badge is-ready","Read-only"),i("span","rp-badge","No wallet"),i("span","rp-badge","No submission")),e.append(a,n);let o=i("p","rp-status is-waiting","Reading the twelve official Registry markets…");o.setAttribute("role","status");let p=i("div","rp__rail");p.setAttribute("role","group"),p.setAttribute("aria-label","Zodiac Markets");let c=i("div","rp__workspace"),d=i("div","rp__market-column"),l=i("section","rp-panel rp-chart"),s=i("header","rp-panel__head"),_=i("h3","rp-panel__title","Reference-pool chart"),z=i("p","rp-panel__meta","Canonical pool · GeckoTerminal index"),h=i("div");h.append(_,z);let v=i("div","rp-chart__toolbar"),x=i("div","rp-timeframes");x.setAttribute("role","group"),x.setAttribute("aria-label","Chart timeframe");let U=at("rp-button rp-button--quiet","Refresh market data");U.setAttribute("aria-label","Refresh chart and recent trades"),v.append(x,U),s.append(h,v);let R=i("p","rp-chart__readout");R.id="rp-chart-readout";let Q=i("div","rp-chart__canvas"),O=i("canvas");O.setAttribute("role","img"),O.setAttribute("aria-label","Candlestick chart"),O.setAttribute("aria-describedby","rp-chart-readout rp-chart-state"),O.textContent="Candlestick chart. The same values are available in the candle data table.";let A=i("p","rp-chart__state is-waiting","Waiting for a reference pool…");A.id="rp-chart-state",A.setAttribute("role","status"),Q.append(O,A);let y=i("details","rp-chart-data");y.append(i("summary",null,"Candle data table"));let k=i("div","rp-chart-data__scroll");k.tabIndex=0,k.setAttribute("role","region"),k.setAttribute("aria-label","Candlestick values table"),y.append(k),l.append(s,Q,R,y);let j=i("section","rp-stats"),g=new Map;for(let[B,tt]of[["price","Indexed price"],["change","24h change"],["liquidity","Indexed liquidity"]]){let q=i("div","rp-stat"),ct=i("strong",null,"—");q.append(i("span",null,tt),ct),j.append(q),g.set(B,ct)}let f=i("section","rp-panel rp-tape"),E=i("header","rp-panel__head"),G=i("div");G.append(i("h3","rp-panel__title","Recent pool trades"),i("p","rp-panel__meta","Canonical pool only · not a consolidated tape")),E.append(G);let P=i("p","rp-status is-waiting","Waiting for a reference pool…");P.setAttribute("role","status");let L=i("div","rp-tape__scroll");L.tabIndex=0,L.setAttribute("role","region"),L.setAttribute("aria-label","Recent canonical-pool trades table"),f.append(E,P,L),d.append(l,j,f);let M=i("div","rp__side-column"),$=i("section","rp-panel rp-ticket"),K=i("header","rp-panel__head"),X=i("div");X.append(i("p","rp__eyebrow","Provider-neutral"),i("h3","rp-panel__title","Compare exact-input quotes")),K.append(X,i("span","rp-badge","Indicative"));let W=i("form","rp-ticket__form"),Z=i("div","rp-ticket__sides");Z.setAttribute("role","group"),Z.setAttribute("aria-label","Quote side");let nt=at("rp-button is-selected","Buy");nt.setAttribute("aria-pressed","true");let Y=at("rp-button","Sell");Y.setAttribute("aria-pressed","false"),Z.append(nt,Y);let lt=i("label","rp-ticket__field"),ot=i("span",null,"You quote"),it=i("span","rp-ticket__input"),I=document.createElement("input");I.name="amount",I.type="text",I.inputMode="decimal",I.autocomplete="off",I.value="25",I.setAttribute("aria-describedby","rp-quote-boundary");let st=i("span",null,"USDC");it.append(I,st),lt.append(ot,it);let pt=i("label","rp-ticket__field");pt.append(i("span",null,"Raydium slippage guard"));let J=i("select","rp-ticket__select");J.name="slippageBps",J.setAttribute("aria-describedby","rp-slippage-boundary");for(let[B,tt]of[["25","0.25%"],["50","0.50%"],["100","1.00%"]]){let q=i("option",null,tt);q.value=B,B==="50"&&(q.selected=!0),J.append(q)}pt.append(J);let mt=i("p","rp-ticket__help","Raydium applies this fixed guard. Jupiter sets and reports its RTSE threshold independently.");mt.id="rp-slippage-boundary";let m=at("rp-ticket__button","Compare quotes","submit"),u=i("p","rp-ticket__status","Quotes run only when you ask. No wallet address is accepted.");u.id="rp-quote-boundary",u.setAttribute("role","status");let w=i("div","rp-ticket__quotes");W.append(Z,lt,pt,mt,m,u,w);let F=i("p","rp-ticket__attribution","Powered by Jupiter · Swap V2 Meta-Aggregator · Ultra mode"),S=i("div","rp-callout");S.append(i("strong",null,"Observation, not execution."),i("p",null,"Each provider answer is an expiring, quote-only snapshot. No transaction, request handle, wallet address, signature, or submission path reaches this page.")),$.append(K,F,W,S);let b=i("section","rp-panel rp-chat");M.append($,b),c.append(d,M);let T=i("p","rp-footnote","Reference-pool charts and aggregate-provider quotes answer different questions. Thin pools can move sharply; a later execution quote may differ.");return t.append(e,o,p,c,T),r.replaceChildren(t),{root:t,loading:o,rail:p,workspace:c,chartTitle:_,timeframes:x,refreshMarket:U,readout:R,canvas:O,chartState:A,candleTableHost:k,statNodes:g,tapeState:P,tapeHost:L,form:W,buy:nt,sell:Y,amount:I,amountText:ot,amountUnit:st,slippage:J,submit:m,status:u,quoteHost:w,chatHost:b}}function ae({host:r,fetchImpl:t=globalThis.fetch,now:e=()=>Date.now(),storage:a=Me(),registryReader:n=Jt,statsReader:o=Bt,candleReader:p=Ut,tradesReader:c=Lt,chatFactory:d=Qt,chatEnabled:l=!1}={}){if(!r)throw new TypeError("Zodiac Markets requires a host.");let s=ze(r),_=Ot({canvas:s.canvas,readout:s.readout}),z=qe(s.candleTableHost),h=Pe(s.tapeHost);s.chatHost.hidden=!l;let v=null;if(l)try{v=d({host:s.chatHost})}catch{s.chatHost.replaceChildren(i("p","rp-status is-unavailable","Market Chat preview is unavailable."))}let x=qt({storage:a,now:e}),U=zt({storage:a,now:e}),R=new Map,Q={},O=[],A="aries",y="buy",k="1h",j=0,g=0,f=0,E=null,G=null,P=null,L=null,M=!1;function $(){return R.get(A)}function K(){for(let m of s.rail.querySelectorAll(".rp-market")){let u=m.dataset.sign===A;m.classList.toggle("is-selected",u),m.setAttribute("aria-pressed",u?"true":"false")}for(let m of s.timeframes.querySelectorAll(".rp-timeframe")){let u=m.dataset.timeframe===k;m.classList.toggle("is-selected",u),m.setAttribute("aria-pressed",u?"true":"false")}}function X(){let m=$(),u=m?Q[m.mint]:null;s.statNodes.get("price").textContent=ee(u?.priceUsd),s.statNodes.get("change").textContent=te(u?.change24hPct),s.statNodes.get("liquidity").textContent=Number.isFinite(u?.liquidityUsd)?ht(u.liquidityUsd):"—"}function W(){for(let m of s.rail.querySelectorAll(".rp-market")){let u=R.get(m.dataset.sign),w=u?Q[u.mint]:null;m.querySelector(".rp-market__price").textContent=ee(w?.priceUsd),m.querySelector(".rp-market__change").textContent=`24h ${te(w?.change24hPct)}`}X()}function Z(){s.timeframes.replaceChildren(...Te.map(m=>{let u=at("rp-timeframe",m);return u.dataset.timeframe=m,u.setAttribute("aria-pressed",m===k?"true":"false"),u.addEventListener("click",()=>{if(k===m)return;k=m;let w=$();w&&s.canvas.setAttribute("aria-label",`${w.name} / USDC ${k} candlestick chart`),K(),I({tapeToo:!1})}),u}))}function nt(){s.rail.replaceChildren(...[...R.values()].map(m=>Oe(m,lt))),K(),W()}function Y(m="Quotes run only when you ask. No wallet address is accepted."){f+=1,P?.abort(),P=null,clearTimeout(L),L=null,s.quoteHost.replaceChildren(),s.status.textContent=m,s.status.className="rp-ticket__status",s.submit.removeAttribute("aria-disabled"),s.submit.removeAttribute("aria-busy")}function lt(m){if(!R.has(m)||A===m)return;A=m;let u=$();s.chartTitle.textContent=`${u.name} / USDC`,s.canvas.setAttribute("aria-label",`${u.name} / USDC ${k} candlestick chart`),s.amountUnit.textContent=y==="buy"?"USDC":u.symbol,K(),X(),Y("Market changed. Request a new comparison when ready."),I({tapeToo:!0})}function ot(m){if(y===m)return;y=m;let u=$();s.buy.classList.toggle("is-selected",y==="buy"),s.sell.classList.toggle("is-selected",y==="sell"),s.buy.setAttribute("aria-pressed",y==="buy"?"true":"false"),s.sell.setAttribute("aria-pressed",y==="sell"?"true":"false"),s.amountUnit.textContent=y==="buy"?"USDC":u?.symbol??"token",Y("Side changed. Request a new comparison when ready.")}async function it(m,u,w,F,S,b){if(U.active()){S.textContent=`Provider cooling down for ${Math.ceil(U.remainingMs()/1e3)} seconds.`,S.className=S===s.chartState?"rp-chart__state is-waiting":"rp-status is-waiting";return}if(!x.take()){S.textContent="Shared market-data budget is resting. Try again in a minute.",S.className=S===s.chartState?"rp-chart__state is-waiting":"rp-status is-waiting";return}let T=U.token();try{let B=await m(u);if(M||w!==F())return;U.ok(T),b(B)}catch(B){if(B instanceof rt&&B.code==="rate_limited"&&U.fail(B.retryAfterMs),B?.name==="AbortError"||M||w!==F())return;S.textContent=Re(B),S.className=S===s.chartState?"rp-chart__state is-unavailable":"rp-status is-unavailable"}}function I({tapeToo:m=!0}={}){let u=$();if(!u)return;let w=$t({slug:u.slug,mint:u.mint,rows:O});j+=1;let F=j;E?.abort(),E=new AbortController;let S=g;if(m&&(g+=1,S=g,G?.abort(),G=new AbortController),_.clear(),z.clear(),m&&h.clear(),!w){s.chartState.textContent="No indexed reference pool is available for this market.",s.chartState.className="rp-chart__state is-unavailable",m&&(s.tapeState.textContent="Recent pool trades are not indexed.",s.tapeState.className="rp-status is-unavailable");return}s.chartState.textContent="Reading candles…",s.chartState.className="rp-chart__state is-waiting",it(p,{pool:w,timeframe:k,fetchImpl:t,signal:E.signal},F,()=>j,s.chartState,b=>{_.set({candles:b,timeframe:k,hue:u.hue}),z.set(b),s.chartState.textContent=b.length?`${b.length} indexed candles`:"No candles in this interval.",s.chartState.className=b.length?"rp-chart__state is-ready":"rp-chart__state is-unavailable"}),m&&(s.tapeState.textContent="Reading recent pool trades…",s.tapeState.className="rp-status is-waiting",it(c,{pool:w,mint:u.mint,fetchImpl:t,signal:G.signal},S,()=>g,s.tapeState,b=>{h.set(b,u,e()),s.tapeState.textContent=b.length?`${b.length} recent indexed trades`:"No recent indexed trades.",s.tapeState.className=b.length?"rp-status is-ready":"rp-status is-unavailable"}))}async function st(){let m=new AbortController,u=_t(m.signal,Zt);try{let w=await o({mints:[...R.values()].map(F=>F.mint),fetchImpl:t,signal:u.signal});if(M)return;Q=w.stats,O=w.rows,W()}catch{M||(s.loading.textContent="Registry identity is ready; indexed summary data is temporarily unavailable.")}finally{u.cleanup()}}async function pt(m){if(m.preventDefault(),s.submit.getAttribute("aria-disabled")==="true")return;let u=$();if(!u)return;let w;try{w=Vt(s.amount.value,6)}catch(b){s.status.textContent=b instanceof C?b.message:"Enter a valid amount.",s.status.className="rp-ticket__status is-unavailable";return}f+=1;let F=f;P?.abort(),P=new AbortController;let S=_t(P.signal,Ee);s.submit.setAttribute("aria-disabled","true"),s.submit.setAttribute("aria-busy","true"),s.quoteHost.replaceChildren(),s.status.textContent="Comparing independent provider snapshots…",s.status.className="rp-ticket__status is-waiting";try{let b=await t("/api/registry-pro-quotes",{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},credentials:"same-origin",cache:"no-store",signal:S.signal,body:JSON.stringify({sign:u.slug,side:y,amount:w,slippageBps:Number(s.slippage.value)})}),T=await b.json().catch(()=>null);if(M||F!==f)return;if(!(b.ok||b.status===503&&T?.status==="unavailable")||!T||!Array.isArray(T.results)||T.sign!==u.slug||T.side!==y||!["complete","partial","unavailable"].includes(T.status)){let q=b.status===404?"The server-side quote pilot is disabled.":b.status===429?"The quote budget is cooling down.":"The quote comparison is unavailable.";throw new C(T?.error??"unavailable",q)}s.quoteHost.replaceChildren(...T.results.map(q=>De(q,T,u,y))),s.status.textContent=T.status==="complete"?"Both provider snapshots passed the quote-only contract.":T.status==="partial"?"Partial coverage: one provider passed the quote-only contract.":"Neither provider has a current quote. Their independent failure states are shown below.",s.status.className=T.status==="unavailable"?"rp-ticket__status is-unavailable":"rp-ticket__status is-ready";let tt=T.results.filter(q=>q.status==="ready").map(q=>{let ct=Date.parse(String(q.quote?.observedAt??T.observedAt??"")),xt=Date.parse(String(q.quote?.expiresAt??""));return Number.isFinite(xt)?xt:ct+15e3}).filter(Number.isFinite);tt.length&&(clearTimeout(L),L=setTimeout(()=>{!M&&F===f&&Y("Provider snapshots expired. Request a fresh comparison.")},Math.max(0,Math.min(...tt)-e())))}catch(b){if(M||F!==f||P?.signal.aborted)return;s.status.textContent=b instanceof C?b.message:S.timedOut()?"The quote comparison timed out.":"The quote comparison is unavailable.",s.status.className="rp-ticket__status is-unavailable"}finally{S.cleanup(),F===f&&(s.submit.removeAttribute("aria-disabled"),s.submit.removeAttribute("aria-busy"),P=null)}}async function J(){let m=_t(null,Zt);try{if(R=await n({fetchImpl:t,signal:m.signal}),M)return;Z(),nt();let u=$();s.chartTitle.textContent=`${u.name} / USDC`,s.canvas.setAttribute("aria-label",`${u.name} / USDC ${k} candlestick chart`),s.loading.textContent="Official Registry identity loaded. Provider observations remain independent.",s.loading.className="rp-status is-ready",await st(),M||I({tapeToo:!0})}catch{s.loading.textContent="The official Registry could not be validated. Quotes remain closed.",s.loading.className="rp-status is-unavailable",s.workspace.hidden=!0}finally{m.cleanup()}}return s.buy.addEventListener("click",()=>ot("buy")),s.sell.addEventListener("click",()=>ot("sell")),s.amount.addEventListener("input",()=>Y("Amount changed. Request a new comparison when ready.")),s.slippage.addEventListener("change",()=>Y("Raydium guard changed. Request a new comparison when ready.")),s.form.addEventListener("submit",pt),s.refreshMarket.addEventListener("click",async()=>{await st(),M||I({tapeToo:!0})}),{ready:J(),destroy(){M=!0,j+=1,g+=1,f+=1,E?.abort(),G?.abort(),P?.abort(),clearTimeout(L),_.destroy(),v?.destroy?.(),r.replaceChildren()}}}function Ue(){if(document.querySelector("style[data-registry-pro-styles]"))return;let r=document.createElement("style");r.setAttribute("data-registry-pro-styles",""),r.textContent=vt,document.head.append(r)}function ne(){let r=document.querySelector("[data-registry-pro-terminal]");if(!(!r||r.dataset.registryProMounted)){r.dataset.registryProMounted="1",Ue();try{let t=document.querySelector('meta[name="zodiacs-registry-pro-chat-enabled"][content="1"]')!==null;ae({host:r,chatEnabled:t})}catch{r.innerHTML="";let t=document.createElement("div");t.className="registry-pro__fallback",t.setAttribute("role","status"),t.textContent="Zodiac Markets could not open. No quote or transaction was sent.",r.append(t)}}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",ne,{once:!0}):ne();})();
