import { useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Field,
  Input,
  Textarea,
  TrashIcon,
  type DialogSize,
} from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Section, Segmented, Switch, TermLink, TextField } from "../ui";

type Role = "dialog" | "alertdialog";
type Length = "short" | "long";

const PARAGRAPHS = [
  "These terms cover how you use the workspace, what we store, and how long we keep it. Read them once; we'll tell you when they change.",
  "Your files stay yours. We keep a copy only to sync it between your devices and to restore it if you delete something by mistake.",
  "Deleted items stay in the trash for 30 days, then they're gone for good. Admins can shorten that window, never extend it.",
  "We send email only about your account: sign-in links, invoices, and changes to these terms. No newsletters unless you opt in.",
  "You can export everything at any time as plain files. Leaving should be as easy as arriving.",
  "If something here is unclear, reply to any of our emails and a person will answer.",
];

export function DialogPage() {
  const [size, setSize] = useState<DialogSize>("md");
  const [role, setRole] = useState<Role>("dialog");
  const [length, setLength] = useState<Length>("short");
  const [title, setTitle] = useState("Rename project");
  const [description, setDescription] = useState("The new name is visible to everyone on the team.");
  const [closeButton, setCloseButton] = useState(true);
  const [backdrop, setBackdrop] = useState(true);
  const [open, setOpen] = useState(false);

  const isAlert = role === "alertdialog";
  // The alert role flips both defaults; only write props that differ from them
  const closeDefault = !isAlert;
  const attrs = [
    size !== "md" && `size="${size}"`,
    isAlert && `role="alertdialog"`,
    closeButton !== closeDefault && `closeButton={${closeButton}}`,
    backdrop !== closeDefault && `closeOnBackdropClick={${backdrop}}`,
  ].filter(Boolean);
  const code = `<Dialog>
  <DialogTrigger>
    <Button>Open dialog</Button>
  </DialogTrigger>
  <DialogContent${attrs.map((a) => ` ${a}`).join("")}>
    <DialogHeader>
      <DialogTitle>${title}</DialogTitle>${description ? `\n      <DialogDescription>${description}</DialogDescription>` : ""}
    </DialogHeader>
    <DialogBody>…</DialogBody>
    <DialogFooter>
      <DialogClose>
        <Button>Cancel</Button>
      </DialogClose>
      <Button variant="solid">Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Dialog">
        <p>
          A modal window on the native <code>&lt;dialog&gt;</code> element. The browser traps focus, makes the page
          behind it inert and closes it on <Kbd>Esc</Kbd>; CSS animates it in and out.
        </p>
        <Concepts ids={["progressive-enhancement", "scroll-driven-animation", "micro-interaction", "reduced-motion"]} />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger>
              <Button variant="solid">Open dialog</Button>
            </DialogTrigger>
            <DialogContent size={size} role={role} closeButton={closeButton} closeOnBackdropClick={backdrop}>
              <DialogHeader>
                <DialogTitle>{title || "Untitled"}</DialogTitle>
                {description && <DialogDescription>{description}</DialogDescription>}
              </DialogHeader>
              <DialogBody>
                {length === "short" ? (
                  <Field label="Project name">
                    <Input defaultValue="Northwind redesign" data-autofocus />
                  </Field>
                ) : (
                  <div className="pg-dialog-prose">
                    {[...PARAGRAPHS, ...PARAGRAPHS].map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                )}
              </DialogBody>
              <DialogFooter>
                <DialogClose>
                  <Button>Cancel</Button>
                </DialogClose>
                <DialogClose>
                  <Button variant="solid">Save</Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
        <p className="pg-muted pg-note">
          Try <Kbd>Esc</Kbd>, a click on the backdrop, and <Kbd>Tab</Kbd> past the last button: focus wraps inside the
          dialog and comes back to the trigger when it closes. Pick <em>Long</em> content and scroll: the header and
          footer dividers appear only while there's more to scroll that way.
        </p>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<DialogSize>
            label="Size"
            value={size}
            onChange={setSize}
            options={[
              { value: "sm", label: "sm" },
              { value: "md", label: "md" },
              { value: "lg", label: "lg" },
            ]}
          />
          <Segmented<Role>
            label="Role"
            value={role}
            onChange={(r) => {
              setRole(r);
              // Follow the component's defaults for the new role
              setCloseButton(r === "dialog");
              setBackdrop(r === "dialog");
            }}
            options={[
              { value: "dialog", label: "Dialog" },
              { value: "alertdialog", label: "Alert" },
            ]}
          />
          <Segmented<Length>
            label="Content"
            value={length}
            onChange={setLength}
            options={[
              { value: "short", label: "Short" },
              { value: "long", label: "Long" },
            ]}
          />
          <TextField label="Title" value={title} onChange={setTitle} />
          <TextField label="Description" value={description} onChange={setDescription} />
          <Switch label="× button" checked={closeButton} onChange={setCloseButton} />
          <Switch label="Backdrop click closes" checked={backdrop} onChange={setBackdrop} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section title="Examples">
        <div className="pg-tt-examples">
          <DeleteExample />
          <EditProfileExample />
          <TermsExample />
        </div>
      </Section>

      <Section title="Dialog or alert dialog?">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Role</th>
                <th scope="col">When</th>
                <th scope="col">Defaults</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <code>dialog</code>
                </th>
                <td className="pg-muted">A task in a window: a form, details, settings.</td>
                <td className="pg-muted">× button, backdrop click closes, focus goes to the first field.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>alertdialog</code>
                </th>
                <td className="pg-muted">An interruption that needs an answer: delete, discard, sign out.</td>
                <td className="pg-muted">
                  No ×, backdrop click bumps instead of closing, focus goes to Cancel so a stray <Kbd>Enter</Kbd>{" "}
                  can't destroy anything.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="How it works">
        <ul className="pg-checklist">
          <li>
            <code>showModal()</code> puts the dialog in the <strong>top layer</strong>: above everything, no{" "}
            <code>z-index</code>, no portal, and a <code>transform</code> on an ancestor can't trap it.
          </li>
          <li>
            The rest of the page becomes <strong>inert</strong>: focus can't leave, screen readers can't wander out.
            No focus-trap script.
          </li>
          <li>
            Enter and exit are CSS transitions. <code>@starting-style</code> gives the first frame;{" "}
            <code>transition-behavior: allow-discrete</code> on <code>display</code> and <code>overlay</code> keeps it
            visible until the exit has played. Exit is shorter than enter.
          </li>
          <li>
            The page stops scrolling with <code>html:has(.ds-dialog:modal) {"{ overflow: hidden }"}</code>, and{" "}
            <code>scrollbar-gutter: stable</code> keeps it from shifting sideways.
          </li>
          <li>
            Header and footer dividers follow the body's <TermLink id="scroll-driven-animation">scroll timeline</TermLink>
            , shared with <code>timeline-scope</code> since they're siblings of the scroller.
          </li>
          <li>
            A backdrop click counts only when both <code>pointerdown</code> and <code>click</code> land outside, so a
            text selection dragged out of the dialog doesn't close it.
          </li>
        </ul>
        <CodeBlock
          label="The core CSS"
          code={`.ds-dialog {
  opacity: 0;
  scale: 0.96;
  transition: opacity .28s, scale .28s,
    display .28s allow-discrete, overlay .28s allow-discrete;
}
.ds-dialog[open] { display: flex; opacity: 1; scale: 1; }
@starting-style {
  .ds-dialog[open] { opacity: 0; scale: 0.96; }
}`}
        />
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="Dialog usage example"
          code={`// Uncontrolled: the trigger opens it, DialogClose / Esc / backdrop close it
<Dialog>
  <DialogTrigger><Button>Edit</Button></DialogTrigger>
  <DialogContent>…</DialogContent>
</Dialog>

// Controlled, closing after an async save
const [open, setOpen] = useState(false);
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <form method="dialog" onSubmit={async (e) => {
      e.preventDefault();
      await save();
      setOpen(false);
    }}>
      <DialogBody>…</DialogBody>
      <DialogFooter>
        <Button type="submit" variant="solid">Save</Button>
      </DialogFooter>
    </form>
  </DialogContent>
</Dialog>

// Pick the element that gets focus on open
<Input data-autofocus />`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Dialog"
          rows={[
            ["open", "boolean", "—", "Open state (controlled)."],
            ["defaultOpen", "boolean", "false", "Initial state (uncontrolled)."],
            ["onOpenChange", "(open: boolean) => void", "—", "Trigger, Esc, backdrop, DialogClose, or a method=\"dialog\" form."],
          ]}
        />
        <ApiTable
          caption="DialogContent"
          rows={[
            ["size", '"sm" | "md" | "lg"', '"md"', "Max width: 400 / 520 / 720px. Never wider than the viewport minus 16px a side."],
            ["role", '"dialog" | "alertdialog"', '"dialog"', "Alert dialog flips the two defaults below and focuses the first DialogClose."],
            ["closeButton", "boolean", "true / false for alert", "The × in the corner."],
            ["closeOnBackdropClick", "boolean", "true / false for alert", "When false, a backdrop click bumps the dialog instead."],
            ["onCancel", "(e) => void", "—", "Esc pressed. Call e.preventDefault() to keep it open."],
          ]}
        />
        <ApiTable
          caption="DialogTrigger / DialogClose"
          rows={[
            ["children", "ReactElement", "—", "One button. Gets the click handler; preventDefault in its own onClick to cancel."],
          ]}
        />
        <ApiTable
          caption="DialogTitle"
          rows={[["as", '"h1" | "h2" | "h3"', '"h2"', "Heading level. Linked with aria-labelledby."]]}
        />
        <p className="pg-muted pg-note">
          <code>DialogHeader</code>, <code>DialogDescription</code> (linked with <code>aria-describedby</code>),{" "}
          <code>DialogBody</code> (scrolls) and <code>DialogFooter</code> take regular HTML attributes.
        </p>
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            Native modal <code>&lt;dialog&gt;</code>: focus is trapped and the page behind is inert, in every modern
            browser, without a script.
          </li>
          <li>
            Named by its title (<code>aria-labelledby</code>) and described by its description when there is one.
          </li>
          <li>
            <Kbd>Esc</Kbd> closes it. Focus returns to the element that opened it.
          </li>
          <li>
            Initial focus: <code>data-autofocus</code> if set, Cancel in an alert dialog, otherwise the first focusable
            element. The × is last in the DOM so it doesn't steal that.
          </li>
          <li>
            Motion respects <TermLink id="reduced-motion">reduced motion</TermLink>: the durations drop to 0 and the
            bump is skipped.
          </li>
        </ul>
      </Section>
    </>
  );
}

function DeleteExample() {
  return (
    <Dialog>
      <DialogTrigger>
        <Button startIcon={<TrashIcon />}>Delete project</Button>
      </DialogTrigger>
      <DialogContent role="alertdialog" size="sm">
        <DialogHeader>
          <DialogTitle>Delete “Northwind redesign”?</DialogTitle>
          <DialogDescription>
            Its 24 files go to the trash for 30 days. After that they can't be recovered.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>
            <Button>Cancel</Button>
          </DialogClose>
          <DialogClose>
            <Button variant="solid">Delete project</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditProfileExample() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Ada Lovelace");
  const [saving, setSaving] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && setOpen(next)}>
      <DialogTrigger>
        <Button>Edit profile</Button>
      </DialogTrigger>
      <DialogContent>
        <form
          method="dialog"
          onSubmit={(e) => {
            // Keep it open while "saving", then close from state
            e.preventDefault();
            setSaving(true);
            setTimeout(() => {
              setSaving(false);
              setOpen(false);
            }, 700);
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Your name and bio are visible to your team.</DialogDescription>
          </DialogHeader>
          <DialogBody className="pg-dialog-form">
            <Field label="Name" required>
              <Input value={name} onChange={(e) => setName(e.target.value)} data-autofocus />
            </Field>
            <Field label="Bio" optional>
              <Textarea maxRows={5} placeholder="A line or two about you" />
            </Field>
          </DialogBody>
          <DialogFooter>
            <DialogClose>
              <Button disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" variant="solid" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TermsExample() {
  return (
    <Dialog>
      <DialogTrigger>
        <Button>Read the terms</Button>
      </DialogTrigger>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Terms of use</DialogTitle>
          <DialogDescription>Last updated November 2026.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="pg-dialog-prose">
            {[...PARAGRAPHS, ...PARAGRAPHS, ...PARAGRAPHS].map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </DialogBody>
        <DialogFooter>
          <DialogClose>
            <Button variant="solid">Got it</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
