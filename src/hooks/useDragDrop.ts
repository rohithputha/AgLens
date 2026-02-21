import type { DragEvent } from "react";
import type { CanvasDropTarget } from "../store/useAppStore";
import type { Message } from "../types/design";

export const DRAG_MIME = "application/x-archlens-drag";

export type CanvasSection = Exclude<CanvasDropTarget, "problem_statement">;

export type DragPayload =
  | { kind: "message-fragment"; text: string; messageId?: string }
  | { kind: "canvas-item"; section: CanvasSection; id: string }
  | { kind: "attachable"; itemType: "constraint" | "question" | "reference"; id: string };

export function parseDragPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_MIME);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

export function setDragPayload(event: DragEvent, payload: DragPayload): void {
  event.dataTransfer.setData(DRAG_MIME, JSON.stringify(payload));
  event.dataTransfer.setData(
    "text/plain",
    payload.kind === "message-fragment" ? payload.text : payload.id,
  );
}

export function buildMessageFragmentPayload(message: Message, selectedText?: string): DragPayload {
  return {
    kind: "message-fragment",
    text: selectedText?.trim() ? selectedText.trim() : message.content,
    messageId: message.id,
  };
}
