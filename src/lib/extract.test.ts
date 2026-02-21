import { describe, expect, it } from "vitest";
import { isNearDuplicate, parseAssistantExtract, stripExtractTail } from "./extract";

describe("extract helpers", () => {
  it("parses valid design extraction block", () => {
    const input = `Answer text\n<design_extract>{"problem_statement_update":null,"new_options":[],"option_status_changes":[],"new_decisions":[],"new_constraints":[],"new_open_questions":[],"resolved_questions":[]}</design_extract>`;

    const parsed = parseAssistantExtract(input);
    expect(parsed.text).toBe("Answer text");
    expect(parsed.parse_error).toBeNull();
    expect(parsed.extract.new_decisions).toHaveLength(0);
  });

  it("returns parse error for malformed JSON", () => {
    const input = `Answer text\n<design_extract>{oops}</design_extract>`;
    const parsed = parseAssistantExtract(input);
    expect(parsed.parse_error).not.toBeNull();
    expect(parsed.text).toBe("Answer text");
  });

  it("strips extraction tail during streaming", () => {
    const partial = "Visible response<design_extract>{\"new_decisions\":[]";
    expect(stripExtractTail(partial)).toBe("Visible response");
  });

  it("detects near duplicates", () => {
    expect(isNearDuplicate("Use Redis Pub/Sub", "Redis pubsub approach")).toBe(true);
    expect(isNearDuplicate("Use WebSockets", "Use Kafka")).toBe(false);
  });
});
