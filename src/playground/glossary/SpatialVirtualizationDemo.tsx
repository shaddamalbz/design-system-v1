import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { SpatialGrid } from "../../ds";
import { Range, Switch } from "../ui";

/* A 2D world of 1,500 items. Left: the whole world, with the grid index and a
   viewport you drag. Right: what the user sees, where only the items the
   query returned exist as DOM. */

const WORLD_W = 1600;
const WORLD_H = 1000;
const VIEW_W = 320;
const VIEW_H = 200;
const CELL = 100;
const ITEM_W = 22;
const ITEM_H = 14;
const COUNT = 1500;

function makeItems() {
  // Clumpy on purpose: real 2D data clusters (teams, cities, map pins)
  let seed = 11;
  const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  const clusters = Array.from({ length: 14 }, () => [random() * WORLD_W, random() * WORLD_H, 60 + random() * 160]);
  const boxes = new Float32Array(COUNT * 4);
  const hue = new Uint8Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    let x: number;
    let y: number;
    if (random() < 0.8) {
      const c = Math.floor(random() * clusters.length);
      const [cx, cy, r] = clusters[c];
      const a = random() * Math.PI * 2;
      const d = Math.sqrt(random()) * r;
      x = cx + Math.cos(a) * d;
      y = cy + Math.sin(a) * d;
      hue[i] = c % 3;
    } else {
      x = random() * WORLD_W;
      y = random() * WORLD_H;
      hue[i] = 3;
    }
    x = Math.min(WORLD_W - ITEM_W, Math.max(0, x));
    y = Math.min(WORLD_H - ITEM_H, Math.max(0, y));
    boxes.set([x, y, x + ITEM_W, y + ITEM_H], i * 4);
  }
  return { boxes, hue };
}

const HUES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-other)"];

