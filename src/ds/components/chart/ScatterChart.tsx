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
  useBudgetWarning,
  useDevWarning,
  useWidth,
  type ChartDatum,
} from "./shared";

/* ==========================================================================
   ScatterChart: two measures per row, one dot per row.

   Every dot is its own element, so this is the chart that hits SVG's real
   limit (≈ 5k elements). Budget: 1,000 dots. Past that the dots pile into a
   blot anyway: bin them into a heatmap/hexbin, or plot a sample.

   Groups: every pair of colors is on screen at once (unlike a line chart,
   where only neighbors touch), and only the first 3 palette slots stay
   apart for color-blind readers under that rule. A 4th group warns.

   Hover snaps to the nearest dot within 16px, so the target is a 32px
   circle, not the 8px dot. Arrow keys walk the dots left to right.
   ========================================================================== */

export interface ScatterChartProps<T extends ChartDatum> {
  /** One row per dot. Rows without a numeric x and y are skipped. */
  data: readonly T[];
  /** Numeric field for the horizontal position. */
  x: keyof T & string;
  /** Numeric field for the vertical position. */
  y: keyof T & string;
  /** Field that puts each dot in a group: one color per group, 3 at most. */
  group?: keyof T & string;
  /** Group order, so colors stay put when a filter removes a group. */
  groups?: readonly string[];
  /** Field that names a dot in the tooltip and table. */
  name?: keyof T & string;
  /** What the chart shows. Names the chart and captions its data table. */
  "aria-label": string;
  /** Axis title and table header for x. @default the `x` field name */
  xLabel?: string;
  /** Axis title and table header for y. @default the `y` field name */
  yLabel?: string;
  /** @default 280 */
  height?: number;
  /** x values in the tooltip and table (ticks stay plain numbers). */
  formatX?: (value: number) => string;
  /** y values in the tooltip and table (ticks stay plain numbers). */
  formatY?: (value: number) => string;
  /** Override the data budget (see CHART_POINT_BUDGET). */
  maxPoints?: number;
  /** Show the legend when there are 2+ groups. @default true */
  legend?: boolean;
  className?: string;
}

interface Dot {
  row: number;
  x: number;
  y: number;
  g: number;
}

const MARGIN = { top: 8, right: 12, bottom: 28 };
const DIGIT_W = 7.2;
const HIT_RADIUS = 16;
const SAFE_GROUPS = 3;

