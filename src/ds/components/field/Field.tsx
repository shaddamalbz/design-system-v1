import * as React from "react";
import { cx } from "../../utils/cx";
import { FieldError, joinIds, reportInvalid, revalidate, useErrorMessage, type Control } from "./validation";

/* ==========================================================================
   Field: label + description + control + error, wired together.

   Field owns the ids. Any control inside it (Input, Textarea, and later
   Select or Checkbox) calls useFieldControl() and gets:
     id                → matches <label htmlFor>
     aria-describedby  → description id (+ error id while there's an error)
     aria-invalid      → true while an error is shown
     required/disabled → from the Field

   Validation: pass `error` to show your own message. Without it, Field shows
   the browser's message for native constraints (required, type="email",
   minLength, pattern…) using "reward early, punish late" timing:
     - a new error appears on blur (after you typed) or on submit
     - an existing error updates or clears on every keystroke
   ========================================================================== */

interface FieldContextValue {
  controlId: string;
  describedBy: string | undefined;
  invalid: boolean;
  required?: boolean;
  disabled?: boolean;
  hasNativeError: boolean;
  setNativeError: (message: string | null) => void;
}

const FieldContext = React.createContext<FieldContextValue | null>(null);

export interface FieldProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "children" | "id"> {
  /** Visible label. Always give one: placeholders are not labels. */
  label: React.ReactNode;
  /** Hint shown between the label and the control, so it's read before typing. */
  description?: React.ReactNode;
  /** Error message. Overrides the browser's validation message. Falsy = no error. */
  error?: React.ReactNode;
  /** Marks the control required and shows an asterisk after the label. */
  required?: boolean;
  /** Shows "(optional)" after the label. Mark whichever kind is rarer in the form. */
  optional?: boolean;
  /** Disables the control. */
  disabled?: boolean;
  /** Id for the control. Generated when omitted. */
  id?: string;
  children: React.ReactNode;
}

export function Field({
  label,
  description,
  error,
  required,
  optional,
  disabled,
  id,
  className,
  children,
  ...props
}: FieldProps) {
  const autoId = React.useId().replace(/:/g, "");
  const controlId = id ?? `ds-field-${autoId}`;
  const descriptionId = `${controlId}-description`;
  const errorId = `${controlId}-error`;

  const { message, native: nativeError, setNative: setNativeError } = useErrorMessage(error);
  const invalid = Boolean(message);
  const describedBy = joinIds(description && descriptionId, invalid && errorId);

  const context = React.useMemo<FieldContextValue>(
    () => ({
      controlId,
      describedBy,
      invalid,
      required,
      disabled,
      hasNativeError: nativeError !== null,
      setNativeError,
    }),
    [controlId, describedBy, invalid, required, disabled, nativeError],
  );

  return (
    <div
      className={cx("ds-field", className)}
      data-invalid={invalid ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      {...props}
    >
      <label className="ds-field-label" htmlFor={controlId}>
        {label}
        {/* The asterisk is visual only: `required` on the control tells screen readers. */}
        {required && (
          <span className="ds-field-required" aria-hidden="true">
            *
          </span>
        )}
        {optional && !required && <span className="ds-field-optional">(optional)</span>}
      </label>
      {description && (
        <div className="ds-field-description" id={descriptionId}>
          {description}
        </div>
      )}
      <FieldContext.Provider value={context}>{children}</FieldContext.Provider>
      {invalid && <FieldError id={errorId}>{message}</FieldError>}
    </div>
  );
}

type ControlProps<E extends Control> = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  required?: boolean;
  disabled?: boolean;
  onInvalid?: React.FormEventHandler<E>;
  onBlur?: React.FocusEventHandler<E>;
  onInput?: React.FormEventHandler<E>;
};

/**
 * Connects a control to the surrounding Field. Spread the result onto the
 * native element after your own props. Outside a Field it returns {}.
 */
export function useFieldControl<E extends Control>(props: ControlProps<E>): ControlProps<E> {
  const field = React.useContext(FieldContext);
  const touched = React.useRef(false);
  if (!field) return {};

  return {
    // The label points at this id, so a Field always wins
    id: field.controlId,
    "aria-describedby": joinIds(field.describedBy, props["aria-describedby"]),
    "aria-invalid": props["aria-invalid"] ?? (field.invalid ? true : undefined),
    required: props.required ?? field.required,
    disabled: props.disabled ?? field.disabled,

    // Submit: replace the browser bubble with our message, focus the first invalid control
    onInvalid: (e) => {
      props.onInvalid?.(e);
      reportInvalid(e, field.setNativeError);
    },
    // Punish late: a new error only after the user leaves a field they typed in
    onBlur: (e) => {
      props.onBlur?.(e);
      const el = e.currentTarget;
      if (touched.current && !el.validity.valid) field.setNativeError(el.validationMessage);
    },
    // Reward early: an existing error updates or clears while typing
    onInput: (e) => {
      props.onInput?.(e);
      touched.current = true;
      const el = e.currentTarget;
      revalidate(el, field.hasNativeError, field.setNativeError);
    },
  };
}
