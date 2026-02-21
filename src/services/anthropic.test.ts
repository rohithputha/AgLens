import { describe, expect, it } from "vitest";
import { _internal } from "./anthropic";

describe("anthropic parsing", () => {
  it("parses crystallize output json", () => {
    const raw = `<crystallize_output>{"design_doc":"# Doc","tasks":[{"title":"Task A","description":"Do A","context":"Ctx","files_components":["src/a.ts"],"acceptance_criteria":["A"],"depends_on":[],"related_decisions":[]}]}</crystallize_output>`;
    const result = _internal.parseCrystallize(raw);
    expect(result.design_doc).toContain("# Doc");
    expect(result.tasks).toHaveLength(1);
    expect(result.tasks[0].title).toBe("Task A");
  });

  it("falls back when crystallize tags missing", () => {
    const raw = "# Markdown fallback";
    const result = _internal.parseCrystallize(raw);
    expect(result.design_doc).toBe(raw);
    expect(result.tasks).toHaveLength(0);
  });
});
