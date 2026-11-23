import * as React from "react";
import { IconButton, type IconButtonProps } from "../button";
import { Tooltip, type TooltipSide } from "../tooltip";
import { cx } from "../../utils/cx";

/* ==========================================================================
   Sidebar

   A resizable, collapsible navigation sidebar.

   - Drag the edge to resize. Under the snap width it settles to an icon
     rail. Click the edge, press the trigger, or Ctrl/⌘+B to toggle.
   - Three collapse transitions:
       "ease-out" snaps once you drag under the snap width; labels fade
                  quickly while the width glides.
       "cascade"  follows the pointer; under the snap width labels drift
                  left and fade one after another, top first.
       "scrub"    follows the pointer; labels fade in proportion to width.
   - Collapsed items keep their text in the DOM (it stays their accessible
     name) and show it as a tooltip on hover and keyboard focus.
   - The edge is a focusable window splitter (role="separator").
   ========================================================================== */

export type SidebarTransition = "ease-out" | "cascade" | "scrub";

interface Limits {
  rail: number;
  min: number;
  max: number;
  snap: number;
}

interface SidebarContextValue {
  id: string;
  collapsed: boolean;
  setCollapsed: (next: boolean) => void;
  toggle: () => void;
  width: number;
  setWidth: (next: number) => void;
  limits: Limits;
  transition: SidebarTransition;
  /** false below `collapsibleFrom`: no rail, no resize, no trigger */
  collapsible: boolean;
  shortcutLabel: string | null;
  /** aria-keyshortcuts value */
  shortcutKeys: string | null;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("Sidebar parts must be used inside <SidebarProvider>.");
  return ctx;
}

/* Tooltip lives in <Sidebar>, items ask it to show. */
interface TipApi {
  show: (text: string, x: number, y: number) => void;
  hide: () => void;
}
const TipContext = React.createContext<TipApi>({ show() {}, hide() {} });

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function useControllable<T>(value: T | undefined, defaultValue: T, onChange?: (v: T) => void) {
  const [inner, setInner] = React.useState(defaultValue);
  const controlled = value !== undefined;
  const current = controlled ? value : inner;
  const set = React.useCallback(
    (next: T) => {
      if (!controlled) setInner(next);
      onChange?.(next);
    },
    [controlled, onChange],
  );
  return [current, set] as const;
}

function readStorage(key: string | undefined) {
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { width?: number; collapsed?: boolean }) : null;
  } catch {
    return null;
  }
}

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/* --------------------------------------------------------------------------
   Provider
   -------------------------------------------------------------------------- */

export interface SidebarProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Collapsed to the icon rail (controlled). */
  collapsed?: boolean;
  /** @default false */
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Expanded width in px (controlled). */
  width?: number;
  /** @default 240 */
  defaultWidth?: number;
  onWidthChange?: (width: number) => void;
  /** Icon rail width. @default 48 */
  railWidth?: number;
  /** Smallest expanded width. @default 200 */
  minWidth?: number;
  /** @default 360 */
  maxWidth?: number;
  /** Dragging under this width collapses to the rail. @default 160 */
  snapWidth?: number;
  /** How labels leave and the width moves. @default "cascade" */
  transition?: SidebarTransition;
  /** Key used with Ctrl/⌘ to toggle, or false. @default "b" */
  shortcut?: string | false;
  /** Saves width + collapsed in localStorage under this key. */
  storageKey?: string;
  /** Viewport width (px) from which collapsing and resizing are enabled. @default 0 */
  collapsibleFrom?: number;
}

