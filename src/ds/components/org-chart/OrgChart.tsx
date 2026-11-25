import * as React from "react";
import { cx } from "../../utils/cx";
import { IconButton } from "../button";
import { MaximizeIcon, MinusIcon, PlusIcon } from "../../icons";
import {
  NODE_H,
  NODE_W,
  buildEdges,
  layoutTree,
  newChildSlot,
  nodeBoxes,
  type EdgeGeometry,
  type TreeLayout,
} from "./layout";
import { SpatialGrid } from "./spatial-grid";
import { EMPTY_RESULT, highlightParts, normalize, runSearch, type SearchResult } from "./search";
import { OrgChartSearch, type SearchOption } from "./OrgChartSearch";
import { zoomPath, type View } from "./fly";
import { findDrop, inSubtree, resolveDrop, stackedSiblings, type Drop, type DropKind } from "./drop";
import type { OrgChartExternalDrop, OrgChartMove } from "./edit";

/* ==========================================================================
   OrgChart: a pan/zoom org chart that stays smooth at 100k people.

   Spatial virtualization (the 2D cousin of a virtual list):
     1. Every card has a fixed size, so the layout knows every box without
        touching the DOM (layout.ts).
     2. The boxes go into a uniform grid index once (spatial-grid.ts).
     3. Each frame turns the viewport into a world rectangle and asks the
        grid what intersects it. Only those cards exist as DOM.
     4. Like overscan in a list, the DOM window is the viewport plus a
        margin. Panning inside the margin costs one CSS transform: no React
        render, no query. Crossing it re-queries and React swaps a few dozen
        keyed cards.

   Level of detail, because virtualization alone stops helping when you zoom
   all the way out (the viewport then contains everything):
     full      zoom ≥ 60%     cards with avatar, name, title, reports
     compact   28% – 60%      name only, set large so it stays readable
     overview  < 28%          no DOM cards: the canvas paints colored boxes.
                              Zoomed out past the cached bitmap's resolution,
                              one drawImage() of the whole org, painted once.
   Connectors are always canvas, culled with their own grid.

   The camera lives in a ref and is applied straight to the DOM; React only
   hears about it when the set of visible cards changes.

   Search runs on the data (search.ts), not the DOM: most cards don't exist
   as elements. Matches are highlighted at every detail level (marked cards,
   then markers binned to screen pixels), picking one flies there along a
   zoom-out-and-in path (fly.ts), and the line from the top of the org to the
   selected person is drawn stronger.

   Editing (editable): drag a card onto someone to make them the manager, or
   onto a card's edge to place them next to a colleague; drag in data from
   outside; or move by keyboard (M, Alt + arrows). Drop targets come from the
   same spatial index as clicks (drop.ts). The chart reports moves (onMove)
   and never edits `nodes` itself; after the app applies one, the camera
   stays anchored on the moved person and visible cards slide to their new
   places.
   ========================================================================== */

export interface OrgChartNode {
  id: string;
  /** Manager's id. Missing, null or unknown → a top-level node. */
  parentId?: string | null;
  name: string;
  title?: string;
  /** Any CSS color, e.g. a department's var(--chart-N). */
  color?: string;
}

export type OrgChartDetail = "full" | "compact" | "overview";

export interface OrgChartHandle {
  /** Zoom out to show the whole chart. */
  fit(): void;
  /** Zoom around the center by a factor (2 = twice as close). */
  zoomBy(factor: number): void;
  /** Select a node and fly to it. */
  focusNode(id: string): void;
  /** Zoom so all these nodes fit in view. */
  fitTo(ids: readonly string[]): void;
  /** Move keyboard focus to the search field. */
  focusSearch(): void;
}

export interface OrgChartProps {
  nodes: readonly OrgChartNode[];
  /** Names the chart for assistive technology. */
  "aria-label": string;
  /** Height in px. @default 560 */
  height?: number;
  /** Render only what's in view. Turn off to compare: every card becomes DOM. @default true */
  virtualize?: boolean;
  /** Extra area rendered around the viewport, as a fraction of its size per side. @default 0.25 */
  overscan?: number;
  /** Shrink the culling area inside the viewport and draw the grid cells, to watch culling happen. */
  debug?: boolean;
  /** Live counters: DOM cards, canvas boxes, grid cells, fps. @default false */
  showStats?: boolean;
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelectedChange?: (id: string | null) => void;
  /** Show the search field (top left). Press / or Ctrl+F inside the chart to reach it. @default true */
  search?: boolean;
  /** Search text (controlled). Matches are highlighted even with `search={false}`. */
  query?: string;
  defaultQuery?: string;
  onQueryChange?: (query: string) => void;
  /**
   * Text a node is searched by. Read once per `nodes` change.
   * Ranking favours matches at the start of this text. @default name + " " + title
   */
  getSearchText?: (node: OrgChartNode) => string;
  /**
   * Let people restructure the org: drag cards, drop data from outside, or move by keyboard
   * (M, Alt + arrows). Moves are reported through onMove; apply them to `nodes` yourself.
   */
  editable?: boolean;
  /** Veto a move or drop. `node` is null for a drop from outside; `newParent` is null for the top level. */
  canMove?: (node: OrgChartNode | null, newParent: OrgChartNode | null) => boolean;
  /** A move to apply to `nodes` (moveOrgNode does it). */
  onMove?: (move: OrgChartMove) => void;
  /** Data dragged in from outside, carrying `externalType`, was dropped on the chart. */
  onDropExternal?: (drop: OrgChartExternalDrop) => void;
  /** dataTransfer type that outside drags must carry to be accepted. @default "application/x-org-node" */
  externalType?: string;
  className?: string;
  ref?: React.Ref<OrgChartHandle>;
}

const FULL_AT = 0.6;
const COMPACT_AT = 0.28;
const MAX_ZOOM = 2;
const DEBUG_INSET = 0.2;
const FALLBACK_COLOR = "var(--chart-other)";
/** Smallest match marker on screen, in px, when cards are smaller than that. */
const MARKER_MIN = 5;
/** Opacity of everything that doesn't match while a search is active. */
const DIM = 0.22;
/** The preview trails the pointer by this much (px), so the pointer tip and the target stay visible. */
const TRAIL = 14;
/** The dragged card is shown at the zoom it was picked up at, kept within readable bounds. */
const PREVIEW_MIN = 0.6;
const PREVIEW_MAX = 1;
/** Touch: hold this long on a card to pick it up (a quick swipe still pans). */
const LONG_PRESS = 450;
/** While dragging, this close to an edge (px) pans the chart, up to EDGE_SPEED px per frame. */
const EDGE = 48;
const EDGE_SPEED = 18;
export const DEFAULT_EXTERNAL_TYPE = "application/x-org-node";

type DropState = Drop & { valid: boolean; reason: "" | "same" | "own-team" | "not-allowed" };
/** Overview bitmap budget: 16M pixels (about 64 MB) and a safe canvas side length. */
const SNAPSHOT_PIXELS = 16_000_000;
const SNAPSHOT_SIDE = 8192;

const detailFor = (k: number): OrgChartDetail => (k >= FULL_AT ? "full" : k >= COMPACT_AT ? "compact" : "overview");

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------------------------------------------------------------------------
   Model: everything derived from `nodes`, built once per data change.
   --------------------------------------------------------------------------- */

interface Model {
  nodes: readonly OrgChartNode[];
  index: Map<string, number>;
  layout: TreeLayout;
  edges: EdgeGeometry;
  nodeGrid: SpatialGrid;
  edgeGrid: SpatialGrid;
  /** Distinct node colors, and each node's slot in that list (for batched canvas fills). */
  colors: string[];
  colorOf: Uint16Array;
  roots: number[];
  buildMs: number;
}

function buildModel(nodes: readonly OrgChartNode[]): Model {
  const t0 = performance.now();
  const n = nodes.length;
  const index = new Map<string, number>();
  let duplicates = 0;
  for (let i = 0; i < n; i++) {
    if (index.has(nodes[i].id)) duplicates++;
    index.set(nodes[i].id, i);
  }
  const parentOf = new Int32Array(n);
  let unknown = 0;
  for (let i = 0; i < n; i++) {
    const pid = nodes[i].parentId;
    const p = pid == null ? undefined : index.get(pid);
    if (pid != null && p === undefined) unknown++;
    parentOf[i] = p === undefined || p === i ? -1 : p;
  }
  const layout = layoutTree(parentOf);
  const edges = buildEdges(layout);
  const nodeGrid = new SpatialGrid(nodeBoxes(layout), layout.width, layout.height);
  const edgeGrid = new SpatialGrid(edges.segments, layout.width, layout.height, 256, edges.segmentOwner);

  const colors: string[] = [];
  const slot = new Map<string, number>();
  const colorOf = new Uint16Array(n);
  for (let i = 0; i < n; i++) {
    const c = nodes[i].color ?? FALLBACK_COLOR;
    let s = slot.get(c);
    if (s === undefined) {
      s = colors.length;
      colors.push(c);
      slot.set(c, s);
    }
    colorOf[i] = s;
  }
  const roots: number[] = [];
  for (let i = 0; i < n; i++) if (layout.parent[i] === -1) roots.push(i);

  if (import.meta.env.DEV && (duplicates || unknown || layout.cyclesCut)) {
    console.warn(
      `[ds] <OrgChart>: ${duplicates} duplicate id(s), ${unknown} unknown parentId(s), ${layout.cyclesCut} cycle(s) cut. ` +
        "Those nodes are shown as top-level.",
    );
  }
  return { nodes, index, layout, edges, nodeGrid, edgeGrid, colors, colorOf, roots, buildMs: performance.now() - t0 };
}

