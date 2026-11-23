import { useState, type CSSProperties } from "react";
import { Button, CheckIcon, DownloadIcon, HeartIcon, PlayIcon, SearchIcon, SendIcon } from "../../ds";
import { Range, Segmented } from "../ui";

const ROWS = [
  { label: "Search", icon: <SearchIcon /> },
  { label: "Inbox", icon: <SendIcon nudge={false} /> },
  { label: "Favorites", icon: <HeartIcon /> },
  { label: "Downloads", icon: <DownloadIcon /> },
  { label: "Media", icon: <PlayIcon /> },
  { label: "Done", icon: <CheckIcon /> },
];

type Order = "top" | "bottom";

/* Labels leave one after another. Delay = index × step. */
export function StaggerDemo() {
  const [hidden, setHidden] = useState(false);
  const [step, setStep] = useState(60);
  const [order, setOrder] = useState<Order>("top");
  const total = 200 + step * (ROWS.length - 1);

  return (
    <div className="pg-demo">
      <div className="gd-stage">
        <ul className="gd-stagger" data-hidden={hidden ? "" : undefined} aria-label="Menu">
          {ROWS.map((r, i) => {
            const index = order === "top" ? i : ROWS.length - 1 - i;
            return (
              <li key={r.label} style={{ "--d": `${index * step}ms` } as CSSProperties}>
                <span className="gd-stagger-icon" aria-hidden="true">
                  {r.icon}
                </span>
                <span className="gd-stagger-label">{r.label}</span>
                <span className="gd-stagger-delay" aria-hidden="true">
                  +{index * step}ms
                </span>
              </li>
            );
          })}
        </ul>
        <span className="gd-badge" data-tone={step === 0 ? "bad" : "good"}>
          {step === 0 ? "No stagger: everything changes at once" : `Whole cascade: ${total}ms`}
        </span>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <div className="pg-field gd-align-end">
          <Button variant="solid" onClick={() => setHidden((h) => !h)}>
            {hidden ? "Show labels" : "Hide labels"}
          </Button>
        </div>
        <Range label="Delay per item" value={step} min={0} max={150} step={10} unit="ms" onChange={setStep} />
        <Segmented<Order>
          label="Order"
          value={order}
          onChange={setOrder}
          options={[
            { value: "top", label: "Top first" },
            { value: "bottom", label: "Bottom first" },
          ]}
        />
      </div>
    </div>
  );
}
