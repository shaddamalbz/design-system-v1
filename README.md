# Design System

A small, from-scratch React design system (React only, no UI libraries) plus a playground.

```
src/
  ds/                    ← the design system (copy this folder into any React project)
    tokens.css           colors (light-dark), spacing, type, radius, shadow, motion
    base.css             minimal reset + focus ring
    styles.css           ← import this once
    components/tabs/     Tabs, TabList, Tab, TabPanel
  playground/            docs + live controls (not needed in your apps)
```

## Run the playground

```
npm install
npm run dev        # http://localhost:5199
```

## Use in another React project

1. Copy `src/ds` into the project (e.g. `src/ds`).
2. Import the styles once at the root (`main.tsx`, or `app/layout.tsx` in Next.js):
   ```ts
   import "./ds/styles.css";
   ```
3. Use components:
   ```tsx
   import { Tabs, TabList, Tab, TabPanel } from "./ds";

   <Tabs defaultValue="overview">
     <TabList aria-label="Project">
       <Tab value="overview">Overview</Tab>
       <Tab value="activity">Activity</Tab>
     </TabList>
     <TabPanel value="overview">…</TabPanel>
     <TabPanel value="activity">…</TabPanel>
   </Tabs>
   ```

In Next.js App Router, add `"use client"` at the top of `Tabs.tsx`.

## Theming

No attribute → follows the OS. `data-theme="light" | "dark"` on `<html>` (or on any element, for a subtree) forces a mode.
Fonts: tokens expect Inter / JetBrains Mono and fall back to system fonts.