export function SpatialVirtualizationDemo() {
  const { boxes, hue } = useMemo(makeItems, []);
  const grid = useMemo(() => new SpatialGrid(boxes, WORLD_W, WORLD_H, CELL), [boxes]);

  const [view, setView] = useState({ x: 620, y: 380 });
  const [overscan, setOverscan] = useState(0);
  const [useIndex, setUseIndex] = useState(true);
  const [announce, setAnnounce] = useState(false);

  // Rendered area = viewport + overscan on every side
  const padX = VIEW_W * (overscan / 100);
  const padY = VIEW_H * (overscan / 100);
  const area = { x0: view.x - padX, y0: view.y - padY, x1: view.x + VIEW_W + padX, y1: view.y + VIEW_H + padY };

  const result = useMemo(() => {
    const ids: number[] = [];
    if (useIndex) {
      grid.query(area.x0, area.y0, area.x1, area.y1, ids);
      const [c0, r0, c1, r1] = grid.cellRange(area.x0, area.y0, area.x1, area.y1);
      let tested = 0;
      for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) tested += grid.cellCount(c, r);
      return { ids, tested, cells: [c0, r0, c1, r1] as const };
    }
    for (let i = 0; i < COUNT; i++) {
      const b = i * 4;
      if (boxes[b] <= area.x1 && boxes[b + 2] >= area.x0 && boxes[b + 1] <= area.y1 && boxes[b + 3] >= area.y0) ids.push(i);
    }
    return { ids, tested: COUNT, cells: null };
  }, [grid, boxes, useIndex, area.x0, area.y0, area.x1, area.y1]);

  const visible = useMemo(() => new Set(result.ids), [result]);

  /* ---- Minimap (canvas: drawing 1,500 marks as DOM would defeat the point) */

  const mapWrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [mapW, setMapW] = useState(0);
  const [theme, setTheme] = useState(0);

  useLayoutEffect(() => {
    const el = mapWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setMapW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Canvas needs resolved colors: redraw when the theme changes
  useEffect(() => {
    const bump = () => setTheme((t) => t + 1);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => {
      mq.removeEventListener("change", bump);
      mo.disconnect();
    };
  }, []);

  const scale = mapW / WORLD_W;

  useEffect(() => {
    const c = canvas.current;
    const p = probe.current;
    if (!c || !p || !mapW) return;
    const color = (css: string) => {
      p.style.color = css;
      return getComputedStyle(p).color;
    };
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(mapW * dpr);
    c.height = Math.round(WORLD_H * scale * dpr);
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);

    // Grid cells: the ones the query visits are tinted
    ctx.lineWidth = 1 / scale;
    ctx.strokeStyle = color("var(--color-border)");
    if (result.cells) {
      const [c0, r0, c1, r1] = result.cells;
      ctx.fillStyle = color("color-mix(in oklab, var(--chart-1) 22%, transparent)");
      ctx.fillRect(c0 * CELL, r0 * CELL, (c1 - c0 + 1) * CELL, (r1 - r0 + 1) * CELL);
    }
    ctx.beginPath();
    for (let x = 0; x <= WORLD_W; x += CELL) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, WORLD_H);
    }
    for (let y = 0; y <= WORLD_H; y += CELL) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD_W, y);
    }
    ctx.stroke();

    // Items: rendered ones in color, the rest as faint outlines
    const muted = color("var(--color-border)");
    const fills = HUES.map(color);
    for (let i = 0; i < COUNT; i++) {
      const b = i * 4;
      if (visible.has(i)) {
        ctx.fillStyle = fills[hue[i]];
        ctx.fillRect(boxes[b], boxes[b + 1], ITEM_W, ITEM_H);
      } else {
        ctx.fillStyle = muted;
        ctx.fillRect(boxes[b], boxes[b + 1], ITEM_W, ITEM_H);
      }
    }

    // Overscan area, then the viewport
    ctx.lineWidth = 2 / scale;
    if (overscan > 0) {
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.strokeStyle = color("var(--chart-2)");
      ctx.strokeRect(area.x0, area.y0, area.x1 - area.x0, area.y1 - area.y0);
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = color("var(--color-text)");
    ctx.strokeRect(view.x, view.y, VIEW_W, VIEW_H);
  }, [mapW, scale, result, visible, boxes, hue, view, overscan, theme, area.x0, area.y0, area.x1, area.y1]);

  /* ---- Moving the viewport: drag on the map, or arrow keys ---------------- */

  const clampView = (x: number, y: number) => ({
    x: Math.min(WORLD_W - VIEW_W, Math.max(0, x)),
    y: Math.min(WORLD_H - VIEW_H, Math.max(0, y)),
  });
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const toWorld = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: (e.clientX - r.left) / scale, y: (e.clientY - r.top) / scale };
  };

  /* ---- What the user sees ------------------------------------------------- */

  const lensWrap = useRef<HTMLDivElement>(null);
  const [lensW, setLensW] = useState(0);
  useLayoutEffect(() => {
    const el = lensWrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLensW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const lensScale = lensW / VIEW_W;

  return (
    <div className="pg-demo">
      <div className="gd-sv">
        <figure className="gd-sv-panel">
          <figcaption>
            The whole world: {COUNT.toLocaleString("en-US")} items, {(WORLD_W / CELL) * (WORLD_H / CELL)} grid cells
          </figcaption>
          <div
            ref={mapWrap}
            className="gd-sv-map"
            style={{ aspectRatio: `${WORLD_W} / ${WORLD_H}` }}
            tabIndex={0}
            role="application"
            aria-roledescription="minimap"
            aria-label="World map with the viewport frame. Arrow keys move the frame, Shift moves it further."
            onPointerDown={(e) => {
              setAnnounce(false);
              e.currentTarget.setPointerCapture(e.pointerId);
              const p = toWorld(e);
              const inside = p.x >= view.x && p.x <= view.x + VIEW_W && p.y >= view.y && p.y <= view.y + VIEW_H;
              // Grab the viewport where it was clicked, or jump it to center on the click
              const next = inside ? view : clampView(p.x - VIEW_W / 2, p.y - VIEW_H / 2);
              setView(next);
              drag.current = { dx: p.x - next.x, dy: p.y - next.y };
            }}
            onPointerMove={(e) => {
              if (!drag.current) return;
              const p = toWorld(e);
              setView(clampView(p.x - drag.current.dx, p.y - drag.current.dy));
            }}
            onPointerUp={() => (drag.current = null)}
            onPointerCancel={() => (drag.current = null)}
            onKeyDown={(e) => {
              const step = e.shiftKey ? 100 : 20;
              const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
              if (!d) return;
              e.preventDefault();
              setView((v) => clampView(v.x + d[0], v.y + d[1]));
              setAnnounce(true);
            }}
          >
            <canvas ref={canvas} className="gd-sv-canvas" aria-hidden="true" />
            <span ref={probe} className="gd-sv-probe" aria-hidden="true" />
          </div>
        </figure>

        <figure className="gd-sv-panel">
          <figcaption>What the user sees: only these exist as DOM</figcaption>
          <div ref={lensWrap} className="gd-sv-lens" style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }} aria-hidden="true">
            {result.ids.map((i) => (
              <span
                key={i}
                className="gd-sv-item"
                style={
                  {
                    left: (boxes[i * 4] - view.x) * lensScale,
                    top: (boxes[i * 4 + 1] - view.y) * lensScale,
                    width: ITEM_W * lensScale,
                    height: ITEM_H * lensScale,
                    "--_c": HUES[hue[i]],
                  } as CSSProperties
                }
              />
            ))}
          </div>
        </figure>
      </div>

      {/* Announced after keyboard moves only: a drag would flood the screen reader */}
      <p className="ds-visually-hidden" aria-live="polite">
        {announce ? `${result.ids.length} items rendered, ${result.tested} checked` : ""}
      </p>
      <div className="gd-stats">
        <span>
          <strong>{result.ids.length}</strong> of {COUNT.toLocaleString("en-US")} rendered
        </span>
        <span>
          <strong>{result.tested.toLocaleString("en-US")}</strong> items checked
        </span>
        {result.cells && (
          <span>
            <strong>{(result.cells[2] - result.cells[0] + 1) * (result.cells[3] - result.cells[1] + 1)}</strong> cells
            visited
          </span>
        )}
        <span className="gd-badge" data-tone={useIndex ? "good" : "bad"}>
          {useIndex ? "Grid index: checks only nearby items" : "No index: checks every item, every frame"}
        </span>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Switch label="Use the grid index" checked={useIndex} onChange={setUseIndex} />
        <Range label="Overscan per side" value={overscan} min={0} max={50} step={5} unit="%" onChange={setOverscan} />
      </div>
      <p className="pg-muted pg-note">
        Drag the frame on the map (or focus it and use the arrow keys). Items light up as they enter the shaded cells,
        and only those become elements on the right. With overscan, items just outside the view are rendered too, so a
        small pan doesn't need a new query.
      </p>
    </div>
  );
}
