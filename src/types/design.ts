export type SpaceStatus = "exploring" | "converging" | "crystallized";
export type OptionStatus = "considering" | "selected" | "rejected" | "finished";
export type ConstraintSource = "conversation" | "code" | "external";
export type QuestionStatus = "open" | "resolved";

export interface MessageRef {
  message_id: string;
}

export interface ElementRef {
  type: "option" | "decision" | "constraint" | "open_question";
  id: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  extracted_elements: ElementRef[];
}

export interface Option {
  id: string;
  title: string;
  description: string;
  status: OptionStatus;
  rejection_reason?: string;
  finish_reason?: string;
  branch_score?: number;
  source_messages: MessageRef[];
}

export interface Decision {
  id: string;
  title: string;
  reasoning: string;
  trade_offs: string;
  option_id?: string;
  source_messages: MessageRef[];
}

export interface Constraint {
  id: string;
  description: string;
  source: ConstraintSource;
  decision_id?: string;
  source_messages: MessageRef[];
}

export interface OpenQuestion {
  id: string;
  question: string;
  context: string;
  status: QuestionStatus;
  decision_id?: string;
}

export interface Reference {
  id: string;
  type: "code_snippet" | "url" | "paste";
  content: string;
  label: string;
  decision_id?: string;
}

export interface DesignCanvas {
  problem_statement: string;
  active_option_id?: string;
  options: Option[];
  decisions: Decision[];
  constraints: Constraint[];
  open_questions: OpenQuestion[];
  references: Reference[];
}

export interface Task {
  id: string;
  title: string;
  description: string;
  context: string;
  files_components: string[];
  acceptance_criteria: string[];
  depends_on: string[];
  related_decisions: string[];
}

export interface Outputs {
  design_doc?: string;
  tasks?: Task[];
  generated_at?: string;
}

export interface UsageRecord {
  at: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  estimated: boolean;
  cost_usd: number;
}

export interface ExtractionFailure {
  at: string;
  message_id: string;
  reason: string;
  raw_excerpt: string;
}

export interface DesignSpace {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: SpaceStatus;
  conversation: Message[];
  design_canvas: DesignCanvas;
  outputs: Outputs;
  usage_history: UsageRecord[];
  extraction_failures: number;
  extraction_failure_log: ExtractionFailure[];
}

export interface DesignExtract {
  problem_statement_update: string | null;
  new_options: Array<{
    title: string;
    description: string;
    status: OptionStatus;
  }>;
  update_options: Array<{
    id: string;
    description: string;
  }>;
  option_status_changes: Array<{
    option_title: string;
    new_status: Extract<OptionStatus, "selected" | "rejected">;
    reason?: string;
  }>;
  new_decisions: Array<{
    title: string;
    reasoning: string;
    trade_offs: string;
  }>;
  update_decisions: Array<{
    id: string;
    reasoning?: string;
    trade_offs?: string;
    replace?: boolean; // if true, fully replaces the field instead of appending
  }>;
  new_constraints: Array<{
    description: string;
    source: ConstraintSource;
  }>;
  update_constraints: Array<{
    id: string;
    description: string; // replaces the constraint description
  }>;
  new_open_questions: Array<{
    question: string;
    context: string;
  }>;
  resolved_questions: Array<{
    question: string;
    resolution?: string;
  }>;
  // LLM-controlled deletions and branch lifecycle
  finish_branches: Array<{
    option_title: string;
    reason?: string;
  }>;
  delete_decisions: Array<{ id: string }>;
  delete_constraints: Array<{ id: string }>;
  delete_open_questions: Array<{ id: string }>;
  // Replace a branch's entire todo list (markdown checklist)
  set_branch_todos: Array<{
    option_id: string;
    todos: string; // full replacement markdown checklist
  }>;
}

export interface ExtractParseResult {
  text: string;
  extract: DesignExtract;
  parse_error: string | null;
  raw_extract: string;
}

export interface CrystallizeResult {
  design_doc: string;
  tasks: Task[];
}
