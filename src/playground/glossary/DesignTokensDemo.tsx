import { useState, type CSSProperties } from "react";
import { Button, DownloadIcon, Tab, TabList, TabPanel, Tabs } from "../../ds";
import { Segmented } from "../ui";

type Accent = "gray" | "blue" | "violet" | "green";
type Shape = "sharp" | "default" | "round";

/* Primitive values (would live in tokens.css) */
const ACCENTS: Record<Accent, { token: string; value: string; light: string; dark: string }> = {
  gray: { token: "--gray-12", value: "var(--gray-12)", light: "#1a1a1a", dark: "#ededed" },
  blue: { token: "--blue-9", value: "light-dark(#0d74ce, #3b9eff)", light: "#0d74ce", dark: "#3b9eff" },
  violet: { token: "--violet-9", value: "light-dark(#6e56cf, #9e8cfc)", light: "#6e56cf", dark: "#9e8cfc" },
  green: { token: "--green-9", value: "light-dark(#218358, #3dd68c)", light: "#218358", dark: "#3dd68c" },
};
const SHAPES: Record<Shape, { sm: number; md: number; lg: number }> = {
  sharp: { sm: 2, md: 2, lg: 4 },
  default: { sm: 6, md: 8, lg: 12 },
  round: { sm: 10, md: 14, lg: 20 },
};

/* Change what a semantic token points to; every component using it follows. */
export function DesignTokensDemo() {
  const [accent, setAccent] = useState<Accent>("gray");
  const [shape, setShape] = useState<Shape>("default");
  const a = ACCENTS[accent];
  const r = SHAPES[shape];

  const vars = {
    "--color-solid": a.value,
    "--radius-sm": `${r.sm}px`,
    "--radius-md": `${r.md}px`,
    "--radius-lg": `${r.lg}px`,
  } as CSSProperties;

  return (
    <div className="pg-demo">
      <div className="gd-tk-chain" aria-label="Token chain">
        <div className="gd-tk-node">
          <span className="gd-tk-kind">Primitive</span>
          <span className="gd-tk-swatch" style={{ background: a.value }} />
          <code>{a.token}</code>
        </div>
        <span className="gd-tk-arrow" aria-hidden="true">→</span>
        <div className="gd-tk-node">
          <span className="gd-tk-kind">Semantic</span>
          <code>--color-solid</code>
        </div>
        <span className="gd-tk-arrow" aria-hidden="true">→</span>
        <div className="gd-tk-node">
          <span className="gd-tk-kind">Components</span>
          <span>Solid button, selected states</span>
        </div>
      </div>

      <div className="gd-stage">
        <div className="gd-tk-ui" style={vars}>
          <div className="gd-tk-card">
            <p className="gd-tk-title">Weekly report</p>
            <p className="pg-muted">Same components, only token values changed.</p>
            <Tabs defaultValue="a" size="sm">
              <TabList aria-label="Report">
                <Tab value="a">Summary</Tab>
                <Tab value="b">Details</Tab>
                <Tab value="c">History</Tab>
              </TabList>
              <TabPanel value="a">12 updates this week.</TabPanel>
              <TabPanel value="b">8 people, 34 files.</TabPanel>
              <TabPanel value="c">Last export 2 days ago.</TabPanel>
            </Tabs>
            <div className="gd-row">
              <Button variant="solid" startIcon={<DownloadIcon />}>
                Export
              </Button>
              <Button>Cancel</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="pg-controls pg-demo-controls" role="group" aria-label="Demo controls">
        <Segmented<Accent>
          label="--color-solid points to"
          value={accent}
          onChange={setAccent}
          options={[
            { value: "gray", label: "Gray" },
            { value: "blue", label: "Blue" },
            { value: "violet", label: "Violet" },
            { value: "green", label: "Green" },
          ]}
        />
        <Segmented<Shape>
          label="Radius tokens"
          value={shape}
          onChange={setShape}
          options={[
            { value: "sharp", label: "Sharp" },
            { value: "default", label: "Default" },
            { value: "round", label: "Round" },
          ]}
        />
      </div>
    </div>
  );
}
