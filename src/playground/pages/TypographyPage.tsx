import { PageHeader, Section } from "../ui";

const SCALE = [
  ["4xl", 36, 40, "Display"],
  ["3xl", 30, 36, "Page title"],
  ["2xl", 24, 32, "Section title"],
  ["xl", 20, 28, "Card title"],
  ["lg", 18, 26, "Subheading"],
  ["md", 16, 24, "Long-form reading"],
  ["base", 14, 20, "UI default"],
  ["sm", 13, 18, "Dense UI, small tabs"],
  ["xs", 12, 16, "Captions, meta"],
] as const;

export function TypographyPage() {
  return (
    <>
      <PageHeader eyebrow="Foundations" title="Typography">
        <p>
          Inter for UI, JetBrains Mono for code. The UI default is 14px; 16px is for reading. Every size has a matching
          line height token that lands on the 4px grid.
        </p>
      </PageHeader>

      <Section title="Scale">
        <div className="pg-type-list">
          {SCALE.map(([name, size, leading, use]) => (
            <div key={name} className="pg-type-row">
              <div className="pg-type-meta">
                <code>--text-{name}</code>
                <span className="pg-muted">
                  {size}/{leading} · {use}
                </span>
              </div>
              <p
                className="pg-type-sample"
                style={{
                  fontSize: `var(--text-${name})`,
                  lineHeight: `var(--leading-${name})`,
                  fontWeight: size >= 20 ? "var(--weight-semibold)" : undefined,
                  letterSpacing: size >= 24 ? "var(--tracking-tighter)" : size >= 18 ? "var(--tracking-tight)" : undefined,
                }}
              >
                Ship small, polish often
              </p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Weights">
        <div className="pg-weights">
          {(["regular", "medium", "semibold"] as const).map((w) => (
            <div key={w} className="pg-weight">
              <span style={{ fontWeight: `var(--weight-${w})` }}>Aa</span>
              <code>--weight-{w}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Families">
        <div className="pg-families">
          <div className="pg-family">
            <p style={{ fontFamily: "var(--font-sans)" }}>The quick brown fox jumps over the lazy dog</p>
            <code>--font-sans</code>
          </div>
          <div className="pg-family">
            <p style={{ fontFamily: "var(--font-mono)" }}>const tabs = useTabs(&#123; size: "sm" &#125;)</p>
            <code>--font-mono</code>
          </div>
        </div>
      </Section>
    </>
  );
}
