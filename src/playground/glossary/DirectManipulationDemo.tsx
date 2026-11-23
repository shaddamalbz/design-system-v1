import { useRef, useState, type CSSProperties } from "react";
import { Segmented, Switch } from "../ui";

type Mode = "direct" | "indirect";

const SNAP = 30; // %
const MIN_OPEN = 45; // %

/* Drag the panel edge. Direct: it tracks the pointer. Indirect: it only
   jumps when you let go. Snap: releasing left of the dashed line closes it. */
export function DirectManipulationDemo() {
  const [mode, setMode] = useState<Mode>("direct");
  const [snap, setSnap] = useState(true);
  const [size, setSize] = useState(60); // committed, %
  const [live, setLive] = useState<number | null>(null); // under the pointer, %
  const track = useRef<HTMLDivElement>(null);

  const toPercent = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100));
  };
  const settle = (p: number) => {
    if (snap && p < SNAP) return 0;
    if (snap && p < MIN_OPEN) return MIN_OPEN;
    return Math.round(p);
  };

  const dragging = live !== null;
  const shown = dragging && mode === "direct" ? live : size;
  const willClose = dragging && snap && live! < SNAP;

  return (
    <div className="pg-demo">
      <div className="gd-stage">
        <div
          ref={track}
          className="gd-dm"
          data-dragging={dragging && mode === "direct" ? "" : undefined}
          style={{ "--p": `${shown}%` } as CSSProperties}
        >
          <div className="gd-dm-panel">
            <span className="gd-dm-label">{willClose ? "Release to close" : `${Math.round(shown)}%`}</span>
          </div>
          {snap && <div className="gd-dm-threshold" style={{ left: `${SNAP}%` }} aria-hidden="true" />}
          {dragging && mode === "indirect" && (
            <div className="gd-dm-ghost" style={{ left: `${live}%` }} aria-hidden="true" />
          )}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Panel width"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(size)}
            aria-valuetext={size === 0 ? "Closed" : `${Math.round(size)} percent`}
            className="gd-dm-handle"
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              setLive(toPercent(e.clientX));
            }}
            onPointerMove={(e) => dragging && setLive(toPercent(e.clientX))}
            onPointerUp={() => {
              if (live !== null) setSize(settle(live));
              setLive(null);
            }}
            onPointerCancel={() => setLive(null)}
            onKeyDown={(e) => {
              const delta = e.key === "ArrowRight" ? 5 : e.key === "ArrowLeft" ? -5 : 0;
              if (!delta) return;
              e.preventDefault();
              setSize((s) => settle(Math.min(100, Math.max(0, s + delta))));
            }}
          />
        </div>
      </div>
      <p className="gd-stage-note">
        {mode === "direct"
          ? "Direct: the edge stays under your pointer the whole time. Only the release animates."
          : "Indirect: nothing moves while you drag (just a ghost line), then it jumps. Compare how much less in control it feels."}
      </p>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Segmented<Mode>
          label="While dragging"
          value={mode}
          onChange={setMode}
          options={[
            { value: "direct", label: "Follow pointer" },
            { value: "indirect", label: "Wait for release" },
          ]}
        />
        <Switch label={`Snap closed under ${SNAP}%`} checked={snap} onChange={setSnap} />
      </div>
    </div>
  );
}
