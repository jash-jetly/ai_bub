// Simple intuition layer to decide when the user has finished
// speaking and a response should be generated.

// Heuristics:
// - Consider incomplete if ends with ellipsis, comma, dash, or conjunction words
// - Consider complete if ends with sentence punctuation or closing bracket/quote
// - If no punctuation but long enough (>150 chars), treat as complete

export function isMessageComplete(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // Treat as incomplete only if it clearly "trails off"
  const trailsOff = /(\.\.\.|…|[,\-–—]\s*)$/.test(t)
    || /\b(and|but|because|so|then|when|while|if|though|although|like)\s*$/i.test(t);
  if (trailsOff) return false;

  // Otherwise, assume complete (even without punctuation). Punctuation/question endings are of course complete.
  return true;
}

export function buildCombinedUserMessage(buffer: string[]): string {
  return buffer.map(s => s.trim()).filter(Boolean).join("\n\n");
}