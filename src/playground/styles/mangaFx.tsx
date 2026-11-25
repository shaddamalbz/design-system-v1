import type { MouseEvent } from "react";

/* ==========================================================================
   Manga SFX burst (playground only)
   --------------------------------------------------------------------------
   Every piece of the effect is generated per click: the lettering is live
   text in a web font, clouds and sparkles are tiny inline SVGs, the focus
   lines are SVG strokes. Random angles, sizes and timing make each burst a
   little different, which is what makes it feel hand-animated. No image
   assets, no sprite sheets.
   ========================================================================== */

type Kind = "primary" | "secondary" | "on" | "off";

const SFX: Record<Kind, string[]> = {
  primary: ["ドン!", "ドドン!"],
  secondary: ["ポン", "ポン!"],
  on: ["パッ!"],
  off: ["シュッ"],
};

/* Only these glyphs are requested from Google Fonts (&text=), so the
   Japanese display font costs a few KB instead of several MB. */
const FONT_TEXT = "ドンポパッシュ!";
let fontRequested = false;

export function loadMangaFont() {
  if (fontRequested) return;
  fontRequested = true;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=Dela+Gothic+One&display=swap&text=${encodeURIComponent(FONT_TEXT)}`;
  document.head.append(link);
}

/* Three noise seeds for the "line boil" on the card outline. CSS steps
   between them (designStyles.css), so the ink line wobbles like redrawn
   animation frames while the text stays crisp. */
export function MangaFilters({ prefix }: { prefix: string }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
      {[1, 2, 3].map((seed, i) => (
        <filter key={seed} id={`${prefix}-boil-${i}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={seed} />
          <feDisplacementMap in="SourceGraphic" scale={3} />
        </filter>
      ))}
    </svg>
  );
}

export function mangaBoilVars(prefix: string): Record<string, string> {
  return Object.fromEntries([0, 1, 2].map((i) => [`--mg-boil-${i}`, `url(#${prefix}-boil-${i})`]));
}

const SVG_NS = "http://www.w3.org/2000/svg";
const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/* A cloud: outlined circles, then the same circles filled on top to hide
   the inner overlaps, so only the outer outline survives. */
const CLOUD: [number, number, number][] = [
  [8, 13, 6],
  [15, 11, 7],
  [11, 7, 5.5],
];
const CLOUD_SVG = `<svg viewBox="0 0 24 20">${CLOUD.map(
  ([cx, cy, r]) => `<circle class="mg-cloud-line" cx="${cx}" cy="${cy}" r="${r}"/>`,
).join("")}${CLOUD.map(([cx, cy, r]) => `<circle class="mg-cloud-fill" cx="${cx}" cy="${cy}" r="${r}"/>`).join(
  "",
)}</svg>`;

const SPARK_SVG = `<svg viewBox="-2 -2 28 28"><path d="M12 0C13 8 16 11 24 12 16 13 13 16 12 24 11 16 8 13 0 12 8 11 11 8 12 0Z"/></svg>`;

/** Delegated click handler for the scene: bursts from whichever button was pressed. */
export function mangaClick(e: MouseEvent<HTMLElement>) {
  const scene = e.currentTarget;
  const target = (e.target as HTMLElement).closest("button");
  const layer = scene.querySelector<HTMLElement>(".mg-layer");
  if (!target || !layer) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // React hasn't re-rendered yet, so aria-checked is still the old value.
  const kind: Kind = target.classList.contains("st-toggle")
    ? target.getAttribute("aria-checked") === "true"
      ? "off"
      : "on"
    : target.classList.contains("st-btn-primary")
      ? "primary"
      : "secondary";
  const count = parseInt(getComputedStyle(scene).getPropertyValue("--mg-particles"), 10) || 0;
  burst(layer, target, kind, count);
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, parent: Element) {
  const node = document.createElement(tag);
  node.className = className;
  parent.append(node);
  return node;
}

