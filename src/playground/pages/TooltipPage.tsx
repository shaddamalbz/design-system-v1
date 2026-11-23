import { useLayoutEffect, useRef, useState } from "react";
import {
  Button,
  DownloadIcon,
  HeartIcon,
  IconButton,
  PlusIcon,
  SendIcon,
  TrashIcon,
  Tooltip,
  type TooltipSide,
} from "../../ds";
import { ApiTable, CodeBlock, Concepts, Kbd, PageHeader, Range, Section, Segmented, Switch, TextField } from "../ui";

const supportsAnchor = typeof CSS !== "undefined" && CSS.supports("anchor-name: --a");

/* Which side did the browser actually pick? Compare the two boxes. */
function placedSide(trigger: DOMRect, tip: DOMRect): TooltipSide {
  if (tip.bottom <= trigger.top + 1) return "top";
  if (tip.top >= trigger.bottom - 1) return "bottom";
  if (tip.right <= trigger.left + 1) return "left";
  return "right";
}

export function TooltipPage() {
  const [side, setSide] = useState<TooltipSide>("top");
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [open, setOpen] = useState(true);
  const [content, setContent] = useState("Add to favorites");
  const [placed, setPlaced] = useState<TooltipSide>("top");
  const stage = useRef<HTMLDivElement>(null);

  // Measure after the browser has placed it (positioning is pure CSS)
  useLayoutEffect(() => {
    const el = stage.current;
    const trigger = el?.querySelector(".ds-tooltip-trigger");
    const tip = el?.querySelector(".ds-tooltip");
    if (!trigger || !tip) return;
    const id = requestAnimationFrame(() =>
      setPlaced(placedSide(trigger.getBoundingClientRect(), tip.getBoundingClientRect())),
    );
    return () => cancelAnimationFrame(id);
  }, [side, x, y, open, content]);

  const flipped = open && placed !== side;
  const code = `<Tooltip content="${content}"${side !== "top" ? ` side="${side}"` : ""}>
  <IconButton icon={<HeartIcon />} aria-label="Favorite" />
</Tooltip>`;

  return (
    <>
      <PageHeader eyebrow="Components" title="Tooltip">
        <p>
          A short label that appears on hover or keyboard focus. Positioned and flipped by CSS alone, with no
          positioning JavaScript.
        </p>
        <Concepts ids={["progressive-enhancement", "hit-area", "feedforward", "forced-colors"]} />
      </PageHeader>

      <div className="pg-playground">
        <div ref={stage} className="pg-tt-stage">
          <div className="pg-tt-pos" style={{ left: `${x}%`, top: `${y}%` }}>
            <Tooltip content={content || "…"} side={side} open={open}>
              <IconButton variant="outline" icon={<HeartIcon />} aria-label="Favorite" />
            </Tooltip>
          </div>
          <span className="pg-tt-status gd-badge" data-tone={flipped ? "good" : undefined}>
            {!open
              ? "Hover or Tab to the button"
              : flipped
                ? `No room on ${side}: flipped to ${placed}`
                : `Placed on ${placed}`}
          </span>
        </div>
        <p className="pg-muted pg-note">
          Move the button toward an edge. The stage is the tooltip's boundary here, so you can watch{" "}
          <code>position-try-fallbacks</code> flip it. Once flipped, it stays flipped while it still fits there: the
          browser remembers the last option that worked, so the tooltip doesn't flicker between sides.{" "}
          {!supportsAnchor && <strong>Your browser has no anchor positioning, so you see the fallback (no flip).</strong>}
        </p>
        <div className="pg-controls" role="group" aria-label="Preview controls">
          <Segmented<TooltipSide>
            label="Preferred side"
            value={side}
            onChange={setSide}
            options={[
              { value: "top", label: "Top" },
              { value: "bottom", label: "Bottom" },
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
          />
          <TextField label="Content" value={content} onChange={setContent} />
          <Range label="Button x" value={x} min={4} max={96} unit="%" onChange={setX} />
          <Range label="Button y" value={y} min={8} max={92} unit="%" onChange={setY} />
          <Switch label="Always open" checked={open} onChange={setOpen} />
        </div>
        <CodeBlock code={code} label="Code for this preview" />
      </div>

      <Section title="Examples">
        <div className="pg-tt-examples">
          <Tooltip content="New project" shortcut="N">
            <IconButton icon={<PlusIcon />} aria-label="New project" />
          </Tooltip>
          <Tooltip content="Download as PDF">
            <IconButton icon={<DownloadIcon />} aria-label="Download" />
          </Tooltip>
          <Tooltip content="Send now" side="bottom">
            <IconButton icon={<SendIcon />} aria-label="Send" />
          </Tooltip>
          <Tooltip content="Moves to trash. You can undo for 30 days." side="right">
            <Button startIcon={<TrashIcon />}>Delete</Button>
          </Tooltip>
        </div>
      </Section>

      <Section title="How it's positioned">
        <ul className="pg-checklist">
          <li>
            The trigger gets an <code>anchor-name</code>; the tooltip points at it with <code>position-anchor</code> and
            sits on a side with <code>position-area</code>.
          </li>
          <li>
            <code>position-try-fallbacks</code> lists what to try when it overflows: the opposite side, then sliding
            along the edge. The browser measures, not your code.
          </li>
          <li>
            It's <code>position: fixed</code>, so <code>overflow: hidden</code> parents can't clip it.
          </li>
          <li>
            Watch out: an ancestor with <code>transform</code>, <code>filter</code>, <code>backdrop-filter</code> or{" "}
            <code>contain</code> becomes the containing block of fixed elements, so the tooltip can only be placed (and
            flipped) inside that ancestor.
          </li>
          <li>
            Without anchor support it falls back to the classic <code>position: absolute</code> + <code>translate</code>{" "}
            tooltip on the preferred side.
          </li>
        </ul>
        <CodeBlock
          label="The core CSS"
          code={`.ds-tooltip-trigger { anchor-name: --tip; }
.ds-tooltip {
  position: fixed;
  position-anchor: --tip;
  position-area: top;
  margin: 6px;
  position-try-fallbacks: flip-block, top span-right, top span-left;
}`}
        />
        <p className="pg-muted pg-note">
          MDN:{" "}
          <a href="https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_anchor_positioning" target="_blank" rel="noreferrer">
            CSS anchor positioning
          </a>
          ,{" "}
          <a
            href="https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/position-try-fallbacks"
            target="_blank"
            rel="noreferrer"
          >
            position-try-fallbacks
          </a>
          .
        </p>
      </Section>

      <Section title="Usage">
        <CodeBlock
          label="Tooltip usage example"
          code={`<Tooltip content="Download as PDF">
  <IconButton icon={<DownloadIcon />} aria-label="Download" />
</Tooltip>

<Tooltip content="Collapse sidebar" shortcut="Ctrl+B" side="bottom">
  …
</Tooltip>`}
        />
      </Section>

      <Section title="API">
        <ApiTable
          caption="Tooltip"
          rows={[
            ["content", "ReactNode", "—", "Short text. No links or buttons inside (it disappears on blur)."],
            ["side", '"top" | "bottom" | "left" | "right"', '"top"', "Preferred side; flips when there's no room."],
            ["shortcut", "string", "—", "Keyboard shortcut shown after the text."],
            ["delay", "number", "400", "Hover delay in ms. Keyboard focus shows immediately."],
            ["open", "boolean", "—", "Force it visible."],
            ["children", "ReactElement", "—", "One focusable trigger. Gets aria-describedby."],
          ]}
        />
      </Section>

      <Section title="Accessibility">
        <ul className="pg-checklist pg-a11y-list">
          <li>
            <code>role="tooltip"</code>, linked with <code>aria-describedby</code> (skipped when it would repeat the
            trigger's <code>aria-label</code>).
          </li>
          <li>
            Shows on keyboard focus, not only hover. On touch screens there's no hover, so never put essential
            information only in a tooltip.
          </li>
          <li>
            <Kbd>Esc</Kbd> hides it without moving focus, and an invisible bridge over the gap lets you move the pointer
            onto it (WCAG 1.4.13).
          </li>
          <li>Icon-only buttons still need their own aria-label; the tooltip is the visible hint.</li>
        </ul>
      </Section>
    </>
  );
}
