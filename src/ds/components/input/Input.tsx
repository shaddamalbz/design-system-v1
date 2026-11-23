import * as React from "react";
import { cx } from "../../utils/cx";
import { focusFromBox } from "../../utils/focusFromBox";
import { useFieldControl } from "../field";
import { EyeIcon } from "../../icons";
import { IconButton } from "../button";

/* ==========================================================================
   Input: a native <input> inside a control box with optional start/end
   slots. All native attributes (type, name, required, pattern, autoComplete,
   value/defaultValue…) go straight to the <input>, so forms and validation
   work without extra code. Inside a <Field> it's labelled automatically.
   ========================================================================== */

export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size"> {
  /** 28 / 32 / 40px tall, same as Button. @default "md" */
  size?: InputSize;
  /** Before the text: an icon, a prefix like "https://". Clicking it focuses the input. */
  start?: React.ReactNode;
  /** After the text: an icon, a unit, a Kbd, or a small IconButton. */
  end?: React.ReactNode;
  /** The native `size` attribute (width in characters). */
  htmlSize?: number;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", start, end, htmlSize, className, style, type = "text", ...props },
  ref,
) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  React.useImperativeHandle(ref, () => inputRef.current!, []);
  const control = useFieldControl<HTMLInputElement>(props);

  return (
    <div
      className={cx("ds-control-box", "ds-input", className)}
      style={style}
      data-size={size}
      data-start={start ? "" : undefined}
      data-end={end ? "" : undefined}
      onMouseDown={(e) => focusFromBox(e, inputRef.current)}
    >
      {start && (
        <span className="ds-input-slot" data-side="start">
          {start}
        </span>
      )}
      <input ref={inputRef} type={type} size={htmlSize} className="ds-input-control" {...props} {...control} />
      {end && (
        <span className="ds-input-slot" data-side="end">
          {end}
        </span>
      )}
    </div>
  );
});

/* --------------------------------------------------------------------------
   PasswordInput: Input + a show/hide toggle.
   The toggle is a real button with aria-pressed, so screen readers hear
   "Show password, toggle button, not pressed". The eye icon draws its
   slash in or out instead of swapping icons.
   -------------------------------------------------------------------------- */

export interface PasswordInputProps extends Omit<InputProps, "type" | "end"> {
  /** Start with the password visible. */
  defaultVisible?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { defaultVisible = false, autoComplete = "current-password", size = "md", disabled, ...props },
  ref,
) {
  const [visible, setVisible] = React.useState(defaultVisible);
  return (
    <Input
      ref={ref}
      {...props}
      size={size}
      disabled={disabled}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      // Don't let the browser "fix" a password shown as plain text
      spellCheck={false}
      autoCapitalize="off"
      end={
        <IconButton
          size="sm"
          className="ds-password-toggle"
          aria-label="Show password"
          aria-pressed={visible}
          title={visible ? "Hide password" : "Show password"}
          disabled={disabled}
          onClick={() => setVisible((v) => !v)}
          // The icon shows the action: eye = show, slashed eye = hide
          icon={<EyeIcon data-off={visible ? "" : undefined} />}
        />
      }
    />
  );
});
