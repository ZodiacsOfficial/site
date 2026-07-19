import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { findChromium, STABLE_CHROMIUM_ARGS } from './visual/browser.mjs';
import { withPreview } from './visual/preview-server.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactRoot = resolve(root, 'tests/visual/artifacts/frame-cadence');
const cpuThrottleRate = Number(process.env.PHASE1_FRAME_CPU_RATE ?? 4);
const trialCount = Number(process.env.PHASE1_FRAME_TRIALS ?? 3);
const sampleFrames = Number(process.env.PHASE1_FRAME_SAMPLES ?? 180);
const viewport = { width: 390, height: 844 };
const thresholds = {
  // First prove that the runner itself can sustain a 60Hz-class cadence, then
  // retain at least 98% of that calibrated baseline while the animation runs.
  // Capping the derived trial floor at 60fps keeps high-refresh headless rAF
  // from inventing a stricter product requirement; calibrating it lets a true
  // 60Hz runner absorb one isolated scheduler miss without contradicting the
  // long-frame allowance below.
  minimumBaselineFps: 59,
  maximumTargetFps: 60,
  minimumCadenceRetention: 0.98,
  maximumMedianIntervalMs: 18.5,
  // A p95 may include an isolated missed vsync on shared CI hardware, but it
  // must remain inside two 60Hz frame budgets. The stricter long-frame ratio
  // below prevents this tolerance from masking repeatable jank.
  maximumP95IntervalMs: 34,
  maximumLongFrameRatio: 0.02,
  longFrameMs: 34,
};

if (!Number.isFinite(cpuThrottleRate) || cpuThrottleRate < 1 || cpuThrottleRate > 10) {
  throw new Error('PHASE1_FRAME_CPU_RATE must be a number from 1 to 10.');
}
if (!Number.isInteger(trialCount) || trialCount < 3 || trialCount > 5) {
  throw new Error('PHASE1_FRAME_TRIALS must be an integer from 3 to 5.');
}
if (!Number.isInteger(sampleFrames) || sampleFrames < 120 || sampleFrames > 600) {
  throw new Error('PHASE1_FRAME_SAMPLES must be an integer from 120 to 600.');
}

function percentile(values, fraction) {
  const sorted = values.toSorted((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarizeCadence(timestamps) {
  const intervals = timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]);
  const duration = timestamps.at(-1) - timestamps[0];
  const longFrameCount = intervals.filter((interval) => interval > thresholds.longFrameMs).length;
  return {
    sampledFrames: intervals.length,
    durationMs: duration,
    effectiveFps: (intervals.length * 1_000) / duration,
    medianIntervalMs: percentile(intervals, 0.5),
    p95IntervalMs: percentile(intervals, 0.95),
    p99IntervalMs: percentile(intervals, 0.99),
    maximumIntervalMs: Math.max(...intervals),
    longFrameCount,
    longFrameRatio: longFrameCount / intervals.length,
  };
}

function summarize(timestamps, transformSamples, baseline) {
  const result = {
    ...summarizeCadence(timestamps),
    minimumEffectiveFps: Math.min(
      thresholds.maximumTargetFps,
      baseline.effectiveFps * thresholds.minimumCadenceRetention,
    ),
    distinctTransformSamples: new Set(transformSamples).size,
  };
  return {
    ...result,
    pass: result.effectiveFps >= result.minimumEffectiveFps
      && result.medianIntervalMs <= thresholds.maximumMedianIntervalMs
      && result.p95IntervalMs <= thresholds.maximumP95IntervalMs
      && result.longFrameRatio <= thresholds.maximumLongFrameRatio
      && result.distinctTransformSamples >= 3,
  };
}

await rm(artifactRoot, { recursive: true, force: true });
await mkdir(artifactRoot, { recursive: true });

const executablePath = await findChromium();
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: STABLE_CHROMIUM_ARGS,
});
const browserVersion = await browser.version();
let report;