export function SidebarProvider({
  collapsed: collapsedProp,
  defaultCollapsed = false,
  onCollapsedChange,
  width: widthProp,
  defaultWidth = 240,
  onWidthChange,
  railWidth = 48,
  minWidth = 200,
  maxWidth = 360,
  snapWidth = 160,
  transition = "cascade",
  shortcut = "b",
  storageKey,
  collapsibleFrom = 0,
  className,
  children,
  ...props
}: SidebarProviderProps) {
  const id = React.useId();
  const [stored] = React.useState(() => readStorage(storageKey));
  const [collapsed, setCollapsed] = useControllable(
    collapsedProp,
    stored?.collapsed ?? defaultCollapsed,
    onCollapsedChange,
  );
  const [width, setWidthRaw] = useControllable(
    widthProp,
    clamp(stored?.width ?? defaultWidth, minWidth, maxWidth),
    onWidthChange,
  );
  const setWidth = React.useCallback(
    (w: number) => setWidthRaw(clamp(Math.round(w), minWidth, maxWidth)),
    [setWidthRaw, minWidth, maxWidth],
  );

  // Collapsing only makes sense on wide viewports
  const query = `(min-width: ${collapsibleFrom}px)`;
  const [collapsible, setCollapsible] = React.useState(
    () => collapsibleFrom === 0 || (typeof window !== "undefined" && window.matchMedia(query).matches),
  );
  React.useEffect(() => {
    if (collapsibleFrom === 0) return setCollapsible(true);
    const mq = window.matchMedia(query);
    const update = () => setCollapsible(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [collapsibleFrom, query]);

  React.useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify({ width, collapsed }));
    } catch {
      /* storage unavailable */
    }
  }, [storageKey, width, collapsed]);

  const toggle = React.useCallback(() => setCollapsed(!collapsed), [collapsed, setCollapsed]);

  React.useEffect(() => {
    if (!shortcut || !collapsible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== shortcut.toLowerCase() || e.altKey || e.shiftKey) return;
      if (!(isMac() ? e.metaKey : e.ctrlKey)) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shortcut, collapsible, toggle]);

  const shortcutLabel = shortcut ? `${isMac() ? "⌘" : "Ctrl+"}${shortcut.toUpperCase()}` : null;
  const shortcutKeys = shortcut ? `${isMac() ? "Meta" : "Control"}+${shortcut.toUpperCase()}` : null;

  const value = React.useMemo<SidebarContextValue>(
    () => ({
      id: `${id}sidebar`,
      collapsed: collapsible && collapsed,
      setCollapsed,
      toggle,
      width,
      setWidth,
      limits: {
        rail: railWidth,
        min: minWidth,
        max: maxWidth,
        snap: snapWidth,
      },
      transition,
      collapsible,
      shortcutLabel,
      shortcutKeys,
    }),
    [
      id,
      collapsible,
      collapsed,
      setCollapsed,
      toggle,
      width,
      setWidth,
      railWidth,
      minWidth,
      maxWidth,
      snapWidth,
      transition,
      shortcutLabel,
      shortcutKeys,
    ],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div className={cx("ds-sidebar-layout", className)} {...props}>
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

/* --------------------------------------------------------------------------
   Sidebar (panel + resize handle + tooltip)
   -------------------------------------------------------------------------- */

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Show the drag/keyboard resize handle on the edge. @default true */
  resizable?: boolean;
}

interface Drag {
  startX: number;
  startW: number;
  x: number; // raw width under the pointer
  moved: boolean;
}

