import { createEmptyExtract, normalize } from "./design";
import type { DesignExtract, ExtractParseResult } from "../types/design";

export function canonicalize(text: string): string {
  return normalize(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  const tokens = canonicalize(text)
    .split(" ")
    .filter((token) => token.length > 2);

  const set = new Set<string>(tokens);
  for (let index = 0; index < tokens.length - 1; index += 1) {
    set.add(`${tokens[index]}${tokens[index + 1]}`);
  }

  return set;
}

export function similarity(a: string, b: string): number {
  const aSet = tokenSet(a);
  const bSet = tokenSet(b);

  if (aSet.size === 0 || bSet.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }

  const union = new Set([...aSet, ...bSet]).size;
  return union === 0 ? 0 : intersection / union;
}

export function isNearDuplicate(a: string, b: string): boolean {
  const aCanon = canonicalize(a);
  const bCanon = canonicalize(b);
  const aCompact = aCanon.replace(/\s+/g, "");
  const bCompact = bCanon.replace(/\s+/g, "");

  if (!aCanon || !bCanon) {
    return false;
  }

  if (
    aCanon === bCanon ||
    aCanon.includes(bCanon) ||
    bCanon.includes(aCanon) ||
    aCompact.includes(bCompact) ||
    bCompact.includes(aCompact)
  ) {
    return true;
  }

  const aSet = tokenSet(aCanon);
  const bSet = tokenSet(bCanon);
  let intersection = 0;
  for (const token of aSet) {
    if (bSet.has(token)) {
      intersection += 1;
    }
  }

  const minSize = Math.min(aSet.size, bSet.size);
  if (intersection >= 2 && minSize > 0 && intersection / minSize >= 0.4) {
    return true;
  }

  return similarity(aCanon, bCanon) >= 0.72;
}

export function parseAssistantExtract(raw: string): ExtractParseResult {
  const match = raw.match(/<design_extract>\s*([\s\S]*?)\s*<\/design_extract>/i);
  if (!match) {
    return {
      text: raw.trim(),
      extract: createEmptyExtract(),
      parse_error: null,
      raw_extract: "",
    };
  }

  const visibleText = raw.replace(match[0], "").trim();
  const rawExtract = match[1] ?? "";

  try {
    const parsed = JSON.parse(rawExtract) as DesignExtract;
    return {
      text: visibleText,
      extract: {
        ...createEmptyExtract(),
        ...parsed,
      },
      parse_error: null,
      raw_extract: rawExtract,
    };
  } catch (error) {
    return {
      text: visibleText,
      extract: createEmptyExtract(),
      parse_error: error instanceof Error ? error.message : "Invalid extraction JSON",
      raw_extract: rawExtract,
    };
  }
}

export function stripExtractTail(raw: string): string {
  return raw.replace(/<design_extract>[\s\S]*$/i, "").trimEnd();
}
