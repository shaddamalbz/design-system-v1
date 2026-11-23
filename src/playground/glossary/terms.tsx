/* ==========================================================================
   Glossary terms
   --------------------------------------------------------------------------
   To add a term: append an object to TERMS. Only id, term, category and
   summary are required. The page sorts alphabetically, builds the A–Z
   index, search, and anchor links (#/glossary/<id>) automatically.
   ========================================================================== */

import type { ComponentType, ReactNode } from "react";
import { OptimisticDemo } from "./OptimisticDemo";
import { OpticalCenteringDemo } from "./OpticalCenteringDemo";
import { NestedRadiusDemo } from "./NestedRadiusDemo";
import { OpticalPaddingDemo } from "./OpticalPaddingDemo";
import { HitAreaDemo } from "./HitAreaDemo";
import { ForcedColorsDemo } from "./ForcedColorsDemo";
import { ProgressiveEnhancementDemo } from "./ProgressiveEnhancementDemo";
import { ReducedMotionDemo } from "./ReducedMotionDemo";
import { RovingTabindexDemo } from "./RovingTabindexDemo";
import { ScrollDrivenDemo } from "./ScrollDrivenDemo";
import { ScrollPaddingDemo } from "./ScrollPaddingDemo";
import { TextBoxTrimDemo } from "./TextBoxTrimDemo";
import { DesignTokensDemo } from "./DesignTokensDemo";
import { MicroInteractionDemo } from "./MicroInteractionDemo";
import { IconMorphingDemo } from "./IconMorphingDemo";
import { FeedforwardDemo } from "./FeedforwardDemo";
import { EasingDemo } from "./EasingDemo";
import { StaggerDemo } from "./StaggerDemo";
import { DirectManipulationDemo } from "./DirectManipulationDemo";
import { ValidationTimingDemo } from "./ValidationTimingDemo";
import { AccessibleNameDemo } from "./AccessibleNameDemo";
import { IndeterminateDemo } from "./IndeterminateDemo";
import { NonTextContrastDemo } from "./NonTextContrastDemo";
import { CharacterRampDemo } from "./CharacterRampDemo";
import "./demos.css";
import "./motion-demos.css";
import "./form-demos.css";

export const CATEGORIES = ["Interaction", "Visual", "Accessibility", "Engineering"] as const;
export type Category = (typeof CATEGORIES)[number];

export interface Term {
  /** URL-safe, unique: used in #/glossary/<id> */
  id: string;
  term: string;
  /** Other names people use for the same thing */
  aka?: string[];
  category: Category;
  /** One or two sentences: the definition */
  summary: string;
  /** Free-form sections, e.g. Why it matters / How / Watch out */
  sections?: { title: string; body: ReactNode }[];
  /** Optional live demo */
  demo?: ComponentType;
  /** Where this design system uses it */
  usedIn?: { label: string; href: string }[];
  /** ids of related terms */
  related?: string[];
}

