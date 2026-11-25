import * as React from "react";
import { formatNumber } from "./scale";

/* Pieces every chart shares: types, the data budget, series colors,
   container sizing and the tooltip. */

export type ChartDatum = Record<string, unknown>;

/** Marks per chart before it warns in development (see the Chart docs). */
export const CHART_POINT_BUDGET = {
  /** points per series: each series is one <path> */
  line: 1000,
  /** bars in total */
  bar: 60,
  /** dots in total: every dot is its own element */
  scatter: 1000,
  /** slices: past 5, angles stop being comparable */
  donut: 5,
} as const;

export type ChartKind = keyof typeof CHART_POINT_BUDGET;

const ADVICE: Record<ChartKind, string> = {
  line: "bucket by time or to about one point per 4px, and keep min/max or the peak beside the average",
  bar: 'sort, keep the top N and fold the rest into "Other"',
  scatter: "bin the points into a heatmap or hexbin, or plot a representative sample",
  donut: 'keep the largest slices and fold the rest into "Other", or compare them in a bar chart',
};

/** Development-only nudge, once per chart: aggregate, don't plot raw rows. */
export function useBudgetWarning(component: string, label: string, kind: ChartKind, count: number, budget: number) {
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (!import.meta.env.DEV || warned.current || count <= budget) return;
    warned.current = true;
    console.warn(
      `[ds] <${component} aria-label="${label}"> draws ${formatNumber(count)} marks; the budget is ${formatNumber(budget)}.\n` +
        `A chart shows a pattern, not rows: aggregate before the data reaches the chart (${ADVICE[kind]}). ` +
        "Rows people need to look up belong in a table.",
    );
  }, [component, label, kind, count, budget]);
}

/** Development-only warning for misuse that isn't about size. */
export function useDevWarning(when: boolean, message: string) {
  const warned = React.useRef(false);
  React.useEffect(() => {
    if (!import.meta.env.DEV || warned.current || !when) return;
    warned.current = true;
    console.warn(`[ds] ${message}`);
  }, [when, message]);
}

const PALETTE_SIZE = 8;
/** Fixed-order categorical color for series `index`; past 8 it's "Other" gray. */
export const chartColor = (index: number) =>
  index < PALETTE_SIZE ? `var(--chart-${index + 1})` : "var(--chart-other)";

export function useWidth<E extends HTMLElement>() {
  const ref = React.useRef<E>(null);
  const [width, setWidth] = React.useState(0);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/** 1px lines on the pixel grid */
export const crisp = (v: number) => Math.round(v) + 0.5;
/** Path coordinates to 0.1px: smaller markup, same picture */
export const r1 = (v: number) => Math.round(v * 10) / 10;

export function maxLength(list: string[]) {
  let max = 0;
  for (const s of list) if (s.length > max) max = s.length;
  return max;
}

export type KeyShape = "line" | "box" | "dot";

export interface TooltipRow {
  label: string;
  value: string;
  /** Series color; rows without one get no key */
  color?: string;
  shape?: KeyShape;
}

/** Values lead, labels follow. Positioned by the chart, hidden from AT
 *  (the live region and the table carry the same values). */
export function ChartTooltip({
  title,
  titleColor,
  rows,
  left,
  top,
  flip,
  align = "top",
}: {
  title: string;
  titleColor?: string;
  rows: TooltipRow[];
  left: number;
  top: number;
  flip: boolean;
  /** "top": hangs from `top` (crosshair). "center": centered on `top` (a point). */
  align?: "top" | "center";
}) {
  return (
    <div
      className="ds-chart-tooltip"
      data-flip={flip ? "" : undefined}
      data-align={align}
      style={{ left, top }}
      aria-hidden="true"
    >
      <div className="ds-chart-tooltip-title" style={titleColor ? ({ "--_c": titleColor } as React.CSSProperties) : undefined}>
        {titleColor && <span className="ds-chart-key" data-shape="dot" />}
        {title}
      </div>
      {rows.map((row) => (
        <div
          key={row.label}
          className="ds-chart-tooltip-row"
          style={row.color ? ({ "--_c": row.color } as React.CSSProperties) : undefined}
        >
          {row.color && <span className="ds-chart-key" data-shape={row.shape ?? "line"} />}
          <span className="ds-chart-tooltip-label">{row.label}</span>
          <span className="ds-chart-tooltip-value">{row.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Legend for 2+ series or groups. Text in text tokens; identity from the key. */
export function ChartLegend({ items, shape }: { items: { label: string; color: string }[]; shape: KeyShape }) {
  return (
    <ul className="ds-chart-legend" aria-hidden="true">
      {items.map((item) => (
        <li key={item.label} style={{ "--_c": item.color } as React.CSSProperties}>
          <span className="ds-chart-key" data-shape={shape} />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

/** Rows past the budget aren't listed: the table costs a row per mark. */
export function TableOverflowRow({ hidden, columns }: { hidden: number; columns: number }) {
  if (hidden <= 0) return null;
  return (
    <tr>
      <td colSpan={columns}>
        {formatNumber(hidden)} more rows not listed: this chart has more data than it can present.
      </td>
    </tr>
  );
}
