import * as React from "react";
import { cx } from "../../utils/cx";
import { joinIds } from "../field";
import type { ChoiceSize } from "../checkbox";

/* ==========================================================================
   Switch: <input type="checkbox" role="switch">. Screen readers say
   "on/off" instead of "checked/not checked". Space toggles it, it submits
   like a checkbox, and the track and thumb are pure CSS.

   Use a switch for settings that apply immediately (Wi-Fi, dark mode).
   For choices that wait for a Save/Submit button, use a Checkbox.
   ========================================================================== */

export interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "role"> {
  label?: React.ReactNode;
  description?: React.ReactNode;
  /** 28×16 / 36×20 / 44×24px. @default "md" */
  size?: ChoiceSize;
  /** "end": switch, then label. "start": label, then switch at the far end (settings rows). @default "end" */
  labelPosition?: "start" | "end";
  onCheckedChange?: (checked: boolean) => void;
}

export const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(function Switch(
  { label, description, size = "md", labelPosition = "end", onCheckedChange, id, className, style, onChange, ...props },
  ref,
) {
  const autoId = React.useId().replace(/:/g, "");
  const inputId = id ?? `ds-switch-${autoId}`;
  const descriptionId = `${inputId}-description`;

  return (
    <div
      className={cx("ds-choice", "ds-switch", className)}
      style={style}
      data-size={size}
      data-label-position={labelPosition}
    >
      <span className="ds-choice-control">
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          className="ds-choice-input ds-switch-input"
          aria-describedby={joinIds(description && descriptionId, props["aria-describedby"])}
          {...props}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
          }}
        />
      </span>
      {(label || description) && (
        <span className="ds-choice-text">
          {label && (
            <label className="ds-choice-label" htmlFor={inputId}>
              {label}
            </label>
          )}
          {description && (
            <span className="ds-choice-description" id={descriptionId}>
              {description}
            </span>
          )}
        </span>
      )}
    </div>
  );
});
