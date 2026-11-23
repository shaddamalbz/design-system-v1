import { useState, type CSSProperties } from "react";
import { DownloadIcon, HeartIcon, SearchIcon, SendIcon, TrashIcon } from "../../ds";
import { Range, Switch } from "../ui";

const TARGETS = [
  { Icon: SearchIcon, label: "Search" },
  { Icon: HeartIcon, label: "Like" },
  { Icon: SendIcon, label: "Send" },
  { Icon: DownloadIcon, label: "Download" },
  { Icon: TrashIcon, label: "Delete" },
];

/* Every icon is drawn at 16px. Only the invisible clickable area changes. */
export function HitAreaDemo() {
  const [size, setSize] = useState(16);
  const [show, setShow] = useState(true);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);

  const level =
    size < 24
      ? { text: "Below 24px: fails WCAG 2.5.8", tone: "bad" }
      : size < 44
        ? { text: "Meets WCAG AA (24px+)", tone: "ok" }
        : { text: "Comfortable for touch (44px+)", tone: "good" };

  return (
    <div className="pg-demo">
      <div
        className="gd-stage gd-hit-stage"
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest(".gd-hit")) setMisses((m) => m + 1);
        }}
      >
        <div className="gd-hit-row" style={{ "--hit": `${size}px` } as CSSProperties}>
          {TARGETS.map(({ Icon, label }) => (
            <button
              key={label}
              type="button"
              className="gd-hit"
              data-show={show ? "" : undefined}
              aria-label={label}
              onClick={() => setHits((h) => h + 1)}
            >
              <Icon />
            </button>
          ))}
        </div>
        <p className="gd-stage-note">Try to click the icons quickly. Misses are clicks that land next to them.</p>
      </div>

      <div className="gd-stats">
        <span>
          <strong>{hits}</strong> hits
        </span>
        <span>
          <strong>{misses}</strong> misses
        </span>
        <span className="gd-badge" data-tone={level.tone}>
          {level.text}
        </span>
        {size > 28 && <span className="pg-muted">Areas now overlap: neighbors steal each other's clicks.</span>}
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Range label="Hit area (icon stays 16px)" value={size} min={16} max={56} step={2} unit="px" onChange={setSize} />
        <Switch label="Show hit area" checked={show} onChange={setShow} />
        <button
          type="button"
          className="pg-button gd-reset"
          onClick={() => {
            setHits(0);
            setMisses(0);
          }}
        >
          Reset score
        </button>
      </div>
    </div>
  );
}
