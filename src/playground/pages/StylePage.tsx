import { useState } from "react";
import { SORTED_STYLES, type DesignStyle } from "../styles/designStyles";
import { StyleSample } from "../styles/StyleSample";
import { CodeBlock, PageHeader, PrevNext, Range, Section, Segmented } from "../ui";

type Preview = "current" | "both";

export function StylePage({ style }: { style: DesignStyle }) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries((style.controls ?? []).map((c) => [c.prop, c.value])),
  );
  const [preview, setPreview] = useState<Preview>("current");

  const vars = Object.fromEntries(
    (style.controls ?? []).map((c) => [c.prop, `${values[c.prop]}${c.unit}`]),
  );

  const index = SORTED_STYLES.indexOf(style);
  const prev = SORTED_STYLES[index - 1];
  const next = SORTED_STYLES[index + 1];

  return (
    <>
      <PageHeader eyebrow="Design styles" title={style.name}>
        <p>{style.summary}</p>
        {style.aka && <p className="pg-aka">Also called: {style.aka.join(", ")}</p>}
        <p className="pg-aka">{style.era}</p>
      </PageHeader>

      <div className="pg-playground">
        {preview === "current" ? (
          <StyleSample id={style.id} vars={vars} />
        ) : (
          <div className="pg-split">
            {(["light", "dark"] as const).map((theme) => (
              <div key={theme} data-theme={theme} className="pg-style-themed">
                <span className="pg-style-theme-label">{theme === "light" ? "Light" : "Dark"}</span>
                <StyleSample id={style.id} vars={vars} />
              </div>
            ))}
          </div>
        )}
        <div className="pg-controls" role="group" aria-label="Preview controls">
          {style.controls?.map((c) => (
            <Range
              key={c.prop}
              label={c.label}
              value={values[c.prop]}
              min={c.min}
              max={c.max}
              step={c.step}
              unit={c.unit}
              onChange={(v) => setValues((s) => ({ ...s, [c.prop]: v }))}
            />
          ))}
          <Segmented<Preview>
            label="Preview"
            value={preview}
            onChange={setPreview}
            options={[
              { value: "current", label: "Current theme" },
              { value: "both", label: "Light + dark" },
            ]}
          />
        </div>
      </div>

      {style.traits && (
        <Section title="Key traits">
          <ul className="pg-checklist">
            {style.traits.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Section>
      )}

      {style.recipe && (
        <Section title="Recipe" description="The core CSS that creates the look.">
          <CodeBlock code={style.recipe} label={`${style.name} CSS`} />
        </Section>
      )}

      {style.script && (
        <Section title="Script" description="The JS behind the motion: CSS alone can't spawn randomized pieces per click.">
          <CodeBlock code={style.script} label={`${style.name} script`} />
        </Section>
      )}

      {(style.goodFor || style.avoid) && (
        <Section title="When to use it">
          <div className="pg-usage-grid">
            {style.goodFor && (
              <div className="pg-usage-card">
                <p className="pg-usage-title">Good for</p>
                <ul>
                  {style.goodFor.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            )}
            {style.avoid && (
              <div className="pg-usage-card">
                <p className="pg-usage-title">Avoid for</p>
                <ul>
                  {style.avoid.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </Section>
      )}

      {style.a11y && (
        <Section title="Accessibility">
          <ul className="pg-checklist">
            {style.a11y.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Section>
      )}

      <PrevNext
        label="Design styles"
        prev={prev && { href: `#/styles/${prev.id}`, title: prev.name }}
        next={next && { href: `#/styles/${next.id}`, title: next.name }}
      />
    </>
  );
}
