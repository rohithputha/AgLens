import type {
  DesignCanvas,
  DesignExtract,
  DesignSpace,
  Message,
  OptionStatus,
  Reference,
  Task,
} from "../types/design";

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

export function normalize(text: string): string {
  if (!text) return "";
  return text.trim().toLowerCase();
}

export function createEmptyCanvas(): DesignCanvas {
  return {
    problem_statement: "",
    active_option_id: undefined,
    options: [],
    decisions: [],
    constraints: [],
    open_questions: [],
    references: [],
  };
}

export function createEmptyExtract(): DesignExtract {
  return {
    problem_statement_update: null,
    new_options: [],
    update_options: [],
    option_status_changes: [],
    new_decisions: [],
    update_decisions: [],
    new_constraints: [],
    new_open_questions: [],
    resolved_questions: [],
  };
}

export function createNewSpace(title = "Untitled Design"): DesignSpace {
  const timestamp = nowIso();
  return {
    id: newId(),
    title,
    created_at: timestamp,
    updated_at: timestamp,
    status: "exploring",
    conversation: [],
    design_canvas: createEmptyCanvas(),
    outputs: {},
    usage_history: [],
    extraction_failures: 0,
    extraction_failure_log: [],
  };
}

export function statusCycle(status: OptionStatus): OptionStatus {
  if (status === "considering") {
    return "selected";
  }
  if (status === "selected") {
    return "rejected";
  }
  return "considering";
}

export function reorder<T>(items: T[], index: number, direction: "up" | "down"): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || index >= items.length || target >= items.length) {
    return items;
  }

  const cloned = [...items];
  [cloned[index], cloned[target]] = [cloned[target], cloned[index]];
  return cloned;
}

export function sampleSpace(): DesignSpace {
  const space = createNewSpace("Sample: Real-time Notifications");

  const conversation: Message[] = [
    {
      id: newId(),
      role: "user",
      content:
        "I need real-time notifications in our Node.js app on AWS. We run behind nginx and use PostgreSQL.",
      timestamp: nowIso(),
      extracted_elements: [],
    },
    {
      id: newId(),
      role: "assistant",
      content:
        "We should compare WebSockets, SSE, and long polling first. Given bidirectional needs, WebSockets are likely best.",
      timestamp: nowIso(),
      extracted_elements: [],
    },
  ];

  const references: Reference[] = [
    {
      id: newId(),
      type: "code_snippet",
      label: "Current nginx.conf",
      content: "location /api { proxy_pass http://app; }",
    },
  ];

  const tasks: Task[] = [
    {
      id: newId(),
      title: "Set up WebSocket gateway",
      description: "Add WebSocket endpoint and connection lifecycle handling.",
      context: "Decision: WebSockets selected for bidirectional communication.",
      files_components: ["src/server/ws.ts", "src/server/routes.ts"],
      acceptance_criteria: ["Clients connect to /ws", "Heartbeat handles stale sockets"],
      depends_on: [],
      related_decisions: [],
    },
  ];

  const websocketOptionId = newId();
  const sseOptionId = newId();
  const decisionId = newId();
  const constraintId = newId();
  const questionId = newId();
  const referenceId = references[0]?.id ?? newId();

  space.conversation = conversation;
  space.design_canvas = {
    problem_statement:
      "Design and implement real-time notifications for a Node.js AWS deployment while respecting existing nginx ingress behavior.",
    active_option_id: websocketOptionId,
    options: [
      {
        id: websocketOptionId,
        title: "WebSockets",
        description: "Bidirectional channel for live notifications and acknowledgements.",
        status: "selected",
        branch_score: 8,
        source_messages: [{ message_id: conversation[1].id }],
      },
      {
        id: sseOptionId,
        title: "SSE",
        description: "Server push only; simpler infra but unidirectional.",
        status: "rejected",
        rejection_reason: "Need bidirectional communication.",
        branch_score: 4,
        source_messages: [{ message_id: conversation[1].id }],
      },
    ],
    decisions: [
      {
        id: decisionId,
        title: "Use WebSockets",
        reasoning: "Required for bidirectional updates and realtime ack paths.",
        trade_offs: "Higher operational complexity than SSE.",
        option_id: websocketOptionId,
        source_messages: [{ message_id: conversation[1].id }],
      },
    ],
    constraints: [
      {
        id: constraintId,
        description: "nginx config must support upgrade headers",
        source: "code",
        decision_id: decisionId,
        source_messages: [{ message_id: conversation[1].id }],
      },
    ],
    open_questions: [
      {
        id: questionId,
        question: "How should reconnection backoff work?",
        context: "Need client resilience strategy for dropped sockets.",
        status: "open",
        decision_id: decisionId,
      },
    ],
    references: references.map((reference) =>
      reference.id === referenceId ? { ...reference, decision_id: decisionId } : reference,
    ),
  };
  space.outputs = {
    design_doc: "# Sample Design\n\nThis is a sample crystallized output.",
    tasks,
    generated_at: nowIso(),
  };

  return space;
}
