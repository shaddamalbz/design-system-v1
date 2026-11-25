/* Chart math: no DOM, no React. Small enough to own instead of pulling in d3. */

/** Round tick values ("nice" steps of 1, 2, 2.5 or 5 × 10ⁿ) covering [min, max]. */
export function niceTicks(min: number, max: number, count: number): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1];
  if (min === max) {
    if (min === 0) max = 1;
    else {
      const pad = Math.abs(min) * 0.1;
      min -= pad;
      max += pad;
    }
  }
  const raw = (max - min) / Math.max(1, count);
  const pow = 10 ** Math.floor(Math.log10(raw));
  const f = raw / pow;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  // Enough decimals for the step (2.5 needs one more), then drop float noise and -0
  const decimals = Math.max(0, 1 - Math.floor(Math.log10(step)));
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(decimals)) || 0);
  return ticks;
}

const full = new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 });
const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

/** Full number with grouping: 1,284.5 */
export const formatNumber = (value: number) => full.format(value);

/** Compact number: 12.9K, 4.2M, 100B */
export const formatCompact = (value: number) => compact.format(value);

/** One style per axis: compact (10K, 2.5M) once the axis reaches 10,000, full below. */
export function axisFormatter(ticks: number[]): (value: number) => string {
  return ticks.some((t) => Math.abs(t) >= 10_000) ? compact.format : full.format;
}

/** A cell value as a number, or null for a gap (missing, empty, not a number). */
export function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
