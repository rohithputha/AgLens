import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createEmptyExtract, createNewSpace, newId, nowIso, reorder, sampleSpace, statusCycle } from "../lib/design";
import { isNearDuplicate } from "../lib/extract";
import type {
  Constraint,
  Decision,
  DesignExtract,
  DesignSpace,
  Message,
  OpenQuestion,
  Option,
  Outputs,
  Reference,
  Task,
  UsageRecord,
} from "../types/design";

export type CanvasDropTarget =
  | "problem_statement"
  | "options"
  | "decisions"
  | "constraints"
  | "open_questions"
  | "references";

interface AppState {
  spaces: DesignSpace[];
  activeSpaceId: string;
  apiKey: string;
  model: string;
  leftPanelWidth: number;
  hasSeenOnboarding: boolean;
  setApiKey: (apiKey: string) => void;
  setModel: (model: string) => void;
  setLeftPanelWidth: (value: number) => void;
  setHasSeenOnboarding: (value: boolean) => void;
  createSpace: (title?: string) => void;
  createSampleSpace: () => void;
  deleteSpace: (id: string) => void;
  replaceSpaces: (spaces: DesignSpace[], nextActiveSpaceId?: string) => void;
  setActiveSpaceId: (id: string) => void;
  updateSpaceTitle: (id: string, title: string) => void;
  addMessage: (spaceId: string, message: Message) => void;
  updateMessageContent: (spaceId: string, messageId: string, content: string) => void;
  removeMessage: (spaceId: string, messageId: string) => void;
  setProblemStatement: (spaceId: string, content: string) => void;
  setActiveOption: (spaceId: string, optionId: string) => void;
  clearActiveOption: (spaceId: string) => void;
  addOption: (spaceId: string) => void;
  updateOption: (spaceId: string, id: string, patch: Partial<Option>) => void;
  deleteOption: (spaceId: string, id: string) => void;
  reorderOption: (spaceId: string, id: string, direction: "up" | "down") => void;
  moveOption: (spaceId: string, draggedId: string, targetId: string) => void;
  cycleOptionStatus: (spaceId: string, id: string) => void;
  promoteToDecision: (spaceId: string, optionId: string) => void;
  rejectOption: (spaceId: string, optionId: string) => void;
  addDecision: (spaceId: string) => void;
  updateDecision: (spaceId: string, id: string, patch: Partial<Decision>) => void;
  deleteDecision: (spaceId: string, id: string) => void;
  reorderDecision: (spaceId: string, id: string, direction: "up" | "down") => void;
  moveDecision: (spaceId: string, draggedId: string, targetId: string) => void;
  reopenDecision: (spaceId: string, id: string) => void;
  addConstraint: (spaceId: string) => void;
  updateConstraint: (spaceId: string, id: string, patch: Partial<Constraint>) => void;
  deleteConstraint: (spaceId: string, id: string) => void;
  reorderConstraint: (spaceId: string, id: string, direction: "up" | "down") => void;
  moveConstraint: (spaceId: string, draggedId: string, targetId: string) => void;
  addQuestion: (spaceId: string) => void;
  updateQuestion: (spaceId: string, id: string, patch: Partial<OpenQuestion>) => void;
  deleteQuestion: (spaceId: string, id: string) => void;
  reorderQuestion: (spaceId: string, id: string, direction: "up" | "down") => void;
  moveQuestion: (spaceId: string, draggedId: string, targetId: string) => void;
  toggleQuestionStatus: (spaceId: string, id: string) => void;
  addReference: (spaceId: string, reference: Omit<Reference, "id">) => void;
  updateReference: (spaceId: string, id: string, patch: Partial<Reference>) => void;
  deleteReference: (spaceId: string, id: string) => void;
  reorderReference: (spaceId: string, id: string, direction: "up" | "down") => void;
  moveReference: (spaceId: string, draggedId: string, targetId: string) => void;
  linkToDecision: (
    spaceId: string,
    payload: {
      kind: "constraint" | "question" | "reference";
      itemId: string;
      decisionId: string;
    },
  ) => void;
  dropTextToCanvas: (
    spaceId: string,
    target: CanvasDropTarget,
    text: string,
    sourceMessageId?: string,
  ) => void;
  setOutputs: (spaceId: string, outputs: Outputs) => void;
  applyExtract: (
    spaceId: string,
    messageId: string,
    extract: DesignExtract,
    telemetry?: { parse_error?: string | null; raw_extract?: string },
  ) => void;
  recordUsage: (spaceId: string, usage: UsageRecord) => void;
}

