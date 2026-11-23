import { useState } from "react";
import {
  ArrowRightIcon,
  Button,
  CheckIcon,
  ChevronDownIcon,
  DownloadIcon,
  HeartIcon,
  IconButton,
  PlayIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  TrashIcon,
  type IconComponent,
} from "../../ds";
import { CodeBlock, Concepts, PageHeader, Section, Segmented, Select, Switch, TermLink, TextField } from "../ui";

const ICONS = {
  Plus: PlusIcon,
  ArrowRight: ArrowRightIcon,
  Download: DownloadIcon,
  Check: CheckIcon,
  ChevronDown: ChevronDownIcon,
  Search: SearchIcon,
  Trash: TrashIcon,
  Play: PlayIcon,
  Send: SendIcon,
  Heart: HeartIcon,
} satisfies Record<string, IconComponent>;
type IconName = keyof typeof ICONS;

type Variant = "solid" | "outline" | "ghost";
type Size = "sm" | "md" | "lg";
type Content = "label" | "start" | "end" | "icon";

export function ButtonPage() {
  const [variant, setVariant] = useState<Variant>("outline");
  const [size, setSize] = useState<Size>("md");
  const [content, setContent] = useState<Content>("start");
  const [iconName, setIconName] = useState<IconName>("Plus");
  const [label, setLabel] = useState("New project");
  const [disabled, setDisabled] = useState(false);

  const Icon = ICONS[iconName];
  const preview =
    content === "icon" ? (
      <IconButton icon={<Icon />} aria-label={label || iconName} variant={variant} size={size} disabled={disabled} />
    ) : (
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        startIcon={content === "start" ? <Icon /> : undefined}
        endIcon={content === "end" ? <Icon /> : undefined}
      >
        {label}
      </Button>
    );

  const attrs = (pairs: [string, string | false][]) =>
    pairs
      .filter(([, v]) => v)
      .map(([k, v]) => ` ${k}=${v}`)
      .join("");
  const code =
    content === "icon"
      ? `<IconButton${attrs([
          ["icon", `{<${iconName}Icon />}`],
          ["aria-label", `"${label || iconName}"`],
          ["variant", variant !== "ghost" && `"${variant}"`],
          ["size", size !== "md" && `"${size}"`],
          ["disabled", disabled && "{true}"],
        ])} />`
      : `<Button${attrs([
          ["variant", variant !== "outline" && `"${variant}"`],
          ["size", size !== "md" && `"${size}"`],
          ["startIcon", content === "start" && `{<${iconName}Icon />}`],
          ["endIcon", content === "end" && `{<${iconName}Icon />}`],
          ["disabled", disabled && "{true}"],
        ])}>
  ${label}
</Button>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Button">
        <p>Triggers an action. Label only, icon + label, or icon only.</p>
        <Concepts ids={["optical-adjustment", "optical-centering", "text-box-trim", "hit-area"]} />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-stage">{preview}</div>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<Content>
            label="Content"
            value={content}
            onChange={setContent}
            options={[
              { value: "label", label: "Label" },
              { value: "start", label: "Start" },
              { value: "end", label: "End" },
              { value: "icon", label: "Icon only" },
            ]}
          />
          <Segmented<Variant>
            label="Variant"
            value={variant}
            onChange={setVariant}
            options={[
              { value: "solid", label: "Solid" },
              { value: "outline", label: "Outline" },
              { value: "ghost", label: "Ghost" },
            ]}
          />
          <Segmented<Size>
            label="Size"
            value={size}
            onChange={setSize}
            options={[
              { value: "sm", label: "sm" },
              { value: "md", label: "md" },
              { value: "lg", label: "lg" },
            ]}
          />
          <Select<IconName>
            label="Icon"
            value={iconName}
            onChange={setIconName}
            options={(Object.keys(ICONS) as IconName[]).map((name) => ({ value: name, label: name }))}
          />
          <TextField label={content === "icon" ? "aria-label" : "Label"} value={label} onChange={setLabel} />
          <Switch label="Disabled" checked={disabled} onChange={setDisabled} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section title="Variants">
        <div className="pg-variant-grid">
          {(["solid", "outline", "ghost"] as const).map((v) => (
            <div key={v} className="pg-variant-row">
              <span className="pg-variant-name">
                <code>{v}</code>
              </span>
              <div className="pg-variant-items">
                <Button variant={v}>Save</Button>
                <Button variant={v} startIcon={<DownloadIcon />}>
                  Export
                </Button>
                <Button variant={v} endIcon={<ChevronDownIcon />}>
                  Options
                </Button>
                <IconButton variant={v} icon={<PlayIcon />} aria-label="Play" />
                <Button variant={v} disabled>
                  Disabled
                </Button>
              </div>
            </div>
          ))}
        </div>
        <p className="pg-muted pg-note">
          Use one <code>solid</code> button per view for the main action.
        </p>
      </Section>

      <Section title="Sizes">
        <div className="pg-variant-grid">
          {(["sm", "md", "lg"] as const).map((s) => (
            <div key={s} className="pg-variant-row">
              <span className="pg-variant-name">
                <code>{s}</code>
              </span>
              <div className="pg-variant-items">
                <Button size={s} variant="solid">
                  Save
                </Button>
                <Button size={s} startIcon={<PlusIcon />}>
                  New project
                </Button>
                <IconButton size={s} variant="outline" icon={<SendIcon />} aria-label="Send" />
              </div>
            </div>
          ))}
        </div>
        <div className="pg-table-wrap pg-padding-table">
          <table className="pg-table">
            <thead>
              <tr>
                <th scope="col">Size</th>
                <th scope="col">Height</th>
                <th scope="col">Label padding</th>
                <th scope="col">
                  Icon-side padding (<TermLink id="optical-adjustment">why</TermLink>)
                </th>
                <th scope="col">Gap</th>
                <th scope="col">Icon</th>
                <th scope="col">Font</th>
              </tr>
            </thead>
            <tbody>
              {(
                [
                  ["sm", 28, 10, 8, 6, 14, 13],
                  ["md", 32, 12, 10, 6, 16, 14],
                  ["lg", 40, 16, 12, 8, 18, 16],
                ] as const
              ).map(([s, h, p, ip, g, i, f]) => (
                <tr key={s}>
                  <th scope="row">
                    <code>{s}</code>
                  </th>
                  <td className="pg-num">{h}</td>
                  <td className="pg-num">{p}</td>
                  <td className="pg-num">{ip}</td>
                  <td className="pg-num">{g}</td>
                  <td className="pg-num">{i}</td>
                  <td className="pg-num">{f}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="Usage">
        <CodeBlock
          code={`import { Button, IconButton, PlusIcon, PlayIcon } from "@/ds";

<Button variant="solid">Save</Button>
<Button startIcon={<PlusIcon />}>New project</Button>
<IconButton icon={<PlayIcon />} aria-label="Play" />`}
          label="Button usage"
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Button"
          rows={[
            ["variant", '"solid" | "outline" | "ghost"', '"outline"', "Visual weight."],
            ["size", '"sm" | "md" | "lg"', '"md"', "28 / 32 / 40px tall."],
            ["startIcon", "ReactNode", "—", "Icon before the label."],
            ["endIcon", "ReactNode", "—", "Icon after the label."],
          ]}
        />
        <ApiTable
          caption="IconButton"
          rows={[
            ["icon", "ReactNode", "—", "The icon."],
            ["aria-label", "string", "required", "Accessible name, also used as the tooltip."],
            ["variant", '"solid" | "outline" | "ghost"', '"ghost"', "Visual weight."],
            ["size", '"sm" | "md" | "lg"', '"md"', "Square: 28 / 32 / 40px."],
          ]}
        />
        <ApiTable
          caption="Icons"
          rows={[
            ["size", "number | string", '"1em"', "Inherits the button's icon size."],
            ["nudge", "[x, y] | false", "per icon", "Override or disable the optical offset (24-grid units)."],
          ]}
        />
        <p className="pg-muted pg-note">
          All parts accept native props and forward refs. <code>type</code> defaults to <code>"button"</code>. Set{" "}
          <code>--ds-optical: 0</code> on an ancestor to disable optical corrections.
        </p>
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist">
          <li>
            Native <code>&lt;button&gt;</code>; icons are <code>aria-hidden</code>.
          </li>
          <li>
            <code>IconButton</code> requires <code>aria-label</code> (also the tooltip).
          </li>
          <li>
            Smallest <TermLink id="hit-area">hit area</TermLink> is 28px.
          </li>
          <li>
            Supports <TermLink id="forced-colors" /> and <TermLink id="reduced-motion" />.
          </li>
        </ul>
      </Section>
    </>
  );
}

function ApiTable({ caption, rows }: { caption: string; rows: [string, string, string, string][] }) {
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