/** Siblings of i (the roots, for a root), and i's place among them. */
function siblingsOf(m: Model, i: number): [ArrayLike<number>, number] {
  const p = m.layout.parent[i];
  if (p === -1) return [m.roots, m.roots.indexOf(i)];
  const { childStart, childList } = m.layout;
  const list = childList.subarray(childStart[p], childStart[p + 1]);
  return [list, list.indexOf(i)];
}

/** Adds the connectors into `ids` to a new path (the caller strokes it). */
function paintEdges(ctx: CanvasRenderingContext2D, m: Model, ids: readonly number[], round: boolean) {
  const { pts, len } = m.edges;
  const radius = 8;
  ctx.beginPath();
  for (const c of ids) {
    if (!len[c]) continue;
    const o = c * 8;
    const last = o + (len[c] - 1) * 2;
    ctx.moveTo(pts[o], pts[o + 1]);
    for (let p = o + 2; p < last; p += 2) {
      if (!round) {
        ctx.lineTo(pts[p], pts[p + 1]);
        continue;
      }
      // Rounded elbow: radius limited to half of the shorter neighbouring segment
      const r = Math.min(
        radius,
        Math.hypot(pts[p] - pts[p - 2], pts[p + 1] - pts[p - 1]) / 2,
        Math.hypot(pts[p + 2] - pts[p], pts[p + 3] - pts[p + 1]) / 2,
      );
      ctx.arcTo(pts[p], pts[p + 1], pts[p + 2], pts[p + 3], r);
    }
    ctx.lineTo(pts[last], pts[last + 1]);
  }
}

/** Fills the cards in `ids` as plain boxes: one path per color, a few fill() calls in total. */
function paintBoxes(ctx: CanvasRenderingContext2D, m: Model, ids: readonly number[], resolve: (css: string) => string) {
  const t = m.layout;
  const paths = m.colors.map(() => new Path2D());
  for (const i of ids) paths[m.colorOf[i]].rect(t.x[i], t.y[i], NODE_W, NODE_H);
  paths.forEach((p, s) => {
    ctx.fillStyle = resolve(m.colors[s]);
    ctx.fill(p);
  });
}

/**
 * Marks every match in view, in screen pixels, at least MARKER_MIN wide so a match
 * stays visible when its card is smaller than a pixel. Matches that land in the same
 * screen bin are drawn once: 100k matches cost one pass over a typed array, not
 * 100k rectangles.
 */
function paintMatchMarkers(
  ctx: CanvasRenderingContext2D,
  m: Model,
  ranked: Int32Array,
  cam: Camera,
  vw: number,
  vh: number,
) {
  const t = m.layout;
  const { x: tx, y: ty, k } = cam;
  const bw = Math.max(NODE_W * k, MARKER_MIN);
  const bh = Math.max(NODE_H * k, MARKER_MIN);
  const bin = Math.max(2, Math.min(bw, bh));
  const cols = Math.ceil(vw / bin) + 2;
  const rows = Math.ceil(vh / bin) + 2;
  const seen = new Uint8Array(cols * rows);
  const path = new Path2D();
  let drawn = 0;
  for (let n = 0; n < ranked.length; n++) {
    const i = ranked[n];
    const cx = (t.x[i] + NODE_W / 2) * k + tx;
    const cy = (t.y[i] + NODE_H / 2) * k + ty;
    if (cx < -bw || cy < -bh || cx > vw + bw || cy > vh + bh) continue;
    const c = Math.min(cols - 1, Math.max(0, Math.floor(cx / bin) + 1));
    const r = Math.min(rows - 1, Math.max(0, Math.floor(cy / bin) + 1));
    if (seen[r * cols + c]) continue;
    seen[r * cols + c] = 1;
    path.rect(cx - bw / 2, cy - bh / 2, bw, bh);
    drawn++;
  }
  ctx.fill(path);
  return drawn;
}

/** People in i's team, i excluded. O(team size). */
function teamSize(t: TreeLayout, i: number) {
  let count = 0;
  const stack = [i];
  while (stack.length) {
    const v = stack.pop()!;
    for (let c = t.childStart[v]; c < t.childStart[v + 1]; c++) {
      count++;
      stack.push(t.childList[c]);
    }
  }
  return count;
}

/** Nearest two managers of i, top first, with "…" when there are more. */
function managersOf(m: Model, i: number): string[] {
  const path: string[] = [];
  let p = m.layout.parent[i];
  while (p !== -1 && path.length < 2) {
    path.unshift(m.nodes[p].name);
    p = m.layout.parent[p];
  }
  if (p !== -1) path.unshift("…");
  return path;
}

const defaultSearchText = (node: OrgChartNode) => (node.title ? `${node.name} ${node.title}` : node.name);

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/* ---------------------------------------------------------------------------
   Card: memoized, so a window change only renders the cards that came in.
   --------------------------------------------------------------------------- */

interface CardProps {
  node: OrgChartNode;
  x: number;
  y: number;
  detail: OrgChartDetail;
  reports: number;
  selected: boolean;
  /** On the line from the top of the org to the selected person. */
  onPath: boolean;
  /** "match" / "dim" while a search is active. */
  search?: "match" | "dim";
  /** Normalized query, on matching cards: marks the matched letters. */
  highlight?: string;
  /** "origin": the card being dragged (shown as its empty slot); "team": the reports coming along. */
  dragging?: "origin" | "team";
  /** Drop target state: "target" (will become the manager) or "invalid". */
  drop?: "target" | "invalid";
}

function Marked({ text, query }: { text: string; query?: string }) {
  if (!query) return text;
  return highlightParts(text, query).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text));
}

const OrgCard = React.memo(function OrgCard({
  node,
  x,
  y,
  detail,
  reports,
  selected,
  onPath,
  search,
  highlight,
  dragging,
  drop,
}: CardProps) {
  return (
    <div
      className="ds-org-card"
      data-id={node.id}
      data-dragging={dragging}
      data-drop={drop}
      data-detail={detail}
      data-selected={selected ? "" : undefined}
      data-path={onPath ? "" : undefined}
      data-search={selected ? undefined : search}
      style={{ left: x, top: y, "--_c": node.color ?? FALLBACK_COLOR } as React.CSSProperties}
    >
      {detail === "full" ? (
        <>
          <span className="ds-org-avatar">{initials(node.name)}</span>
          <span className="ds-org-text">
            <span className="ds-org-name">
              <Marked text={node.name} query={highlight} />
            </span>
            {node.title && (
              <span className="ds-org-title">
                <Marked text={node.title} query={highlight} />
              </span>
            )}
          </span>
          {reports > 0 && <span className="ds-org-count">{reports}</span>}
        </>
      ) : (
        <span className="ds-org-name">
          <Marked text={node.name} query={highlight} />
        </span>
      )}
    </div>
  );
});

/* ---------------------------------------------------------------------------
   OrgChart
   --------------------------------------------------------------------------- */

interface Camera {
  /** screen = world * k + (x, y) */
  x: number;
  y: number;
  k: number;
}

interface DomWindow {
  ids: number[];
  detail: OrgChartDetail;
  /** Data the ids index into: after an edit, ids are translated to the new data by node id. */
  model?: Model;
}

