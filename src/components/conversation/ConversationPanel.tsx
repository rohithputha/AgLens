import {
  forwardRef,
  type FormEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAppStore } from "../../store/useAppStore";
import { useConversation } from "../../hooks/useConversation";
import { buildMessageFragmentPayload, setDragPayload } from "../../hooks/useDragDrop";
import type { Message, Reference } from "../../types/design";

interface ConversationPanelProps {
  spaceId: string;
  style?: CSSProperties;
}

export interface ConversationPanelHandle {
  jumpToMessage: (sourceMessageIds: string[], fallbackText?: string) => void;
}

// ── MessageBubble ──────────────────────────────────────────────────────────
// Makes the entire bubble draggable with a grab cursor.
// - If the user has selected text inside this bubble, only the selected text
//   is sent as the drag payload.
// - Otherwise the full message content is dragged.
// - Text selection still works: we only set `draggable` on mousedown and
//   clear it on mouseup, so normal click-drag to select is unaffected.
//   Actually, the trick is simpler: the bubble is ALWAYS draggable, but we
//   use onMouseDown to detect "start of a potential text selection" and
//   temporarily disable draggable. On mouseup we re-enable it.

function MessageBubble({
  message,
  isSending,
  isHighlighted,
}: {
  message: Message;
  isSending: boolean;
  isHighlighted: boolean;
}) {
  const bubbleRef = useRef<HTMLDivElement>(null);
  // Track whether user is in a mousedown that might become a text selection.
  // When mouse is down on the text content, we disable draggable so the
  // browser can do native text selection. When mouse comes back up, we
  // re-enable draggable.
  const [selectingText, setSelectingText] = useState(false);

  // On mouseup anywhere in the document, re-enable draggable.
  useEffect(() => {
    if (!selectingText) return;
    function handleUp() {
      setSelectingText(false);
    }
    document.addEventListener("mouseup", handleUp);
    return () => document.removeEventListener("mouseup", handleUp);
  }, [selectingText]);

  const handleDragStart = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const el = bubbleRef.current;
      const selection = window.getSelection();
      const selected = selection?.toString().trim();
      const useSelected =
        selected && selection?.anchorNode && el?.contains(selection.anchorNode)
          ? selected
          : undefined;

      event.dataTransfer.effectAllowed = "copyMove";
      setDragPayload(event, buildMessageFragmentPayload(message, useSelected));

      // Set a custom drag image so the ghost looks like a small pill
      // instead of the entire bubble.
      const ghost = document.createElement("div");
      ghost.textContent = useSelected
        ? useSelected.slice(0, 50) + (useSelected.length > 50 ? "…" : "")
        : message.content.slice(0, 50) + (message.content.length > 50 ? "…" : "");
      ghost.style.cssText =
        "position:fixed;top:-1000px;left:-1000px;padding:6px 12px;border-radius:8px;font-size:12px;max-width:250px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;" +
        (message.role === "user"
          ? "background:#0f172a;color:#fff;"
          : "background:#f1f5f9;color:#1e293b;border:1px solid #e2e8f0;");
      document.body.appendChild(ghost);
      event.dataTransfer.setDragImage(ghost, 0, 0);
      requestAnimationFrame(() => ghost.remove());
    },
    [message],
  );

  // Mouse down on the text content area → disable draggable temporarily
  // so the browser can do native text selection via click-drag.
  const handleContentMouseDown = useCallback(() => {
    setSelectingText(true);
  }, []);

  const isUser = message.role === "user";
  const draggable = !selectingText;

  return (
    <article
      id={`msg-${message.id}`}
      className={`group relative max-w-[88%] ${
        isUser ? "ml-auto" : "mr-auto"
      } ${isHighlighted ? "ring-2 ring-blue-300 rounded-2xl" : ""}`}
    >
      {isUser ? (
        <div
          ref={bubbleRef}
          draggable={draggable}
          onDragStart={handleDragStart}
          className="rounded-2xl rounded-tr-sm bg-slate-900 shadow-sm shadow-slate-900/20 px-4 py-3 text-sm text-white leading-relaxed transition-shadow hover:shadow-md hover:shadow-slate-900/30 cursor-grab active:cursor-grabbing"
        >
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onMouseDown={handleContentMouseDown} className="cursor-text">
            <p className="whitespace-pre-wrap select-text">
              {message.content || (isSending ? "Thinking…" : "")}
            </p>
          </div>
        </div>
      ) : (
        <div
          ref={bubbleRef}
          draggable={draggable}
          onDragStart={handleDragStart}
          className="rounded-2xl rounded-tl-sm bg-slate-50 shadow-sm shadow-slate-100 px-4 py-3 text-sm text-slate-800 leading-relaxed transition-shadow hover:shadow-md hover:shadow-slate-200/60 cursor-grab active:cursor-grabbing"
        >
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div onMouseDown={handleContentMouseDown} className="cursor-text">
            <div className="prose prose-sm prose-slate max-w-none select-text [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-800 [&_pre]:p-3 [&_pre]:text-xs [&_pre]:text-slate-100 [&_pre_code]:bg-transparent [&_pre_code]:text-inherit [&_code]:rounded [&_code]:bg-slate-200 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_code]:text-slate-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content || (isSending ? "_Thinking…_" : "")}
              </ReactMarkdown>
            </div>
          </div>
          {message.extracted_elements.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {message.extracted_elements.map((item) => (
                <span
                  key={item.id}
                  className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-400 border border-slate-200"
                >
                  {item.type}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </article>
  );
}

// ── ConversationPanel ──────────────────────────────────────────────────────

export const ConversationPanel = forwardRef<ConversationPanelHandle, ConversationPanelProps>(
  function ConversationPanel({ spaceId, style }, ref) {
    const [draft, setDraft] = useState("");
    const [showPasteModal, setShowPasteModal] = useState(false);
    const [pasteType, setPasteType] = useState<Reference["type"]>("paste");
    const [pasteLabel, setPasteLabel] = useState("");
    const [pasteContent, setPasteContent] = useState("");
    const [highlightMessageId, setHighlightMessageId] = useState<string | null>(null);

    const conversationRef = useRef<HTMLDivElement | null>(null);

    const spaces = useAppStore((s) => s.spaces);
    const addReference = useAppStore((s) => s.addReference);

    const activeSpace = spaces.find((s) => s.id === spaceId);

    const { isSending, error, lastFailedRequest, send, retryLastFailed, regenerate } =
      useConversation(spaceId);

    useImperativeHandle(ref, () => ({
      jumpToMessage(sourceMessageIds: string[], fallbackText?: string) {
        if (!activeSpace) return;

        const container = conversationRef.current;
        const ids = sourceMessageIds ?? [];

        let resolvedId: string | null = null;
        for (const id of ids) {
          if (activeSpace.conversation.some((m) => m.id === id)) {
            resolvedId = id;
            break;
          }
        }

        if (!resolvedId && fallbackText?.trim()) {
          const probe = fallbackText.trim().toLowerCase().slice(0, 60);
          const found = [...activeSpace.conversation]
            .reverse()
            .find((m) => m.content.toLowerCase().includes(probe));
          resolvedId = found?.id ?? null;
        }

        if (!resolvedId) return;

        const target = document.getElementById(`msg-${resolvedId}`);
        if (target && container) {
          container.scrollTo({
            top: target.offsetTop - container.clientHeight * 0.35,
            behavior: "smooth",
          });
          setHighlightMessageId(resolvedId);
          window.setTimeout(() => {
            setHighlightMessageId((current) => (current === resolvedId ? null : current));
          }, 1400);
        }
      },
    }));

    async function handleSend(event: FormEvent) {
      event.preventDefault();
      await send(draft, () => setDraft(""));
    }

    function submitPasteReference(event: FormEvent) {
      event.preventDefault();
      if (!activeSpace || !pasteContent.trim()) return;

      addReference(activeSpace.id, {
        type: pasteType,
        label: pasteLabel.trim() || "Untitled reference",
        content: pasteContent.trim(),
      });

      setPasteType("paste");
      setPasteLabel("");
      setPasteContent("");
      setShowPasteModal(false);
    }

    if (!activeSpace) return null;

    return (
      <>
        <section
          className="flex min-h-0 flex-col bg-white"
          style={style}
          onDragOver={(e) => e.preventDefault()}
        >
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <span className="text-[11px] font-medium uppercase tracking-widest text-slate-400">
              Conversation
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors"
                onClick={() => setShowPasteModal(true)}
              >
                Reference
              </button>
              <button
                type="button"
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
                onClick={retryLastFailed}
                disabled={!lastFailedRequest || isSending}
              >
                Retry
              </button>
              <button
                type="button"
                className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
                onClick={regenerate}
                disabled={isSending || activeSpace.conversation.length === 0}
              >
                Regenerate
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={conversationRef}
            className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4"
          >
            {activeSpace.conversation.length === 0 ? (
              <p className="text-sm text-slate-400 leading-relaxed">
                Describe your architecture problem. Drag messages into the canvas to capture decisions and constraints.
              </p>
            ) : null}

            {activeSpace.conversation.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSending={isSending}
                isHighlighted={highlightMessageId === message.id}
              />
            ))}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 px-5 py-4">
            <form className="flex items-end gap-3" onSubmit={handleSend}>
              <label className="sr-only" htmlFor="composer">
                Message composer
              </label>
              <textarea
                id="composer"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={3}
                placeholder="Ask about your architecture…"
                className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:border-slate-300 focus:outline-none transition-colors"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend(e as unknown as FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isSending}
                className="shrink-0 rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white disabled:opacity-40 hover:bg-slate-700 transition-colors"
              >
                {isSending ? "…" : "Send"}
              </button>
            </form>
            {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
          </div>
        </section>

        {/* Paste modal */}
        {showPasteModal ? (
          <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/20 p-4 backdrop-blur-sm">
            <form
              className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl shadow-black/10"
              onSubmit={submitPasteReference}
            >
              <h3 className="mb-5 text-[15px] font-semibold text-slate-900">Add Reference</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-slate-400">
                      Type
                    </label>
                    <select
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-slate-200 focus:bg-white focus:outline-none transition-colors"
                      value={pasteType}
                      onChange={(e) => setPasteType(e.target.value as Reference["type"])}
                    >
                      <option value="code_snippet">Code</option>
                      <option value="url">URL</option>
                      <option value="paste">Notes</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-slate-400">
                      Label
                    </label>
                    <input
                      className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-slate-200 focus:bg-white focus:outline-none transition-colors"
                      value={pasteLabel}
                      onChange={(e) => setPasteLabel(e.target.value)}
                      placeholder="e.g. Current nginx config"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-widest text-slate-400">
                    Content
                  </label>
                  <textarea
                    rows={8}
                    value={pasteContent}
                    onChange={(e) => setPasteContent(e.target.value)}
                    className="w-full rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700 focus:border-slate-200 focus:bg-white focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  className="rounded-lg px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
                  onClick={() => setShowPasteModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors">
                  Save
                </button>
              </div>
            </form>
          </div>
        ) : null}
      </>
    );
  },
);
