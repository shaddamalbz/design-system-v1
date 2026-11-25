import * as React from "react";
import { Input } from "../input";
import { Button, IconButton } from "../button";
import { SearchIcon, XIcon } from "../../icons";
import { highlightParts } from "./search";

/* ==========================================================================
   OrgChartSearch: the combobox in the chart's top-left corner.
   ARIA combobox with a listbox popup (WAI-ARIA APG "list autocomplete"):
   focus stays in the input, ↑/↓ move the active option, Enter picks it.
   Rendering only: the chart owns the query, the results and what a pick does.
   ========================================================================== */

/** Options shown in the popup. Past this, the list says how many more there are. */
const LIST_LIMIT = 50;

export interface SearchOption {
  index: number;
  name: string;
  title?: string;
  /** Nearest managers, top first: where this person sits. */
  path: string[];
}

export interface OrgChartSearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Normalized query of the current results, for highlighting. */
  resultQuery: string;
  /** Total number of matches. */
  count: number;
  /** Builds the option for the nth best match (n < min(count, LIST_LIMIT)). */
  option: (n: number) => SearchOption;
  /** Go to a match: select it, fly to it. */
  onPick: (index: number) => void;
  /** Zoom to fit every match. */
  onShowAll: () => void;
  /** Escape on an empty field: hand focus back to the chart. */
  onExit: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function Highlighted({ text, query }: { text: string; query: string }) {
  return (
    <>
      {highlightParts(text, query).map((p, i) => (p.hit ? <mark key={i}>{p.text}</mark> : p.text))}
    </>
  );
}

export function OrgChartSearch({
  value,
  onChange,
  resultQuery,
  count,
  option,
  onPick,
  onShowAll,
  onExit,
  inputRef,
}: OrgChartSearchProps) {
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(0);
  const listId = React.useId();
  const statusId = React.useId();
  const listRef = React.useRef<HTMLUListElement>(null);

  const shown = Math.min(count, LIST_LIMIT);
  const options = React.useMemo(() => Array.from({ length: shown }, (_, n) => option(n)), [shown, option]);
  const expanded = open && value.trim() !== "";

  // New results: back to the best match
  React.useEffect(() => setActive(0), [resultQuery]);

  // Keep the active option scrolled into view
  React.useEffect(() => {
    if (!expanded) return;
    listRef.current?.querySelector<HTMLElement>(`[data-n="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, expanded]);

  const pick = (n: number) => {
    const o = options[n];
    if (!o) return;
    setOpen(false);
    onPick(o.index);
  };

  const showAll = () => {
    setOpen(false);
    onShowAll();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((a) => Math.min(shown - 1, a + 1));
        return;
      case "ArrowUp":
        e.preventDefault();
        setActive((a) => Math.max(0, a - 1));
        return;
      case "Home":
      case "End":
        if (!expanded) return;
        e.preventDefault();
        setActive(e.key === "Home" ? 0 : shown - 1);
        return;
      case "Enter":
        e.preventDefault();
        if (e.altKey || e.shiftKey) showAll();
        else if (shown) pick(expanded ? active : 0);
        return;
      case "Escape":
        e.preventDefault();
        if (expanded) setOpen(false);
        else if (value) onChange("");
        else onExit();
        return;
    }
  };

  const status = !value.trim()
    ? ""
    : count === 0
      ? "No matches"
      : `${count.toLocaleString("en-US")} match${count === 1 ? "" : "es"}`;

  return (
    <div
      className="ds-org-search"
      onBlur={(e) => {
        // Close only when focus leaves the whole search (not when it moves to "Show all")
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <Input
        ref={inputRef}
        size="sm"
        type="search"
        placeholder="Search people"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-label="Search people"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={expanded && shown ? `${listId}-${active}` : undefined}
        aria-describedby={statusId}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value && setOpen(true)}
        onKeyDown={onKeyDown}
        start={<SearchIcon />}
        end={
          value ? (
            <IconButton
              size="sm"
              variant="ghost"
              icon={<XIcon />}
              aria-label="Clear search"
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
            />
          ) : undefined
        }
      />

      {expanded && (
        <div className="ds-org-search-pop">
          <div className="ds-org-search-head">
            <span aria-hidden="true">{status}</span>
            {count > 1 && (
              <Button size="sm" variant="ghost" onClick={showAll}>
                Show all on chart
              </Button>
            )}
          </div>
          <ul ref={listRef} id={listId} role="listbox" aria-label="People found" className="ds-org-search-list">
            {options.map((o, n) => (
              <li
                key={o.index}
                id={`${listId}-${n}`}
                data-n={n}
                role="option"
                aria-selected={n === active}
                className="ds-org-search-option"
                // Keep focus in the input: the click still picks
                onMouseDown={(e) => e.preventDefault()}
                onMouseMove={() => n !== active && setActive(n)}
                onClick={() => pick(n)}
              >
                <span className="ds-org-search-name">
                  <Highlighted text={o.name} query={resultQuery} />
                </span>
                {o.title && (
                  <span className="ds-org-search-title">
                    <Highlighted text={o.title} query={resultQuery} />
                  </span>
                )}
                {o.path.length > 0 && <span className="ds-org-search-path">{o.path.join(" › ")}</span>}
              </li>
            ))}
          </ul>
          {count > shown && (
            <p className="ds-org-search-more">
              {(count - shown).toLocaleString("en-US")} more. Keep typing to narrow it down.
            </p>
          )}
        </div>
      )}
      <span id={statusId} className="ds-visually-hidden" aria-live="polite">
        {status}
      </span>
    </div>
  );
}