function touchSpace(space: DesignSpace): DesignSpace {
  return {
    ...space,
    updated_at: nowIso(),
  };
}

function updateSpace(
  spaces: DesignSpace[],
  spaceId: string,
  updater: (space: DesignSpace) => DesignSpace,
): DesignSpace[] {
  return spaces.map((space) => {
    if (space.id !== spaceId) {
      return space;
    }

    const draft = structuredClone(space);
    return touchSpace(updater(draft));
  });
}

function moveById<T extends { id: string }>(items: T[], draggedId: string, targetId: string): T[] {
  const fromIndex = items.findIndex((item) => item.id === draggedId);
  const toIndex = items.findIndex((item) => item.id === targetId);

  if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
    return items;
  }

  const clone = [...items];
  const [moved] = clone.splice(fromIndex, 1);
  clone.splice(toIndex, 0, moved);
  return clone;
}

function compactTitle(text: string): string {
  return text.trim().split("\n")[0].slice(0, 80) || "Imported item";
}


function ensureActiveOption(
  canvas: Pick<DesignSpace["design_canvas"], "active_option_id" | "options">,
): string | undefined {
  if (canvas.active_option_id && canvas.options.some((option) => option.id === canvas.active_option_id)) {
    return canvas.active_option_id;
  }
  return canvas.options[0]?.id;
}

