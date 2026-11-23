import { useState, type FormEvent } from "react";
import {
  Button,
  Field,
  Input,
  LinkIcon,
  MailIcon,
  PasswordInput,
  SearchIcon,
  Textarea,
  type InputSize,
} from "../../ds";
import {
  ApiTable,
  CodeBlock,
  Concepts,
  Kbd,
  PageHeader,
  Section,
  Segmented,
  Select,
  StateCell,
  Switch,
  TermLink,
  TextField,
} from "../ui";

type State = "default" | "error" | "disabled" | "readonly";
type Slot = "none" | "icon" | "text" | "kbd";
type EndSlot = "none" | "text" | "kbd" | "button";

export function TextFieldPage() {
  const [size, setSize] = useState<InputSize>("md");
  const [state, setState] = useState<State>("default");
  const [label, setLabel] = useState("Email");
  const [description, setDescription] = useState("We'll only use it for receipts.");
  const [placeholder, setPlaceholder] = useState("you@example.com");
  const [error, setError] = useState("Enter an email like name@example.com");
  const [start, setStart] = useState<Slot>("icon");
  const [end, setEnd] = useState<EndSlot>("none");
  const [required, setRequired] = useState(true);
  const [optional, setOptional] = useState(false);

  const startNode = { none: undefined, icon: <MailIcon />, text: "mailto:", kbd: <Kbd>⌘K</Kbd> }[start];
  const endNode = {
    none: undefined,
    text: "@acme.com",
    kbd: <Kbd>/</Kbd>,
    button: (
      <Button size="sm" variant="ghost">
        Verify
      </Button>
    ),
  }[end];

  const attrs = (pairs: [string, string | false][]) =>
    pairs
      .filter(([, v]) => v)
      .map(([k, v]) => `\n  ${k}=${v}`)
      .join("");
  const startCode = { none: false, icon: "{<MailIcon />}", text: '"mailto:"', kbd: "{<Kbd>⌘K</Kbd>}" }[start] as string | false;
  const endCode = { none: false, text: '"@acme.com"', kbd: "{<Kbd>/</Kbd>}", button: '{<Button size="sm" variant="ghost">Verify</Button>}' }[
    end
  ] as string | false;
  const code = `<Field${attrs([
    ["label", `"${label}"`],
    ["description", Boolean(description) && `"${description}"`],
    ["error", state === "error" && `"${error}"`],
    ["required", required && "{true}"],
    ["optional", optional && "{true}"],
    ["disabled", state === "disabled" && "{true}"],
  ])}
>
  <Input${attrs([
    ["type", '"email"'],
    ["size", size !== "md" && `"${size}"`],
    ["placeholder", Boolean(placeholder) && `"${placeholder}"`],
    ["start", startCode],
    ["end", endCode],
    ["readOnly", state === "readonly" && "{true}"],
  ])}
  />
</Field>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Text field">
        <p>
          <code>Field</code> wires a label, description and error to a control. <code>Input</code>,{" "}
          <code>PasswordInput</code> and <code>Textarea</code> are native elements inside a shared frame, so forms,
          autofill and browser validation keep working.
        </p>
        <Concepts
          ids={["accessible-name", "validation-timing", "non-text-contrast", "concentric-radius", "progressive-enhancement"]}
        />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage">
          <div className="pg-tf-preview">
            <Field
              key={`${state}-${required}`}
              label={label || "Label"}
              description={description || undefined}
              error={state === "error" ? error || "Error" : undefined}
              required={required}
              optional={optional}
              disabled={state === "disabled"}
            >
              <Input
                type="email"
                size={size}
                placeholder={placeholder || undefined}
                start={startNode}
                end={endNode}
                readOnly={state === "readonly"}
                defaultValue={state === "readonly" ? "ada@acme.com" : undefined}
              />
            </Field>
          </div>
        </div>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<State>
            label="State"
            value={state}
            onChange={setState}
            options={[
              { value: "default", label: "Default" },
              { value: "error", label: "Error" },
              { value: "disabled", label: "Disabled" },
              { value: "readonly", label: "Read-only" },
            ]}
          />
          <Segmented<InputSize>
            label="Size"
            value={size}
            onChange={setSize}
            options={[
              { value: "sm", label: "sm" },
              { value: "md", label: "md" },
              { value: "lg", label: "lg" },
            ]}
          />
          <Select<Slot>
            label="Start"
            value={start}
            onChange={setStart}
            options={[
              { value: "none", label: "None" },
              { value: "icon", label: "Icon" },
              { value: "text", label: "Text prefix" },
              { value: "kbd", label: "Kbd" },
            ]}
          />
          <Select<EndSlot>
            label="End"
            value={end}
            onChange={setEnd}
            options={[
              { value: "none", label: "None" },
              { value: "text", label: "Text suffix" },
              { value: "kbd", label: "Kbd" },
              { value: "button", label: "Button" },
            ]}
          />
          <TextField label="Label" value={label} onChange={setLabel} />
          <TextField label="Description" value={description} onChange={setDescription} />
          <TextField label="Placeholder" value={placeholder} onChange={setPlaceholder} />
          <TextField label="Error message" value={error} onChange={setError} />
          <Switch label="Required" checked={required} onChange={setRequired} />
          <Switch
            label="Optional"
            description="Shown only when not required"
            checked={optional}
            onChange={setOptional}
          />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section
        title="States"
        description="Every state side by side. Hover and focus are simulated here; try them for real in the playground above."
      >
        <div className="pg-states">
          <StateCell name="Default" note="Empty, placeholder, 3:1 edge">
            <Field label="Email">
              <Input type="email" placeholder="you@example.com" />
            </Field>
          </StateCell>
          <StateCell name="Hover" note="Border darkens" force="hover">
            <Field label="Email">
              <Input type="email" placeholder="you@example.com" />
            </Field>
          </StateCell>
          <StateCell name="Focus" note="Ring outside the border" force="focus">
            <Field label="Email">
              <Input type="email" placeholder="you@example.com" />
            </Field>
          </StateCell>
          <StateCell name="Filled" note="Value in text color">
            <Field label="Email">
              <Input type="email" defaultValue="ada@acme.com" />
            </Field>
          </StateCell>
          <StateCell name="With description" note="Hint before the control">
            <Field label="Email" description="We'll only use it for receipts.">
              <Input type="email" placeholder="you@example.com" />
            </Field>
          </StateCell>
          <StateCell name="Required" note="Asterisk + required attribute">
            <Field label="Email" required>
              <Input type="email" placeholder="you@example.com" />
            </Field>
          </StateCell>
          <StateCell name="Optional" note="When most fields are required">
            <Field label="Phone" optional>
              <Input type="tel" placeholder="+62 812 3456 7890" />
            </Field>
          </StateCell>
          <StateCell name="Error" note="Icon + message + aria-invalid">
            <Field label="Email" error="Enter an email like name@example.com">
              <Input type="email" defaultValue="ada@acme" />
            </Field>
          </StateCell>
          <StateCell name="Error + focus" note="The ring turns red too" force="focus">
            <Field label="Email" error="Enter an email like name@example.com">
              <Input type="email" defaultValue="ada@acme" />
            </Field>
          </StateCell>
          <StateCell name="Disabled" note="Not focusable, not submitted">
            <Field label="Email" disabled>
              <Input type="email" defaultValue="ada@acme.com" />
            </Field>
          </StateCell>
          <StateCell name="Read-only" note="Focusable, copyable, submitted">
            <Field label="Email">
              <Input type="email" defaultValue="ada@acme.com" readOnly />
            </Field>
          </StateCell>
          <StateCell name="Textarea" note="Same states, grows with text">
            <Field label="Bio" description="A sentence or two.">
              <Textarea minRows={2} placeholder="Designer in Jakarta…" />
            </Field>
          </StateCell>
        </div>
        <p className="pg-muted pg-note">
          Disabled vs read-only: a disabled field is skipped by Tab and left out of the form data. A read-only field can
          still be focused, selected and copied, and its value is submitted. Prefer read-only for values people need to
          see.
        </p>
      </Section>

      <Section title="Sizes" description="Same heights as Button, so they line up in a row.">
        <div className="pg-tf-sizes">
          {(["sm", "md", "lg"] as const).map((s) => (
            <div key={s} className="pg-tf-size-row">
              <span className="pg-muted pg-num">{s}</span>
              <Input size={s} aria-label={`Search (${s})`} placeholder="Search…" start={<SearchIcon />} />
              <Button size={s} variant="solid">
                Search
              </Button>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="Validation"
        description={
          <>
            Uses the browser's own constraints (<code>required</code>, <code>type="email"</code>,{" "}
            <code>minLength</code>, <code>pattern</code>). Field replaces the browser bubble with an inline message and
            uses <TermLink id="validation-timing">reward early, punish late</TermLink> timing.
          </>
        }
      >
        <SignupForm />
      </Section>

      <Section title="Examples">
        <div className="pg-tf-examples">
          <Input type="search" aria-label="Search docs" placeholder="Search docs" start={<SearchIcon />} end={<Kbd>/</Kbd>} />
          <Field label="Website">
            <Input type="url" placeholder="acme.com" start="https://" />
          </Field>
          <Field label="Price" description="Before tax.">
            <Input inputMode="decimal" placeholder="0.00" start="$" end="USD" />
          </Field>
          <Field label="Password" description="At least 8 characters.">
            <PasswordInput autoComplete="new-password" minLength={8} />
          </Field>
          <Field label="Invite link">
            <Input
              readOnly
              defaultValue="https://acme.com/join/8f2k"
              start={<LinkIcon />}
              end={
                <Button size="sm" variant="outline">
                  Copy
                </Button>
              }
            />
          </Field>
        </div>
        <p className="pg-muted pg-note">
          A button inside the box is inset by the same amount on every side, and its radius follows the{" "}
          <TermLink id="concentric-radius">nested radius rule</TermLink>: 8px box − 4px inset = 4px button.
        </p>
      </Section>

      <Section title="Textarea">
        <div className="pg-tf-examples">
          <Field label="Message" description="Grows as you type, up to 6 lines, then scrolls.">
            <Textarea minRows={2} maxRows={6} placeholder="Write something long…" />
          </Field>
          <Field label="Bio" optional>
            <Textarea maxLength={160} showCount minRows={3} defaultValue="Design engineer. Building a design system from scratch." />
          </Field>
          <Field label="Notes" description="autoResize={false}: fixed height, resizable by the user.">
            <Textarea autoResize={false} minRows={3} />
          </Field>
        </div>
        <ul className="pg-checklist pg-note">
          <li>
            Growing is CSS <code>field-sizing: content</code>, no JS measuring. Without support you get a fixed{" "}
            <code>minRows</code> height you can drag to resize (
            <TermLink id="progressive-enhancement">progressive enhancement</TermLink>).
          </li>
          <li>
            The counter is decorative for screen readers. They hear the limit as a description, and a polite “10
            characters left” only near the limit, after a pause in typing.
          </li>
        </ul>
        <p className="pg-muted pg-note">
          MDN:{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/field-sizing" target="_blank" rel="noreferrer">
            field-sizing
          </a>
          ,{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/HTML/Guides/Constraint_validation"
            target="_blank"
            rel="noreferrer"
          >
            Constraint validation
          </a>
          .
        </p>
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="Text field usage example"
          code={`<Field label="Email" description="We'll only use it for receipts." required>
  <Input type="email" name="email" autoComplete="email" start={<MailIcon />} />
</Field>

<Field label="Password" error={serverError}>
  <PasswordInput name="password" minLength={8} />
</Field>

<Field label="Bio" optional>
  <Textarea name="bio" maxLength={160} showCount />
</Field>

{/* No visible label? Give it an aria-label */}
<Input type="search" aria-label="Search docs" start={<SearchIcon />} />`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Field"
          rows={[
            ["label", "ReactNode", "—", "Visible label, linked with htmlFor."],
            ["description", "ReactNode", "—", "Hint above the control; added to aria-describedby."],
            ["error", "ReactNode", "—", "Your message. Overrides the browser's. Sets aria-invalid."],
            ["required", "boolean", "false", "Sets required on the control and shows an asterisk."],
            ["optional", "boolean", "false", "Shows “(optional)” after the label."],
            ["disabled", "boolean", "false", "Disables the control."],
            ["id", "string", "auto", "Id given to the control."],
          ]}
        />
        <ApiTable
          caption="Input"
          rows={[
            ["size", '"sm" | "md" | "lg"', '"md"', "28 / 32 / 40px, same as Button."],
            ["start", "ReactNode", "—", "Icon, prefix text or Kbd before the text."],
            ["end", "ReactNode", "—", "Icon, suffix, Kbd or a small Button after the text."],
            ["htmlSize", "number", "—", "The native size attribute."],
            ["…props", "InputHTMLAttributes", "—", "Everything else goes to the <input>."],
          ]}
        />
        <ApiTable
          caption="PasswordInput"
          rows={[
            ["defaultVisible", "boolean", "false", "Start with the password shown."],
            ["autoComplete", "string", '"current-password"', 'Use "new-password" on sign-up forms.'],
            ["…props", "InputProps", "—", "Same as Input, without type and end."],
          ]}
        />
        <ApiTable
          caption="Textarea"
          rows={[
            ["autoResize", "boolean", "true", "Grow with the content (field-sizing)."],
            ["minRows", "number", "3", "Height in lines when empty."],
            ["maxRows", "number", "10", "Stops growing here and scrolls."],
            ["showCount", "boolean", "false", "Shows used / maxLength. Needs maxLength."],
            ["size", '"sm" | "md" | "lg"', '"md"', "Padding and text size, matching Input."],
          ]}
        />
        <p className="pg-muted pg-note">
          Building another control? Call <code>useFieldControl(props)</code> and spread the result onto the native
          element: it adds the id, aria-describedby, aria-invalid and the validation handlers.
        </p>
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            Every field has a real <code>&lt;label&gt;</code>. A placeholder disappears as you type, so it's never the{" "}
            <TermLink id="accessible-name">accessible name</TermLink>.
          </li>
          <li>
            Description and error are linked with <code>aria-describedby</code>, so they're read when the field gets
            focus. The description sits above the control so it's read before typing.
          </li>
          <li>
            Errors use an icon and text, not only red, plus <code>aria-invalid</code>. On submit, focus moves to the
            first invalid field.
          </li>
          <li>
            The asterisk is hidden from screen readers; the <code>required</code> attribute already says “required”.
          </li>
          <li>
            The password toggle is a button with <code>aria-pressed</code> (“Show password, toggle button”), not a
            clickable icon.
          </li>
          <li>On touch devices text is never under 16px, so iOS doesn't zoom the page on focus.</li>
          <li>
            In <TermLink id="forced-colors">forced colors</TermLink> the frame is a real outline, since shadows
            disappear.
          </li>
        </ul>
      </Section>
    </>
  );
}

function SignupForm() {
  const [sent, setSent] = useState<string | null>(null);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); // only reached when every field is valid
    const data = new FormData(e.currentTarget);
    setSent(`Signed up as ${data.get("username")} (${data.get("email")}).`);
  };
  return (
    <form className="pg-tf-form" onSubmit={onSubmit} onReset={() => setSent(null)}>
      <Field label="Email" required>
        <Input type="email" name="email" autoComplete="email" placeholder="you@example.com" start={<MailIcon />} />
      </Field>
      <Field label="Username" description="3–16 lowercase letters or numbers." required>
        <Input name="username" autoComplete="username" minLength={3} maxLength={16} pattern="[a-z0-9]+" start="@" />
      </Field>
      <Field label="Password" description="At least 8 characters." required>
        <PasswordInput name="password" autoComplete="new-password" minLength={8} />
      </Field>
      <Field label="Bio" optional>
        <Textarea name="bio" maxLength={160} showCount minRows={2} />
      </Field>
      <div className="pg-tf-form-actions">
        <Button type="submit" variant="solid">
          Create account
        </Button>
        <Button type="reset" variant="ghost">
          Reset
        </Button>
        <span className="pg-muted" role="status">
          {sent}
        </span>
      </div>
    </form>
  );
}
