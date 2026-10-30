/* Self-check for the CMS presentation helpers. Run: npx tsx scripts/check-portfolio.ts */
import assert from "node:assert/strict";
import {
  clean,
  formatDate,
  githubLabel,
  hasCaseStudy,
  placeLabel,
  placementRank,
  recognitionFor,
  shortEvent,
  stripEmoji,
} from "../src/lib/portfolio";
import type { Achievement, Project } from "../src/types";

const ach = (result: string, title = "Suraksha360", extra: Partial<Achievement> = {}): Achievement => ({
  id: result,
  event: "UDAAN 2025 — Project Expo (IOE Paschimanchal Campus, WRC)",
  title,
  year: "2025",
  result,
  detail: "",
  ...extra,
});

// dates as the admin panel stores them
assert.equal(formatDate("2025-02-07"), "7 Feb 2025");
assert.equal(formatDate("2026-01-28,29"), "28–29 Jan 2026");
assert.equal(formatDate("2026-07-23,24,25"), "23–25 Jul 2026");
assert.equal(formatDate("2025"), "2025");
assert.equal(formatDate(undefined), "");

// placements: wording varies per certificate
assert.equal(placementRank(ach("1st Position")), 1);
assert.equal(placementRank(ach("1st Place")), 1);
assert.equal(placementRank(ach("First Runner-Up")), 2);
assert.equal(placementRank(ach("People's Choice Award")), 4);
assert.equal(placementRank(ach("Consolation")), 5);
assert.equal(placementRank(ach("Participant")), Number.POSITIVE_INFINITY);
assert.equal(placementRank(ach("Anything", "x", { rank: "3" })), 3);
assert.equal(placeLabel(ach("First Runner-Up")), "1st runner-up");
assert.equal(shortEvent("UDAAN 2025 — Project Expo (IOE Paschimanchal Campus, WRC)"), "UDAAN 2025");
assert.equal(shortEvent("GCES IT Expo 2026"), "GCES IT Expo 2026");

// content cleanup
assert.equal(clean("Built for WT competitions[cite: 1, 2]. Fast."), "Built for WT competitions. Fast.");
assert.equal(stripEmoji("🏆 Winner — UDAAN\n📜 Certificate"), "Winner — UDAAN\nCertificate");

const project = (p: Partial<Project>): Project => ({
  id: "x", title: "Suraksha360", tagline: "", category: "", year: "2025", status: "", tech: [], description: "", ...p,
});
assert.equal(hasCaseStudy(project({ caseStudy: {} as Project["caseStudy"] })), false);
assert.equal(hasCaseStudy(project({ caseStudy: { problem: ["p"], solution: [] } })), true);

// "Team Suraksha360" counts for Suraksha360; unrelated titles don't
const rec = recognitionFor(project({}), [ach("1st", "Team Suraksha360"), ach("1st", "Volunteer")]);
assert.deepEqual(rec.map((a) => a.title), ["Team Suraksha360"]);

assert.equal(githubLabel("https://github.com/TheRowKneet68"), "GitHub profile");
assert.equal(githubLabel("https://github.com/TheRowKneet68/suraksha360"), "Source code");

// chart data: category -> field grouping, per-year counts with gap years, stat parsing
import("../src/lib/stats").then(({ fieldOf, fieldOfProject, niceScale, parseStat, projectsByYear }) => {
  assert.equal(fieldOf("IoT & Security").key, "embedded"); // IoT wins over "security"
  assert.equal(fieldOf("web, sports-tech").key, "software");
  assert.equal(fieldOf("Computer Vision").key, "robotics");
  assert.equal(fieldOf("AI & Health").key, "ai");
  assert.equal(fieldOf("Security").key, "security");
  assert.equal(fieldOf("Civil").key, "other");

  const rows = projectsByYear([
    project({ id: "a", year: "2022", category: "Hardware" }),
    project({ id: "b", year: "2024", category: "Web" }),
    project({ id: "c", year: "2024", category: "Hardware" }),
  ]);
  assert.deepEqual(rows.map((r) => [r.year, r.total]), [[2022, 1], [2023, 0], [2024, 2]]);
  assert.equal(rows[2]?.counts.embedded, 1);

  assert.deepEqual(parseStat("39+"), { num: 39, suffix: "+" });
  assert.deepEqual(parseStat("3rd DAN"), { num: null, suffix: "3rd DAN" });
  assert.deepEqual(parseStat("∞"), { num: null, suffix: "∞" });
  assert.deepEqual(niceScale(17), { max: 20, step: 5 });

  // explicit field from /admin beats the category guess
  assert.equal(fieldOfProject({ category: "Hardware", field: "software" }).key, "software");
  assert.equal(fieldOfProject({ category: "Hardware", field: "nonsense" }).key, "embedded");

  return Promise.all([import("../src/lib/portfolio"), import("../src/lib/diagrams")]).then(([pf, dg]) => {
    assert.equal(pf.formatMonth("2023-06"), "Jun 2023");
    assert.equal(pf.formatMonth("2024"), "2024");
    assert.equal(pf.dateRange("2023-06", "2024-02"), "Jun 2023 – Feb 2024");
    assert.equal(pf.dateRange("2024-01"), "Since Jan 2024");
    assert.equal(pf.dateRange(undefined, undefined), "");

    // a saved diagram wins; an empty one falls back to the built-in default
    const own = { caption: "x", lanes: [{ name: "a", nodes: [{ name: "n" }], links: [] }] };
    assert.equal(dg.diagramFor(project({ id: "gravas", diagram: own })), own);
    assert.equal(dg.diagramFor(project({ id: "gravas", diagram: { caption: "", lanes: [] } })), dg.DIAGRAMS.gravas);
    assert.equal(dg.diagramFor(project({ id: "no-such-project" })), undefined);

    console.log("portfolio helpers: all checks passed");
  });
});

// timeline spans: exact months, year-only projects, still-running projects
import("../src/lib/stats").then(({ projectSpans }) => {
  const now = new Date(2026, 9, 15); // Oct 2026
  const p = (x: Partial<Project>): Project => ({ id: x.title ?? "x", title: "x", tagline: "", category: "", year: "2025", status: "built", tech: [], description: "", ...x });
  const [a, b, c] = projectSpans([p({ title: "c", started: "2026-02" , status: "in development" }), p({ title: "a", started: "2023-07", finished: "2025-06" }), p({ title: "b", year: "2024" })], now);
  assert.deepEqual([a!.project.title, a!.start, a!.end, a!.approx], ["a", 2023 * 12 + 6, 2025 * 12 + 5, false]);
  assert.deepEqual([b!.project.title, b!.start, b!.end, b!.approx, b!.ongoing], ["b", 2024 * 12, 2024 * 12 + 11, true, false]);
  assert.deepEqual([c!.project.title, c!.end, c!.ongoing], ["c", 2026 * 12 + 9, true]);
  console.log("timeline spans: all checks passed");
});
