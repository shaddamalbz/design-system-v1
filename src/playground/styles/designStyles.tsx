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
];

export const SORTED_STYLES = [...STYLES].sort((a, b) => a.name.localeCompare(b.name));
