/* Playground-only helpers (not part of the design system… yet). */
import { useId, useState, type CSSProperties, type ReactNode } from "react";
import { getTerm } from "./glossary/terms";
import { Field, Input, Switch as DsSwitch } from "../ds";

export function PageHeader({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <header className="pg-page-header">
      <p className="pg-eyebrow">{eyebrow}</p>
      <h1 id="page-title" tabIndex={-1}>
        {title}
      </h1>
      {children && <div className="pg-lead">{children}</div>}
    </header>
  );
}

export function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  const id = useId();
  return (
    <section className="pg-section" aria-labelledby={id}>
      <h2 id={id}>{title}</h2>
      {description && <p className="pg-section-desc">{description}</p>}
      {children}
    </section>
  );
}

interface Option<T extends string> {
  value: T;
  label: string;
}

/** Radio group styled as a segmented control (native inputs = free a11y). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  hideLabel?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className="pg-field">
      <legend className={hideLabel ? "ds-visually-hidden" : "pg-label"}>{label}</legend>
      <div className="pg-segmented">
        {options.map((option) => (
          <label key={option.value} className="pg-segmented-item">
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function Range({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="pg-field">
      <div className="pg-label-row">
        <label htmlFor={id} className="pg-label">
          {label}
        </label>
        <output htmlFor={id} className="pg-output">
          {value}
          {unit}
        </output>
      </div>
      <input
        id={id}
        className="pg-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  const id = useId();
  return (
    <div className="pg-field">
      <label htmlFor={id} className="pg-label">
        {label}
      </label>
      <select id={id} className="pg-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Playground controls use the design system's own Field + Input. */
export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <Field label={label}>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

/** Playground toggles use the design system's own Switch. */
export function Switch({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
}) {
  return <DsSwitch label={label} description={description} checked={checked} onCheckedChange={onChange} />;
}

export function CodeBlock({ code, label = "Code" }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="pg-code">
      <pre aria-label={label} tabIndex={0}>
        <code>{code}</code>
      </pre>
      <button type="button" className="pg-button pg-code-copy" onClick={copy}>
        {copied ? "Copied" : "Copy"}
      </button>
      <span className="ds-visually-hidden" role="status">
        {copied ? "Code copied to clipboard" : ""}
      </span>
    </div>
  );
}

/** A captioned stage for before/after comparisons in glossary demos.
 *  `mark` adds ✓ / ✕ after the title; `off` turns optical corrections off inside. */
export function CompareCell({
  title,
  note,
  mark,
  off,
  zoom = 1.5,
  guides = true,
  children,
}: {
  title: string;
  note?: string;
  mark?: "good" | "bad";
  off?: boolean;
  zoom?: number;
  guides?: boolean;
  children: ReactNode;
}) {
  return (
    <figure className="pg-compare-cell" data-mark={mark}>
      <figcaption>
        <span className="pg-compare-title">{title}</span>
        {note && <span className="pg-muted">{note}</span>}
      </figcaption>
      <div className="pg-compare-stage">
        <div
          className={guides ? "pg-guides pg-compare-items" : "pg-compare-items"}
          style={{ zoom, ...(off ? ({ "--ds-optical": 0 } as CSSProperties) : {}) }}
        >
          {children}
        </div>
      </div>
    </figure>
  );
}

/** Inline link to a glossary term. Hover shows the one-line summary. */
export function TermLink({ id, children }: { id: string; children?: ReactNode }) {
  const term = getTerm(id);
  if (!term) return <>{children}</>;
  return (
    <a href={`#/glossary/${id}`} className="pg-term-link" title={term.summary}>
      {children ?? term.term}
    </a>
  );
}

/** "Concepts:" row of glossary chips, for the top of a component page. */
export function Concepts({ ids }: { ids: string[] }) {
  const terms = ids.map(getTerm).filter((t): t is NonNullable<typeof t> => Boolean(t));
  return (
    <div className="pg-concepts">
      <span className="pg-muted">Concepts</span>
      {terms.map((t) => (
        <a key={t.id} href={`#/glossary/${t.id}`} className="pg-chip" title={t.summary}>
          {t.term}
        </a>
      ))}
    </div>
  );
}

/** Previous / next links at the bottom of a series of pages. */
export function PrevNext({
  prev,
  next,
  label,
}: {
  prev?: { href: string; title: string };
  next?: { href: string; title: string };
  label: string;
}) {
  if (!prev && !next) return null;
  return (
    <nav className="pg-prevnext" aria-label={label}>
      {prev ? (
        <a href={prev.href} className="pg-prevnext-link" rel="prev">
          <span className="pg-muted">← Previous</span>
          <span>{prev.title}</span>
        </a>
      ) : (
        <span />
      )}
      {next && (
        <a href={next.href} className="pg-prevnext-link is-next" rel="next">
          <span className="pg-muted">Next →</span>
          <span>{next.title}</span>
        </a>
      )}
    </nav>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="pg-kbd">{children}</kbd>;
}

/** Props table for component API sections. */
export function ApiTable({ caption, rows }: { caption: string; rows: [string, string, string, string][] }) {
  return (
    <div className="pg-table-wrap pg-api">
      <table className="pg-table">
        <caption>
          <code>&lt;{caption}&gt;</code>
        </caption>
        <thead>
          <tr>
            <th scope="col">Prop</th>
            <th scope="col">Type</th>
            <th scope="col">Default</th>
            <th scope="col">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([prop, type, def, desc]) => (
            <tr key={prop}>
              <th scope="row">
                <code>{prop}</code>
              </th>
              <td>
                <code className="pg-code-muted">{type}</code>
              </td>
              <td className="pg-muted">{def}</td>
              <td className="pg-muted">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** One cell of a "States" gallery: a title, a short note, and the component in that state.
 *  `force` simulates hover/focus/active so every state can be seen side by side. */
export function StateCell({
  name,
  note,
  force,
  children,
}: {
  name: string;
  note: string;
  force?: "hover" | "focus" | "active";
  children: ReactNode;
}) {
  return (
    <figure className="pg-state-cell" data-force={force}>
      <figcaption>
        <span className="pg-compare-title">{name}</span>
        <span className="pg-muted">{note}</span>
      </figcaption>
      {children}
    </figure>
  );
}