try {
  await withPreview({ port: Number(process.env.PHASE1_FRAME_PORT ?? 4332) }, async (baseURL) => {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      colorScheme: 'dark',
      reducedMotion: 'no-preference',
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottleRate });
    const response = await page.goto(`${baseURL}/horoscopes/aries/`, { waitUntil: 'networkidle' });
    if (!response?.ok()) throw new Error(`Frame route returned HTTP ${response?.status() ?? 'unknown'}.`);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('.program__sky').scrollIntoViewIfNeeded();

    // Measure the runner's native rAF cadence with page animations paused.
    // The product trial below is judged against both this baseline and the
    // absolute 60Hz frame budget, so an overloaded CI host cannot self-excuse.
    const baselineTimestamps = await page.evaluate(async (frames) => {
      const animations = document.getAnimations().filter((animation) => animation.playState === 'running');
      animations.forEach((animation) => animation.pause());
      const timestamps = await new Promise((resolveSample) => {
        const values = [];
        const next = (timestamp) => {
          values.push(timestamp);
          if (values.length <= frames) requestAnimationFrame(next);
          else resolveSample(values);
        };
        requestAnimationFrame(next);
      });
      animations.forEach((animation) => animation.play());
      return timestamps;
    }, sampleFrames);
    const baseline = summarizeCadence(baselineTimestamps);
    const baselinePass = baseline.effectiveFps >= thresholds.minimumBaselineFps
      && baseline.medianIntervalMs <= thresholds.maximumMedianIntervalMs
      && baseline.p95IntervalMs <= thresholds.maximumP95IntervalMs
      && baseline.longFrameRatio <= thresholds.maximumLongFrameRatio;
    console.log(
      `${baselinePass ? 'PASS' : 'FAIL'} baseline: ${baseline.effectiveFps.toFixed(1)}fps, `
      + `median ${baseline.medianIntervalMs.toFixed(2)}ms, p95 ${baseline.p95IntervalMs.toFixed(2)}ms`,
    );

    const motion = await page.evaluate(() => {
      const sky = document.querySelector('.program__sky');
      if (!sky) throw new Error('The Phase 1 sky strip is missing.');
      const pseudo = getComputedStyle(sky, '::before');
      return {
        animationName: pseudo.animationName,
        animationDuration: pseudo.animationDuration,
        animationPlayState: pseudo.animationPlayState,
        documentVisibility: document.visibilityState,
        activeAnimations: document.getAnimations()
          .filter((animation) => animation.playState === 'running')
          .map((animation) => ({
            name: animation.animationName ?? animation.constructor.name,
            pseudoElement: animation.effect?.pseudoElement ?? null,
          })),
      };
    });
    if (motion.animationName !== 'program-sky-drift' || motion.animationPlayState !== 'running') {
      throw new Error(`Expected program-sky-drift to be running; received ${JSON.stringify(motion)}.`);
    }

    const trials = [];
    for (let trial = 0; trial < trialCount; trial += 1) {
      const sample = await page.evaluate(async (frames) => {
        const sky = document.querySelector('.program__sky');
        const waitFrames = (count) => new Promise((resolveWait) => {
          let remaining = count;
          const next = () => {
            remaining -= 1;
            if (remaining <= 0) resolveWait();
            else requestAnimationFrame(next);
          };
          requestAnimationFrame(next);
        });
        await waitFrames(45);
        return new Promise((resolveSample) => {
          const timestamps = [];
          const transformSamples = [];
          const next = (timestamp) => {
            timestamps.push(timestamp);
            if (timestamps.length === 1 || timestamps.length % 24 === 0) {
              transformSamples.push(getComputedStyle(sky, '::before').transform);
            }
            if (timestamps.length <= frames) requestAnimationFrame(next);
            else resolveSample({ timestamps, transformSamples });
          };
          requestAnimationFrame(next);
        });
      }, sampleFrames);
      const summary = summarize(sample.timestamps, sample.transformSamples, baseline);
      trials.push(summary);
      console.log(
        `${summary.pass ? 'PASS' : 'FAIL'} trial ${trial + 1}: `
        + `${summary.effectiveFps.toFixed(1)}fps, median ${summary.medianIntervalMs.toFixed(2)}ms, `
        + `p95 ${summary.p95IntervalMs.toFixed(2)}ms, ${summary.longFrameCount} >${thresholds.longFrameMs}ms`,
      );
    }

    const requiredPassingTrials = trialCount;
    const passingTrials = trials.filter((trial) => trial.pass).length;
    report = {
      schema: 'zodiacs.phase1-frame-cadence.v2',
      measuredAt: new Date().toISOString(),
      route: '/horoscopes/aries/',
      browser: `Chromium ${browserVersion}`,
      viewport,
      cpuThrottleRate,
      thresholds,
      baseline,
      baselinePass,
      motion,
      requiredPassingTrials,
      passingTrials,
      trials,
      pass: baselinePass && passingTrials >= requiredPassingTrials,
    };
    await context.close();
  });
} finally {
  await browser.close();
}

await writeFile(resolve(artifactRoot, 'phase1-mobile.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report?.pass) {
  throw new Error(
    `Phase 1 frame cadence failed: ${report?.passingTrials ?? 0}/${report?.requiredPassingTrials ?? 2} `
    + `required trials passed at ${cpuThrottleRate}× CPU slowdown.`,
  );
}
console.log(
  `Phase 1 frame cadence: PASS — ${report.passingTrials}/${trialCount} trials at `
  + `${cpuThrottleRate}× CPU slowdown (${viewport.width}×${viewport.height}).`,
);
