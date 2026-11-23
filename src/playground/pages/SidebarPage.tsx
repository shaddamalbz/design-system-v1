import { useState, type ReactNode } from "react";
import {
  CheckIcon,
  DownloadIcon,
  HeartIcon,
  PlayIcon,
  SearchIcon,
  SendIcon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarLabel,
  SidebarProvider,
  SidebarTrigger,
  TrashIcon,
  type SidebarTransition,
} from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch, TermLink } from "../ui";

/** The demo app shown in the preview frame (also used by glossary demos). */
export function DemoSidebarApp({
  transition = "cascade",
  snapWidth = 160,
  collapsed,
  onCollapsedChange,
  width,
  onWidthChange,
}: {
  transition?: SidebarTransition;
  snapWidth?: number;
  collapsed?: boolean;
  onCollapsedChange?: (v: boolean) => void;
  width?: number;
  onWidthChange?: (v: number) => void;
}) {
  const [current, setCurrent] = useState("Favorites");
  const item = (label: string, icon?: ReactNode) => (
    <SidebarItem icon={icon} current={current === label} onClick={() => setCurrent(label)}>
      {label}
    </SidebarItem>
  );
  return (
    <SidebarProvider
      className="pg-sb-app"
      transition={transition}
      snapWidth={snapWidth}
      collapsed={collapsed}
      onCollapsedChange={onCollapsedChange}
      width={width}
      onWidthChange={onWidthChange}
      defaultWidth={220}
      minWidth={180}
      maxWidth={320}
      shortcut={false}
    >
      <Sidebar>
        <SidebarHeader>
          <div className="pg-sb-brand">
            <span className="pg-sb-logo" aria-hidden="true" />
            <SidebarLabel>Acme Inc</SidebarLabel>
          </div>
        </SidebarHeader>
        <SidebarContent aria-label="Demo app">
          <SidebarGroup>
            {item("Search", <SearchIcon />)}
            {item("Inbox", <SendIcon nudge={false} />)}
          </SidebarGroup>
          <SidebarGroup label="Library">
            {item("Favorites", <HeartIcon />)}
            {item("Downloads", <DownloadIcon />)}
            {item("Media", <PlayIcon />)}
            {item("Done", <CheckIcon />)}
          </SidebarGroup>
          <SidebarGroup label="Projects" collapsible count={3}>
            {item("Website redesign")}
            {item("Mobile app")}
            {item("Brand refresh")}
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroup>{item("Trash", <TrashIcon />)}</SidebarGroup>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="pg-sb-inset">
        <div className="pg-sb-bar">
          <SidebarTrigger size="sm" />
          <span className="pg-sb-title">{current}</span>
        </div>
        <div className="pg-sb-skeleton" aria-hidden="true">
          <span style={{ width: "40%" }} />
          <span style={{ width: "85%" }} />
          <span style={{ width: "70%" }} />
          <span className="pg-sb-card" />
          <span className="pg-sb-card" />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

const TRANSITIONS: { value: SidebarTransition; label: string; note: string }[] = [
  {
    value: "ease-out",
    label: "Ease out",
    note: "Snaps to icons once you drag under the snap width. Labels fade in 0.16s while the width glides over 0.4s.",
  },
  {
    value: "cascade",
    label: "Cascade",
    note: "Follows your drag. Under the snap width labels drift left and fade from the top down; it settles to icons when you let go. The trigger plays it over 0.4s.",
  },
  {
    value: "scrub",
    label: "Scrub",
    note: "Follows your drag. Labels fade as you narrow the sidebar; it settles to icons when you let go.",
  },
];

export function SidebarPage() {
  const [transition, setTransition] = useState<SidebarTransition>("cascade");
  const [snap, setSnap] = useState(160);
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(220);

  const code = `<SidebarProvider${transition !== "cascade" ? ` transition="${transition}"` : ""}${
    snap !== 160 ? ` snapWidth={${snap}}` : ""
  } storageKey="app-sidebar">
  <Sidebar>
    <SidebarHeader>…</SidebarHeader>
    <SidebarContent aria-label="Main">
      <SidebarGroup label="Library">
        <SidebarItem href="/favorites" icon={<HeartIcon />} current>
          Favorites
        </SidebarItem>
      </SidebarGroup>
    </SidebarContent>
  </Sidebar>
  <SidebarInset>
    <SidebarTrigger />
    …
  </SidebarInset>
</SidebarProvider>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Sidebar">
        <p>Navigation panel that resizes by dragging its edge and collapses to an icon rail.</p>
        <Concepts
          ids={[
            "direct-manipulation",
            "staggered-animation",
            "easing",
            "icon-morphing",
            "feedforward",
            "micro-interaction",
          ]}
        />
      </PageHeader>

      <div className="pg-playground">
        <div className="pg-sb-frame">
          <DemoSidebarApp
            transition={transition}
            snapWidth={snap}
            collapsed={collapsed}
            onCollapsedChange={setCollapsed}
            width={width}
            onWidthChange={setWidth}
          />
        </div>
        <p className="pg-muted pg-note">{TRANSITIONS.find((t) => t.value === transition)?.note}</p>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<SidebarTransition>
            label="Transition"
            value={transition}
            onChange={setTransition}
            options={TRANSITIONS.map(({ value, label }) => ({ value, label }))}
          />
          <Range label="Snap width" value={snap} min={120} max={180} step={10} unit="px" onChange={setSnap} />
          <Switch label="Collapsed" checked={collapsed} onChange={setCollapsed} />
        </div>
        <p className="pg-state">
          <span className="pg-muted">collapsed</span> <code>{String(collapsed)}</code>{" "}
          <span className="pg-muted">width</span> <code>{width}</code>
        </p>
      </div>

      <Section title="Try this">
        <ul className="pg-checklist">
          <li>
            <strong>Drag the edge</strong> of the demo sidebar left past the snap width, then let go.
          </li>
          <li>
            <strong>Hover the trigger:</strong> its icon previews what a click will do (bars → dots).
          </li>
          <li>
            <strong>Collapsed:</strong> hover or <Kbd>Tab</Kbd> onto an icon to see its label.
          </li>
          <li>
            <strong>Keyboard:</strong> <Kbd>Tab</Kbd> to the edge, then <Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>Enter</Kbd>.
            This playground's own sidebar also toggles with <Kbd>Ctrl</Kbd> + <Kbd>B</Kbd>.
          </li>
        </ul>
      </Section>

      <Section title="Usage">
        <CodeBlock code={code} label="Sidebar usage example" />
      </Section>

      <Section title="Transitions">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <caption className="ds-visually-hidden">Collapse transitions</caption>
            <thead>
              <tr>
                <th scope="col">transition</th>
                <th scope="col">While dragging</th>
                <th scope="col">Trigger / keyboard</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">
                  <code>"ease-out"</code>
                </th>
                <td>Follows down to minWidth, then snaps to the rail under the snap width.</td>
                <td>Labels fade (0.16s), width glides (0.4s).</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>"cascade"</code>
                </th>
                <td>
                  Follows the pointer. Under the snap width labels{" "}
                  <TermLink id="staggered-animation">cascade</TermLink> out, top first.
                </td>
                <td>Same cascade, played over 0.4s.</td>
              </tr>
              <tr>
                <th scope="row">
                  <code>"scrub"</code>
                </th>
                <td>Follows the pointer. Labels fade in proportion to the width.</td>
                <td>All labels fade together over 0.4s.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="pg-muted pg-note">
          Releasing under the snap width collapses; above it, the width settles between minWidth and maxWidth.
        </p>
      </Section>

      <Section title="API">
        <ApiTable
          caption="SidebarProvider"
          rows={[
            ["collapsed / defaultCollapsed", "boolean", "false", "Icon rail (controlled / initial)."],
            ["onCollapsedChange", "(collapsed: boolean) => void", "—", "Called when it collapses or expands."],
            ["width / defaultWidth", "number", "240", "Expanded width in px (controlled / initial)."],
            ["onWidthChange", "(width: number) => void", "—", "Called after a resize."],
            ["transition", '"ease-out" | "cascade" | "scrub"', '"cascade"', "How labels leave and the width moves."],
            ["railWidth", "number", "48", "Collapsed width."],
            ["minWidth / maxWidth", "number", "200 / 360", "Expanded width limits."],
            ["snapWidth", "number", "160", "Dragging under this collapses."],
            ["shortcut", "string | false", '"b"', "Ctrl/⌘ + key toggles. Ignored while typing in a field."],
            ["storageKey", "string", "—", "Remember width and collapsed state in localStorage."],
            ["collapsibleFrom", "number", "0", "Viewport width (px) where collapsing starts. Below it there's no rail, handle or trigger."],
          ]}
        />
        <ApiTable
          caption="Sidebar"
          rows={[["resizable", "boolean", "true", "Draggable, focusable edge. Click it to toggle."]]}
        />
        <ApiTable
          caption="SidebarGroup"
          rows={[
            ["label", "string", "—", "Heading. Becomes a divider in the rail."],
            ["collapsible", "boolean", "false", "Heading is a disclosure button (rail always shows every item)."],
            ["open / defaultOpen / onOpenChange", "boolean", "true", "Disclosure state."],
            ["count", "number", "—", "Number badge in the heading."],
          ]}
        />
        <ApiTable
          caption="SidebarItem"
          rows={[
            ["href", "string", "—", "Renders a link; without it, a button."],
            ["icon", "ReactNode", "monogram", "16px icon. Without one, initials of the label are shown."],
            ["current", "boolean", "false", 'Current page: sets aria-current="page".'],
            ["tooltip", "string", "label text", "Rail tooltip when children isn't plain text."],
          ]}
        />
        <ApiTable
          caption="SidebarTrigger"
          rows={[["size / variant", "Button props", '"md" / "ghost"', "An IconButton with the morphing icon."]]}
        />
        <p className="pg-muted pg-note">
          Also: <code>SidebarHeader</code>, <code>SidebarContent</code> (a <code>&lt;nav&gt;</code>),{" "}
          <code>SidebarFooter</code>, <code>SidebarInset</code>, <code>SidebarLabel</code> (text that hides with the
          labels), <code>SidebarToggleIcon</code> and the <code>useSidebar()</code> hook.
        </p>
      </Section>

      <Section title="Accessibility">
        <div className="pg-table-wrap">
          <table className="pg-table">
            <caption className="ds-visually-hidden">Keyboard interactions on the resize handle</caption>
            <thead>
              <tr>
                <th scope="col">Key (on the edge)</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <Kbd>←</Kbd> <Kbd>→</Kbd>
                </td>
                <td>
                  Narrower / wider by 16px (<Kbd>Shift</Kbd>: 64px). Past minWidth it collapses.
                </td>
              </tr>
              <tr>
                <td>
                  <Kbd>Home</Kbd> <Kbd>End</Kbd>
                </td>
                <td>Collapse / widest.</td>
              </tr>
              <tr>
                <td>
                  <Kbd>Enter</Kbd>
                </td>
                <td>Toggle collapsed.</td>
              </tr>
            </tbody>
          </table>
        </div>
        <ul className="pg-checklist pg-a11y-list">
          <li>
            The edge is a focusable <code>role="separator"</code> with <code>aria-valuenow</code> and{" "}
            <code>aria-valuetext</code> ("Collapsed" or the width), following the WAI-ARIA window splitter pattern.
          </li>
          <li>
            The trigger has <code>aria-expanded</code>, <code>aria-controls</code> and <code>aria-keyshortcuts</code>.
          </li>
          <li>
            Collapsed labels stay in the DOM as each item's accessible name; the tooltip duplicates them and is{" "}
            <code>aria-hidden</code>. <Kbd>Esc</Kbd> hides it.
          </li>
          <li>
            In the rail, group headings are dividers: removed from the tab order, while the list keeps its name via{" "}
            <code>aria-labelledby</code>.
          </li>
          <li>
            With <TermLink id="reduced-motion" />, width and labels change instantly; the current item gets an outline
            in <TermLink id="forced-colors">forced colors</TermLink>.
          </li>
        </ul>
      </Section>
    </>
  );
}
