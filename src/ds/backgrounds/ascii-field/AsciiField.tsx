import * as React from "react";
import { cx } from "../../utils/cx";

/* ==========================================================================
   AsciiField: an animated background drawn as text.

   A smooth value field (flow, waves or rings) is sampled once per cell of a
   character grid. Each value picks a glyph from a "character ramp" (sparse →
   dense, e.g. " .:-=+*#%@") and an opacity level. The pointer adds a lens
   that magnifies the field, a fading trail, and click ripples.

   Performance: every glyph × opacity is drawn once into an offscreen atlas,
   so a frame is only drawImage calls (no fillText per cell). The loop pauses
   when the field is off screen or the tab is hidden.

   Accessibility: the canvas is decorative (aria-hidden). With reduced
   motion it draws a still frame; the lens still follows the pointer since
   that motion is caused by the user.
   ========================================================================== */

export type AsciiPattern = "flow" | "waves" | "rings";

export interface AsciiFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape of the field. @default "flow" */
  pattern?: AsciiPattern;
  /** Glyphs from empty to dense; the first is usually a space. @default " .:-=+*#%@" */
  characters?: string;
  /** Row height in px. @default 14 */
  cellSize?: number;
  /** Size of the shapes; larger is calmer. @default 1 */
  scale?: number;
  /** How much of the field carries glyphs, 0–1. @default 0.7 */
  density?: number;
  /** How much the glyphs fade toward the edges, 0–1. @default 0.6 */
  fade?: number;
  /** Soft tint under dense areas, 0–1. @default 0.5 */
  glow?: number;
  /** Random cells that flare now and then, 0–1. @default 0.5 */
  twinkle?: number;
  /** Animation speed; 1 is the designed pace. @default 1 */
  speed?: number;
  /** Shifts the composition. @default 0 */
  seed?: number;
  /** Move on its own. Off (or reduced motion) draws a still frame. @default true */
  animate?: boolean;
  /** Pointer lens, trail and click ripples. @default true */
  interactive?: boolean;
  /** Lens radius in px. @default 110 */
  radius?: number;
  /** How much the lens enlarges the field, 0–1. @default 0.6 */
  magnify?: number;
  /** Strength of the trail the pointer leaves, 0–1. @default 0.7 */
  wake?: number;
  /** Glyph color. Defaults to the element's text color, so it follows the theme. */
  color?: string;
  /** 2–6 colors from faint to dense. Overrides `color`. */
  colors?: string[];
}

const LEVELS = 8; // opacity steps baked into the atlas

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
};
/* Cheap deterministic hash → [0, 1) */
const hash = (x: number, y: number, z: number) => {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return s - Math.floor(s);
};

/* The value field, in [0, 1]. x, y are in "shape units" (px / (220 * scale)). */
function sample(pattern: AsciiPattern, x: number, y: number, t: number, s: number) {
  if (pattern === "waves") {
    const a = Math.sin(x * 3 + t * 0.8 + s);
    const b = Math.sin((x * 0.6 + y * 0.8) * 3.4 - t * 0.65 + s * 2);
    const c = Math.sin((y * 0.7 - x * 0.7) * 2.6 + t * 0.5 + s * 3);
    const v = (a + b + c) / 3;
    return clamp01(v * 0.75 + 0.5);
  }
  if (pattern === "rings") {
    let v = 0;
    for (let i = 0; i < 3; i++) {
      const cx = 0.5 + Math.sin(s * (i + 1) + t * 0.07 * (i + 1)) * 1.4 + i * 1.2;
      const cy = 0.6 + Math.cos(s * 1.7 * (i + 1) + t * 0.05 * (i + 2)) * 0.9;
      const d = Math.hypot(x - cx, y - cy);
      v = Math.max(v, (Math.sin(d * 7 - t * 1.4 + i) * 0.5 + 0.5) * Math.exp(-d * 0.45));
    }
    return clamp01(v * 1.25);
  }
  // flow: domain-warped sines multiplied together → drifting blobs, not stripes
  const a = Math.sin(x * 1.6 + Math.sin(y * 1.2 + t * 0.3 + s) * 1.5 + t * 0.25 + s);
  const b = Math.sin(y * 1.5 + Math.sin(x * 1.3 - t * 0.2 + s * 2) * 1.5 - t * 0.2);
  const c = Math.sin((x - y) * 0.9 + t * 0.12 + s * 3);
  return clamp01((a * b * 0.75 + c * 0.3) * 0.62 + 0.5);
}

