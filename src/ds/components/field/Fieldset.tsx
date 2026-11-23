import * as React from "react";
import { cx } from "../../utils/cx";
import { FieldError, joinIds } from "./validation";

/* ==========================================================================
   Fieldset: a labelled group of controls (checkboxes, radios, or a few
   text fields that belong together). Native <fieldset> + <legend>, so the
   legend is announced when focus enters the group, and `disabled` disables
   every control inside without extra code.
   ========================================================================== */

export interface FieldsetProps extends Omit<React.FieldsetHTMLAttributes<HTMLFieldSetElement>, "children"> {
  /** The group's label, e.g. "Notifications". */
  legend: React.ReactNode;
  /** Hint under the legend. */
  description?: React.ReactNode;
  /** Error for the whole group. Falsy = no error. */
  error?: React.ReactNode;
  /** Shows an asterisk after the legend. Set `required` on the controls too. */
  required?: boolean;
  /** Shows "(optional)" after the legend. */
  optional?: boolean;
  /** Stack the items, or put them in a row that wraps. @default "vertical" */
  orientation?: "vertical" | "horizontal";
  children: React.ReactNode;
}

export const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(function Fieldset(
  { legend, description, error, required, optional, orientation = "vertical", className, children, ...props },
  ref,
) {
  const id = React.useId().replace(/:/g, "");
  const descriptionId = `ds-fs-${id}-description`;
  const errorId = `ds-fs-${id}-error`;
  const invalid = Boolean(error);

  return (
    <fieldset
      ref={ref}
      className={cx("ds-fieldset", className)}
      data-invalid={invalid ? "" : undefined}
      aria-describedby={joinIds(description && descriptionId, invalid && errorId, props["aria-describedby"])}
      {...props}
    >
      <legend className="ds-fieldset-legend">
        {legend}
        {required && (
          <span className="ds-field-required" aria-hidden="true">
            *
          </span>
        )}
        {optional && !required && <span className="ds-field-optional">(optional)</span>}
      </legend>
      {description && (
        <div className="ds-field-description ds-fieldset-description" id={descriptionId}>
          {description}
        </div>
      )}
      <div className="ds-fieldset-items" data-orientation={orientation}>
        {children}
      </div>
      {invalid && <FieldError id={errorId}>{error}</FieldError>}
    </fieldset>
  );
});
