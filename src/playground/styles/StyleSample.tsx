import { useEffect, useId, useState, type CSSProperties } from "react";
import "./designStyles.css";
import { MangaFilters, loadMangaFont, mangaBoilVars, mangaClick } from "./mangaFx";

/* One card, many skins: the same markup, styled by `.st-<id>`. Keeping the
   content identical makes it easy to compare styles fairly. */

export function StyleSample({ id, vars }: { id: string; vars?: Record<string, string> }) {
  const [on, setOn] = useState(true);
  const labelId = useId();
  const fxId = useId().replace(/[^\w-]/g, "");
  const manga = id === "manga";
  useEffect(() => {
    if (manga) loadMangaFont();
  }, [manga]);
  const style = (manga ? { ...mangaBoilVars(fxId), ...vars } : vars) as CSSProperties;
  return (
    <div className={`st-scene st-${id}`} style={style} onClick={manga ? mangaClick : undefined}>
      {manga && <MangaFilters prefix={fxId} />}
      {id === "glassmorphism" && (
        <div className="st-blobs" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
      <div className="st-card">
        <div className="st-head">
          <span className="st-avatar" aria-hidden="true">
            WR
          </span>
          <div>
            <p className="st-title">Weekly report</p>
            <p className="st-sub">Ready to export · 2.4 MB</p>
          </div>
        </div>
        <div className="st-row">
          <span id={labelId}>Email it to the team</span>
          <button
            type="button"
            role="switch"
            aria-checked={on}
            aria-labelledby={labelId}
            className="st-toggle"
            onClick={() => setOn((v) => !v)}
          />
        </div>
        <div className="st-actions">
          <button type="button" className="st-btn st-btn-secondary">
            Preview
          </button>
          <button type="button" className="st-btn st-btn-primary">
            Export
          </button>
        </div>
      </div>
      {manga && <div className="mg-layer" aria-hidden="true" />}
    </div>
  );
}
