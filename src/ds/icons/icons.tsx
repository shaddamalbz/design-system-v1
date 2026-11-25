import * as React from "react";
import { cx } from "../utils/cx";

/* ==========================================================================
   Icons: drawn from scratch on a 24×24 grid, 2px stroke, currentColor.

   Every icon is centered by its BOUNDING BOX (the geometric center). For
   symmetric shapes that also looks centered. Asymmetric shapes (a play
   triangle, a paper plane) carry most of their visual weight on one side,
   so their visual center (roughly the centroid) sits off the box center.
   Those icons ship with a `nudge`: a small offset, in 24-grid units,
   that moves the shape toward looking centered. This is called optical
   centering.

   The nudge is applied with CSS `translate`, scaled by `--ds-optical`
   (1 by default). Set `--ds-optical: 0` on any ancestor to turn every
   optical correction off, e.g. to compare.
   ========================================================================== */

type Nudge = readonly [x: number, y: number];

export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "ref"> {
  /** Icon size. Defaults to 1em (inherits font-size, e.g. from a Button). */
  size?: number | string;
  /** Override the optical nudge in 24-grid units, or `false` to disable it. */
  nudge?: Nudge | false;
}

export type IconComponent = React.ForwardRefExoticComponent<IconProps & React.RefAttributes<SVGSVGElement>> & {
  /** The built-in optical nudge for this icon, in 24-grid units. */
  nudge: Nudge;
};

export function createIcon(name: string, children: React.ReactNode, defaultNudge: Nudge = [0, 0]): IconComponent {
  const Icon = React.forwardRef<SVGSVGElement, IconProps>(function Icon(
    { size, nudge, className, style, ...props },
    ref,
  ) {
    const [nx, ny] = nudge === false ? [0, 0] : (nudge ?? defaultNudge);
    return (
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        width="1em"
        height="1em"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        data-icon={name}
        className={cx("ds-icon", className)}
        style={
          {
            fontSize: size,
            // 24 grid units = 1em, so the nudge scales with the icon size
            "--ds-icon-nudge-x": `${nx / 24}em`,
            "--ds-icon-nudge-y": `${ny / 24}em`,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </svg>
    );
  }) as IconComponent;
  Icon.displayName = `${name}Icon`;
  Icon.nudge = defaultNudge;
  return Icon;
}

/* --- Symmetric: box center = visual center, no nudge ------------------- */

export const PlusIcon = createIcon("Plus", <path d="M12 5v14M5 12h14" />);

export const MinusIcon = createIcon("Minus", <path d="M5 12h14" />);

/* Four corners: "fit to view" */
export const MaximizeIcon = createIcon("Maximize", <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />);

export const XIcon = createIcon("X", <path d="M6 6l12 12M18 6 6 18" />);

export const CheckIcon = createIcon("Check", <path d="M4 12.5l5 5 11-11" />);

export const ArrowRightIcon = createIcon("ArrowRight", <path d="M5 12h14M13 6l6 6-6 6" />);

export const ChevronRightIcon = createIcon("ChevronRight", <path d="M9 6l6 6-6 6" />);

export const ChevronDownIcon = createIcon("ChevronDown", <path d="M6 9l6 6 6-6" />);

export const DownloadIcon = createIcon("Download", <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />);

export const TrashIcon = createIcon(
  "Trash",
  <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
);

export const SearchIcon = createIcon(
  "Search",
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M16 16l4 4" />
  </>,
);

export const AlertCircleIcon = createIcon(
  "AlertCircle",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16.5h.01" />
  </>,
);

export const MailIcon = createIcon(
  "Mail",
  <>
    <rect x="3" y="5" width="18" height="14" rx="2.5" />
    <path d="m4 7.5 8 5.5 8-5.5" />
  </>,
);

export const LinkIcon = createIcon(
  "Link",
  <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />,
);

/* Eye with an optional slash. The slash is drawn with pathLength="1" so CSS
   can animate it in and out with stroke-dashoffset (see PasswordInput). */
export const EyeIcon = createIcon(
  "Eye",
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
    <path className="ds-icon-slash" d="M4 4l16 16" pathLength={1} />
  </>,
);

/* --- Asymmetric: need optical centering ----------------------------------
   Play: box spans x 6.5–17.5 (center 12), but the triangle's centroid is
   at x ≈ 10.2 because the mass sits at the flat back edge. It looks shifted
   left, so it's nudged 1.5 units right (most of the 1.8 gap; judged by eye).

   Send: box spans 2–22 on both axes (center 12, 12); the centroid is near
   (13.8, 10.2). The plane looks up-right, so it's nudged 1 unit left and
   1 down.
   -------------------------------------------------------------------------- */

export const PlayIcon = createIcon(
  "Play",
  <path d="M6.5 5v14l11-7z" fill="currentColor" />,
  [1.5, 0],
);

export const SendIcon = createIcon("Send", <path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" />, [-1, 1]);

/* Heart: the two lobes put most of the weight in the top half, so the
   box-centered heart looks high. Nudged 0.5 units down. Pass
   fill="currentColor" for the filled (active) state. */
export const HeartIcon = createIcon(
  "Heart",
  <path d="M12 20s-7-4.35-7-10a4 4 0 0 1 7-2.65A4 4 0 0 1 19 10c0 5.65-7 10-7 10z" />,
  [0, 0.5],
);
