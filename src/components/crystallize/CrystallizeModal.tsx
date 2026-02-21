import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { tasksToMarkdown } from "../../store/useAppStore";
import type { DesignSpace } from "../../types/design";

interface CrystallizeModalProps {
  space: DesignSpace;
  onClose: () => void;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // noop — could add toast feedback
  }
}

export function CrystallizeModal({ space, onClose }: CrystallizeModalProps) {
  const [outputTab, setOutputTab] = useState<"doc" | "tasks" | "compare">("doc");

  const options = space.design_canvas.options;
  const decisions = space.design_canvas.decisions;
  const activeOptionId = space.design_canvas.active_option_id;
  const activeOption = options.find((o) => o.id === activeOptionId) ?? null;
  const decisionsByOption = new Map(
    options.map((o) => [o.id, decisions.filter((d) => d.option_id === o.id)]),
  );
  const inactiveOptions = options.filter((o) => o.id !== activeOptionId);

  const tasksMarkdown = tasksToMarkdown(space.outputs.tasks ?? []);
  const fullMarkdown = `${space.outputs.design_doc ?? ""}\n\n---\n\n${tasksMarkdown}`.trim();

  function downloadMarkdown() {
    const blob = new Blob([fullMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${space.title.replace(/\s+/g, "-").toLowerCase()}-crystallized.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
      <div className="flex h-[90vh] w-full max-w-5xl flex-col rounded-xl bg-white p-5 shadow-xl">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Crystallized Output</h3>
          <button
            type="button"
            className="rounded-md border border-slate-200 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Tabs + actions */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {(["doc", "tasks", "compare"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm transition ${
                outputTab === tab ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
              onClick={() => setOutputTab(tab)}
            >
              {tab === "doc" ? "Design Doc" : tab === "tasks" ? "Tasks" : "Compare"}
            </button>
          ))}
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              onClick={() => copyToClipboard(fullMarkdown)}
            >
              Copy Markdown
            </button>
            <button
              type="button"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
              onClick={downloadMarkdown}
            >
              Save .md
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-auto rounded-md border border-slate-200 p-4">
          {outputTab === "doc" ? (
            space.outputs.design_doc ? (
              <article className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{space.outputs.design_doc}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-sm text-slate-500">No design document generated yet.</p>
            )
          ) : outputTab === "tasks" ? (
            space.outputs.tasks && space.outputs.tasks.length > 0 ? (
              <div className="space-y-3">
                {space.outputs.tasks.map((task, index) => (
                  <div key={task.id} className="rounded-md border border-slate-200 p-3">
                    <div className="mb-1 font-semibold text-sm">
                      {index + 1}. {task.title}
                    </div>
                    <p className="text-sm text-slate-700">{task.description}</p>
                    <p className="mt-1 text-xs text-slate-500">Context: {task.context}</p>
                    <div className="mt-1 text-xs text-slate-500">
                      Files: {task.files_components.join(", ") || "n/a"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Depends on: {task.depends_on.join(", ") || "none"}
                    </div>
                    <ul className="mt-2 list-inside list-disc text-xs text-slate-700">
                      {task.acceptance_criteria.map((criterion, i) => (
                        <li key={`${task.id}-${i}`}>{criterion}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      className="mt-2 rounded-md border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      onClick={() => copyToClipboard(tasksToMarkdown([task]))}
                    >
                      Copy for Agent
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No tasks generated yet.</p>
            )
          ) : (
            <div className="space-y-2">
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
                <div className="font-semibold text-sm">Active Branch</div>
                <div className="mt-1 text-sm">{activeOption?.title ?? "None selected"}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {(activeOption ? decisionsByOption.get(activeOption.id)?.length : 0) ?? 0} decisions
                </div>
              </div>
              {inactiveOptions.map((option) => (
                <div key={option.id} className="rounded-md border border-slate-200 p-3">
                  <div className="font-medium text-sm">{option.title}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    Status: {option.status} · Decisions: {(decisionsByOption.get(option.id) ?? []).length}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">{option.description || "No description."}</div>
                </div>
              ))}
              {inactiveOptions.length === 0 && (
                <p className="text-sm text-slate-500">No other branches to compare.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
