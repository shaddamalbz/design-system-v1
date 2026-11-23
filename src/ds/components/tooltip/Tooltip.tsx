import * as React from "react";
import { cx } from "../../utils/cx";

/* ==========================================================================
   Tooltip

   Placement is pure CSS (tooltip.css):
   - CSS anchor positioning ties the tooltip to its trigger (anchor-name /
     position-anchor) and places it with position-area.
   - position-try-fallbacks flips it to the other side, or slides it along,
     when it would overflow. The browser does the measuring.
   - Showing is CSS too: :hover (pointer devices only) and :focus-visible.

   The only JavaScript: unique anchor names + ids, and Escape to dismiss
   (WCAG 1.4.13 requires hover content to be dismissible; CSS can't listen
   for keys).

   Browsers without anchor positioning get the classic absolute tooltip:
   same look, fixed side, no flipping (progressive enhancement).
   ========================================================================== */

export type TooltipSide = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  /** Tooltip text. Keep it short; it can't hold interactive content. */
  content: React.ReactNode;
  /** Keyboard shortcut shown after the text, e.g. "Ctrl+B". */
  shortcut?: string;
  /** Preferred side; flips when there's no room. @default "top" */
  side?: TooltipSide;
  /** Hover delay in ms (keyboard focus shows immediately). @default 400 */
  delay?: number;
  /** Force it open (docs, onboarding). */
  open?: boolean;
  /** The trigger: one focusable element. */
  children: React.ReactElement<React.HTMLAttributes<HTMLElement> & { "aria-label"?: string }>;
  className?: string;
}

export function Tooltip({ content, shortcut, side = "top", delay = 400, open, children, className }: TooltipProps) {
  const rawId = React.useId();
  const id = `ds-tt${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
  const [dismissed, setDismissed] = React.useState(false);
  const [active, setActive] = React.useState(false);

  // Escape hides it until the pointer leaves / focus moves on
  React.useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDismissed(true);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [active]);

  const reset = () => {
    setActive(false);
    setDismissed(false);
  };

  // Don't describe the trigger with the same words as its name
  const sameAsLabel = typeof content === "string" && children.props["aria-label"] === content && !shortcut;
  const describedBy = cx(children.props["aria-describedby"], !sameAsLabel && id) || undefined;

  return (
    <span
      className={cx("ds-tooltip-trigger", className)}
      style={{ "--ds-tooltip-anchor": `--${id}` } as React.CSSProperties}
      data-dismissed={dismissed ? "" : undefined}
      data-open={open ? "" : undefined}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={reset}
      onFocus={() => setActive(true)}
      onBlur={reset}
    >
      {React.cloneElement(children, { "aria-describedby": describedBy })}
      <span
        role="tooltip"
        id={id}
        className="ds-tooltip"
        data-side={side}
        style={{ "--ds-tooltip-delay": `${delay}ms` } as React.CSSProperties}
      >
        {content}
        {shortcut && <kbd className="ds-tooltip-kbd">{shortcut}</kbd>}
      </span>
    </span>
  );
}