export function OrgChart({
  nodes,
  "aria-label": ariaLabel,
  height = 560,
  virtualize = true,
  overscan = 0.25,
  debug = false,
  showStats = false,
  selectedId: selectedIdProp,
  defaultSelectedId = null,
  onSelectedChange,
  search = true,
  query: queryProp,
  defaultQuery = "",
  onQueryChange,
  getSearchText = defaultSearchText,
  editable = false,
  canMove,
  onMove,
  onDropExternal,
  externalType = DEFAULT_EXTERNAL_TYPE,
  className,
  ref,
}: OrgChartProps) {
  const model = React.useMemo(() => buildModel(nodes), [nodes]);

  /* ---- Search: query → ranked matches, computed off the typing path ----- */

  const [queryInner, setQueryInner] = React.useState(defaultQuery);
  const query = queryProp !== undefined ? queryProp : queryInner;
  const setQuery = React.useCallback(
    (q: string) => {
      if (queryProp === undefined) setQueryInner(q);
      onQueryChange?.(q);
    },
    [queryProp, onQueryChange],
  );
  // Typing stays instant; the search (a few ms at 100k) renders at lower priority
  const deferredQuery = React.useDeferredValue(query);
  const searchTextGetter = React.useRef(getSearchText);
  searchTextGetter.current = getSearchText;
  const searchText = React.useRef<{ model: Model; text: string[] } | null>(null);
  const result: SearchResult = React.useMemo(() => {
    if (!deferredQuery.trim()) return EMPTY_RESULT;
    // Build the normalized text once per data, on the first search
    if (searchText.current?.model !== model) {
      searchText.current = { model, text: model.nodes.map((n) => normalize(searchTextGetter.current(n))) };
    }
    return runSearch(searchText.current.text, model.layout.depth, deferredQuery);
  }, [model, deferredQuery]);
  const searching = result.query !== "";
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  const [selectedInner, setSelectedInner] = React.useState<string | null>(defaultSelectedId);
  const selectedId = selectedIdProp !== undefined ? selectedIdProp : selectedInner;
  const selected = selectedId == null ? -1 : (model.index.get(selectedId) ?? -1);
  const select = React.useCallback(
    (id: string | null) => {
      if (selectedIdProp === undefined) setSelectedInner(id);
      onSelectedChange?.(id);
    },
    [selectedIdProp, onSelectedChange],
  );

  const [win, setWin] = React.useState<DomWindow>({ ids: [], detail: "full" });

  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const worldRef = React.useRef<HTMLDivElement>(null);
  const hudRef = React.useRef<HTMLDivElement>(null);
  const probeRef = React.useRef<HTMLSpanElement>(null);
  const liveRef = React.useRef<HTMLDivElement>(null);
  const hintId = React.useId();

  const cam = React.useRef<Camera>({ x: 0, y: 0, k: 1 });
  const size = React.useRef({ w: 0, h: 0, dpr: 1 });
  /** World rect the current DOM window covers, and the zoom it was taken at. */
  const windowRect = React.useRef<{ x0: number; y0: number; x1: number; y1: number; k: number; detail: OrgChartDetail } | null>(
    null,
  );
  const needsInitialView = React.useRef(true);
  /** Last full window requested with virtualization off, so it's requested once. */
  const naiveKey = React.useRef("");
  const frame = React.useRef(0);
  const anim = React.useRef(0);
  const scratch = React.useRef({ edges: [] as number[], nodes: [] as number[] });
  const stats = React.useRef({ dom: 0, canvas: 0, edges: 0, cells: 0, fps: 0, bitmap: false, markers: 0 });
  const colorCache = React.useRef(new Map<string, string>());

  // Latest props for the frame loop, which runs outside React renders
  const edit = { editable, canMove, onMove, onDropExternal, externalType };
  const live = React.useRef({ model, virtualize, overscan, debug, showStats, selected, win, result, edit });
  React.useLayoutEffect(() => {
    live.current = { model, virtualize, overscan, debug, showStats, selected, win, result, edit };
  });

  /* ---- Drag state: refs for the per-move work, React state only for what renders */
  const dragState = React.useRef<{ mode: "pointer" | "external" | "keyboard"; dragged: number; pointer: { x: number; y: number } } | null>(
    null,
  );
  const dropRef = React.useRef<DropState | null>(null);
  const [dragging, setDragging] = React.useState<{
    dragged: number;
    ghost: boolean;
    scale: number;
    team: number;
    /** Where the card starts relative to its trailing spot: exactly where it was grabbed. */
    fromX: number;
    fromY: number;
  } | null>(null);
  const [dropLabel, setDropLabel] = React.useState("");
  /** Card to light up as the drop target (kept in state so only it re-renders). */
  const [dropView, setDropView] = React.useState<{ target: number; state: "target" | "invalid" } | null>(null);
  const ghostRef = React.useRef<HTMLDivElement>(null);
  /** Preview top-left relative to the pointer (negative: below-right of it). */
  const ghostOffset = React.useRef({ x: -TRAIL, y: -TRAIL });
  /** Where the preview was when a valid drop let go: the moved card slides in from there. */
  const dropFrom = React.useRef<{ id: string; x: number; y: number; scale: number; at: number } | null>(null);
  const edgePan = React.useRef(0);
  const dropScratch = React.useRef<number[]>([]);
  /** Node to keep in place on screen when the next `nodes` arrives (the one just moved). */
  const editAnchor = React.useRef<string | null>(null);
  /** The person just moved: brought into view after the edit if their new place is off screen. */
  const editFocus = React.useRef<string | null>(null);

  /** CSS color (tokens, light-dark()) → a color canvas understands, cached per theme. */
  const resolve = React.useCallback((css: string) => {
    let c = colorCache.current.get(css);
    if (c === undefined && probeRef.current) {
      probeRef.current.style.color = "";
      probeRef.current.style.color = css;
      c = getComputedStyle(probeRef.current).color;
      colorCache.current.set(css, c);
    }
    return c ?? "#888";
  }, []);

  /* ---- Overview bitmap: the whole org painted once, per data and theme -- */

  const snapshot = React.useRef<{ model: Model; canvas: HTMLCanvasElement; scale: number } | null>(null);
  const snapshotFor = React.useCallback(
    (m: Model) => {
      if (snapshot.current?.model === m) return snapshot.current;
      const t = m.layout;
      // Pixels per world unit, capped by total area (memory) and the canvas side limit
      const scale = Math.min(
        1,
        Math.sqrt(SNAPSHOT_PIXELS / Math.max(1, t.width * t.height)),
        SNAPSHOT_SIDE / Math.max(1, t.width),
        SNAPSHOT_SIDE / Math.max(1, t.height),
      );
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.ceil(t.width * scale));
      canvas.height = Math.max(1, Math.ceil(t.height * scale));
      const ctx = canvas.getContext("2d")!;
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      const all = Array.from({ length: t.count }, (_, i) => i);
      paintEdges(ctx, m, all, false);
      ctx.lineWidth = 1 / scale;
      ctx.strokeStyle = resolve("var(--chart-axis)");
      ctx.stroke();
      paintBoxes(ctx, m, all, resolve);
      snapshot.current = { model: m, canvas, scale };
      return snapshot.current;
    },
    [resolve],
  );

  /* ---- Frame: transform, cull, paint ----------------------------------- */

  const draw = React.useCallback(() => {
    frame.current = 0;
    const {
      model: m,
      virtualize: virt,
      overscan: over,
      debug: dbg,
      showStats: hud,
      selected: sel,
      win: w,
      result: res,
    } = live.current;
    const searchOn = res.query !== "" && res.mask.length === m.layout.count;
    const { w: vw, h: vh, dpr } = size.current;
    const canvas = canvasRef.current;
    const world = worldRef.current;
    if (!vw || !canvas || !world) return;
    const { x: tx, y: ty, k } = cam.current;
    const t = m.layout;

    world.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;

    // Viewport in world units, and the (debug-shrunk) area that must be covered
    const vx0 = -tx / k;
    const vy0 = -ty / k;
    const vx1 = (vw - tx) / k;
    const vy1 = (vh - ty) / k;
    const inset = dbg ? DEBUG_INSET : 0;
    const cx0 = vx0 + (vx1 - vx0) * inset;
    const cy0 = vy0 + (vy1 - vy0) * inset;
    const cx1 = vx1 - (vx1 - vx0) * inset;
    const cy1 = vy1 - (vy1 - vy0) * inset;
    const detail = detailFor(k);

    // 1. The DOM window
    if (virt) {
      const r = windowRect.current;
      if (detail === "overview") {
        if (w.ids.length) setWin({ ids: [], detail, model: m });
        windowRect.current = null;
        stats.current.dom = 0;
        naiveKey.current = "";
      } else if (!r || r.detail !== detail || cx0 < r.x0 || cy0 < r.y0 || cx1 > r.x1 || cy1 > r.y1 || r.k / k > 1.5) {
        // Out of the margin, a new detail level, or zoomed in so far the window is mostly off screen
        const px = (cx1 - cx0) * over;
        const py = (cy1 - cy0) * over;
        const rect = { x0: cx0 - px, y0: cy0 - py, x1: cx1 + px, y1: cy1 + py, k, detail };
        const ids: number[] = [];
        stats.current.cells = m.nodeGrid.query(rect.x0, rect.y0, rect.x1, rect.y1, ids);
        if (sel >= 0 && !ids.includes(sel)) ids.push(sel); // keyboard focus never unmounts
        windowRect.current = rect;
        naiveKey.current = "";
        stats.current.dom = ids.length;
        setWin({ ids, detail, model: m });
      }
    } else {
      const naiveDetail = detail === "overview" ? "compact" : detail;
      const key = `${t.count}:${naiveDetail}`;
      if (naiveKey.current !== key) {
        naiveKey.current = key;
        setWin({ ids: Array.from({ length: t.count }, (_, i) => i), detail: naiveDetail, model: m });
      }
      stats.current.dom = t.count;
      stats.current.cells = 0;
    }

    // 2. Canvas: connectors (and boxes when zoomed out)
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty);

    // Zoomed far out, blit the cached bitmap of the whole org instead of
    // re-painting tens of thousands of boxes (culling can't help: everything is in view)
    const snap = virt && detail === "overview" ? snapshotFor(m) : null;
    const useSnap = snap !== null && k * dpr <= snap.scale * 1.5;
    stats.current.bitmap = useSnap;

    if (useSnap) {
      ctx.imageSmoothingEnabled = true;
      ctx.globalAlpha = searchOn ? DIM : 1;
      ctx.drawImage(snap.canvas, 0, 0, snap.canvas.width, snap.canvas.height, 0, 0, t.width, t.height);
      ctx.globalAlpha = 1;
      stats.current.edges = Math.max(0, t.count - m.roots.length);
      stats.current.canvas = t.count;
      stats.current.cells = 0;
    } else if (virt) {
      const ids = scratch.current.edges;
      m.edgeGrid.query(vx0, vy0, vx1, vy1, ids);
      stats.current.edges = ids.length;
      paintEdges(ctx, m, ids, k >= COMPACT_AT);
      ctx.lineWidth = 1 / k;
      ctx.strokeStyle = resolve("var(--chart-axis)");
      ctx.stroke();
      if (detail === "overview") {
        const nodeIds = scratch.current.nodes;
        stats.current.cells = m.nodeGrid.query(vx0, vy0, vx1, vy1, nodeIds);
        stats.current.canvas = nodeIds.length;
        ctx.globalAlpha = searchOn ? DIM : 1;
        paintBoxes(ctx, m, nodeIds, resolve);
        ctx.globalAlpha = 1;
      } else {
        stats.current.canvas = 0;
      }
    } else {
      stats.current.edges = Math.max(0, t.count - m.roots.length);
      stats.current.canvas = 0;
    }

    // The line from the top of the org down to the selected person
    if (virt && sel >= 0 && sel < t.count && t.parent[sel] !== -1) {
      const pathIds: number[] = [];
      for (let v = sel; t.parent[v] !== -1; v = t.parent[v]) pathIds.push(v);
      paintEdges(ctx, m, pathIds, k >= COMPACT_AT);
      ctx.lineWidth = 2 / k;
      ctx.strokeStyle = resolve("var(--color-text)");
      ctx.stroke();
    }

    // Matches, when cards are canvas boxes: markers in screen pixels
    stats.current.markers = 0;
    if (virt && detail === "overview" && searchOn) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = resolve("var(--color-highlight-strong)");
      stats.current.markers = paintMatchMarkers(ctx, m, res.ranked, cam.current, vw, vh);
      ctx.setTransform(dpr * k, 0, 0, dpr * k, dpr * tx, dpr * ty);
    }

    // Drop indicator: a ring around the new manager, or a bar where a colleague slot opens
    const drop = dropRef.current;
    if (drop && drop.target < t.count && drop.reason !== "same") {
      const i = drop.target;
      const px = 1 / k;
      const color = resolve(drop.valid ? "var(--color-text)" : "var(--color-danger)");
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      if (drop.kind === "child" || !drop.valid) {
        ctx.lineWidth = 2.5 * px;
        ctx.setLineDash(drop.valid ? [] : [6 * px, 4 * px]);
        ctx.strokeRect(t.x[i] - 5 * px, t.y[i] - 5 * px, NODE_W + 10 * px, NODE_H + 10 * px);
        ctx.setLineDash([]);
        // Where the card will land, when that's predictable: a dashed slot, joined to the new manager
        const slot = drop.valid ? newChildSlot(t, i) : null;
        if (slot) {
          ctx.globalAlpha = 0.08;
          ctx.fillRect(slot.x, slot.y, NODE_W, NODE_H);
          ctx.globalAlpha = 0.7;
          ctx.lineWidth = 1.5 * px;
          ctx.setLineDash([6 * px, 4 * px]);
          ctx.strokeRect(slot.x, slot.y, NODE_W, NODE_H);
          ctx.setLineDash([]);
          ctx.globalAlpha = 1;
        }
      } else {
        // A colleague slot opens here: a bar in the gap, with round ends
        const vertical = stackedSiblings(t, i);
        const x0 = vertical ? t.x[i] + 4 : drop.kind === "before" ? t.x[i] - 10 : t.x[i] + NODE_W + 10;
        const y0 = vertical ? (drop.kind === "before" ? t.y[i] - 4 : t.y[i] + NODE_H + 4) : t.y[i] + 4;
        const x1 = vertical ? t.x[i] + NODE_W - 4 : x0;
        const y1 = vertical ? y0 : t.y[i] + NODE_H - 4;
        ctx.lineWidth = 4 * px;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
        ctx.lineCap = "butt";
        for (const [cx, cy] of [
          [x0, y0],
          [x1, y1],
        ]) {
          ctx.beginPath();
          ctx.arc(cx, cy, 5 * px, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (virt && detail === "overview" && sel >= 0 && sel < t.count) {
      ctx.lineWidth = 3 / k;
      ctx.strokeStyle = resolve("var(--color-text)");
      ctx.strokeRect(t.x[sel] - 4 / k, t.y[sel] - 4 / k, NODE_W + 8 / k, NODE_H + 8 / k);
    }

    // 3. Debug overlay, in screen pixels
    if (dbg) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = m.nodeGrid;
      const s = g.cellSize * k;
      const [c0, r0, c1, r1] = g.cellRange(vx0, vy0, vx1, vy1);
      ctx.lineWidth = 1;
      ctx.strokeStyle = resolve("var(--chart-1)");
      ctx.fillStyle = resolve("var(--chart-1)");
      ctx.font = "10px ui-monospace, monospace";
      ctx.globalAlpha = 0.35;
      if (s >= 6) {
        for (let r = r0; r <= r1; r++) {
          for (let c = c0; c <= c1; c++) {
            const x = c * g.cellSize * k + tx;
            const y = r * g.cellSize * k + ty;
            ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(s), Math.round(s));
            if (s >= 40) {
              const count = g.cellCount(c, r);
              if (count) ctx.fillText(String(count), x + 4, y + 12);
            }
          }
        }
      }
      ctx.globalAlpha = 1;
      // Culling area (what must be covered) and the rendered window around it
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = resolve("var(--chart-1)");
      ctx.strokeRect(cx0 * k + tx, cy0 * k + ty, (cx1 - cx0) * k, (cy1 - cy0) * k);
      const r = windowRect.current;
      if (virt && r) {
        ctx.strokeStyle = resolve("var(--chart-2)");
        ctx.strokeRect(r.x0 * k + tx, r.y0 * k + ty, (r.x1 - r.x0) * k, (r.y1 - r.y0) * k);
      }
      ctx.setLineDash([]);
    }

    // 4. HUD: written straight to the DOM, no React render per frame
    if (hud && hudRef.current) {
      const st = stats.current;
      const fmt = (v: number) => v.toLocaleString("en-US");
      hudRef.current.textContent =
        `zoom ${Math.round(k * 100)}% · ${detail}\n` +
        `DOM cards ${fmt(st.dom)} / ${fmt(t.count)}\n` +
        `canvas boxes ${fmt(st.canvas)} · lines ${fmt(st.edges)}${st.bitmap ? " (bitmap)" : ""}\n` +
        `grid cells ${fmt(st.cells)} · index ${m.buildMs.toFixed(0)} ms\n` +
        (searchOn ? `matches ${fmt(res.ranked.length)}${st.markers ? ` · markers ${fmt(st.markers)}` : ""}\n` : "") +
        `fps ${st.fps ? Math.round(st.fps) : "–"}`;
    }
  }, [resolve]);

  const schedule = React.useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
    meter();
  }, [draw]);

  /* ---- FPS meter: counts real frames for a second after each interaction */

  const meterState = React.useRef({ running: false, last: 0, frames: 0, since: 0, until: 0 });
  const meter = React.useCallback(() => {
    const s = meterState.current;
    s.until = performance.now() + 1000;
    if (s.running) return;
    s.running = true;
    s.frames = 0;
    s.since = performance.now();
    const tick = (now: number) => {
      s.frames++;
      if (now - s.since >= 500) {
        stats.current.fps = (s.frames * 1000) / (now - s.since);
        s.frames = 0;
        s.since = now;
        if (live.current.showStats && !frame.current) frame.current = requestAnimationFrame(draw);
      }
      if (now < s.until) requestAnimationFrame(tick);
      else s.running = false;
    };
    requestAnimationFrame(tick);
  }, [draw]);

  /* ---- Camera helpers --------------------------------------------------- */

  /** Camera that fits a world box with `pad` px around it, never closer than maxK. */
  const boxCamera = React.useCallback((x0: number, y0: number, x1: number, y1: number, maxK: number, pad: number): Camera => {
    const { w, h } = size.current;
    const k = Math.min(maxK, (w - pad * 2) / Math.max(x1 - x0, 1), (h - pad * 2) / Math.max(y1 - y0, 1));
    return { k, x: w / 2 - ((x0 + x1) / 2) * k, y: h / 2 - ((y0 + y1) / 2) * k };
  }, []);

  const fitCamera = React.useCallback((): Camera => {
    const t = live.current.model.layout;
    return boxCamera(0, 0, t.width, t.height, MAX_ZOOM, 24);
  }, [boxCamera]);

  const minZoom = React.useCallback(() => Math.min(COMPACT_AT, fitCamera().k * 0.8), [fitCamera]);

  const stopAnim = () => {
    cancelAnimationFrame(anim.current);
    anim.current = 0;
  };

  const animateTo = React.useCallback(
    (to: Camera) => {
      stopAnim();
      const from = { ...cam.current };
      if (prefersReducedMotion()) {
        cam.current = to;
        schedule();
        return;
      }
      // Fly as a view (center + visible width): zoom out while travelling, back in on arrival
      const { w, h } = size.current;
      const view = (c: Camera): View => [(w / 2 - c.x) / c.k, (h / 2 - c.y) / c.k, w / c.k];
      const path = zoomPath(view(from), view(to));
      // Longer perceived paths get more time, within limits that still feel responsive
      const duration = Math.min(1600, Math.max(260, path.S * 650));
      const start = performance.now();
      const step = (now: number) => {
        // rAF's timestamp is the frame start, which can be earlier than `start`
        const p = Math.min(1, Math.max(0, (now - start) / duration));
        if (p >= 1) {
          cam.current = to;
        } else {
          const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
          const [cx, cy, vwWorld] = path.at(e);
          const k = w / vwWorld;
          cam.current = { k, x: w / 2 - cx * k, y: h / 2 - cy * k };
        }
        schedule();
        anim.current = p < 1 ? requestAnimationFrame(step) : 0;
      };
      anim.current = requestAnimationFrame(step);
    },
    [schedule],
  );

  /** Zoom by `factor` keeping the screen point (sx, sy) fixed. */
  const zoomAt = React.useCallback(
    (sx: number, sy: number, factor: number) => {
      // A direct zoom wins over a flight in progress (keyboard +/- during a fly-to)
      stopAnim();
      const c = cam.current;
      const k = Math.min(MAX_ZOOM, Math.max(minZoom(), c.k * factor));
      const wx = (sx - c.x) / c.k;
      const wy = (sy - c.y) / c.k;
      cam.current = { k, x: sx - wx * k, y: sy - wy * k };
      schedule();
    },
    [minZoom, schedule],
  );

  /** Animated zoom around the viewport center (buttons, handle). */
  const zoomCenter = React.useCallback(
    (f: number) => {
      const { w, h } = size.current;
      const c = cam.current;
      const k = Math.min(MAX_ZOOM, Math.max(minZoom(), c.k * f));
      const wx = (w / 2 - c.x) / c.k;
      const wy = (h / 2 - c.y) / c.k;
      animateTo({ k, x: w / 2 - wx * k, y: h / 2 - wy * k });
    },
    [minZoom, animateTo],
  );

  const centerOn = React.useCallback(
    (i: number, minK: number, onlyIfHidden: boolean) => {
      const t = live.current.model.layout;
      const { w, h } = size.current;
      const c = cam.current;
      const margin = 32;
      const sx = t.x[i] * c.k + c.x;
      const sy = t.y[i] * c.k + c.y;
      const inView = sx >= margin && sy >= margin && sx + NODE_W * c.k <= w - margin && sy + NODE_H * c.k <= h - margin;
      if (onlyIfHidden && inView && c.k >= minK) return;
      const k = Math.max(c.k, minK);
      animateTo({ k, x: w / 2 - (t.x[i] + NODE_W / 2) * k, y: h / 2 - (t.y[i] + NODE_H / 2) * k });
    },
    [animateTo],
  );

  const announce = React.useCallback((i: number) => {
    const m = live.current.model;
    const node = m.nodes[i];
    const p = m.layout.parent[i];
    const reports = m.layout.childStart[i + 1] - m.layout.childStart[i];
    const parts = [node.title ? `${node.name}, ${node.title}` : node.name];
    parts.push(p === -1 ? "Top level" : `Reports to ${m.nodes[p].name}`);
    parts.push(reports === 0 ? "No direct reports" : `${reports} direct report${reports === 1 ? "" : "s"}`);
    if (liveRef.current) liveRef.current.textContent = parts.join(". ") + ".";
  }, []);

  const selectIndex = React.useCallback(
    (i: number, fly: boolean) => {
      const m = live.current.model;
      // Update the frame/keyboard copy now: the next key may arrive before React re-renders
      live.current.selected = i;
      select(i < 0 ? null : m.nodes[i].id);
      if (i < 0) return;
      if (!keyboardTarget.current(i)) announce(i);
      if (fly) centerOn(i, FULL_AT, true);
    },
    [select, announce, centerOn],
  );

  /** Select i and fly to it at full detail (search results, focusNode). */
  const goTo = React.useCallback(
    (i: number) => {
      live.current.selected = i;
      select(live.current.model.nodes[i].id);
      if (!keyboardTarget.current(i)) announce(i);
      centerOn(i, 1, false);
    },
    [select, announce, centerOn],
  );

  /** Fit a set of node indices in view (one node: fly to it). */
  const fitIndices = React.useCallback(
    (ids: ArrayLike<number>) => {
      if (ids.length === 0) return;
      if (ids.length === 1) return goTo(ids[0]);
      const t = live.current.model.layout;
      let x0 = Infinity;
      let y0 = Infinity;
      let x1 = -Infinity;
      let y1 = -Infinity;
      for (let n = 0; n < ids.length; n++) {
        const i = ids[n];
        if (t.x[i] < x0) x0 = t.x[i];
        if (t.y[i] < y0) y0 = t.y[i];
        if (t.x[i] > x1) x1 = t.x[i];
        if (t.y[i] > y1) y1 = t.y[i];
      }
      animateTo(boxCamera(x0, y0, x1 + NODE_W, y1 + NODE_H, 1, 56));
      if (liveRef.current) liveRef.current.textContent = `Showing ${ids.length.toLocaleString("en-US")} matches.`;
    },
    [goTo, animateTo, boxCamera],
  );

  /* ---- Editing: evaluate drops, drag lifecycle, commit ------------------- */

  const say = (text: string) => {
    if (liveRef.current) liveRef.current.textContent = text;
  };

  /** Adds validity to a drop: not into your own team, not vetoed by canMove. */
  const evaluateDrop = (d: Drop | null, dragged: number): DropState | null => {
    if (!d) return null;
    const { model: m, edit: ed } = live.current;
    let reason: DropState["reason"] = "";
    if (d.noop) reason = "same";
    else if (dragged >= 0 && d.parent !== -1 && inSubtree(m.layout, d.parent, dragged)) reason = "own-team";
    else if (ed.canMove && !ed.canMove(dragged >= 0 ? m.nodes[dragged] : null, d.parent === -1 ? null : m.nodes[d.parent]))
      reason = "not-allowed";
    return { ...d, valid: reason === "", reason };
  };

  /** Same manager, dropped on them: a reorder to the end of their team, not a new manager. */
  const isReorderToEnd = (d: Drop, dragged: number) =>
    d.kind === "child" && dragged >= 0 && live.current.model.layout.parent[dragged] === d.parent;

  const describeDrop = (d: DropState | null, who: string) => {
    if (!d) return "Drop on a person";
    const name = live.current.model.nodes[d.target].name;
    const st = dragState.current;
    if (d.valid && st && isReorderToEnd(d, st.dragged)) return `Last in ${name}'s team`;
    if (d.reason === "same") return "Same place";
    if (d.reason === "own-team") return `Can't move ${who} into their own team`;
    if (d.reason === "not-allowed") return "Not allowed here";
    return d.kind === "child" ? `Report to ${name}` : d.kind === "before" ? `Before ${name}` : `After ${name}`;
  };

  /** New drop under the pointer: repaint the indicator, relabel the ghost only when it changed. */
  const setDrop = (d: DropState | null) => {
    const old = dropRef.current;
    dropRef.current = d;
    if (old?.target === d?.target && old?.kind === d?.kind && old?.valid === d?.valid) return;
    const st = dragState.current;
    const who = st && st.dragged >= 0 ? live.current.model.nodes[st.dragged].name : "them";
    setDropLabel(describeDrop(d, who));
    setDropView(
      !d || d.reason === "same"
        ? null
        : !d.valid
          ? { target: d.target, state: "invalid" }
          : d.kind === "child"
            ? { target: d.target, state: "target" }
            : null,
    );
    // "Same place" isn't an error: neutral, not red
    if (rootRef.current) rootRef.current.dataset.drag = !d || d.reason === "same" ? "none" : d.valid ? "valid" : "invalid";
    schedule();
  };

  const updatePointerDrop = () => {
    const st = dragState.current;
    if (!st || st.mode === "keyboard") return;
    const m = live.current.model;
    const c = cam.current;
    const wx = (st.pointer.x - c.x) / c.k;
    const wy = (st.pointer.y - c.y) / c.k;
    setDrop(evaluateDrop(findDrop(m.layout, m.nodeGrid, m.roots, wx, wy, st.dragged, dropScratch.current), st.dragged));
  };

  const moveGhost = (p: { x: number; y: number }) => {
    const o = ghostOffset.current;
    if (ghostRef.current) ghostRef.current.style.transform = `translate(${p.x - o.x}px, ${p.y - o.y}px)`;
  };

  /** Near an edge while dragging, pan toward it: the target can be off screen (it mounts as you arrive). */
  const startEdgePan = () => {
    if (edgePan.current) return;
    const tick = () => {
      const st = dragState.current;
      if (!st || st.mode === "keyboard") {
        edgePan.current = 0;
        return;
      }
      const { w, h } = size.current;
      const { x, y } = st.pointer;
      const push = (d: number) => Math.min(1.5, Math.max(0, (EDGE - d) / EDGE));
      const dx = push(x) - push(w - x);
      const dy = push(y) - push(h - y);
      if (dx || dy) {
        cam.current = { ...cam.current, x: cam.current.x + dx * EDGE_SPEED, y: cam.current.y + dy * EDGE_SPEED };
        updatePointerDrop();
        schedule();
      }
      edgePan.current = requestAnimationFrame(tick);
    };
    edgePan.current = requestAnimationFrame(tick);
  };

  /** `grabFrom`: where the pointer went down, so the preview stays held at that spot of the card. */
  const beginDrag = (
    mode: "pointer" | "external" | "keyboard",
    dragged: number,
    pointer: { x: number; y: number },
    grabFrom?: { x: number; y: number },
  ) => {
    dragState.current = { mode, dragged, pointer };
    dropRef.current = null;
    dropFrom.current = null;
    let scale = 1;
    let team = 0;
    let fromX = 0;
    let fromY = 0;
    // The preview trails the pointer (below-right) so the tip and the target under it stay visible
    ghostOffset.current = { x: -TRAIL, y: -TRAIL };
    if (mode === "pointer" && dragged >= 0) {
      const t = live.current.model.layout;
      const c = cam.current;
      scale = Math.min(PREVIEW_MAX, Math.max(PREVIEW_MIN, c.k));
      const from = grabFrom ?? pointer;
      const fx = Math.min(1, Math.max(0, ((from.x - c.x) / c.k - t.x[dragged]) / NODE_W));
      const fy = Math.min(1, Math.max(0, ((from.y - c.y) / c.k - t.y[dragged]) / NODE_H));
      // Pick-up starts with the card exactly where it was grabbed, then glides to its trailing spot
      fromX = -(fx * NODE_W * scale + TRAIL);
      fromY = -(fy * NODE_H * scale + TRAIL);
      team = teamSize(t, dragged);
    }
    setDragging({ dragged, ghost: mode !== "keyboard", scale, team, fromX, fromY });
    setDropView(null);
    setDropLabel(mode === "keyboard" ? "" : "Drop on a person");
    setPanning(false);
    if (mode !== "keyboard") startEdgePan();
  };

  /**
   * Ends any drag and hands back what was under it; the caller decides whether to commit.
   * `snapBack`: the preview flies home to the card's slot (cancelled or refused drop).
   */
  const finishDrag = (opts: { snapBack?: boolean } = {}) => {
    const st = dragState.current;
    const drop = dropRef.current;
    const o = ghostOffset.current;
    const preview = st ? { x: st.pointer.x - o.x, y: st.pointer.y - o.y } : null;
    const ghost = ghostRef.current;
    const t = live.current.model.layout;
    if (opts.snapBack && ghost && st?.mode === "pointer" && st.dragged >= 0 && st.dragged < t.count && !prefersReducedMotion()) {
      // Keep a copy of the preview on screen just long enough to fly it back
      const copy = ghost.cloneNode(true) as HTMLElement;
      copy.classList.add("is-returning");
      rootRef.current?.appendChild(copy);
      const c = cam.current;
      const ox = t.x[st.dragged] * c.k + c.x;
      const oy = t.y[st.dragged] * c.k + c.y;
      copy
        .animate([{ transform: ghost.style.transform }, { transform: `translate(${ox}px, ${oy}px)`, opacity: 0 }], {
          duration: 260,
          easing: "cubic-bezier(0.2, 0, 0, 1)",
        })
        .finished.finally(() => copy.remove());
    }
    cancelAnimationFrame(edgePan.current);
    edgePan.current = 0;
    dragState.current = null;
    dropRef.current = null;
    setDragging(null);
    setDropLabel("");
    setDropView(null);
    rootRef.current?.removeAttribute("data-drag");
    schedule();
    return { st, drop, preview };
  };

  /**
   * Reports a move and keeps the moved person selected. `anchor` is what stays put on screen when
   * the new data arrives: the drop target for a drop (where you were looking), the person for
   * one-step keyboard moves (where the focus is).
   */
  const commitMove = (
    dragged: number,
    d: DropState,
    anchor: "target" | "moved",
    from?: { x: number; y: number } | null,
  ) => {
    const { model: m, edit: ed } = live.current;
    const node = m.nodes[dragged];
    if (from && dragging) dropFrom.current = { id: node.id, ...from, scale: dragging.scale, at: performance.now() };
    const parentId = d.parent === -1 ? null : m.nodes[d.parent].id;
    if (import.meta.env.DEV && !ed.onMove) console.warn("[ds] <OrgChart editable> has no onMove: the move is ignored.");
    editAnchor.current = anchor === "target" ? m.nodes[d.target].id : node.id;
    editFocus.current = node.id;
    live.current.selected = dragged;
    select(node.id);
    ed.onMove?.({ id: node.id, parentId, index: d.index });
    const target = m.nodes[d.target].name;
    say(
      m.layout.parent[dragged] === d.parent
        ? // Same manager: a reorder
          d.kind === "child"
          ? `Moved ${node.name} to the end of the team.`
          : `Moved ${node.name} ${d.kind} ${target}.`
        : `Moved ${node.name}. ${d.parent === -1 ? "Now top level." : `Now reports to ${m.nodes[d.parent].name}.`}`,
    );
  };

  /** Keyboard move mode: the selected person is the drop target ("report to them"). */
  const keyboardTarget = React.useRef<(i: number) => boolean>(() => false);
  keyboardTarget.current = (i: number) => {
    const st = dragState.current;
    if (st?.mode !== "keyboard") return false;
    const m = live.current.model;
    const d = evaluateDrop(resolveDrop(m.layout, m.roots, i, "child", st.dragged), st.dragged);
    setDrop(d);
    const who = m.nodes[st.dragged].name;
    const action = !d?.valid
      ? `${describeDrop(d, who)}.`
      : isReorderToEnd(d, st.dragged)
        ? `Press Enter: ${who} moves to the end of their team.`
        : `Press Enter: ${who} will report to them.`;
    say(`${m.nodes[i].name}. ${action}`);
    return true;
  };

  /** Alt + arrows: one-step structural moves of the selected person. */
  const keyMove = (sel: number, target: number, kind: DropKind) => {
    const m = live.current.model;
    const d = evaluateDrop(resolveDrop(m.layout, m.roots, target, kind, sel), sel);
    if (d?.valid) commitMove(sel, d, "moved");
    else say(d?.reason === "not-allowed" ? "That move isn't allowed." : "Can't move there.");
  };

  React.useImperativeHandle(
    ref,
    () => ({
      fit: () => animateTo(fitCamera()),
      zoomBy: zoomCenter,
      focusNode: (id) => {
        const i = live.current.model.index.get(id);
        if (i !== undefined) goTo(i);
      },
      fitTo: (ids) => {
        const m = live.current.model;
        const list: number[] = [];
        for (const id of ids) {
          const i = m.index.get(id);
          if (i !== undefined) list.push(i);
        }
        fitIndices(list);
      },
      focusSearch: () => searchInputRef.current?.focus(),
    }),
    [animateTo, fitCamera, zoomCenter, goTo, fitIndices],
  );

  /* ---- Size, data, theme ----------------------------------------------- */

  const initialView = React.useCallback(() => {
    const m = live.current.model;
    const { w } = size.current;
    if (!w || !m.roots.length) return;
    // Start on the top of the org at full detail
    const r = m.roots[0];
    cam.current = { k: 1, x: w / 2 - (m.layout.x[r] + NODE_W / 2), y: 32 - m.layout.y[r] };
    needsInitialView.current = false;
  }, []);

  React.useLayoutEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ro = new ResizeObserver(() => {
      const rect = root.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      size.current = { w: rect.width, h: rect.height, dpr };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      if (needsInitialView.current) initialView();
      windowRect.current = null;
      schedule();
    });
    ro.observe(root);
    return () => ro.disconnect();
  }, [initialView, schedule]);

  // New data. An edit of the same org (the moved person, the selection or the top person
  // still exists): keep the view anchored and slide visible cards from their old places.
  // A different org: back to the top.
  const prevModel = React.useRef(model);
  React.useLayoutEffect(() => {
    const prev = prevModel.current;
    if (prev === model) return;
    prevModel.current = model;
    stopAnim();
    if (dragState.current) finishDrag();
    windowRect.current = null;
    naiveKey.current = "";

    const sel = live.current.selected;
    const anchorId = editAnchor.current ?? (sel >= 0 && sel < model.layout.count ? model.nodes[sel].id : null);
    editAnchor.current = null;
    const a = anchorId != null ? prev.index.get(anchorId) : undefined;
    const b = anchorId != null ? model.index.get(anchorId) : undefined;
    const sameTop = prev.roots.length > 0 && model.roots.length > 0 && prev.nodes[prev.roots[0]].id === model.nodes[model.roots[0]].id;

    if ((a !== undefined && b !== undefined) || sameTop) {
      const ax = a !== undefined && b !== undefined ? prev.layout.x[a] - model.layout.x[b] : 0;
      const ay = a !== undefined && b !== undefined ? prev.layout.y[a] - model.layout.y[b] : 0;
      const c = cam.current;
      cam.current = { ...c, x: c.x + ax * c.k, y: c.y + ay * c.k };
      // FLIP: cards are already at their new places; start each at its old one and animate back.
      // Only the cards in view exist, so this is ~100 animations, never 100k.
      if (!prefersReducedMotion() && worldRef.current) {
        // The card just dropped starts where its preview was let go, at the preview's size
        const from = dropFrom.current && performance.now() - dropFrom.current.at < 1500 ? dropFrom.current : null;
        dropFrom.current = null;
        const k = cam.current.k;
        for (const el of worldRef.current.querySelectorAll<HTMLElement>(".ds-org-card[data-id]")) {
          const id = el.dataset.id!;
          const i = prev.index.get(id);
          const j = model.index.get(id);
          if (i === undefined || j === undefined) continue;
          if (from && id === from.id) {
            const fx = (from.x - cam.current.x) / k - model.layout.x[j];
            const fy = (from.y - cam.current.y) / k - model.layout.y[j];
            el.animate(
              [
                { transform: `translate(${fx}px, ${fy}px) scale(${from.scale / k})`, transformOrigin: "0 0" },
                { transform: "none", transformOrigin: "0 0" },
              ],
              { duration: 340, easing: "cubic-bezier(0.2, 0, 0, 1)" },
            );
            continue;
          }
          const dx = prev.layout.x[i] - model.layout.x[j] - ax;
          const dy = prev.layout.y[i] - model.layout.y[j] - ay;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
          el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], {
            duration: 320,
            easing: "cubic-bezier(0.2, 0, 0, 1)",
          });
        }
      }
    } else {
      needsInitialView.current = true;
      initialView();
      setWin({ ids: [], detail: "full" });
    }
    // Apply the camera before paint: never a frame with new positions under the old camera
    cancelAnimationFrame(frame.current);
    frame.current = 0;
    draw();
    // The moved person's new place can be off screen (end of a long team): glide just enough to show them
    const focusId = editFocus.current;
    editFocus.current = null;
    const f = focusId != null ? model.index.get(focusId) : undefined;
    if (f !== undefined) centerOn(f, cam.current.k, true);
  }, [model, initialView, draw, centerOn]);

  // Paint the overview bitmap while idle, so the first zoom-out doesn't hitch
  React.useEffect(() => {
    if (!virtualize) return;
    const build = () => snapshotFor(model);
    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(build, { timeout: 2000 });
      return () => cancelIdleCallback(id);
    }
    const id = setTimeout(build, 200);
    return () => clearTimeout(id);
  }, [model, virtualize, snapshotFor]);

  // Props the frame reads: redraw (and re-cull) when they change
  React.useEffect(() => {
    windowRect.current = null;
    schedule();
  }, [virtualize, overscan, debug, showStats, selected, schedule]);

  // New search results: repaint markers and dimming
  React.useEffect(() => {
    schedule();
  }, [result, schedule]);

  // Theme switch: canvas colors are resolved values, so drop the cache
  React.useEffect(() => {
    const reset = () => {
      colorCache.current.clear();
      snapshot.current = null;
      schedule();
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", reset);
    const mo = new MutationObserver(reset);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    return () => {
      mq.removeEventListener("change", reset);
      mo.disconnect();
    };
  }, [schedule]);

  React.useEffect(
    () => () => {
      // Reset the ids too: StrictMode remounts, and a stale id would block schedule()
      cancelAnimationFrame(frame.current);
      cancelAnimationFrame(anim.current);
      frame.current = 0;
      anim.current = 0;
    },
    [],
  );

  /* ---- Input ------------------------------------------------------------ */

  // Wheel needs a non-passive listener to stop the page from scrolling
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      // The results list scrolls natively
      if ((e.target as HTMLElement).closest(".ds-org-search")) return;
      e.preventDefault();
      stopAnim();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? size.current.h : 1;
      let dx = e.deltaX * unit;
      let dy = e.deltaY * unit;
      const rect = root.getBoundingClientRect();
      if (e.ctrlKey || e.metaKey) {
        // Pinch on a trackpad arrives as ctrl+wheel with small deltas; a mouse wheel notch is ~100
        const speed = Math.abs(dy) >= 50 ? 0.002 : 0.01;
        zoomAt(e.clientX - rect.left, e.clientY - rect.top, Math.exp(-dy * speed));
        return;
      }
      if (e.shiftKey && !dx) {
        dx = dy;
        dy = 0;
      }
      cam.current = { ...cam.current, x: cam.current.x - dx, y: cam.current.y - dy };
      schedule();
    };
    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [zoomAt, schedule]);

  const pointers = React.useRef(new Map<number, { x: number; y: number }>());
  const gesture = React.useRef<{
    sx: number;
    sy: number;
    cam: Camera;
    moved: boolean;
    pinch?: { dist: number; mx: number; my: number };
    /** Card under the pointer at the start (editable): a drag from here moves it instead of panning. */
    candidate?: number;
    touch?: boolean;
    timer?: number;
  } | null>(null);
  const [panning, setPanning] = React.useState(false);

  const local = (e: React.PointerEvent) => {
    const rect = rootRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startGesture = () => {
    const pts = [...pointers.current.values()];
    if (pts.length === 1) {
      gesture.current = { sx: pts[0].x, sy: pts[0].y, cam: { ...cam.current }, moved: false };
    } else if (pts.length === 2) {
      const [a, b] = pts;
      gesture.current = {
        sx: 0,
        sy: 0,
        cam: { ...cam.current },
        moved: true,
        pinch: { dist: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 },
      };
    }
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest(".ds-org-tools, .ds-org-search")) return;
    stopAnim();
    // A click or a second finger ends any move in progress
    if (dragState.current) finishDrag();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // The pointer is already gone (released mid-dispatch): the gesture still works without capture
    }
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    startGesture();
    const g = gesture.current;
    if (g && live.current.edit.editable && pointers.current.size === 1) {
      const c = cam.current;
      const wx = (p.x - c.x) / c.k;
      const wy = (p.y - c.y) / c.k;
      const hits: number[] = [];
      live.current.model.nodeGrid.query(wx, wy, wx, wy, hits);
      g.candidate = hits.length ? hits[0] : -1;
      g.touch = e.pointerType === "touch";
      // Touch: press and hold picks the card up; moving first pans as usual
      if (g.touch && g.candidate >= 0) {
        const id = e.pointerId;
        g.timer = window.setTimeout(() => {
          if (gesture.current !== g || g.moved) return;
          g.moved = true;
          const at = pointers.current.get(id) ?? p;
          beginDrag("pointer", g.candidate!, at, p);
          updatePointerDrop();
        }, LONG_PRESS);
      }
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
    const st = dragState.current;
    if (st?.mode === "pointer") {
      st.pointer = local(e);
      moveGhost(st.pointer);
      updatePointerDrop();
      return;
    }
    const g = gesture.current;
    const pts = [...pointers.current.values()];
    if (g.pinch && pts.length >= 2) {
      const [a, b] = pts;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const k = Math.min(MAX_ZOOM, Math.max(minZoom(), (g.cam.k * dist) / g.pinch.dist));
      // The world point under the starting midpoint follows the fingers
      const wx = (g.pinch.mx - g.cam.x) / g.cam.k;
      const wy = (g.pinch.my - g.cam.y) / g.cam.k;
      cam.current = { k, x: mx - wx * k, y: my - wy * k };
      schedule();
      return;
    }
    const p = pts[0];
    const dx = p.x - g.sx;
    const dy = p.y - g.sy;
    if (!g.moved && Math.hypot(dx, dy) > 3) {
      clearTimeout(g.timer);
      g.moved = true;
      // Started on a card (mouse, pen): this drag moves the card
      if (g.candidate !== undefined && g.candidate >= 0 && !g.touch) {
        beginDrag("pointer", g.candidate, p, { x: g.sx, y: g.sy });
        moveGhost(p);
        updatePointerDrop();
        return;
      }
      setPanning(true);
    }
    if (g.moved) {
      cam.current = { ...cam.current, x: g.cam.x + dx, y: g.cam.y + dy };
      schedule();
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const g = gesture.current;
    if (g) clearTimeout(g.timer);
    if (dragState.current?.mode === "pointer") {
      pointers.current.delete(e.pointerId);
      const ok = e.type === "pointerup" && !!dropRef.current?.valid;
      const { st, drop, preview } = finishDrag({ snapBack: !ok });
      if (ok && st && drop) commitMove(st.dragged, drop, "target", preview);
      gesture.current = null;
      setPanning(false);
      return;
    }
    const p = pointers.current.get(e.pointerId)!;
    pointers.current.delete(e.pointerId);
    if (g && !g.moved && e.type === "pointerup") {
      // A click: hit-test through the same grid instead of the DOM, so it works in overview too
      const c = cam.current;
      const wx = (p.x - c.x) / c.k;
      const wy = (p.y - c.y) / c.k;
      const hits: number[] = [];
      live.current.model.nodeGrid.query(wx, wy, wx, wy, hits);
      selectIndex(hits.length ? hits[0] : -1, false);
    }
    if (pointers.current.size) startGesture();
    else {
      gesture.current = null;
      setPanning(false);
    }
  };

  /* ---- Drops from outside: native drag and drop with our dataTransfer type */

  const acceptsExternal = (e: React.DragEvent) =>
    live.current.edit.editable && Array.from(e.dataTransfer.types).includes(live.current.edit.externalType);

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!acceptsExternal(e)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const p = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const st = dragState.current;
    if (st?.mode !== "external") beginDrag("external", -1, p);
    else st.pointer = p;
    moveGhost(p);
    updatePointerDrop();
    e.dataTransfer.dropEffect = dropRef.current?.valid ? "copy" : "none";
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragState.current?.mode !== "external") return;
    // Moving between the chart's own children also fires dragleave
    if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget as Node)) return;
    finishDrag();
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (dragState.current?.mode !== "external") return;
    e.preventDefault();
    const { drop } = finishDrag();
    if (!drop?.valid) return;
    const { model: m, edit: ed } = live.current;
    const parentId = drop.parent === -1 ? null : m.nodes[drop.parent].id;
    editAnchor.current = parentId ?? m.nodes[drop.target].id;
    ed.onDropExternal?.({ data: e.dataTransfer.getData(ed.externalType), parentId, index: drop.index });
    say(drop.parent === -1 ? "Dropped at the top level." : `Dropped under ${m.nodes[drop.parent].name}.`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const m = live.current.model;
    const t = m.layout;
    const sel = live.current.selected;
    const { w, h } = size.current;

    // The browser's find can't see cards that aren't rendered: send it to our search
    if (search && (e.key === "/" || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f"))) {
      e.preventDefault();
      searchInputRef.current?.focus();
      return;
    }

    // Keyboard move mode: arrows pick the new manager (below), Enter drops, Escape cancels
    const st = dragState.current;
    if (st && (e.key === "Escape" || (st.mode === "keyboard" && e.key === "Enter"))) {
      e.preventDefault();
      const { drop } = finishDrag({ snapBack: e.key === "Escape" });
      if (e.key === "Enter" && drop?.valid) commitMove(st.dragged, drop, "target");
      else say("Move cancelled.");
      return;
    }
    if (live.current.edit.editable && !st && sel >= 0) {
      if ((e.key === "m" || e.key === "M") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        beginDrag("keyboard", sel, { x: 0, y: 0 });
        say(`Moving ${m.nodes[sel].name}. Arrow keys or search choose the new manager, Enter drops, Escape cancels.`);
        return;
      }
      if (e.altKey && e.key.startsWith("Arrow")) {
        e.preventDefault();
        const [list, at] = siblingsOf(m, sel);
        if (e.key === "ArrowLeft" && at > 0) keyMove(sel, list[at - 1], "before");
        else if (e.key === "ArrowRight" && at < list.length - 1) keyMove(sel, list[at + 1], "after");
        else if (e.key === "ArrowUp" && t.parent[sel] !== -1) keyMove(sel, t.parent[sel], "after");
        else if (e.key === "ArrowDown" && at > 0) keyMove(sel, list[at - 1], "child");
        else say("Can't move further that way.");
        return;
      }
    }

    if (e.shiftKey && e.key.startsWith("Arrow")) {
      const step = 120;
      const d = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
      if (d) {
        e.preventDefault();
        animateTo({ ...cam.current, x: cam.current.x + d[0], y: cam.current.y + d[1] });
      }
      return;
    }

    let next = -2;
    switch (e.key) {
      case "ArrowUp":
        next = sel < 0 ? (m.roots[0] ?? -1) : t.parent[sel] === -1 ? sel : t.parent[sel];
        break;
      case "ArrowDown":
        next = sel < 0 ? (m.roots[0] ?? -1) : t.childStart[sel + 1] > t.childStart[sel] ? t.childList[t.childStart[sel]] : sel;
        break;
      case "ArrowLeft":
      case "ArrowRight": {
        if (sel < 0) {
          next = m.roots[0] ?? -1;
          break;
        }
        const [list, at] = siblingsOf(m, sel);
        const to = at + (e.key === "ArrowLeft" ? -1 : 1);
        next = to >= 0 && to < list.length ? list[to] : sel;
        break;
      }
      case "Home":
        next = m.roots[0] ?? -1;
        break;
      case "Escape":
        if (sel >= 0) {
          e.preventDefault();
          selectIndex(-1, false);
        }
        return;
      case "+":
      case "=":
        e.preventDefault();
        zoomAt(w / 2, h / 2, 1.25);
        return;
      case "-":
      case "_":
        e.preventDefault();
        zoomAt(w / 2, h / 2, 0.8);
        return;
      case "0":
        e.preventDefault();
        animateTo(fitCamera());
        return;
    }
    if (next === -2) return;
    e.preventDefault();
    if (next >= 0) selectIndex(next, true);
  };

  /* ---- Render ------------------------------------------------------------ */

  const t = model.layout;
  // Managers above the selected person (the highlighted line runs through them)
  const pathSet = React.useMemo(() => {
    const set = new Set<number>();
    if (selected < 0 || selected >= t.count) return set;
    for (let v = t.parent[selected]; v !== -1; v = t.parent[v]) set.add(v);
    return set;
  }, [selected, t]);
  const searchOn = searching && result.mask.length === t.count;
  // Right after an edit the window still indexes the old data: map it by id until the next frame re-culls
  const winIds = React.useMemo(() => {
    const from = win.model;
    if (!from || from === model) return win.ids;
    const out: number[] = [];
    for (const i of win.ids) {
      const j = i < from.nodes.length ? model.index.get(from.nodes[i].id) : undefined;
      if (j !== undefined) out.push(j);
    }
    return out;
  }, [win, model]);
  const draggedIdx = dragging && dragging.dragged < t.count ? dragging.dragged : -1;
  const cards = winIds.map((i) =>
    i < t.count ? (
      <OrgCard
        // Keyed by id, not index: after an edit the same person keeps the same element (and slides)
        key={model.nodes[i].id}
        node={model.nodes[i]}
        x={t.x[i]}
        y={t.y[i]}
        detail={win.detail}
        reports={t.childStart[i + 1] - t.childStart[i]}
        selected={i === selected}
        onPath={pathSet.has(i)}
        search={searchOn ? (result.mask[i] ? "match" : "dim") : undefined}
        highlight={searchOn && result.mask[i] ? result.query : undefined}
        dragging={draggedIdx < 0 ? undefined : i === draggedIdx ? "origin" : inSubtree(t, i, draggedIdx) ? "team" : undefined}
        drop={dropView?.target === i ? dropView.state : undefined}
      />
    ) : null,
  );

  const searchOption = React.useCallback(
    (n: number): SearchOption => {
      const i = result.ranked[n];
      const node = model.nodes[i];
      return { index: i, name: node.name, title: node.title, path: managersOf(model, i) };
    },
    [result, model],
  );

  // Without virtualization the connectors are DOM too: one SVG path for all of them
  const naiveEdges = React.useMemo(() => {
    if (virtualize) return null;
    const { pts, len } = model.edges;
    let d = "";
    for (let c = 0; c < t.count; c++) {
      if (!len[c]) continue;
      const o = c * 8;
      d += `M${pts[o]} ${pts[o + 1]}`;
      for (let p = 1; p < len[c]; p++) d += `L${pts[o + p * 2]} ${pts[o + p * 2 + 1]}`;
    }
    return d;
  }, [virtualize, model, t.count]);

  return (
    <div
      ref={rootRef}
      className={cx("ds-org", panning && "is-panning", className)}
      style={
        {
          height,
          "--ds-org-height": `${height}px`,
          "--ds-org-w": `${NODE_W}px`,
          "--ds-org-h": `${NODE_H}px`,
        } as React.CSSProperties
      }
      role="application"
      aria-roledescription="org chart"
      aria-label={ariaLabel}
      aria-describedby={hintId}
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onDragEnter={onDragOver}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      data-editable={editable ? "" : undefined}
      data-dragging={dragging ? "" : undefined}
    >
      <canvas ref={canvasRef} className="ds-org-canvas" aria-hidden="true" />
      <div ref={worldRef} className="ds-org-world" aria-hidden="true">
        {naiveEdges && (
          <svg className="ds-org-naive-edges" width={t.width} height={t.height}>
            <path d={naiveEdges} />
          </svg>
        )}
        {cards}
      </div>

      {search && (
        <OrgChartSearch
          inputRef={searchInputRef}
          value={query}
          onChange={setQuery}
          resultQuery={result.query}
          count={searchOn ? result.ranked.length : 0}
          option={searchOption}
          onPick={(i) => {
            goTo(i);
            // Back to the chart: arrow keys now walk the org from the person found
            rootRef.current?.focus({ preventScroll: true });
          }}
          onShowAll={() => fitIndices(result.ranked)}
          onExit={() => rootRef.current?.focus({ preventScroll: true })}
        />
      )}

      <div className="ds-org-tools">
        <IconButton size="sm" variant="outline" icon={<PlusIcon />} aria-label="Zoom in" onClick={() => zoomCenter(1.5)} />
        <IconButton size="sm" variant="outline" icon={<MinusIcon />} aria-label="Zoom out" onClick={() => zoomCenter(1 / 1.5)} />
        <IconButton size="sm" variant="outline" icon={<MaximizeIcon />} aria-label="Fit to view" onClick={() => animateTo(fitCamera())} />
      </div>
      {showStats && <div ref={hudRef} className="ds-org-hud" aria-hidden="true" />}

      {dragging?.ghost && (
        <div
          ref={ghostRef}
          className="ds-org-drag"
          aria-hidden="true"
          style={{
            transform: `translate(${(dragState.current?.pointer.x ?? 0) - ghostOffset.current.x}px, ${
              (dragState.current?.pointer.y ?? 0) - ghostOffset.current.y
            }px)`,
          }}
        >
          {draggedIdx >= 0 && (
            // The card itself, lifted, held where it was grabbed; a team shows as a stack behind it
            <div
              className="ds-org-drag-card"
              data-team={dragging.team > 0 ? "" : undefined}
              style={
                {
                  width: NODE_W * dragging.scale,
                  height: NODE_H * dragging.scale,
                  "--ds-org-pickup-x": `${dragging.fromX}px`,
                  "--ds-org-pickup-y": `${dragging.fromY}px`,
                } as React.CSSProperties
              }
            >
              <div className="ds-org-drag-scale" style={{ transform: `scale(${dragging.scale})` }}>
                <OrgCard
                  node={model.nodes[draggedIdx]}
                  x={0}
                  y={0}
                  detail="full"
                  reports={t.childStart[draggedIdx + 1] - t.childStart[draggedIdx]}
                  selected={false}
                  onPath={false}
                />
              </div>
              {dragging.team > 0 && (
                <span className="ds-org-drag-team">
                  +{dragging.team.toLocaleString("en-US")} {dragging.team === 1 ? "person" : "people"}
                </span>
              )}
            </div>
          )}
          {dropLabel && <span className="ds-org-drag-label">{dropLabel}</span>}
        </div>
      )}

      <span ref={probeRef} className="ds-org-probe" aria-hidden="true" />
      <p id={hintId} className="ds-visually-hidden">
        {model.nodes.length.toLocaleString("en-US")} people. Arrow keys move between people: up to the manager, down to
        the first report, left and right between colleagues. Shift with arrows pans, plus and minus zoom, 0 fits the whole
        chart.{search ? " Slash or Control F searches." : ""}
        {editable
          ? " M moves the selected person: choose the new manager with the arrow keys or search, then Enter. Alt with left and right reorders among colleagues, Alt up moves next to the manager, Alt down under the previous colleague."
          : ""}
      </p>
      <div ref={liveRef} className="ds-visually-hidden" aria-live="polite" />
    </div>
  );
}
