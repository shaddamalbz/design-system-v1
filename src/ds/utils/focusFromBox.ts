import type * as React from "react";

/**
 * Clicking anywhere in a control box (padding, an icon, a "https://" prefix)
 * focuses its native element, like a real text field would. Clicks on the
 * element itself or on anything interactive inside the box are left alone.
 */
export function focusFromBox(e: React.MouseEvent<HTMLElement>, el: HTMLElement | null) {
  const target = e.target as HTMLElement;
  if (!el || target === el || target.closest("button, a, input, select, textarea, [tabindex]")) return;
  if ((el as HTMLInputElement).disabled) return;
  e.preventDefault(); // keep the caret where it was instead of blurring
  el.focus();
}
