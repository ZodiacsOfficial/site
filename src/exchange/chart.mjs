/**
 * The candlestick canvas. Geometry and formatting come from chart-model.mjs;
 * this module only draws — candles laid out by index (thin pools skip empty
 * periods), a volume strip underneath, price ticks on the right, and a
 * crosshair readout on hover. Up-candles take the sign's pastel; down-candles
 * are the muted ink outline. No other chroma.
 */

import {
  formatClock,
  formatPrice,
  hitTest,
  layoutCandles,
  niceTicks,
  priceExtent,
  timeTickIndices,
  volumeExtent,
  yForPrice,
} from './chart-model.mjs';

const AXIS_WIDTH = 74;
const TIME_AXIS_HEIGHT = 22;
const VOLUME_SHARE = 0.16;
const INK = '#EEF1F7';
const INK_DIM = '#8E96AB';
const HAIR = 'rgba(198,204,218,0.10)';
const HAIR_2 = 'rgba(198,204,218,0.22)';
const MONO = "11px 'JetBrains Mono', ui-monospace, monospace";

export function createChart({ canvas, readout }) {
  const context = canvas.getContext('2d');
  let candles = [];
  let timeframe = '1h';
  let hue = INK_DIM;
  let hover = null;

  function plotSize() {
    const rect = canvas.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  function draw() {
    const { width, height } = plotSize();
    if (width <= 0 || height <= 0) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.clearRect(0, 0, width, height);
    if (!candles.length) return;

    const plotWidth = width - AXIS_WIDTH;
    const plotHeight = height - TIME_AXIS_HEIGHT;
    const volumeHeight = Math.round(plotHeight * VOLUME_SHARE);
    const priceHeight = plotHeight - volumeHeight - 6;
    const extent = priceExtent(candles);
    if (!extent) return;
    const { bodyWidth, centers } = layoutCandles(candles.length, plotWidth);
    const maxVolume = volumeExtent(candles);

    // grid + price ticks
    context.font = MONO;
    context.textBaseline = 'middle';
    for (const tick of niceTicks(extent.min, extent.max)) {
      const y = yForPrice(tick, extent, priceHeight);
      context.strokeStyle = HAIR;
      context.beginPath();
      context.moveTo(0, y + 0.5);
      context.lineTo(plotWidth, y + 0.5);
      context.stroke();
      context.fillStyle = INK_DIM;
      context.textAlign = 'left';
      context.fillText(formatPrice(tick), plotWidth + 8, y);
    }

    // volume strip
    if (maxVolume > 0) {
      for (let index = 0; index < candles.length; index += 1) {
        const candle = candles[index];
        const barHeight = Math.max(1, (candle.v / maxVolume) * volumeHeight);
        context.fillStyle = candle.c >= candle.o ? `${hue}55` : 'rgba(142,150,171,0.30)';
        context.fillRect(
          centers[index] - bodyWidth / 2,
          plotHeight - barHeight,
          bodyWidth,
          barHeight,
        );
      }
    }

    // candles
    for (let index = 0; index < candles.length; index += 1) {
      const candle = candles[index];
      const x = centers[index];
      const up = candle.c >= candle.o;
      const color = up ? hue : INK_DIM;
      const yHigh = yForPrice(candle.h, extent, priceHeight);
      const yLow = yForPrice(candle.l, extent, priceHeight);
      const yOpen = yForPrice(candle.o, extent, priceHeight);
      const yClose = yForPrice(candle.c, extent, priceHeight);

      context.strokeStyle = color;
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(x + 0.5, yHigh);
      context.lineTo(x + 0.5, yLow);
      context.stroke();

      const top = Math.min(yOpen, yClose);
      const bodyHeight = Math.max(1, Math.abs(yClose - yOpen));
      if (up) {
        context.fillStyle = color;
        context.fillRect(x - bodyWidth / 2, top, bodyWidth, bodyHeight);
      } else {
        context.strokeRect(x - bodyWidth / 2 + 0.5, top + 0.5, bodyWidth - 1, Math.max(1, bodyHeight - 1));
      }
    }

    // time ticks
    context.fillStyle = INK_DIM;
    context.textAlign = 'center';
    for (const index of timeTickIndices(candles, timeframe)) {
      const label = formatClock(candles[index].ts, timeframe);
      const x = Math.min(Math.max(centers[index], 24), plotWidth - 24);
      context.fillText(label, x, height - TIME_AXIS_HEIGHT / 2);
    }

    // crosshair
    if (hover !== null && candles[hover]) {
      const x = centers[hover];
      context.strokeStyle = HAIR_2;
      context.setLineDash([3, 3]);
      context.beginPath();
      context.moveTo(x + 0.5, 0);
      context.lineTo(x + 0.5, plotHeight);
      context.stroke();
      context.setLineDash([]);
    }
  }

  function updateReadout() {
    if (!readout) return;
    const candle = hover !== null ? candles[hover] : candles[candles.length - 1];
    if (!candle) {
      readout.textContent = '';
      return;
    }
    readout.textContent = [
      formatClock(candle.ts, timeframe),
      `O ${formatPrice(candle.o)}`,
      `H ${formatPrice(candle.h)}`,
      `L ${formatPrice(candle.l)}`,
      `C ${formatPrice(candle.c)}`,
      `Vol $${formatPrice(candle.v)}`,
    ].join('  ');
  }

  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const next = hitTest(event.clientX - rect.left, candles.length, rect.width - AXIS_WIDTH);
    if (next === hover) return;
    hover = next;
    draw();
    updateReadout();
  }

  function onPointerLeave() {
    hover = null;
    draw();
    updateReadout();
  }

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);

  const observer = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => draw())
    : null;
  observer?.observe(canvas);

  return {
    set({ candles: nextCandles, timeframe: nextTimeframe, hue: nextHue }) {
      candles = Array.isArray(nextCandles) ? nextCandles : [];
      if (nextTimeframe) timeframe = nextTimeframe;
      if (nextHue) hue = nextHue;
      hover = null;
      draw();
      updateReadout();
    },
    clear() {
      candles = [];
      hover = null;
      draw();
      updateReadout();
    },
    destroy() {
      observer?.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);
    },
  };
}
