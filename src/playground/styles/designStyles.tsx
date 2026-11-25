/* ==========================================================================
   Design styles ("design taste" / visual trends)
   --------------------------------------------------------------------------
   To add a style:
   1. Append an object to STYLES (id, name, era, summary are required).
   2. Add `.st-<id>` rules in designStyles.css to skin the shared sample
      card (see StyleSample.tsx for the markup).
   It gets a page at #/styles/<id> and a sidebar link automatically.

   These skins live in the playground only: they're for learning, not
   part of the design system's components.
   ========================================================================== */

export interface StyleControl {
  /** CSS custom property set on the sample, e.g. "--glass-blur" */
  prop: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
}

export interface DesignStyle {
  id: string;
  name: string;
  aka?: string[];
  /** When / where it became popular */
  era: string;
  summary: string;
  traits?: string[];
  /** The core CSS, trimmed to what defines the look */
  recipe?: string;
  /** JS behind the style's motion, when CSS alone isn't enough */
  script?: string;
  goodFor?: string[];
  avoid?: string[];
  a11y?: string[];
  /** Sliders that tweak the live sample */
  controls?: StyleControl[];
}

export const STYLES: DesignStyle[] = [
  {
    id: "glassmorphism",
    name: "Glassmorphism",
    aka: ["Frosted glass", "Acrylic (Windows)", "Liquid Glass (Apple, 2025)"],
    era: "Named around 2020 with macOS Big Sur and Windows Fluent's acrylic; back in focus with Apple's Liquid Glass in 2025.",
    summary:
      "Translucent panels that blur whatever is behind them, like frosted glass. Depth comes from layering over a colorful background, not from heavy shadows.",
    traits: [
      "Semi-transparent fill (white or dark at 10–40% opacity)",
      "Background blur with backdrop-filter",
      "A thin, light border that catches the 'edge' of the glass",
      "Vivid shapes or images behind, or there's nothing to blur",
    ],
    recipe: `.glass {
  background: rgb(255 255 255 / 0.25);
  backdrop-filter: blur(16px) saturate(160%);
  border: 1px solid rgb(255 255 255 / 0.5);
  border-radius: 24px;
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.12);
}

/* No blur support, or the user asked for less transparency */
@supports not (backdrop-filter: blur(1px)) {
  .glass { background: rgb(255 255 255 / 0.9); }
}
@media (prefers-reduced-transparency: reduce) {
  .glass { background: rgb(255 255 255 / 0.9); backdrop-filter: none; }
}`,
    goodFor: ["Overlays: menus, toolbars, sheets, notifications", "Media and wallpaper-heavy UIs", "Hero sections over imagery"],
    avoid: ["Dense text or data tables", "Flat or white backgrounds (nothing to blur)", "Low-end devices: blur is expensive to render"],
    a11y: [
      "Text contrast changes with whatever scrolls behind the glass. Check it against the busiest background, and raise the opacity if needed.",
      "Respect prefers-reduced-transparency and give an opaque fallback.",
      "Don't rely on blur alone to separate layers; keep a border or shadow.",
    ],
    controls: [
      { prop: "--glass-blur", label: "Blur", min: 0, max: 40, step: 1, value: 16, unit: "px" },
      { prop: "--glass-alpha", label: "Fill opacity", min: 0, max: 0.9, step: 0.05, value: 0.25, unit: "" },
    ],
  },
  {
    id: "neumorphism",
    name: "Neumorphism",
    aka: ["Soft UI", "New skeuomorphism"],
    era: "A Dribbble trend around 2019–2020.",
    summary:
      "Elements look extruded from, or pressed into, the same material as the background. Everything shares one color; shape comes only from a light shadow on one side and a dark one on the other.",
    traits: [
      "Background and elements are the same color",
      "Two shadows: light from the top-left, dark to the bottom-right",
      "Pressed states use inset shadows",
      "Soft, large radii and low contrast",
    ],
    recipe: `.neu {
  --base: #e4e8ee;
  background: var(--base);
  border-radius: 28px;
  box-shadow:
    8px 8px 16px #c2c8d1,     /* dark side */
    -8px -8px 16px #ffffff;   /* light side */
}
.neu:active {
  box-shadow:
    inset 4px 4px 8px #c2c8d1,
    inset -4px -4px 8px #ffffff;
}`,
    goodFor: ["Dribbble shots and concept art", "Single, simple controls like a smart-home dial"],
    avoid: ["Real products with many controls", "Anything where it must be obvious what's clickable"],
    a11y: [
      "The style's main weakness: edges are defined by soft shadows, so buttons often fail WCAG 1.4.11 (3:1 for UI boundaries).",
      "Pressed vs unpressed can be hard to tell apart; add a color or icon change for state.",
      "Add a visible focus ring; shadows alone don't show focus.",
    ],
    controls: [{ prop: "--neu-d", label: "Shadow distance", min: 2, max: 20, step: 1, value: 8, unit: "px" }],
  },
  {
    id: "neo-brutalism",
    name: "Neo-brutalism",
    aka: ["Neubrutalism", "Brutalist web design"],
    era: "Popular on the web from around 2021, e.g. Gumroad's redesign.",
    summary:
      "Raw and loud on purpose: thick black outlines, hard offset shadows with no blur, flat bright colors, and heavy type. Looks unpolished, but is very clear.",
    traits: [
      "2–4px solid black borders on everything",
      "Hard shadows: offset, zero blur, solid color",
      "Saturated flat fills (yellow, pink, lime)",
      "Bold type; buttons that 'press' by moving into their shadow",
    ],
    recipe: `.brut {
  background: #fff;
  border: 3px solid #111;
  border-radius: 6px;
  box-shadow: 5px 5px 0 #111; /* no blur */
}
.brut-button {
  background: #ffd23f;
  border: 3px solid #111;
  box-shadow: 3px 3px 0 #111;
  transition: translate .1s, box-shadow .1s;
}
.brut-button:active {
  translate: 3px 3px;
  box-shadow: 0 0 0 #111;
}`,
    goodFor: ["Personal sites, portfolios, creative tools", "Brands that want to feel playful and direct"],
    avoid: ["Calm, data-heavy, or enterprise UIs", "When the content needs to be the loudest thing"],
    a11y: [
      "Usually strong: high contrast and very clear boundaries.",
      "Check text on saturated fills (white on yellow fails; use black).",
      "Motion on press is small; keep it under reduced motion or remove it.",
    ],
    controls: [{ prop: "--brut-o", label: "Shadow offset", min: 0, max: 12, step: 1, value: 5, unit: "px" }],
  },
  {
    id: "claymorphism",
    name: "Claymorphism",
    aka: ["Clay UI"],
    era: "Around 2021–2022, alongside 3D clay-style illustrations.",
    summary:
      "Puffy, inflated shapes that look like soft clay: big rounded corners, pastel colors, an inner highlight and inner shadow, and a soft drop shadow underneath.",
    traits: [
      "Very large radii (pill and blob shapes)",
      "Pastel fills",
      "Two inner shadows (light top-left, dark bottom-right) plus an outer drop",
      "Often paired with 3D illustrations",
    ],
    recipe: `.clay {
  background: #f7f4ff;
  border-radius: 36px;
  box-shadow:
    0 24px 40px -16px rgb(90 70 180 / .35),   /* drop */
    inset -8px -8px 16px rgb(90 70 180 / .12), /* inner shade */
    inset 8px 8px 16px rgb(255 255 255 / .9);  /* inner light */
}`,
    goodFor: ["Kids' and casual apps, onboarding", "Marketing pages with 3D illustration"],
    avoid: ["Serious or dense interfaces", "Small elements: the effect needs size to read"],
    a11y: [
      "Pastel on pastel tends to be low contrast; keep text dark enough.",
      "Inner shadows don't show focus; add a visible focus ring.",
    ],
  },
  {
    id: "skeuomorphism",
    name: "Skeuomorphism",
    aka: ["Skeuomorphic design"],
    era: "Defined early iPhone apps (iOS 1–6, 2007–2012) and early-2010s desktop UIs.",
    summary:
      "Interfaces that imitate real objects and materials: leather, paper, glossy plastic, metal. The realism tells you how things work, like a switch that looks like a physical switch.",
    traits: [
      "Textures and gradients that imitate materials",
      "Gloss highlights, bevels, embossed text",
      "Realistic shadows and lighting",
      "Controls that look like their physical versions",
    ],
    recipe: `.skeu-button {
  background: linear-gradient(#5aa2f5, #1f6fd1);
  border: 1px solid #1859a8;
  border-radius: 8px;
  color: #fff;
  text-shadow: 0 -1px 0 rgb(0 0 0 / .3);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / .5), /* top gloss */
    0 1px 2px rgb(0 0 0 / .3);
}
.skeu-title {
  text-shadow: 0 1px 0 rgb(255 255 255 / .8); /* embossed */
}`,
    goodFor: ["Teaching new interactions (it's why early touch UIs used it)", "Games, music apps, and tools that mimic hardware"],
    avoid: ["General product UI today: it dates fast and adds visual noise"],
    a11y: [
      "Strong affordance: it's obvious what's a button.",
      "Textures behind text lower readability; keep text areas plain.",
    ],
  },
  {
    id: "flat-design",
    name: "Flat design",
    aka: ["Flat UI", "Flat 2.0 (with subtle shadows)"],
    era: "Microsoft Metro (2010), iOS 7 (2013); Google's Material Design (2014) brought back subtle depth.",
    summary:
      "The reaction to skeuomorphism: no textures, gradients, or shadows. Solid colors, simple shapes, and type do all the work.",
    traits: [
      "Solid, bright fills with no gradients",
      "No shadows or bevels",
      "Simple geometric icons",
      "Strong typography and grid",
    ],
    recipe: `.flat-card {
  background: #2471a3;
  color: #fff;
  border-radius: 4px;
  /* no border, no shadow, no gradient */
}
.flat-button {
  background: #1e8449;
  color: #fff;
  border: 0;
  border-radius: 4px;
}`,
    goodFor: ["Clean, fast-loading UIs", "Icon systems and illustrations"],
    avoid: ["Pure flat with no depth cues: people can't tell what's clickable ('flat 2.0' adds a hint of shadow for this)"],
    a11y: [
      "Classic flat palettes (like #3498db or #2ecc71 with white text) fail contrast. This sample uses darker shades for that reason.",
      "Make buttons look like buttons: shape, color, or a subtle shadow.",
    ],
  },
  {
    id: "manga",
    name: "Manga",
    aka: ["Anime UI", "Comic SFX UI"],
    era: "A recent, niche trend (mid-2020s) that builds on neo-brutalism and borrows from manga panels.",
    summary:
      "Ink outlines and hard shadows like neo-brutalism, plus the visual language of manga: screentone dots, focus lines, and sound-effect lettering (ドン!) that bursts out when you press something. The motion is the style, and it's all generated in code, so it needs no image assets. Press Export, Preview or the toggle to see it.",
    traits: [
      "Ink outlines and hard offset shadows (the neo-brutalist base)",
      "Screentone dots and focus lines as background texture",
      "Sound-effect lettering (ドン!, ポン) that pops out on press",
      "Dust clouds, sparkles, and squash-and-stretch on interaction",
      "Hand-drawn 'line boil': outlines wobble slightly, like redrawn animation frames",
    ],
    recipe: `/* Ink + hard shadow: the neo-brutalist base */
.manga-button {
  background: #5b4bff;
  color: #fff;
  border: 2.5px solid #14121f;
  border-radius: 10px;
  box-shadow: 4px 4px 0 #14121f;
  font-weight: 800;
  font-style: italic;
}
.manga-button:active { translate: 4px 4px; box-shadow: 0 0 0 #14121f; }

/* Screentone + focus lines: just gradients */
.panel::before {
  background: radial-gradient(#0003 1.3px, transparent 1.7px) 0 0 / 7px 7px;
  mask-image: linear-gradient(140deg, #000, transparent 45%);
}
.panel::after {
  background: repeating-conic-gradient(#0003 0 .6deg, transparent .6deg 5deg);
  mask-image: radial-gradient(transparent 55%, #000);
}

/* Sound-effect lettering: live text in a web font, not an image.
   Load only the glyphs you use: ...?family=Dela+Gothic+One&text=ドンポ! */
.sfx {
  font-family: "Dela Gothic One", sans-serif;
  color: #fff;
  -webkit-text-stroke: 7px #14121f;
  paint-order: stroke fill; /* stroke behind the fill */
  text-shadow: 3px 3px 0 #5b4bff;
}

/* Hand-drawn "line boil": step through 3 noise filters at ~8fps.
   <filter id="boil-0">
     <feTurbulence type="fractalNoise" baseFrequency=".035" seed="1"/>
     <feDisplacementMap in="SourceGraphic" scale="3"/>
   </filter>  …same for boil-1 and boil-2 with seed 2 and 3 */
.outline { filter: url(#boil-0); animation: boil .4s steps(1) infinite; }
@keyframes boil {
  33% { filter: url(#boil-1); }
  67% { filter: url(#boil-2); }
}`,
    script: `// One burst = lettering + dust clouds (+ focus lines and sparkles in
// the full version). Each piece is a tiny DOM/SVG node animated with the
// Web Animations API, randomized so no two clicks look the same.
function burst(layer, target, text) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const box = layer.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  const fx = document.createElement("div");
  fx.className = "fx"; // position: absolute; width: 0; height: 0
  fx.style.left = \`\${r.left - box.left + r.width / 2}px\`;
  fx.style.top = \`\${r.top - box.top + r.height / 2}px\`;
  layer.append(fx);

  const sfx = document.createElement("span");
  sfx.className = "sfx";
  sfx.textContent = text; // "ドン!"
  fx.append(sfx);
  const tilt = -4 - Math.random() * 10;
  const at = (y, s, rot) => \`translate(-50%, \${y}px) rotate(\${rot}deg) scale(\${s})\`;
  const anims = [
    sfx.animate([
      { transform: at(-50, 0.2, tilt - 25), opacity: 0 },
      { transform: at(-76, 1.25, tilt), opacity: 1, offset: 0.16 }, // overshoot
      { transform: at(-72, 1, tilt), offset: 0.3 },                  // settle
      { transform: at(-88, 0.9, tilt), opacity: 0 },                 // drift away
    ], { duration: 900, fill: "both" }),
  ];

  for (let i = 0; i < 8; i++) {
    const side = i % 2 ? 1 : -1;
    const puff = document.createElement("div");
    puff.className = "puff";
    puff.innerHTML = CLOUD_SVG; // 3 outlined circles
    fx.append(puff);
    const x = side * Math.random() * r.width / 2, y = r.height / 2;
    const dx = side * (16 + Math.random() * 28), dy = Math.random() * 14;
    anims.push(puff.animate([
      { transform: \`translate(\${x}px, \${y}px) scale(.3)\` },
      { transform: \`translate(\${x + dx}px, \${y + dy}px) scale(.4)\`, opacity: 0 },
    ], { duration: 520 + Math.random() * 240, easing: "cubic-bezier(.2,.8,.3,1)", fill: "both" }));
  }

  Promise.allSettled(anims.map((a) => a.finished)).then(() => fx.remove());
}

// Event delegation: one listener for every button in the panel.
panel.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (btn) burst(fxLayer, btn, "ドン!");
});`,
    goodFor: [
      "Playful brands, games, and anime or fan communities",
      "Moments worth celebrating: confirm, like, level up, success",
      "Portfolios and landing pages that want personality",
    ],
    avoid: [
      "Frequent, repetitive actions: a burst on every keystroke gets tiring fast",
      "Serious, dense, or enterprise UIs",
      "Destructive actions: a celebratory ドン! on Delete sends the wrong signal",
    ],
    a11y: [
      "Skip the burst entirely under prefers-reduced-motion; the press state alone still confirms the click. Stop the line boil too.",
      "Keep the effect layer aria-hidden and pointer-events: none, so it never blocks clicks or reaches screen readers.",
      "Sound-effect lettering is decoration. The real label (Export) must still say what the button does.",
      "Keep bursts short (under 1s) and avoid large white or black flashes (WCAG 2.3.1).",
    ],
    controls: [
      { prop: "--mg-o", label: "Shadow offset", min: 0, max: 10, step: 1, value: 4, unit: "px" },
      { prop: "--mg-particles", label: "Dust clouds", min: 0, max: 16, step: 1, value: 8, unit: "" },
    ],
  },
];

export const SORTED_STYLES = [...STYLES].sort((a, b) => a.name.localeCompare(b.name));
