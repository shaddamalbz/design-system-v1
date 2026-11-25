import { useMemo, useState } from "react";
import {
  Button,
  DEFAULT_EXTERNAL_TYPE,
  OrgChart,
  insertOrgNode,
  moveOrgNode,
  type OrgChartExternalDrop,
  type OrgChartMove,
  type OrgChartNode,
} from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch, TermLink } from "../ui";
import { generateOrg } from "./orgData";

type Size = "1000" | "10000" | "50000" | "100000";

/* People waiting for a manager: drag them onto the chart, or select a manager and press one. */
const NEW_HIRES = [
  { key: "rin", name: "Rin Sato", title: "Designer" },
  { key: "omar", name: "Omar Farouk", title: "Engineer" },
  { key: "lucia", name: "Lucía Méndez", title: "Product Manager" },
  { key: "kofi", name: "Kofi Boateng", title: "Analyst" },
  { key: "mei", name: "Mei Lin", title: "Account Executive" },
];

/* Demo rule for canMove: the CEO stays put, and nobody becomes a second top-level person. */
const canMove = (node: OrgChartNode | null, newParent: OrgChartNode | null) =>
  newParent !== null && (node === null || node.parentId != null);

const HISTORY_LIMIT = 30;

export function OrgChartPage() {
  const [size, setSize] = useState<Size>("10000");
  const [virtualize, setVirtualize] = useState(true);
  const [debug, setDebug] = useState(false);
  const [overscan, setOverscan] = useState(25);
  const [selected, setSelected] = useState<string | null>(null);
  const [editable, setEditable] = useState(true);

  // The chart never edits the data: the page applies each move, and keeps old arrays for undo
  const generated = useMemo(() => generateOrg(Number(size)), [size]);
  const [edited, setEdited] = useState<OrgChartNode[] | null>(null);
  const [history, setHistory] = useState<OrgChartNode[][]>([]);
  const [placed, setPlaced] = useState<string[]>([]);
  const [trayNote, setTrayNote] = useState("");
  const nodes = edited ?? generated;
  const heavy = !virtualize && Number(size) >= 50000;

  const apply = (next: OrgChartNode[]) => {
    setHistory((h) => [...h.slice(-(HISTORY_LIMIT - 1)), nodes]);
    setEdited(next);
  };
  const undo = () => {
    const prev = history.at(-1);
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setEdited(prev === generated ? null : prev);
    setTrayNote("Undone.");
    // A hire who is no longer in the data goes back to the tray
    setPlaced((list) => list.filter((key) => prev.some((n) => n.id === `hire-${key}`)));
  };
  const resetEdits = () => {
    setEdited(null);
    setHistory([]);
    setPlaced([]);
    setTrayNote("");
  };

  const addHire = (key: string, parentId: string, index: number) => {
    const hire = NEW_HIRES.find((h) => h.key === key);
    const parent = nodes.find((n) => n.id === parentId);
    if (!hire || !parent || placed.includes(key)) return;
    apply(insertOrgNode(nodes, { id: `hire-${key}`, parentId, name: hire.name, title: hire.title, color: parent.color }, index));
    setPlaced((list) => [...list, key]);
    setTrayNote(`${hire.name} now reports to ${parent.name}.`);
  };

  const onMove = (move: OrgChartMove) => apply(moveOrgNode(nodes, move));
  const onDropExternal = ({ data, parentId, index }: OrgChartExternalDrop) => {
    if (parentId) addHire(JSON.parse(data).key, parentId, index);
  };

  const code = `<OrgChart
  nodes={people} // { id, parentId, name, title?, color? }[]
  aria-label="Company org chart"${editable ? "\n  editable\n  onMove={(move) => setPeople(moveOrgNode(people, move))}" : ""}${virtualize ? "" : "\n  virtualize={false}"}${overscan !== 25 ? `\n  overscan={${overscan / 100}}` : ""}${debug ? "\n  debug" : ""}
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
          editable={editable}
          canMove={canMove}
          onMove={onMove}
          onDropExternal={onDropExternal}
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
        {editable && (
          <NewHiresTray
            hires={NEW_HIRES.filter((h) => !placed.includes(h.key))}
            note={trayNote}
            changes={history.length}
            onPlace={(key) => {
              const parent = selected ? nodes.find((n) => n.id === selected) : undefined;
              if (!parent) return setTrayNote("Select a manager in the chart first.");
              const reports = nodes.filter((n) => n.parentId === parent.id).length;
              addHire(key, parent.id, reports);
            }}
            selectedName={selected ? nodes.find((n) => n.id === selected)?.name : undefined}
            onUndo={undo}
            onReset={resetEdits}
          />
        )}
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
              resetEdits();
            }}
            options={[
              { value: "1000", label: "1k" },
              { value: "10000", label: "10k" },
              { value: "50000", label: "50k" },
              { value: "100000", label: "100k" },
            ]}
          />
          <Switch label="Editable" checked={editable} onChange={setEditable} />
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

      <Section title="Restructuring">
        <p className="pg-section-desc">
          With <code>editable</code>, people can change who reports to whom. The chart reports each move and never edits
          the data itself, so undo, saving and permissions stay with the app.
        </p>
        <ul className="pg-checklist">
          <li>
            <strong>Drag a card</strong> onto someone to make them the manager, or onto a card's edge to place it next to
            that colleague (left/right in a row, top/bottom in a stacked team). The whole team moves along. On touch,
            press and hold to pick a card up; a quick swipe still pans.
          </li>
          <li>
            <strong>Drop targets come from the spatial index,</strong> the same point query clicks use, so they work on
            DOM cards, on canvas boxes zoomed out, and on cards that scrolled in mid-drag. Drag near an edge and the chart
            pans toward it.
          </li>
          <li>
            <strong>Rules:</strong> nobody can move into their own team (a walk up the parent chain), and{" "}
            <code>canMove</code> can veto anything else. In this demo the CEO stays put and nobody becomes a second
            top-level person: try it and the target turns red.
          </li>
          <li>
            <strong>Drag in from outside</strong> with native drag and drop: anything that puts{" "}
            <code>{DEFAULT_EXTERNAL_TYPE}</code> data on the drag is accepted, like the new hires above.
          </li>
          <li>
            <strong>After a move,</strong> the app passes new <code>nodes</code>; the layout and index rebuild (about 30
            ms at 10k, 0.3 s at 100k), the camera stays anchored on the person who moved, and the cards in view slide
            from their old places. Only visible cards animate, so it's ~100 animations, never 100k.
          </li>
        </ul>
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

// Restructuring: the chart reports moves, the app applies them
<OrgChart
  nodes={people}
  aria-label="Company org chart"
  editable
  canMove={(person, newManager) => newManager !== null}
  onMove={(move) => setPeople(moveOrgNode(people, move))}
  onDropExternal={({ data, parentId, index }) =>
    setPeople(insertOrgNode(people, { ...JSON.parse(data), parentId }, index))}
/>
// Anything draggable can feed it
<li draggable onDragStart={(e) =>
  e.dataTransfer.setData("application/x-org-node", JSON.stringify(person))} />

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
            ["editable", "boolean", "false", "Drag cards, drop from outside, M and Alt + arrows. Needs onMove."],
            ["canMove", "(node, newParent) => boolean", "—", "Veto a move. node is null for an outside drop, newParent null for the top level."],
            ["onMove", "(move: { id, parentId, index }) => void", "—", "Apply it to nodes; moveOrgNode does. index counts the new manager's reports without the mover."],
            ["onDropExternal", "(drop: { data, parentId, index }) => void", "—", "Outside data was dropped; insertOrgNode adds it."],
            ["externalType", "string", `"${DEFAULT_EXTERNAL_TYPE}"`, "dataTransfer type outside drags must carry."],
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
        <ApiTable
          caption="Helpers"
          rows={[
            ["moveOrgNode(nodes, move)", "→ nodes", "", "New array with the move applied; the old one is untouched (keep it for undo)."],
            ["insertOrgNode(nodes, node, index)", "→ nodes", "", "New array with node placed at index among its manager's reports."],
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
          <li>
            Every drag has a keyboard way (WCAG 2.5.7): select someone and press <Kbd>M</Kbd>, choose the new manager
            with the arrow keys or the search, then <Kbd>Enter</Kbd>; <Kbd>Esc</Kbd> cancels. Each step is announced
            (&ldquo;Diego Lindqvist. Press Enter: Zoe Zhou will report to them.&rdquo;).
          </li>
          <li>
            One-step moves: <Kbd>Alt</Kbd> + <Kbd>←</Kbd> <Kbd>→</Kbd> reorder among colleagues, <Kbd>Alt</Kbd> +{" "}
            <Kbd>↑</Kbd> moves next to the manager, <Kbd>Alt</Kbd> + <Kbd>↓</Kbd> under the previous colleague.
          </li>
          <li>New hires in the tray are buttons too: select a manager, then press one to add them there.</li>
          <li>The selected card always stays mounted, whatever the viewport.</li>
          <li>Fly-to animations jump instead under reduced motion. Department color is never the only cue.</li>
        </ul>
      </Section>
    </>
  );
}

function NewHiresTray({
  hires,
  note,
  changes,
  selectedName,
  onPlace,
  onUndo,
  onReset,
}: {
  hires: { key: string; name: string; title: string }[];
  note: string;
  changes: number;
  selectedName?: string;
  onPlace: (key: string) => void;
  onUndo: () => void;
  onReset: () => void;
}) {
  return (
    <section className="pg-org-tray" aria-label="New hires">
      <div className="pg-org-tray-head">
        <h3>New hires</h3>
        <p className="pg-muted">
          Drag one onto a manager in the chart, or press one to add them under{" "}
          {selectedName ? <strong>{selectedName}</strong> : "the selected person"}.
        </p>
      </div>
      {hires.length ? (
        <ul className="pg-org-tray-list">
          {hires.map((h) => (
            <li key={h.key}>
              <button
                type="button"
                className="pg-org-hire"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(DEFAULT_EXTERNAL_TYPE, JSON.stringify({ key: h.key }));
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => onPlace(h.key)}
              >
                <span className="pg-org-hire-name">{h.name}</span>
                <span className="pg-muted">{h.title}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="pg-muted">Everyone has a manager.</p>
      )}
      <div className="pg-org-tray-foot">
        <p className="pg-muted" aria-live="polite">
          {note || (changes ? `${changes} change${changes === 1 ? "" : "s"}` : "No changes yet")}
        </p>
        <div className="pg-org-tray-actions">
          <Button size="sm" onClick={onUndo} disabled={!changes}>
            Undo
          </Button>
          <Button size="sm" variant="ghost" onClick={onReset} disabled={!changes}>
            Reset
          </Button>
        </div>
      </div>
    </section>
  );
}
