import { CodeBlock, Concepts, PageHeader, Section, TermLink } from "../ui";

const RADII = [
  ["xs", 4],
  ["sm", 6],
  ["md", 8],
  ["lg", 12],
  ["xl", 16],
  ["2xl", 24],
  ["full", 9999],
] as const;

const SHADOWS = ["xs", "sm", "md", "lg"] as const;

const NESTED_CSS = `.card {
  --r: var(--radius-xl);
  --pad: var(--space-2);
  border-radius: var(--r);
  padding: var(--pad);
}

.card > .inner {
  /* max() so a padding larger than the radius gives a square, not an error */
  border-radius: max(0px, calc(var(--r) - var(--pad)));
}`;

export function ShapePage() {
  return (
    <>
      <PageHeader eyebrow="Foundations" title="Radius & shadow">
        <p>Corner radius and elevation tokens.</p>
        <Concepts ids={["concentric-radius", "design-tokens"]} />
      </PageHeader>

      <Section title="Radius">
        <div className="pg-radii">
          {RADII.map(([name, px]) => (
            <div key={name} className="pg-radius">
              <span style={{ borderRadius: `var(--radius-${name})` }} />
              <code>--radius-{name}</code>
              <small className="pg-muted">{px === 9999 ? "pill" : `${px}px`}</small>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Nesting"
        description={
          <>
            Inside a rounded container, use <code>inner = outer − padding</code> (
            <TermLink id="concentric-radius" />
            ).
          </>
        }
      >
        <CodeBlock code={NESTED_CSS} label="Nested radius CSS" />
      </Section>

      <Section
        title="Shadow"
        description="Subtle in light mode. In dark mode, raised surfaces use a lighter fill plus a 1px top highlight."
      >
        <div className="pg-split">
          {(["light", "dark"] as const).map((theme) => (
            <div key={theme} data-theme={theme} className="pg-shadow-stage">
              {SHADOWS.map((s) => (
                <div key={s} className="pg-shadow-card" style={{ boxShadow: `var(--shadow-${s}), var(--highlight)` }}>
                  <code>--shadow-{s}</code>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
