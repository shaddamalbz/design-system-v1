import * as React from "react";
import { cx } from "../../utils/cx";

/* ==========================================================================
   Tabs: WAI-ARIA Tabs pattern, built from scratch.
   https://www.w3.org/WAI/ARIA/apg/patterns/tabs/

   <Tabs defaultValue="overview">
     <TabList aria-label="Project">
       <Tab value="overview">Overview</Tab>
       <Tab value="activity">Activity</Tab>
     </TabList>
     <TabPanel value="overview">…</TabPanel>
     <TabPanel value="activity">…</TabPanel>
   </Tabs>

   Overflow behavior (after @diegohaz's scrollable tabs spec):
   - No visible scrollbar. Edges fade out (CSS mask) only when there is
     more to scroll in that direction (CSS scroll-driven animation).
   - On fine pointers, chevron buttons appear. When the end is reached while
     hovering, the button stays (dimmed, inert) until the pointer leaves, so
     a click never falls through to the tab underneath.
   - Chevrons are out of the tab order; scroll-padding keeps the focused
     tab clear of the faded edges.
   - Browsers without scroll-driven animations get the same result from a
     small JS fallback that sets the same CSS variables.
   ========================================================================== */

type TabsSize = "sm" | "md";
type TabsVariant = "contained" | "plain";

interface TabsContextValue {
  baseId: string;
  value: string | undefined;
  select: (value: string, options?: { silent?: boolean }) => void;
}

const TabsContext = React.createContext<TabsContextValue | null>(null);

function useTabsContext(component: string) {
  const ctx = React.useContext(TabsContext);
  if (!ctx) throw new Error(`<${component}> must be rendered inside <Tabs>.`);
  return ctx;
}

const toId = (value: string) => value.replace(/[^\w-]/g, "_");
const tabId = (baseId: string, value: string) => `${baseId}-tab-${toId(value)}`;
const panelId = (baseId: string, value: string) => `${baseId}-panel-${toId(value)}`;

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const supportsScrollTimeline = () =>
  typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");

/* --------------------------------------------------------------------------
   <Tabs>
   -------------------------------------------------------------------------- */

export interface TabsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  /** Selected tab (controlled). */
  value?: string;
  /** Initially selected tab (uncontrolled). Defaults to the first enabled tab. */
  defaultValue?: string;
  /** Called when the user selects a tab. */
  onValueChange?: (value: string) => void;
  /** @default "md" */
  size?: TabsSize;
  /** "contained" wraps list + panel in a card; "plain" has no outer frame. @default "contained" */
  variant?: TabsVariant;
}