const initial = createNewSpace();

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      spaces: [initial],
      activeSpaceId: initial.id,
      apiKey: "",
      model: "claude-sonnet-4-6",
      leftPanelWidth: 55,
      hasSeenOnboarding: false,
      setApiKey: (apiKey) => set({ apiKey }),
      setModel: (model) => set({ model }),
      setLeftPanelWidth: (value) => set({ leftPanelWidth: Math.max(35, Math.min(75, value)) }),
      setHasSeenOnboarding: (value) => set({ hasSeenOnboarding: value }),
      createSpace: (title) =>
        set((state) => {
          const next = createNewSpace(title);
          return {
            spaces: [next, ...state.spaces],
            activeSpaceId: next.id,
          };
        }),
      createSampleSpace: () =>
        set((state) => {
          const sample = sampleSpace();
          return {
            spaces: [sample, ...state.spaces],
            activeSpaceId: sample.id,
          };
        }),
      deleteSpace: (id) =>
        set((state) => {
          const remaining = state.spaces.filter((space) => space.id !== id);
          if (remaining.length === 0) {
            const fresh = createNewSpace();
            return {
              spaces: [fresh],
              activeSpaceId: fresh.id,
            };
          }

          const activeSpaceId = state.activeSpaceId === id ? remaining[0].id : state.activeSpaceId;
          return {
            spaces: remaining,
            activeSpaceId,
          };
        }),
      replaceSpaces: (spaces, nextActiveSpaceId) =>
        set(() => {
          const safeSpaces = spaces.length > 0 ? spaces : [createNewSpace()];
          const activeFromInput = nextActiveSpaceId && safeSpaces.some((space) => space.id === nextActiveSpaceId);

          return {
            spaces: safeSpaces,
            activeSpaceId: activeFromInput ? nextActiveSpaceId : safeSpaces[0].id,
          };
        }),
      setActiveSpaceId: (activeSpaceId) => set({ activeSpaceId }),
      updateSpaceTitle: (spaceId, title) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            title,
          })),
        })),
      addMessage: (spaceId, message) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            conversation: [...space.conversation, message],
          })),
        })),
      updateMessageContent: (spaceId, messageId, content) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            conversation: space.conversation.map((message) =>
              message.id === messageId
                ? {
                  ...message,
                  content,
                }
                : message,
            ),
          })),
        })),
      removeMessage: (spaceId, messageId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const scrub = <T extends { source_messages: Array<{ message_id: string }> }>(items: T[]): T[] =>
              items.map((item) => ({
                ...item,
                source_messages: item.source_messages.filter((source) => source.message_id !== messageId),
              }));

            return {
              ...space,
              conversation: space.conversation.filter((message) => message.id !== messageId),
              design_canvas: {
                ...space.design_canvas,
                options: scrub(space.design_canvas.options),
                decisions: scrub(space.design_canvas.decisions),
                constraints: scrub(space.design_canvas.constraints),
              },
            };
          }),
        })),
      setProblemStatement: (spaceId, content) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              problem_statement: content,
            },
          })),
        })),
      setActiveOption: (spaceId, optionId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              active_option_id: space.design_canvas.options.some((option) => option.id === optionId)
                ? optionId
                : space.design_canvas.active_option_id,
            },
          })),
        })),
      clearActiveOption: (spaceId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              active_option_id: undefined,
            },
          })),
        })),
      addOption: (spaceId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const optionId = newId();
            const options = [
              ...space.design_canvas.options,
              {
                id: optionId,
                title: "New option",
                description: "",
                status: "considering" as const,
                branch_score: 5,
                source_messages: [],
              },
            ];
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                options,
                active_option_id: ensureActiveOption({
                  active_option_id: space.design_canvas.active_option_id,
                  options,
                }),
              },
            };
          }),
        })),
      updateOption: (spaceId, id, patch) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              options: space.design_canvas.options.map((item) => (item.id === id ? { ...item, ...patch } : item)),
            },
          })),
        })),
      deleteOption: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const options = space.design_canvas.options.filter((item) => item.id !== id);
            const removedSet = new Set([id]);

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                options,
                active_option_id: ensureActiveOption({
                  active_option_id: space.design_canvas.active_option_id === id
                    ? undefined
                    : space.design_canvas.active_option_id,
                  options,
                }),
                decisions: space.design_canvas.decisions.map((decision) =>
                  decision.option_id === id ? { ...decision, option_id: undefined } : decision,
                ),
                constraints: space.design_canvas.constraints.map((constraint) =>
                  constraint.decision_id && removedSet.has(constraint.decision_id)
                    ? { ...constraint, decision_id: undefined }
                    : constraint,
                ),
                open_questions: space.design_canvas.open_questions.map((question) =>
                  question.decision_id && removedSet.has(question.decision_id)
                    ? { ...question, decision_id: undefined }
                    : question,
                ),
                references: space.design_canvas.references.map((reference) =>
                  reference.decision_id && removedSet.has(reference.decision_id)
                    ? { ...reference, decision_id: undefined }
                    : reference,
                ),
              },
            };
          }),
        })),
      reorderOption: (spaceId, id, direction) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const index = space.design_canvas.options.findIndex((item) => item.id === id);
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                options: reorder(space.design_canvas.options, index, direction),
              },
            };
          }),
        })),
      moveOption: (spaceId, draggedId, targetId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              options: moveById(space.design_canvas.options, draggedId, targetId),
            },
          })),
        })),
      cycleOptionStatus: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const options = space.design_canvas.options.map((item) =>
              item.id === id ? { ...item, status: statusCycle(item.status) } : item,
            );
            const target = options.find((option) => option.id === id);

            let activeOptionId = space.design_canvas.active_option_id;
            if (target?.status === "selected") {
              activeOptionId = target.id;
            }
            if (target?.status === "rejected" && activeOptionId === target.id) {
              activeOptionId = options.find((option) => option.status !== "rejected")?.id;
            }

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                options,
                active_option_id: activeOptionId,
              },
            };
          }),
        })),

      promoteToDecision: (spaceId, optionId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const option = space.design_canvas.options.find((o) => o.id === optionId);
            if (!option) return space;

            const decisionId = newId();
            const options = space.design_canvas.options.map((o) =>
              o.id === optionId ? { ...o, status: "selected" as const } : o,
            );

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                options,
                active_option_id: optionId,
                decisions: [
                  ...space.design_canvas.decisions,
                  {
                    id: decisionId,
                    title: option.title || "New decision",
                    reasoning: option.description || "",
                    trade_offs: "",
                    option_id: optionId,
                    source_messages: [],
                  },
                ],
              },
            };
          }),
        })),

      rejectOption: (spaceId, optionId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const options = space.design_canvas.options.map((o) =>
              o.id === optionId ? { ...o, status: "rejected" as const } : o,
            );

            let activeOptionId = space.design_canvas.active_option_id;
            if (activeOptionId === optionId) {
              activeOptionId = options.find((o) => o.status !== "rejected")?.id;
            }

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                options,
                active_option_id: activeOptionId,
              },
            };
          }),
        })),

      addDecision: (spaceId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const decisionId = newId();
            const optionId = space.design_canvas.active_option_id;
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                decisions: [
                  ...space.design_canvas.decisions,
                  {
                    id: decisionId,
                    title: "New decision",
                    reasoning: "",
                    trade_offs: "",
                    option_id: optionId,
                    source_messages: [],
                  },
                ],
              },
            };
          }),
        })),
      updateDecision: (spaceId, id, patch) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              decisions: space.design_canvas.decisions.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            },
          })),
        })),
      deleteDecision: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              decisions: space.design_canvas.decisions.filter((item) => item.id !== id),
              constraints: space.design_canvas.constraints.map((constraint) =>
                constraint.decision_id === id ? { ...constraint, decision_id: undefined } : constraint,
              ),
              open_questions: space.design_canvas.open_questions.map((question) =>
                question.decision_id === id ? { ...question, decision_id: undefined } : question,
              ),
              references: space.design_canvas.references.map((reference) =>
                reference.decision_id === id ? { ...reference, decision_id: undefined } : reference,
              ),
            },
          })),
        })),
      reorderDecision: (spaceId, id, direction) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const index = space.design_canvas.decisions.findIndex((item) => item.id === id);
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                decisions: reorder(space.design_canvas.decisions, index, direction),
              },
            };
          }),
        })),
      moveDecision: (spaceId, draggedId, targetId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              decisions: moveById(space.design_canvas.decisions, draggedId, targetId),
            },
          })),
        })),
      reopenDecision: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const decision = space.design_canvas.decisions.find((item) => item.id === id);
            if (!decision) {
              return space;
            }
            const optionId = newId();
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                decisions: space.design_canvas.decisions.filter((item) => item.id !== id),
                options: [
                  ...space.design_canvas.options,
                  {
                    id: optionId,
                    title: decision.title,
                    description: decision.reasoning,
                    status: "considering" as const,
                    branch_score: 5,
                    source_messages: decision.source_messages,
                  },
                ],
                active_option_id: optionId,
              },
            };
          }),
        })),
      addConstraint: (spaceId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const targetDecisionId =
              [...space.design_canvas.decisions]
                .reverse()
                .find((decision) => decision.option_id === space.design_canvas.active_option_id)?.id ??
              [...space.design_canvas.decisions].reverse()[0]?.id;
            const constraintId = newId();

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                constraints: [
                  ...space.design_canvas.constraints,
                  {
                    id: constraintId,
                    description: "New constraint",
                    source: "conversation",
                    decision_id: targetDecisionId,
                    source_messages: [],
                  },
                ],
              },
            };
          }),
        })),
      updateConstraint: (spaceId, id, patch) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              constraints: space.design_canvas.constraints.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            },
          })),
        })),
      deleteConstraint: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              constraints: space.design_canvas.constraints.filter((item) => item.id !== id),
            },
          })),
        })),
      reorderConstraint: (spaceId, id, direction) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const index = space.design_canvas.constraints.findIndex((item) => item.id === id);
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                constraints: reorder(space.design_canvas.constraints, index, direction),
              },
            };
          }),
        })),
      moveConstraint: (spaceId, draggedId, targetId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              constraints: moveById(space.design_canvas.constraints, draggedId, targetId),
            },
          })),
        })),
      addQuestion: (spaceId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const targetDecisionId =
              [...space.design_canvas.decisions]
                .reverse()
                .find((decision) => decision.option_id === space.design_canvas.active_option_id)?.id ??
              [...space.design_canvas.decisions].reverse()[0]?.id;
            const questionId = newId();

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                open_questions: [
                  ...space.design_canvas.open_questions,
                  {
                    id: questionId,
                    question: "New question",
                    context: "",
                    status: "open" as const,
                    decision_id: targetDecisionId,
                  },
                ],
              },
            };
          }),
        })),
      updateQuestion: (spaceId, id, patch) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              open_questions: space.design_canvas.open_questions.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            },
          })),
        })),
      deleteQuestion: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              open_questions: space.design_canvas.open_questions.filter((item) => item.id !== id),
            },
          })),
        })),
      reorderQuestion: (spaceId, id, direction) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const index = space.design_canvas.open_questions.findIndex((item) => item.id === id);
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                open_questions: reorder(space.design_canvas.open_questions, index, direction),
              },
            };
          }),
        })),
      moveQuestion: (spaceId, draggedId, targetId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              open_questions: moveById(space.design_canvas.open_questions, draggedId, targetId),
            },
          })),
        })),
      toggleQuestionStatus: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              open_questions: space.design_canvas.open_questions.map((item) =>
                item.id === id
                  ? {
                    ...item,
                    status: item.status === "open" ? "resolved" : "open",
                  }
                  : item,
              ),
            },
          })),
        })),
      addReference: (spaceId, reference) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const targetDecisionId =
              [...space.design_canvas.decisions]
                .reverse()
                .find((decision) => decision.option_id === space.design_canvas.active_option_id)?.id ??
              [...space.design_canvas.decisions].reverse()[0]?.id;

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                references: [
                  ...space.design_canvas.references,
                  {
                    ...reference,
                    id: newId(),
                    decision_id: targetDecisionId,
                  },
                ],
              },
            };
          }),
        })),
      updateReference: (spaceId, id, patch) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              references: space.design_canvas.references.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            },
          })),
        })),
      deleteReference: (spaceId, id) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              references: space.design_canvas.references.filter((item) => item.id !== id),
            },
          })),
        })),
      reorderReference: (spaceId, id, direction) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const index = space.design_canvas.references.findIndex((item) => item.id === id);
            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                references: reorder(space.design_canvas.references, index, direction),
              },
            };
          }),
        })),
      moveReference: (spaceId, draggedId, targetId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            design_canvas: {
              ...space.design_canvas,
              references: moveById(space.design_canvas.references, draggedId, targetId),
            },
          })),
        })),
      linkToDecision: (spaceId, payload) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            if (payload.kind === "constraint") {
              return {
                ...space,
                design_canvas: {
                  ...space.design_canvas,
                  constraints: space.design_canvas.constraints.map((item) =>
                    item.id === payload.itemId ? { ...item, decision_id: payload.decisionId } : item,
                  ),
                },
              };
            }

            if (payload.kind === "question") {
              return {
                ...space,
                design_canvas: {
                  ...space.design_canvas,
                  open_questions: space.design_canvas.open_questions.map((item) =>
                    item.id === payload.itemId ? { ...item, decision_id: payload.decisionId } : item,
                  ),
                },
              };
            }

            return {
              ...space,
              design_canvas: {
                ...space.design_canvas,
                references: space.design_canvas.references.map((item) =>
                  item.id === payload.itemId ? { ...item, decision_id: payload.decisionId } : item,
                ),
              },
            };
          }),
        })),
      dropTextToCanvas: (spaceId, target, text, sourceMessageId) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const dropped = text.trim();
            if (!dropped) {
              return space;
            }

            const sourceRef = sourceMessageId ? [{ message_id: sourceMessageId }] : [];
            const canvas = space.design_canvas;

            if (target === "problem_statement") {
              return {
                ...space,
                design_canvas: {
                  ...canvas,
                  problem_statement: canvas.problem_statement
                    ? `${canvas.problem_statement}\n${dropped}`
                    : dropped,
                },
              };
            }

            if (target === "options") {
              const optionId = newId();
              const options = [
                ...canvas.options,
                {
                  id: optionId,
                  title: compactTitle(dropped),
                  description: dropped,
                  status: "considering" as const,
                  branch_score: 5,
                  source_messages: sourceRef,
                },
              ];
              return {
                ...space,
                design_canvas: {
                  ...canvas,
                  options,
                  active_option_id: ensureActiveOption({
                    active_option_id: canvas.active_option_id,
                    options,
                  }),
                },
              };
            }

            if (target === "decisions") {
              const decisionId = newId();
              const optionId = canvas.active_option_id;
              return {
                ...space,
                design_canvas: {
                  ...canvas,
                  decisions: [
                    ...canvas.decisions,
                    {
                      id: decisionId,
                      title: compactTitle(dropped),
                      reasoning: dropped,
                      trade_offs: "",
                      option_id: optionId,
                      source_messages: sourceRef,
                    },
                  ],
                },
              };
            }

            if (target === "constraints") {
              const targetDecisionId =
                [...canvas.decisions]
                  .reverse()
                  .find((decision) => decision.option_id === canvas.active_option_id)?.id ??
                [...canvas.decisions].reverse()[0]?.id;
              const constraintId = newId();
              return {
                ...space,
                design_canvas: {
                  ...canvas,
                  constraints: [
                    ...canvas.constraints,
                    {
                      id: constraintId,
                      description: dropped,
                      source: "conversation",
                      decision_id: targetDecisionId,
                      source_messages: sourceRef,
                    },
                  ],
                },
              };
            }

            if (target === "open_questions") {
              const targetDecisionId =
                [...canvas.decisions]
                  .reverse()
                  .find((decision) => decision.option_id === canvas.active_option_id)?.id ??
                [...canvas.decisions].reverse()[0]?.id;
              const questionId = newId();
              return {
                ...space,
                design_canvas: {
                  ...canvas,
                  open_questions: [
                    ...canvas.open_questions,
                    {
                      id: questionId,
                      question: compactTitle(dropped),
                      context: dropped,
                      status: "open" as const,
                      decision_id: targetDecisionId,
                    },
                  ],
                },
              };
            }

            const targetNodeId =
              [...canvas.decisions]
                .reverse()
                .find((decision) => decision.option_id === canvas.active_option_id)?.id ??
              [...canvas.decisions].reverse()[0]?.id;

            return {
              ...space,
              design_canvas: {
                ...canvas,
                references: [
                  ...canvas.references,
                  {
                    id: newId(),
                    type: "paste",
                    label: compactTitle(dropped),
                    content: dropped,
                    decision_id: targetNodeId,
                  },
                ],
              },
            };
          }),
        })),
      setOutputs: (spaceId, outputs) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            status: "crystallized",
            outputs,
          })),
        })),
      applyExtract: (spaceId, messageId, incomingExtract, telemetry) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => {
            const canvas = structuredClone(space.design_canvas);
            const extract = { ...createEmptyExtract(), ...incomingExtract };
            const refs: Message["extracted_elements"] = [];

            if (extract.problem_statement_update?.trim()) {
              canvas.problem_statement = extract.problem_statement_update.trim();
            }

            for (const option of extract.new_options) {
              const existing = canvas.options.find((item) => isNearDuplicate(item.title, option.title));
              if (existing) {
                continue;
              }
              const id = newId();
              canvas.options.push({
                id,
                title: option.title,
                description: option.description,
                status: "considering",
                branch_score: 5,
                source_messages: [{ message_id: messageId }],
              });
              if (!canvas.active_option_id) {
                canvas.active_option_id = id;
              }
              refs.push({ type: "option", id });
            }

            for (const upd of extract.update_options ?? []) {
              const target = canvas.options.find((item) => item.id === upd.id);
              if (target && upd.description?.trim()) {
                target.description = target.description
                  ? `${target.description}\n${upd.description.trim()}`
                  : upd.description.trim();
              }
            }

            for (const change of extract.option_status_changes) {
              const target = canvas.options.find((item) => isNearDuplicate(item.title, change.option_title));
              if (!target) {
                continue;
              }
              target.status = change.new_status;
              if (change.reason) {
                target.rejection_reason = change.reason;
              }
              target.source_messages.push({ message_id: messageId });
              if (change.new_status === "selected") {
                canvas.active_option_id = target.id;
              }
            }

            for (const decision of extract.new_decisions) {
              const existing = canvas.decisions.find((item) => isNearDuplicate(item.title, decision.title));
              if (existing) {
                continue;
              }
              const id = newId();
              canvas.decisions.push({
                id,
                title: decision.title,
                reasoning: decision.reasoning,
                trade_offs: decision.trade_offs,
                option_id: canvas.active_option_id,
                source_messages: [{ message_id: messageId }],
              });
              refs.push({ type: "decision", id });
            }

            for (const upd of extract.update_decisions ?? []) {
              const target = canvas.decisions.find((item) => item.id === upd.id);
              if (target) {
                if (upd.reasoning?.trim()) {
                  target.reasoning = target.reasoning
                    ? `${target.reasoning}\n${upd.reasoning.trim()}`
                    : upd.reasoning.trim();
                }
                if (upd.trade_offs?.trim()) {
                  target.trade_offs = target.trade_offs
                    ? `${target.trade_offs}\n${upd.trade_offs.trim()}`
                    : upd.trade_offs.trim();
                }
              }
            }

            for (const constraint of extract.new_constraints) {
              const existing = canvas.constraints.find((item) =>
                isNearDuplicate(item.description, constraint.description),
              );
              if (existing) {
                continue;
              }
              const id = newId();
              const targetNodeId =
                [...canvas.decisions]
                  .reverse()
                  .find((decision) => decision.option_id === canvas.active_option_id)?.id ??
                [...canvas.decisions].reverse()[0]?.id;
              canvas.constraints.push({
                id,
                description: constraint.description,
                source: constraint.source,
                decision_id: targetNodeId,
                source_messages: [{ message_id: messageId }],
              });
              refs.push({ type: "constraint", id });
            }

            for (const question of extract.new_open_questions) {
              const existing = canvas.open_questions.find((item) => isNearDuplicate(item.question, question.question));
              if (existing) {
                continue;
              }
              const id = newId();
              const targetNodeId =
                [...canvas.decisions]
                  .reverse()
                  .find((decision) => decision.option_id === canvas.active_option_id)?.id ??
                [...canvas.decisions].reverse()[0]?.id;
              canvas.open_questions.push({
                id,
                question: question.question,
                context: question.context,
                status: "open" as const,
                decision_id: targetNodeId,
              });
              refs.push({ type: "open_question", id });
            }

            for (const resolved of extract.resolved_questions) {
              const target = canvas.open_questions.find((item) => isNearDuplicate(item.question, resolved.question));
              if (target) {
                target.status = "resolved";
              }
            }

            canvas.active_option_id = ensureActiveOption({
              active_option_id: canvas.active_option_id,
              options: canvas.options,
            });

            const nextSpace: DesignSpace = {
              ...space,
              design_canvas: canvas,
              status: canvas.decisions.length > 0 ? "converging" : space.status,
              conversation: space.conversation.map((message) =>
                message.id === messageId
                  ? {
                    ...message,
                    extracted_elements: refs,
                  }
                  : message,
              ),
            };

            if (telemetry?.parse_error) {
              nextSpace.extraction_failures += 1;
              nextSpace.extraction_failure_log = [
                {
                  at: nowIso(),
                  message_id: messageId,
                  reason: telemetry.parse_error,
                  raw_excerpt: (telemetry.raw_extract ?? "").slice(0, 500),
                },
                ...nextSpace.extraction_failure_log,
              ].slice(0, 30);
            }

            return nextSpace;
          }),
        })),
      recordUsage: (spaceId, usage) =>
        set((state) => ({
          spaces: updateSpace(state.spaces, spaceId, (space) => ({
            ...space,
            usage_history: [usage, ...space.usage_history].slice(0, 50),
          })),
        })),
    }),
    {
      name: "archlens-store-v5",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        spaces: state.spaces,
        activeSpaceId: state.activeSpaceId,
        apiKey: state.apiKey,
        model: state.model,
        leftPanelWidth: state.leftPanelWidth,
        hasSeenOnboarding: state.hasSeenOnboarding,
      }),
      merge: (persistedState, currentState) => {
        const VALID_MODELS = new Set(["claude-sonnet-4-6", "claude-opus-4-6"]);
        const merged = {
          ...currentState,
          ...(persistedState as Partial<AppState>),
        };

        if (!VALID_MODELS.has(merged.model)) {
          merged.model = "claude-sonnet-4-6";
        }

        if (!merged.spaces || merged.spaces.length === 0) {
          const fresh = createNewSpace();
          merged.spaces = [fresh];
          merged.activeSpaceId = fresh.id;
        } else {
          merged.spaces = merged.spaces.map((space) => {
            const canvas = space.design_canvas;
            const options = canvas.options ?? [];
            return {
              ...space,
              design_canvas: {
                ...canvas,
                decisions: canvas.decisions ?? [],
                active_option_id: ensureActiveOption({
                  active_option_id: canvas.active_option_id,
                  options,
                }),
              },
            };
          });
        }

        return merged;
      },
    },
  ),
);

