import * as React from "react";
import { cx } from "../../utils/cx";
import { XIcon } from "../../icons";
import { IconButton } from "../button";

/* ==========================================================================
   Dialog: a modal built on the native <dialog> element + showModal().
   https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/

   <Dialog>
     <DialogTrigger>
       <Button>Edit profile</Button>
     </DialogTrigger>
     <DialogContent>
       <DialogHeader>
         <DialogTitle>Edit profile</DialogTitle>
         <DialogDescription>Changes are visible to your team.</DialogDescription>
       </DialogHeader>
       <DialogBody>…</DialogBody>
       <DialogFooter>
         <DialogClose><Button>Cancel</Button></DialogClose>
         <Button variant="solid">Save</Button>
       </DialogFooter>
     </DialogContent>
   </Dialog>

   What the browser does for free (showModal):
   - Top layer: no z-index wars, no portal, transformed ancestors can't
     trap it.
   - The rest of the page becomes inert: focus is trapped, screen readers
     can't wander outside.
   - Escape closes it (the "cancel" event).
   - ::backdrop to dim the page.

   What this file adds:
   - React state (open / defaultOpen / onOpenChange) kept in sync with the
     element, so Escape and <form method="dialog"> report back.
   - Backdrop click to close (pointerdown AND click must land outside, so a
     text selection dragged out of the dialog doesn't close it). An alert
     dialog refuses and does a small "bump" instead.
   - Initial focus: [data-autofocus] wins; an alert dialog defaults to its
     first <DialogClose> (the least destructive action).
   - Focus returns to whatever opened it.
   - Labelling: aria-labelledby → DialogTitle, aria-describedby →
     DialogDescription (only when one is rendered).

   CSS (dialog.css) does the rest: enter/exit transitions with
   @starting-style + allow-discrete, page scroll lock with :has(:modal),
   and header/footer dividers that appear only while the body can scroll
   in that direction (scroll-driven animation).
   ========================================================================== */

export type DialogSize = "sm" | "md" | "lg";

interface DialogContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  titleId: string;
  descriptionId: string;
  hasDescription: boolean;
  setHasDescription: (has: boolean) => void;
}

const DialogContext = React.createContext<DialogContextValue | null>(null);