export function Tabs({
  value: valueProp,
  defaultValue,
  onValueChange,
  size = "md",
  variant = "contained",
  className,
  children,
  ...props
}: TabsProps) {
  const baseId = React.useId();
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = valueProp !== undefined;
  const value = isControlled ? valueProp : uncontrolledValue;

  const onValueChangeRef = React.useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const select = React.useCallback(
    (next: string, options?: { silent?: boolean }) => {
      if (!isControlled) setUncontrolledValue(next);
      // A controlled parent must always hear about it, or nothing changes.
      if (!options?.silent || isControlled) onValueChangeRef.current?.(next);
    },
    [isControlled],
  );

  const ctx = React.useMemo(() => ({ baseId, value, select }), [baseId, value, select]);

  return (
    <TabsContext.Provider value={ctx}>
      <div {...props} className={cx("ds-tabs", className)} data-size={size} data-variant={variant}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

/* --------------------------------------------------------------------------
   <TabList>
   -------------------------------------------------------------------------- */

export interface TabListProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Labels the tablist for assistive tech. Use this or aria-labelledby. */
  "aria-label"?: string;
}

export const TabList = React.forwardRef<HTMLDivElement, TabListProps>(function TabList(
  { className, children, onKeyDown, onFocus, ...props },
  forwardedRef,
) {
  const { value, select } = useTabsContext("TabList");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const hasMounted = React.useRef(false);

  const setScrollerRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      scrollerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    },
    [forwardedRef],
  );

  const getTabs = React.useCallback(
    () =>
      Array.from(
        scrollerRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? [],
      ).filter((tab) => !tab.disabled),
    [],
  );

  /* Scroll only the tablist (never the page) so the tab sits outside the
     scroll-padding zone (= the faded edge + chevron area). */
  const scrollTabIntoView = React.useCallback((tab: HTMLElement, smooth: boolean) => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.scrollWidth <= scroller.clientWidth) return;
    const style = getComputedStyle(scroller);
    const padStart = parseFloat(style.scrollPaddingInlineStart) || 0;
    const padEnd = parseFloat(style.scrollPaddingInlineEnd) || 0;
    const s = scroller.getBoundingClientRect();
    const t = tab.getBoundingClientRect();
    let delta = 0;
    if (t.left < s.left + padStart) delta = t.left - (s.left + padStart);
    else if (t.right > s.right - padEnd) delta = t.right - (s.right - padEnd);
    if (delta !== 0) {
      // Absolute target (not scrollBy) so repeated calls during an ongoing
      // smooth scroll converge on the same position instead of adding up.
      // Clamp it: Chrome silently ignores out-of-range *smooth* targets.
      // (RTL scrollLeft runs from -max to 0.)
      const max = scroller.scrollWidth - scroller.clientWidth;
      const rtl = style.direction === "rtl";
      const target = Math.min(rtl ? 0 : max, Math.max(rtl ? -max : 0, scroller.scrollLeft + delta));
      scroller.scrollTo({
        left: target,
        behavior: smooth && !prefersReducedMotion() ? "smooth" : "auto",
      });
    }
  }, []);

  /* If nothing is selected yet, select the first enabled tab so the roving
     tabindex always has exactly one focusable tab. */
  React.useLayoutEffect(() => {
    const tabs = getTabs();
    const selectedExists = tabs.some((tab) => tab.dataset.value === value);
    if (!selectedExists && tabs[0]?.dataset.value) {
      select(tabs[0].dataset.value, { silent: true });
    }
  });

  /* Keep the selected tab visible: instantly on mount, smoothly afterwards. */
  React.useLayoutEffect(() => {
    const selected = scrollerRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
    if (selected) scrollTabIntoView(selected, hasMounted.current);
    hasMounted.current = true;
  }, [value, scrollTabIntoView]);

  /* …and when the list is resized (container query, window, sidebar). */
  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const observer = new ResizeObserver(() => {
      const selected = scroller.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]');
      if (selected) scrollTabIntoView(selected, false);
    });
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [scrollTabIntoView]);

  /* JS fallback for browsers without scroll-driven animations. It drives
     the exact same CSS variables the CSS animation would. */
  const syncOverflow = React.useRef<() => void>(() => {});
  React.useEffect(() => {
    if (supportsScrollTimeline()) return;
    const root = rootRef.current;
    const scroller = scrollerRef.current;
    if (!root || !scroller) return;
    const RAMP = 24; // px: matches animation-range in tabs.css
    const clamp = (n: number) => Math.min(1, Math.max(0, n));
    syncOverflow.current = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const pos = Math.abs(scroller.scrollLeft); // abs() handles RTL
      const start = max > 0 ? clamp(pos / RAMP) : 0;
      const end = max > 0 ? clamp((max - pos) / RAMP) : 0;
      root.style.setProperty("--ds-tabs-start", String(start));
      root.style.setProperty("--ds-tabs-end", String(end));
      root.toggleAttribute("data-overflow-start", start > 0);
      root.toggleAttribute("data-overflow-end", end > 0);
    };
    const update = () => syncOverflow.current();
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    return () => {
      scroller.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);
  React.useLayoutEffect(() => syncOverflow.current());

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented) return;
    const tabs = getTabs();
    const current = tabs.indexOf(event.target as HTMLButtonElement);
    if (current === -1) return;

    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const backward = rtl ? "ArrowRight" : "ArrowLeft";
    let next: number | undefined;
    switch (event.key) {
      case forward:
        next = (current + 1) % tabs.length;
        break;
      case backward:
        next = (current - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = tabs.length - 1;
        break;
    }
    if (next === undefined) return;
    event.preventDefault();
    const target = tabs[next];
    // Automatic activation: moving focus also selects (APG recommendation
    // when panels render instantly).
    target.focus({ preventScroll: true });
    if (target.dataset.value) select(target.dataset.value);
  };

  const handleFocus = (event: React.FocusEvent<HTMLDivElement>) => {
    onFocus?.(event);
    const target = event.target as HTMLElement;
    if (target.getAttribute("role") === "tab") scrollTabIntoView(target, true);
  };

  const scrollByPage = (direction: 1 | -1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const rtl = getComputedStyle(scroller).direction === "rtl";
    scroller.scrollBy({
      left: direction * (rtl ? -1 : 1) * scroller.clientWidth * 0.75,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    });
  };

  return (
    <div ref={rootRef} className={cx("ds-tabs-list", className)}>
      <div
        {...props}
        ref={setScrollerRef}
        role="tablist"
        aria-orientation="horizontal"
        className="ds-tabs-scroller"
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
      >
        {children}
      </div>
      {/* Mouse-only affordance: hidden from AT and the tab order, since
          keyboard and screen reader users move between tabs directly. */}
      <ScrollButton direction="start" onClick={() => scrollByPage(-1)} />
      <ScrollButton direction="end" onClick={() => scrollByPage(1)} />
    </div>
  );
});