export const Sidebar = React.forwardRef<HTMLDivElement, SidebarProps>(function Sidebar(
  { resizable = true, className, style, children, ...props },
  forwardedRef,
) {
  const ctx = useSidebar();
  const { rail, min, max, snap } = ctx.limits;
  const ref = React.useRef<HTMLDivElement>(null);
  React.useImperativeHandle(forwardedRef, () => ref.current!);

  const [drag, setDrag] = React.useState<Drag | null>(null);
  const dragRef = React.useRef<Drag | null>(null);
  const [gliding, setGliding] = React.useState(false); // ease-out: animating out of a snap mid-drag
  const glideTimer = React.useRef<number | undefined>(undefined);
  const [tip, setTip] = React.useState<{
    text: string;
    x: number;
    y: number;
  } | null>(null);

  const tipApi = React.useMemo<TipApi>(
    () => ({
      show: (text, x, y) => setTip({ text, x, y }),
      hide: () => setTip(null),
    }),
    [],
  );

  React.useEffect(() => {
    if (!tip) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tip]);
  React.useEffect(() => setTip(null), [ctx.collapsed]);

  /* Visual width (w) and collapse progress (q: 0 = labels shown, 1 = rail) */
  let w: number | undefined;
  let q = 0;
  let following = false;
  if (ctx.collapsible) {
    if (drag?.moved && ctx.transition !== "ease-out") {
      w = clamp(drag.x, rail, max);
      q =
        ctx.transition === "cascade" ? clamp((snap - w) / (snap - rail), 0, 1) : clamp((min - w) / (min - rail), 0, 1);
      following = true;
    } else if (drag?.moved) {
      w = ctx.collapsed ? rail : clamp(drag.x, min, max);
      q = ctx.collapsed ? 1 : 0;
      following = !ctx.collapsed && !gliding;
    } else {
      w = ctx.collapsed ? rail : ctx.width;
      q = ctx.collapsed ? 1 : 0;
    }
  }

  // Cascade order: number the labels currently on screen, top to bottom.
  const dragging = Boolean(drag?.moved);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el || ctx.transition !== "cascade") return;
    const box = el.getBoundingClientRect();
    let i = 0;
    el.querySelectorAll<HTMLElement>(".ds-sidebar-label").forEach((label) => {
      const r = label.getBoundingClientRect();
      const onScreen = r.height > 0 && r.bottom > box.top && r.top < Math.min(box.bottom, window.innerHeight);
      label.style.setProperty("--i", String(onScreen ? i++ : 0));
    });
    el.style.setProperty("--n", String(Math.max(i, 2)));
  }, [ctx.collapsed, dragging, ctx.transition]);

  /* ---- Resize handle: pointer ---- */
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const startW = ref.current?.getBoundingClientRect().width ?? ctx.width;
    dragRef.current = { startX: e.clientX, startW, x: startW, moved: false };
    setTip(null);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) {
      // Hover: tooltip follows the pointer along the edge
      if (e.pointerType === "mouse") {
        const r = e.currentTarget.getBoundingClientRect();
        setTip({
          text: "Drag to resize sidebar",
          x: r.right + 6,
          y: e.clientY,
        });
      }
      return;
    }
    const dx = e.clientX - d.startX;
    const next: Drag = {
      ...d,
      x: d.startW + dx,
      moved: d.moved || Math.abs(dx) > 3,
    };
    dragRef.current = next;
    if (!next.moved) return;
    if (!d.moved) document.documentElement.dataset.dsResizing = "";

    if (ctx.transition === "ease-out") {
      // Snap in and out of the rail; follow the pointer otherwise
      if (next.x < snap && !ctx.collapsed) ctx.setCollapsed(true);
      if (next.x >= snap && ctx.collapsed) {
        ctx.setCollapsed(false);
        setGliding(true);
        window.clearTimeout(glideTimer.current);
        glideTimer.current = window.setTimeout(() => setGliding(false), 400);
      }
    }
    setDrag(next);
  };

  const endDrag = () => {
    const d = dragRef.current;
    dragRef.current = null;
    delete document.documentElement.dataset.dsResizing;
    setDrag(null);
    if (!d) return;
    if (!d.moved) {
      ctx.toggle(); // a click on the edge toggles
      return;
    }
    if (ctx.transition === "ease-out") {
      if (!ctx.collapsed) ctx.setWidth(d.x);
    } else if (d.x < snap) {
      ctx.setCollapsed(true);
    } else {
      ctx.setCollapsed(false);
      ctx.setWidth(d.x);
    }
  };

  /* ---- Resize handle: keyboard (WAI-ARIA window splitter) ---- */
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16;
    let handled = true;
    switch (e.key) {
      case "ArrowLeft":
        if (ctx.collapsed) break;
        if (ctx.width - step < min) ctx.setCollapsed(true);
        else ctx.setWidth(ctx.width - step);
        break;
      case "ArrowRight":
        if (ctx.collapsed) ctx.setCollapsed(false);
        else ctx.setWidth(ctx.width + step);
        break;
      case "Home":
        ctx.setCollapsed(true);
        break;
      case "End":
        ctx.setCollapsed(false);
        ctx.setWidth(max);
        break;
      case "Enter":
        ctx.toggle();
        break;
      default:
        handled = false;
    }
    if (handled) e.preventDefault();
  };

  const atMax = !ctx.collapsed && ctx.width >= max;

  return (
    <TipContext.Provider value={tipApi}>
      <div
        ref={ref}
        id={ctx.id}
        className={cx("ds-sidebar", className)}
        data-state={ctx.collapsed ? "collapsed" : "expanded"}
        data-transition={ctx.transition}
        data-collapsible={ctx.collapsible ? undefined : "false"}
        data-following={following ? "" : undefined}
        style={
          {
            ...(w !== undefined && { "--ds-sidebar-w": `${w}px` }),
            "--ds-sidebar-q": q,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}

        {resizable && ctx.collapsible && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            aria-controls={ctx.id}
            aria-valuemin={rail}
            aria-valuemax={max}
            aria-valuenow={ctx.collapsed ? rail : ctx.width}
            aria-valuetext={ctx.collapsed ? "Collapsed" : `${ctx.width} pixels`}
            tabIndex={0}
            className="ds-sidebar-resizer"
            data-edge={ctx.collapsed ? "min" : atMax ? "max" : undefined}
            data-active={drag?.moved ? "" : undefined}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onPointerLeave={() => !dragRef.current && setTip(null)}
            onKeyDown={onKeyDown}
            onFocus={(e) => {
              if (!e.currentTarget.matches(":focus-visible")) return;
              const r = e.currentTarget.getBoundingClientRect();
              setTip({
                text: "← → to resize, Enter to collapse",
                x: r.right + 6,
                y: r.top + 72,
              });
            }}
            onBlur={() => setTip(null)}
          />
        )}

        {tip && (
          <div className="ds-sidebar-tip" aria-hidden="true" style={{ left: tip.x, top: tip.y }}>
            {tip.text}
          </div>
        )}
      </div>
    </TipContext.Provider>
  );
});

