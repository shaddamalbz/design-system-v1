/* Playground-only icons for the sidebar, drawn with the DS icon conventions
   (24 grid, 2px stroke, currentColor) via createIcon. */
import { createIcon } from "../ds";

/* Droplet: the weight sits in the round bottom, so it's nudged up. */
export const ColorsIcon = createIcon(
  "Colors",
  <path d="M12 3.5s-6 6.4-6 10.5a6 6 0 0 0 12 0c0-4.1-6-10.5-6-10.5z" />,
  [0, -0.5],
);

export const SpacingIcon = createIcon("Spacing", <path d="M4 4v16M20 4v16M8 12h8M10.5 9.5 8 12l2.5 2.5M13.5 9.5 16 12l-2.5 2.5" />);

export const TypographyIcon = createIcon("Typography", <path d="M5 7V5h14v2M12 5v14M9 19h6" />);

/* A single rounded corner: the stroke hugs the top-left, so it's nudged down-right. */
export const ShapeIcon = createIcon("Shape", <path d="M5 19v-7a7 7 0 0 1 7-7h7" />, [1, 1]);

export const ButtonGlyphIcon = createIcon(
  "ButtonGlyph",
  <>
    <rect x="3" y="7" width="18" height="10" rx="3" />
    <path d="M8 12h8" />
  </>,
);

export const TabsGlyphIcon = createIcon(
  "TabsGlyph",
  <path d="M3 9V7a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 9h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
);

export const SidebarGlyphIcon = createIcon(
  "SidebarGlyph",
  <>
    <rect x="2.5" y="4" width="19" height="16" rx="3" />
    <path d="M10.5 4v16" />
  </>,
);

export const TooltipGlyphIcon = createIcon(
  "TooltipGlyph",
  <path d="M5 4h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-5l-2 3-2-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 10h8" />,
);

/* A text box with a caret */
export const TextFieldGlyphIcon = createIcon(
  "TextFieldGlyph",
  <>
    <rect x="2.5" y="6" width="19" height="12" rx="3" />
    <path d="M7 9.5v5" />
  </>,
);

export const CheckboxGlyphIcon = createIcon(
  "CheckboxGlyph",
  <>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="m8.5 12.25 2.5 2.5 4.5-5" />
  </>,
);

export const RadioGlyphIcon = createIcon(
  "RadioGlyph",
  <>
    <circle cx="12" cy="12" r="8" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </>,
);

export const SwitchGlyphIcon = createIcon(
  "SwitchGlyph",
  <>
    <rect x="2.5" y="7" width="19" height="10" rx="5" />
    <circle cx="16.5" cy="12" r="2.5" fill="currentColor" />
  </>,
);


/* A few glyphs on a grid: the ASCII field */
export const AsciiGlyphIcon = createIcon(
  "AsciiGlyph",
  <>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M7.5 8.5h.01M12 8.5h.01M16.5 8.5h.01M7.5 12h.01M12 12h.01M7.5 15.5h.01" strokeWidth={2.5} />
    <path d="M14.5 12h3M11 15.5h6" />
  </>,
);
