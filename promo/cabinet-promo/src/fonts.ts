import { loadFont } from '@remotion/fonts';
import { staticFile } from 'remotion';

// loadFont() delays rendering internally until the font is ready, so
// fire-and-forget at module scope is render-safe.
void loadFont({ family: 'EBGaramond', url: staticFile('eb-garamond-latin-500-normal.woff2'), weight: '500' });
void loadFont({ family: 'EBGaramond', url: staticFile('eb-garamond-latin-400-normal.woff2'), weight: '400' });
void loadFont({
  family: 'EBGaramond',
  url: staticFile('eb-garamond-latin-400-italic.woff2'),
  weight: '400',
  style: 'italic',
});
void loadFont({ family: 'InstrumentSans', url: staticFile('instrument-sans-latin-wght-normal.woff2') });
void loadFont({ family: 'JetBrainsMono', url: staticFile('jetbrains-mono-latin-wght-normal.woff2') });
