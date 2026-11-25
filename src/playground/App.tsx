import { Fragment, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarItem,
  SidebarLabel,
  SidebarProvider,
  SidebarSubgroup,
  SidebarTrigger,
} from "../ds";
import { useTheme, type ThemePreference } from "./theme";
import { Segmented } from "./ui";
import { ColorsPage } from "./pages/ColorsPage";
import { SpacingPage } from "./pages/SpacingPage";
import { TypographyPage } from "./pages/TypographyPage";
import { ShapePage } from "./pages/ShapePage";
import { TabsPage } from "./pages/TabsPage";
import { SidebarPage } from "./pages/SidebarPage";
import { TooltipPage } from "./pages/TooltipPage";
import { TextFieldPage } from "./pages/TextFieldPage";
import { CheckboxPage } from "./pages/CheckboxPage";
import { DialogPage } from "./pages/DialogPage";
import { OrgChartPage } from "./pages/OrgChartPage";
import { RadioPage } from "./pages/RadioPage";
import { SwitchPage } from "./pages/SwitchPage";
import { ButtonPage } from "./pages/ButtonPage";
import { ChartPage } from "./pages/ChartPage";
import { AsciiFieldPage } from "./pages/AsciiFieldPage";
import { LandingPage } from "./pages/LandingPage";
import { TermPage } from "./pages/TermPage";
import { StylePage } from "./pages/StylePage";
import { TERMS_BY_CATEGORY } from "./glossary/terms";
import { SORTED_STYLES } from "./styles/designStyles";
import {
  AsciiGlyphIcon,
  ButtonGlyphIcon,
  ChartGlyphIcon,
  CheckboxGlyphIcon,
  ColorsIcon,
  DialogGlyphIcon,
  OrgChartGlyphIcon,
  RadioGlyphIcon,
  ShapeIcon,
  SidebarGlyphIcon,
  SpacingIcon,
  SwitchGlyphIcon,
  TabsGlyphIcon,
  TextFieldGlyphIcon,
  TooltipGlyphIcon,
  TypographyIcon,
} from "./navIcons";

const GROUPS = ["Foundations", "Components", "Backgrounds", "Glossary", "Design styles"] as const;
type Group = (typeof GROUPS)[number];

export interface Route {
  path: string;
  label: string;
  group: Group;
  /** Sub-category inside the group (sidebar sub-heading + breadcrumb) */
  sub?: string;
  /** Sidebar icon; items without one get a monogram */
  icon?: ReactNode;
  render: () => ReactNode;
}

/* Glossary and Design styles pages are generated from their data files,
   so adding an entry there adds it to the sidebar automatically. */
const ROUTES: Route[] = [
  { path: "colors", label: "Colors", group: "Foundations", icon: <ColorsIcon />, render: () => <ColorsPage /> },
  { path: "spacing", label: "Spacing", group: "Foundations", icon: <SpacingIcon />, render: () => <SpacingPage /> },
  {
    path: "typography",
    label: "Typography",
    group: "Foundations",
    icon: <TypographyIcon />,
    render: () => <TypographyPage />,
  },
  { path: "shape", label: "Radius & shadow", group: "Foundations", icon: <ShapeIcon />, render: () => <ShapePage /> },
  { path: "button", label: "Button", group: "Components", icon: <ButtonGlyphIcon />, render: () => <ButtonPage /> },
  { path: "chart", label: "Chart", group: "Components", icon: <ChartGlyphIcon />, render: () => <ChartPage /> },
  {
    path: "checkbox",
    label: "Checkbox",
    group: "Components",
    icon: <CheckboxGlyphIcon />,
    render: () => <CheckboxPage />,
  },
  { path: "dialog", label: "Dialog", group: "Components", icon: <DialogGlyphIcon />, render: () => <DialogPage /> },
  {
    path: "org-chart",
    label: "Org chart",
    group: "Components",
    icon: <OrgChartGlyphIcon />,
    render: () => <OrgChartPage />,
  },
  { path: "radio", label: "Radio group", group: "Components", icon: <RadioGlyphIcon />, render: () => <RadioPage /> },
  {
    path: "sidebar",
    label: "Sidebar",
    group: "Components",
    icon: <SidebarGlyphIcon />,
    render: () => <SidebarPage />,
  },
  { path: "switch", label: "Switch", group: "Components", icon: <SwitchGlyphIcon />, render: () => <SwitchPage /> },
  { path: "tabs", label: "Tabs", group: "Components", icon: <TabsGlyphIcon />, render: () => <TabsPage /> },
  {
    path: "text-field",
    label: "Text field",
    group: "Components",
    icon: <TextFieldGlyphIcon />,
    render: () => <TextFieldPage />,
  },
  {
    path: "tooltip",
    label: "Tooltip",
    group: "Components",
    icon: <TooltipGlyphIcon />,
    render: () => <TooltipPage />,
  },
  {
    path: "backgrounds/ascii-field",
    label: "ASCII field",
    group: "Backgrounds",
    icon: <AsciiGlyphIcon />,
    render: () => <AsciiFieldPage />,
  },
  ...TERMS_BY_CATEGORY.map(
    (term): Route => ({
      path: `glossary/${term.id}`,
      label: term.term,
      group: "Glossary",
      sub: term.category,
      render: () => <TermPage term={term} />,
    }),
  ),
  ...SORTED_STYLES.map(
    (style): Route => ({
      path: `styles/${style.id}`,
      label: style.name,
      group: "Design styles",
      render: () => <StylePage style={style} />,
    }),
  ),
];

