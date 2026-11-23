import { useRef, useState } from "react";
import { ChevronRightIcon } from "../../ds";
import { Segmented } from "../ui";

type Level = "base" | "css" | "js";

const TAGS = ["Design", "Tokens", "Color", "Spacing", "Type", "Radius", "Motion", "Icons", "Buttons", "Tabs", "Forms", "Tables"];

const FEATURES: { name: string; supported: () => boolean; fallback: string }[] = [
  { name: "Scroll-driven animations", supported: () => CSS.supports("animation-timeline: scroll()"), fallback: "JS sets the same variables (Tabs)" },
  { name: "Text box trim", supported: () => CSS.supports("text-box: trim-both cap alphabetic"), fallback: "Normal line-box centering" },
  { name: "Backdrop blur", supported: () => CSS.supports("backdrop-filter: blur(1px)"), fallback: "More opaque fill (Glassmorphism)" },
  { name: "light-dark()", supported: () => CSS.supports("color: light-dark(#000, #fff)"), fallback: "None: required for theming" },
  { name: ":has() selector", supported: () => CSS.supports("selector(:has(a))"), fallback: "Not used yet" },
  { name: "Anchor positioning", supported: () => CSS.supports("anchor-name: --a"), fallback: "Not used yet" },
  { name: "View transitions", supported: () => "startViewTransition" in document, fallback: "Not used yet" },
];

/* The same scrolling tag row, built up in layers. Each layer is optional. */
export function ProgressiveEnhancementDemo() {
  const [level, setLevel] = useState<Level>("base");
  const scroller = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: 1 | -1) => scroller.current?.scrollBy({ left: dir * 160, behavior: "smooth" });

  return (
    <div className="pg-demo">
      <div className="gd-stage">
        <div className="gd-pe" data-level={level}>
          {level === "js" && (
            <button type="button" className="gd-pe-btn" aria-label="Scroll left" onClick={() => scrollBy(-1)}>
              <ChevronRightIcon style={{ rotate: "180deg" }} />
            </button>
          )}
          <div ref={scroller} className="gd-pe-scroller" tabIndex={0} aria-label="Tags">
            {TAGS.map((t) => (
              <span key={t} className="gd-pe-tag">
                {t}
              </span>
            ))}
          </div>
          {level === "js" && (
            <button type="button" className="gd-pe-btn" aria-label="Scroll right" onClick={() => scrollBy(1)}>
              <ChevronRightIcon />
            </button>
          )}
        </div>
        <ol className="gd-layers" aria-label="Layers">
          <li data-on="">1 · HTML: readable, scrolls with a native scrollbar</li>
          <li data-on={level !== "base" ? "" : undefined}>2 · CSS: hidden scrollbar, edges fade (if supported)</li>
          <li data-on={level === "js" ? "" : undefined}>3 · JS: scroll buttons</li>
        </ol>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Segmented<Level>
          label="Layers"
          value={level}
          onChange={setLevel}
          options={[
            { value: "base", label: "Base" },
            { value: "css", label: "+ CSS" },
            { value: "js", label: "+ JS" },
          ]}
        />
      </div>

      <div className="pg-table-wrap">
        <table className="pg-table">
          <caption>What your browser supports right now</caption>
          <thead>
            <tr>
              <th scope="col">Feature</th>
              <th scope="col">Supported</th>
              <th scope="col">Fallback in this design system</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => {
              const ok = f.supported();
              return (
                <tr key={f.name}>
                  <th scope="row">{f.name}</th>
                  <td>
                    <span className="gd-badge" data-tone={ok ? "good" : "bad"}>
                      {ok ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="pg-muted">{f.fallback}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
