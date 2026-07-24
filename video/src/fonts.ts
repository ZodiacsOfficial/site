/**
 * Load the site's self-hosted fonts (same woff2 files as production)
 * before any frame renders.
 */
import { continueRender, delayRender, staticFile } from 'remotion';

const faces: Array<[string, string, FontFaceDescriptors]> = [
  ['EB Garamond', 'fonts/eb-garamond-latin-400-normal.woff2', { weight: '400', style: 'normal' }],
  ['EB Garamond', 'fonts/eb-garamond-latin-500-normal.woff2', { weight: '500', style: 'normal' }],
  ['EB Garamond', 'fonts/eb-garamond-latin-400-italic.woff2', { weight: '400', style: 'italic' }],
  ['Instrument Sans', 'fonts/instrument-sans-latin-wght-normal.woff2', { weight: '400 700', style: 'normal' }],
  ['JetBrains Mono', 'fonts/jetbrains-mono-latin-wght-normal.woff2', { weight: '300 600', style: 'normal' }],
];

const handle = delayRender('fonts', { retries: 2, timeoutInMilliseconds: 120000 });

Promise.all(
  faces.map(async ([family, file, desc]) => {
    const face = new FontFace(family, `url(${staticFile(file)}) format('woff2-variations')`, desc);
    await face.load();
    (document.fonts as unknown as { add(f: FontFace): void }).add(face);
  }),
).then(() => continueRender(handle))
  .catch((err) => {
    // Fail the render loudly — a fallback font is not acceptable output.
    console.error('font load failed', err);
    throw err;
  });