/* --------------------------------------------------------------------------
   Layout parts
   -------------------------------------------------------------------------- */

export const SidebarHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarHeader({ className, ...props }, ref) {
    return <div ref={ref} className={cx("ds-sidebar-header", className)} {...props} />;
  },
);

export const SidebarFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarFooter({ className, ...props }, ref) {
    return <div ref={ref} className={cx("ds-sidebar-footer", className)} {...props} />;
  },
);

/** The scrolling middle. Renders a <nav>, so give it an aria-label. */
export const SidebarContent = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(function SidebarContent(
  { className, onScroll, ...props },
  ref,
) {
  const tip = React.useContext(TipContext);
  return (
    <nav
      ref={ref}
      className={cx("ds-sidebar-content", className)}
      onScroll={(e) => {
        tip.hide();
        onScroll?.(e);
      }}
      {...props}
    />
  );
});

/** The page area next to the sidebar. */
export const SidebarInset = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function SidebarInset({ className, ...props }, ref) {
    return <div ref={ref} className={cx("ds-sidebar-inset", className)} {...props} />;
  },
);

/** Text that hides when the sidebar collapses (uses the active transition). */
export function SidebarLabel({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cx("ds-sidebar-label", className)} {...props} />;
}

/* --------------------------------------------------------------------------
   Group
   -------------------------------------------------------------------------- */

export interface SidebarGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Heading text. Becomes a divider in the rail. */
  label?: string;
  /** Heading is a disclosure button that shows/hides the items. @default false */
  collapsible?: boolean;
  open?: boolean;
  /** @default true */
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Number shown in the heading. */
  count?: number;
}

