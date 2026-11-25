import * as React from "react";
import { cx } from "../../utils/cx";
import { axisFormatter, formatNumber, niceTicks, toNumber } from "./scale";
import {
  CHART_POINT_BUDGET,
  ChartLegend,
  ChartTooltip,
  TableOverflowRow,
  chartColor,
  crisp,
  maxLength,
  r1,
  useBudgetWarning,
  useWidth,
  type ChartDatum,
} from "./shared";

/* ==========================================================================
   Chart: LineChart and BarChart (this file), ScatterChart, DonutChart.
   All SVG.

   Why SVG and not canvas: marks are DOM, so they take colors straight from
   tokens (dark mode costs nothing), stay sharp at any zoom, and every part of
   the chart is inspectable. SVG slows down with the number of ELEMENTS
   (≈ 5k separate marks), not the number of values: a line of 100k points is
   one <path>. Canvas only wins past sizes a person can't read anyway.

   Data budget: a chart shows a pattern, not rows. An 800px plot can't show
   more than ~800 distinct x positions, and 60 bars is already a wall. Past
   the budget the chart still renders, but warns in development: aggregate
   before the data reaches it, and put rows people look up in a table.

   Accessibility: the SVG is decoration for sighted readers. The same values
   live in a visually hidden table, the chart is one tab stop, and arrow keys
   move the readout (announced politely). Color is never the only channel:
   legend + tooltip + table name every series.
   ========================================================================== */

export interface ChartSeries<T extends ChartDatum> {
  /** Field of each datum that holds this series' value. */
  key: keyof T & string;
  /** Name in the legend, tooltip and table. */
  label: string;
  /** Any CSS color. Defaults to the next --chart-N slot, in order. */
  color?: string;
}

interface BaseChartProps<T extends ChartDatum> {
  /** Already aggregated rows, in x order. One row per x position. */
  data: readonly T[];
  /** Field of each datum used for the x axis. */
  x: keyof T & string;
  series: readonly ChartSeries<T>[];
  /** What the chart shows. Names the chart and captions its data table. */
  "aria-label": string;
  /** Column header for x in the data table. @default the `x` field name */
  xLabel?: string;
  /** Height of the plot in px (legend excluded). @default 240 */
  height?: number;
  /** Format values in the tooltip and table. Axis ticks pick full or compact. */
  formatValue?: (value: number) => string;
  /** Format x values for the axis, tooltip and table. */
  formatX?: (value: unknown) => string;
  /** Override the data budget (see CHART_POINT_BUDGET). */
  maxPoints?: number;
  /** Show the legend when there are 2+ series. @default true */
  legend?: boolean;
  className?: string;
}

export interface LineChartProps<T extends ChartDatum> extends BaseChartProps<T> {
  /** Fill a 10% wash under each line; the y axis then starts at zero. */
  area?: boolean;
}

export type BarChartProps<T extends ChartDatum> = BaseChartProps<T>;

/* ---------------------------------------------------------------------------
   Shared frame: sizing, scales, grid, axes, hover, keyboard, tooltip, table.
   --------------------------------------------------------------------------- */

interface Plot {
  width: number;
  height: number;
  xAt: (i: number) => number;
  band: number;
  y: (v: number) => number;
  /** y of the zero line (or the bottom, when zero is out of the domain) */
  base: number;
  values: (number | null)[][];
  colors: string[];
  active: number | null;
}

type Kind = "line" | "bar";

type FrameProps<T extends ChartDatum> = BaseChartProps<T> & {
  kind: Kind;
  includeZero: boolean;
  renderMarks: (plot: Plot) => React.ReactNode;
};

const MARGIN = { top: 8, right: 8, bottom: 28 };
const DIGIT_W = 7.2; // tabular digit at --text-xs (≈ 0.6em)
const LABEL_W = 6.6; // average character of an x label

