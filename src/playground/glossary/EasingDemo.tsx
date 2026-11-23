import { useState, type CSSProperties } from "react";
import { Button } from "../../ds";
import { Segmented, Switch } from "../ui";

type CurveId = "linear" | "ease-in" | "ease-out" | "ease-in-out";

const CURVES: Record<CurveId, { label: string; bezier: [number, number, number, number]; use: string }> = {
  linear: { label: "Linear", bezier: [0, 0, 1, 1], use: "Constant speed. Feels mechanical; fine for progress bars and scrubbing." },
  "ease-in": { label: "Ease in", bezier: [0.4, 0, 1, 1], use: "Starts slow, ends fast. Feels sluggish to start; only for things leaving." },
  "ease-out": {
    label: "Ease out",
    bezier: [0.16, 1, 0.3, 1],
    use: "Starts fast, settles gently. Feels responsive: the default for UI that reacts to you.",
  },
  "ease-in-out": { label: "Ease in-out", bezier: [0.65, 0, 0.35, 1], use: "Slow, fast, slow. For moving from A to B on screen." },
};

const css = (b: number[]) => `cubic-bezier(${b.join(", ")})`;

/* A curve plotted as time → progress, and the same sidebar collapse played with it. */
export function EasingDemo() {
  const [curve, setCurve] = useState<CurveId>("ease-out");
  const [collapsed, setCollapsed] = useState(false);
  const [slow, setSlow] = useState(true);
  const c = CURVES[curve];
  const [x1, y1, x2, y2] = c.bezier;
  const duration = slow ? 1600 : 400;

  return (
    <div className="pg-demo">
      <div className="gd-stage gd-ease">
        <svg viewBox="-12 -12 124 124" className="gd-ease-graph" role="img" aria-label={`${c.label} curve: ${css(c.bezier)}`}>
          <path d="M0 100H100M0 100V0" className="gd-ease-axis" />
          <path d="M0 100L100 0" className="gd-ease-linear" />
          <path d={`M0 100L${x1 * 100} ${100 - y1 * 100}M100 0L${x2 * 100} ${100 - y2 * 100}`} className="gd-ease-handle" />
          <path d={`M0 100C${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0`} className="gd-ease-curve" />
          <text x="50" y="114" textAnchor="middle">
            time
          </text>
          <text x="-6" y="50" textAnchor="middle" transform="rotate(-90 -6 50)">
            progress
          </text>
        </svg>

        <div className="gd-ease-tracks">
          {(["picked", "linear"] as const).map((row) => (
            <div key={row} className="gd-ease-row">
              <span className="pg-muted">{row === "picked" ? c.label : "Linear"}</span>
              <div className="gd-ease-track">
                <div
                  className="gd-ease-panel"
                  data-collapsed={collapsed ? "" : undefined}
                  style={
                    {
                      transitionDuration: `${duration}ms`,
                      transitionTimingFunction: row === "picked" ? css(c.bezier) : "linear",
                    } as CSSProperties
                  }
                />
              </div>
            </div>
          ))}
        </div>
        <code className="gd-morph-code">transition: width {duration}ms {css(c.bezier)}</code>
      </div>
      <p className="gd-stage-note">{c.use}</p>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Segmented<CurveId>
          label="Curve"
          value={curve}
          onChange={setCurve}
          options={(Object.keys(CURVES) as CurveId[]).map((id) => ({ value: id, label: CURVES[id].label }))}
        />
        <div className="pg-field gd-align-end">
          <Button variant="solid" onClick={() => setCollapsed((v) => !v)}>
            {collapsed ? "Expand" : "Collapse"}
          </Button>
        </div>
        <Switch label="Slow motion" checked={slow} onChange={setSlow} />
      </div>
    </div>
  );
}
