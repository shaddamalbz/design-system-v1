import { useState } from "react";
import { Segmented, Switch } from "../ui";

type Font = "sans" | "serif" | "mono";
const FONTS: Record<Font, string> = {
  sans: "var(--font-sans)",
  serif: "Georgia, 'Times New Roman', serif",
  mono: "var(--font-mono)",
};

/* A big pill label with equal padding. Tinted = the text's box. Red line =
   true vertical center of the pill. */
export function TextBoxTrimDemo() {
  const supported = typeof CSS !== "undefined" && CSS.supports("text-box: trim-both cap alphabetic");
  const [trim, setTrim] = useState(false);
  const [font, setFont] = useState<Font>("sans");

  return (
    <div className="pg-demo">
      <div className="gd-stage">
        <div className="gd-tb-row">
          <span className="gd-tb-pill" data-trim={trim ? "" : undefined} style={{ fontFamily: FONTS[font] }}>
            <span className="gd-tb-text">HELLO</span>
          </span>
          <span className="gd-tb-pill" data-trim={trim ? "" : undefined} style={{ fontFamily: FONTS[font] }}>
            <span className="gd-tb-text">Sign up</span>
          </span>
        </div>
        <p className="gd-stage-note">
          Tinted box = the text's box. Red line = the pill's true center.{" "}
          {trim
            ? "Trimmed: the box hugs the capital letters, so they sit on the center line."
            : "Untrimmed: the box includes invisible space above and below, so the letters sit off-center."}
        </p>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Switch
          label="text-box: trim-both cap alphabetic"
          description={supported ? undefined : "Not supported in this browser, so nothing changes"}
          checked={trim}
          onChange={setTrim}
        />
        <Segmented<Font>
          label="Font"
          value={font}
          onChange={setFont}
          options={[
            { value: "sans", label: "Inter" },
            { value: "serif", label: "Georgia" },
            { value: "mono", label: "Mono" },
          ]}
        />
      </div>
    </div>
  );
}