function useDialogContext(component: string) {
  const ctx = React.useContext(DialogContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Dialog>.`);
  return ctx;
}

/* --------------------------------------------------------------------------
   <Dialog>: state only, renders no element
   -------------------------------------------------------------------------- */

export interface DialogProps {
  /** Open state (controlled). */
  open?: boolean;
  /** Initial open state (uncontrolled). @default false */
  defaultOpen?: boolean;
  /** Called when the dialog asks to open or close (trigger, Escape, backdrop, DialogClose, form submit). */
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open: openProp, defaultOpen = false, onOpenChange, children }: DialogProps) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : uncontrolled;

  const onOpenChangeRef = React.useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!controlled) setUncontrolled(next);
      onOpenChangeRef.current?.(next);
    },
    [controlled],
  );

  const baseId = React.useId().replace(/:/g, "");
  const [hasDescription, setHasDescription] = React.useState(false);

  const ctx = React.useMemo<DialogContextValue>(
    () => ({
      open,
      setOpen,
      titleId: `ds-dialog-${baseId}-title`,
      descriptionId: `ds-dialog-${baseId}-description`,
      hasDescription,
      setHasDescription,
    }),
    [open, setOpen, baseId, hasDescription],
  );

  return <DialogContext.Provider value={ctx}>{children}</DialogContext.Provider>;
}

/* --------------------------------------------------------------------------
   <DialogTrigger> / <DialogClose>: wrap one element, add the click
   -------------------------------------------------------------------------- */

type ClickableElement = React.ReactElement<React.HTMLAttributes<HTMLElement> & { "data-ds-dialog-close"?: string }>;

export interface DialogTriggerProps {
  /** One button-like element. */
  children: ClickableElement;
}

export function DialogTrigger({ children }: DialogTriggerProps) {
  const { setOpen } = useDialogContext("DialogTrigger");
  return React.cloneElement(children, {
    "aria-haspopup": "dialog",
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(e);
      if (!e.defaultPrevented) setOpen(true);
    },
  });
}

export interface DialogCloseProps {
  /** One button-like element. Call e.preventDefault() in its onClick to keep the dialog open. */
  children: ClickableElement;
}

export function DialogClose({ children }: DialogCloseProps) {
  const { setOpen } = useDialogContext("DialogClose");
  return React.cloneElement(children, {
    "data-ds-dialog-close": "",
    onClick: (e: React.MouseEvent<HTMLElement>) => {
      children.props.onClick?.(e);
      if (!e.defaultPrevented) setOpen(false);
    },
  });
}

/* --------------------------------------------------------------------------
   <DialogContent>: the <dialog> element
   -------------------------------------------------------------------------- */

export interface DialogContentProps
  extends Omit<React.DialogHTMLAttributes<HTMLDialogElement>, "open" | "role"> {
  /** Max width: 400 / 520 / 720px. @default "md" */
  size?: DialogSize;
  /**
   * "alertdialog" for confirmations that interrupt (delete, discard). It
   * focuses the first DialogClose, doesn't close on backdrop click and
   * hides the × button by default. @default "dialog"
   */
  role?: "dialog" | "alertdialog";
  /** Show the × button in the corner. @default true, false for alertdialog */
  closeButton?: boolean;
  /** Close when the backdrop is clicked. @default true, false for alertdialog */
  closeOnBackdropClick?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const DialogContent = React.forwardRef<HTMLDialogElement, DialogContentProps>(function DialogContent(
  { size = "md", role = "dialog", closeButton, closeOnBackdropClick, className, children, ...props },
  forwardedRef,
) {
  const { open, setOpen, titleId, descriptionId, hasDescription } = useDialogContext("DialogContent");
  const isAlert = role === "alertdialog";
  const showClose = closeButton ?? !isAlert;
  const backdropCloses = closeOnBackdropClick ?? !isAlert;

  const ref = React.useRef<HTMLDialogElement>(null);
  React.useImperativeHandle(forwardedRef, () => ref.current as HTMLDialogElement);

  const returnFocusTo = React.useRef<HTMLElement | null>(null);

  // Keep the element in sync with React state
  React.useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      returnFocusTo.current = document.activeElement as HTMLElement | null;
      dialog.showModal();
      // [data-autofocus] first (React's autoFocus doesn't set the attribute),
      // then an alert dialog's least destructive action. Otherwise the
      // browser's choice: the first focusable element.
      const target =
        dialog.querySelector<HTMLElement>("[data-autofocus], [autofocus]") ??
        (isAlert ? dialog.querySelector<HTMLElement>("[data-ds-dialog-close]") : null);
      target?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, isAlert]);

  // Closing for any reason: put focus back where it came from (browsers
  // mostly do this already; this covers the rest and controlled re-renders).
  React.useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const onClose = () => {
      const target = returnFocusTo.current;
      returnFocusTo.current = null;
      if (target?.isConnected && (document.activeElement === document.body || dialog.contains(document.activeElement))) {
        target.focus();
      }
      // Escape, <form method="dialog">, or close() from outside React
      if (open) setOpen(false);
    };
    dialog.addEventListener("close", onClose);
    return () => dialog.removeEventListener("close", onClose);
  }, [open, setOpen]);

  // Unmounted while open: the top layer would keep it, so close first.
  React.useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  // Escape: route it through React state so controlled parents decide.
  // Your own onCancel can call e.preventDefault() to keep it open.
  const onCancel = (e: React.SyntheticEvent<HTMLDialogElement>) => {
    props.onCancel?.(e);
    const keepOpen = e.defaultPrevented;
    e.preventDefault();
    if (!keepOpen) setOpen(false);
  };

  // A backdrop click on a dialog that won't close: a small bump says
  // "you have to answer this" instead of silently ignoring the click.
  const bump = () => {
    const dialog = ref.current;
    if (!dialog || prefersReducedMotion()) return;
    dialog.animate([{ scale: 1 }, { scale: 1.015 }, { scale: 1 }], {
      duration: 240,
      easing: "cubic-bezier(0.2, 0, 0, 1)",
    });
  };

  // Backdrop: ::backdrop clicks target the <dialog> itself, but so do clicks
  // on its own padding, so compare against the box instead.
  const downOutside = React.useRef(false);
  const isOutside = (e: React.PointerEvent | React.MouseEvent) => {
    const dialog = ref.current;
    if (!dialog || e.target !== dialog) return false;
    const r = dialog.getBoundingClientRect();
    return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
  };

  return (
    <dialog
      ref={ref}
      role={isAlert ? "alertdialog" : undefined}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={hasDescription ? descriptionId : undefined}
      className={cx("ds-dialog", className)}
      data-size={size}
      {...props}
      onCancel={onCancel}
      onPointerDown={(e) => {
        props.onPointerDown?.(e);
        downOutside.current = isOutside(e);
      }}
      onMouseDown={(e) => {
        props.onMouseDown?.(e);
        // A press on the backdrop would move focus to the page behind;
        // keep it inside so it can go back to the trigger on close.
        if (isOutside(e)) e.preventDefault();
      }}
      onClick={(e) => {
        props.onClick?.(e);
        const outside = downOutside.current && isOutside(e);
        downOutside.current = false;
        if (!outside) return;
        if (backdropCloses) setOpen(false);
        else bump();
      }}
    >
      {children}
      {showClose && (
        // Last in the DOM so it isn't what gets initial focus, but drawn in
        // the top-right corner where people look for it.
        <IconButton
          size="sm"
          className="ds-dialog-close"
          icon={<XIcon />}
          aria-label="Close"
          onClick={() => setOpen(false)}
        />
      )}
    </dialog>
  );
});

/* --------------------------------------------------------------------------
   Layout parts
   -------------------------------------------------------------------------- */

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-dialog-header", className)} {...props} />;
}

export interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Heading level. @default "h2" */
  as?: "h1" | "h2" | "h3";
}

export function DialogTitle({ as: Tag = "h2", className, ...props }: DialogTitleProps) {
  const { titleId } = useDialogContext("DialogTitle");
  return <Tag id={titleId} className={cx("ds-dialog-title", className)} {...props} />;
}

export function DialogDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  const { descriptionId, setHasDescription } = useDialogContext("DialogDescription");
  React.useLayoutEffect(() => {
    setHasDescription(true);
    return () => setHasDescription(false);
  }, [setHasDescription]);
  return <p id={descriptionId} className={cx("ds-dialog-description", className)} {...props} />;
}

/** The scrollable middle. Header and footer stay put. */
export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-dialog-body", className)} {...props} />;
}

/** Actions, end-aligned. Put the primary action last. Stacks full-width on narrow screens. */
export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("ds-dialog-footer", className)} {...props} />;
}
