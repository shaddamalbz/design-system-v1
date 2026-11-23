import { useState } from "react";
import { AsciiField, type AsciiPattern } from "../../ds";
import { ApiTable, CodeBlock, Concepts, PageHeader, Range, Section, Segmented, Select, Switch, TermLink } from "../ui";

const RAMPS = {
  classic: " .:-=+*#%@",
  dots: " .·•●",
  blocks: " ░▒▓█",
  binary: " 01",
  code: " .;:{}<>/=",
} as const;
type Ramp = keyof typeof RAMPS;

const PALETTES = {
  theme: undefined,
  ocean: ["#0f2a3f", "#1f6f8b", "#46b5c9", "#d6f4f2"],
  ember: ["#3a1c12", "#b4441f", "#f08a3c", "#ffe0a3"],
} as const;
type Palette = keyof typeof PALETTES;

export function AsciiFieldPage() {
  const [pattern, setPattern] = useState<AsciiPattern>("flow");
  const [ramp, setRamp] = useState<Ramp>("classic");
  const [palette, setPalette] = useState<Palette>("theme");
  const [cellSize, setCellSize] = useState(14);
  const [scale, setScale] = useState(10);
  const [density, setDensity] = useState(70);
  const [fade, setFade] = useState(60);
  const [glow, setGlow] = useState(50);
  const [twinkle, setTwinkle] = useState(50);
  const [speed, setSpeed] = useState(10);
  const [seed, setSeed] = useState(0);
  const [radius, setRadius] = useState(110);
  const [magnify, setMagnify] = useState(60);
  const [wake, setWake] = useState(70);
  const [animate, setAnimate] = useState(true);
  const [interactive, setInteractive] = useState(true);
  const [content, setContent] = useState(true);

  const colors = PALETTES[palette];
  const props = {
    pattern,
    characters: RAMPS[ramp],
    cellSize,
    scale: scale / 10,
    density: density / 100,
    fade: fade / 100,
    glow: glow / 100,
    twinkle: twinkle / 100,
    speed: speed / 10,
    seed,
    radius,
    magnify: magnify / 100,
    wake: wake / 100,
    animate,
    interactive,
    colors: colors ? [...colors] : undefined,
  };

  const defaults: Record<string, unknown> = {
    pattern: "flow",
    characters: RAMPS.classic,
    cellSize: 14,
    scale: 1,
    density: 0.7,
    fade: 0.6,
    glow: 0.5,
    twinkle: 0.5,
    speed: 1,
    seed: 0,
    radius: 110,
    magnify: 0.6,
    wake: 0.7,
    animate: true,
    interactive: true,
    colors: undefined,
  };
  const attrs = Object.entries(props)
    .filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(defaults[k]))
    .map(([k, v]) => `\n  ${k}=${typeof v === "string" ? JSON.stringify(v) : `{${JSON.stringify(v)}}`}`)
    .join("");
  const code = `<AsciiField className="hero"${attrs}${attrs ? "\n" : ""}>
  <h1>…</h1>
</AsciiField>`;

  return (
    <>
      <PageHeader eyebrow="Backgrounds" title="ASCII field">
        <p>
          An animated background drawn as text: a moving field of glyphs, with a lens that follows the pointer, a fading
          trail and click ripples. Put your hero content inside it.
        </p>
        <Concepts ids={["character-ramp", "reduced-motion", "forced-colors", "micro-interaction"]} />
      </PageHeader>

      <div className="pg-playground">
        <AsciiField className="pg-ascii-stage" {...props}>
          {content && (
            <div className="pg-ascii-overlay">
              <p className="pg-eyebrow">Your hero</p>
              <p className="pg-ascii-title">Content sits on top</p>
              <p className="pg-muted">Move the pointer, click for a ripple.</p>
            </div>
          )}
        </AsciiField>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<AsciiPattern>
            label="Pattern"
            value={pattern}
            onChange={setPattern}
            options={[
              { value: "flow", label: "Flow" },
              { value: "waves", label: "Waves" },
              { value: "rings", label: "Rings" },
            ]}
          />
          <Select<Ramp>
            label="Characters"
            value={ramp}
            onChange={setRamp}
            options={(Object.keys(RAMPS) as Ramp[]).map((k) => ({ value: k, label: `${k}  “${RAMPS[k].trim()}”` }))}
          />
          <Segmented<Palette>
            label="Color"
            value={palette}
            onChange={setPalette}
            options={[
              { value: "theme", label: "Theme" },
              { value: "ocean", label: "Ocean" },
              { value: "ember", label: "Ember" },
            ]}
          />
          <Range label="Cell size" value={cellSize} min={8} max={24} unit="px" onChange={setCellSize} />
          <Range label="Scale" value={scale} min={4} max={25} onChange={setScale} />
          <Range label="Density" value={density} min={10} max={100} unit="%" onChange={setDensity} />
          <Range label="Fade" value={fade} min={0} max={100} unit="%" onChange={setFade} />
          <Range label="Glow" value={glow} min={0} max={100} unit="%" onChange={setGlow} />
          <Range label="Twinkle" value={twinkle} min={0} max={100} unit="%" onChange={setTwinkle} />
          <Range label="Speed" value={speed} min={0} max={30} onChange={setSpeed} />
          <Range label="Seed" value={seed} min={0} max={20} onChange={setSeed} />
          <Range label="Lens radius" value={radius} min={40} max={240} unit="px" onChange={setRadius} />
          <Range label="Magnify" value={magnify} min={0} max={100} unit="%" onChange={setMagnify} />
          <Range label="Wake" value={wake} min={0} max={100} unit="%" onChange={setWake} />
          <Switch label="Animate" checked={animate} onChange={setAnimate} />
          <Switch label="Interactive" checked={interactive} onChange={setInteractive} />
          <Switch label="Show content" checked={content} onChange={setContent} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section title="Patterns">
        <div className="pg-ascii-patterns">
          {(["flow", "waves", "rings"] as const).map((p) => (
            <figure key={p} className="pg-ascii-pattern">
              <AsciiField pattern={p} cellSize={11} className="pg-ascii-mini" />
              <figcaption>
                <code>{p}</code>
                <span className="pg-muted">
                  {p === "flow" ? "Drifting banks" : p === "waves" ? "Crossing swells" : "Spreading rings"}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section title="How it works">
        <ul className="pg-checklist">
          <li>A smooth value field (layered sine waves) is sampled once per cell of a character grid.</li>
          <li>
            Each value picks a glyph from the <TermLink id="character-ramp">character ramp</TermLink>, sparse to dense,
            and one of 8 opacity levels.
          </li>
          <li>
            Every glyph at every opacity is drawn once into an offscreen image (an atlas). A frame is then only image
            copies, no text drawing, so thousands of cells stay smooth.
          </li>
          <li>The loop stops when the field is scrolled out of view or the tab is hidden.</li>
          <li>Glyphs use the element's text color by default, so the field follows light and dark mode.</li>
        </ul>
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="ASCII field usage example"
          code={`<AsciiField className="hero" pattern="waves" density={0.6}>
  <h1>Ship faster</h1>
  <p>…</p>
</AsciiField>

/* It fills the size you give it */
.hero { min-height: 560px; }`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="AsciiField"
          rows={[
            ["pattern", '"flow" | "waves" | "rings"', '"flow"', "Shape of the field."],
            ["characters", "string", '" .:-=+*#%@"', "Glyphs from empty to dense; up to 24."],
            ["cellSize", "number", "14", "Row height in px."],
            ["scale", "number", "1", "Size of the shapes; larger is calmer."],
            ["density", "number", "0.7", "How much of the field carries glyphs."],
            ["fade", "number", "0.6", "Fade toward the edges."],
            ["glow", "number", "0.5", "Soft tint under dense areas."],
            ["twinkle", "number", "0.5", "Random cells that flare now and then."],
            ["speed", "number", "1", "Animation speed."],
            ["seed", "number", "0", "Shifts the composition."],
            ["animate", "boolean", "true", "Off draws a still frame."],
            ["interactive", "boolean", "true", "Pointer lens, trail and click ripples."],
            ["radius / magnify / wake", "number", "110 / 0.6 / 0.7", "Lens size, zoom and trail strength."],
            ["color", "string", "text color", "Glyph color; follows the theme by default."],
            ["colors", "string[]", "—", "2–6 colors, faint to dense. Overrides color."],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            Decorative: the canvas is <code>aria-hidden</code> and ignores the pointer, so content on top stays
            clickable and readable.
          </li>
          <li>
            With <TermLink id="reduced-motion">reduced motion</TermLink> it draws a still frame and skips the trail and
            ripples; the lens still follows the pointer since you move it.
          </li>
          <li>
            In <TermLink id="forced-colors">forced colors</TermLink> the canvas is hidden.
          </li>
          <li>
            Keep text on top readable: a scrim behind the content or a higher <code>fade</code> helps contrast.
          </li>
        </ul>
      </Section>
    </>
  );
}
