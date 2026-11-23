import { useState, type ComponentProps, type CSSProperties } from "react";
import { IconButton, SidebarToggleIcon } from "../../ds";

/* The sidebar trigger's look and behavior without needing a SidebarProvider:
   used by glossary demos that show the icon on its own. */
export function MorphToggle({
  collapsed,
  onToggle,
  preview = true,
  ...props
}: {
  collapsed: boolean;
  onToggle: () => void;
  /** false = the icon never previews (feedback only) */
  preview?: boolean;
} & Omit<ComponentProps<typeof IconButton>, "icon" | "onClick">) {
  const [hold, setHold] = useState(false);
  return (
    <IconButton
      variant="outline"
      aria-expanded={!collapsed}
      icon={<SidebarToggleIcon state={collapsed ? "collapsed" : "expanded"} />}
      className={preview ? "ds-sidebar-trigger" : undefined}
      data-hold={hold ? "" : undefined}
      onClick={() => {
        onToggle();
        setHold(true);
      }}
      onPointerLeave={() => setHold(false)}
      onBlur={() => setHold(false)}
      {...props}
    />
  );
}

/* A tiny app window whose left pane collapses: bars = labels, dots = icons. */
export function MiniWindow({ collapsed, ghost }: { collapsed: boolean; ghost?: boolean }) {
  return (
    <div className="gd-mini" data-collapsed={collapsed ? "" : undefined} data-ghost={ghost ? "" : undefined} aria-hidden="true">
      <div className="gd-mini-pane">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="gd-mini-row" style={{ "--i": i } as CSSProperties}>
            <span className="gd-mini-dot" />
            <span className="gd-mini-bar" />
          </span>
        ))}
      </div>
      <div className="gd-mini-ghost" />
      <div className="gd-mini-main">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