/** Split a group's routes into runs that share a sub-category, keeping order. */
function subgroups(items: Route[]): [string | undefined, Route[]][] {
  const out: [string | undefined, Route[]][] = [];
  for (const r of items) {
    const last = out[out.length - 1];
    if (last && last[0] === r.sub) last[1].push(r);
    else out.push([r.sub, [r]]);
  }
  return out;
}

/* Routing: the landing page is the site root ("/", no hash). Docs pages are
   hash routes ("/#/button"), so they work on any static host. */
const LANDING = "";
const readHash = () => window.location.hash.replace(/^#\/?/, "");

function resolve(path: string) {
  return (
    ROUTES.find((r) => r.path === path) ??
    // "#/glossary" or an unknown term → first entry of that section
    ROUTES.find((r) => r.path.startsWith(path.split("/")[0] + "/")) ??
    ROUTES[0]
  );
}

export function App() {
  const [theme, setTheme] = useTheme();
  const [path, setPath] = useState(readHash);

  useEffect(() => {
    const sync = () => {
      // An old "#/home" link → the root
      if (readHash() === "home") history.replaceState(null, "", import.meta.env.BASE_URL);
      setPath(readHash());
    };
    sync();
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  // Go to "/" without a reload (a plain link would reload the page)
  const goHome = (e: MouseEvent) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    history.pushState(null, "", import.meta.env.BASE_URL);
    setPath(LANDING);
    window.scrollTo(0, 0);
  };

  if (path === LANDING) {
    return <LandingPage routes={ROUTES} theme={theme} onThemeChange={setTheme} />;
  }
  return <Docs route={resolve(path)} theme={theme} onThemeChange={setTheme} onHome={goHome} />;
}

function Docs({
  route,
  theme,
  onThemeChange,
  onHome,
}: {
  route: Route;
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
  onHome: (e: MouseEvent) => void;
}) {
  const isFirstRender = useRef(true);

  // Collapsed sidebar groups (a per-viewer convenience, so localStorage is fine)
  const [collapsed, setCollapsed] = useState<Group[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("pg-nav-collapsed") ?? "[]");
    } catch {
      return [];
    }
  });
  const toggleGroup = (group: Group) =>
    setCollapsed((list) => {
      const next = list.includes(group) ? list.filter((g) => g !== group) : [...list, group];
      try {
        localStorage.setItem("pg-nav-collapsed", JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  // Always reveal the group of the page you navigate to
  useEffect(() => {
    setCollapsed((list) => (list.includes(route.group) ? list.filter((g) => g !== route.group) : list));
  }, [route.group]);

  // On client-side navigation, move focus to the new page title so screen
  // reader and keyboard users land at the start of the new content.
  useEffect(() => {
    document.title = `${route.label} · UI Notebook`;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    document.getElementById("page-title")?.focus();
    window.scrollTo(0, 0);
  }, [route]);

  const navItem = (r: Route) => (
    <SidebarItem key={r.path} href={`#/${r.path}`} icon={r.icon} current={r.path === route.path}>
      {r.label}
    </SidebarItem>
  );

  return (
    <SidebarProvider
      className="pg"
      storageKey="pg-sidebar"
      transition="cascade"
      // Below this the sidebar stacks above the page instead
      collapsibleFrom={801}
    >
      <a
        href="#main"
        className="pg-skip-link"
        // The hash is used for routing, so move focus manually.
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <Sidebar className="pg-sidebar">
        <SidebarHeader>
          <a href={import.meta.env.BASE_URL} className="pg-brand" onClick={onHome}>
            <span className="pg-brand-slot" aria-hidden="true">
              <span className="pg-brand-mark" />
            </span>
            <SidebarLabel>UI Notebook</SidebarLabel>
          </a>
        </SidebarHeader>
        <SidebarContent aria-label="Playground">
          {GROUPS.map((group) => {
            const items = ROUTES.filter((r) => r.group === group);
            return (
              <SidebarGroup
                key={group}
                label={group}
                count={items.length}
                collapsible
                open={!collapsed.includes(group)}
                onOpenChange={() => toggleGroup(group)}
              >
                {subgroups(items).map(([sub, list]) =>
                  sub ? (
                    <SidebarSubgroup key={sub} label={sub}>
                      {list.map(navItem)}
                    </SidebarSubgroup>
                  ) : (
                    list.map(navItem)
                  ),
                )}
              </SidebarGroup>
            );
          })}
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="pg-main">
        <header className="pg-topbar">
          <div className="pg-topbar-start">
            <SidebarTrigger />
            <nav aria-label="Breadcrumb">
              <ol className="pg-crumb">
                {[route.group, route.sub, route.label]
                  .filter((part): part is string => Boolean(part))
                  .map((part, i, parts) => (
                    <li key={part} aria-current={i === parts.length - 1 ? "page" : undefined}>
                      {part}
                    </li>
                  ))}
              </ol>
            </nav>
          </div>
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
        </header>
        <main id="main" className="pg-content" tabIndex={-1}>
          {/* key: remount per page so demo state doesn't leak between entries */}
          <Fragment key={route.path}>{route.render()}</Fragment>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