export function exportSpacesPayload(spaces: DesignSpace[], activeSpaceId: string): string {
  return JSON.stringify(
    {
      version: 1,
      exported_at: nowIso(),
      activeSpaceId,
      spaces,
    },
    null,
    2,
  );
}

export function importSpacesPayload(jsonText: string): {
  spaces: DesignSpace[];
  activeSpaceId?: string;
} {
  const parsed = JSON.parse(jsonText) as {
    spaces?: DesignSpace[];
    activeSpaceId?: string;
  };

  if (!Array.isArray(parsed.spaces) || parsed.spaces.length === 0) {
    throw new Error("Invalid import file: missing spaces array.");
  }

  const safeSpaces = parsed.spaces.map((space) => ({
    ...space,
    design_canvas: {
      ...space.design_canvas,
      decisions: Array.isArray(space.design_canvas.decisions) ? space.design_canvas.decisions : [],
      active_option_id: ensureActiveOption({
        active_option_id: space.design_canvas.active_option_id,
        options: Array.isArray(space.design_canvas.options) ? space.design_canvas.options : [],
      }),
    },
    usage_history: Array.isArray(space.usage_history) ? space.usage_history : [],
    extraction_failures: typeof space.extraction_failures === "number" ? space.extraction_failures : 0,
    extraction_failure_log: Array.isArray(space.extraction_failure_log) ? space.extraction_failure_log : [],
  }));

  return {
    spaces: safeSpaces,
    activeSpaceId: parsed.activeSpaceId,
  };
}

export function tasksToMarkdown(tasks: Task[]): string {
  if (tasks.length === 0) {
    return "No tasks generated.";
  }

  return tasks
    .map((task, index) => {
      const acceptance = task.acceptance_criteria.map((item) => `- ${item}`).join("\n");
      const dependencies = task.depends_on.length > 0 ? task.depends_on.join(", ") : "none";
      const files = task.files_components.length > 0 ? task.files_components.join(", ") : "n/a";
      return [
        `## Task ${index + 1}: ${task.title}`,
        "",
        `${task.description}`,
        "",
        `Context: ${task.context}`,
        `Files/Components: ${files}`,
        `Depends on: ${dependencies}`,
        "",
        "Acceptance Criteria:",
        acceptance,
      ].join("\n");
    })
    .join("\n\n");
}