export const TERMS: Term[] = [
  {
    id: "optical-centering",
    term: "Optical centering",
    aka: ["Visual centering", "Optical balance"],
    category: "Visual",
    summary:
      "Placing a shape where it looks centered instead of where its bounding box is centered. Asymmetric shapes carry more weight on one side, so a box-centered shape looks off.",
    sections: [
      {
        title: "Why box-centering fails",
        body: (
          <>
            <p>
              Browsers and design tools center the <strong>bounding box</strong>: the rectangle around a shape. Your eye
              centers the <strong>visual mass</strong>, roughly the shape's center of gravity (centroid).
            </p>
            <p>
              For a square, circle, or plus they're the same point. For a play triangle they aren't: most of its area
              sits at the flat back edge, so its centroid is about a third of the way in from that edge. Box-centered,
              it looks pushed toward the back.
            </p>
          </>
        ),
      },
      {
        title: "Which shapes need it",
        body: (
          <ul>
            <li>
              <strong>Need nothing:</strong> symmetric shapes like plus, X, check, circle, and chevrons or arrows that
              are balanced along the axis you're centering.
            </li>
            <li>
              <strong>Need a nudge:</strong> triangles (play), diagonal shapes (send, cursor), top-heavy shapes (heart,
              bell), and letters like A, V, T in a circle avatar.
            </li>
          </ul>
        ),
      },
      {
        title: "How to do it",
        body: (
          <ol>
            <li>Center by the box first.</li>
            <li>
              Move the shape <strong>toward its empty side</strong>, i.e. away from where the weight is (a play icon
              moves right).
            </li>
            <li>
              Start with part of the box-to-centroid distance, then judge by eye. Full math correction usually
              overshoots, because we also perceive the empty space around the shape.
            </li>
            <li>
              Store the offset with the icon (in its grid units) so it scales with size and every button gets it.
            </li>
          </ol>
        ),
      },
      {
        title: "In CSS",
        body: (
          <p>
            Use <code>translate</code>, not margins or padding, so layout doesn't change:{" "}
            <code>translate: calc(1.5em / 24) 0</code> moves a 24-grid icon 1.5 units right at any size.
          </p>
        ),
      },
    ],
    demo: OpticalCenteringDemo,
    usedIn: [
      { label: "Button (icon-only)", href: "#/button" },
      { label: "Icons with a nudge: Play, Send, Heart", href: "#/button" },
    ],
    related: ["optical-adjustment", "text-box-trim"],
  },
  {
    id: "optimistic-ui",
    term: "Optimistic UI",
    aka: ["Optimistic update"],
    category: "Interaction",
    summary:
      "Show the result of an action immediately, before the server confirms it, and undo it quietly if the request fails. The opposite, waiting for the server first, is a pessimistic UI.",
    sections: [
      {
        title: "Why it matters",
        body: (
          <p>
            A network round trip takes anywhere from 100ms to several seconds. If every like, toggle, or reorder waits
            for that, the interface feels slow even when nothing is wrong. Most of these requests succeed, so betting on
            success makes the UI feel instant.
          </p>
        ),
      },
      {
        title: "How it works",
        body: (
          <ol>
            <li>Apply the change to the UI right away.</li>
            <li>Send the request in the background.</li>
            <li>On success, keep it (and sync with what the server returned).</li>
            <li>On failure, roll back to the last confirmed state, tell the user, and offer a retry.</li>
          </ol>
        ),
      },
      {
        title: "When to use it",
        body: (
          <ul>
            <li>
              <strong>Good fit:</strong> likely to succeed, easy to undo, low stakes. Likes, favorites, toggles,
              renaming, reordering, sending a chat message (with a subtle "sending" state).
            </li>
            <li>
              <strong>Bad fit:</strong> payments, irreversible deletes, anything that often fails or where a false
              "done" would hurt. Use a clear loading state instead.
            </li>
          </ul>
        ),
      },
      {
        title: "Watch out",
        body: (
          <ul>
            <li>
              <strong>Never fail silently.</strong> If you roll back without saying so, people think the app is broken
              or that they misclicked.
            </li>
            <li>
              <strong>Rapid clicks:</strong> several requests can be in flight. Only the latest response should decide
              the final state; ignore stale ones.
            </li>
            <li>
              <strong>Announce changes</strong> (e.g. with <code>role="status"</code>) so screen reader users hear the
              rollback too.
            </li>
            <li>
              In React 19 the <code>useOptimistic</code> hook handles the "show now, revert on failure" part for you.
            </li>
          </ul>
        ),
      },
    ],
    demo: OptimisticDemo,
  },
  {
    id: "optical-adjustment",
    term: "Optical adjustment",
    aka: ["Optical alignment", "Optical compensation"],
    category: "Visual",
    summary:
      "Positioning things by how they look instead of how they measure. Equal numbers don't always look equal, because the eye judges visual weight, not bounding boxes.",
    sections: [
      {
        title: "Common cases",
        body: (
          <ul>
            <li>
              <strong>Icon padding:</strong> the icon side of a button gets less padding, because the icon's box has
              empty space built in.
            </li>
            <li>
              <strong>Asymmetric icons:</strong> a play triangle or paper plane is nudged off-center so it looks
              centered.
            </li>
            <li>
              <strong>Round shapes and pointed letters</strong> (O, A, V) are drawn slightly larger than flat ones, or
              they look smaller. Type designers call this overshoot.
            </li>
            <li>
              <strong>Text:</strong> centering on cap height instead of the line box (<code>text-box-trim</code>).
            </li>
          </ul>
        ),
      },
      {
        title: "Rule of thumb",
        body: (
          <p>
            Start from the math, then correct by eye in small steps (1–2px). If the correction is visible as a
            correction, it's too much.
          </p>
        ),
      },
      {
        title: "Icon padding in buttons",
        body: (
          <p>
            An icon's box has empty space around the drawing, and a thin line icon is lighter than a word. Give the
            icon side roughly that whitespace less padding (about 2–4px) so both sides <strong>look</strong> equal.
          </p>
        ),
      },
      {
        title: "Centering icons",
        body: (
          <p>
            Asymmetric icons need to be moved off the geometric center to look centered. See{" "}
            <a href="#/glossary/optical-centering">Optical centering</a>.
          </p>
        ),
      },
    ],
    demo: OpticalPaddingDemo,
    usedIn: [{ label: "Button (icon padding)", href: "#/button" }],
    related: ["optical-centering", "text-box-trim", "concentric-radius"],
  },
  {
    id: "concentric-radius",
    term: "Concentric radius",
    aka: ["Nested radius", "Nested corners"],
    category: "Visual",
    summary:
      "When a rounded box sits inside another, the inner radius should be the outer radius minus the padding, so both corner curves share one center and the gap stays even.",
    sections: [
      {
        title: "Nested corners",
        body: (
          <>
            <p>
              A card with a button inside, a list inside a panel, an image inside a frame: whenever one rounded box sits
              inside another, there are two corners next to each other. They look right only when the gap between them
              is the same all the way around the curve.
            </p>
            <p>
              The formula is just subtraction: <strong>inner radius = outer radius − padding</strong>. No golden ratio
              or division.
            </p>
          </>
        ),
      },
      {
        title: "Why it works",
        body: (
          <p>
            <code>border-radius</code> is the radius of a circle tucked into the corner. Two curves look parallel only
            when they share a <strong>center</strong>, like the lanes of a running track. The inner box is pushed in by
            the padding on every side, so for its circle to keep the same center it has to shrink by exactly that
            padding. That's what designers check when they draw circles in the corners.
          </p>
        ),
      },
      {
        title: "Why the same radius looks wrong",
        body: (
          <p>
            With equal radii, the inner circle's center moves diagonally away from the outer one. The gap on the sides
            is the padding, but at the corner it grows to about <strong>1.41 × padding</strong> (√2, the diagonal of a
            square). The corner looks heavy even if you can't say why.
          </p>
        ),
      },
      {
        title: "Rules",
        body: (
          <ul>
            <li>
              <strong>Padding ≥ radius → square inner corner.</strong> The math gives 0 or less, so the inner corner goes
              sharp. That's correct, not a bug.
            </li>
            <li>
              <strong>Each level subtracts again.</strong> Card 16 → list 12 → tab 8, with 4px padding at each step.
            </li>
            <li>
              <strong>Measure border to border:</strong> from the outer edge to the inner box's edge, not to the text.
            </li>
            <li>
              <strong>Pills stay pills.</strong> A full radius inside a full radius stays full.
            </li>
            <li>
              <strong>Optical nudge is allowed:</strong> going 1–2px over the math is fine if a tiny inner radius looks
              too sharp.
            </li>
          </ul>
        ),
      },
      {
        title: "In CSS",
        body: (
          <p>
            Let the browser subtract: <code>border-radius: max(0px, calc(var(--r) - var(--pad)))</code>.{" "}
            <code>max()</code> turns a negative result into a square corner.
          </p>
        ),
      },
    ],
    demo: NestedRadiusDemo,
    usedIn: [
      { label: "Radius & shadow", href: "#/shape" },
      { label: "Tabs (12 card → 4 padding → 8 tab)", href: "#/tabs" },
      { label: "Text field (button inside an input)", href: "#/text-field" },
    ],
    related: ["optical-adjustment", "design-tokens"],
  },
  {
    id: "design-tokens",
    term: "Design tokens",
    category: "Engineering",
    summary:
      "Named values (colors, spacing, radius, type, motion) that are the single source of truth for a design system. Components use token names, never raw values.",
    sections: [
      {
        title: "Two layers",
        body: (
          <ul>
            <li>
              <strong>Primitive:</strong> raw values with neutral names, e.g. <code>--gray-12</code>,{" "}
              <code>--space-4</code>.
            </li>
            <li>
              <strong>Semantic:</strong> what the value is for, e.g. <code>--color-text</code>,{" "}
              <code>--color-border</code>. Components use these, so changing a theme or brand only touches the mapping.
            </li>
          </ul>
        ),
      },
    ],
    demo: DesignTokensDemo,
    usedIn: [
      { label: "Colors", href: "#/colors" },
      { label: "Spacing", href: "#/spacing" },
    ],
  },
  {
    id: "roving-tabindex",
    term: "Roving tabindex",
    category: "Accessibility",
    summary:
      "A keyboard pattern for groups like tabs, toolbars, and menus: only one item is in the Tab order (tabindex 0), the rest are tabindex −1, and arrow keys move focus within the group.",
    sections: [
      {
        title: "Why",
        body: (
          <p>
            Without it, a list of 12 tabs costs 12 presses of <kbd>Tab</kbd> to get past. With it, the whole group is
            one tab stop, and arrows (plus <kbd>Home</kbd> / <kbd>End</kbd>) move inside.
          </p>
        ),
      },
    ],
    demo: RovingTabindexDemo,
    usedIn: [
      { label: "Tabs", href: "#/tabs" },
      { label: "Radio group (built into the browser)", href: "#/radio" },
    ],
    related: ["hit-area"],
  },
  {
    id: "hit-area",
    term: "Hit area",
    aka: ["Touch target", "Target size", "Tap target"],
    category: "Accessibility",
    summary:
      "The region that responds to a click or tap, which can be bigger than what you see. Small targets are hard to hit, especially on touch screens or with motor impairments.",
    sections: [
      {
        title: "Sizes to know",
        body: (
          <ul>
            <li>WCAG 2.5.8 (AA): at least 24×24px, or enough spacing around it.</li>
            <li>Comfortable touch: 44px (Apple) to 48px (Material).</li>
            <li>
              A small icon can keep its look and get a bigger hit area through padding or an invisible pseudo-element.
            </li>
          </ul>
        ),
      },
    ],
    demo: HitAreaDemo,
    usedIn: [
      { label: "Tabs chevrons", href: "#/tabs" },
      { label: "Button sizes", href: "#/button" },
      { label: "Checkbox, radio and switch (24px target)", href: "#/checkbox" },
    ],
    related: ["optical-adjustment"],
  },
  {
    id: "progressive-enhancement",
    term: "Progressive enhancement",
    category: "Engineering",
    summary:
      "Build a version that works everywhere, then add better behavior where the browser supports it. Unsupported browsers get the basic version, not a broken one.",
    sections: [
      {
        title: "In practice",
        body: (
          <p>
            Use <code>@supports</code> in CSS or <code>CSS.supports()</code> in JS to check for a feature, and layer the
            enhancement on top. The opposite approach, graceful degradation, starts from the full version and patches
            the failures.
          </p>
        ),
      },
    ],
    demo: ProgressiveEnhancementDemo,
    usedIn: [
      { label: "Tabs (scroll-driven fade + JS fallback)", href: "#/tabs" },
      { label: "Button (text-box trim)", href: "#/button" },
      { label: "Textarea (field-sizing auto-grow)", href: "#/text-field" },
    ],
    related: ["scroll-driven-animation"],
  },
  {
    id: "scroll-driven-animation",
    term: "Scroll-driven animation",
    category: "Engineering",
    summary:
      "A CSS animation whose progress follows a scroll position instead of time (animation-timeline: scroll()). Scroll effects without JavaScript scroll listeners, running off the main thread.",
    demo: ScrollDrivenDemo,
    usedIn: [{ label: "Tabs edge fades and chevrons", href: "#/tabs" }],
    related: ["progressive-enhancement", "scroll-padding"],
  },
  {
    id: "text-box-trim",
    term: "Text box trim",
    aka: ["text-box", "Leading trim", "Cap-height alignment"],
    category: "Visual",
    summary:
      "Trimming the invisible space above and below text so its box hugs the letters. Then the visible letters, not the font's line box, are what gets centered.",
    sections: [
      {
        title: "Why",
        body: (
          <p>
            Every font reserves extra room above and below for accents and descenders, and how much differs per font.
            That's why text often sits slightly too high or low in a button.{" "}
            <code>text-box: trim-both cap alphabetic</code> trims to the cap height and baseline, so centering looks
            right with any font.
          </p>
        ),
      },
      {
        title: "Watch out",
        body: (
          <p>
            The trimmed box is shorter than the glyphs, so don't combine it with <code>overflow: hidden</code>, or
            descenders (g, j, p, y) get cut off. Browsers without support ignore it.
          </p>
        ),
      },
    ],
    demo: TextBoxTrimDemo,
    usedIn: [{ label: "Button labels", href: "#/button" }],
    related: ["optical-adjustment", "progressive-enhancement"],
  },
  {
    id: "scroll-padding",
    term: "Scroll padding",
    category: "Engineering",
    summary:
      "Space a scroll container keeps clear when it scrolls something into view (focus, anchors, scrollIntoView). Content lands that far from the edge instead of flush against it.",
    sections: [
      {
        title: "Common uses",
        body: (
          <ul>
            <li>Keep focused items out from under a sticky header, a fade, or overlay buttons.</li>
            <li>
              In the scrollable tabs, <code>scroll-padding-inline</code> equals the faded edge, so keyboard focus never
              lands on a half-hidden tab.
            </li>
          </ul>
        ),
      },
    ],
    demo: ScrollPaddingDemo,
    usedIn: [{ label: "Tabs", href: "#/tabs" }],
    related: ["scroll-driven-animation", "roving-tabindex"],
  },
  {
    id: "reduced-motion",
    term: "Reduced motion",
    aka: ["prefers-reduced-motion"],
    category: "Accessibility",
    summary:
      "An OS setting people turn on when motion makes them dizzy or distracted. Sites read it with the prefers-reduced-motion media query and tone animation down.",
    sections: [
      {
        title: "What to change",
        body: (
          <ul>
            <li>Remove large movement: parallax, zooms, smooth scrolling, slide-ins.</li>
            <li>Small fades and color changes are usually fine to keep.</li>
            <li>Never hide information that only appears through animation.</li>
          </ul>
        ),
      },
    ],
    demo: ReducedMotionDemo,
    usedIn: [
      { label: "Tokens (durations go to 0)", href: "#/colors" },
      { label: "Tabs", href: "#/tabs" },
      { label: "Button", href: "#/button" },
      { label: "Sidebar", href: "#/sidebar" },
      { label: "ASCII field (still frame)", href: "#/backgrounds/ascii-field" },
    ],
    related: ["forced-colors", "easing"],
  },
  {
    id: "forced-colors",
    term: "Forced colors mode",
    aka: ["Windows High Contrast", "Contrast themes"],
    category: "Accessibility",
    summary:
      "A mode (mainly Windows Contrast themes) where the system replaces your colors with a small user-chosen palette. Backgrounds and shadows disappear, so anything shown only with them disappears too.",
    sections: [
      {
        title: "What to check",
        body: (
          <ul>
            <li>
              Selected and focused states must show as a border or outline, not only a background or shadow. Use{" "}
              <code>@media (forced-colors: active)</code> to add one.
            </li>
            <li>
              Use system color keywords there (<code>CanvasText</code>, <code>Highlight</code>, <code>GrayText</code>)
              instead of your own colors.
            </li>
          </ul>
        ),
      },
    ],
    demo: ForcedColorsDemo,
    usedIn: [
      { label: "Tabs", href: "#/tabs" },
      { label: "Button", href: "#/button" },
      { label: "Sidebar", href: "#/sidebar" },
      { label: "Text field", href: "#/text-field" },
      { label: "ASCII field (hidden)", href: "#/backgrounds/ascii-field" },
    ],
    related: ["reduced-motion"],
  },
  {
    id: "micro-interaction",
    term: "Micro-interaction",
    aka: ["Micro-animation", "Microinteraction"],
    category: "Interaction",
    summary:
      "A small, self-contained moment built around one task, like collapsing a sidebar or liking a post. The motion in it (what people often call a micro-animation) is one part; it also has a trigger, rules, and modes.",
    sections: [
      {
        title: "Micro-interaction or micro-animation?",
        body: (
          <>
            <p>
              Both are used. <strong>Micro-interaction</strong> is the established term (Dan Saffer's book{" "}
              <em>Microinteractions</em>, 2013) and means the whole moment. <strong>Micro-animation</strong> is a
              casual name for just the motion inside it. Not wrong, just narrower.
            </p>
            <p>
              The sidebar button combines two more specific ideas: one icon changing shape into another is{" "}
              <a href="#/glossary/icon-morphing">icon morphing</a>, and showing the result on hover is{" "}
              <a href="#/glossary/feedforward">feedforward</a>.
            </p>
          </>
        ),
      },
      {
        title: "The four parts",
        body: (
          <ol>
            <li>
              <strong>Trigger:</strong> what starts it (click, key, drag, or the system itself).
            </li>
            <li>
              <strong>Rules:</strong> what happens (the sidebar shrinks to icons).
            </li>
            <li>
              <strong>Feedback:</strong> how you see it happen (icon morphs, width glides, labels fade).
            </li>
            <li>
              <strong>Loops &amp; modes:</strong> what changes for next time (the same button now expands).
            </li>
          </ol>
        ),
      },
      {
        title: "Keep them small",
        body: (
          <ul>
            <li>Feedback in about 100–200ms; big moves like panels in about 400ms.</li>
            <li>Never block input while it plays; a second click should just reverse it.</li>
            <li>
              With <a href="#/glossary/reduced-motion">reduced motion</a>, keep the state change and drop the travel.
            </li>
          </ul>
        ),
      },
    ],
    demo: MicroInteractionDemo,
    usedIn: [
      { label: "Sidebar trigger", href: "#/sidebar" },
      { label: "Checkbox (check draws in)", href: "#/checkbox" },
      { label: "Switch (thumb stretch)", href: "#/switch" },
    ],
    related: ["icon-morphing", "feedforward", "easing"],
  },
  {
    id: "icon-morphing",
    term: "Icon morphing",
    aka: ["Morphing icon", "Animated icon", "Icon transition"],
    category: "Visual",
    summary:
      "Animating one icon into another by moving its parts, instead of swapping two separate icons. The shared parts stay put, so the eye reads it as one object changing state.",
    sections: [
      {
        title: "How the sidebar icon does it",
        body: (
          <>
            <p>
              The left pane holds three short strokes with round caps. <code>stroke-dasharray: 2.5 10</code> draws the
              whole 2.5-unit stroke: a bar. <code>stroke-dasharray: 0 10</code> draws a zero-length dash, so only the
              round cap is left: a dot. The divider slides left with <code>translate</code>.
            </p>
            <p>
              Both are plain CSS properties, so a normal <code>transition</code> morphs between them. A 30ms delay per
              bar makes them change top to bottom.
            </p>
          </>
        ),
      },
      {
        title: "Tips",
        body: (
          <ul>
            <li>Morph between shapes that share structure (same frame, same number of parts).</li>
            <li>Keep it short, around 150–250ms; it's feedback, not a show.</li>
            <li>With reduced motion it just switches, which is still a clear state change.</li>
          </ul>
        ),
      },
    ],
    demo: IconMorphingDemo,
    usedIn: [{ label: "Sidebar trigger", href: "#/sidebar" }],
    related: ["feedforward", "micro-interaction", "easing"],
  },
  {
    id: "feedforward",
    term: "Feedforward",
    aka: ["Preview on hover"],
    category: "Interaction",
    summary:
      "Showing what an action will do before you take it. Feedback answers “what did I just do?”; feedforward answers “what will this do?”.",
    sections: [
      {
        title: "Examples",
        body: (
          <ul>
            <li>The sidebar button's icon turns into the collapsed icon while you hover it.</li>
            <li>The resize cursor changes direction at the limits (only wider when collapsed).</li>
            <li>A drop zone highlights while you drag a file over it.</li>
            <li>A delete button turns red on hover, before anything is deleted.</li>
          </ul>
        ),
      },
      {
        title: "Rules",
        body: (
          <ul>
            <li>The preview must match the real result exactly.</li>
            <li>
              Don't flip after the click: the icon already shows the new state, so hold the preview until the pointer
              leaves.
            </li>
            <li>Also preview on keyboard focus; touch has no hover, so the action must make sense without it.</li>
          </ul>
        ),
      },
    ],
    demo: FeedforwardDemo,
    usedIn: [{ label: "Sidebar trigger", href: "#/sidebar" }],
    related: ["icon-morphing", "micro-interaction"],
  },
  {
    id: "easing",
    term: "Easing",
    aka: ["Timing function", "Ease out", "cubic-bezier"],
    category: "Visual",
    summary:
      "How speed changes during an animation. Real objects speed up and slow down, so curved timing reads as natural; constant speed (linear) reads as mechanical.",
    sections: [
      {
        title: "Which curve",
        body: (
          <ul>
            <li>
              <strong>Ease out</strong> (fast start, soft stop): things that appear or respond to you. The UI default.
            </li>
            <li>
              <strong>Ease in-out:</strong> something moving from one place to another on screen.
            </li>
            <li>
              <strong>Ease in:</strong> rarely; only things leaving for good.
            </li>
            <li>
              <strong>Linear:</strong> progress bars, and anything tied to the pointer (drag, scrub).
            </li>
          </ul>
        ),
      },
      {
        title: "In this system",
        body: (
          <p>
            <code>--ease-out: cubic-bezier(0.16, 1, 0.3, 1)</code> and <code>--ease-standard: cubic-bezier(0.2, 0, 0,
            1)</code>, with durations <code>--duration-fast</code> 120ms, <code>normal</code> 180ms, <code>slow</code>{" "}
            280ms and <code>slower</code> 400ms (the sidebar's width glide). All durations go to 0 with reduced motion.
          </p>
        ),
      },
    ],
    demo: EasingDemo,
    usedIn: [
      { label: "Sidebar width glide", href: "#/sidebar" },
      { label: "Tabs", href: "#/tabs" },
    ],
    related: ["staggered-animation", "reduced-motion"],
  },
  {
    id: "staggered-animation",
    term: "Staggered animation",
    aka: ["Stagger", "Cascade"],
    category: "Interaction",
    summary:
      "Running the same animation on a list of items one after another, with a small offset between each. The eye follows the wave, so a big change reads as an orderly sequence instead of a jump.",
    sections: [
      {
        title: "Two ways to stagger",
        body: (
          <ul>
            <li>
              <strong>By time:</strong> each item waits <code>index × step</code> (<code>transition-delay</code>).
              Simple, but it can only play forward.
            </li>
            <li>
              <strong>By progress:</strong> one shared 0→1 value, and each item gets its own slice of it. The sidebar's
              cascade works this way, so the same stagger can follow your drag or play on a button press.
            </li>
          </ul>
        ),
      },
      {
        title: "Tips",
        body: (
          <ul>
            <li>About 20–60ms per item feels like one gesture; more feels slow.</li>
            <li>Cap the total: shrink the step for long lists, and only stagger what's on screen.</li>
            <li>Go in reading order (top first), unless the motion comes from somewhere else.</li>
          </ul>
        ),
      },
    ],
    demo: StaggerDemo,
    usedIn: [{ label: "Sidebar (cascade transition)", href: "#/sidebar" }],
    related: ["easing", "direct-manipulation"],
  },
  {
    id: "direct-manipulation",
    term: "Direct manipulation",
    aka: ["Scrubbing", "Follow the pointer"],
    category: "Interaction",
    summary:
      "Changing something by grabbing and moving it, with the result tracking your pointer 1:1 as you move. Letting go then settles it into a valid state, often by snapping.",
    sections: [
      {
        title: "Rules of thumb",
        body: (
          <ul>
            <li>While dragging: no easing, no delay. Any lag feels broken.</li>
            <li>After release: animate to the final state (settle or snap).</li>
            <li>Show where it will snap before you let go (a threshold line, a label, a cursor).</li>
            <li>Offer a keyboard path (arrow keys on a focusable handle) and a click path.</li>
          </ul>
        ),
      },
      {
        title: "Snap threshold",
        body: (
          <p>
            A point past which releasing jumps to a different state. In the sidebar, letting go under 160px collapses
            it to the icon rail; above that, the width settles between its min and max.
          </p>
        ),
      },
    ],
    demo: DirectManipulationDemo,
    usedIn: [{ label: "Sidebar resize edge", href: "#/sidebar" }],
    related: ["staggered-animation", "feedforward"],
  },
  {
    id: "validation-timing",
    term: "Validation timing",
    aka: ["Inline validation", "Reward early, punish late"],
    category: "Interaction",
    summary:
      "When a form shows and clears errors. The usual rule: show a new error only after the user leaves the field or submits, but clear it the moment they fix it.",
    sections: [
      {
        title: "Reward early, punish late",
        body: (
          <ul>
            <li>
              <strong>Punish late:</strong> don't judge a field while someone is still typing in it. “ada@” isn't wrong,
              it's unfinished. Show a new error on blur or on submit.
            </li>
            <li>
              <strong>Reward early:</strong> once an error is showing, check on every keystroke and remove it as soon as
              the value is valid, so the fix is confirmed right away.
            </li>
          </ul>
        ),
      },
      {
        title: "Also",
        body: (
          <ul>
            <li>Don't show errors on empty fields the user only tabbed through; wait for submit.</li>
            <li>On submit, move focus to the first invalid field so keyboard and screen reader users land on it.</li>
            <li>Say how to fix it (“Enter an email like name@example.com”), not only that it's wrong.</li>
          </ul>
        ),
      },
    ],
    demo: ValidationTimingDemo,
    usedIn: [{ label: "Field (native validation messages)", href: "#/text-field" }],
    related: ["accessible-name", "feedforward", "micro-interaction"],
  },
  {
    id: "accessible-name",
    term: "Accessible name",
    aka: ["Label association"],
    category: "Accessibility",
    summary:
      "The name assistive technology announces for an element, like “Email, edit text”. For form fields it should come from a visible <label>, not a placeholder.",
    sections: [
      {
        title: "Where the name comes from",
        body: (
          <p>
            The browser looks, in order, at <code>aria-labelledby</code>, <code>aria-label</code>, a linked{" "}
            <code>&lt;label&gt;</code>, then fallbacks like <code>placeholder</code> or <code>title</code>. The first one
            found wins. Prefer the visible label: sighted users and screen reader users then get the same words.
          </p>
        ),
      },
      {
        title: "Why not the placeholder",
        body: (
          <ul>
            <li>It disappears as soon as you type, so you can't check what the field was for.</li>
            <li>It's styled lighter than real text, so it's harder to read.</li>
            <li>Its use as a name is a fallback, and not every browser and screen reader pair reads it.</li>
            <li>It doesn't make a bigger click target the way a label does.</li>
          </ul>
        ),
      },
      {
        title: "Name vs description",
        body: (
          <p>
            The name says what the field is (“Password”). Hints and errors are the <em>description</em>, linked with{" "}
            <code>aria-describedby</code> and read after the name (“At least 8 characters”).
          </p>
        ),
      },
    ],
    demo: AccessibleNameDemo,
    usedIn: [
      { label: "Field (label + describedby)", href: "#/text-field" },
      { label: "IconButton (required aria-label)", href: "#/button" },
    ],
    related: ["validation-timing", "hit-area"],
  },
  {
    id: "indeterminate-state",
    term: "Indeterminate state",
    aka: ["Mixed state", "Tri-state checkbox"],
    category: "Interaction",
    summary:
      "A third look for a checkbox, a dash, meaning “some of the items under me are selected”. Used on a parent “select all” checkbox.",
    sections: [
      {
        title: "How it works",
        body: (
          <ul>
            <li>None of the children checked → parent empty. All checked → parent checked. Some → parent shows a dash.</li>
            <li>
              It's a visual state only: <code>input.indeterminate = true</code> is a DOM property (there's no HTML
              attribute), and it's not submitted with the form.
            </li>
            <li>Screen readers announce it as “mixed” or “half checked”.</li>
            <li>Clicking a mixed parent usually selects everything; clicking again clears everything.</li>
          </ul>
        ),
      },
      {
        title: "Watch out",
        body: (
          <p>
            The browser clears <code>indeterminate</code> on click, so derive it from the children's state on every
            render instead of setting it once.
          </p>
        ),
      },
    ],
    demo: IndeterminateDemo,
    usedIn: [{ label: "Checkbox (indeterminate prop)", href: "#/checkbox" }],
    related: ["micro-interaction"],
  },
  {
    id: "non-text-contrast",
    term: "Non-text contrast",
    aka: ["WCAG 1.4.11", "UI component contrast"],
    category: "Accessibility",
    summary:
      "Edges, icons and states that you need to see to use a control must have at least 3:1 contrast with what's next to them. Text has its own, higher rule (4.5:1).",
    sections: [
      {
        title: "What it covers",
        body: (
          <ul>
            <li>The box of an empty checkbox or radio, and a switch's track or thumb.</li>
            <li>Focus rings, and the difference between selected and not selected.</li>
            <li>Icons that carry meaning without a text label.</li>
          </ul>
        ),
      },
      {
        title: "In this design system",
        body: (
          <p>
            Card and divider borders are decorative, so they can be faint. Every form control (inputs, textareas,
            checkboxes, radios, switches) uses <code>--color-border-control</code>, which is at least 3:1 in both themes,
            and the switch's off state uses a dark thumb, so color isn't the only cue.
          </p>
        ),
      },
    ],
    demo: NonTextContrastDemo,
    usedIn: [
      { label: "Checkbox", href: "#/checkbox" },
      { label: "Radio group", href: "#/radio" },
      { label: "Switch", href: "#/switch" },
      { label: "Text field", href: "#/text-field" },
    ],
    related: ["forced-colors", "hit-area", "accessible-name"],
  },
  {
    id: "character-ramp",
    term: "Character ramp",
    aka: ["Glyph ramp", "ASCII shading"],
    category: "Visual",
    summary:
      "An ordered list of characters from sparse to dense, like “ .:-=+*#%@”. Each brightness value picks one, so text can shade an image.",
    sections: [
      {
        title: "How it works",
        body: (
          <ul>
            <li>Start with a value per cell, 0 (empty) to 1 (full).</li>
            <li>
              Pick <code>ramp[floor(value × length)]</code>. The first character is usually a space, so low values
              draw nothing.
            </li>
            <li>Order the glyphs by how much ink they put in their cell, not alphabetically.</li>
          </ul>
        ),
      },
      {
        title: "Choosing one",
        body: (
          <ul>
            <li>Short ramps (4–6 glyphs) read bold and graphic, and survive small cell sizes.</li>
            <li>Long ramps shade smoothly, but neighbouring glyphs look alike and get noisy when small.</li>
            <li>Use a monospace font so every cell is the same width.</li>
          </ul>
        ),
      },
    ],
    demo: CharacterRampDemo,
    usedIn: [{ label: "ASCII field", href: "#/backgrounds/ascii-field" }],
    related: ["reduced-motion"],
  },
];

export const SORTED_TERMS = [...TERMS].sort((a, b) => a.term.localeCompare(b.term));
/** Sidebar / prev-next order: by category, then A–Z inside each. */
export const TERMS_BY_CATEGORY = CATEGORIES.flatMap((c) => SORTED_TERMS.filter((t) => t.category === c));
export const getTerm = (id: string) => TERMS.find((t) => t.id === id);
