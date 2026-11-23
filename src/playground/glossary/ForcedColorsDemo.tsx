import { useState } from "react";
import { Switch } from "../ui";

/* A simplified simulation: in forced colors the system strips backgrounds and
   shadows and repaints text/borders in a few user-chosen colors. */
export function ForcedColorsDemo() {
  const [simulate, setSimulate] = useState(true);
  const [fixes, setFixes] = useState(false);

  return (
    <div className="pg-demo">
      <div className="pg-compare">
        <figure className="pg-compare-cell">
          <figcaption>
            <span className="pg-compare-title">Normal</span>
            <span className="pg-muted">Your colors</span>
          </figcaption>
          <div className="pg-compare-stage">
            <Sample />
          </div>
        </figure>
        <figure className="pg-compare-cell">
          <figcaption>
            <span className="pg-compare-title">{simulate ? "Forced colors (simulated)" : "Normal"}</span>
            <span className="pg-muted">
              {simulate
                ? fixes
                  ? "With outlines and system colors"
                  : "Selected tab and switch vanish"
                : "Turn the simulation on"}
            </span>
          </figcaption>
          <div className="pg-compare-stage">
            <Sample simulate={simulate} fixes={fixes} />
          </div>
        </figure>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Switch label="Simulate forced colors" checked={simulate} onChange={setSimulate} />
        <Switch
          label="Add forced-colors fixes"
          description="Outline on the selected tab, border on the switch and buttons"
          checked={fixes}
          onChange={setFixes}
        />
      </div>
      <p className="pg-muted pg-note">
        Test the real thing in Chrome DevTools: Rendering → Emulate CSS media feature <code>forced-colors</code>.
      </p>
    </div>
  );
}

function Sample({ simulate, fixes }: { simulate?: boolean; fixes?: boolean }) {
  return (
    <div
      className="gd-fc"
      data-sim={simulate ? "" : undefined}
      data-fixes={fixes ? "" : undefined}
      role="img"
      aria-label={
        simulate
          ? fixes
            ? "Forced colors with fixes: selected tab outlined, switch and buttons have borders"
            : "Forced colors without fixes: selected tab and switch are invisible"
          : "Normal colors: tabs, a switch, and two buttons"
      }
    >
      <div className="gd-fc-tabs">
        <span className="gd-fc-tab is-selected">Overview</span>
        <span className="gd-fc-tab">Activity</span>
        <span className="gd-fc-tab">Files</span>
      </div>
      <div className="gd-fc-row">
        <span>Notifications</span>
        <span className="gd-fc-switch is-on">
          <span />
        </span>
      </div>
      <div className="gd-fc-row gd-fc-actions">
        <span className="gd-fc-btn is-ghost">Cancel</span>
        <span className="gd-fc-btn">Save</span>
      </div>
    </div>
  );
}
