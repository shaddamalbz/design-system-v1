import { useMemo, useState } from "react";
import { OrgChart } from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch, TermLink } from "../ui";
import { generateOrg } from "./orgData";

type Size = "1000" | "10000" | "50000" | "100000";

export function OrgChartPage() {
  const [size, setSize] = useState<Size>("10000");
  const [virtualize, setVirtualize] = useState(true);
  const [debug, setDebug] = useState(false);
  const [overscan, setOverscan] = useState(25);
  const [selected, setSelected] = useState<string | null>(null);

  const nodes = useMemo(() => generateOrg(Number(size)), [size]);
  const heavy = !virtualize && Number(size) >= 50000;

  const code = `<OrgChart
  nodes={people} // { id, parentId, name, title?, color? }[]
  aria-label="Company org chart"${virtualize ? "" : "\n  virtualize={false}"}${overscan !== 25 ? `\n  overscan={${overscan / 100}}` : ""}${debug ? "\n  debug" : ""}
  showStats
/>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Org chart">
        <p>
          A pan-and-zoom org chart that stays smooth with 100,000 people. It uses{" "}
          <TermLink id="spatial-virtualization">spatial virtualization</TermLink>,
          the 2D version of a virtual list: only the cards inside the viewport exist as DOM, found through a grid index
          instead of a scan. Zoomed far out, it switches to cheaper levels of detail.
        </p>
        <Concepts ids={["spatial-virtualization", "direct-manipulation", "reduced-motion"]} />
      </PageHeader>

      <div className="pg-playground">
        <OrgChart
          // A new org starts a fresh chart: search, selection and camera reset together
          key={size}
          nodes={nodes}
          aria-label="Company org chart"
          height={600}
          virtualize={virtualize}
          overscan={overscan / 100}
          debug={debug}
          showStats
          selectedId={selected}
          onSelectedChange={setSelected}
        />
        <p className="pg-muted pg-note">
          Drag to pan, <Kbd>Ctrl</Kbd> + scroll or pinch to zoom, scroll to pan. Search from the box in the corner (or
          press <Kbd>/</Kbd> in the chart): try <em>lead design</em> at 100k, pick <em>Show all on chart</em>, then pick a
          person and watch the camera fly. Turn on <em>Show culling</em> to see which cards exist, then turn
          virtualization off at 50k and try the same moves.
        </p>
        {heavy && (
          <p className="pg-note" role="status">
            Virtualization is off: all {Number(size).toLocaleString("en-US")} cards are DOM. The first render can freeze
            the tab for several seconds. That's the point.
          </p>
        )}
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<Size>
            label="People"
            value={size}
            onChange={(s) => {
              setSize(s);
              setSelected(null);
            }}
            options={[
              { value: "1000", label: "1k" },
              { value: "10000", label: "10k" },
              { value: "50000", label: "50k" },
              { value: "100000", label: "100k" },
            ]}
          />
          <Switch label="Virtualize" checked={virtualize} onChange={setVirtualize} />
          <Switch label="Show culling" checked={debug} onChange={setDebug} />
          <Range label="Overscan per side" value={overscan} min={0} max={100} step={5} unit="%" onChange={setOverscan} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section title="Virtual list vs spatial virtualization">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col" />
                <th scope="col">Virtual list</th>
                <th scope="col">Spatial (this chart)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Viewport</th>
                <td className="pg-muted">An interval: scrollTop to scrollTop + height</td>
                <td className="pg-muted">A rectangle in world space, from the camera (pan x, y and zoom k)</td>
              </tr>
              <tr>
                <th scope="row">What's visible?</th>
                <td className="pg-muted">Division: first = ⌊scrollTop / rowHeight⌋</td>
                <td className="pg-muted">A spatial index query: the grid cells the rectangle overlaps</td>
              </tr>
              <tr>
                <th scope="row">Needs</th>
                <td className="pg-muted">Known row heights</td>
                <td className="pg-muted">Known boxes: fixed card size, positions from the layout math</td>
              </tr>
              <tr>
                <th scope="row">Overscan</th>
                <td className="pg-muted">A few rows above and below</td>
                <td className="pg-muted">A margin on all four sides; panning inside it costs no render</td>
              </tr>
              <tr>
                <th scope="row">Extra problem</th>
                <td className="pg-muted">None</td>
                <td className="pg-muted">
                  Zooming out puts everything in view, so culling stops helping: level of detail takes over
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Search">
        <p className="pg-section-desc">
          Search goes through the data, never the DOM: most cards don't exist as elements, so the browser's find can't
          see them. The layout already knows where every match is, so the chart flies there and the virtual window mounts
          the cards as it arrives.
        </p>
        <ul className="pg-checklist">
          <li>
            <strong>Matching:</strong> every word must appear in the name or title, ignoring case and accents (
            <em>ines</em> finds Inés). Best first: the name starts with the query, then a word does, then anywhere;
            higher in the org breaks ties. A counting sort ranks 100k people in one pass.
          </li>
          <li>
            <strong>Highlights at every zoom:</strong> matching cards get an outline and marked letters, the rest fade.
            Zoomed out, each match becomes a marker at least 5px wide, binned to screen pixels so 80,000 matches cost one
            pass, not 80,000 rectangles.
          </li>
          <li>
            <strong>Show all on chart</strong> fits the bounding box of every match. Picking one selects it and draws the
            line from the top of the org down to them.
          </li>
          <li>
            <strong>The flight</strong> follows van Wijk &amp; Nuij's smooth zoom: it zooms out while it travels and
            back in as it lands, so you see where you went. Longer jumps take longer, up to 1.6 s; under{" "}
            <TermLink id="reduced-motion">reduced motion</TermLink> it jumps.
          </li>
          <li>
            Typing stays instant: the search renders through <code>useDeferredValue</code>, at lower priority than the
            keystrokes.
          </li>
        </ul>
      </Section>

      <Section title="How it works">
        <ul className="pg-checklist">
          <li>
            <strong>Layout without the DOM.</strong> Every card is 208 × 60. A post-order pass sizes each subtree, a
            pre-order pass places it: O(n), no recursion, about 0.2 s for 100k, once per data change. Teams of leaves stack in a column; managers
            with more than 4 reports wrap them into a grid around a corridor, so the org stays roughly square.
          </li>
          <li>
            <strong>A uniform grid index.</strong> World space is cut into 256px cells; each card and each connector is
            listed in the cells it touches. Stored as two typed arrays (CSR), built in two passes. A query visits only
            overlapping cells and de-duplicates with a stamp array, not a Set.
          </li>
          <li>
            <strong>The camera never touches React.</strong> Pan and zoom write one <code>transform</code> on the card
            layer and repaint the canvas. React only renders when the viewport leaves the overscan window, and keyed,
            memoized cards mean only the newcomers render.
          </li>
          <li>
            <strong>Level of detail.</strong> Above 60% zoom: full cards. 28–60%: name only, set at 24px so it reads at
            that scale. Below 28%: no DOM cards at all; the canvas fills one path per department color.
          </li>
          <li>
            <strong>Connectors are canvas,</strong> culled with their own grid (a connector can cross the view while
            both its cards are off screen) and batched into a single <code>stroke()</code>.
          </li>
          <li>
            <strong>Clicks are hit-tested through the grid</strong> too: a point query at the cursor. It works the same
            for DOM cards and canvas boxes.
          </li>
        </ul>
        <CodeBlock
          label="The core of a frame"
          code={`// Viewport → world rectangle
const x0 = -cam.x / cam.k, y0 = -cam.y / cam.k;
const x1 = (width - cam.x) / cam.k, y1 = (height - cam.y) / cam.k;

world.style.transform = \`translate(\${cam.x}px, \${cam.y}px) scale(\${cam.k})\`;

// Still inside the rendered margin? Then we're done: no React work.
if (outside(window, x0, y0, x1, y1)) {
  const pad = (x1 - x0) * overscan;
  window = expand({ x0, y0, x1, y1 }, pad);
  grid.query(window.x0, window.y0, window.x1, window.y1, ids);
  setVisible(ids); // React mounts only the new keys
}`}
        />
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="OrgChart usage example"
          code={`// Flat rows, the way org data usually arrives
const people = [
  { id: "1", parentId: null, name: "Morgan Reyes", title: "CEO" },
  { id: "2", parentId: "1", name: "Ada Costa", title: "VP of Engineering", color: "var(--chart-1)" },
  …
];

const chart = useRef<OrgChartHandle>(null);
<OrgChart ref={chart} nodes={people} aria-label="Company org chart" />

chart.current?.focusNode("2"); // select and fly to someone
chart.current?.fit();          // whole org in view

// Search: built in (top left), or drive it yourself
<OrgChart nodes={people} aria-label="…" query={q} onQueryChange={setQ} />
<OrgChart nodes={people} aria-label="…" search={false} query="design" /> // highlight only
<OrgChart nodes={people} aria-label="…"
  getSearchText={(p) => \`\${p.name} \${p.title} \${p.email}\`} />`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="OrgChart"
          rows={[
            ["nodes", "OrgChartNode[]", "—", "Flat list. Missing or unknown parentId → top level. Cycles are cut (dev warning)."],
            ["aria-label", "string", "—", "Required. Names the chart."],
            ["height", "number", "560", "Height in px. The width follows the container."],
            ["virtualize", "boolean", "true", "Off renders every card as DOM. For comparison only."],
            ["overscan", "number", "0.25", "Extra area kept rendered around the viewport, per side, as a fraction of its size."],
            ["debug", "boolean", "false", "Shrinks the culling area inside the viewport and draws the grid cells."],
            ["showStats", "boolean", "false", "Live counters: DOM cards, canvas boxes, connectors, cells, fps."],
            ["selectedId / defaultSelectedId", "string | null", "—", "Selected person (controlled / uncontrolled)."],
            ["onSelectedChange", "(id: string | null) => void", "—", "Click, arrow keys, Esc, a search pick, or focusNode()."],
            ["search", "boolean", "true", "The search field. / or Ctrl+F inside the chart focuses it."],
            ["query / defaultQuery", "string", '""', "Search text (controlled / uncontrolled). Highlights work without the field."],
            ["onQueryChange", "(query: string) => void", "—", "Every edit of the search field."],
            ["getSearchText", "(node) => string", "name + title", "What a node is searched by. Read once per nodes change."],
          ]}
        />
        <ApiTable
          caption="OrgChartNode"
          rows={[
            ["id", "string", "—", "Unique."],
            ["parentId", "string | null", "null", "Manager's id."],
            ["name", "string", "—", "Card title; initials come from it."],
            ["title", "string", "—", "Second line on full-detail cards."],
            ["color", "string", "var(--chart-other)", "Any CSS color: the card's stripe and its overview box."],
          ]}
        />
        <ApiTable
          caption="OrgChartHandle (ref)"
          rows={[
            ["fit()", "", "", "Zoom out to show everyone."],
            ["zoomBy(factor)", "", "", "Zoom around the center; 2 is twice as close."],
            ["focusNode(id)", "", "", "Select and fly to someone, rendered or not."],
            ["fitTo(ids)", "", "", "Zoom so all these people fit in view."],
            ["focusSearch()", "", "", "Move keyboard focus to the search field."],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            Only a few cards exist as DOM at a time, so the chart doesn't ask screen readers to browse them. It's one tab
            stop (<code>role="application"</code>) with its own keys, described by a hidden hint.
          </li>
          <li>
            <Kbd>↑</Kbd> manager, <Kbd>↓</Kbd> first report, <Kbd>←</Kbd> <Kbd>→</Kbd> colleagues, <Kbd>Home</Kbd> the
            top. Each move is announced: name, title, manager, number of reports. The camera follows.
          </li>
          <li>
            <Kbd>Shift</Kbd> + arrows pan, <Kbd>+</Kbd> <Kbd>−</Kbd> zoom, <Kbd>0</Kbd> fits, <Kbd>Esc</Kbd> clears the
            selection. The zoom buttons are real buttons with names.
          </li>
          <li>
            The search is an ARIA combobox: focus stays in the field, <Kbd>↑</Kbd> <Kbd>↓</Kbd> move through results,{" "}
            <Kbd>Enter</Kbd> flies to one and hands focus to the chart so the arrow keys walk the org from there,{" "}
            <Kbd>Shift</Kbd> + <Kbd>Enter</Kbd> shows all. The number of matches is announced.
          </li>
          <li>
            <Kbd>/</Kbd> or <Kbd>Ctrl</Kbd> + <Kbd>F</Kbd> inside the chart opens the search instead of the browser's
            find, which can't see cards that aren't rendered.
          </li>
          <li>The selected card always stays mounted, whatever the viewport.</li>
          <li>Fly-to animations jump instead under reduced motion. Department color is never the only cue.</li>
        </ul>
      </Section>
    </>
  );
}
