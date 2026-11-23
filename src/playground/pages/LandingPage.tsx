import { useEffect, type ReactNode } from "react";
import {
  AsciiField,
  Button,
  Checkbox,
  HeartIcon,
  IconButton,
  Input,
  PlusIcon,
  Radio,
  SearchIcon,
  Switch,
} from "../../ds";
import { CATEGORIES, TERMS } from "../glossary/terms";
import type { ThemePreference } from "../theme";
import { Segmented } from "../ui";

/* The landing page of a personal UI notebook: things I found worth keeping
   (components, interactions, accessibility details, notes), rebuilt from
   scratch. A moodboard, not a product page. */

export interface LandingRoute {
  path: string;
  label: string;
  group: string;
  icon?: ReactNode;
}

/* Small, non-interactive previews for the saved items. Pages without one
   here still get a card, with their sidebar icon instead. */
const PREVIEWS: Record<string, { note: string; preview: ReactNode }> = {
  button: {
    note: "Optical padding: the icon side gets less.",
    preview: (
      <div className="pg-home-row">
        <Button variant="solid" size="sm" startIcon={<PlusIcon />}>
          New
        </Button>
        <Button size="sm">Cancel</Button>
      </div>
    ),
  },
  checkbox: {
    note: "The check draws in; unchecking is instant.",
    preview: (
      <div className="pg-home-stack">
        <Checkbox label="Mentions" defaultChecked size="sm" />
        <Checkbox label="Select all" indeterminate size="sm" />
      </div>
    ),
  },
  radio: {
    note: "Arrow keys come free with native radios.",
    preview: (
      <div className="pg-home-stack">
        <Radio value="m" label="Monthly" name="home-radio" />
        <Radio value="y" label="Yearly" name="home-radio" defaultChecked />
      </div>
    ),
  },
  sidebar: {
    note: "Collapse to a rail with a cascade, from an X post.",
    preview: (
      <div className="pg-home-mini-sidebar" aria-hidden="true">
        <span />
        <span />
        <span />
        <i />
      </div>
    ),
  },
  switch: {
    note: "The thumb stretches toward where it's going.",
    preview: (
      <div className="pg-home-stack">
        <Switch label="Wi-Fi" defaultChecked size="sm" />
        <Switch label="Bluetooth" size="sm" />
      </div>
    ),
  },
  tabs: {
    note: "Edge fades driven by scroll position, in CSS.",
    preview: (
      <div className="pg-home-tabs" aria-hidden="true">
        <span data-on="">Overview</span>
        <span>Activity</span>
        <span>Members</span>
      </div>
    ),
  },
  "text-field": {
    note: "Errors: reward early, punish late.",
    preview: <Input size="sm" placeholder="Search…" start={<SearchIcon />} aria-label="Search preview" />,
  },
  tooltip: {
    note: "Placed and flipped by CSS anchor positioning.",
    preview: (
      <div className="pg-home-tip">
        <span className="pg-home-tip-bubble">Add to favorites</span>
        <IconButton variant="outline" size="sm" icon={<HeartIcon />} aria-label="Favorite" />
      </div>
    ),
  },
  "backgrounds/ascii-field": {
    note: "Text as texture, with a pointer lens.",
    preview: <AsciiField className="pg-home-ascii" cellSize={10} interactive={false} glow={0.3} />,
  },
};

