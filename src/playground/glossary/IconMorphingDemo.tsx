import { useState, type CSSProperties } from "react";
import { Button, SidebarToggleIcon } from "../../ds";
import { Switch } from "../ui";

/* Swap two icons vs morph one icon. Slow motion makes the difference obvious. */
export function IconMorphingDemo() {
  const [collapsed, setCollapsed] = useState(false);
  const [slow, setSlow] = useState(true);
  const [anatomy, setAnatomy] = useState(false);
  const state = collapsed ? "collapsed" : "expanded";

  return (
    <div className="pg-demo">
      <div
        className="gd-stage gd-morph"
        data-anatomy={anatomy ? "" : undefined}
        style={slow ? ({ "--duration-normal": "1200ms" } as CSSProperties) : undefined}
      >
        <div className="gd-morph-grid">
          <figure className="gd-morph-cell">
            <div className="gd-morph-icon gd-morph-swap">
              <SidebarToggleIcon state={state} />
            </div>
            <figcaption>
              <strong>Swap</strong>
              <span className="pg-muted">Two icons, replaced instantly</span>
            </figcaption>
          </figure>
          <figure className="gd-morph-cell">
            <div className="gd-morph-icon">
              <SidebarToggleIcon state={state} />
            </div>
            <figcaption>
              <strong>Morph</strong>
              <span className="pg-muted">One icon, its parts move</span>
            </figcaption>
          </figure>
        </div>
        <code className="gd-morph-code">
          {collapsed
            ? "bars: stroke-dasharray 0 10 (dots) · divider: translate -2.5px"
            : "bars: stroke-dasharray 2.5 10 (lines) · divider: translate 0"}
        </code>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <div className="pg-field gd-align-end">
          <Button variant="solid" onClick={() => setCollapsed((c) => !c)}>
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </div>
        <Switch label="Slow motion (1.2s)" checked={slow} onChange={setSlow} />
        <Switch label="Color the moving parts" checked={anatomy} onChange={setAnatomy} />
      </div>
    </div>
  );
}
