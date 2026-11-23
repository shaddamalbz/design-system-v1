import { useState, type FormEvent } from "react";
import { Button, Checkbox, CheckboxGroup, type ChoiceSize } from "../../ds";
import {
  ApiTable,
  CodeBlock,
  Concepts,
  PageHeader,
  Section,
  Segmented,
  StateCell,
  Switch,
  TermLink,
  TextField,
} from "../ui";

type Value = "unchecked" | "checked" | "indeterminate";

export function CheckboxPage() {
  const [value, setValue] = useState<Value>("checked");
  const [size, setSize] = useState<ChoiceSize>("md");
  const [label, setLabel] = useState("Email me about new releases");
  const [description, setDescription] = useState("About once a month. Unsubscribe anytime.");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const attrs = (pairs: [string, string | false][]) =>
    pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `\n  ${k}=${v}`)
      .join("");
  const code = `<Checkbox${attrs([
    ["label", `"${label}"`],
    ["description", Boolean(description) && `"${description}"`],
    ["checked", value === "checked" && "{checked}"],
    ["indeterminate", value === "indeterminate" && "{true}"],
    ["onCheckedChange", "{setChecked}"],
    ["size", size !== "md" && `"${size}"`],
    ["required", required && "{true}"],
    ["error", error && '"Check this to continue"'],
    ["disabled", disabled && "{true}"],
  ])}
/>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Checkbox">
        <p>
          Turns one option on or off, or picks several from a list. A native checkbox drawn with CSS, so Space, forms,{" "}
          <code>required</code> and the indeterminate state all work as usual.
        </p>
        <Concepts ids={["indeterminate-state", "non-text-contrast", "hit-area", "micro-interaction"]} />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage">
          <div className="pg-choice-preview">
            <Checkbox
              label={label || undefined}
              aria-label={label ? undefined : "Unlabeled checkbox"}
              description={description || undefined}
              size={size}
              checked={value === "checked"}
              indeterminate={value === "indeterminate"}
              onCheckedChange={(c) => setValue(c ? "checked" : "unchecked")}
              required={required}
              error={error ? "Check this to continue" : undefined}
              disabled={disabled}
            />
          </div>
        </div>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<Value>
            label="Value"
            value={value}
            onChange={setValue}
            options={[
              { value: "unchecked", label: "Off" },
              { value: "checked", label: "On" },
              { value: "indeterminate", label: "Mixed" },
            ]}
          />
          <Segmented<ChoiceSize>
            label="Size"
            value={size}
            onChange={setSize}
            options={[
              { value: "sm", label: "sm" },
              { value: "md", label: "md" },
              { value: "lg", label: "lg" },
            ]}
          />
          <TextField label="Label" value={label} onChange={setLabel} />
          <TextField label="Description" value={description} onChange={setDescription} />
          <Switch label="Required" checked={required} onChange={setRequired} />
          <Switch label="Error" checked={error} onChange={setError} />
          <Switch label="Disabled" checked={disabled} onChange={setDisabled} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section
        title="States"
        description="Every state side by side. Hover, focus and pressed are simulated here; try them for real above."
      >
        <div className="pg-states">
          <StateCell name="Unchecked" note="3:1 edge, visible on any surface">
            <Checkbox label="Remember me" />
          </StateCell>
          <StateCell name="Hover" note="Edge darkens" force="hover">
            <Checkbox label="Remember me" />
          </StateCell>
          <StateCell name="Focus" note="Ring outside the box" force="focus">
            <Checkbox label="Remember me" />
          </StateCell>
          <StateCell name="Pressed" note="Squeezes slightly" force="active">
            <Checkbox label="Remember me" />
          </StateCell>
          <StateCell name="Checked" note="Check draws in">
            <Checkbox label="Remember me" defaultChecked />
          </StateCell>
          <StateCell name="Indeterminate" note="Some, not all">
            <Checkbox label="Select all" indeterminate />
          </StateCell>
          <StateCell name="With description" note="Linked with aria-describedby">
            <Checkbox label="Weekly digest" description="A summary every Monday." />
          </StateCell>
          <StateCell name="Required" note="Asterisk + required attribute">
            <Checkbox label="I accept the terms" required />
          </StateCell>
          <StateCell name="Error" note="Icon + message + aria-invalid">
            <Checkbox label="I accept the terms" required error="Accept the terms to continue" />
          </StateCell>
          <StateCell name="Disabled" note="Skipped by Tab">
            <Checkbox label="Remember me" disabled />
          </StateCell>
          <StateCell name="Disabled, checked" note="Value still shown">
            <Checkbox label="Remember me" disabled defaultChecked />
          </StateCell>
          <StateCell name="No visible label" note="Needs aria-label (e.g. table rows)">
            <Checkbox aria-label="Select row 1" />
          </StateCell>
        </div>
      </Section>

      <Section title="Sizes" description="14, 16 and 20px boxes; the label text size follows.">
        <div className="pg-choice-sizes">
          {(["sm", "md", "lg"] as const).map((s) => (
            <Checkbox key={s} size={s} label={`Size ${s}`} defaultChecked />
          ))}
        </div>
      </Section>

      <Section title="Group">
        <CheckboxDemoGroup />
      </Section>

      <Section title="In a form" description="A required checkbox uses the browser's own check, shown as an inline message.">
        <TermsForm />
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="Checkbox usage example"
          code={`<Checkbox label="Remember me" name="remember" />

