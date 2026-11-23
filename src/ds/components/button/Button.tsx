import * as React from "react";
import { cx } from "../../utils/cx";

/* ==========================================================================
   Button / IconButton

   Optical adjustments (on by default, see button.css):
   1. Optical padding: the icon side gets less padding than the label side.
      An icon's box has empty space built in and the glyph is lighter than
      text, so equal padding makes the icon side look emptier.
   2. Optical centering: asymmetric icons (play, send) carry a small nudge
      so they look centered, which matters most in a square IconButton.
   3. Text box trim: the label is trimmed to cap height so it centers on
      the letters, not on the font's invisible ascender/descender space.
   ========================================================================== */

type ButtonVariant = "solid" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface SharedProps {
  /** "solid" is the strongest (inverted neutral, the accent until there's a brand color). @default "outline" */
  variant?: ButtonVariant;
  /** 28 / 32 / 40px tall. @default "md" */
  size?: ButtonSize;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, SharedProps {
  /** Icon before the label. Gets optical padding on its side. */
  startIcon?: React.ReactNode;
  /** Icon after the label. Gets optical padding on its side. */
  endIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "outline", size = "md", startIcon, endIcon, type = "button", className, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("ds-button", className)}
      data-variant={variant}
      data-size={size}
      data-start-icon={startIcon ? "" : undefined}
      data-end-icon={endIcon ? "" : undefined}
      {...props}
    >
      {startIcon && (
        <span className="ds-button-icon" aria-hidden="true">
          {startIcon}
        </span>
      )}
      <span className="ds-button-label">{children}</span>
      {endIcon && (
        <span className="ds-button-icon" aria-hidden="true">
          {endIcon}
        </span>
      )}
    </button>
  );
});

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label">,
    SharedProps {
  icon: React.ReactNode;
  /** Required: an icon alone has no accessible name. Also shown as the tooltip. */
  "aria-label": string;
}

/** Square, icon-only button. `aria-label` is required by the type. */
export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { variant = "ghost", size = "md", icon, type = "button", className, title, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cx("ds-button", className)}
      data-variant={variant}
      data-size={size}
      data-icon-only=""
      // Native tooltip so sighted mouse users get the name too
      title={title ?? props["aria-label"]}
      {...props}
    >
      <span className="ds-button-icon" aria-hidden="true">
        {icon}
      </span>
    </button>
  );
});
