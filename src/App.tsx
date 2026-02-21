import { useEffect, useMemo, useRef, useState } from "react";
import { Header } from "./components/layout/Header";
import { Footer } from "./components/layout/Footer";
import {
  ConversationPanel,
  type ConversationPanelHandle,
} from "./components/conversation/ConversationPanel";
import { DesignCanvas } from "./components/canvas/DesignCanvas";
import { CrystallizeModal } from "./components/crystallize/CrystallizeModal";
import { OnboardingModal } from "./components/onboarding/OnboardingModal";
import { crystallizeDesign } from "./services/anthropic";
import { nowIso } from "./lib/design";
import { useAppStore } from "./store/useAppStore";

export default function App() {
  const spaces = useAppStore((s) => s.spaces);
  const activeSpaceId = useAppStore((s) => s.activeSpaceId);
  const apiKey = useAppStore((s) => s.apiKey);
  const model = useAppStore((s) => s.model);
  const leftPanelWidth = useAppStore((s) => s.leftPanelWidth);
  const setLeftPanelWidth = useAppStore((s) => s.setLeftPanelWidth);
  const hasSeenOnboarding = useAppStore((s) => s.hasSeenOnboarding);
  const setHasSeenOnboarding = useAppStore((s) => s.setHasSeenOnboarding);
  const createSampleSpace = useAppStore((s) => s.createSampleSpace);
  const deleteSpace = useAppStore((s) => s.deleteSpace);
  const setOutputs = useAppStore((s) => s.setOutputs);

  const activeSpace = useMemo(
    () => spaces.find((s) => s.id === activeSpaceId) ?? spaces[0],
    [spaces, activeSpaceId],
  );

  const [showOnboarding, setShowOnboarding] = useState(!hasSeenOnboarding);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCrystallizing, setIsCrystallizing] = useState(false);
  const [crystallizeError, setCrystallizeError] = useState<string | null>(null);
  const [outputOpen, setOutputOpen] = useState(false);

  const mainRef = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const conversationRef = useRef<ConversationPanelHandle | null>(null);

  useEffect(() => {
    setShowOnboarding(!hasSeenOnboarding);
  }, [hasSeenOnboarding]);

  // Panel resize via pointer drag on the divider
  useEffect(() => {
    function handleMove(event: PointerEvent) {
      if (!draggingRef.current || !mainRef.current) return;
      const bounds = mainRef.current.getBoundingClientRect();
      const percent = ((event.clientX - bounds.left) / bounds.width) * 100;
      setLeftPanelWidth(percent);
    }
    function handleUp() {
      draggingRef.current = false;
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [setLeftPanelWidth]);

  async function onCrystallize() {
    if (!activeSpace || !apiKey.trim()) {
      setCrystallizeError("Add an API key and make sure there is an active space.");
      return;
    }
    if (
      !activeSpace.design_canvas.problem_statement ||
      activeSpace.design_canvas.decisions.length === 0
    ) {
      setCrystallizeError("Crystallize requires a problem statement and at least one decision.");
      return;
    }

    setCrystallizeError(null);
    setIsCrystallizing(true);

    try {
      const result = await crystallizeDesign({ apiKey, model, space: activeSpace });
      setOutputs(activeSpace.id, {
        design_doc: result.design_doc,
        tasks: result.tasks,
        generated_at: nowIso(),
      });
      setOutputOpen(true);
    } catch (err) {
      setCrystallizeError(err instanceof Error ? err.message : "Crystallize failed.");
    } finally {
      setIsCrystallizing(false);
    }
  }

  function dismissOnboarding(withSample: boolean) {
    setHasSeenOnboarding(true);
    setShowOnboarding(false);
    if (withSample) createSampleSpace();
  }

  if (!activeSpace) {
    return (
      <>
        {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 text-slate-900">
      <Header
        onCrystallize={onCrystallize}
        isCrystallizing={isCrystallizing}
        crystallizeError={crystallizeError}
        onDeleteSpace={() => setShowDeleteConfirm(true)}
        onOpenOutput={() => setOutputOpen(true)}
        hasOutput={!!activeSpace.outputs.design_doc}
      />

      <main ref={mainRef} className="flex min-h-0 flex-1" onDragOver={(e) => e.preventDefault()}>
        <ConversationPanel
          ref={conversationRef}
          spaceId={activeSpace.id}
          style={{ width: `${leftPanelWidth}%` }}
        />

        {/* Resizable divider */}
        <div
          className="w-1.5 cursor-col-resize bg-slate-200 hover:bg-slate-400 transition-colors"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize panels"
          onPointerDown={() => {
            draggingRef.current = true;
          }}
        />

        <DesignCanvas
          spaceId={activeSpace.id}
          onJumpToMessage={(ids, fallback) =>
            conversationRef.current?.jumpToMessage(ids, fallback)
          }
        />
      </main>

      <Footer />

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/35 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-base font-semibold">Delete this design space?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This removes the current space from local storage. This action cannot be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-rose-600 px-3 py-1.5 text-sm text-white hover:bg-rose-700 transition"
                onClick={() => {
                  deleteSpace(activeSpace.id);
                  setShowDeleteConfirm(false);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Crystallize output */}
      {outputOpen && activeSpace && (
        <CrystallizeModal space={activeSpace} onClose={() => setOutputOpen(false)} />
      )}

      {/* Onboarding */}
      {showOnboarding && <OnboardingModal onDismiss={dismissOnboarding} />}
    </div>
  );
}
