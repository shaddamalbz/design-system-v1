import * as React from "react";
import { cx } from "../../utils/cx";
import { IconButton } from "../button";
import { MaximizeIcon, MinusIcon, PlusIcon } from "../../icons";
import { NODE_H, NODE_W, buildEdges, layoutTree, nodeBoxes, type EdgeGeometry, type TreeLayout } from "./layout";
import { SpatialGrid } from "./spatial-grid";

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
  className?: string;
  ref?: React.Ref<OrgChartHandle>;
}

const FULL_AT = 0.6;
const COMPACT_AT = 0.28;
const MAX_ZOOM = 2;
const DEBUG_INSET = 0.2;
const FALLBACK_COLOR = "var(--chart-other)";
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
}

const OrgCard = React.memo(function OrgCard({ node, x, y, detail, reports, selected }: CardProps) {
  return (
    <div
      className="ds-org-card"
      data-detail={detail}
      data-selected={selected ? "" : undefined}
      style={{ left: x, top: y, "--_c": node.color ?? FALLBACK_COLOR } as React.CSSProperties}
    >
      {detail === "full" ? (
        <>
          <span className="ds-org-avatar">{initials(node.name)}</span>
          <span className="ds-org-text">
            <span className="ds-org-name">{node.name}</span>
            {node.title && <span className="ds-org-title">{node.title}</span>}
          </span>
          {reports > 0 && <span className="ds-org-count">{reports}</span>}
        </>
      ) : (
        <span className="ds-org-name">{node.name}</span>
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
  className,
  ref,
}: OrgChartProps) {
  const model = React.useMemo(() => buildModel(nodes), [nodes]);

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
  const stats = React.useRef({ dom: 0, canvas: 0, edges: 0, cells: 0, fps: 0, bitmap: false });
  const colorCache = React.useRef(new Map<string, string>());

  // Latest props for the frame loop, which runs outside React renders
  const live = React.useRef({ model, virtualize, overscan, debug, showStats, selected, win });
  React.useLayoutEffect(() => {
    live.current = { model, virtualize, overscan, debug, showStats, selected, win };
  });

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
    const { model: m, virtualize: virt, overscan: over, debug: dbg, showStats: hud, selected: sel, win: w } = live.current;
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
        if (w.ids.length) setWin({ ids: [], detail });
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
        setWin({ ids, detail });
      }
    } else {
      const naiveDetail = detail === "overview" ? "compact" : detail;
      const key = `${t.count}:${naiveDetail}`;
      if (naiveKey.current !== key) {
        naiveKey.current = key;
        setWin({ ids: Array.from({ length: t.count }, (_, i) => i), detail: naiveDetail });
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
      ctx.drawImage(snap.canvas, 0, 0, snap.canvas.width, snap.canvas.height, 0, 0, t.width, t.height);
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
        paintBoxes(ctx, m, nodeIds, resolve);
      } else {
        stats.current.canvas = 0;
      }
    } else {
      stats.current.edges = Math.max(0, t.count - m.roots.length);
      stats.current.canvas = 0;
    }

    if (virt && detail === "overview" && sel >= 0) {
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

  const fitCamera = React.useCallback((): Camera => {
    const { w, h } = size.current;
    const t = live.current.model.layout;
    const k = Math.min(MAX_ZOOM, Math.min((w - 48) / Math.max(t.width, 1), (h - 48) / Math.max(t.height, 1)));
    return { k, x: (w - t.width * k) / 2, y: (h - t.height * k) / 2 };
  }, []);

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
      const start = performance.now();
      const duration = 380;
      // Interpolate zoom in log space so the motion feels even
      const lk0 = Math.log(from.k);
      const lk1 = Math.log(to.k);
      const step = (now: number) => {
        // rAF's timestamp is the frame start, which can be earlier than `start`
        const p = Math.min(1, Math.max(0, (now - start) / duration));
        const e = 1 - Math.pow(1 - p, 3);
        const k = Math.exp(lk0 + (lk1 - lk0) * e);
        // Keep the screen point that maps the moving center consistent
        const { w, h } = size.current;
        const wx0 = (w / 2 - from.x) / from.k;
        const wy0 = (h / 2 - from.y) / from.k;
        const wx1 = (w / 2 - to.x) / to.k;
        const wy1 = (h / 2 - to.y) / to.k;
        const wx = wx0 + (wx1 - wx0) * e;
        const wy = wy0 + (wy1 - wy0) * e;
        cam.current = { k, x: w / 2 - wx * k, y: h / 2 - wy * k };
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
      announce(i);
      if (fly) centerOn(i, FULL_AT, true);
    },
    [select, announce, centerOn],
  );

  React.useImperativeHandle(
    ref,
    () => ({
      fit: () => animateTo(fitCamera()),
      zoomBy: zoomCenter,
      focusNode: (id) => {
        const i = live.current.model.index.get(id);
        if (i === undefined) return;
        live.current.selected = i;
        select(id);
        announce(i);
        centerOn(i, 1, false);
      },
    }),
    [animateTo, fitCamera, zoomCenter, select, announce, centerOn],
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

  // New data: back to the top, fresh window
  const firstModel = React.useRef(true);
  React.useLayoutEffect(() => {
    if (firstModel.current) {
      firstModel.current = false;
      return;
    }
    stopAnim();
    needsInitialView.current = true;
    initialView();
    windowRect.current = null;
    setWin({ ids: [], detail: "full" });
    schedule();
  }, [model, initialView, schedule]);

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
    if (e.button !== 0 || (e.target as HTMLElement).closest(".ds-org-tools")) return;
    stopAnim();
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    startGesture();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId) || !gesture.current) return;
    pointers.current.set(e.pointerId, local(e));
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
      g.moved = true;
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    const m = live.current.model;
    const t = m.layout;
    const sel = live.current.selected;
    const { w, h } = size.current;

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
  const cards = win.ids.map((i) =>
    i < t.count ? (
      <OrgCard
        key={i}
        node={model.nodes[i]}
        x={t.x[i]}
        y={t.y[i]}
        detail={win.detail}
        reports={t.childStart[i + 1] - t.childStart[i]}
        selected={i === selected}
      />
    ) : null,
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
      style={{ height, "--ds-org-w": `${NODE_W}px`, "--ds-org-h": `${NODE_H}px` } as React.CSSProperties}
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

      <div className="ds-org-tools">
        <IconButton size="sm" variant="outline" icon={<PlusIcon />} aria-label="Zoom in" onClick={() => zoomCenter(1.5)} />
        <IconButton size="sm" variant="outline" icon={<MinusIcon />} aria-label="Zoom out" onClick={() => zoomCenter(1 / 1.5)} />
        <IconButton size="sm" variant="outline" icon={<MaximizeIcon />} aria-label="Fit to view" onClick={() => animateTo(fitCamera())} />
      </div>
      {showStats && <div ref={hudRef} className="ds-org-hud" aria-hidden="true" />}

      <span ref={probeRef} className="ds-org-probe" aria-hidden="true" />
      <p id={hintId} className="ds-visually-hidden">
        {model.nodes.length.toLocaleString("en-US")} people. Arrow keys move between people: up to the manager, down to
        the first report, left and right between colleagues. Shift with arrows pans, plus and minus zoom, 0 fits the whole
        chart.
      </p>
      <div ref={liveRef} className="ds-visually-hidden" aria-live="polite" />
    </div>
  );
}
