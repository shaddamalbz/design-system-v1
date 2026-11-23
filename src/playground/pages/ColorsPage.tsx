import { useEffect, useRef, useState, type RefObject } from "react";
import { Concepts, PageHeader, Section } from "../ui";

type Kind = "fill" | "overlay" | "border" | "text" | "ring";
interface Token {
  name: string;
  kind: Kind;
  use: string;
}

const GROUPS: { title: string; tokens: Token[] }[] = [
  {
    title: "Backgrounds & surfaces",
    tokens: [
      { name: "--color-bg", kind: "fill", use: "Page background" },
      { name: "--color-bg-subtle", kind: "fill", use: "Alternate sections, stages" },
      { name: "--color-surface", kind: "fill", use: "Cards, panels" },
      { name: "--color-surface-sunken", kind: "fill", use: "Wells inside a surface (tab list)" },
      { name: "--color-surface-raised", kind: "fill", use: "Things lifted above a surface (selected tab)" },
    ],
  },
  {
    title: "Interaction",
    tokens: [
      { name: "--color-hover", kind: "overlay", use: "Hover overlay, works on any surface" },
      { name: "--color-active", kind: "overlay", use: "Pressed overlay" },
      { name: "--color-ring", kind: "ring", use: "Focus ring (≥ 3:1)" },
      { name: "--color-scrollbar", kind: "overlay", use: "Scrollbar thumb at rest" },
      { name: "--color-scrollbar-hover", kind: "overlay", use: "Scrollbar thumb while hovering the area" },
    ],
  },
  {
    title: "Borders",
    tokens: [
      { name: "--color-border", kind: "border", use: "Default dividers and outlines" },
      { name: "--color-border-strong", kind: "border", use: "Inputs, emphasis" },
    ],
  },
  {
    title: "Text & solid",
    tokens: [
      { name: "--color-text", kind: "text", use: "Primary text" },
      { name: "--color-text-muted", kind: "text", use: "Secondary text (AA)" },
      { name: "--color-text-subtle", kind: "text", use: "Disabled / placeholder only" },
      { name: "--color-solid", kind: "fill", use: "Accent for now (inverted neutral)" },
      { name: "--color-on-solid", kind: "text", use: "Text on solid" },
    ],
  },
];

function Swatch({ token }: { token: Token }) {
  const v = `var(${token.name})`;
  switch (token.kind) {
    case "fill":
      return <span className="pg-swatch" style={{ background: v }} />;
    case "overlay":
      return (
        <span className="pg-swatch" style={{ background: "var(--color-surface)" }}>
          <span className="pg-swatch-inner" style={{ background: v }} />
        </span>
      );
    case "border":
      return <span className="pg-swatch" style={{ background: "var(--color-surface)", boxShadow: `inset 0 0 0 2px ${v}` }} />;
    case "ring":
      return (
        <span className="pg-swatch" style={{ background: "var(--color-surface)" }}>
          <span className="pg-swatch-inner" style={{ outline: `2px solid ${v}`, outlineOffset: 2, background: "transparent" }} />
        </span>
      );
    case "text":
      return (
        <span
          className="pg-swatch pg-swatch-text"
          style={{ color: v, background: token.name === "--color-on-solid" ? "var(--color-solid)" : "var(--color-bg)" }}
        >
          Aa
        </span>
      );
  }
}

/* Reads the resolved color inside a themed element, so the hex shown is
   always what the browser actually painted. */
function useResolved(name: string, ref: RefObject<HTMLElement | null>) {
  const [value, setValue] = useState("");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    el.appendChild(probe);
    setValue(toHex(getComputedStyle(probe).color));
    probe.remove();
  }, [name, ref]);
  return value;
}

function toHex(rgb: string) {
  const m = rgb.match(/[\d.]+/g);
  if (!m) return rgb;
  const [r, g, b, a] = m.map(Number);
  const hex = "#" + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, "0")).join("");
  return a !== undefined && a < 1 ? `${hex} · ${Math.round(a * 100)}%` : hex;
}

function ThemedCell({ theme, token }: { theme: "light" | "dark"; token: Token }) {
  const ref = useRef<HTMLDivElement>(null);
  const hex = useResolved(token.name, ref);
  return (
    <td>
      <div ref={ref} data-theme={theme} className="pg-themed-cell">
        <Swatch token={token} />
        <code className="pg-hex">{hex}</code>
      </div>
    </td>
  );
}

export function ColorsPage() {
  return (
    <>
      <PageHeader eyebrow="Foundations" title="Colors">
        <p>
          Neutral palette, no brand color yet. Components use the semantic tokens below; each is defined once for light
          and dark.
        </p>
        <Concepts ids={["design-tokens"]} />
      </PageHeader>

      {GROUPS.map((group) => (
        <Section key={group.title} title={group.title}>
          <div className="pg-table-wrap">
            <table className="pg-table pg-color-table">
              <thead>
                <tr>
                  <th scope="col">Token</th>
                  <th scope="col">Light</th>
                  <th scope="col">Dark</th>
                  <th scope="col">Use for</th>
                </tr>
              </thead>
              <tbody>
                {group.tokens.map((token) => (
                  <tr key={token.name}>
                    <th scope="row">
                      <code>{token.name}</code>
                    </th>
                    <ThemedCell theme="light" token={token} />
                    <ThemedCell theme="dark" token={token} />
                    <td className="pg-muted">{token.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      ))}

      <Section
        title="Neutral scale"
        description="Primitives behind the semantic tokens. 1–2 backgrounds · 3–5 fills · 6–8 borders · 9–10 solids · 11–12 text."
      >
        {(["light", "dark"] as const).map((theme) => (
          <div key={theme} data-theme={theme} className="pg-scale">
            <span className="pg-scale-label">{theme === "light" ? "Light" : "Dark"}</span>
            <div className="pg-scale-row">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="pg-scale-step">
                  <span style={{ background: `var(--gray-${i + 1})` }} />
                  <small>{i + 1}</small>
                </div>
              ))}
            </div>
          </div>
        ))}
      </Section>
    </>
  );
}
