import type { DesignCanvas, Message } from "../types/design";

const MODEL_CONTEXT_WINDOW: Record<string, number> = {
  "claude-3-7-sonnet-latest": 200000,
  "claude-3-5-sonnet-latest": 200000,
};

const MODEL_PRICING_PER_MILLION: Record<string, { in: number; out: number }> = {
  "claude-3-7-sonnet-latest": { in: 3, out: 15 },
  "claude-3-5-sonnet-latest": { in: 3, out: 15 },
};

export function estimateTokens(text: string): number {
  if (!text) {
    return 0;
  }
  return Math.max(1, Math.ceil(text.length / 4));
}

export function estimateContextTokens(conversation: Message[], canvas: DesignCanvas): number {
  const conversationText = conversation.map((message) => `${message.role}: ${message.content}`).join("\n");
  const canvasText = JSON.stringify(canvas);
  return estimateTokens(conversationText) + estimateTokens(canvasText);
}

export function modelContextWindow(model: string): number {
  return MODEL_CONTEXT_WINDOW[model] ?? 200000;
}

export function estimateCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING_PER_MILLION[model] ?? MODEL_PRICING_PER_MILLION["claude-3-7-sonnet-latest"];
  return (inputTokens / 1_000_000) * pricing.in + (outputTokens / 1_000_000) * pricing.out;
}
