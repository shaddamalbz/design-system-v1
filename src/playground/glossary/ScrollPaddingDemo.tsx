import { useRef, useState } from "react";
import { Button } from "../../ds";
import { Switch } from "../ui";

const ITEMS = Array.from({ length: 20 }, (_, i) => i + 1);

/* A list under a sticky header. Jumping to an item scrolls it to the top,
   minus the container's scroll-padding-top. */
export function ScrollPaddingDemo() {
  const [padding, setPadding] = useState(false);
  const [target, setTarget] = useState<number | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  const jump = (n: number) => {
    const el = scroller.current;
    const item = el?.querySelector<HTMLElement>(`[data-item="${n}"]`);
    if (!el || !item) return;
    // Read the real CSS value, the same way the browser would use it
    const pad = parseFloat(getComputedStyle(el).scrollPaddingTop) || 0;
    el.scrollTo({ top: item.offsetTop - pad, behavior: "smooth" });
    setTarget(n);
  };

  return (
    <div className="pg-demo">
      <div className="gd-stage gd-sp-stage">
        <div ref={scroller} className="gd-sp" data-padding={padding ? "" : undefined} tabIndex={0} aria-label="Messages">
          <div className="gd-sp-header">{padding ? "Sticky header · scroll-padding zone" : "Sticky header (56px)"}</div>
          {ITEMS.map((n) => (
            <div key={n} data-item={n} className="gd-sp-item" data-target={target === n ? "" : undefined}>
              Message {n}
            </div>
          ))}
        </div>
      </div>

      <div className="gd-stats">
        {target !== null && (
          <span className="gd-badge" data-tone={padding ? "good" : "bad"}>
            {padding ? `Message ${target} lands right below the header` : `Message ${target} is hidden under the header`}
          </span>
        )}
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Switch label="scroll-padding-top: 56px" checked={padding} onChange={setPadding} />
        <div className="pg-field gd-align-end gd-row">
          <Button size="sm" onClick={() => jump(8)}>
            Jump to 8
          </Button>
          <Button size="sm" onClick={() => jump(15)}>
            Jump to 15
          </Button>
        </div>
      </div>
    </div>
  );
}