/* Any CSS color → [r, g, b] via a 1×1 canvas */
function toRgb(color: string): [number, number, number] {
  const c = document.createElement("canvas");
  c.width = c.height = 1;
  const x = c.getContext("2d")!;
  x.fillStyle = color;
  x.fillRect(0, 0, 1, 1);
  const [r, g, b] = x.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

export const AsciiField = React.forwardRef<HTMLDivElement, AsciiFieldProps>(function AsciiField(
  {
    pattern = "flow",
    characters = " .:-=+*#%@",
    cellSize = 14,
    scale = 1,
    density = 0.7,
    fade = 0.6,
    glow = 0.5,
    twinkle = 0.5,
    speed = 1,
    seed = 0,
    animate = true,
    interactive = true,
    radius = 110,
    magnify = 0.6,
    wake = 0.7,
    color,
    colors,
    className,
    children,
    ...props
  },
  ref,
) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  React.useImperativeHandle(ref, () => rootRef.current!, []);

  // Live settings, read every frame, so changing a prop doesn't restart the loop
  const live = React.useRef({ pattern, scale, density, fade, glow, twinkle, speed, seed, animate, interactive, radius, magnify, wake });
  live.current = { pattern, scale, density, fade, glow, twinkle, speed, seed, animate, interactive, radius, magnify, wake };
  const kick = React.useRef<() => void>(() => {});
  React.useEffect(() => kick.current(), [pattern, scale, density, fade, glow, twinkle, speed, seed, animate, interactive, radius, magnify, wake]);

  const colorKey = colors?.join(",") ?? color ?? "";

  React.useEffect(() => {
    const root = rootRef.current!;
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const glowCanvas = document.createElement("canvas");
    const glowCtx = glowCanvas.getContext("2d")!;
    const atlas = document.createElement("canvas");
    const atlasCtx = atlas.getContext("2d")!;
    const chars = Array.from(characters.slice(0, 24) || " .:#");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)");

    let w = 0, h = 0, dpr = 1, cw = cellSize * 0.6, cols = 0, rows = 0;
    let glowRgb: number[] = [128, 128, 128];
    let raf = 0, visible = true, last = performance.now(), time = 0;
    const pointer = { x: 0, y: 0, on: false };
    const trail: { x: number; y: number; life: number }[] = [];
    const ripples: { x: number; y: number; age: number }[] = [];
    let glowData: ImageData | null = null;

    /* Bake every glyph at every opacity (and color step) into one image */
    const buildAtlas = () => {
      // The canvas carries the glyph color, so content on top keeps its own
      const style = getComputedStyle(canvas);
      const mono = style.getPropertyValue("--font-mono").trim() || "ui-monospace, monospace";
      const font = `${Math.round(cellSize * 0.86)}px ${mono}`;
      atlasCtx.font = font;
      cw = Math.max(4, atlasCtx.measureText("M").width);
      const stops = (colors && colors.length >= 2 ? colors : [color || style.color]).map(toRgb);
      glowRgb = stops[stops.length - 1];
      atlas.width = Math.ceil(cw * chars.length * dpr);
      atlas.height = Math.ceil(cellSize * LEVELS * dpr);
      atlasCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      atlasCtx.clearRect(0, 0, atlas.width, atlas.height);
      atlasCtx.font = font;
      atlasCtx.textAlign = "center";
      atlasCtx.textBaseline = "middle";
      for (let l = 0; l < LEVELS; l++) {
        const k = l / (LEVELS - 1);
        const rgb =
          stops.length === 1
            ? stops[0]
            : (() => {
                const p = k * (stops.length - 1);
                const i = Math.min(stops.length - 2, Math.floor(p));
                return mix(stops[i], stops[i + 1], p - i);
              })();
        // single color: opacity ramps; multi-colour: the color does most of the work
        const alpha = stops.length === 1 ? 0.18 + 0.82 * k : 0.55 + 0.45 * k;
        atlasCtx.fillStyle = `rgb(${rgb.join(" ")} / ${alpha})`;
        chars.forEach((ch, i) => atlasCtx.fillText(ch, i * cw + cw / 2, l * cellSize + cellSize / 2));
      }
    };

    const resize = () => {
      const r = root.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = Math.max(1, r.width);
      h = Math.max(1, r.height);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      buildAtlas();
      cols = Math.ceil(w / cw);
      rows = Math.ceil(h / cellSize);
      glowCanvas.width = cols;
      glowCanvas.height = rows;
      glowData = glowCtx.createImageData(cols, rows);
    };

    const draw = () => {
      const o = live.current;
      const unit = 220 * Math.max(0.2, o.scale);
      const s = o.seed * 1.618;
      const th = 1 - clamp01(o.density);
      const n = chars.length;
      const R = Math.max(1, o.radius);
      const lensOn = o.interactive && pointer.on;
      const gd = glowData!.data;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      for (let row = 0; row < rows; row++) {
        const y = row * cellSize + cellSize / 2;
        for (let col = 0; col < cols; col++) {
          const x = col * cw + cw / 2;
          let sx = x, sy = y, boost = 0;

          if (lensOn) {
            const d = Math.hypot(x - pointer.x, y - pointer.y);
            if (d < R) {
              const f = smooth(0, 1, 1 - d / R);
              // sample closer to the pointer = the field looks magnified
              const k = 1 - o.magnify * f * 0.6;
              sx = pointer.x + (x - pointer.x) * k;
              sy = pointer.y + (y - pointer.y) * k;
              boost += f * 0.28;
            }
          }
          for (const p of trail) {
            const d = Math.hypot(x - p.x, y - p.y);
            if (d < R * 0.6) boost += o.wake * p.life * 0.3 * (1 - d / (R * 0.6));
          }
          for (const r of ripples) {
            const ring = r.age * 420;
            const band = Math.abs(Math.hypot(x - r.x, y - r.y) - ring);
            if (band < 36) boost += (1 - band / 36) * (1 - r.age / 1.4) * 0.7;
          }

          let v = sample(o.pattern, sx / unit, sy / unit, time, s);
          v = clamp01((v - th) / Math.max(0.05, 1 - th));

          // twinkle: a few cells flare per beat
          if (o.twinkle > 0) {
            const beat = Math.floor(time * 0.9 + hash(col, row, s) * 10);
            if (hash(col, row, beat + s) > 1 - 0.012 * o.twinkle) v = Math.max(v, 0.85);
          }

          // edge fade (vignette)
          const dx = (x / w - 0.5) * 2, dy = (y / h - 0.5) * 2;
          v *= 1 - clamp01(o.fade) * smooth(0.25, 1.15, Math.hypot(dx, dy) / 1.2);
          v = clamp01(v + boost);

          const gi = (row * cols + col) * 4;
          gd[gi] = glowRgb[0];
          gd[gi + 1] = glowRgb[1];
          gd[gi + 2] = glowRgb[2];
          gd[gi + 3] = v * v * o.glow * 70;

          const ci = Math.min(n - 1, Math.floor(v * n));
          if (ci <= 0 && chars[0] === " ") continue;
          const level = Math.min(LEVELS - 1, Math.floor(v * LEVELS));
          ctx.drawImage(atlas, ci * cw * dpr, level * cellSize * dpr, cw * dpr, cellSize * dpr, col * cw, row * cellSize, cw, cellSize);
        }
      }

      if (o.glow > 0) {
        glowCtx.putImageData(glowData!, 0, 0);
        ctx.save();
        ctx.globalCompositeOperation = "destination-over"; // under the glyphs
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(glowCanvas, 0, 0, cols * cw, rows * cellSize);
        ctx.restore();
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const o = live.current;
      const moving = o.animate && !reduce.matches;
      if (moving) time += dt * o.speed;
      for (const p of trail) p.life -= dt / 0.9;
      while (trail.length && trail[0].life <= 0) trail.shift();
      for (const r of ripples) r.age += dt;
      while (ripples.length && ripples[0].age > 1.4) ripples.shift();
      draw();
      if (visible && !document.hidden && (moving || trail.length || ripples.length)) raf = requestAnimationFrame(frame);
    };
    const schedule = () => {
      if (!raf && visible && !document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    kick.current = schedule;

    const local = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const onMove = (e: PointerEvent) => {
      if (!live.current.interactive) return;
      const p = local(e);
      const lastT = trail[trail.length - 1];
      if (!reduce.matches && live.current.wake > 0 && (!lastT || Math.hypot(p.x - lastT.x, p.y - lastT.y) > 10)) {
        trail.push({ ...p, life: 1 });
        if (trail.length > 24) trail.shift();
      }
      Object.assign(pointer, p, { on: true });
      schedule();
    };
    const onLeave = () => {
      pointer.on = false;
      schedule();
    };
    const onDown = (e: PointerEvent) => {
      if (!live.current.interactive || reduce.matches) return;
      ripples.push({ ...local(e), age: 0 });
      schedule();
    };

    resize();
    schedule();
    const ro = new ResizeObserver(() => {
      resize();
      schedule();
    });
    ro.observe(root);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      schedule();
    });
    io.observe(root);
    // Theme changes recolor the default (text-colored) glyphs
    const recolor = () => {
      buildAtlas();
      schedule();
    };
    const mo = new MutationObserver(recolor);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", recolor);
    reduce.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", schedule);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onDown);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      mo.disconnect();
      scheme.removeEventListener("change", recolor);
      reduce.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", schedule);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onDown);
      kick.current = () => {};
    };
    // The atlas depends on these; everything else is read live
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters, cellSize, colorKey]);

  return (
    <div ref={rootRef} className={cx("ds-ascii-field", className)} {...props}>
      <canvas ref={canvasRef} className="ds-ascii-field-canvas" aria-hidden="true" />
      {children != null && <div className="ds-ascii-field-content">{children}</div>}
    </div>
  );
});