export function ScatterChart<T extends ChartDatum>({
  data,
  x,
  y,
  group,
  groups,
  name,
  xLabel,
  yLabel,
  height = 280,
  formatX = formatNumber,
  formatY = formatNumber,
  maxPoints,
  legend = true,
  className,
  ...rest
}: ScatterChartProps<T>) {
  const label = rest["aria-label"];
  const [plotRef, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = React.useState<number | null>(null);
  const [fromKeyboard, setFromKeyboard] = React.useState(false);
  const hintId = React.useId();

  // Group order: the given order first, then first appearance
  const groupNames = React.useMemo(() => {
    if (!group) return [];
    const out = [...(groups ?? [])];
    const seen = new Set(out);
    for (const d of data) {
      const g = String(d[group] ?? "");
      if (!seen.has(g)) {
        seen.add(g);
        out.push(g);
      }
    }
    return out;
  }, [data, group, groups]);

  const dots = React.useMemo(() => {
    const index = new Map(groupNames.map((g, i) => [g, i]));
    const out: Dot[] = [];
    data.forEach((d, row) => {
      const vx = toNumber(d[x]);
      const vy = toNumber(d[y]);
      if (vx == null || vy == null) return;
      out.push({ row, x: vx, y: vy, g: group ? (index.get(String(d[group] ?? "")) ?? 0) : 0 });
    });
    return out;
  }, [data, x, y, group, groupNames]);

  // Keyboard and table order: left to right
  const order = React.useMemo(
    () => dots.map((_, i) => i).sort((a, b) => dots[a].x - dots[b].x || dots[a].y - dots[b].y),
    [dots],
  );
  const rank = React.useMemo(() => {
    const r: number[] = [];
    order.forEach((dot, k) => (r[dot] = k));
    return r;
  }, [order]);

  const budget = maxPoints ?? CHART_POINT_BUDGET.scatter;
  const over = dots.length > budget;
  useBudgetWarning("ScatterChart", label, "scatter", dots.length, budget);
  useDevWarning(
    groupNames.length > SAFE_GROUPS,
    `<ScatterChart aria-label="${label}"> has ${groupNames.length} groups. With every pair of colors on screen, only the ` +
      `first ${SAFE_GROUPS} stay apart for color-blind readers: fold the rest into "Other" or split into small multiples.`,
  );

  const colors = groupNames.length ? groupNames.map((_, i) => chartColor(i)) : [chartColor(0)];
  const xName = xLabel ?? x;
  const yName = yLabel ?? y;
  const titleOf = (d: Dot) =>
    name ? String(data[d.row][name] ?? "") : group ? groupNames[d.g] : `Point ${formatNumber(d.row + 1)}`;

  // ---- scales: nice ticks on both axes, zero not forced ----
  let [xlo, xhi, ylo, yhi] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const d of dots) {
    if (d.x < xlo) xlo = d.x;
    if (d.x > xhi) xhi = d.x;
    if (d.y < ylo) ylo = d.y;
    if (d.y > yhi) yhi = d.y;
  }
  if (!dots.length) [xlo, xhi, ylo, yhi] = [0, 1, 0, 1];

  const top = yLabel ? 26 : MARGIN.top; // room for the y title
  const bottom = xLabel ? 46 : MARGIN.bottom; // and the x title
  const plotH = Math.max(40, height - top - bottom);
  const yTicks = niceTicks(ylo, yhi, Math.max(2, Math.round(plotH / 48)));
  const yText = yTicks.map(axisFormatter(yTicks));
  const left = Math.ceil(maxLength(yText) * DIGIT_W) + 12;
  const plotW = Math.max(0, width - left - MARGIN.right);
  const xTicks = niceTicks(xlo, xhi, Math.max(2, Math.round(plotW / 90)));
  const xText = xTicks.map(axisFormatter(xTicks));
  const [X0, X1] = [xTicks[0], xTicks[xTicks.length - 1]];
  const [Y0, Y1] = [yTicks[0], yTicks[yTicks.length - 1]];
  const sx = (v: number) => ((v - X0) / (X1 - X0)) * plotW;
  const sy = (v: number) => plotH - ((v - Y0) / (Y1 - Y0)) * plotH;

  const groupCount = colors.length;
  const byGroup = React.useMemo(() => {
    const out: number[][] = Array.from({ length: groupCount }, () => []);
    dots.forEach((d, i) => out[d.g]?.push(i));
    return out;
  }, [dots, groupCount]);

  // ---- reading values ----
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dots.length || !plotW) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - left;
    const py = e.clientY - rect.top - top;
    let best = -1;
    let bestD = HIT_RADIUS * HIT_RADIUS;
    for (let i = 0; i < dots.length; i++) {
      const dx = sx(dots[i].x) - px;
      const dy = sy(dots[i].y) - py;
      const dist = dx * dx + dy * dy;
      if (dist < bestD) [best, bestD] = [i, dist];
    }
    setFromKeyboard(false);
    setActive(best < 0 ? null : best);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = dots.length;
    if (!n) return;
    let next: number | null;
    if (e.key === "ArrowRight") next = order[active == null ? 0 : Math.min(n - 1, rank[active] + 1)];
    else if (e.key === "ArrowLeft") next = order[active == null ? n - 1 : Math.max(0, rank[active] - 1)];
    else if (e.key === "Home") next = order[0];
    else if (e.key === "End") next = order[n - 1];
    else if (e.key === "Escape" && active != null) next = null;
    else return;
    e.preventDefault();
    setFromKeyboard(true);
    setActive(next);
  };

  const shown = active != null && active < dots.length ? dots[active] : null;
  const readout = (d: Dot) => `${titleOf(d)}: ${xName} ${formatX(d.x)}, ${yName} ${formatY(d.y)}`;
  const tableDots = order.slice(0, budget);

  return (
    <div
      className={cx("ds-chart", className)}
      role="group"
      aria-roledescription="scatter chart"
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => fromKeyboard && setActive(null)}
      data-over-budget={over ? "" : undefined}
    >
      {legend && groupNames.length > 1 && (
        <ChartLegend shape="dot" items={groupNames.map((g, i) => ({ label: g, color: colors[i] }))} />
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
            <g transform={`translate(${left},${top})`}>
              {yLabel && (
                <text className="ds-chart-axis-title" x={-left} y={-14}>
                  {yLabel}
                </text>
              )}
              {yTicks.map((t, i) => (
                <g key={t}>
                  <line className="ds-chart-grid" x1={0} x2={plotW} y1={crisp(sy(t))} y2={crisp(sy(t))} />
                  <text className="ds-chart-tick" x={-8} y={sy(t)} textAnchor="end" dominantBaseline="middle">
                    {yText[i]}
                  </text>
                </g>
              ))}
              {xTicks.map((t, i) => (
                <g key={t}>
                  <line className="ds-chart-grid" x1={crisp(sx(t))} x2={crisp(sx(t))} y1={0} y2={plotH} />
                  <text
                    className="ds-chart-tick"
                    x={sx(t)}
                    y={plotH + 18}
                    textAnchor={i === xTicks.length - 1 ? "end" : "middle"}
                  >
                    {xText[i]}
                  </text>
                </g>
              ))}
              {xLabel && (
                <text className="ds-chart-axis-title" x={plotW} y={plotH + 38} textAnchor="end">
                  {xLabel}
                </text>
              )}
              <line className="ds-chart-baseline" x1={0} x2={plotW} y1={crisp(plotH)} y2={crisp(plotH)} />

              {byGroup.map((list, g) => (
                <g key={g} style={{ "--_c": colors[g] } as React.CSSProperties}>
                  {list.map((i) => (
                    <circle key={i} className="ds-chart-dot" cx={sx(dots[i].x)} cy={sy(dots[i].y)} r={4} />
                  ))}
                </g>
              ))}

              {shown && (
                <circle
                  className="ds-chart-dot"
                  data-active=""
                  style={{ "--_c": colors[shown.g] } as React.CSSProperties}
                  cx={sx(shown.x)}
                  cy={sy(shown.y)}
                  r={6}
                />
              )}
            </g>
          )}
        </svg>

        {shown && plotW > 0 && (
          <ChartTooltip
            align="center"
            title={titleOf(shown)}
            titleColor={group ? colors[shown.g] : undefined}
            left={left + sx(shown.x)}
            top={top + sy(shown.y)}
            flip={sx(shown.x) > plotW / 2}
            rows={[
              { label: xName, value: formatX(shown.x) },
              { label: yName, value: formatY(shown.y) },
            ]}
          />
        )}
      </div>

      <span id={hintId} className="ds-visually-hidden">
        Use the left and right arrow keys to move between points, from left to right.
      </span>
      <div className="ds-visually-hidden" aria-live="polite">
        {fromKeyboard && shown ? readout(shown) : ""}
      </div>

      <table className="ds-visually-hidden">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{name ? name : group ? "Group" : "Point"}</th>
            <th scope="col">{xName}</th>
            <th scope="col">{yName}</th>
          </tr>
        </thead>
        <tbody>
          {tableDots.map((i) => (
            <tr key={i}>
              <th scope="row">{titleOf(dots[i])}</th>
              <td>{formatX(dots[i].x)}</td>
              <td>{formatY(dots[i].y)}</td>
            </tr>
          ))}
          <TableOverflowRow hidden={dots.length - tableDots.length} columns={3} />
        </tbody>
      </table>
    </div>
  );
}
