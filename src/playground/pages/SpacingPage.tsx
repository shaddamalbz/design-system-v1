import { Concepts, PageHeader, Section } from "../ui";

const SPACE = [
  ["px", "1px", 1],
  ["0-5", "0.125rem", 2],
  ["1", "0.25rem", 4],
  ["1-5", "0.375rem", 6],
  ["2", "0.5rem", 8],
  ["2-5", "0.625rem", 10],
  ["3", "0.75rem", 12],
  ["4", "1rem", 16],
  ["5", "1.25rem", 20],
  ["6", "1.5rem", 24],
  ["8", "2rem", 32],
  ["10", "2.5rem", 40],
  ["12", "3rem", 48],
  ["16", "4rem", 64],
  ["20", "5rem", 80],
  ["24", "6rem", 96],
] as const;

const TIERS = [
  { range: "0-5 → 1-5", px: "2–6px", use: "Inside a control: icon ↔ label gap, gap between tabs." },
  { range: "2 → 4", px: "8–16px", use: "Component padding, gaps between related items." },
  { range: "5 → 8", px: "20–32px", use: "Between groups inside a card or form." },
  { range: "10 → 24", px: "40–96px", use: "Page layout: between sections, page gutters." },
];

const CONTROLS = [
  ["--control-xs", 24, "Icon buttons, chevrons"],
  ["--control-sm", 28, "Dense UI, small tabs"],
  ["--control-md", 32, "Default control size"],
  ["--control-lg", 40, "Touch-first / hero actions"],
] as const;

export function SpacingPage() {
  return (
    <>
      <PageHeader eyebrow="Foundations" title="Spacing">
        <p>
          A 4px grid in <code>rem</code>. <code>--space-N</code> = N × 4px; half steps only for control internals.
        </p>
        <Concepts ids={["design-tokens", "hit-area"]} />
      </PageHeader>

      <Section title="Scale">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Token</th>
                <th scope="col">rem</th>
                <th scope="col">px</th>
                <th scope="col" className="pg-w-full">
                  <span className="ds-visually-hidden">Preview</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {SPACE.map(([name, rem, px]) => (
                <tr key={name}>
                  <th scope="row">
                    <code>--space-{name}</code>
                  </th>
                  <td className="pg-muted pg-num">{rem}</td>
                  <td className="pg-muted pg-num">{px}</td>
                  <td>
                    <span className="pg-space-bar" style={{ width: `var(--space-${name})` }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="When to use what">
        <div className="pg-tiers">
          {TIERS.map((t) => (
            <div key={t.range} className="pg-tier">
              <p className="pg-tier-range">
                <code>{t.range}</code> <span className="pg-muted">{t.px}</span>
              </p>
              <p className="pg-muted">{t.use}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="In context" description="The Tabs component, annotated with the tokens it uses.">
        <div className="pg-anatomy">
          <div className="pg-anatomy-list">
            <span className="pg-anatomy-tab is-selected">Overview</span>
            <span className="pg-anatomy-gap" title="--space-0-5" />
            <span className="pg-anatomy-tab">Activity</span>
          </div>
          <ul className="pg-anatomy-legend">
            <li>
              <code>--space-1</code> list padding (4px)
            </li>
            <li>
              <code>--space-0-5</code> gap between tabs (2px)
            </li>
            <li>
              <code>--space-3</code> tab inline padding (12px, md) · <code>--space-2-5</code> (sm)
            </li>
            <li>
              <code>--space-4</code> panel padding (16px)
            </li>
          </ul>
        </div>
      </Section>

      <Section title="Control heights" description="Shared by every interactive component so they line up in a row.">
        <div className="pg-controls-demo">
          {CONTROLS.map(([name, px, use]) => (
            <div key={name} className="pg-control-sample">
              <span className="pg-control-box" style={{ height: `var(${name})` }}>
                {px}px
              </span>
              <code>{name}</code>
              <small className="pg-muted">{use}</small>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
