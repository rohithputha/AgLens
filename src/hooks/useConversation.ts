import { useState } from "react";
import { estimateContextTokens, estimateCostUsd, estimateTokens } from "../lib/tokens";
import { newId, nowIso } from "../lib/design";
import { streamConversation } from "../services/anthropic";
import { useAppStore } from "../store/useAppStore";
import type { Message } from "../types/design";

interface FailedRequest {
  conversation: Message[];
  assistantMessageId: string;
  spaceId: string;
}

export function useConversation(spaceId: string) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedRequest, setLastFailedRequest] = useState<FailedRequest | null>(null);

  const apiKey = useAppStore((s) => s.apiKey);
  const model = useAppStore((s) => s.model);
  const spaces = useAppStore((s) => s.spaces);
  const addMessage = useAppStore((s) => s.addMessage);
  const updateMessageContent = useAppStore((s) => s.updateMessageContent);
  const removeMessage = useAppStore((s) => s.removeMessage);
  const applyExtract = useAppStore((s) => s.applyExtract);
  const recordUsage = useAppStore((s) => s.recordUsage);

  const activeSpace = spaces.find((s) => s.id === spaceId);

  async function runConversationRequest(
    reqSpaceId: string,
    canvasSnapshot: NonNullable<typeof activeSpace>["design_canvas"],
    conversation: Message[],
    assistantMessageId: string,
  ) {
    setIsSending(true);
    setError(null);

    try {
      const response = await streamConversation({
        apiKey,
        model,
        canvas: canvasSnapshot,
        conversation,
        onTextDelta: (text) => {
          updateMessageContent(reqSpaceId, assistantMessageId, text);
        },
      });

      updateMessageContent(reqSpaceId, assistantMessageId, response.text);
      applyExtract(reqSpaceId, assistantMessageId, response.extract, {
        parse_error: response.parse_error,
        raw_extract: response.raw_extract,
      });

      const usage = response.usage ?? {
        input_tokens: estimateContextTokens(conversation, canvasSnapshot),
        output_tokens: estimateTokens(response.text),
      };

      recordUsage(reqSpaceId, {
        at: nowIso(),
        model,
        input_tokens: usage.input_tokens,
        output_tokens: usage.output_tokens,
        estimated: response.usage === null,
        cost_usd: estimateCostUsd(model, usage.input_tokens, usage.output_tokens),
      });

      setLastFailedRequest(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error contacting Claude API.";
      setError(message);
      updateMessageContent(reqSpaceId, assistantMessageId, `[Request failed] ${message}`);
      setLastFailedRequest({ conversation, assistantMessageId, spaceId: reqSpaceId });
    } finally {
      setIsSending(false);
    }
  }

  async function send(draft: string, onClear: () => void) {
    if (!activeSpace || !draft.trim()) return;
    if (!apiKey.trim()) {
      setError("Add your Anthropic API key before sending a message.");
      return;
    }

    const userMessage: Message = {
      id: newId(),
      role: "user",
      content: draft.trim(),
      timestamp: nowIso(),
      extracted_elements: [],
    };

    const assistantMessage: Message = {
      id: newId(),
      role: "assistant",
      content: "",
      timestamp: nowIso(),
      extracted_elements: [],
    };

    addMessage(activeSpace.id, userMessage);
    addMessage(activeSpace.id, assistantMessage);
    onClear();

    const conversation = [...activeSpace.conversation, userMessage];
    await runConversationRequest(activeSpace.id, activeSpace.design_canvas, conversation, assistantMessage.id);
  }

  async function retryLastFailed() {
    if (!lastFailedRequest || isSending || !activeSpace) return;
    await runConversationRequest(
      lastFailedRequest.spaceId,
      activeSpace.design_canvas,
      lastFailedRequest.conversation,
      lastFailedRequest.assistantMessageId,
    );
  }

  async function regenerate() {
    if (!activeSpace || isSending || !apiKey.trim()) return;

    const conversation = [...activeSpace.conversation];
    if (conversation.length === 0) return;

    const last = conversation[conversation.length - 1];
    if (last.role !== "assistant") {
      setError("Regenerate works when the latest message is from Claude.");
      return;
    }

    removeMessage(activeSpace.id, last.id);
    const assistantMessage: Message = {
      id: newId(),
      role: "assistant",
      content: "",
      timestamp: nowIso(),
      extracted_elements: [],
    };
    addMessage(activeSpace.id, assistantMessage);

    const userBoundConversation = conversation.slice(0, -1);
    await runConversationRequest(
      activeSpace.id,
      activeSpace.design_canvas,
      userBoundConversation,
      assistantMessage.id,
    );
  }

  return {
    isSending,
    error,
    setError,
    lastFailedRequest,
    send,
    retryLastFailed,
    regenerate,
  };
}