function burst(layer: HTMLElement, target: HTMLElement, kind: Kind, count: number) {
  const box = layer.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const fx = el("div", "mg-fx", layer);
  fx.style.left = `${r.left - box.left + r.width / 2}px`;
  fx.style.top = `${r.top - box.top + r.height / 2}px`;

  const big = kind === "primary" || kind === "on";
  const anims: Animation[] = [];

  // 1. Squash and stretch the control itself.
  target.animate([{ scale: "1" }, { scale: "1.1 0.86" }, { scale: "0.95 1.06" }, { scale: "1" }], {
    duration: 340,
    easing: "ease-out",
  });

  // 2. Focus lines radiating from the control's edge (an ellipse around it).
  const rx = r.width / 2 + 8;
  const ry = r.height / 2 + 8;
  const w = (rx + 26) * 2;
  const h = (ry + 26) * 2;
  const lines = document.createElementNS(SVG_NS, "svg");
  lines.setAttribute("class", "mg-lines");
  lines.setAttribute("width", String(w));
  lines.setAttribute("height", String(h));
  lines.setAttribute("viewBox", `${-w / 2} ${-h / 2} ${w} ${h}`);
  const n = big ? 14 : 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rand(-0.15, 0.15);
    const len = rand(8, 18);
    const line = document.createElementNS(SVG_NS, "line");
    line.setAttribute("x1", String(Math.cos(a) * rx));
    line.setAttribute("y1", String(Math.sin(a) * ry));
    line.setAttribute("x2", String(Math.cos(a) * (rx + len)));
    line.setAttribute("y2", String(Math.sin(a) * (ry + len)));
    lines.append(line);
  }
  fx.append(lines);
  anims.push(
    lines.animate(
      [
        { transform: "translate(-50%, -50%) scale(0.8)", opacity: 1 },
        { transform: "translate(-50%, -50%) scale(1.15)", opacity: 0 },
      ],
      { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" },
    ),
  );

  // 3. Sound-effect lettering: overshoots in, settles, drifts up and fades.
  const sfx = el("span", big ? "mg-sfx mg-sfx-big" : "mg-sfx", fx);
  sfx.textContent = pick(SFX[kind]);
  const tilt = rand(4, 14) * (Math.random() < 0.7 ? -1 : 1);
  const lift = r.height / 2 + 4;
  const at = (dy: number, s: number, rot: number) =>
    `translate(-50%, calc(-100% - ${lift + dy}px)) rotate(${rot}deg) scale(${s})`;
  anims.push(
    sfx.animate(
      [
        { transform: at(-10, 0.2, tilt - 25), opacity: 0 },
        { transform: at(4, 1.25, tilt), opacity: 1, offset: 0.16 },
        { transform: at(0, 0.95, tilt), offset: 0.28 },
        { transform: at(2, 1, tilt), offset: 0.4 },
        { transform: at(8, 1, tilt), opacity: 1, offset: 0.78 },
        { transform: at(16, 0.92, tilt), opacity: 0 },
      ],
      { duration: 950, fill: "both" },
    ),
  );

  // 4. Dust clouds puffing out from the bottom edge, alternating sides.
  for (let i = 0; i < count; i++) {
    const side = i % 2 ? 1 : -1;
    const puff = el("div", "mg-puff", fx);
    puff.innerHTML = CLOUD_SVG;
    puff.style.width = `${rand(14, 26)}px`;
    const x = side * rand(r.width * 0.1, r.width / 2);
    const y = r.height / 2 - 2;
    const dx = side * rand(18, 46);
    const dy = rand(-6, 14);
    const pos = (px: number, py: number, s: number) => `translate(${px}px, ${py}px) translate(-50%, -50%) scale(${s})`;
    // Fast puff out (eased first segment), then a slow drift while shrinking.
    anims.push(
      puff.animate(
        [
          { transform: pos(x, y, 0.3), easing: "cubic-bezier(.2,.8,.3,1)" },
          { transform: pos(x + dx * 0.75, y + dy * 0.75, 1), offset: 0.35 },
          { transform: pos(x + dx, y + dy, 0.6), opacity: 1, offset: 0.75 },
          { transform: pos(x + dx * 1.05, y + dy * 1.05, 0.2), opacity: 0 },
        ],
        { duration: rand(600, 820), delay: rand(0, 60), fill: "both" },
      ),
    );
  }

  // 5. A few sparkles around the top corners.
  const sparks = Math.round(count / 3);
  for (let i = 0; i < sparks; i++) {
    const spark = el("div", i % 2 ? "mg-spark mg-spark-alt" : "mg-spark", fx);
    spark.innerHTML = SPARK_SVG;
    spark.style.width = `${rand(10, 16)}px`;
    const x = (i % 2 ? 1 : -1) * rand(r.width / 2 - 4, r.width / 2 + 16);
    const y = -rand(r.height / 2, r.height / 2 + 18);
    const pos = (s: number, rot: number) =>
      `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s}) rotate(${rot}deg)`;
    anims.push(
      spark.animate(
        [
          { transform: pos(0, 0) },
          { transform: pos(1.2, 45), offset: 0.4 },
          { transform: pos(0, 90) },
        ],
        { duration: 600, delay: 80 + i * 70, easing: "ease-out", fill: "both" },
      ),
    );
  }

  Promise.allSettled(anims.map((a) => a.finished)).then(() => fx.remove());
}
