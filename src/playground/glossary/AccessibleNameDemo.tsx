import { useState } from "react";
import { Field, Input } from "../../ds";
import { Segmented } from "../ui";

type Variant = "label" | "placeholder" | "aria" | "none";

const VARIANTS: Record<
  Variant,
  { code: string; hears: string; checks: [string, boolean | "partly"][]; note: string }
> = {
  label: {
    code: `<label for="email">Email</label>\n<input id="email">`,
    hears: "“Email, edit text”",
    checks: [
      ["Screen readers get a name", true],
      ["Everyone sees the label", true],
      ["Still visible while typing", true],
      ["Clicking the label focuses it", true],
    ],
    note: "The default. Works for everyone, every time.",
  },
  placeholder: {
    code: `<input placeholder="Email">`,
    hears: "“Email, edit text” (as a fallback, not everywhere)",
    checks: [
      ["Screen readers get a name", "partly"],
      ["Everyone sees the label", true],
      ["Still visible while typing", false],
      ["Clicking the label focuses it", false],
    ],
    note: "Type something: the only label disappears. Then try to remember what the field was for.",
  },
  aria: {
    code: `<input aria-label="Email">`,
    hears: "“Email, edit text”",
    checks: [
      ["Screen readers get a name", true],
      ["Everyone sees the label", false],
      ["Still visible while typing", false],
      ["Clicking the label focuses it", false],
    ],
    note: "Fine when the purpose is obvious from what's around it, like a search box with a search icon.",
  },
  none: {
    code: `<input>`,
    hears: "“Edit text”",
    checks: [
      ["Screen readers get a name", false],
      ["Everyone sees the label", false],
      ["Still visible while typing", false],
      ["Clicking the label focuses it", false],
    ],
    note: "A screen reader user hears that there's a text box, but not what to type.",
  },
};

export function AccessibleNameDemo() {
  const [variant, setVariant] = useState<Variant>("placeholder");
  const v = VARIANTS[variant];

  const field =
    variant === "label" ? (
      <Field label="Email">
        <Input placeholder="you@example.com" />
      </Field>
    ) : (
      <Input
        placeholder={variant === "placeholder" ? "Email" : undefined}
        aria-label={variant === "aria" ? "Email" : undefined}
      />
    );

  return (
    <div className="pg-demo">
      <Segmented<Variant>
        label="How the field is named"
        value={variant}
        onChange={setVariant}
        options={[
          { value: "label", label: "<label>" },
          { value: "placeholder", label: "Placeholder only" },
          { value: "aria", label: "aria-label" },
          { value: "none", label: "Nothing" },
        ]}
      />
      <div className="gd-an">
        <div className="gd-stage gd-an-stage">
          <div className="gd-an-field" key={variant}>
            {field}
          </div>
          <div className="gd-an-hears">
            <span className="pg-muted">Screen reader says</span>
            <strong>{v.hears}</strong>
          </div>
        </div>
        <div className="gd-an-side">
          <pre className="gd-an-code">
            <code>{v.code}</code>
          </pre>
          <ul className="gd-an-checks">
            {v.checks.map(([label, ok]) => (
              <li key={label} data-ok={ok === true ? "yes" : ok === "partly" ? "partly" : "no"}>
                {label}
                {ok === "partly" && <span className="pg-muted"> (unreliable)</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="gd-stage-note">{v.note}</p>
    </div>
  );
}
