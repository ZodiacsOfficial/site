import { Config } from '@remotion/cli/config';

// Use the environment's Chromium (Playwright-provisioned) — no download.
// It only ships the NEW headless mode, so run it as chrome-for-testing
// rather than the default headless-shell flags.
Config.setBrowserExecutable('/opt/pw-browsers/chromium');
Config.setChromeMode('chrome-for-testing');
Config.setOverwriteOutput(true);
// The void background is near-black; keep intermediate frames and the
// encode high-quality so the dark gradients don't band.
Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(95);
Config.setCrf(16);
// Give slow tab restarts room to reload the self-hosted fonts.
Config.setDelayRenderTimeoutInMilliseconds(120000);
