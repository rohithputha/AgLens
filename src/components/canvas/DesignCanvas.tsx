import { type DragEvent, useCallback, useRef, useState } from "react";
import { useAppStore, type CanvasDropTarget } from "../../store/useAppStore";
import { parseDragPayload, setDragPayload, type CanvasSection } from "../../hooks/useDragDrop";

function extractDragText(event: DragEvent): string {
  const payload = parseDragPayload(event);
  if (payload?.kind === "message-fragment") return payload.text;
  return (event.dataTransfer.getData("text/plain") ?? "").trim();
}

// Prevent browser default "no-drop" cursor everywhere inside the canvas.
// This is critical: without it, dragging between sections or over gaps
// causes the browser to reject the drop and sometimes kill the drag session.
function allowDrop(e: React.DragEvent) {
  e.preventDefault();
}

// ── SubField ────────────────────────────────────────────────────────────────
// Collapsed "+ Label" button when empty; expands to a labeled subcard block.

function SubField({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  onDropText,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  onDropText: (text: string) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const taRef = useRef<HTMLTextAreaElement>(null);
  // expanded when: has content, focused, or being dragged over
  const expanded = focused || !!value || isDragOver;

  return (
    <div
      className={`mt-2 rounded-lg transition-all duration-150 ${
        isDragOver
          ? "bg-blue-50 ring-1 ring-blue-200 px-3 py-2"
          : expanded
          ? "bg-slate-50 px-3 py-2"
          : "border border-dashed border-slate-200 px-3 py-1.5 cursor-text hover:border-slate-300"
      }`}
      onClick={() => {
        setFocused(true);
        setTimeout(() => taRef.current?.focus(), 0);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!isDragOver) setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        const text = extractDragText(e as unknown as DragEvent);
        if (text) onDropText(text);
      }}
    >
      <span
        className={
          expanded
            ? "block text-[10px] font-medium uppercase tracking-widest text-slate-400 mb-1"
            : "text-[11px] text-slate-400"
        }
      >
        {expanded ? label : `+ ${label}`}
      </span>
      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder ?? label}
        style={{ display: expanded ? undefined : "none" }}
        className="w-full resize-none bg-transparent text-xs text-slate-600 placeholder:text-slate-300 focus:outline-none"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
      />
    </div>
  );
}

