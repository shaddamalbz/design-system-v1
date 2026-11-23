import * as React from "react";
import { cx } from "../../utils/cx";
import { FieldError, Fieldset, joinIds, reportInvalid, revalidate, useErrorMessage, type FieldsetProps } from "../field";

/* ==========================================================================
   Checkbox: a native <input type="checkbox"> drawn with CSS
   (appearance: none). The check and the dash are SVG paths drawn in with
   stroke-dashoffset. Keyboard (Space), forms, `required` and the
   indeterminate state all stay native.
   ========================================================================== */

export type ChoiceSize = "sm" | "md" | "lg";

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  /** Visible label. Without one, pass `aria-label`. */
  label?: React.ReactNode;
  /** Hint under the label. */
  description?: React.ReactNode;
  /** Error under the label. Overrides the browser's message (e.g. for `required`). */
  error?: React.ReactNode;
  /** "Some but not all": shows a dash. Cleared by the browser on click; control it from state. */
  indeterminate?: boolean;
  /** 14 / 16 / 20px box. @default "md" */
  size?: ChoiceSize;
  /** Called with the new checked state. */
  onCheckedChange?: (checked: boolean) => void;
}

interface GroupContextValue {
  name?: string;
  value: string[];
  toggle: (value: string, checked: boolean) => void;
  size?: ChoiceSize;
  invalid: boolean;
}
const CheckboxGroupContext = React.createContext<GroupContextValue | null>(null);

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  {
    label,
    description,
    error,
    indeterminate = false,
    size,
    onCheckedChange,
    id,
    className,
    style,
    onChange,
    onInvalid,
    value,
    ...props
  },
  ref,
) {
  const group = React.useContext(CheckboxGroupContext);
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inputRef.current!, []);

  const autoId = React.useId().replace(/:/g, "");
  const inputId = id ?? `ds-cb-${autoId}`;
  const descriptionId = `${inputId}-description`;
  const errorId = `${inputId}-error`;
  const { message, native, setNative } = useErrorMessage(error);
  const invalid = Boolean(message) || Boolean(group?.invalid);

  // indeterminate is a DOM property, not an attribute
  React.useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const inGroup = group && value !== undefined;
  const groupProps = inGroup
    ? { name: group.name, checked: group.value.includes(String(value)) }
    : {};

  return (
    <div
      className={cx("ds-choice", "ds-checkbox", className)}
      style={style}
      data-size={size ?? group?.size ?? "md"}
    >
      <span className="ds-choice-control">
        <input
          ref={inputRef}
          id={inputId}
          type="checkbox"
          className="ds-choice-input ds-checkbox-input"
          value={value}
          aria-describedby={joinIds(description && descriptionId, message && errorId, props["aria-describedby"])}
          aria-invalid={invalid ? true : undefined}
          {...groupProps}
          {...props}
          onChange={(e) => {
            onChange?.(e);
            onCheckedChange?.(e.target.checked);
            if (inGroup) group.toggle(String(value), e.target.checked);
            revalidate(e.currentTarget, native !== null, setNative);
          }}
          onInvalid={(e) => {
            onInvalid?.(e);
            reportInvalid(e, setNative);
          }}
        />
        <svg className="ds-checkbox-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
          <path className="ds-checkbox-check" d="M3.75 8.25 6.5 11l5.75-6" pathLength={1} />
          <path className="ds-checkbox-dash" d="M4.5 8h7" pathLength={1} />
        </svg>
      </span>
      {(label || description || message) && (
        <span className="ds-choice-text">
          {label && (
            <label className="ds-choice-label" htmlFor={inputId}>
              {label}
              {props.required && (
                <span className="ds-field-required" aria-hidden="true">
                  *
                </span>
              )}
            </label>
          )}
          {description && (
            <span className="ds-choice-description" id={descriptionId}>
              {description}
            </span>
          )}
          {message && <FieldError id={errorId}>{message}</FieldError>}
        </span>
      )}
    </div>
  );
});

/* --------------------------------------------------------------------------
   CheckboxGroup: a Fieldset that owns an array of checked values.
   Children are <Checkbox value="…" label="…" />.
   -------------------------------------------------------------------------- */

export interface CheckboxGroupProps extends Omit<FieldsetProps, "onChange" | "defaultValue"> {
  /** Shared `name`, so checked values are submitted as name=a&name=b. */
  name?: string;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  size?: ChoiceSize;
}

export function CheckboxGroup({
  name,
  value: valueProp,
  defaultValue = [],
  onValueChange,
  size,
  error,
  children,
  ...props
}: CheckboxGroupProps) {
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
  const toggle = React.useCallback(
    (item: string, checked: boolean) => {
      const next = checked ? [...value.filter((v) => v !== item), item] : value.filter((v) => v !== item);
      if (valueProp === undefined) setUncontrolled(next);
      onValueChange?.(next);
    },
    [value, valueProp, onValueChange],
  );
  const invalid = Boolean(error);
  const context = React.useMemo(() => ({ name, value, toggle, size, invalid }), [name, value, toggle, size, invalid]);

  return (
    <CheckboxGroupContext.Provider value={context}>
      <Fieldset ref={fieldsetRef} error={error} {...props}>
        {children}
      </Fieldset>
    </CheckboxGroupContext.Provider>
  );
}
