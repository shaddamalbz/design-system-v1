import * as React from "react";
import { AlertCircleIcon } from "../../icons";

/* ==========================================================================
   Shared validation helpers for Field, Fieldset, Checkbox, RadioGroup…

   The browser already knows when a control is invalid (required, type,
   minLength, pattern). These helpers only change how that's shown: an inline
   message instead of the browser bubble, with "reward early, punish late"
   timing, and focus on the first invalid control after submit.
   ========================================================================== */

export type Control = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

/** Is `el` the first invalid control of its form? Only that one takes focus on submit. */
export function isFirstInvalid(el: Control) {
  const form = el.form;
  if (!form) return true;
  const first = Array.from(form.elements).find(
    (x): x is Control => "willValidate" in x && (x as Control).willValidate && !(x as Control).validity.valid,
  );
  return first === el;
}

/** onInvalid: show our message instead of the bubble, focus the first invalid control. */
export function reportInvalid(e: React.FormEvent<Control>, setError: (message: string | null) => void) {
  if (e.defaultPrevented) return;
  e.preventDefault();
  const el = e.currentTarget;
  setError(el.validationMessage);
  el.form?.addEventListener("reset", () => setError(null), { once: true });
  if (isFirstInvalid(el)) {
    // Centered, so a sticky header can't cover it and its label stays in view
    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center" });
  }
}

/** Reward early: update or clear an error that's already showing. */
export function revalidate(el: Control, hasError: boolean, setError: (message: string | null) => void) {
  if (hasError) setError(el.validity.valid ? null : el.validationMessage);
}

/** A custom `error` prop wins; otherwise the browser's message, if any. */
export function useErrorMessage(custom: React.ReactNode) {
  const [native, setNative] = React.useState<string | null>(null);
  const hasCustom = custom !== undefined && custom !== null && custom !== false && custom !== "";
  return { message: hasCustom ? custom : native, native, setNative };
}

/** Joins ids for aria-describedby; anything falsy is skipped. */
export const joinIds = (...ids: unknown[]) => ids.filter((id): id is string => typeof id === "string" && id !== "").join(" ") || undefined;

/** Icon + text, so an error never relies on color alone (WCAG 1.4.1). */
export function FieldError({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <div className="ds-field-error" id={id}>
      <AlertCircleIcon className="ds-field-error-icon" />
      <span>{children}</span>
    </div>
  );
}
