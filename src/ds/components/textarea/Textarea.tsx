import * as React from "react";
import { cx } from "../../utils/cx";
import { focusFromBox } from "../../utils/focusFromBox";
import { useFieldControl } from "../field";

/* ==========================================================================
   Textarea: grows with its content via CSS `field-sizing: content`, no JS
   measuring. Browsers without it get a fixed height of `minRows` that the
   user can resize (progressive enhancement).

   Character count (`showCount` + `maxLength`): the visible "12/200" is
   decorative; screen readers get the limit as a description, and a polite
   announcement only when few characters are left.
   ========================================================================== */

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> {
  /** 28 / 32 / 40px tall per line of padding, same scale as Input. @default "md" */
  size?: "sm" | "md" | "lg";
  /** Grow with the content (where supported). @default true */
  autoResize?: boolean;
  /** Height in lines when empty. @default 3 */
  minRows?: number;
  /** Stops growing here and scrolls. @default 10 */
  maxRows?: number;
  /** Show "used / maxLength". Needs `maxLength`. */
  showCount?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    size = "md",
    autoResize = true,
    minRows = 3,
    maxRows = 10,
    showCount,
    maxLength,
    className,
    style,
    onInput,
    ...props
  },
  ref,
) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(ref, () => textareaRef.current!, []);
  const control = useFieldControl<HTMLTextAreaElement>({ ...props, onInput });

  const countId = React.useId();
  const counting = Boolean(showCount && maxLength);
  // Controlled: read the value. Uncontrolled: track it as the user types.
  const [typed, setTyped] = React.useState(() => String(props.defaultValue ?? "").length);
  const length = props.value !== undefined ? String(props.value).length : typed;
  const left = maxLength ? maxLength - length : 0;

  // Announce only near the limit, and only after a pause in typing
  const [announcement, setAnnouncement] = React.useState("");
  React.useEffect(() => {
    if (!counting || !maxLength) return;
    const threshold = Math.max(10, Math.round(maxLength * 0.1));
    const id = window.setTimeout(() => {
      setAnnouncement(
        left > threshold ? "" : left === 0 ? "Character limit reached" : `${left} character${left === 1 ? "" : "s"} left`,
      );
    }, 600);
    return () => window.clearTimeout(id);
  }, [counting, left, maxLength]);

  return (
    <div
      className={cx("ds-control-box", "ds-textarea", className)}
      style={{ "--_min-rows": minRows, "--_max-rows": maxRows, ...style } as React.CSSProperties}
      data-size={size}
      data-auto-resize={autoResize ? "" : undefined}
      onMouseDown={(e) => focusFromBox(e, textareaRef.current)}
    >
      <textarea
        ref={textareaRef}
        rows={minRows}
        maxLength={maxLength}
        className="ds-textarea-control"
        {...props}
        {...control}
        aria-describedby={[control["aria-describedby"] ?? props["aria-describedby"], counting ? countId : undefined]
          .filter(Boolean)
          .join(" ") || undefined}
        onInput={(e) => {
          (control.onInput ?? onInput)?.(e);
          setTyped(e.currentTarget.value.length);
        }}
      />
      {counting && (
        <div className="ds-textarea-footer">
          <span className="ds-textarea-count" aria-hidden="true" data-limit={left === 0 ? "" : undefined}>
            {length}/{maxLength}
          </span>
          <span id={countId} className="ds-visually-hidden">
            Up to {maxLength} characters.
          </span>
          <span className="ds-visually-hidden" role="status">
            {announcement}
          </span>
        </div>
      )}
    </div>
  );
});
