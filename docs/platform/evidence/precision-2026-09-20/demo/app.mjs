/** UI only. Every calculation happens in the worker. */
const worker = new Worker('./worker.mjs', { type: 'module' });
let seq = 0;
const pending = new Map();
worker.onmessage = (e) => {
  const { id, type } = e.data;
  if (type === 'progress') { document.getElementById('bench-state').textContent = `… ${e.data.done} of ${e.data.total}`; return; }
  const fn = pending.get(id);
  if (fn) { pending.delete(id); fn(e.data.payload ?? e.data); }
};
const ask = (msg) => new Promise((res) => { const id = ++seq; pending.set(id, res); worker.postMessage({ ...msg, id }); });
const $ = (x) => document.getElementById(x);
const dl = (el, obj) => { el.innerHTML = ''; for (const [k, v] of Object.entries(obj)) {
  const dt = document.createElement('dt'); dt.textContent = k;
  const dd = document.createElement('dd'); dd.textContent = typeof v === 'object' ? JSON.stringify(v) : String(v);
  el.append(dt, dd); } };

$('pack').addEventListener('change', async (e) => {
  const file = e.target.files[0]; if (!file) return;
  $('pack-state').textContent = `reading ${file.name} (${file.size} bytes) …`;
  const buffer = await file.arrayBuffer();
  const r = await ask({ type: 'load-pack', buffer });
  if (!r.ok) { $('pack-state').className = 'refused'; $('pack-state').textContent = `refused: ${r.refused} — ${r.detail}`; $('pack-info').innerHTML = ''; return; }
  $('pack-state').className = 'ok';
  $('pack-state').textContent = `loaded ${file.name}`;
  dl($('pack-info'), r.packInfo);
});

$('run').addEventListener('click', async () => {
  $('compare-state').className = ''; $('compare-state').textContent = 'working …';
  const r = await ask({ type: 'compare', iso: $('iso').value.trim() });
  if (!r.ok) { $('compare-state').className = 'refused'; $('compare-state').textContent = `refused: ${r.refused} — ${r.detail}`; $('compare-out').innerHTML = ''; return; }
  $('compare-state').textContent = `lightweight ${r.lightweightMs.toFixed(3)} ms · precision ${r.precisionMs.toFixed(3)} ms`;
  const head = '<tr><th>body</th><th class="num">lightweight °</th><th class="num">precision °</th><th class="num">difference ″</th></tr>';
  $('compare-out').innerHTML = `<table>${head}${r.rows.map((x) =>
    `<tr><td>${x.body}</td><td class="num">${x.lightweight.toFixed(6)}</td><td class="num">${x.precision.toFixed(6)}</td><td class="num">${x.differenceArcsec.toFixed(3)}</td></tr>`).join('')}</table>`;
  dl($('assumptions'), r.assumptions);
});

$('bench').addEventListener('click', async () => {
  $('cancel').disabled = false; $('bench').disabled = true;
  const r = await ask({ type: 'bench', reps: 400 });
  $('cancel').disabled = true; $('bench').disabled = false;
  if (!r.ok) { $('bench-state').className = 'refused'; $('bench-state').textContent = `${r.refused}: ${r.detail}`; return; }
  $('bench-state').className = '';
  $('bench-state').textContent = `${r.n} charts of 10 bodies`;
  $('bench-out').innerHTML = `<table><tr><th>backend</th><th class="num">p50 ms / chart</th></tr>`
    + `<tr><td>lightweight</td><td class="num">${r.lightweightP50Ms?.toFixed(4) ?? '—'}</td></tr>`
    + `<tr><td>precision</td><td class="num">${r.precisionP50Ms?.toFixed(4) ?? 'no pack'}</td></tr></table>`;
});

$('cancel').addEventListener('click', () => { worker.postMessage({ type: 'cancel', id: ++seq }); });

$('refusals').addEventListener('click', async () => {
  const cases = [
    ['instant before coverage', { type: 'compare', iso: '1600-01-01T00:00:00Z' }],
    ['instant after coverage', { type: 'compare', iso: '2400-01-01T00:00:00Z' }],
    ['inside coverage but inside the light-time margin', { type: 'compare', iso: '1849-12-26T01:00:00Z' }],
    ['malformed instant', { type: 'compare', iso: 'yesterday' }],
    ['unknown request', { type: 'teleport' }],
  ];
  const out = [];
  for (const [label, msg] of cases) {
    const r = await ask(msg);
    out.push(`<tr><td>${label}</td><td class="${r.ok ? 'refused' : 'ok'}">${r.ok ? 'ANSWERED — this is a defect' : `refused: ${r.refused}`}</td></tr>`);
  }
  $('refusal-out').innerHTML = `<table><tr><th>case</th><th>outcome</th></tr>${out.join('')}</table>`;
});
