import { useId, useState, type CSSProperties } from "react";
import "./designStyles.css";

/* One card, many skins: the same markup, styled by `.st-<id>`. Keeping the
   content identical makes it easy to compare styles fairly. */

export function StyleSample({ id, vars }: { id: string; vars?: Record<string, string> }) {
  const [on, setOn] = useState(true);
  const labelId = useId();
  return (
    <div className={`st-scene st-${id}`} style={vars as CSSProperties}>
      {id === "glassmorphism" && (
        <div className="st-blobs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="st-card">
        <div className="st-head">
          <span className="st-avatar" aria-hidden="true">
            WR
          </span>
          <div>
            <p className="st-title">Weekly report</p>
            <p className="st-sub">Ready to export · 2.4 MB</p>
          </div>
        </div>
        <div className="st-row">
          <span id={labelId}>Email it to the team</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby={labelId}
            className="st-toggle"
            onClick={() => setOn((v) => !v)}
          />
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn st-btn-secondary">
            Preview
          </button>
          <button type="button" className="st-btn st-btn-primary">
            Export
          </button>
        </div>
      </div>
    </div>
  );
}
