import { useState } from "react";
import { Button, CheckIcon } from "../../ds";
import { Segmented } from "../ui";

type Mode = "full" | "reduced";

const systemReduces = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Same UI, two motion profiles. Replay to compare. */
export function ReducedMotionDemo() {
  const [mode, setMode] = useState<Mode>(systemReduces() ? "reduced" : "full");
  const [run, setRun] = useState(0);

  return (
    <div className="pg-demo">
      <div className="gd-stage gd-rm" data-mode={mode}>
        <div key={run} className="gd-rm-scene">
          <div className="gd-rm-toast" role="presentation">
            <span className="gd-rm-check" aria-hidden="true">
              <CheckIcon />
            </span>
            <span>
              <strong>Report exported</strong>
              <br />
              <span className="pg-muted">weekly-report.pdf</span>
            </span>
          </div>
          <div className="gd-rm-loader" aria-hidden="true">
            <span className="gd-rm-spinner" />
            <span className="pg-muted">Syncing…</span>
          </div>
        </div>
      </div>

      <div className="gd-stats">
        <span>
          Your system setting: <strong>{systemReduces() ? "Reduce motion is ON" : "Reduce motion is OFF"}</strong>
        </span>
        <span className="pg-muted">
          {mode === "full"
            ? "Full: the toast flies up with a bounce; the spinner spins."
            : "Reduced: the toast only fades in; the spinner gently pulses instead of spinning."}
        </span>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Segmented<Mode>
          label="Preview as"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setRun((r) => r + 1);
          }}
          options={[
            { value: "full", label: "Full motion" },
            { value: "reduced", label: "Reduced motion" },
          ]}
        />
        <div className="pg-field gd-align-end">
          <Button onClick={() => setRun((r) => r + 1)}>Replay</Button>
        </div>
      </div>
    </div>
  );
}
