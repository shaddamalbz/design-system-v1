import { useEffect, useState } from "react";
import { MiniWindow, MorphToggle } from "./MorphToggle";

type Part = "trigger" | "rules" | "feedback" | "modes";

const PARTS: { id: Part; title: string; text: (collapsed: boolean) => string }[] = [
  { id: "trigger", title: "Trigger", text: () => "What starts it: a click, a key (Ctrl+B), a drag." },
  {
    id: "rules",
    title: "Rules",
    text: (c) => (c ? "The pane shrinks to icons only." : "The pane shows icons and labels."),
  },
  {
    id: "feedback",
    title: "Feedback",
    text: () => "What you see: the icon morphs, the pane glides, labels fade.",
  },
  {
    id: "modes",
    title: "Loops & modes",
    text: (c) => (c ? "Same button, new meaning: it now expands." : "Same button, new meaning: it now collapses."),
  },
];

/* One small moment, split into its four parts. Each part lights up when it happens. */
export function MicroInteractionDemo() {
  const [collapsed, setCollapsed] = useState(false);
  const [lit, setLit] = useState<Part[]>([]);

  useEffect(() => {
    if (!lit.length) return;
    const t = setTimeout(() => setLit([]), 1400);
    return () => clearTimeout(t);
  }, [lit]);

  const toggle = () => {
    setCollapsed((c) => !c);
    setLit(["trigger", "rules", "feedback", "modes"]);
  };

  return (
    <div className="pg-demo">
      <div className="gd-stage gd-mi">
        <div className="gd-mi-scene">
          <MorphToggle
            collapsed={collapsed}
            onToggle={toggle}
            aria-label="Sidebar"
            onPointerEnter={() => setLit(["feedback"])}
          />
          <MiniWindow collapsed={collapsed} />
        </div>
        <ol className="gd-mi-parts">
          {PARTS.map((p, i) => (
            <li
              key={p.id}
              className="gd-mi-part"
              data-lit={lit.includes(p.id) ? "" : undefined}
              style={{ transitionDelay: lit.length > 1 ? `${i * 90}ms` : "0ms" }}
            >
              <span className="gd-mi-num">{i + 1}</span>
              <strong>{p.title}</strong>
              <span className="pg-muted">{p.text(collapsed)}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="gd-stage-note">Hover the button (feedback starts before you click), then click it.</p>
    </div>
  );
}
