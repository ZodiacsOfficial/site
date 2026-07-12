import { describe, expect, it } from 'vitest';
import { findTextSeams } from './check-text-seams.mjs';

describe('rendered text seam checker', () => {
  it('finds joins across inline markup, unspaced em dashes, and doubled spaces', () => {
    const findings = findTextSeams(`
      <body>
        <aside>Edited by<a href="/about/">Rowan Vale</a>.</aside>
        <p>A chart —<a href="/birth-chart/">compute yours</a>, then see
          the houses and<a href="/learn/aspects/">the aspects</a>.</p>
        <p>There are  two spaces here.</p>
      </body>
    `);

    expect(findings.map(({ kind }) => kind)).toEqual([
      'inline-word-join',
      'unspaced-em-dash',
      'inline-letter-join',
      'doubled-space',
    ]);
    expect(findings.map(({ match }) => match)).toEqual([
      'byRowan',
      '—c',
      'andthe',
      '  ',
    ]);
  });

  it('ignores non-rendered code and formatting indentation', () => {
    const findings = findTextSeams(`
      <body>
        <p>Edited by <a href="/about/">Rowan Vale</a> — spaced copy.</p>
        <p>Line one
          continues with ordinary source indentation.</p>
        <p hidden>Hidden by<a>Someone</a>.</p>
        <pre>const made  = 'bySomeone';</pre>
        <script>const text = 'word—word  byName';</script>
        <svg><text>word—word  byName</text></svg>
      </body>
    `);

    expect(findings).toEqual([]);
  });

  it('does not join text across block boundaries', () => {
    expect(findTextSeams('<body><p>Edited by</p><p>Rowan Vale</p></body>')).toEqual([]);
  });

  it('finds arbitrary letter joins in prose, not only connector words', () => {
    expect(findTextSeams('<body><p>The birthday <a>page</a>carries the dates.</p></body>'))
      .toEqual([expect.objectContaining({ kind: 'inline-letter-join', match: 'pagecarries' })]);
  });

  it('ignores layout chrome, interrupted speech, and Spanish parenthetical dashes', () => {
    const html = `
      <html lang="es"><body>
        <nav><a>Acerca de</a><a>Privacidad</a></nav>
        <p>La posición —vista desde la Tierra— en ese instante.</p>
        <footer><span>Escrito por</span><span>Alguien</span></footer>
      </body></html>
    `;
    expect(findTextSeams(html)).toEqual([]);
    expect(findTextSeams('<html lang="en"><body><p>“What if we just—”</p></body></html>')).toEqual([]);
  });

  it('ignores CSS-composed metadata, drop caps, and linked plural stems', () => {
    const html = `
      <body>
        <p><span class="dc">B</span>efore the registry.</p>
        <dd><div class="glossary__meta"><p><span>Related</span><a>Moon</a></p></div></dd>
        <p>Two <a>Libra</a>s together.</p>
      </body>
    `;
    expect(findTextSeams(html)).toEqual([]);
  });
});