function CartesianChart<T extends ChartDatum>({
  data,
  x,
  series,
  xLabel,
  height = 240,
  formatValue = formatNumber,
  formatX = String,
  maxPoints,
  legend = true,
  className,
  kind,
  includeZero,
  renderMarks,
  ...rest
}: FrameProps<T>) {
  const label = rest["aria-label"];
  const n = data.length;

  // Budget: a line is judged per series (each is one path); bars by element count
  const budget = maxPoints ?? CHART_POINT_BUDGET[kind];
  const count = kind === "line" ? n : n * series.length;
  const over = count > budget;
  useBudgetWarning(kind === "line" ? "LineChart" : "BarChart", label, kind, count, budget);
  // The hidden table costs a row per x: over budget it would dwarf the SVG
  // (a 20k-point line is one <path> but 60k table elements), so it stops there.
  const tableRows = kind === "line" ? budget : Math.max(1, Math.floor(budget / Math.max(1, series.length)));

  const [plotRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const [fromKeyboard, setFromKeyboard] = React.useState(false);
  const hintId = React.useId();

  const values = React.useMemo(() => series.map((s) => data.map((d) => toNumber(d[s.key]))), [data, series]);
  const xLabels = React.useMemo(() => data.map((d) => formatX(d[x])), [data, x, formatX]);
  const colors = series.map((s, i) => s.color ?? chartColor(i));

  // ---- y scale: nice ticks over the data (and zero, for bars and areas) ----
  let lo = Infinity;
  let hi = -Infinity;
  for (const row of values)
    for (const v of row)
      if (v != null) {
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      }
  if (lo === Infinity) [lo, hi] = [0, 1];
  if (includeZero) [lo, hi] = [Math.min(0, lo), Math.max(0, hi)];

  const plotH = Math.max(40, height - MARGIN.top - MARGIN.bottom);
  const ticks = niceTicks(lo, hi, Math.max(2, Math.round(plotH / 48)));
  const tickText = ticks.map(axisFormatter(ticks));
  const [d0, d1] = [ticks[0], ticks[ticks.length - 1]];
  const y = (v: number) => plotH - ((v - d0) / (d1 - d0)) * plotH;
  const base = y(Math.min(Math.max(0, d0), d1));

  // ---- x scale: points (line, edge to edge) or bands (bar) ----
  const left = Math.ceil(maxLength(tickText) * DIGIT_W) + 12;
  const plotW = Math.max(0, width - left - MARGIN.right);
  const band = n ? plotW / n : plotW;
  const xAt = kind === "bar" ? (i: number) => (i + 0.5) * band : (i: number) => (n > 1 ? (i / (n - 1)) * plotW : plotW / 2);

  // Thin x labels so they never collide: try every k-th, anchor the edges,
  // skip one that would still touch the previous (the last, pushed left).
  const labelW = maxLength(xLabels) * LABEL_W + 16;
  const spacing = kind === "bar" ? band : n > 1 ? plotW / (n - 1) : plotW;
  const every = spacing > 0 ? Math.max(1, Math.ceil(labelW / spacing)) : 1;
  const xTicks: { i: number; x: number; anchor: "start" | "middle" | "end" }[] = [];
  let lastRight = -Infinity;
  for (let i = 0; i < n; i += every) {
    const px = xAt(i);
    const w = xLabels[i].length * LABEL_W;
    const anchor = px < w / 2 ? "start" : px > plotW - w / 2 ? "end" : "middle";
    const x0 = anchor === "start" ? px : anchor === "end" ? px - w : px - w / 2;
    if (x0 < lastRight + 8) continue;
    xTicks.push({ i, x: px, anchor });
    lastRight = x0 + w;
  }

  // ---- reading values: pointer, keyboard ----
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!n || !plotW) return;
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left - left;
    const i = kind === "bar" ? Math.floor(px / band) : Math.round(n > 1 ? (px / plotW) * (n - 1) : 0);
    setFromKeyboard(false);
    setActive(Math.min(n - 1, Math.max(0, i)));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!n) return;
    let next: number | null;
    if (e.key === "ArrowRight") next = active == null ? 0 : Math.min(n - 1, active + 1);
    else if (e.key === "ArrowLeft") next = active == null ? n - 1 : Math.max(0, active - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape" && active != null) next = null;
    else return;
    e.preventDefault();
    setFromKeyboard(true);
    setActive(next);
  };

  const readout = (i: number) =>
    `${xLabels[i]}: ` +
    series.map((s, k) => `${s.label} ${values[k][i] == null ? "no data" : formatValue(values[k][i]!)}`).join(", ");

  const shown = active != null && active < n ? active : null;

  return (
    <div
      className={cx("ds-chart", className)}
      role="group"
      aria-roledescription="chart"
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => fromKeyboard && setActive(null)}
      data-over-budget={over ? "" : undefined}
    >
      {legend && series.length > 1 && (
        <ChartLegend
          shape={kind === "bar" ? "box" : "line"}
          items={series.map((s, k) => ({ label: s.label, color: colors[k] }))}
        />
      )}

      <div ref={plotRef} className="ds-chart-plot" style={{ height }}>
        <svg
          className="ds-chart-svg"
          width="100%"
          height={height}
          aria-hidden="true"
          onPointerMove={onPointerMove}
          onPointerLeave={() => !fromKeyboard && setActive(null)}
        >
          {plotW > 0 && (
            <g transform={`translate(${left},${MARGIN.top})`}>
              {ticks.map((t, i) => (
                <g key={t}>
                  <line className="ds-chart-grid" x1={0} x2={plotW} y1={crisp(y(t))} y2={crisp(y(t))} />
                  <text className="ds-chart-tick" x={-8} y={y(t)} textAnchor="end" dominantBaseline="middle">
                    {tickText[i]}
                  </text>
                </g>
              ))}

              {shown != null && kind === "bar" && (
                <rect className="ds-chart-band" x={shown * band} y={0} width={band} height={plotH} rx={4} />
              )}
              {shown != null && kind === "line" && (
                <line
                  className="ds-chart-crosshair"
                  x1={crisp(xAt(shown))}
                  x2={crisp(xAt(shown))}
                  y1={0}
                  y2={plotH}
                />
              )}

              {renderMarks({ width: plotW, height: plotH, xAt, band, y, base, values, colors, active: shown })}

              <line className="ds-chart-baseline" x1={0} x2={plotW} y1={crisp(base)} y2={crisp(base)} />

              {xTicks.map((t) => (
                <text key={t.i} className="ds-chart-tick" x={t.x} y={plotH + 18} textAnchor={t.anchor}>
                  {xLabels[t.i]}
                </text>
              ))}
            </g>
          )}
        </svg>

        {shown != null && plotW > 0 && (
          <ChartTooltip
            title={xLabels[shown]}
            left={left + xAt(shown)}
            top={MARGIN.top}
            flip={xAt(shown) > plotW / 2}
            rows={series.map((s, k) => ({
              label: s.label,
              value: values[k][shown] == null ? "–" : formatValue(values[k][shown]!),
              color: colors[k],
            }))}
          />
        )}
      </div>

      <span id={hintId} className="ds-visually-hidden">
        Use the left and right arrow keys to read values.
      </span>
      <div className="ds-visually-hidden" aria-live="polite">
        {fromKeyboard && shown != null ? readout(shown) : ""}
      </div>

      <table className="ds-visually-hidden">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{xLabel ?? x}</th>
            {series.map((s) => (
              <th key={s.key} scope="col">
                {s.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {xLabels.slice(0, tableRows).map((l, i) => (
            <tr key={i}>
              <th scope="row">{l}</th>
              {values.map((row, k) => (
                <td key={k}>{row[i] == null ? "–" : formatValue(row[i]!)}</td>
              ))}
            </tr>
          ))}
          <TableOverflowRow hidden={n - tableRows} columns={series.length + 1} />
        </tbody>
      </table>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   Line
   --------------------------------------------------------------------------- */

/** Runs of consecutive non-null values; a null breaks the line. */
function segments(values: (number | null)[]) {
  const out: [number, number][][] = [];
  let run: [number, number][] = [];
  values.forEach((v, i) => {
    if (v == null) {
      if (run.length) out.push(run);
      run = [];
    } else run.push([i, v]);
  });
  if (run.length) out.push(run);
  return out;
}

function LineMarks({ plot, area }: { plot: Plot; area: boolean }) {
  const { xAt, y, base, values, colors, active } = plot;
  const paths = values.map((row) => {
    const segs = segments(row);
    const pts = segs.map((seg) => seg.map(([i, v]) => `${r1(xAt(i))},${r1(y(v))}`));
    return {
      segs,
      line: pts.map((p) => "M" + p.join("L")).join(""),
      fill: area
        ? segs
            .map((seg, k) => {
              const [first, last] = [seg[0][0], seg[seg.length - 1][0]];
              return `M${pts[k].join("L")}L${r1(xAt(last))},${r1(base)}L${r1(xAt(first))},${r1(base)}Z`;
            })
            .join("")
        : "",
    };
  });
  const color = (k: number) => ({ "--_c": colors[k] }) as React.CSSProperties;

  // Three passes so no wash covers another series' line, and dots sit on top
  return (
    <>
      {area && paths.map((p, k) => <path key={k} className="ds-chart-area" style={color(k)} d={p.fill} />)}
      {paths.map((p, k) => (
        <g key={k} style={color(k)}>
          <path className="ds-chart-line" d={p.line} />
          {/* A value with gaps on both sides has no line: give it a dot */}
          {p.segs
            .filter((seg) => seg.length === 1)
            .map(([[i, v]]) => (
              <circle key={i} className="ds-chart-point" cx={xAt(i)} cy={y(v)} r={2} />
            ))}
        </g>
      ))}
      {active != null &&
        values.map((row, k) =>
          row[active] == null ? null : (
            <circle key={k} className="ds-chart-dot" style={color(k)} cx={xAt(active)} cy={y(row[active]!)} r={4} />
          ),
        )}
    </>
  );
}

export function LineChart<T extends ChartDatum>({ area = false, ...props }: LineChartProps<T>) {
  return (
    <CartesianChart
      {...props}
      kind="line"
      includeZero={area}
      renderMarks={(plot) => <LineMarks plot={plot} area={area} />}
    />
  );
}

/* ---------------------------------------------------------------------------
   Bar: grouped columns, ≤ 24px thick, 4px rounded data end, square at the
   baseline, 2px gap between neighbors.
   --------------------------------------------------------------------------- */

const BAR_MAX = 24;
const BAR_GAP = 2;
const BAR_RADIUS = 4;

function barPath(x: number, w: number, base: number, top: number) {
  const h = Math.abs(base - top);
  if (h < 0.5) return "";
  const r = Math.min(BAR_RADIUS, w / 2, h);
  // Positive bars round their top corners, negative bars their bottom ones
  const up = top < base;
  const edge = up ? top + r : top - r;
  const sweep = up ? 1 : 0;
  return (
    `M${r1(x)},${r1(base)}V${r1(edge)}` +
    `A${r},${r} 0 0 ${sweep} ${r1(x + r)},${r1(top)}` +
    `H${r1(x + w - r)}` +
    `A${r},${r} 0 0 ${sweep} ${r1(x + w)},${r1(edge)}` +
    `V${r1(base)}Z`
  );
}

function BarMarks({ plot }: { plot: Plot }) {
  const { xAt, band, y, base, values, colors } = plot;
  const k = values.length;
  const w = Math.max(1, Math.min(BAR_MAX, (band * 0.72 - BAR_GAP * (k - 1)) / k));
  const group = k * w + BAR_GAP * (k - 1);
  return (
    <>
      {values.map((row, s) => (
        <path
          key={s}
          className="ds-chart-bar"
          style={{ "--_c": colors[s] } as React.CSSProperties}
          d={row
            .map((v, i) => (v == null ? "" : barPath(xAt(i) - group / 2 + s * (w + BAR_GAP), w, base, y(v))))
            .join("")}
        />
      ))}
    </>
  );
}

export function BarChart<T extends ChartDatum>(props: BarChartProps<T>) {
  return <CartesianChart {...props} kind="bar" includeZero renderMarks={(plot) => <BarMarks plot={plot} />} />;
}
