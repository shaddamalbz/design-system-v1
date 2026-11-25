import { useMemo, useState } from "react";
import {
  AlertCircleIcon,
  BarChart,
  CHART_POINT_BUDGET,
  DonutChart,
  LineChart,
  ScatterChart,
  type ChartSeries,
} from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch } from "../ui";

type Kind = "line" | "bar" | "scatter" | "donut";
type Row = { month: string; revenue: number | null; costs: number | null; refunds: number | null };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const ROWS: Row[] = MONTHS.map((month, i) => ({
  month,
  revenue: Math.round(42_000 + i * 3_100 + Math.sin(i * 1.3) * 6_000),
  costs: Math.round(30_000 + i * 1_400 + Math.cos(i * 0.9) * 4_000),
  refunds: Math.round(4_000 + Math.sin(i * 2.1) * 1_800 + i * 150),
}));
const GAPS = new Set([4, 9]); // months with no data, to show how a line breaks

const SERIES: ChartSeries<Row>[] = [
  { key: "revenue", label: "Revenue" },
  { key: "costs", label: "Costs" },
  { key: "refunds", label: "Refunds" },
];

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const formatUsd = (v: number) => usd.format(v);

function seeded(seed: number) {
  return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* ---- Scatter: deal size vs. days to close, by sales channel ---- */

const CHANNELS = ["Self-serve", "Sales-led", "Partner"];
type Deal = { deal: string; channel: string; size: number; days: number };
const DEALS: Deal[] = (() => {
  const rand = seeded(11);
  const shape = [
    { size: [2_000, 20_000], days: 4, perK: 0.9 },
    { size: [20_000, 120_000], days: 22, perK: 0.7 },
    { size: [10_000, 70_000], days: 16, perK: 0.75 },
  ];
  const out: Deal[] = [];
  CHANNELS.forEach((channel, g) => {
    const s = shape[g];
    for (let i = 0; i < 40; i++) {
      const size = Math.round((s.size[0] + rand() * (s.size[1] - s.size[0])) / 100) * 100;
      const days = Math.max(1, Math.round(s.days + (size / 1000) * s.perK + (rand() - 0.5) * 24));
      out.push({ deal: `Deal ${out.length + 1001}`, channel, size, days });
    }
  });
  return out;
})();

/* ---- Donut: visits by source, sorted, tail folded into "Other" ---- */

type Source = { source: string; visits: number };
const SOURCES: Source[] = [
  { source: "Organic search", visits: 48_200 },
  { source: "Direct", visits: 29_100 },
  { source: "Referral", visits: 16_400 },
  { source: "Social", visits: 11_200 },
  { source: "Email", visits: 7_600 },
  { source: "Paid search", visits: 5_400 },
  { source: "Other", visits: 3_000 },
];

/** Keep the largest `keep - 1` and sum the rest into "Other". */
function foldTail(rows: Source[], keep: number): Source[] {
  if (rows.length <= keep) return rows;
  const head = rows.slice(0, keep - 1);
  const rest = rows.slice(keep - 1).reduce((sum, r) => sum + r.visits, 0);
  return [...head, { source: "Other", visits: rest }];
}

/* ---- Data budget demo: a long noisy signal, raw vs aggregated ---- */

function signal(n: number) {
  let seed = 7;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const out: number[] = [];
  let drift = 0;
  for (let i = 0; i < n; i++) {
    drift = drift * 0.995 + (rand() - 0.5) * 6;
    const daily = 80 * Math.sin((i / n) * Math.PI * 4);
    const noise = (rand() - 0.5) * 60;
    // rare spikes: the thing an average alone would hide
    const spike = rand() < 0.001 ? 200 + rand() * 150 : 0;
    out.push(Math.round(320 + daily + drift + noise + spike));
  }
  return out;
}

/** Split rows into `buckets` equal runs; keep the mean and the peak of each. */
function aggregate(values: number[], buckets: number) {
  const size = Math.max(1, Math.ceil(values.length / buckets));
  const out: { x: number; mean: number; peak: number }[] = [];
  for (let start = 0; start < values.length; start += size) {
    const run = values.slice(start, start + size);
    out.push({ x: start, mean: Math.round(run.reduce((a, b) => a + b, 0) / run.length), peak: Math.max(...run) });
  }
  return out;
}

const SIZES = ["300", "1000", "5000", "20000"] as const;
type Size = (typeof SIZES)[number];

export function ChartPage() {
  const [kind, setKind] = useState<Kind>("line");
  const [count, setCount] = useState("2");
  const [area, setArea] = useState(false);
  const [gaps, setGaps] = useState(false);
  const [height, setHeight] = useState(240);
  const [groupCount, setGroupCount] = useState("3");
  const [variant, setVariant] = useState<"donut" | "pie">("donut");
  const [slices, setSlices] = useState("5");
  const [huge, setHuge] = useState(false);

  const series = SERIES.slice(0, Number(count));
  const deals = useMemo(() => DEALS.filter((d) => CHANNELS.indexOf(d.channel) < Number(groupCount)), [groupCount]);
  const sources = useMemo(
    () => foldTail(SOURCES, Number(slices)).map((s) => (huge ? { ...s, visits: s.visits * 1_000_000 } : s)),
    [slices, huge],
  );
  const data = useMemo(
    () => (gaps ? ROWS.map((r, i) => (GAPS.has(i) ? { ...r, revenue: null, costs: null, refunds: null } : r)) : ROWS),
    [gaps],
  );

  const common = {
    "aria-label": "Revenue by month, 2026",
    xLabel: "Month",
    data,
    x: "month" as const,
    series,
    height,
    formatValue: formatUsd,
  };
  const attrs = [
    kind === "line" && area && "area",
    height !== 240 && `height={${height}}`,
    "formatValue={formatUsd}",
  ].filter(Boolean);
  const code =
    kind === "scatter"
      ? `<ScatterChart
  aria-label="Deal size vs. days to close"
  data={deals}
  x="size"
  y="days"
  group="channel"
  groups={["Self-serve", "Sales-led", "Partner"]} // colors stay put when one is filtered out
  name="deal"
  xLabel="Deal size"
  yLabel="Days to close"
  formatX={formatUsd}
  formatY={(v) => \`\${v} days\`}${height !== 240 ? `\n  height={${height}}` : ""}
/>`
      : kind === "donut"
        ? `<DonutChart
  aria-label="Visits by source, last 30 days"
  data={sources} // sorted, tail folded into "Other"
  category="source"
  value="visits"${variant === "pie" ? `\n  variant="pie"` : `\n  centerLabel="Visits"`}
/>`
        : `<${kind === "line" ? "LineChart" : "BarChart"}
  aria-label="Revenue by month, 2026"
  data={rows}  // already one row per month
  x="month"
  series={[
${series.map((s) => `    { key: "${s.key}", label: "${s.label}" },`).join("\n")}
  ]}${attrs.map((a) => `\n  ${a}`).join("")}
/>`;

  const note =
    kind === "scatter" ? (
      <>
        Hover near a dot: it snaps to the closest one within 16px, so you never aim at the 8px dot itself. With the
        keyboard, <Kbd>←</Kbd> <Kbd>→</Kbd> walk the dots from left to right. Filter channels: the remaining ones keep
        their colors, because <code>groups</code> fixes the order.
      </>
    ) : kind === "donut" ? (
      <>
        Hover a slice or a legend row: the {variant === "pie" ? "tooltip" : "center"} shows its share and the other
        slices recede. Try 7 slices: that's the raw data, over the budget of {CHART_POINT_BUDGET.donut}, and the console
        says so. 3 and 5 fold the tail into "Other" before the chart. Turn on <em>Huge values</em>: a number that
        doesn't fit the hole switches to its compact form instead of being cut off.
      </>
    ) : (
      <>
        Hover the plot, or <Kbd>Tab</Kbd> to it and use <Kbd>←</Kbd> <Kbd>→</Kbd>: the readout lists every series at
        that month. Switch the theme: the series colors are <code>--chart-1…8</code>, stepped separately for dark.
      </>
    );

  return (
    <>
      <PageHeader eyebrow="Components" title="Chart">
        <p>
          Line, bar, scatter and donut charts drawn as SVG and colored by tokens, so dark mode and forced colors come
          free. Built for data that has already been aggregated: a chart shows a pattern, not rows.
        </p>
        <Concepts ids={["design-tokens", "non-text-contrast", "hit-area", "forced-colors"]} />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage pg-chart-stage">
          <div className="pg-chart-card">
            {kind === "line" && <LineChart {...common} area={area} />}
            {kind === "bar" && <BarChart {...common} />}
            {kind === "scatter" && (
              <ScatterChart
                aria-label="Deal size vs. days to close"
                data={deals}
                x="size"
                y="days"
                group="channel"
                groups={CHANNELS}
                name="deal"
                xLabel="Deal size"
                yLabel="Days to close"
                height={height}
                formatX={formatUsd}
                formatY={(v) => `${v} days`}
              />
            )}
            {kind === "donut" && (
              <DonutChart
                aria-label="Visits by source, last 30 days"
                data={sources}
                category="source"
                value="visits"
                variant={variant}
                centerLabel="Visits"
              />
            )}
          </div>
        </div>
        <p className="pg-muted pg-note">{note}</p>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<Kind>
            label="Type"
            value={kind}
            onChange={setKind}
            options={[
              { value: "line", label: "Line" },
              { value: "bar", label: "Bar" },
              { value: "scatter", label: "Scatter" },
              { value: "donut", label: "Donut" },
            ]}
          />
          {(kind === "line" || kind === "bar") && (
            <Segmented
              label="Series"
              value={count}
              onChange={setCount}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
          )}
          {kind === "scatter" && (
            <Segmented
              label="Channels"
              value={groupCount}
              onChange={setGroupCount}
              options={[
                { value: "1", label: "1" },
                { value: "2", label: "2" },
                { value: "3", label: "3" },
              ]}
            />
          )}
          {kind === "donut" ? (
            <>
              <Segmented<"donut" | "pie">
                label="Variant"
                value={variant}
                onChange={setVariant}
                options={[
                  { value: "donut", label: "Donut" },
                  { value: "pie", label: "Pie" },
                ]}
              />
              <Segmented
                label="Slices"
                value={slices}
                onChange={setSlices}
                options={[
                  { value: "3", label: "3" },
                  { value: "5", label: "5" },
                  { value: "7", label: "7 (raw)" },
                ]}
              />
              <Switch label="Huge values" description="Visits × 1,000,000" checked={huge} onChange={setHuge} />
            </>
          ) : (
            <Range label="Height" value={height} min={160} max={400} step={20} unit="px" onChange={setHeight} />
          )}
          {kind === "line" && <Switch label="Area wash" checked={area} onChange={setArea} />}
          {(kind === "line" || kind === "bar") && <Switch label="Missing months" checked={gaps} onChange={setGaps} />}
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section title="Which chart?">
        <p className="pg-section-desc">
          Start from the question, not the chart type. Each one answers a different question, and each has a budget.
        </p>
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Chart</th>
                <th scope="col">Keep it to</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">How does it change over time?</th>
                <td>
                  <code>LineChart</code>
                </td>
                <td className="pg-muted">
                  {CHART_POINT_BUDGET.line.toLocaleString("en-US")} points per series, 4 series before lines tangle.
                </td>
              </tr>
              <tr>
                <th scope="row">How do categories compare?</th>
                <td>
                  <code>BarChart</code>
                </td>
                <td className="pg-muted">
                  {CHART_POINT_BUDGET.bar} bars. Sorted, from a zero baseline (always on, never cropped).
                </td>
              </tr>
              <tr>
                <th scope="row">Do two measures move together?</th>
                <td>
                  <code>ScatterChart</code>
                </td>
                <td className="pg-muted">
                  {CHART_POINT_BUDGET.scatter.toLocaleString("en-US")} dots, 3 groups: every pair of colors is on screen
                  at once, and only the first 3 stay apart for color-blind readers.
                </td>
              </tr>
              <tr>
                <th scope="row">What share of the whole is each part?</th>
                <td>
                  <code>DonutChart</code>
                </td>
                <td className="pg-muted">
                  {CHART_POINT_BUDGET.donut} slices, largest first. If people need to compare the parts to each other,
                  not to the whole, use bars: lengths are read far more precisely than angles.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pg-muted pg-note">
          <strong>Pie or donut?</strong> Same encoding, one component: <code>variant="pie"</code> fills the hole. The
          donut is the default because its center holds the total and the reading of the slice you point at.
        </p>
      </Section>

      <BudgetSection />

      <Section title="Why SVG, not canvas">
        <p className="pg-section-desc">
          Canvas is what libraries built for huge datasets reach for. A design system's chart has other jobs: take
          colors from tokens, stay sharp, be inspectable and accessible. SVG does all of that, and its cost grows with
          the number of <em>elements</em>, not values. A line of 100,000 points is one <code>&lt;path&gt;</code>; it's
          separate dots that get slow.
        </p>
        <div className="pg-table-wrap">
          <table className="pg-table pg-num">
            <caption className="pg-muted">
              Frames per second while every value moves each frame. 800 × 400 plot, Chromium 156, 144 Hz display (so 144
              is the ceiling). One run on one machine: read the trend, not the digits.
            </caption>
            <thead>
              <tr>
                <th scope="col">Values</th>
                <th scope="col">SVG dots</th>
                <th scope="col">Canvas dots</th>
                <th scope="col">SVG line</th>
                <th scope="col">Canvas line</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["1,000", 144, 144, 144, 144],
                ["5,000", 66, 142, 144, 144],
                ["10,000", 33, 59, 144, 144],
                ["50,000", 6, 12, 76, 39],
                ["100,000", 3, 6, 36, 19],
              ].map(([n, ...fps]) => (
                <tr key={n}>
                  <th scope="row">{n}</th>
                  {fps.map((f, i) => (
                    <td key={i}>{f}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="pg-muted pg-note">
          Below a few thousand marks the two are identical. Where they differ, the chart is already unreadable, which is
          why the answer is the data budget, not a canvas renderer. The scatter is the one chart that pays per value
          (a dot is an element), which is why its budget is counted in dots.
        </p>
      </Section>

      <Section title="API">
        <ApiTable
          caption="LineChart / BarChart"
          rows={[
            ["aria-label", "string", "required", "What the chart shows. Names it and captions its data table."],
            ["data", "T[]", "required", "Aggregated rows in x order, one per x position."],
            ["x", "keyof T", "required", "Field used for the x axis."],
            ["series", "{ key, label, color? }[]", "required", "One per line or bar group. Colors follow --chart-1…8."],
            ["xLabel", "string", "x", "Header of the x column in the data table."],
            ["height", "number", "240", "Plot height in px, legend excluded. Width fills the container."],
            ["formatValue", "(v: number) => string", "1,234.5", "Values in the tooltip and table."],
            ["formatX", "(v: unknown) => string", "String", "x values on the axis, tooltip and table."],
            ["maxPoints", "number", "1,000 · 60", "Data budget: points per series (line), bars (bar)."],
            ["legend", "boolean", "true", "Shown only for 2+ series; one series is named by its title."],
          ]}
        />
        <ApiTable
          caption="LineChart"
          rows={[["area", "boolean", "false", "A 10% wash under each line. The y axis then starts at zero."]]}
        />
        <ApiTable
          caption="ScatterChart"
          rows={[
            ["aria-label", "string", "required", "What the chart shows. Names it and captions its data table."],
            ["data", "T[]", "required", "One row per dot. Rows without a numeric x and y are skipped."],
            ["x / y", "keyof T", "required", "Numeric fields for the two positions."],
            ["group", "keyof T", "–", "Field that groups dots: one color each, 3 at most."],
            ["groups", "string[]", "first seen", "Group order, so colors stay put when a filter removes one."],
            ["name", "keyof T", "–", "Field that names a dot in the tooltip and table."],
            ["xLabel / yLabel", "string", "field name", "Axis titles and table headers."],
            ["formatX / formatY", "(v: number) => string", "1,234.5", "Values in the tooltip and table."],
            ["height", "number", "280", "Plot height in px. Width fills the container."],
            ["maxPoints", "number", "1,000", "Data budget: dots in total."],
          ]}
        />
        <ApiTable
          caption="DonutChart"
          rows={[
            ["aria-label", "string", "required", "What the chart shows. Names it and captions its data table."],
            ["data", "T[]", "required", "One row per slice, sorted largest first. Zero and negative rows are skipped."],
            ["category", "keyof T", "required", "Field that names each slice."],
            ["value", "keyof T", "required", "Numeric field for each slice's size."],
            ["variant", '"donut" | "pie"', '"donut"', "The donut's hole holds the total and the hovered slice."],
            ["size", "number", "200", "Diameter in px."],
            ["centerLabel", "string", '"Total"', "Words under the total in the center."],
            ["formatValue", "(v: number) => string", "1,234.5", "Values in the center, tooltip and table."],
            [
              "formatCompact",
              "(v: number) => string",
              "12.9K",
              "Center fallback when the full value doesn't fit. Numbers never get an ellipsis.",
            ],
            ["maxSlices", "number", "5", "Data budget: slices."],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist">
          <li>
            The SVG is hidden from assistive tech. The same values live in a <strong>visually hidden table</strong>{" "}
            captioned with the chart's label.
          </li>
          <li>
            The chart is <strong>one tab stop</strong>. <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>Home</Kbd> <Kbd>End</Kbd> move
            the readout and it's announced politely; <Kbd>Esc</Kbd> clears it.
          </li>
          <li>
            Color is never the only channel: a legend for 2+ series, a tooltip that names every series, and the table.
            Text always wears text tokens, never the series color.
          </li>
          <li>
            The palette is validated for color-vision deficiency on adjacent pairs. Light slots 3–5 sit below 3:1, which
            is why the table and tooltip are not optional.
          </li>
          <li>
            Hit targets are bigger than the marks: line and bar charts snap to the nearest x, scatter to the nearest dot
            within 16px, and a donut slice answers on its legend row too.
          </li>
          <li>
            In forced colors, series keep their hues (<code>forced-color-adjust: none</code>) and the grid and text
            follow the system palette.
          </li>
        </ul>
      </Section>
    </>
  );
}

function BudgetSection() {
  const [size, setSize] = useState<Size>("5000");
  const [aggregated, setAggregated] = useState(false);

  const raw = useMemo(() => signal(Number(size)), [size]);
  const rawRows = useMemo(() => raw.map((value, x) => ({ x, value })), [raw]);
  const buckets = useMemo(() => aggregate(raw, 160), [raw]);

  const points = aggregated ? buckets.length : raw.length;
  const over = points > CHART_POINT_BUDGET.line;
  const fmt = (n: number) => n.toLocaleString("en-US");

  return (
    <Section
      title="Data budget"
      description="A chart is for seeing a pattern. Rows people need to look up belong in a table."
    >
      <div className="pg-callout" role="note">
        <AlertCircleIcon className="pg-callout-icon" />
        <div>
          <p>
            <strong>Aggregate before you chart.</strong> An 800px plot has about 800 x positions: plot 20,000 points and
            25 land on every pixel column, drawn on top of each other. The chart still renders, but in development it
            warns in the console once you pass the budget:
          </p>
          <ul>
            <li>
              <code>LineChart</code>: {fmt(CHART_POINT_BUDGET.line)} points per series
            </li>
            <li>
              <code>BarChart</code>: {fmt(CHART_POINT_BUDGET.bar)} bars in total
            </li>
            <li>
              <code>ScatterChart</code>: {fmt(CHART_POINT_BUDGET.scatter)} dots
            </li>
            <li>
              <code>DonutChart</code>: {fmt(CHART_POINT_BUDGET.donut)} slices
            </li>
          </ul>
          <p className="pg-muted">
            The chart doesn't downsample for you. Which summary is honest (average, peak, sum, count) depends on what the
            number means, so that decision stays with whoever owns the data.
          </p>
        </div>
      </div>

      <div className="pg-playground">
        <div className="pg-stage pg-chart-stage">
          <div className="pg-chart-card">
            <div className="pg-chart-status">
              <span className="gd-badge" data-tone={over ? "bad" : "good"}>
                {fmt(points)} points per series · {over ? "over budget" : "within budget"}
              </span>
            </div>
            {aggregated ? (
              <LineChart
                aria-label="Server latency, 160 buckets"
                xLabel="From sample"
                data={buckets}
                x="x"
                series={[
                  { key: "mean", label: "Average" },
                  { key: "peak", label: "Peak" },
                ]}
                formatX={(v) => `#${fmt(Number(v))}`}
                formatValue={(v) => `${fmt(v)} ms`}
              />
            ) : (
              <LineChart
                aria-label="Server latency, raw samples"
                xLabel="Sample"
                data={rawRows}
                x="x"
                series={[{ key: "value", label: "Latency" }]}
                formatX={(v) => `#${fmt(Number(v))}`}
                formatValue={(v) => `${fmt(v)} ms`}
              />
            )}
          </div>
        </div>
        <div className="pg-controls" role="group" aria-label="Data budget controls">
          <Segmented<Size>
            label="Raw samples"
            value={size}
            onChange={setSize}
            options={SIZES.map((s) => ({ value: s, label: fmt(Number(s)) }))}
          />
          <Switch
            label="Aggregate to 160 buckets"
            description="Average and peak per bucket"
            checked={aggregated}
            onChange={setAggregated}
          />
        </div>
        <p className="pg-muted pg-note">
          Raw, the line turns into a smudge and the hover readout jumps between neighbors you can't tell apart.
          Aggregated, the shape is the same, the spikes survive because the peak is kept beside the average, and every
          position you hover is a real summary.
        </p>
        <CodeBlock
          label="Aggregating before the chart"
          code={`// Split rows into equal runs; keep what the reader needs from each.
function aggregate(values: number[], buckets: number) {
  const size = Math.ceil(values.length / buckets);
  const out = [];
  for (let start = 0; start < values.length; start += size) {
    const run = values.slice(start, start + size);
    out.push({
      x: start,
      mean: run.reduce((a, b) => a + b, 0) / run.length,
      peak: Math.max(...run), // an average alone hides spikes
    });
  }
  return out;
}

<LineChart
  aria-label="Server latency"
  data={aggregate(samples, 160)}
  x="x"
  series={[
    { key: "mean", label: "Average" },
    { key: "peak", label: "Peak" },
  ]}
/>`}
        />
      </div>

      <div className="pg-table-wrap">
        <table className="pg-table">
          <thead>
            <tr>
              <th scope="col">Too much data for…</th>
              <th scope="col">Do this before the chart</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">A trend over time</th>
              <td className="pg-muted">
                Bucket by time (hour, day, week) or to about one point per 4px; keep min/max or the peak beside the
                average. Server-side when you can.
              </td>
            </tr>
            <tr>
              <th scope="row">Comparing categories</th>
              <td className="pg-muted">Sort, keep the top N, fold the rest into "Other".</td>
            </tr>
            <tr>
              <th scope="row">A distribution</th>
              <td className="pg-muted">Count into bins: a histogram, not a dot per row.</td>
            </tr>
            <tr>
              <th scope="row">Looking up exact rows</th>
              <td className="pg-muted">
                Not a chart. A table with sorting, search and pagination, linked from the chart if it helps.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}
