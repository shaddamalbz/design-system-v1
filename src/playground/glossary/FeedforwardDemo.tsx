import { useState } from "react";
import { MiniWindow, MorphToggle } from "./MorphToggle";

function Cell({ feedforward }: { feedforward: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const show = () => feedforward && setPreviewing(true);
  const hide = () => setPreviewing(false);
  return (
    <figure className="pg-compare-cell" data-mark={feedforward ? "good" : undefined}>
      <figcaption>
        <span className="pg-compare-title">{feedforward ? "Feedforward" : "Feedback only"}</span>
        <span className="pg-muted">
          {feedforward ? "Hover shows the result before you click" : "You find out after you click"}
        </span>
      </figcaption>
      <div className="pg-compare-stage gd-ff-stage">
        <div onPointerEnter={show} onPointerLeave={hide} onFocus={show} onBlur={hide}>
          <MorphToggle
            collapsed={collapsed}
            preview={feedforward}
            onToggle={() => {
              setCollapsed((c) => !c);
              setPreviewing(false);
            }}
            aria-label={feedforward ? "Sidebar (with preview)" : "Sidebar (no preview)"}
          />
        </div>
        <MiniWindow collapsed={collapsed} ghost={previewing} />
      </div>
    </figure>
  );
}

export function FeedforwardDemo() {
  return (
    <div className="pg-demo">
      <div className="pg-compare">
        <Cell feedforward={false} />
        <Cell feedforward />
      </div>
      <p className="gd-stage-note">
        Hover (or Tab to) each button without clicking. Only the Feedforward one tells you what it will do: the icon
        turns into its next state and the window outlines where the pane will end up.
      </p>
    </div>
  );
}
