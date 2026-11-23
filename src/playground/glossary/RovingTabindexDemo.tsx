import { useRef, useState, type KeyboardEvent } from "react";

const ITEMS = ["Bold", "Italic", "Underline", "Link", "Code"];

/* Two toolbars with the same buttons. Badges show each button's live tabindex. */
export function RovingTabindexDemo() {
  return (
    <div className="pg-demo">
      <div className="gd-stage gd-rt">
        <button type="button" className="pg-button gd-rt-start">
          Start here, then press Tab
        </button>

        <Toolbar title="Every button is a tab stop" note="5 Tab presses to get past" roving={false} />
        <Toolbar title="Roving tabindex" note="1 Tab press to get past; ← → move inside" roving />

        <button type="button" className="pg-button gd-rt-start">
          You made it
        </button>
      </div>
      <p className="pg-muted pg-note">
        Badges show each button's <code>tabindex</code>. The ring shows where focus is.
      </p>
    </div>
  );
}

function Toolbar({ title, note, roving }: { title: string; note: string; roving: boolean }) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (!roving) return;
    const last = ITEMS.length - 1;
    const next =
      e.key === "ArrowRight" ? (active === last ? 0 : active + 1)
      : e.key === "ArrowLeft" ? (active === 0 ? last : active - 1)
      : e.key === "Home" ? 0
      : e.key === "End" ? last
      : null;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    refs.current[next]?.focus();
  };

  return (
    <div className="gd-rt-group">
      <div className="gd-rt-head">
        <strong>{title}</strong>
        <span className="pg-muted">{note}</span>
      </div>
      <div className="gd-rt-toolbar" role="toolbar" aria-label={title} onKeyDown={onKeyDown}>
        {ITEMS.map((item, i) => {
          const tabIndex = roving ? (i === active ? 0 : -1) : 0;
          return (
            <div key={item} className="gd-rt-item">
              <span className="gd-rt-badge" data-stop={tabIndex === 0 ? "" : undefined} aria-hidden="true">
                {tabIndex}
              </span>
              <button
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                className="gd-rt-btn"
                tabIndex={tabIndex}
                onFocus={() => roving && setActive(i)}
              >
                {item}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