interface DesignCanvasProps {
  spaceId: string;
  onJumpToMessage: (sourceMessageIds: string[], fallbackText?: string) => void;
}

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({
  title,
  count,
  onAdd,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  onAdd?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          className="flex items-center gap-2 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 select-none">
            {title}
          </span>
          {typeof count === "number" && count > 0 && (
            <span className="text-[11px] text-slate-300">{count}</span>
          )}
        </button>
        <div className="flex items-center gap-3">
          {onAdd && open && (
            <button
              type="button"
              className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors"
              onClick={onAdd}
            >
              Add
            </button>
          )}
          <button
            type="button"
            className="text-slate-300 hover:text-slate-400 transition-colors text-[10px]"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? "▲" : "▼"}
          </button>
        </div>
      </div>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

// ── Drop hint ──────────────────────────────────────────────────────────────

function DropHint({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="mb-2 rounded-lg border border-dashed border-blue-300 bg-blue-50/50 px-3 py-2 text-[11px] text-blue-400">
      Release to add
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export function DesignCanvas({ spaceId, onJumpToMessage }: DesignCanvasProps) {
  // Use ref + state combo: ref for real-time tracking (no re-renders during drag),
  // state only updated on meaningful transitions to trigger visual hints.
  const dropSectionRef = useRef<CanvasDropTarget | null>(null);
  const [activeDropSection, setActiveDropSection] = useState<CanvasDropTarget | null>(null);
  const setDropSection = useCallback((section: CanvasDropTarget | null) => {
    if (dropSectionRef.current !== section) {
      dropSectionRef.current = section;
      setActiveDropSection(section);
    }
  }, []);

  const spaces = useAppStore((s) => s.spaces);
  const activeSpace = spaces.find((s) => s.id === spaceId);

  const setProblemStatement = useAppStore((s) => s.setProblemStatement);
  const addOption = useAppStore((s) => s.addOption);
  const updateOption = useAppStore((s) => s.updateOption);
  const deleteOption = useAppStore((s) => s.deleteOption);
  const moveOption = useAppStore((s) => s.moveOption);
  const setActiveOption = useAppStore((s) => s.setActiveOption);
  const clearActiveOption = useAppStore((s) => s.clearActiveOption);
  const promoteToDecision = useAppStore((s) => s.promoteToDecision);
  const rejectOption = useAppStore((s) => s.rejectOption);
  const cycleOptionStatus = useAppStore((s) => s.cycleOptionStatus);

  const addDecision = useAppStore((s) => s.addDecision);
  const updateDecision = useAppStore((s) => s.updateDecision);
  const deleteDecision = useAppStore((s) => s.deleteDecision);
  const reopenDecision = useAppStore((s) => s.reopenDecision);

  const addConstraint = useAppStore((s) => s.addConstraint);
  const updateConstraint = useAppStore((s) => s.updateConstraint);
  const deleteConstraint = useAppStore((s) => s.deleteConstraint);
  const moveConstraint = useAppStore((s) => s.moveConstraint);
  const linkToDecision = useAppStore((s) => s.linkToDecision);

  const addQuestion = useAppStore((s) => s.addQuestion);
  const updateQuestion = useAppStore((s) => s.updateQuestion);
  const deleteQuestion = useAppStore((s) => s.deleteQuestion);
  const moveQuestion = useAppStore((s) => s.moveQuestion);
  const toggleQuestionStatus = useAppStore((s) => s.toggleQuestionStatus);

  const updateReference = useAppStore((s) => s.updateReference);
  const deleteReference = useAppStore((s) => s.deleteReference);
  const moveReference = useAppStore((s) => s.moveReference);

  const dropTextToCanvas = useAppStore((s) => s.dropTextToCanvas);

  if (!activeSpace) return null;

  const canvas = activeSpace.design_canvas;
  const { options, decisions, constraints, open_questions: questions, references } = canvas;
  const activeOptionId = canvas.active_option_id;

  const bindableDecisions = decisions.map((d) => ({ id: d.id, label: d.title || "Untitled" }));

  // ── Drag helpers ───────────────────────────────────────────────────────

  function dropFromMessage(section: CanvasDropTarget, event: DragEvent) {
    event.preventDefault();
    setDropSection(null);
    const payload = parseDragPayload(event);
    if (payload?.kind === "message-fragment") {
      dropTextToCanvas(spaceId, section, payload.text, payload.messageId);
      return;
    }
    if (payload?.kind === "canvas-item") return;
    const plain = (event.dataTransfer.getData("text/plain") ?? "").trim();
    if (plain) dropTextToCanvas(spaceId, section, plain);
  }

  function startCanvasItemDrag(event: DragEvent, section: CanvasSection, id: string) {
    event.dataTransfer.effectAllowed = "move";
    setDragPayload(event, { kind: "canvas-item", section, id });
  }

  function startAttachableDrag(event: DragEvent, itemType: "constraint" | "question" | "reference", id: string) {
    event.dataTransfer.effectAllowed = "move";
    setDragPayload(event, { kind: "attachable", itemType, id });
  }

  function dropOnDecisionCard(event: DragEvent, decisionId: string, optionId?: string) {
    event.preventDefault();
    event.stopPropagation();
    setDropSection(null);
    const payload = parseDragPayload(event);
    if (!payload) return;
    if (payload.kind === "message-fragment") {
      // Drop onto the card body → populate the Reasoning subcard
      if (optionId) setActiveOption(spaceId, optionId);
      const decision = canvas.decisions.find((d) => d.id === decisionId);
      if (decision) {
        updateDecision(spaceId, decisionId, {
          reasoning: decision.reasoning ? `${decision.reasoning}\n${payload.text}` : payload.text,
        });
      }
      return;
    }
    if (payload.kind === "attachable") {
      linkToDecision(spaceId, { kind: payload.itemType === "question" ? "question" : payload.itemType, itemId: payload.id, decisionId });
    }
  }

  function dropOnOptionCard(event: DragEvent, optionId: string) {
    event.preventDefault();
    event.stopPropagation();
    setDropSection(null);
    const payload = parseDragPayload(event);
    // Reorder canvas items via drag
    if (payload?.kind === "canvas-item" && payload.section === "options") { moveOption(spaceId, payload.id, optionId); return; }
    if (payload?.kind === "canvas-item" && payload.section === "decisions") { updateDecision(spaceId, payload.id, { option_id: optionId }); setActiveOption(spaceId, optionId); return; }
    // Drop text onto card body → populate the Description subcard
    if (payload?.kind === "message-fragment") {
      const option = canvas.options.find((o) => o.id === optionId);
      if (option) {
        updateOption(spaceId, optionId, {
          description: option.description ? `${option.description}\n${payload.text}` : payload.text,
        });
      }
    }
  }

  function dropOnAttachableCard(event: DragEvent, itemType: "constraint" | "question" | "reference", itemId: string) {
    event.preventDefault();
    const payload = parseDragPayload(event);
    if (!payload) return;
    if (payload.kind === "attachable" && payload.itemType === itemType) {
      if (itemType === "constraint") moveConstraint(spaceId, payload.id, itemId);
      else if (itemType === "question") moveQuestion(spaceId, payload.id, itemId);
      else moveReference(spaceId, payload.id, itemId);
      return;
    }
    if (payload.kind === "message-fragment") {
      const target: CanvasDropTarget = itemType === "constraint" ? "constraints" : itemType === "question" ? "open_questions" : "references";
      dropTextToCanvas(spaceId, target, payload.text, payload.messageId);
    }
  }

  const consideringOptions = options.filter((o) => o.status === "considering");
  const rejectedOptions = options.filter((o) => o.status === "rejected");

  return (
    <section
      className="min-h-0 flex-1 overflow-auto bg-white p-6"
      onDragOver={allowDrop}
      onDrop={(e) => { e.preventDefault(); setDropSection(null); }}
      onDragEnd={() => setDropSection(null)}
    >
      <div className="mx-auto max-w-2xl space-y-8 pb-12">

        {/* ── PROBLEM ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDropSection("problem_statement"); }}
          onDragLeave={() => setDropSection(null)}
          onDrop={(e) => dropFromMessage("problem_statement", e)}
        >
          <Section title="Problem">
            <DropHint active={activeDropSection === "problem_statement"} />
            <textarea
              value={canvas.problem_statement}
              onChange={(e) => setProblemStatement(spaceId, e.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:bg-white focus:outline-none focus:ring-0 transition-colors"
              placeholder="What problem are you solving?"
            />
          </Section>
        </div>

        {/* ── BRANCHES ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDropSection("options"); }}
          onDragLeave={() => setDropSection(null)}
          onDrop={(e) => dropFromMessage("options", e)}
        >
          <Section title="Branches" count={consideringOptions.length} onAdd={() => addOption(spaceId)}>
            <DropHint active={activeDropSection === "options"} />
            {consideringOptions.map((option) => {
              const isFocused = option.id === activeOptionId;
              return (
                <div
                  key={option.id}
                  className={`group relative rounded-xl border bg-white transition-all duration-200 ${
                    isFocused
                      ? "border-blue-200 shadow-md shadow-blue-100/60"
                      : "border-slate-100 hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/80"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropOnOptionCard(e, option.id)}
                >
                  {isFocused && (
                    <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-blue-400" />
                  )}
                  <div className="px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      {isFocused ? (
                        <span className="text-[11px] font-medium text-blue-500">Focused</span>
                      ) : (
                        <span className="text-[11px] text-slate-300">Branch</span>
                      )}
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isFocused ? (
                          <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => clearActiveOption(spaceId)}>
                            Unfocus
                          </button>
                        ) : (
                          <button type="button" className="text-[11px] text-blue-500 hover:text-blue-700 transition-colors" onClick={() => setActiveOption(spaceId, option.id)}>
                            Focus
                          </button>
                        )}
                        <button type="button" className="text-[11px] text-emerald-600 hover:text-emerald-800 transition-colors" onClick={() => promoteToDecision(spaceId, option.id)}>
                          Decide
                        </button>
                        <button type="button" className="text-[11px] text-slate-400 hover:text-red-500 transition-colors" onClick={() => rejectOption(spaceId, option.id)}>
                          Reject
                        </button>
                        <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 transition-colors" onClick={() => deleteOption(spaceId, option.id)}>
                          ✕
                        </button>
                      </div>
                    </div>
                    <input
                      value={option.title}
                      onChange={(e) => updateOption(spaceId, option.id, { title: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none"
                      placeholder="Branch name"
                      draggable
                      onDragStart={(e) => startCanvasItemDrag(e, "options", option.id)}
                    />
                    <SubField
                      label="Description"
                      value={option.description}
                      onChange={(v) => updateOption(spaceId, option.id, { description: v })}
                      onDropText={(text) => updateOption(spaceId, option.id, { description: option.description ? `${option.description}\n${text}` : text })}
                    />
                  </div>
                </div>
              );
            })}
            {consideringOptions.length === 0 && (
              <p className="text-[12px] text-slate-300 py-1 px-1">No branches yet. Drop a message or click Add.</p>
            )}
          </Section>
        </div>

        {/* ── REJECTED ── */}
        {rejectedOptions.length > 0 && (
          <details className="group/rej">
            <summary className="cursor-pointer list-none flex items-center gap-2 select-none">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-300 group-open/rej:text-slate-400 transition-colors">
                Rejected
              </span>
              <span className="text-[11px] text-slate-300">{rejectedOptions.length}</span>
            </summary>
            <div className="mt-2 space-y-1.5">
              {rejectedOptions.map((option) => (
                <div key={option.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="text-sm text-slate-400 line-through">{option.title || "Untitled"}</span>
                  <div className="flex gap-3">
                    <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => cycleOptionStatus(spaceId, option.id)}>
                      Restore
                    </button>
                    <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 transition-colors" onClick={() => deleteOption(spaceId, option.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>
        )}

        {/* ── DECISIONS ── */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDropSection("decisions"); }}
          onDragLeave={() => setDropSection(null)}
          onDrop={(e) => dropFromMessage("decisions", e)}
        >
          <Section title="Decisions" count={decisions.length} onAdd={() => addDecision(spaceId)}>
            <DropHint active={activeDropSection === "decisions"} />
            {decisions.map((decision) => {
              const branch = options.find((o) => o.id === decision.option_id);
              const linkedC = constraints.filter((c) => c.decision_id === decision.id).length;
              const linkedQ = questions.filter((q) => q.decision_id === decision.id).length;
              const linkedR = references.filter((r) => r.decision_id === decision.id).length;
              return (
                <div
                  key={decision.id}
                  className="group relative rounded-xl border border-slate-100 bg-white shadow-sm hover:border-slate-200 hover:shadow-md hover:shadow-slate-100/80 transition-all duration-200"
                  draggable
                  onDragStart={(e) => startCanvasItemDrag(e, "decisions", decision.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropOnDecisionCard(e, decision.id, decision.option_id)}
                >
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-emerald-400" />
                  <div className="px-4 py-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {branch && (
                          <span className="text-[11px] text-slate-400">{branch.title}</span>
                        )}
                        <div className="flex gap-1.5 text-[10px] text-slate-300">
                          {linkedC > 0 && <span>{linkedC} constraint{linkedC > 1 ? "s" : ""}</span>}
                          {linkedQ > 0 && <span>{linkedQ} question{linkedQ > 1 ? "s" : ""}</span>}
                          {linkedR > 0 && <span>{linkedR} ref{linkedR > 1 ? "s" : ""}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        {decision.source_messages.length > 0 && (
                          <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => onJumpToMessage(decision.source_messages.map((s) => s.message_id), `${decision.title} ${decision.reasoning}`)}>
                            Source
                          </button>
                        )}
                        <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => reopenDecision(spaceId, decision.id)}>
                          Reopen
                        </button>
                        <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 transition-colors" onClick={() => deleteDecision(spaceId, decision.id)}>
                          ✕
                        </button>
                      </div>
                    </div>
                    <input
                      value={decision.title}
                      onChange={(e) => updateDecision(spaceId, decision.id, { title: e.target.value })}
                      className="w-full bg-transparent text-sm font-medium text-slate-800 placeholder:text-slate-300 focus:outline-none"
                      placeholder="Decision"
                    />
                    <SubField
                      label="Reasoning"
                      value={decision.reasoning}
                      onChange={(v) => updateDecision(spaceId, decision.id, { reasoning: v })}
                      onDropText={(text) => updateDecision(spaceId, decision.id, { reasoning: decision.reasoning ? `${decision.reasoning}\n${text}` : text })}
                    />
                    <SubField
                      label="Trade-offs"
                      rows={1}
                      value={decision.trade_offs}
                      onChange={(v) => updateDecision(spaceId, decision.id, { trade_offs: v })}
                      onDropText={(text) => updateDecision(spaceId, decision.id, { trade_offs: decision.trade_offs ? `${decision.trade_offs}\n${text}` : text })}
                    />
                  </div>
                </div>
              );
            })}
            {decisions.length === 0 && (
              <p className="text-[12px] text-slate-300 py-1 px-1">No decisions yet. Decide on a branch above.</p>
            )}
          </Section>
        </div>

        {/* ── CONSTRAINTS ── */}
        {(constraints.length > 0 || activeDropSection === "constraints") && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDropSection("constraints"); }}
            onDragLeave={() => setDropSection(null)}
            onDrop={(e) => dropFromMessage("constraints", e)}
          >
            <Section title="Constraints" count={constraints.length} onAdd={() => addConstraint(spaceId)}>
              <DropHint active={activeDropSection === "constraints"} />
              {constraints.map((constraint) => (
                <div
                  key={constraint.id}
                  className="group relative rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition-all"
                  draggable
                  onDragStart={(e) => startAttachableDrag(e, "constraint", constraint.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropOnAttachableCard(e, "constraint", constraint.id)}
                >
                  <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-amber-300" />
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-slate-300">Constraint</span>
                    <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      {constraint.source_messages.length > 0 && (
                        <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => onJumpToMessage(constraint.source_messages.map((s) => s.message_id), constraint.description)}>
                          Source
                        </button>
                      )}
                      <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 transition-colors" onClick={() => deleteConstraint(spaceId, constraint.id)}>
                        ✕
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={constraint.description}
                    onChange={(e) => updateConstraint(spaceId, constraint.id, { description: e.target.value })}
                    rows={2}
                    className="w-full resize-none bg-transparent text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none"
                  />
                  {bindableDecisions.length > 0 && (
                    <select
                      className="mt-1 w-full bg-transparent text-[11px] text-slate-400 focus:outline-none cursor-pointer"
                      value={constraint.decision_id ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) updateConstraint(spaceId, constraint.id, { decision_id: undefined });
                        else linkToDecision(spaceId, { kind: "constraint", itemId: constraint.id, decisionId: v });
                      }}
                    >
                      <option value="">Unlinked</option>
                      {bindableDecisions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </Section>
          </div>
        )}

        {constraints.length === 0 && activeDropSection !== "constraints" && (
          <div
            className="rounded-xl border border-dashed border-slate-100 px-4 py-2.5 text-[11px] text-slate-300 hover:border-slate-200 transition-colors cursor-default"
            onDragOver={(e) => { e.preventDefault(); setDropSection("constraints"); }}
          >
            Drop to add a constraint
          </div>
        )}

        {/* ── OPEN QUESTIONS ── */}
        {(() => {
          const openQuestions = questions.filter((q) => q.status === "open");
          const resolvedQuestions = questions.filter((q) => q.status === "resolved");

          const renderQuestionCard = (question: typeof questions[0]) => (
            <div
              key={question.id}
              className="group relative rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition-all"
              draggable
              onDragStart={(e) => startAttachableDrag(e, "question", question.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => dropOnAttachableCard(e, "question", question.id)}
            >
              <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full bg-violet-300" />
              <div className="mb-1.5 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={question.status === "resolved"}
                    onChange={() => toggleQuestionStatus(spaceId, question.id)}
                    className="h-3 w-3 rounded accent-violet-500"
                  />
                  <span className="text-[11px] text-slate-300">Open</span>
                </label>
                <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 transition-colors" onClick={() => deleteQuestion(spaceId, question.id)}>
                    ✕
                  </button>
                </div>
              </div>
              <input
                value={question.question}
                onChange={(e) => updateQuestion(spaceId, question.id, { question: e.target.value })}
                className="w-full bg-transparent text-sm font-medium text-slate-700 placeholder:text-slate-300 focus:outline-none"
                placeholder="Question"
              />
              <textarea
                value={question.context}
                onChange={(e) => updateQuestion(spaceId, question.id, { context: e.target.value })}
                rows={1}
                className="mt-1 w-full resize-none bg-transparent text-xs text-slate-400 placeholder:text-slate-300 focus:outline-none"
                placeholder="Context"
              />
              {bindableDecisions.length > 0 && (
                <select
                  className="mt-1 w-full bg-transparent text-[11px] text-slate-400 focus:outline-none cursor-pointer"
                  value={question.decision_id ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (!v) updateQuestion(spaceId, question.id, { decision_id: undefined });
                    else linkToDecision(spaceId, { kind: "question", itemId: question.id, decisionId: v });
                  }}
                >
                  <option value="">Unlinked</option>
                  {bindableDecisions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                </select>
              )}
            </div>
          );

          return (
            <>
              {(openQuestions.length > 0 || activeDropSection === "open_questions") && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDropSection("open_questions"); }}
                  onDragLeave={() => setDropSection(null)}
                  onDrop={(e) => dropFromMessage("open_questions", e)}
                >
                  <Section title="Questions" count={openQuestions.length} onAdd={() => addQuestion(spaceId)}>
                    <DropHint active={activeDropSection === "open_questions"} />
                    {openQuestions.map(renderQuestionCard)}
                  </Section>
                </div>
              )}

              {openQuestions.length === 0 && activeDropSection !== "open_questions" && resolvedQuestions.length === 0 && (
                <div
                  className="rounded-xl border border-dashed border-slate-100 px-4 py-2.5 text-[11px] text-slate-300 hover:border-slate-200 transition-colors cursor-default"
                  onDragOver={(e) => { e.preventDefault(); setDropSection("open_questions"); }}
                >
                  Drop to add a question
                </div>
              )}

              {resolvedQuestions.length > 0 && (
                <details className="group/ans">
                  <summary className="cursor-pointer list-none flex items-center gap-2 select-none">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-300 group-open/ans:text-slate-400 transition-colors">
                      Answered
                    </span>
                    <span className="text-[11px] text-slate-300">{resolvedQuestions.length}</span>
                  </summary>
                  <div className="mt-2 space-y-1.5">
                    {resolvedQuestions.map((question) => (
                      <div key={question.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-4 py-2.5">
                        <span className="text-sm text-slate-400 line-through">{question.question || "Untitled"}</span>
                        <div className="flex gap-3">
                          <button type="button" className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors" onClick={() => toggleQuestionStatus(spaceId, question.id)}>
                            Reopen
                          </button>
                          <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 transition-colors" onClick={() => deleteQuestion(spaceId, question.id)}>
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </>
          );
        })()}

        {/* ── REFERENCES ── */}
        {(references.length > 0 || activeDropSection === "references") && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDropSection("references"); }}
            onDragLeave={() => setDropSection(null)}
            onDrop={(e) => dropFromMessage("references", e)}
          >
            <Section title="References" count={references.length} defaultOpen={false}>
              <DropHint active={activeDropSection === "references"} />
              {references.map((reference) => (
                <div
                  key={reference.id}
                  className="group rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition-all"
                  draggable
                  onDragStart={(e) => startAttachableDrag(e, "reference", reference.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => dropOnAttachableCard(e, "reference", reference.id)}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <input
                      value={reference.label}
                      onChange={(e) => updateReference(spaceId, reference.id, { label: e.target.value })}
                      className="bg-transparent text-[11px] font-medium text-slate-500 placeholder:text-slate-300 focus:outline-none"
                      placeholder="Label"
                    />
                    <button type="button" className="text-[11px] text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteReference(spaceId, reference.id)}>
                      ✕
                    </button>
                  </div>
                  <textarea
                    value={reference.content}
                    onChange={(e) => updateReference(spaceId, reference.id, { content: e.target.value })}
                    rows={3}
                    className="w-full resize-none rounded-lg bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600 placeholder:text-slate-300 focus:outline-none"
                  />
                  {bindableDecisions.length > 0 && (
                    <select
                      className="mt-1 w-full bg-transparent text-[11px] text-slate-400 focus:outline-none cursor-pointer"
                      value={reference.decision_id ?? ""}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (!v) updateReference(spaceId, reference.id, { decision_id: undefined });
                        else linkToDecision(spaceId, { kind: "reference", itemId: reference.id, decisionId: v });
                      }}
                    >
                      <option value="">Unlinked</option>
                      {bindableDecisions.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                    </select>
                  )}
                </div>
              ))}
            </Section>
          </div>
        )}

        {references.length === 0 && activeDropSection !== "references" && (
          <div
            className="rounded-xl border border-dashed border-slate-100 px-4 py-2.5 text-[11px] text-slate-300 hover:border-slate-200 transition-colors cursor-default"
            onDragOver={(e) => { e.preventDefault(); setDropSection("references"); }}
          >
            Drop to add a reference
          </div>
        )}

      </div>
    </section>
  );
}
