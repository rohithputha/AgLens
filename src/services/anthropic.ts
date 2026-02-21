import { createEmptyExtract } from "../lib/design";
import { parseAssistantExtract, stripExtractTail } from "../lib/extract";
import type {
  CrystallizeResult,
  DesignCanvas,
  DesignExtract,
  DesignSpace,
  Message,
} from "../types/design";

const DIRECT_ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const PROXY_URL = import.meta.env.VITE_ANTHROPIC_PROXY_URL || "/api/anthropic";
const USE_PROXY = import.meta.env.VITE_USE_PROXY === "true";

interface SendConversationInput {
  apiKey: string;
  model: string;
  canvas: DesignCanvas;
  conversation: Message[];
  onTextDelta?: (visibleText: string) => void;
}

interface ConversationResult {
  text: string;
  extract: DesignExtract;
  parse_error: string | null;
  raw_extract: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  } | null;
}

interface CrystallizeInput {
  apiKey: string;
  model: string;
  space: DesignSpace;
}

function baseHeaders(apiKey: string): HeadersInit {
  return {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

function endpointUrl(): string {
  return USE_PROXY ? PROXY_URL : DIRECT_ANTHROPIC_URL;
}

function branchContext(canvas: DesignCanvas): {
  active_option: {
    id: string;
    title: string;
    decisions: Array<{ id: string; title: string }>;
    constraints: string[];
    open_questions: string[];
  } | null;
  inactive_options: Array<{
    id: string;
    title: string;
    status: string;
    key_tradeoff: string;
  }>;
} {
  const active = canvas.options.find((option) => option.id === canvas.active_option_id) ?? null;
  if (!active) {
    return {
      active_option: null,
      inactive_options: canvas.options.map((option) => ({
        id: option.id,
        title: option.title,
        status: option.status,
        key_tradeoff: (option.description ?? "").slice(0, 120),
      })),
    };
  }

  const activeDecisions = canvas.decisions.filter((decision) => decision.option_id === active.id);
  const activeDecisionIds = new Set(activeDecisions.map((decision) => decision.id));
  const linkedConstraints = canvas.constraints
    .filter(
      (constraint) =>
        constraint.decision_id === active.id ||
        (constraint.decision_id ? activeDecisionIds.has(constraint.decision_id) : false),
    )
    .map((constraint) => constraint.description);
  const linkedQuestions = canvas.open_questions
    .filter(
      (question) =>
        question.status === "open" &&
        (question.decision_id === active.id ||
          (question.decision_id ? activeDecisionIds.has(question.decision_id) : false)),
    )
    .map((question) => question.question);

  return {
    active_option: {
      id: active.id,
      title: active.title,
      decisions: activeDecisions.map((decision) => ({ id: decision.id, title: decision.title })),
      constraints: linkedConstraints,
      open_questions: linkedQuestions,
    },
    inactive_options: canvas.options
      .filter((option) => option.id !== active.id)
      .map((option) => ({
        id: option.id,
        title: option.title,
        status: option.status,
        key_tradeoff: (option.description ?? "").slice(0, 120),
      })),
  };
}

// Strip high-token fields that are not useful for conversation context
function canvasForPrompt(canvas: DesignCanvas) {
  return {
    problem_statement: canvas.problem_statement,
    active_option_id: canvas.active_option_id,
    options: canvas.options.map((o) => ({
      id: o.id, title: o.title, description: o.description, status: o.status,
    })),
    decisions: canvas.decisions.map((d) => ({
      id: d.id, title: d.title, reasoning: d.reasoning, trade_offs: d.trade_offs, option_id: d.option_id,
    })),
    constraints: canvas.constraints.map((c) => ({ id: c.id, description: c.description, decision_id: c.decision_id })),
    open_questions: canvas.open_questions.map((q) => ({ id: q.id, question: q.question, status: q.status, decision_id: q.decision_id })),
  };
}

function buildConversationPrompt(canvas: DesignCanvas): string {
  const branch = branchContext(canvas);
  return `You are ArchLens, an expert software architect and design thinking partner.

Behavior:
- Be direct, opinionated, and specific.
- Explain trade-offs honestly.
- Ask clarifying questions when the requirement is underspecified.
- Keep responses practical and concise.
- Prioritize the ACTIVE branch when giving implementation guidance.

Canvas:${JSON.stringify(canvasForPrompt(canvas))}

Branch context:${JSON.stringify(branch)}

## BRANCH MODEL — READ THIS CAREFULLY

Each branch (option) is an **approach** to the design problem. Its description is a **markdown checklist** — a todo list of questions/tasks that need to be resolved for that approach to be understood and validated. Example:
\`\`\`
- [ ] How does nginx handle WebSocket upgrades?
- [ ] What's the operational cost for the team?
- [x] Is bidirectional communication required?
\`\`\`

Your job is to:
1. Populate a branch's todo list when it's created or underspecified.
2. As the conversation resolves questions, **tick them off** by replacing \`- [ ]\` with \`- [x]\`.
3. Add new questions to the list as they surface.
4. When all (or most) todos are resolved and the branch is well-understood, you may FINISH it.

Always update the branch description via \`set_branch_todos\` — use the actual branch \`id\` from the canvas.

After every response append a JSON block wrapped in <design_extract> tags.
Use this format exactly:
<design_extract>
{"problem_statement_update":null,"new_options":[],"update_options":[],"option_status_changes":[],"new_decisions":[],"update_decisions":[],"new_constraints":[],"new_open_questions":[],"resolved_questions":[],"finish_branches":[],"delete_decisions":[],"delete_constraints":[],"delete_open_questions":[],"set_branch_todos":[]}
</design_extract>

Be AGGRESSIVE. Every turn should populate multiple fields.

WHEN TO USE EACH FIELD:

new_options — Add a branch whenever a distinct approach surfaces, even hypothetically.
  triggers: "we could use X", "another approach is Y", "what about Z"
  include: title (short name) + description (a markdown checklist of 2–4 open questions to explore for this approach, formatted as "- [ ] question")

set_branch_todos — Replace a branch's entire todo checklist description.
  use the branch's id from the canvas. Write out the FULL updated list each time.
  triggers: resolving a question (change [ ] to [x]), adding a new question, updating the list after discussion
  example: {"option_id":"abc-123","todos":"- [x] Is bidirectional needed?\\n- [ ] Nginx upgrade support?\\n- [ ] Team familiarity with WS?"}

finish_branches — Mark a branch as finished (moves to collapsed Finished section).
  triggers: all todos resolved, user says "done with this", approach fully explored
  match by option_title. include optional reason.

update_options — Append new details to an EXISTING branch's description (use ONLY for non-checklist notes; prefer set_branch_todos for todo updates).

option_status_changes — Change status to "selected" or "rejected".
  "selected": user picks it or commits to it
  "rejected": user rules it out

new_decisions — Add whenever something SETTLED this turn.
  triggers: "let's use X", "we'll go with Y", user confirms approach
  include: title + reasoning + trade_offs

update_decisions — Append context to an EXISTING decision.

delete_decisions / delete_constraints / delete_open_questions — Remove stale items by ID.
  triggers: user says "remove that", item is superseded, approach was rejected

new_constraints — Hard requirements: "must", "can't", "required", "budget is X"

new_open_questions — Important unresolved question that would change the design.

resolved_questions — Mark a question resolved when this turn's conversation settles it.

problem_statement_update — Restate the problem only if it materially changes.

Do NOT re-add items already in the canvas. Do NOT leave everything empty — if you said something useful, capture it.`;
}

function buildCrystallizePrompt(space: DesignSpace): string {
  const branch = branchContext(space.design_canvas);
  const compactSpace = { ...space, design_canvas: canvasForPrompt(space.design_canvas) };
  return `You are generating final artifacts from an architectural design session.

Input:${JSON.stringify(compactSpace)}

Branch context:${JSON.stringify(branch)}

Return exactly two outputs:
1) Design document markdown.
2) Ordered implementation tasks with architecture context.

Requirements:
- Use ACTIVE branch as default implementation plan.
- Include a short "Branch Comparison" appendix in the design_doc for inactive branches and why they were not chosen.
- Ensure task contexts reference branch decisions and node constraints.

Output format must be:
<crystallize_output>
{
  "design_doc": "markdown string",
  "tasks": [
    {
      "title": "...",
      "description": "...",
      "context": "...",
      "files_components": ["..."],
      "acceptance_criteria": ["..."],
      "depends_on": ["task title"],
      "related_decisions": ["decision title"]
    }
  ]
}
</crystallize_output>

No additional JSON keys.`;
}

function parseCrystallize(raw: string): CrystallizeResult {
  const match = raw.match(/<crystallize_output>\s*([\s\S]*?)\s*<\/crystallize_output>/i);
  if (!match) {
    return {
      design_doc: raw.trim(),
      tasks: [],
    };
  }

  try {
    const parsed = JSON.parse(match[1]) as {
      design_doc?: string;
      tasks?: CrystallizeResult["tasks"];
    };
    return {
      design_doc: parsed.design_doc?.trim() ?? "",
      tasks: Array.isArray(parsed.tasks)
        ? parsed.tasks.map((task) => ({
          id: crypto.randomUUID(),
          title: task.title,
          description: task.description,
          context: task.context,
          files_components: task.files_components ?? [],
          acceptance_criteria: task.acceptance_criteria ?? [],
          depends_on: task.depends_on ?? [],
          related_decisions: task.related_decisions ?? [],
        }))
        : [],
    };
  } catch {
    return {
      design_doc: raw.replace(match[0], "").trim(),
      tasks: [],
    };
  }
}

async function readNonStreamingText(response: Response): Promise<{
  text: string;
  usage: { input_tokens: number; output_tokens: number } | null;
}> {
  const data = (await response.json()) as {
    content: Array<{ type: string; text?: string }>;
    usage?: { input_tokens: number; output_tokens: number };
  };

  const text = data.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("\n");

  return {
    text,
    usage:
      data.usage && typeof data.usage.input_tokens === "number" && typeof data.usage.output_tokens === "number"
        ? data.usage
        : null,
  };
}

export async function streamConversation(input: SendConversationInput): Promise<ConversationResult> {
  const payload = {
    model: input.model,
    max_tokens: 1400,
    stream: true,
    system: buildConversationPrompt(input.canvas),
    messages: (() => {
      // Take last 10, then drop leading assistant messages so we always start with "user".
      let msgs = input.conversation.slice(-10);
      while (msgs.length > 0 && msgs[0].role !== "user") msgs = msgs.slice(1);
      return msgs.map((m) => ({ role: m.role, content: m.content ?? "" }));
    })(),
  };

  const response = await fetch(endpointUrl(), {
    method: "POST",
    headers: baseHeaders(input.apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`Claude API error (${response.status}): ${reason}`);
  }

  if (!response.body) {
    const fallback = await readNonStreamingText(response);
    const parsed = parseAssistantExtract(fallback.text);
    return {
      text: parsed.text,
      extract: parsed.extract,
      parse_error: parsed.parse_error,
      raw_extract: parsed.raw_extract,
      usage: fallback.usage,
    };
  }

  const decoder = new TextDecoder();
  const reader = response.body.getReader();

  let buffer = "";
  let rawAssistantText = "";
  let usage: { input_tokens: number; output_tokens: number } | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data:")) {
        continue;
      }
      const payloadText = line.slice(5).trim();
      if (!payloadText || payloadText === "[DONE]") {
        continue;
      }

      try {
        const event = JSON.parse(payloadText) as {
          type?: string;
          delta?: { type?: string; text?: string };
          usage?: { input_tokens?: number; output_tokens?: number };
          message?: { usage?: { input_tokens?: number; output_tokens?: number } };
        };

        if (event.type === "message_start" && event.message?.usage?.input_tokens !== undefined) {
          usage = {
            input_tokens: event.message.usage.input_tokens ?? 0,
            output_tokens: event.message.usage.output_tokens ?? 0,
          };
        }

        if (event.type === "message_delta" && event.usage?.output_tokens !== undefined) {
          usage = {
            input_tokens: usage?.input_tokens ?? event.usage.input_tokens ?? 0,
            output_tokens: event.usage.output_tokens,
          };
        }

        if (event.type === "content_block_delta" && event.delta?.type === "text_delta" && event.delta.text) {
          rawAssistantText += event.delta.text;
          input.onTextDelta?.(stripExtractTail(rawAssistantText));
        }
      } catch {
        // Ignore malformed stream event line and continue.
      }
    }
  }

  const parsed = parseAssistantExtract(rawAssistantText);
  return {
    text: parsed.text,
    extract: parsed.extract,
    parse_error: parsed.parse_error,
    raw_extract: parsed.raw_extract,
    usage,
  };
}

export async function crystallizeDesign(input: CrystallizeInput): Promise<CrystallizeResult> {
  const payload = {
    model: input.model,
    max_tokens: 2800,
    system: buildCrystallizePrompt(input.space),
    messages: [
      {
        role: "user",
        content: "Generate crystallized outputs now.",
      },
    ],
  };

  const response = await fetch(endpointUrl(), {
    method: "POST",
    headers: baseHeaders(input.apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(`Crystallize API error (${response.status}): ${reason}`);
  }

  const parsed = await readNonStreamingText(response);
  return parseCrystallize(parsed.text);
}

export const _internal = {
  parseCrystallize,
  buildConversationPrompt,
  buildCrystallizePrompt,
  parseAssistantExtract,
  createEmptyExtract,
};
