import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "../../ds";
import { CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch, TermLink } from "../ui";

const ITEMS = [
  { value: "overview", label: "Overview", body: "The redesign ships in June." },
  { value: "activity", label: "Activity", body: "12 updates this week. Last change 2 hours ago." },
  { value: "members", label: "Members", body: "8 people have access to this project." },
  { value: "files", label: "Files", body: "34 files, 1.2 GB used." },
  { value: "reports", label: "Reports", body: "The monthly report is ready to export." },
  { value: "settings", label: "Settings", body: "General project preferences." },
  { value: "integrations", label: "Integrations", body: "Connected to GitHub and Slack." },
  { value: "billing", label: "Billing", body: "Next invoice on December 1." },
  { value: "usage", label: "Usage", body: "68% of the monthly quota used." },
  { value: "security", label: "Security", body: "Two-factor auth is required for all members." },
  { value: "audit-log", label: "Audit log", body: "Every change, who made it, and when." },
  { value: "webhooks", label: "Webhooks", body: "3 endpoints are receiving events." },
];

type Size = "sm" | "md";
type Variant = "contained" | "plain";
type Preview = "current" | "both";

export function TabsPage() {
  const [width, setWidth] = useState(380);
  const [count, setCount] = useState(7);
  const [size, setSize] = useState<Size>("md");
  const [variant, setVariant] = useState<Variant>("contained");
  const [withDisabled, setWithDisabled] = useState(false);
  const [preview, setPreview] = useState<Preview>("current");
  const [value, setValue] = useState("overview");

  const items = ITEMS.slice(0, count);

  const demo = (
    <Tabs value={value} onValueChange={setValue} size={size} variant={variant}>
      <TabList aria-label="Project">
        {items.map((item) => (
          <Tab key={item.value} value={item.value} disabled={withDisabled && item.value === "members"}>
            {item.label}
          </Tab>
        ))}
      </TabList>
      {items.map((item) => (
        <TabPanel key={item.value} value={item.value}>
          {item.body}
        </TabPanel>
      ))}
    </Tabs>
  );

  const props = [size !== "md" && `size="${size}"`, variant !== "contained" && `variant="${variant}"`]
    .filter(Boolean)
    .join(" ");
  const code = `import { Tabs, TabList, Tab, TabPanel } from "@/ds";

<Tabs defaultValue="overview"${props ? " " + props : ""}>
  <TabList aria-label="Project">
${items
  .map(
    (i) =>
      `    <Tab value="${i.value}"${withDisabled && i.value === "members" ? " disabled" : ""}>${i.label}</Tab>`,
  )
  .join("\n")}
  </TabList>
${items.map((i) => `  <TabPanel value="${i.value}">…</TabPanel>`).join("\n")}
</Tabs>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Tabs">
        <p>
          Tabs that scroll when they don't fit, after{" "}
          <a href="https://x.com/diegohaz/status/2122396486835020227" target="_blank" rel="noreferrer">
            Haz's scrollable tabs spec
          </a>
          .
        </p>
        <Concepts ids={["roving-tabindex", "scroll-driven-animation", "scroll-padding", "progressive-enhancement", "hit-area"]} />
      </PageHeader>

      <div className="pg-playground">
        {preview === "current" ? (
          <div className="pg-stage">
            <div className="pg-frame" style={{ width }}>
              {demo}
            </div>
          </div>
        ) : (
          <div className="pg-split">
            {(["light", "dark"] as const).map((theme) => (
              <div key={theme} data-theme={theme} className="pg-stage">
                <span className="pg-stage-label">{theme === "light" ? "Light" : "Dark"}</span>
                <div className="pg-frame" style={{ width }}>
                  {demo}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Range label="Container width" value={width} min={220} max={720} step={10} unit="px" onChange={setWidth} />
          <Range label="Number of tabs" value={count} min={2} max={ITEMS.length} onChange={setCount} />
          <Segmented<Size>
            label="Size"
            value={size}
            onChange={setSize}
            options={[
              { value: "sm", label: "sm" },
              { value: "md", label: "md" },
            ]}
          />
          <Segmented<Variant>
            label="Variant"
            value={variant}
            onChange={setVariant}
            options={[
              { value: "contained", label: "Contained" },
              { value: "plain", label: "Plain" },
            ]}
          />
          <Segmented<Preview>
            label="Preview"
            value={preview}
            onChange={setPreview}
            options={[
              { value: "current", label: "Current theme" },
              { value: "both", label: "Light + dark" },
            ]}
          />
          <Switch label="Disable “Members”" checked={withDisabled} onChange={setWithDisabled} />
        </div>
        <p className="pg-state">
          <span className="pg-muted">value</span> <code>"{value}"</code>
        </p>
      </div>

      <Section title="Try this">
        <ul className="pg-checklist">
          <li>
            <strong>Fade:</strong> scroll the tabs (<Kbd>Shift</Kbd> + wheel); edges fade only where more is hidden.
          </li>
          <li>
            <strong>Chevrons:</strong> click to the end; the chevron dims while hovered, then disappears.
          </li>
          <li>
            <strong>Keyboard:</strong> <Kbd>Tab</Kbd> in, then <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>Home</Kbd> <Kbd>End</Kbd>.
          </li>
          <li>
            <strong>Touch:</strong> DevTools device mode shows fade only.
          </li>
        </ul>
      </Section>

      <Section title="Usage">
        <CodeBlock code={code} label="Tabs usage example" />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Tabs"
          rows={[
            ["value", "string", "—", "Selected tab (controlled)."],
            ["defaultValue", "string", "first enabled tab", "Initial tab (uncontrolled)."],
            ["onValueChange", "(value: string) => void", "—", "Called when the selection changes."],
            ["size", '"sm" | "md"', '"md"', "28px or 32px tall tabs."],
            ["variant", '"contained" | "plain"', '"contained"', "Card frame around list + panel, or none."],
          ]}
        />
        <ApiTable
          caption="TabList"
          rows={[
            ["aria-label", "string", "—", "Required (or aria-labelledby): names the tab group for screen readers."],
          ]}
        />
        <ApiTable
          caption="Tab"
          rows={[
            ["value", "string", "—", "Links the tab to the TabPanel with the same value."],
            ["disabled", "boolean", "false", "Skipped by arrow keys, can't be selected."],
          ]}
        />
        <ApiTable
          caption="TabPanel"
          rows={[
            ["value", "string", "—", "Matches a Tab."],
            ["keepMounted", "boolean", "false", "Keep content in the DOM while hidden (preserves state)."],
          ]}
        />
        <p className="pg-muted pg-note">All parts also accept native HTML props and forward refs.</p>
      </Section>

      <Section title="Accessibility">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <caption className="ds-visually-hidden">Keyboard interactions</caption>
            <thead>
              <tr>
                <th scope="col">Key</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Kbd>Tab</Kbd>
                </td>
                <td>Focuses the selected tab, then moves into the panel. The list is a single tab stop.</td>
              </tr>
              <tr>
                <td>
                  <Kbd>←</Kbd> <Kbd>→</Kbd>
                </td>
                <td>Previous / next tab, wrapping around and skipping disabled tabs. Selects on focus. Reversed in RTL.</td>
              </tr>
              <tr>
                <td>
                  <Kbd>Home</Kbd> <Kbd>End</Kbd>
                </td>
                <td>First / last tab.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="pg-checklist pg-a11y-list">
          <li>
            WAI-ARIA tabs pattern with <TermLink id="roving-tabindex">roving tabindex</TermLink>.
          </li>
          <li>Chevrons are mouse-only: out of the tab order and hidden from screen readers.</li>
          <li>
            <TermLink id="scroll-padding">Scroll padding</TermLink> keeps the focused tab clear of the fades.
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
