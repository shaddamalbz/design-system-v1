import type { OrgChartNode } from "../../ds";

/* Fake company of any size, deterministic (same seed → same people). */

const FIRST = [
  "Ada", "Alan", "Amara", "Ben", "Chen", "Dara", "Diego", "Elif", "Emeka", "Farah", "Grace", "Hana", "Ibrahim", "Ines",
  "Jonas", "Kai", "Lena", "Leo", "Maya", "Mateo", "Nadia", "Noah", "Olu", "Priya", "Quinn", "Rafael", "Rin", "Sami",
  "Sofia", "Tariq", "Uma", "Valentina", "Wei", "Xavier", "Yara", "Yusuf", "Zainab", "Zoe", "Arjun", "Bea",
];
const LAST = [
  "Abe", "Bauer", "Costa", "Dube", "Eriksen", "Fischer", "Garcia", "Haddad", "Ito", "Jansen", "Kowalski", "Lindqvist",
  "Mensah", "Nakamura", "Okafor", "Petrov", "Quispe", "Rossi", "Santos", "Tanaka", "Usman", "Varga", "Wang", "Xu",
  "Yilmaz", "Zhou", "Adeyemi", "Bianchi", "Chowdhury", "Dlamini", "Novak", "Moreau",
];
const DEPARTMENTS = ["Engineering", "Design", "Product", "Sales", "Marketing", "Finance", "People", "Operations"];
const TITLES = ["VP", "Director", "Senior Manager", "Manager", "Team Lead", "Lead", "Senior", ""];
const ROLE: Record<string, string> = {
  Engineering: "Engineer", Design: "Designer", Product: "Product Manager", Sales: "Account Executive",
  Marketing: "Marketer", Finance: "Analyst", People: "People Partner", Operations: "Specialist",
};

/** Small seeded PRNG (mulberry32). */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Breadth-first: everyone above the bottom level manages 2–7 people (8 departments under the CEO). */
export function generateOrg(count: number, seed = 7): OrgChartNode[] {
  const random = rng(seed);
  const pick = <T,>(list: T[]) => list[Math.floor(random() * list.length)];
  const nodes: OrgChartNode[] = [{ id: "0", parentId: null, name: "Morgan Reyes", title: "Chief Executive Officer", color: "var(--gray-9)" }];
  const dept: number[] = [-1];
  const depth: number[] = [0];
  let head = 0;
  while (nodes.length < count && head < nodes.length) {
    const parent = head++;
    const reports = parent === 0 ? DEPARTMENTS.length : 2 + Math.floor(random() * 6);
    for (let r = 0; r < reports && nodes.length < count; r++) {
      const i = nodes.length;
      const d = parent === 0 ? r : dept[parent];
      const lvl = depth[parent] + 1;
      const department = DEPARTMENTS[d];
      const rank = TITLES[Math.min(lvl - 1, TITLES.length - 1)];
      // "Director, Sales" for managers, "Senior Designer" for individual contributors
      const title =
        lvl === 1
          ? `VP of ${department}`
          : rank === ""
            ? ROLE[department]
            : rank === "Lead" || rank === "Senior"
              ? `${rank} ${ROLE[department]}`
              : `${rank}, ${department}`;
      nodes.push({
        id: String(i),
        parentId: String(parent),
        name: `${pick(FIRST)} ${pick(LAST)}`,
        title,
        color: `var(--chart-${d + 1})`,
      });
      dept.push(d);
      depth.push(lvl);
    }
  }
  return nodes;
}