export function LandingPage({
  routes,
  theme,
  onThemeChange,
}: {
  routes: LandingRoute[];
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}) {
  useEffect(() => {
    document.title = "UI Notebook";
  }, []);

  const byGroup = (g: string) => routes.filter((r) => r.group === g);
  const foundations = byGroup("Foundations");
  const components = byGroup("Components");
  const backgrounds = byGroup("Backgrounds");
  const glossary = byGroup("Glossary");
  const styles = byGroup("Design styles");
  const first = (list: LandingRoute[]) => `#/${list[0]?.path ?? ""}`;
  const latest = backgrounds[backgrounds.length - 1] ?? components[components.length - 1];

  const notes = [
    {
      title: "Glossary",
      href: first(glossary),
      count: TERMS.length,
      text: "Words for the things I keep noticing, each with a demo.",
      items: CATEGORIES.map((c) => `${c} ${TERMS.filter((t) => t.category === c).length}`),
    },
    {
      title: "Design styles",
      href: first(styles),
      count: styles.length,
      text: "Looks I want to recognise: what defines them, when they work.",
      items: styles.map((r) => r.label),
    },
    {
      title: "Foundations",
      href: first(foundations),
      count: foundations.length,
      text: "The tokens everything here is built on.",
      items: foundations.map((r) => r.label),
    },
  ];

  const saved = [...backgrounds, ...components];

  return (
    <div className="pg-landing">
      <a
        href="#landing-main"
        className="pg-skip-link"
        // The hash is used for routing, so move focus manually.
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("landing-main")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="pg-landing-nav">
        <div className="pg-landing-nav-inner">
          <a href={import.meta.env.BASE_URL} className="pg-landing-brand" aria-label="UI Notebook, home">
            <span className="pg-brand-mark" aria-hidden="true" />
            <span aria-hidden="true">UI Notebook</span>
          </a>
          <nav aria-label="Main" className="pg-landing-links">
            <a href={first(components)}>Components</a>
            <a href={first(backgrounds)}>Backgrounds</a>
            <a href={first(glossary)}>Glossary</a>
            <a href={first(styles)}>Styles</a>
          </nav>
          <Segmented<ThemePreference>
            label="Theme"
            hideLabel
            value={theme}
            onChange={onThemeChange}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />
        </div>
      </header>

      <main id="landing-main" tabIndex={-1}>
        <AsciiField className="pg-landing-hero" pattern="flow" density={0.68} fade={0.5} glow={0.5}>
          <div className="pg-landing-hero-inner">
            <p className="pg-landing-kicker">A personal collection</p>
            <h1 id="page-title" tabIndex={-1}>
              Things I found
              <br />
              worth keeping.
            </h1>
            <p className="pg-home-lead">
              Components, interactions, accessibility details and notes that caught my eye, each rebuilt from scratch
              so I understand how it works.
            </p>
            <p className="pg-landing-meta">
              {components.length} components · {backgrounds.length} background{backgrounds.length === 1 ? "" : "s"} ·{" "}
              {TERMS.length} notes · {styles.length} styles
              {latest && (
                <>
                  {" "}
                  · latest: <a href={`#/${latest.path}`}>{latest.label}</a>
                </>
              )}
            </p>
          </div>
        </AsciiField>

        <div className="pg-landing-body">
          <section aria-labelledby="home-saved">
            <h2 id="home-saved" className="pg-landing-h2">
              Saved
            </h2>
            <ul className="pg-home-components">
              {saved.map((r) => {
                const card = PREVIEWS[r.path];
                return (
                  <li key={r.path} className="pg-home-component">
                    {/* Previews are pictures of the item: inert, so the card is one link */}
                    <div className="pg-home-preview" inert>
                      {card?.preview ?? <span className="pg-home-preview-icon">{r.icon}</span>}
                    </div>
                    <span className="pg-home-kind">{r.group === "Backgrounds" ? "Background" : "Component"}</span>
                    <a href={`#/${r.path}`} className="pg-home-component-link">
                      {r.label}
                    </a>
                    {card && <p className="pg-muted">{card.note}</p>}
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="pg-section" aria-labelledby="home-notes">
            <h2 id="home-notes" className="pg-landing-h2">
              Notes
            </h2>
            <div className="pg-home-sections">
              {notes.map((s) => (
                <a key={s.title} href={s.href} className="pg-home-section">
                  <span className="pg-home-section-head">
                    <span className="pg-home-section-title">{s.title}</span>
                    <span className="pg-home-count">{s.count}</span>
                  </span>
                  <span className="pg-muted">{s.text}</span>
                  <span className="pg-home-tags">
                    {s.items.slice(0, 6).map((item) => (
                      <span key={item}>{item}</span>
                    ))}
                    {s.items.length > 6 && <span>+{s.items.length - 6}</span>}
                  </span>
                </a>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="pg-footer">
        {/* Decorative art: a grayscale image, recolored per theme in CSS */}
        <div className="pg-footer-art" aria-hidden="true" />
        <div className="pg-footer-inner">
          <div className="pg-footer-top">
            <div className="pg-footer-brand">
              <a href={import.meta.env.BASE_URL} className="pg-landing-brand">
                <span className="pg-brand-mark" aria-hidden="true" />
                UI Notebook
              </a>
              <p>A personal collection of UI I found worth keeping, rebuilt from scratch to understand it.</p>
            </div>
            <nav className="pg-footer-links" aria-label="Footer">
              <div>
                <h2>Collection</h2>
                <ul>
                  <li>
                    <a href={first(components)}>Components</a>
                  </li>
                  <li>
                    <a href={first(backgrounds)}>Backgrounds</a>
                  </li>
                  <li>
                    <a href={first(foundations)}>Foundations</a>
                  </li>
                </ul>
              </div>
              <div>
                <h2>Notes</h2>
                <ul>
                  <li>
                    <a href={first(glossary)}>Glossary</a>
                  </li>
                  <li>
                    <a href={first(styles)}>Design styles</a>
                  </li>
                </ul>
              </div>
              <div>
                <h2>Saved</h2>
                <ul>
                  {saved.slice(0, 3).map((r) => (
                    <li key={r.path}>
                      <a href={`#/${r.path}`}>{r.label}</a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>
          </div>
          <div className="pg-footer-bottom">
            <span>UI Notebook · 2026</span>
            <span>Cats, games and good details.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
