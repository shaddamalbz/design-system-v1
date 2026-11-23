import { useState } from "react";
import { CodeBlock } from "../ui";

const CODE = `.progress {
  transform-origin: left;
  animation: grow linear both;
  animation-timeline: scroll(); /* nearest scroll container */
}
@keyframes grow {
  from { scale: 0 1; }
  to   { scale: 1 1; }
}`;

/* Scroll the box: the bar, the spinning square and the counter are driven by
   scroll position, not time. Only the counter uses JS (for comparison). */
export function ScrollDrivenDemo() {
  const supported = typeof CSS !== "undefined" && CSS.supports("animation-timeline: scroll()");
  const [pct, setPct] = useState(0);

  return (
    <div className="pg-demo">
      <div className="gd-sd">
        <div
          className="gd-sd-scroller"
          tabIndex={0}
          aria-label="Scrollable article"
          onScroll={(e) => {
            const el = e.currentTarget;
            const max = el.scrollHeight - el.clientHeight;
            setPct(max > 0 ? Math.round((el.scrollTop / max) * 100) : 0);
          }}
        >
          <div className="gd-sd-bar" aria-hidden="true" />
          <div className="gd-sd-content">
            <div className="gd-sd-shape" aria-hidden="true" />
            {Array.from({ length: 14 }, (_, i) => (
              <div key={i} className="gd-sd-line" style={{ width: `${60 + ((i * 37) % 40)}%` }} />
            ))}
          </div>
        </div>
        <div className="gd-sd-side">
          <p>
            <span className="pg-muted">Scroll position (JS)</span>
            <br />
            <strong className="gd-sd-pct">{pct}%</strong>
          </p>
          <p className="pg-muted">
            The bar and the square use no JavaScript. {supported ? "" : "Your browser doesn't support this yet, so they stay still."}
          </p>
        </div>
      </div>
      <CodeBlock code={CODE} label="Scroll-driven progress bar CSS" />
    </div>
  );
}
