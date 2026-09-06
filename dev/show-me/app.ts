import { glyphs, placement } from './format';
import type { Connection } from './model';
import type { examples as ExampleData } from './fixtures';

const examples: typeof ExampleData = JSON.parse(document.querySelector('#examples')!.textContent!);
const root = document.querySelector<HTMLElement>('#app')!;
let exampleIndex = 0;
let selectedIndex = 0;
let detailed = false;

const point = (lon: number, r: number) => ({ x: 180 - r * Math.cos(lon * Math.PI / 180), y: 180 + r * Math.sin(lon * Math.PI / 180) });
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
function wheel(connection: Connection) {
  const a = point(connection.a.lon, 115);
  const b = point(connection.b.lon, 115);
  return `<svg viewBox="0 0 360 360" role="img" aria-label="${esc(connection.title)}: ${connection.aspect.type}, ${connection.separation.toFixed(2)} degrees apart. A simplified zodiac diagram.">
    <circle cx="180" cy="180" r="163" class="ring"/><circle cx="180" cy="180" r="136" class="ring"/>
    ${glyphs.map((g, i) => { const p = point(i * 30 + 15, 149); const q = point(i * 30, 136); const r = point(i * 30, 163); return `<line x1="${q.x}" y1="${q.y}" x2="${r.x}" y2="${r.y}" class="ring"/><text x="${p.x}" y="${p.y + 5}" class="sign">${g}</text>`; }).join('')}
    <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="connection"/>
    <circle cx="${a.x}" cy="${a.y}" r="8" class="planet first"/><circle cx="${b.x}" cy="${b.y}" r="5" class="planet second"/>
    <text x="180" y="174" class="wheel-title">${connection.exactAngle}°</text><text x="180" y="197" class="wheel-caption">${connection.aspect.type}</text>
  </svg>`;
}

function render() {
  const sample = examples[exampleIndex];
  const connection = sample.connections[selectedIndex];
  root.innerHTML = `<header><a class="wordmark" href="#app">zodiacs<span>°</span></a><span class="prototype">INTERACTION PREVIEW</span></header>
    <main><div class="intro"><p class="eyebrow">YOUR CHART, MADE CLEAR</p><h1>Show me how it connects.</h1><p class="lede">Start with two planets. See their relationship, then explore what it could mean.</p></div>
    <div class="workspace"><section class="visual" aria-label="Selected chart relationship">
      <label class="sample-label" for="sample">Explore an example</label><select id="sample">${examples.map((s, i) => `<option value="${i}" ${i === exampleIndex ? 'selected' : ''}>${s.name}</option>`).join('')}</select>
      <div class="wheel">${wheel(connection)}</div>
      <div class="legend"><span><i class="dot first"></i>${connection.a.body}<small>${placement(connection.a.lon)}</small></span><span><i class="dot second"></i>${connection.b.body}<small>${placement(connection.b.lon)}</small></span></div>
      <p class="sample-meta">${sample.description}</p>
      ${!sample.timeKnown ? '<p class="time-note">This example uses a reference time. The Moon and other positions can change across the day; houses and rising sign are omitted.</p>' : ''}
    </section>
    <section class="reading" aria-label="Explore a connection"><p class="eyebrow">CHOOSE A CONNECTION</p><div class="choices" role="group" aria-label="Chart connections">${sample.connections.map((c, i) => `<button class="choice" data-connection="${i}" aria-pressed="${i === selectedIndex}">${c.title}<small>${c.aspect.type}</small></button>`).join('')}</div>
      <div class="explanation" aria-live="polite" aria-atomic="true"><p class="eyebrow">${connection.aspect.type.toUpperCase()} · ${connection.aspect.orb.toFixed(2)}° ORB</p><h2>${connection.title}</h2><p class="interpretation">${esc(connection.reading)}</p></div>
      <button id="details" class="details-toggle" aria-expanded="${detailed}" aria-controls="exact-details">${detailed ? 'Hide the details −' : 'Why this reading? +'}</button>
      <div id="exact-details" ${detailed ? '' : 'hidden'}><dl><div><dt>Measured separation</dt><dd>${connection.separation.toFixed(2)}°</dd></div><div><dt>Exact ${connection.aspect.type}</dt><dd>${connection.exactAngle}°</dd></div><div><dt>Distance from exact (orb)</dt><dd>${connection.aspect.orb.toFixed(2)}°</dd></div></dl><p>The geometry comes from the chart engine. The reading is an authored astrological interpretation of that relationship.</p></div>
      <aside class="reflection"><p class="eyebrow">A MOMENT TO REFLECT</p><p>${connection.prompt}</p><span>You decide what resonates.</span></aside>
      <div class="next-row"><span>${selectedIndex + 1} of ${sample.connections.length} connections</span><button id="next">Explore another <span aria-hidden="true">→</span></button></div>
    </section></div>
    <footer>A guided interaction prototype with synthetic charts. No account or personal data needed.<br>Diagram shows the selected pair only. Zodiac orientation is fixed to Aries. Engine ${esc(sample.engineVersion)}.</footer></main>`;
  root.querySelector<HTMLSelectElement>('#sample')!.addEventListener('change', event => { exampleIndex = Number((event.target as HTMLSelectElement).value); selectedIndex = 0; detailed = false; render(); root.querySelector<HTMLElement>('#sample')!.focus(); });
  root.querySelectorAll<HTMLButtonElement>('[data-connection]').forEach(button => button.addEventListener('click', () => { selectedIndex = Number(button.dataset.connection); render(); root.querySelector<HTMLElement>(`[data-connection="${selectedIndex}"]`)!.focus(); }));
  root.querySelector('#details')!.addEventListener('click', () => { detailed = !detailed; render(); root.querySelector<HTMLElement>('#details')!.focus(); });
  root.querySelector('#next')!.addEventListener('click', () => { selectedIndex = (selectedIndex + 1) % sample.connections.length; render(); root.querySelector<HTMLElement>('#next')!.focus(); });
}
render();