export function SidebarGroup({
  label,
  collapsible = false,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  count,
  className,
  children,
  ...props
}: SidebarGroupProps) {
  const ctx = useSidebar();
  const id = React.useId();
  const [open, setOpen] = useControllable(openProp, defaultOpen, onOpenChange);
  // The rail has no headings to open a group with, so it shows every item.
  const showItems = !collapsible || open || ctx.collapsed;
  const headingId = `${id}h`;
  const listId = `${id}l`;

  const headingInner = (
    <>
      <span className="ds-sidebar-slot" aria-hidden="true">
        {collapsible && (
          <svg viewBox="0 0 16 16" className="ds-sidebar-chevron">
            <path d="M6 4l4 4-4 4" />
          </svg>
        )}
        <span className="ds-sidebar-divider" />
      </span>
      <span className="ds-sidebar-label">
        <span id={headingId}>{label}</span>
        {count !== undefined && (
          <span className="ds-sidebar-count" aria-hidden="true">
            {count}
          </span>
        )}
      </span>
    </>
  );

  return (
    <div className={cx("ds-sidebar-group", className)} data-open={showItems ? "" : undefined} {...props}>
      {label &&
        (collapsible ? (
          <button
            type="button"
            className="ds-sidebar-group-heading"
            aria-expanded={open}
            aria-controls={listId}
            // In the rail the heading is only a divider
            tabIndex={ctx.collapsed ? -1 : undefined}
            aria-hidden={ctx.collapsed || undefined}
            onClick={() => setOpen(!open)}
          >
            {headingInner}
          </button>
        ) : (
          <div className="ds-sidebar-group-heading">{headingInner}</div>
        ))}
      <ul id={listId} className="ds-sidebar-list" aria-labelledby={label ? headingId : undefined} hidden={!showItems}>
        {children}
      </ul>
    </div>
  );
}

/** A labelled sub-list inside a SidebarGroup (e.g. categories). */
export function SidebarSubgroup({ label, children }: { label: string; children: React.ReactNode }) {
  const id = React.useId();
  return (
    <li className="ds-sidebar-subgroup">
      <div className="ds-sidebar-subheading" id={id}>
        <span className="ds-sidebar-slot" aria-hidden="true">
          <span className="ds-sidebar-divider" />
        </span>
        <span className="ds-sidebar-label">{label}</span>
      </div>
      <ul className="ds-sidebar-list" aria-labelledby={id}>
        {children}
      </ul>
    </li>
  );
}

/* --------------------------------------------------------------------------
   Item
   -------------------------------------------------------------------------- */

