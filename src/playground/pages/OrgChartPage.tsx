import { useMemo, useRef, useState } from "react";
import { Button, OrgChart, SearchIcon, type OrgChartHandle } from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch, TermLink, TextField } from "../ui";
import { generateOrg } from "./orgData";

type Size = "1000" | "10000" | "50000" | "100000";

export function OrgChartPage() {
  const [size, setSize] = useState<Size>("10000");
  const [virtualize, setVirtualize] = useState(true);
  const [debug, setDebug] = useState(false);
  const [overscan, setOverscan] = useState(25);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [findNote, setFindNote] = useState("");
  const chart = useRef<OrgChartHandle>(null);
  const lastHit = useRef(-1);

  const nodes = useMemo(() => generateOrg(Number(size)), [size]);
  const heavy = !virtualize && Number(size) >= 50000;

  const find = () => {
    const q = query.trim().toLowerCase();
    if (!q) return;
    // Searches the data, not the DOM: unrendered people are found too
    for (let step = 1; step <= nodes.length; step++) {
      const i = (lastHit.current + step) % nodes.length;
      if (nodes[i].name.toLowerCase().includes(q)) {
        lastHit.current = i;
        chart.current?.focusNode(nodes[i].id);
        setFindNote(`${nodes[i].name}, ${nodes[i].title}`);
        return;
      }
    }
    setFindNote(`No one matches “${query}”`);
  };

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
          ref={chart}
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
          Drag to pan, <Kbd>Ctrl</Kbd> + scroll or pinch to zoom, scroll to pan. Click a card, then use the arrow keys to
          walk the org. Turn on <em>Show culling</em>: cards only exist inside the orange frame, and the blue frame is
          what must stay covered. Then turn virtualization off at 50k and try the same moves.
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
              lastHit.current = -1;
              setFindNote("");
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
          <form
            className="pg-org-find"
            onSubmit={(e) => {
              e.preventDefault();
              find();
            }}
          >
            <TextField label="Find a person" value={query} onChange={setQuery} />
            <Button type="submit" startIcon={<SearchIcon />}>
              Find next
            </Button>
            <p className="pg-muted pg-org-find-note" aria-live="polite">
              {findNote}
            </p>
          </form>
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
chart.current?.fit();          // whole org in view`}
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
            ["onSelectedChange", "(id: string | null) => void", "—", "Click, arrow keys, Esc, or focusNode()."],
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
          <li>The selected card always stays mounted, whatever the viewport.</li>
          <li>Fly-to animations jump instead under reduced motion. Department color is never the only cue.</li>
        </ul>
      </Section>
    </>
  );
}
