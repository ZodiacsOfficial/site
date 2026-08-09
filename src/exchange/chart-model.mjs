/**
 * Pure geometry and formatting for the candlestick chart. No DOM, no canvas —
 * everything here takes plain numbers and returns plain numbers, which is
 * what makes the chart testable without a browser.
 *
 * Candles are laid out by index, not by clock time: thin pools skip empty
 * periods entirely (verified against the live data), and an hours-wide gap
 * of nothing would otherwise flatten the readable part of the chart into a
 * sliver. The axis labels still carry the real timestamps.
 */

export function priceExtent(candles) {
  let min = Infinity;
  let max = -Infinity;
  for (const candle of candles) {
    if (candle.l < min) min = candle.l;
    if (candle.h > max) max = candle.h;
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  if (min === max) {
    const pad = min === 0 ? 1 : Math.abs(min) * 0.05;
    return { min: min - pad, max: max + pad };
  }
  const pad = (max - min) * 0.08;
  return { min: Math.max(0, min - pad), max: max + pad };
}

export function volumeExtent(candles) {
  let max = 0;
  for (const candle of candles) if (candle.v > max) max = candle.v;
  return max;
}

/** Round ticks that land on 1/2/5 steps across the extent. */
export function niceTicks(min, max, count = 4) {
  if (!(max > min) || count < 1) return [];
  const rawStep = (max - min) / (count + 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  const step = (residual >= 5 ? 5 : residual >= 2 ? 2 : 1) * magnitude;
  const ticks = [];
  for (let value = Math.ceil(min / step) * step; value <= max; value += step) {
    ticks.push(value);
  }
  return ticks;
}

/**
 * X centres and body width for candles across the plot width. The gap scales
 * with the candle width and disappears when candles get one pixel wide.
 */
export function layoutCandles(count, width) {
  if (count <= 0 || width <= 0) return { step: 0, bodyWidth: 0, centers: [] };
  const step = width / count;
  const bodyWidth = Math.max(1, Math.min(step * 0.68, 13));
  const centers = [];
  for (let index = 0; index < count; index += 1) {
    centers.push(step * index + step / 2);
  }
  return { step, bodyWidth, centers };
}

export function yForPrice(price, extent, height) {
  const span = extent.max - extent.min;
  if (span <= 0) return height / 2;
  return height - ((price - extent.min) / span) * height;
}

/** Which candle index a pointer x lands on, or null outside the plot. */
export function hitTest(x, count, width) {
  if (count <= 0 || width <= 0 || x < 0 || x >= width) return null;
  const index = Math.floor((x / width) * count);
  return index >= 0 && index < count ? index : null;
}

/**
 * Indices whose timestamps deserve an axis label: first candle, then every
 * time the label text changes, thinned to at most `maxLabels`.
 */
export function timeTickIndices(candles, timeframe, maxLabels = 6) {
  if (!candles.length) return [];
  const indices = [];
  const every = Math.max(1, Math.ceil(candles.length / maxLabels));
  for (let index = 0; index < candles.length; index += every) indices.push(index);
  return indices;
}

/**
 * Prices here run from whole dollars down to fractions of a thousandth of a
 * cent, so a fixed decimal count fails at one end or the other. Four
 * significant digits, never scientific notation.
 */
export function formatPrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price)) return '—';
  if (price === 0) return '0';
  const digits = Math.max(0, 3 - Math.floor(Math.log10(Math.abs(price))));
  return price.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(digits, 12),
  });
}

export function formatUsd(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (Math.abs(amount) >= 1000) {
    return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTokenAmount(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '—';
  if (amount >= 1000) return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return amount.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Candle timestamps are unix seconds; daily frames label the date, the rest the clock. */
export function formatClock(ts, timeframe) {
  const date = new Date(ts * 1000);
  if (Number.isNaN(date.getTime())) return '—';
  if (timeframe === '1d') return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${hours}:${minutes}`;
}

/** "4m ago" for the tape; millisecond timestamps. */
export function formatAge(tsMs, nowMs) {
  const seconds = Math.max(0, Math.round((nowMs - tsMs) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
