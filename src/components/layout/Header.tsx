import { useState } from "react";
import { estimateContextTokens, modelContextWindow } from "../../lib/tokens";
import { useAppStore } from "../../store/useAppStore";

interface HeaderProps {
  onCrystallize: () => void;
  isCrystallizing: boolean;
  crystallizeError: string | null;
  onDeleteSpace: () => void;
  onOpenOutput: () => void;
  hasOutput: boolean;
}

export function Header({
  onCrystallize,
  isCrystallizing,
  crystallizeError,
  onDeleteSpace,
  onOpenOutput,
  hasOutput,
}: HeaderProps) {
  const [showSettings, setShowSettings] = useState(false);

  const spaces = useAppStore((s) => s.spaces);
  const activeSpaceId = useAppStore((s) => s.activeSpaceId);
  const apiKey = useAppStore((s) => s.apiKey);
  const model = useAppStore((s) => s.model);
  const createSpace = useAppStore((s) => s.createSpace);
  const updateSpaceTitle = useAppStore((s) => s.updateSpaceTitle);
  const setApiKey = useAppStore((s) => s.setApiKey);
  const setModel = useAppStore((s) => s.setModel);

  const activeSpace = spaces.find((s) => s.id === activeSpaceId) ?? spaces[0];

  const contextTokens = activeSpace
    ? estimateContextTokens(activeSpace.conversation, activeSpace.design_canvas)
    : 0;
  const contextWindow = modelContextWindow(model);
  const contextPercent = Math.min(100, Math.round((contextTokens / contextWindow) * 100));
  const contextWarning = contextPercent >= 80;
  const latestUsage = activeSpace?.usage_history[0];

  return (
    <>
      <header className="border-b border-slate-100 bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <span className="text-[15px] font-semibold text-slate-900 select-none tracking-tight">
            AgLens
          </span>

          <div className="h-4 w-px bg-slate-100" />

          {/* Space title */}
          <input
            value={activeSpace?.title ?? ""}
            onChange={(e) => activeSpace && updateSpaceTitle(activeSpace.id, e.target.value)}
            className="flex-1 bg-transparent text-sm text-slate-600 placeholder:text-slate-300 focus:outline-none min-w-0"
            aria-label="Space title"
          />

          {/* Right actions */}
          <div className="flex items-center gap-4 ml-auto shrink-0">
            {/* Context */}
            <div className="flex items-center gap-2">
              <div className="w-20 h-1 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    contextPercent >= 80 ? "bg-amber-400" : "bg-slate-300"
                  }`}
                  style={{ width: `${contextPercent}%` }}
                />
              </div>
              <span className={`text-[11px] ${contextWarning ? "text-amber-500" : "text-slate-300"}`}>
                {contextPercent}%
              </span>
            </div>

            {latestUsage && (
              <span className="text-[11px] text-slate-300">
                ${latestUsage.cost_usd.toFixed(4)}
              </span>
            )}

            {hasOutput && (
              <button
                type="button"
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                onClick={onOpenOutput}
              >
                Output
              </button>
            )}

            <button
              type="button"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => createSpace()}
            >
              New
            </button>

            <button
              type="button"
              className="text-sm text-slate-400 hover:text-red-500 transition-colors"
              onClick={onDeleteSpace}
            >
              Delete
            </button>

            <button
              type="button"
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
            >
              Settings
            </button>

            <button
              type="button"
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-40 transition-colors"
              onClick={onCrystallize}
              disabled={isCrystallizing}
            >
              {isCrystallizing ? "Working…" : "Crystallize"}
            </button>
          </div>
        </div>

        {crystallizeError && (
          <p className="mt-2 text-[12px] text-red-500">{crystallizeError}</p>
        )}
      </header>

      {/* Settings panel */}
      {showSettings && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl shadow-black/10">
            <h3 className="mb-5 text-[15px] font-semibold text-slate-900">Settings</h3>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-slate-400">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300 focus:border-slate-200 focus:bg-white focus:outline-none transition-colors"
                  placeholder="sk-ant-…"
                />
                <p className="mt-1 text-[11px] text-slate-300">Stored locally, never sent to our servers.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-slate-400">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:border-slate-200 focus:bg-white focus:outline-none transition-colors"
                >
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-opus-4-6">Claude Opus 4.6</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
                onClick={() => setShowSettings(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
