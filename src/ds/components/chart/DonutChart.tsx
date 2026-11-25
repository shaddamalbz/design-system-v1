import * as React from "react";
import { cx } from "../../utils/cx";
import { formatCompact, formatNumber, toNumber } from "./scale";
import {
  CHART_POINT_BUDGET,
  ChartTooltip,
  chartColor,
  r1,
  useBudgetWarning,
  useDevWarning,
  type ChartDatum,
} from "./shared";

/* ==========================================================================
   DonutChart (and its pie variant): shares of one whole.

   Pie and donut encode the same thing (angle / arc length); they're one
   component. The donut is the default: its hole holds the total, and the
   hovered slice's share replaces it, so the reading sits where the eye is.

   Budget: 5 slices. Angles are hard to compare; past five they're hopeless.
   Sort largest first and fold the tail into "Other" before the chart, or
   compare the values in a bar chart. Only positive values: a part-to-whole
   chart can't show a negative part.

   Slices are separated by a 2px gap in the surface color, never an outline.
   Slices and legend rows are both hover targets; arrow keys walk the slices.
   ========================================================================== */

export interface DonutChartProps<T extends ChartDatum> {
  /** One row per slice, already sorted (largest first reads best). */
  data: readonly T[];
  /** Field that names each slice. */
  category: keyof T & string;
  /** Numeric field for each slice's size. Zero and negative values are skipped. */
  value: keyof T & string;
  /** What the chart shows. Names the chart and captions its data table. */
  "aria-label": string;
  /** "donut" frees the center for the total; "pie" fills it. @default "donut" */
  variant?: "donut" | "pie";
  /** Diameter in px. @default 200 */
  size?: number;
  /** Words under the total in the center (donut only). @default "Total" */
  centerLabel?: string;
  /** Format values in the center, tooltip and table. */
  formatValue?: (value: number) => string;
  /** Short form for the center when the full one doesn't fit (it never gets an
   *  ellipsis). Pass a compact version of `formatValue` when that adds a unit.
   *  @default 12.9K / 4.2M / 100B */
  formatCompact?: (value: number) => string;
  /** Override the data budget (see CHART_POINT_BUDGET). */
  maxSlices?: number;
  /** Show the legend with each slice's share. @default true */
  legend?: boolean;
  className?: string;
}

interface Slice {
  name: string;
  value: number;
  a0: number;
  a1: number;
  color: string;
}

const TAU = Math.PI * 2;
const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 });

/** Annular sector from angle a0 to a1 (0 = 12 o'clock, clockwise). r = 0 → pie wedge. */
function arcPath(c: number, R: number, r: number, a0: number, a1: number) {
  if (a1 - a0 >= TAU - 1e-6) {
    // A full circle can't be one arc: two halves (and the hole, cut by evenodd)
    const ring = (rad: number) => `M${c},${c - rad}A${rad},${rad} 0 1 1 ${c},${c + rad}A${rad},${rad} 0 1 1 ${c},${c - rad}Z`;
    return ring(R) + (r > 0 ? ring(r) : "");
  }
  const at = (rad: number, a: number) => `${r1(c + rad * Math.sin(a))},${r1(c - rad * Math.cos(a))}`;
  const large = a1 - a0 > Math.PI ? 1 : 0;
  if (r === 0) return `M${c},${c}L${at(R, a0)}A${R},${R} 0 ${large} 1 ${at(R, a1)}Z`;
  return `M${at(R, a0)}A${R},${R} 0 ${large} 1 ${at(R, a1)}L${at(r, a1)}A${r},${r} 0 ${large} 0 ${at(r, a0)}Z`;
}

let measureCtx: CanvasRenderingContext2D | null = null;
function textWidth(text: string, el: Element) {
  measureCtx ??= document.createElement("canvas").getContext("2d");
  if (!measureCtx) return 0;
  // Not `cs.font`: the shorthand comes back empty whenever a longhand it can't
  // express is set (font-variant-numeric, …), and canvas then measures 10px text.
  const cs = getComputedStyle(el);
  measureCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  const spacing = (parseFloat(cs.letterSpacing) || 0) * text.length;
  return measureCtx.measureText(text).width + spacing;
}

/** A number never gets an ellipsis ("100,000…" reads as a hundred thousand).
 *  If the full form is wider than `room`, show the compact form instead; the
 *  full one stays in the tooltip and the table. */