<Checkbox label="I accept the terms" required />

<CheckboxGroup legend="Notify me about" name="notify" defaultValue={["mentions"]}>
  <Checkbox value="mentions" label="Mentions" />
  <Checkbox value="replies" label="Replies" />
  <Checkbox value="releases" label="New releases" />
</CheckboxGroup>`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Checkbox"
          rows={[
            ["label", "ReactNode", "—", "Visible label. Without one, pass aria-label."],
            ["description", "ReactNode", "—", "Hint under the label."],
            ["error", "ReactNode", "—", "Message under the label; overrides the browser's."],
            ["indeterminate", "boolean", "false", "Shows a dash (“some selected”)."],
            ["size", '"sm" | "md" | "lg"', '"md"', "14 / 16 / 20px box."],
            ["onCheckedChange", "(checked: boolean) => void", "—", "Called with the new state."],
            ["…props", "InputHTMLAttributes", "—", "checked, defaultChecked, name, value, required, disabled…"],
          ]}
        />
        <ApiTable
          caption="CheckboxGroup"
          rows={[
            ["legend", "ReactNode", "—", "The group's label (a real <legend>)."],
            ["value / defaultValue", "string[]", "[]", "Checked values."],
            ["onValueChange", "(value: string[]) => void", "—", "Called with the new list."],
            ["name", "string", "—", "Shared name for form submission."],
            ["description, error", "ReactNode", "—", "For the whole group."],
            ["orientation", '"vertical" | "horizontal"', '"vertical"', "Stack or wrap in a row."],
            ["disabled", "boolean", "false", "Disables every checkbox (native fieldset)."],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            A real <code>&lt;input type="checkbox"&gt;</code>: Space toggles it, and screen readers say “checked”, “not
            checked” or “mixed”.
          </li>
          <li>
            Groups are a <code>&lt;fieldset&gt;</code> with a <code>&lt;legend&gt;</code>, read when focus enters the
            group.
          </li>
          <li>
            The box has a 3:1 edge (<TermLink id="non-text-contrast">non-text contrast</TermLink>) and an invisible
            24×24px <TermLink id="hit-area">hit area</TermLink>; clicking the label toggles it too.
          </li>
          <li>Errors use an icon and text, plus aria-invalid. Unchecking is instant; only checking animates.</li>
        </ul>
      </Section>
    </>
  );
}

function CheckboxDemoGroup() {
  const [value, setValue] = useState<string[]>(["mentions"]);
  return (
    <div className="pg-split">
      <div className="pg-choice-card">
        <CheckboxGroup
          legend="Notify me about"
          description="Pick as many as you like."
          name="notify"
          value={value}
          onValueChange={setValue}
        >
          <Checkbox value="mentions" label="Mentions" description="When someone @mentions you." />
          <Checkbox value="replies" label="Replies" description="Replies to your comments." />
          <Checkbox value="releases" label="New releases" />
        </CheckboxGroup>
        <p className="pg-muted pg-note">
          value: <code>{JSON.stringify(value)}</code>
        </p>
      </div>
      <div className="pg-choice-card">
        <CheckboxGroup legend="Days" orientation="horizontal" defaultValue={["mon", "wed"]} name="days">
          {["Mon", "Tue", "Wed", "Thu", "Fri"].map((d) => (
            <Checkbox key={d} value={d.toLowerCase()} label={d} />
          ))}
        </CheckboxGroup>
        <p className="pg-muted pg-note">
          Parent with a “select all”? See the <TermLink id="indeterminate-state">indeterminate state</TermLink> demo.
        </p>
      </div>
    </div>
  );
}

function TermsForm() {
  const [sent, setSent] = useState(false);
  return (
    <form
      className="pg-choice-card pg-choice-form"
      onSubmit={(e: FormEvent) => {
        e.preventDefault();
        setSent(true);
      }}
      onReset={() => setSent(false)}
    >
      <Checkbox name="terms" label="I accept the terms and privacy policy" required />
      <Checkbox name="news" label="Send me product news" description="Optional." />
      <div className="pg-tf-form-actions">
        <Button type="submit" variant="solid">
          Continue
        </Button>
        <Button type="reset" variant="ghost">
          Reset
        </Button>
        <span className="pg-muted" role="status">
          {sent ? "Submitted." : ""}
        </span>
      </div>
    </form>
  );
}
