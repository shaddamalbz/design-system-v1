import { useState, type FormEvent } from "react";
import { Button, Radio, RadioGroup, type ChoiceSize } from "../../ds";
import {
  ApiTable,
  CodeBlock,
  Concepts,
  Kbd,
  PageHeader,
  Section,
  Segmented,
  StateCell,
  Switch,
  TermLink,
} from "../ui";

type Orientation = "vertical" | "horizontal";

const PLANS = [
  { value: "free", label: "Free", description: "1 project, community support." },
  { value: "pro", label: "Pro", description: "Unlimited projects, email support." },
  { value: "team", label: "Team", description: "Everything in Pro, plus roles and SSO." },
];

export function RadioPage() {
  const [value, setValue] = useState("pro");
  const [size, setSize] = useState<ChoiceSize>("md");
  const [orientation, setOrientation] = useState<Orientation>("vertical");
  const [descriptions, setDescriptions] = useState(true);
  const [required, setRequired] = useState(false);
  const [error, setError] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [disableOne, setDisableOne] = useState(false);

  const attrs = (pairs: [string, string | false][]) =>
    pairs
      .filter(([, v]) => v)
      .map(([k, v]) => ` ${k}=${v}`)
      .join("");
  const code = `<RadioGroup legend="Plan"${attrs([
    ["value", "{plan}"],
    ["onValueChange", "{setPlan}"],
    ["size", size !== "md" && `"${size}"`],
    ["orientation", orientation !== "vertical" && `"${orientation}"`],
    ["required", required && "{true}"],
    ["error", error && '"Pick a plan to continue"'],
    ["disabled", disabled && "{true}"],
  ])}>
${PLANS.map(
  (p) =>
    `  <Radio value="${p.value}" label="${p.label}"${descriptions ? ` description="${p.description}"` : ""}${
      disableOne && p.value === "team" ? " disabled" : ""
    } />`,
).join("\n")}
</RadioGroup>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Radio group">
        <p>
          Picks exactly one option from a short list. Native radios sharing a name, so the browser handles the keyboard:
          arrow keys move and select.
        </p>
        <Concepts ids={["roving-tabindex", "non-text-contrast", "hit-area", "micro-interaction"]} />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage">
          <div className="pg-choice-preview">
            <RadioGroup
              legend="Plan"
              value={value}
              onValueChange={setValue}
              size={size}
              orientation={orientation}
              required={required}
              error={error ? "Pick a plan to continue" : undefined}
              disabled={disabled}
            >
              {PLANS.map((p) => (
                <Radio
                  key={p.value}
                  value={p.value}
                  label={p.label}
                  description={descriptions ? p.description : undefined}
                  disabled={disableOne && p.value === "team"}
                />
              ))}
            </RadioGroup>
          </div>
        </div>
        <div className="pg-controls" role="group" aria-label="Preview controls">
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
          <Segmented<Orientation>
            label="Orientation"
            value={orientation}
            onChange={setOrientation}
            options={[
              { value: "vertical", label: "Vertical" },
              { value: "horizontal", label: "Horizontal" },
            ]}
          />
          <Switch label="Descriptions" checked={descriptions} onChange={setDescriptions} />
          <Switch label="Required" checked={required} onChange={setRequired} />
          <Switch label="Error" checked={error} onChange={setError} />
          <Switch label="Disable group" checked={disabled} onChange={setDisabled} />
          <Switch label="Disable “Team”" checked={disableOne} onChange={setDisableOne} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section
        title="States"
        description="Every state side by side. Hover, focus and pressed are simulated here; try them for real above."
      >
        <div className="pg-states">
          <StateCell name="Unselected" note="3:1 edge">
            <Radio value="a" label="Monthly" name="st-1" />
          </StateCell>
          <StateCell name="Hover" note="Edge darkens" force="hover">
            <Radio value="a" label="Monthly" name="st-2" />
          </StateCell>
          <StateCell name="Focus" note="Ring outside the circle" force="focus">
            <Radio value="a" label="Monthly" name="st-3" />
          </StateCell>
          <StateCell name="Pressed" note="Squeezes slightly" force="active">
            <Radio value="a" label="Monthly" name="st-4" />
          </StateCell>
          <StateCell name="Selected" note="Ring closes in to a dot">
            <Radio value="a" label="Monthly" name="st-5" defaultChecked />
          </StateCell>
          <StateCell name="With description" note="Linked with aria-describedby">
            <Radio value="a" label="Yearly" description="2 months free." name="st-6" defaultChecked />
          </StateCell>
          <StateCell name="Disabled" note="Skipped by arrow keys">
            <Radio value="a" label="Lifetime" name="st-7" disabled />
          </StateCell>
          <StateCell name="Disabled, selected" note="Value still shown">
            <Radio value="a" label="Monthly" name="st-8" disabled defaultChecked />
          </StateCell>
          <StateCell name="Error" note="On the group: message under it">
            <RadioGroup legend="Billing" error="Pick a billing period" size="sm">
              <Radio value="m" label="Monthly" />
              <Radio value="y" label="Yearly" />
            </RadioGroup>
          </StateCell>
          <StateCell name="Required" note="Asterisk on the legend">
            <RadioGroup legend="Billing" required size="sm">
              <Radio value="m" label="Monthly" />
              <Radio value="y" label="Yearly" />
            </RadioGroup>
          </StateCell>
        </div>
      </Section>

      <Section title="Keyboard" description="All native, nothing scripted.">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Does</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Kbd>Tab</Kbd>
                </td>
                <td className="pg-muted">Enters the group on the selected radio (or the first), then leaves it.</td>
              </tr>
              <tr>
                <td>
                  <Kbd>↓</Kbd> <Kbd>→</Kbd> / <Kbd>↑</Kbd> <Kbd>←</Kbd>
                </td>
                <td className="pg-muted">Moves to the next / previous radio and selects it, wrapping around.</td>
              </tr>
              <tr>
                <td>
                  <Kbd>Space</Kbd>
                </td>
                <td className="pg-muted">Selects the focused radio if nothing is selected yet.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pg-muted pg-note">
          One Tab stop per group, arrows inside: the same pattern as{" "}
          <TermLink id="roving-tabindex">roving tabindex</TermLink>, built into the browser for radios.
        </p>
      </Section>

      <Section title="In a form" description="required on the group: submitting without a choice shows the browser's message inline.">
        <PlanForm />
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="Radio group usage example"
          code={`<RadioGroup legend="Plan" name="plan" defaultValue="pro" required>
  <Radio value="free" label="Free" />
  <Radio value="pro" label="Pro" description="Unlimited projects." />
  <Radio value="team" label="Team" />
</RadioGroup>`}
        />
        <p className="pg-muted pg-note">
          More than about 7 options, or not enough room? Use a Select instead. Only two options that mean on/off? Use a
          Checkbox or Switch.
        </p>
      </Section>

      <Section title="API">
        <ApiTable
          caption="RadioGroup"
          rows={[
            ["legend", "ReactNode", "—", "The group's label (a real <legend>)."],
            ["value / defaultValue", "string", "—", "The selected value."],
            ["onValueChange", "(value: string) => void", "—", "Called with the new value."],
            ["name", "string", "auto", "Shared name; generated if omitted."],
            ["required", "boolean", "false", "One option must be picked to submit."],
            ["description, error", "ReactNode", "—", "For the whole group."],
            ["orientation", '"vertical" | "horizontal"', '"vertical"', "Stack or wrap in a row."],
            ["size", '"sm" | "md" | "lg"', '"md"', "14 / 16 / 20px circles."],
            ["disabled", "boolean", "false", "Disables every radio (native fieldset)."],
          ]}
        />
        <ApiTable
          caption="Radio"
          rows={[
            ["value", "string", "—", "Required. Submitted when selected."],
            ["label", "ReactNode", "—", "Visible label."],
            ["description", "ReactNode", "—", "Hint under the label."],
            ["disabled", "boolean", "false", "Disables this option only."],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            Native radios in a <code>&lt;fieldset&gt;</code> with a <code>&lt;legend&gt;</code>: screen readers announce
            “Plan, group” and “Pro, radio button, 2 of 3”.
          </li>
          <li>One Tab stop for the whole group; arrow keys move and select.</li>
          <li>
            3:1 edge (<TermLink id="non-text-contrast">non-text contrast</TermLink>) and a 24×24px{" "}
            <TermLink id="hit-area">hit area</TermLink>; the label is clickable too.
          </li>
          <li>The group error is linked to the fieldset, and every radio gets aria-invalid.</li>
        </ul>
      </Section>
    </>
  );
}

function PlanForm() {
  const [sent, setSent] = useState<string | null>(null);
  return (
    <form
      className="pg-choice-card pg-choice-form"
      onSubmit={(e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSent(String(new FormData(e.currentTarget).get("plan")));
      }}
      onReset={() => setSent(null)}
    >
      <RadioGroup legend="Plan" name="plan" required description="You can change it later.">
        {PLANS.map((p) => (
          <Radio key={p.value} value={p.value} label={p.label} description={p.description} />
        ))}
      </RadioGroup>
      <div className="pg-tf-form-actions">
        <Button type="submit" variant="solid">
          Continue
        </Button>
        <Button type="reset" variant="ghost">
          Reset
        </Button>
        <span className="pg-muted" role="status">
          {sent ? `Picked “${sent}”.` : ""}
        </span>
      </div>
    </form>
  );
}
