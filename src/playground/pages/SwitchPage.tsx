import { useState } from "react";
import { Switch as DsSwitch, type ChoiceSize } from "../../ds";
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

type Position = "end" | "start";

export function SwitchPage() {
  const [checked, setChecked] = useState(true);
  const [size, setSize] = useState<ChoiceSize>("md");
  const [position, setPosition] = useState<Position>("end");
  const [label, setLabel] = useState("Airplane mode");
  const [description, setDescription] = useState("Turns off Wi-Fi and Bluetooth.");
  const [disabled, setDisabled] = useState(false);

  const attrs = (pairs: [string, string | false][]) =>
    pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `\n  ${k}=${v}`)
      .join("");
  const code = `<Switch${attrs([
    ["label", `"${label}"`],
    ["description", Boolean(description) && `"${description}"`],
    ["checked", "{on}"],
    ["onCheckedChange", "{setOn}"],
    ["size", size !== "md" && `"${size}"`],
    ["labelPosition", position !== "end" && `"${position}"`],
    ["disabled", disabled && "{true}"],
  ])}
/>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Switch">
        <p>
          Turns a setting on or off right away. A native checkbox with <code>role="switch"</code>, drawn with CSS: the
          thumb grows and slides when it turns on.
        </p>
        <Concepts ids={["micro-interaction", "non-text-contrast", "hit-area", "forced-colors"]} />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage">
          <div className="pg-choice-preview">
            <DsSwitch
              label={label || undefined}
              aria-label={label ? undefined : "Unlabeled switch"}
              description={description || undefined}
              size={size}
              labelPosition={position}
              checked={checked}
              onCheckedChange={setChecked}
              disabled={disabled}
            />
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
          <Segmented<Position>
            label="Label position"
            value={position}
            onChange={setPosition}
            options={[
              { value: "end", label: "After" },
              { value: "start", label: "Before" },
            ]}
          />
          <TextField label="Label" value={label} onChange={setLabel} />
          <TextField label="Description" value={description} onChange={setDescription} />
          <Switch label="On" checked={checked} onChange={setChecked} />
          <Switch label="Disabled" checked={disabled} onChange={setDisabled} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section
        title="States"
        description="Every state side by side. Hover, focus and pressed are simulated here; press and hold one above to feel it."
      >
        <div className="pg-states">
          <StateCell name="Off" note="Small dark thumb, outlined track">
            <DsSwitch label="Wi-Fi" />
          </StateCell>
          <StateCell name="Hover" note="Edge darkens" force="hover">
            <DsSwitch label="Wi-Fi" />
          </StateCell>
          <StateCell name="Focus" note="Ring around the track" force="focus">
            <DsSwitch label="Wi-Fi" />
          </StateCell>
          <StateCell name="Pressed, off" note="Thumb stretches toward on" force="active">
            <DsSwitch label="Wi-Fi" />
          </StateCell>
          <StateCell name="On" note="Thumb grows and slides">
            <DsSwitch label="Wi-Fi" defaultChecked />
          </StateCell>
          <StateCell name="Pressed, on" note="Stretches toward off" force="active">
            <DsSwitch label="Wi-Fi" defaultChecked />
          </StateCell>
          <StateCell name="Disabled, off" note="Skipped by Tab">
            <DsSwitch label="Wi-Fi" disabled />
          </StateCell>
          <StateCell name="Disabled, on" note="Value still shown">
            <DsSwitch label="Wi-Fi" disabled defaultChecked />
          </StateCell>
          <StateCell name="With description" note="Linked with aria-describedby">
            <DsSwitch label="Wi-Fi" description="Join known networks." defaultChecked />
          </StateCell>
          <StateCell name="Label before" note="Settings rows">
            <DsSwitch label="Wi-Fi" labelPosition="start" defaultChecked />
          </StateCell>
          <StateCell name="No visible label" note="Needs aria-label">
            <DsSwitch aria-label="Wi-Fi" />
          </StateCell>
        </div>
      </Section>

      <Section title="Sizes" description="28×16, 36×20 and 44×24px tracks.">
        <div className="pg-choice-sizes">
          {(["sm", "md", "lg"] as const).map((s) => (
            <DsSwitch key={s} size={s} label={`Size ${s}`} defaultChecked />
          ))}
        </div>
      </Section>

      <Section title="Settings list">
        <div className="pg-choice-card pg-settings">
          <DsSwitch labelPosition="start" label="Push notifications" description="On this device only." defaultChecked />
          <DsSwitch labelPosition="start" label="Email digest" description="Every Monday morning." />
          <DsSwitch labelPosition="start" label="Sounds" defaultChecked />
        </div>
      </Section>

      <Section title="Switch or checkbox?">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Use a</th>
                <th scope="col">When</th>
                <th scope="col">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Switch</th>
                <td className="pg-muted">The change takes effect immediately.</td>
                <td className="pg-muted">Dark mode, Wi-Fi, notifications</td>
              </tr>
              <tr>
                <th scope="row">Checkbox</th>
                <td className="pg-muted">The choice waits for a Save or Submit button.</td>
                <td className="pg-muted">“I accept the terms”, filters before Apply</td>
              </tr>
              <tr>
                <th scope="row">Checkbox</th>
                <td className="pg-muted">Picking several items from a list.</td>
                <td className="pg-muted">Days of the week</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="Switch usage example"
          code={`const [on, setOn] = useState(false);

<Switch label="Dark mode" checked={on} onCheckedChange={setOn} />

<Switch label="Sounds" labelPosition="start" defaultChecked />`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Switch"
          rows={[
            ["label", "ReactNode", "—", "Visible label. Without one, pass aria-label."],
            ["description", "ReactNode", "—", "Hint under the label."],
            ["labelPosition", '"end" | "start"', '"end"', "Label after the switch, or before it with the switch at the far end."],
            ["size", '"sm" | "md" | "lg"', '"md"', "28×16 / 36×20 / 44×24px."],
            ["onCheckedChange", "(checked: boolean) => void", "—", "Called with the new state."],
            ["…props", "InputHTMLAttributes", "—", "checked, defaultChecked, name, disabled…"],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            <code>role="switch"</code> on a checkbox: screen readers say “on” / “off”, and Space toggles it.
          </li>
          <li>
            The off state doesn't rely on color: a dark thumb with 3:1{" "}
            <TermLink id="non-text-contrast">contrast</TermLink> sits at the start, a light one at the end when on.
          </li>
          <li>
            The label is clickable, and the track gets a 24px-tall <TermLink id="hit-area">hit area</TermLink>.
          </li>
          <li>
            In <TermLink id="forced-colors">forced colors</TermLink> the track and thumb use system colors.
          </li>
        </ul>
      </Section>
    </>
  );
}
