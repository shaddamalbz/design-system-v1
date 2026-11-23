import { useMemo, useState } from "react";
import { Segmented } from "../ui";

const RAMPS = {
  short: " .:#",
  classic: " .:-=+*#%@",
  long: " .'`^,:;Il!i><~+_-?][}{1)(|tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
} as const;
type Ramp = keyof typeof RAMPS;

const COLS = 44;
const ROWS = 18;

/* A lit sphere: brightest top-left, dark at the rim. Measured in pixels,
   since a glyph cell is about 6px wide and 11px tall. */
const CW = 6;
const LH = 11;
function sphere(col: number, row: number) {
  const r = (Math.min(COLS * CW, ROWS * LH) / 2) * 0.96;
  const x = ((col + 0.5) * CW - (COLS * CW) / 2) / r;
  const y = ((row + 0.5) * LH - (ROWS * LH) / 2) / r;
  const d2 = x * x + y * y;
  if (d2 > 1) return 0;
  const z = Math.sqrt(1 - d2);
  const light = x * -0.5 + y * -0.55 + z * 0.67;
  return Math.max(0, Math.min(1, light * 0.95 + 0.08));
}

export function CharacterRampDemo() {
  const [ramp, setRamp] = useState<Ramp>("classic");
  const chars = RAMPS[ramp];
  const pick = (v: number) => chars[Math.min(chars.length - 1, Math.floor(v * chars.length))];

  const art = useMemo(
    () =>
      Array.from({ length: ROWS }, (_, r) =>
        Array.from({ length: COLS }, (_, c) => pick(sphere(c, r))).join(""),
      ).join("\n"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ramp],
  );
  const steps = Array.from({ length: 11 }, (_, i) => i / 10);

  return (
    <div className="pg-demo">
      <Segmented<Ramp>
        label="Ramp"
        value={ramp}
        onChange={setRamp}
        options={[
          { value: "short", label: "4 glyphs" },
          { value: "classic", label: "10 glyphs" },
          { value: "long", label: "70 glyphs" },
        ]}
      />
      <div className="gd-ramp">
        <div className="gd-stage gd-ramp-stage">
          <pre className="gd-ramp-art" aria-label={`A shaded sphere drawn with ${chars.length} characters`} role="img">
            {art}
          </pre>
        </div>
        <div className="gd-ramp-side">
          <div className="gd-ramp-strip" aria-hidden="true">
            {steps.map((v) => (
              <div key={v}>
                <span className="gd-ramp-swatch" style={{ opacity: Math.max(0.06, v) }} />
                <span className="gd-ramp-glyph">{pick(v) === " " ? "␣" : pick(v)}</span>
                <span className="gd-ramp-val">{v.toFixed(1)}</span>
              </div>
            ))}
          </div>
          <p className="pg-muted gd-ramp-note">
            Value (brightness) → glyph. A space for “nothing”, then characters that cover more and more of their cell.
          </p>
          <code className="gd-ramp-chars">“{chars}”</code>
        </div>
      </div>
      <p className="gd-stage-note">
        Same sphere, three ramps. More glyphs give smoother shading but get noisy at small sizes; a short ramp reads
        bolder.
      </p>
    </div>
  );
}