function ScrollButton({ direction, onClick }: { direction: "start" | "end"; onClick: () => void }) {
  return (
    <button
      type="button"
      className="ds-tabs-scroll-button"
      data-direction={direction}
      tabIndex={-1}
      aria-hidden="true"
      // Don't steal focus from the selected tab on click.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d={direction === "start" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* --------------------------------------------------------------------------
   <Tab>
   -------------------------------------------------------------------------- */

export interface TabProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "value"> {
  /** Unique key that links this tab to its <TabPanel>. */
  value: string;
}

export const Tab = React.forwardRef<HTMLButtonElement, TabProps>(function Tab(
  { value, className, onClick, children, ...props },
  ref,
) {
  const { baseId, value: selectedValue, select } = useTabsContext("Tab");
  const selected = selectedValue === value;
  return (
    <button
      {...props}
      ref={ref}
      type="button"
      role="tab"
      id={tabId(baseId, value)}
      aria-controls={panelId(baseId, value)}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      data-value={value}
      className={cx("ds-tab", className)}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) select(value);
      }}
    >
      {children}
    </button>
  );
});

/* --------------------------------------------------------------------------
   <TabPanel>
   -------------------------------------------------------------------------- */

export interface TabPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Must match the `value` of a <Tab>. */
  value: string;
  /** Keep children mounted while hidden (preserves state like form input). @default false */
  keepMounted?: boolean;
}

export const TabPanel = React.forwardRef<HTMLDivElement, TabPanelProps>(function TabPanel(
  { value, keepMounted = false, className, children, ...props },
  ref,
) {
  const { baseId, value: selectedValue } = useTabsContext("TabPanel");
  const selected = selectedValue === value;
  return (
    <div
      {...props}
      ref={ref}
      role="tabpanel"
      id={panelId(baseId, value)}
      aria-labelledby={tabId(baseId, value)}
      // Focusable so keyboard users can Tab from the list into the content
      // even when the panel has no focusable children.
      tabIndex={0}
      hidden={!selected}
      className={cx("ds-tab-panel", className)}
    >
      {(selected || keepMounted) && children}
    </div>
  );
});
