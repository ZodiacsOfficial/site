import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';

// Exercise the real directive with native controls, reset semantics and events.
// The owned static fixture has no product modules, network or storage services.
const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'src/client-directives/interaction.ts');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const bundle = await build({
  stdin: { contents: `import directive from ${JSON.stringify(source)}; window.interactionSubject = directive;`, resolveDir: root },
  bundle: true, write: false, format: 'iife', platform: 'browser', target: 'es2022',
});
const bytes = bundle.outputFiles[0].contents;
const result = {
  sourceSha256: digest(await readFile(source)), bundleSha256: digest(bytes), bundleBytes: bytes.length,
  browser: null, requests: [], errors: [], checks: [], cleanup: { browser: false, server: false },
};
const server = createServer((request, response) => {
  result.requests.push(request.url);
  response.setHeader('Cache-Control', 'no-store');
  if (request.url === '/subject.js') {
    response.setHeader('Content-Type', 'text/javascript');
    response.end(bytes);
  } else if (request.url === '/') {
    response.setHeader('Content-Type', 'text/html');
    response.end('<!doctype html><title>Interaction replay fixture</title><script src="/subject.js"></script>');
  } else { response.writeHead(404); response.end(); }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
let browser;
try {
  browser = await chromium.launch({ executablePath: await findChromium(), args: STABLE_CHROMIUM_ARGS });
  result.browser = browser.version();
  const page = await browser.newPage();
  page.on('pageerror', (error) => result.errors.push(error.message));
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*', (route) => new URL(route.request().url()).origin === origin
    ? route.continue() : route.abort());
  await page.goto(origin);
  result.checks = await page.evaluate(async () => {
    const checks = [];
    const pause = (ms) => new Promise((done) => setTimeout(done, ms));
    const edit = (control, value) => {
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const snapshot = (host) => Array.from(host.querySelectorAll('input,select,textarea')).map((control) => ({
      value: control.value,
      checked: control instanceof HTMLInputElement ? control.checked : null,
      selected: control instanceof HTMLSelectElement ? Array.from(control.options, (option) => option.selected) : null,
    }));
    async function test(name, html, setup, hydrate, expected, beforeStart = () => {}) {
      const host = document.createElement('div');
      host.innerHTML = html;
      document.body.append(host);
      beforeStart(host);
      let loads = 0;
      let release;
      const gate = new Promise((done) => { release = done; });
      window.interactionSubject(async () => {
        loads += 1;
        await gate;
        return () => hydrate(host);
      }, { value: { eagerHash: false } }, host);
      await setup(host);
      host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      release();
      await pause(330);
      const actual = snapshot(host);
      checks.push({ name, pass: loads === 1 && JSON.stringify(actual) === JSON.stringify(expected), loads, actual, expected });
      host.remove();
    }
    const text = (value) => ({ value, checked: false, selected: null });
    await test('untouched controls admit shared initialization', '<input id="date"><input id="time"><select><option value="whole">Whole</option><option value="placidus">Placidus</option></select>', () => {}, (host) => {
      const controls = host.querySelectorAll('input,select');
      controls[0].value = '1990-06-15'; controls[1].value = '14:30'; controls[2].value = 'placidus';
    }, [text('1990-06-15'), text('14:30'), { value: 'placidus', checked: null, selected: [false, true] }]);
    await test('explicit reset to blank survives first recapture', '<input>', (host) => {
      edit(host.firstChild, 'person'); edit(host.firstChild, '');
    }, (host) => { host.firstChild.value = 'shared'; }, [text('')]);
    await test('eventless late autofill survives hydration', '<input value="default">', (host) => {
      host.firstChild.value = 'autofilled';
    }, (host) => { host.firstChild.value = 'component'; }, [text('autofilled')]);
    await test('autofill present at directive start survives', '<input value="default">', () => {},
      (host) => { host.firstChild.value = 'default'; }, [text('autofilled')],
      (host) => { host.firstChild.value = 'autofilled'; });
    await test('native normalized defaults stay untouched', '<input type="range"><input type="number" value="invalid" name="reset">', () => {}, (host) => {
      host.children[0].value = '80'; host.children[1].value = '20';
    }, [text('80'), text('20')]);
    await test('newer edit during commit wins', '<input>', (host) => edit(host.firstChild, 'early'), (host) => {
      host.firstChild.value = 'component';
      queueMicrotask(() => edit(host.firstChild, 'latest'));
    }, [text('latest')]);
    await test('replaced controls retain edit by id', '<input id="replacement">', (host) => edit(host.firstChild, 'edited'), (host) => {
      host.innerHTML = '<span></span><input id="replacement" value="component">';
    }, [text('edited')]);
    await test('textarea eventless edit survives', '<textarea>default</textarea>', (host) => { host.firstChild.value = 'edited'; }, (host) => {
      host.firstChild.value = 'component';
    }, [{ value: 'edited', checked: null, selected: null }]);
    await test('checked reset remains explicit', '<input type="checkbox" value="yes">', (host) => {
      host.firstChild.checked = true; host.firstChild.dispatchEvent(new Event('change', { bubbles: true }));
      host.firstChild.checked = false; host.firstChild.dispatchEvent(new Event('change', { bubbles: true }));
    }, (host) => { host.firstChild.checked = true; }, [{ value: 'yes', checked: false, selected: null }]);
    await test('untouched selected defaults admit initialization', '<select><option disabled>A</option><option>B</option><option>C</option></select>', () => {}, (host) => {
      host.firstChild.value = 'C';
    }, [{ value: 'C', checked: null, selected: [false, false, true] }]);
    await test('multiple select restores every selected option', '<select multiple><option>A</option><option>B</option><option>C</option></select>', (host) => {
      host.firstChild.options[1].selected = true; host.firstChild.options[2].selected = true;
    }, (host) => { host.firstChild.value = 'A'; }, [{ value: 'B', checked: null, selected: [false, true, true] }]);
    await test('select reset remains explicit', '<select><option>A</option><option>B</option></select>', (host) => {
      edit(host.firstChild, 'B'); edit(host.firstChild, 'A');
    }, (host) => { host.firstChild.value = 'B'; }, [{ value: 'A', checked: null, selected: [true, false] }]);
    await test('single-select value survives option reorder', '<select><option>A</option><option>B</option></select>', (host) => {
      edit(host.firstChild, 'B');
    }, (host) => { host.firstChild.innerHTML = '<option>B</option><option>A</option>'; }, [{ value: 'B', checked: null, selected: [true, false] }]);
    await test('multiple selected values survive option reorder', '<select multiple><option>A</option><option>B</option><option>C</option></select>', (host) => {
      host.firstChild.options[1].selected = true; host.firstChild.options[2].selected = true;
    }, (host) => { host.firstChild.innerHTML = '<option>C</option><option>A</option><option>B</option>'; }, [{ value: 'C', checked: null, selected: [true, false, true] }]);

    // Load and hydration rejection have different recapture boundaries. A failed
    // hydrate may already have changed DOM, so the original edit must survive it.
    for (const failure of ['load', 'hydrate']) {
      const host = document.createElement('div'); host.innerHTML = '<form><input><button type="submit">Go</button></form>'; document.body.append(host);
      let loads = 0; let submits = 0; let submittedValue; let submitter;
      window.interactionSubject(async () => {
        loads += 1;
        if (failure === 'load' && loads === 1) throw new Error('expected load failure');
        return () => {
          host.querySelector('input').value = 'component';
          if (failure === 'hydrate' && loads === 1) throw new Error('expected hydrate failure');
          host.querySelector('form').addEventListener('submit', (event) => {
            event.preventDefault(); submits += 1; submittedValue = host.querySelector('input').value; submitter = event.submitter?.textContent;
          });
        };
      }, { value: { eagerHash: false } }, host);
      edit(host.querySelector('input'), 'edited');
      host.querySelector('form').requestSubmit(host.querySelector('button'));
      await pause(20);
      host.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      await pause(330);
      checks.push({ name: `${failure} retry preserves edit and replays one queued submit`, pass: loads === 2 && submits === 1 && submittedValue === 'edited' && submitter === 'Go', loads, submits, submittedValue, submitter });
      host.remove();
    }
    return checks;
  });
} finally {
  if (browser) { await browser.close(); result.cleanup.browser = true; }
  await new Promise((done) => server.close(done)); result.cleanup.server = true;
  if (process.env.OUT_DIR) {
    await mkdir(process.env.OUT_DIR, { recursive: true });
    await writeFile(resolve(process.env.OUT_DIR, 'interaction-result.json'), JSON.stringify(result, null, 2));
  }
  console.log(JSON.stringify(result, null, 2));
}
assert.equal(result.errors.length, 0, 'Browser errors');
assert.equal(result.checks.filter((check) => !check.pass).length, 0, 'Interaction replay failures');
console.log(`interaction-replay-drive: ${result.checks.length} native controls passed`);
