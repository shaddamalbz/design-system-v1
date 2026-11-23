import * as React from "react";
import { cx } from "../../utils/cx";
import { Fieldset, joinIds, reportInvalid, revalidate, useErrorMessage, type FieldsetProps } from "../field";
import type { ChoiceSize } from "../checkbox";

/* ==========================================================================
   RadioGroup + Radio: native radios sharing a `name`. The browser already
   gives you the radio group keyboard model for free: Tab enters the group
   on the checked radio, arrow keys move AND select, Tab leaves the group.
   `required` on the group shows "Select one of these options" on submit.
   ========================================================================== */

interface RadioContextValue {
  name: string;
  value: string | undefined;
  select: (value: string) => void;
  required?: boolean;
  invalid: boolean;
  size?: ChoiceSize;
  hasNativeError: boolean;
  setNativeError: (message: string | null) => void;
}
const RadioContext = React.createContext<RadioContextValue | null>(null);

export interface RadioGroupProps extends Omit<FieldsetProps, "onChange" | "defaultValue"> {
  /** Shared name. Generated when omitted (needed for arrow keys to work). */
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** One option must be picked before the form submits. */
  required?: boolean;
  size?: ChoiceSize;
}

export function RadioGroup({
  name,
  value: valueProp,
  defaultValue,
  onValueChange,
  required,
  size,
  error,
  children,
  ...props
}: RadioGroupProps) {
  const autoName = React.useId();
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue);
  const value = valueProp ?? uncontrolled;

  // A native form reset puts the inputs back to their defaults; keep state in sync
  const fieldsetRef = React.useRef<HTMLFieldSetElement>(null);
  const initial = React.useRef(defaultValue);
  React.useEffect(() => {
    const form = fieldsetRef.current?.form;
    if (!form) return;
    const onReset = () => setUncontrolled(initial.current);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);
  const { message, native, setNative } = useErrorMessage(error);

  const select = React.useCallback(
    (next: string) => {
      if (valueProp === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [valueProp, onValueChange],
  );

  const context = React.useMemo<RadioContextValue>(
    () => ({
      name: name ?? autoName,
      value,
      select,
      required,
      invalid: Boolean(message),
      size,
      hasNativeError: native !== null,
      setNativeError: setNative,
    }),
    [name, autoName, value, select, required, message, size, native, setNative],
  );

  return (
    <RadioContext.Provider value={context}>
      <Fieldset ref={fieldsetRef} role="radiogroup" required={required} error={message} {...props}>
        {children}
      </Fieldset>
    </RadioContext.Provider>
  );
}

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size" | "value"> {
  value: string;
  label?: React.ReactNode;
  description?: React.ReactNode;
}

export const Radio = React.forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { value, label, description, id, className, style, onChange, onInvalid, ...props },
  ref,
) {
  const group = React.useContext(RadioContext);
  const autoId = React.useId().replace(/:/g, "");
  const inputId = id ?? `ds-radio-${autoId}`;
  const descriptionId = `${inputId}-description`;

  const groupProps = group
    ? {
        name: group.name,
        checked: group.value === value,
        required: group.required,
        "aria-invalid": group.invalid ? (true as const) : undefined,
      }
    : {};

  return (
    <div className={cx("ds-choice", "ds-radio", className)} style={style} data-size={group?.size ?? "md"}>
      <span className="ds-choice-control">
        <input
          ref={ref}
          id={inputId}
          type="radio"
          className="ds-choice-input ds-radio-input"
          value={value}
          aria-describedby={joinIds(description && descriptionId, props["aria-describedby"])}
          {...groupProps}
          {...props}
          onChange={(e) => {
            onChange?.(e);
            group?.select(value);
            if (group) revalidate(e.currentTarget, group.hasNativeError, group.setNativeError);
          }}
          onInvalid={(e) => {
            onInvalid?.(e);
            // Every radio in the group fires `invalid`; one message is enough
            if (group) reportInvalid(e, group.setNativeError);
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
