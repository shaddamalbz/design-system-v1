import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Checkbox, Input, Radio, Switch } from "../../ds";
import { Range } from "../ui";

/* Contrast ratio per WCAG: (L1 + 0.05) / (L2 + 0.05) with relative luminance. */
function luminance([r, g, b]: number[]) {
  const c = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const ratio = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const parseRgb = (css: string) => (css.match(/\d+(\.\d+)?/g) ?? ["255", "255", "255"]).slice(0, 3).map(Number);

export function NonTextContrastDemo() {
  const stage = useRef<HTMLDivElement>(null);
  const [bg, setBg] = useState([255, 255, 255]);
  const dark = luminance(bg) < 0.2;
  // How far the edge is from the background: 0 = invisible, 100 = full contrast
  const [strength, setStrength] = useState(25);

  // Read the real background, and again whenever the theme changes
  useLayoutEffect(() => {
    const read = () => {
      if (!stage.current) return;
      const next = parseRgb(getComputedStyle(stage.current).backgroundColor);
      setBg((prev) => (prev.join() === next.join() ? prev : next));
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class", "style"] });
    const media = matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", read);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", read);
    };
  }, []);

  const level = Math.round(dark ? bg[0] + (255 - bg[0]) * (strength / 100) : bg[0] * (1 - strength / 100));
  const edge = [level, level, level];
  const r = ratio(edge, bg);
  const pass = r >= 3;
  const hex = `#${level.toString(16).padStart(2, "0").repeat(3)}`;

  return (
    <div className="pg-demo">
      <div className="gd-ntc">
        <div
          ref={stage}
          className="gd-ntc-stage"
          style={{ "--color-border-control": hex } as CSSProperties}
        >
          <Checkbox label="Checkbox" />
          <Radio value="a" label="Radio" name="gd-ntc" />
          <Switch label="Switch" />
          <Input aria-label="Text input" placeholder="Text input" />
        </div>
        <div className="gd-ntc-side">
          <Range label="Edge strength" value={strength} min={5} max={70} unit="%" onChange={setStrength} />
          <div className="gd-ntc-readout">
            <span className="gd-ntc-swatch" style={{ background: hex }} />
            <code>{hex}</code>
            <strong className="pg-num">{r.toFixed(2)}:1</strong>
            <span className="gd-badge" data-tone={pass ? "good" : "bad"}>
              {pass ? "Passes 3:1" : "Fails 3:1"}
            </span>
          </div>
          <div className="gd-row">
            <button type="button" className="pg-button" onClick={() => setStrength(18)}>
              Typical faint border
            </button>
            <button type="button" className="pg-button" onClick={() => setStrength(dark ? 36 : 44)}>
              Just passing
            </button>
          </div>
        </div>
      </div>
      <p className="gd-stage-note">
        Drag until the badge turns green. Below 3:1 the empty checkbox, radio and switch track start to fade into the
        background, especially on a dim screen or in sunlight.
      </p>
    </div>
  );
}