function FitNumber({ full, compact, room, className }: { full: string; compact: string; room: number; className: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const [fits, setFits] = React.useState(true);
  React.useLayoutEffect(() => {
    // 4% slack: canvas ignores tabular-nums, whose digits run a bit wider
    if (ref.current) setFits(textWidth(full, ref.current) * 1.04 <= room);
  }, [full, room]);
  return (
    <span ref={ref} className={className} data-number="">
      {fits ? full : compact}
    </span>
  );
}

export function DonutChart<T extends ChartDatum>({
  data,
  category,
  value,
  variant = "donut",
  size = 200,
  centerLabel = "Total",
  formatValue = formatNumber,
  formatCompact: compactValue = formatCompact,
  maxSlices,
  legend = true,
  className,
  ...rest
}: DonutChartProps<T>) {
  const label = rest["aria-label"];
  const [active, setActive] = React.useState<number | null>(null);
  const [fromKeyboard, setFromKeyboard] = React.useState(false);
  const hintId = React.useId();

  const { slices, total, negative } = React.useMemo(() => {
    let sum = 0;
    let neg = false;
    const parts: { name: string; value: number }[] = [];
    for (const d of data) {
      const v = toNumber(d[value]);
      if (v != null && v < 0) neg = true;
      if (v == null || v <= 0) continue;
      parts.push({ name: String(d[category] ?? ""), value: v });
      sum += v;
    }
    let a = 0;
    const out: Slice[] = parts.map((p, i) => {
      const a0 = a;
      a += (p.value / sum) * TAU;
      return { ...p, a0, a1: a, color: chartColor(i) };
    });
    return { slices: out, total: sum, negative: neg };
  }, [data, category, value]);

  useBudgetWarning("DonutChart", label, "donut", slices.length, maxSlices ?? CHART_POINT_BUDGET.donut);
  useDevWarning(
    negative,
    `<DonutChart aria-label="${label}"> got negative values. A part-to-whole chart can't show them, so they were ` +
      "left out: use a bar chart.",
  );

  const share = (v: number) => percent.format(total ? v / total : 0);
  const n = slices.length;
  const c = size / 2;
  const R = c - 1;
  const r = variant === "pie" ? 0 : Math.round(R * 0.64);
  const room = r * 1.6; // widest line that stays inside the hole
  const shown = active != null && active < n ? slices[active] : null;

  const point = (i: number | null) => {
    setFromKeyboard(false);
    setActive(i);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!n) return;
    let next: number | null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active == null ? 0 : Math.min(n - 1, active + 1);
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active == null ? n - 1 : Math.max(0, active - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else if (e.key === "Escape" && active != null) next = null;
    else return;
    e.preventDefault();
    setFromKeyboard(true);
    setActive(next);
  };

  // Pie has no center, so the reading goes in a tooltip at the slice
  const mid = shown ? (shown.a0 + shown.a1) / 2 : 0;
  const tipX = c + R * 0.6 * Math.sin(mid);
  const tipY = c - R * 0.6 * Math.cos(mid);

  return (
    <div
      className={cx("ds-chart", "ds-chart-donut", className)}
      role="group"
      aria-roledescription={variant === "pie" ? "pie chart" : "donut chart"}
      aria-label={label}
      aria-describedby={hintId}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onBlur={() => fromKeyboard && setActive(null)}
      data-active={shown ? "" : undefined}
      data-over-budget={n > (maxSlices ?? CHART_POINT_BUDGET.donut) ? "" : undefined}
    >
      <div className="ds-chart-donut-figure" style={{ width: size, height: size }}>
        <svg
          className="ds-chart-svg"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          aria-hidden="true"
          onPointerLeave={() => !fromKeyboard && setActive(null)}
        >
          {slices.map((s, i) => (
            <path
              key={i}
              className="ds-chart-slice"
              data-active={active === i ? "" : undefined}
              style={{ "--_c": s.color } as React.CSSProperties}
              d={arcPath(c, R, r, s.a0, s.a1)}
              onPointerEnter={() => point(i)}
            />
          ))}
          {!n && <circle className="ds-chart-empty" cx={c} cy={c} r={R - 0.5} />}
        </svg>

        {variant === "donut" && (
          <div className="ds-chart-center" aria-hidden="true" style={{ width: room }}>
            {shown ? (
              <span className="ds-chart-center-value" data-number="">
                {share(shown.value)}
              </span>
            ) : (
              <FitNumber
                className="ds-chart-center-value"
                full={formatValue(total)}
                compact={compactValue(total)}
                room={room}
              />
            )}
            <span className="ds-chart-center-label">{shown ? shown.name : centerLabel}</span>
            {shown && (
              <FitNumber
                className="ds-chart-center-sub"
                full={formatValue(shown.value)}
                compact={compactValue(shown.value)}
                room={room}
              />
            )}
          </div>
        )}

        {variant === "pie" && shown && (
          <ChartTooltip
            align="center"
            title={shown.name}
            titleColor={shown.color}
            left={tipX}
            top={tipY}
            flip={tipX > c}
            rows={[
              { label: "Value", value: formatValue(shown.value) },
              { label: "Share", value: share(shown.value) },
            ]}
          />
        )}
      </div>

      {legend && n > 0 && (
        <ul className="ds-chart-legend ds-chart-donut-legend" aria-hidden="true">
          {slices.map((s, i) => (
            <li
              key={i}
              data-active={active === i ? "" : undefined}
              style={{ "--_c": s.color } as React.CSSProperties}
              onPointerEnter={() => point(i)}
              onPointerLeave={() => !fromKeyboard && setActive(null)}
            >
              <span className="ds-chart-key" data-shape="box" />
              <span className="ds-chart-donut-name">{s.name}</span>
              <span className="ds-chart-donut-share">{share(s.value)}</span>
            </li>
          ))}
        </ul>
      )}

      <span id={hintId} className="ds-visually-hidden">
        Use the arrow keys to move between slices.
      </span>
      <div className="ds-visually-hidden" aria-live="polite">
        {fromKeyboard && shown ? `${shown.name}: ${formatValue(shown.value)}, ${share(shown.value)}` : ""}
      </div>

      <table className="ds-visually-hidden">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">{category}</th>
            <th scope="col">{value}</th>
            <th scope="col">Share</th>
          </tr>
        </thead>
        <tbody>
          {slices.map((s, i) => (
            <tr key={i}>
              <th scope="row">{s.name}</th>
              <td>{formatValue(s.value)}</td>
              <td>{share(s.value)}</td>
            </tr>
          ))}
          <tr>
            <th scope="row">{centerLabel}</th>
            <td>{formatValue(total)}</td>
            <td>{percent.format(total ? 1 : 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
