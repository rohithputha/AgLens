interface OnboardingModalProps {
  onDismiss: (withSample: boolean) => void;
}

export function OnboardingModal({ onDismiss }: OnboardingModalProps) {
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">Welcome to ArchLens</h2>
        <p className="mt-2 text-sm text-slate-700">
          Think through architecture decisions in conversation with Claude. Build a structured design
          canvas as you explore, then crystallize it into a design doc and task list.
        </p>

        <ol className="mt-4 space-y-2 text-sm text-slate-700 list-decimal list-inside">
          <li>Click <strong>⚙ Settings</strong> to add your Anthropic API key.</li>
          <li>Start a conversation describing your architecture problem.</li>
          <li>Drag message snippets into the canvas — ideas, decisions, constraints.</li>
          <li>Promote the best idea to a Decision using <strong>Decide ✅</strong>.</li>
          <li>Click <strong>Crystallize</strong> to generate a design doc and task list.</li>
        </ol>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 transition"
            onClick={() => onDismiss(false)}
          >
            Start Empty
          </button>
          <button
            type="button"
            className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-slate-700 transition"
            onClick={() => onDismiss(true)}
          >
            Load Sample Space
          </button>
        </div>
      </div>
    </div>
  );
}
