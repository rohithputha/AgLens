import { useRef, type ChangeEvent } from "react";
import { exportSpacesPayload, importSpacesPayload, useAppStore } from "../../store/useAppStore";

export function Footer() {
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const spaces = useAppStore((s) => s.spaces);
  const activeSpaceId = useAppStore((s) => s.activeSpaceId);
  const setActiveSpaceId = useAppStore((s) => s.setActiveSpaceId);
  const replaceSpaces = useAppStore((s) => s.replaceSpaces);

  function onExportJson() {
    const text = exportSpacesPayload(spaces, activeSpaceId);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aglens-spaces-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function onImportFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = importSpacesPayload(String(reader.result ?? ""));
        replaceSpaces(payload.spaces, payload.activeSpaceId);
      } catch {
        // silently fail — caller can add error handling if needed
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  }

  return (
    <footer className="flex items-center gap-1 overflow-x-auto border-t border-slate-100 bg-white px-6 py-2">
      {/* Space tabs */}
      <div className="flex items-center gap-1 flex-1 min-w-0 overflow-x-auto">
        {spaces.map((space) => (
          <button
            key={space.id}
            type="button"
            className={`shrink-0 rounded-md px-3 py-1.5 text-[12px] transition-colors ${
              space.id === activeSpaceId
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
            onClick={() => setActiveSpaceId(space.id)}
          >
            {space.title}
          </button>
        ))}
      </div>

      <div className="h-3 w-px bg-slate-200 shrink-0 mx-2" />

      {/* Export / Import */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          onClick={onExportJson}
        >
          Export
        </button>
        <button
          type="button"
          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
          onClick={() => importInputRef.current?.click()}
        >
          Import
        </button>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={onImportFileChange}
        />
      </div>
    </footer>
  );
}