type ItemBase = {
  /** 16px icon. Without one, a monogram is drawn from the label. */
  icon?: React.ReactNode;
  /** Marks the current page (aria-current="page"). */
  current?: boolean;
  /** Tooltip text in the rail. Defaults to the label when it's a string. */
  tooltip?: string;
  children: React.ReactNode;
};
export type SidebarItemProps = ItemBase &
  (
    | ({ href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "children">)
    | ({ href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">)
  );

const monogram = (text: string) =>
  text
    .split(/[\s-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

/** A link (with href) or button. Place inside a SidebarGroup. */
export function SidebarItem(allProps: SidebarItemProps) {
  const { icon, current, tooltip, children, className, ...rest } = allProps;
  const ctx = useSidebar();
  const tip = React.useContext(TipContext);
  const text = tooltip ?? (typeof children === "string" ? children : "");

  const showTip = (el: HTMLElement) => {
    if (!ctx.collapsed || !text) return;
    const r = el.getBoundingClientRect();
    tip.show(text, r.right + 10, r.top + r.height / 2);
  };
  const handlers = {
    onPointerEnter: (e: React.PointerEvent<HTMLElement>) => e.pointerType === "mouse" && showTip(e.currentTarget),
    onPointerLeave: () => tip.hide(),
    onFocus: (e: React.FocusEvent<HTMLElement>) =>
      e.currentTarget.matches(":focus-visible") && showTip(e.currentTarget),
    onBlur: () => tip.hide(),
  };

  const inner = (
    <>
      <span className="ds-sidebar-slot" aria-hidden="true">
        {icon ?? <span className="ds-sidebar-monogram">{monogram(text)}</span>}
      </span>
      <span className="ds-sidebar-label">{children}</span>
    </>
  );
  const common = {
    className: cx("ds-sidebar-item", className),
    "aria-current": current ? ("page" as const) : undefined,
    ...handlers,
  };

  return (
    <li>
      {rest.href !== undefined ? (
        <a {...(rest as React.AnchorHTMLAttributes<HTMLAnchorElement>)} {...common}>
          {inner}
        </a>
      ) : (
        <button type="button" {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)} {...common}>
          {inner}
        </button>
      )}
    </li>
  );
}

/* --------------------------------------------------------------------------
   Trigger + its morphing icon
   -------------------------------------------------------------------------- */

/**
 * Panel icon whose left pane shows the sidebar's state: bars = labels
 * (expanded), dots = icons only (collapsed). Inside a .ds-sidebar-trigger
 * it morphs to the other state on hover, previewing what a click will do.
 */
export function SidebarToggleIcon({ state }: { state: "expanded" | "collapsed" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className="ds-icon ds-sidebar-toggle-icon"
      data-state={state}
    >
      <rect x="2.5" y="4" width="19" height="16" rx="3" />
      <path className="ds-sti-divider" d="M10.5 4v16" />
      <path className="ds-sti-bar" d="M5.25 8.5h2.5" style={{ "--b": 0 } as React.CSSProperties} />
      <path className="ds-sti-bar" d="M5.25 12h2.5" style={{ "--b": 1 } as React.CSSProperties} />
      <path className="ds-sti-bar" d="M5.25 15.5h2.5" style={{ "--b": 2 } as React.CSSProperties} />
    </svg>
  );
}

export type SidebarTriggerProps = Omit<IconButtonProps, "icon" | "aria-label"> & {
  "aria-label"?: string;
  /** Side of the tooltip. @default "bottom" */
  tooltipSide?: TooltipSide;
};

/** Toggles the sidebar. Renders nothing where the sidebar can't collapse. */
export const SidebarTrigger = React.forwardRef<HTMLButtonElement, SidebarTriggerProps>(function SidebarTrigger(
  { onClick, onPointerLeave, onBlur, className, tooltipSide = "bottom", ...props },
  ref,
) {
  const ctx = useSidebar();
  // After a click the icon already shows the new state; don't flip it
  // back to a preview until the pointer leaves (or focus moves).
  const [hold, setHold] = React.useState(false);
  if (!ctx.collapsible) return null;
  const action = ctx.collapsed ? "Expand sidebar" : "Collapse sidebar";
  return (
    <Tooltip content={action} shortcut={ctx.shortcutLabel ?? undefined} side={tooltipSide}>
      <IconButton
        ref={ref}
        aria-label="Sidebar"
        aria-expanded={!ctx.collapsed}
        aria-controls={ctx.id}
        aria-keyshortcuts={ctx.shortcutKeys ?? undefined}
        title="" // the Tooltip replaces the native title
        icon={<SidebarToggleIcon state={ctx.collapsed ? "collapsed" : "expanded"} />}
        className={cx("ds-sidebar-trigger", className)}
        data-hold={hold ? "" : undefined}
        onClick={(e) => {
          ctx.toggle();
          setHold(true);
          onClick?.(e);
        }}
        onPointerLeave={(e) => {
          setHold(false);
          onPointerLeave?.(e);
        }}
        onBlur={(e) => {
          setHold(false);
          onBlur?.(e);
        }}
        {...props}
      />
    </Tooltip>
  );
});
