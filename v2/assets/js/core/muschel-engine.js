/* Miesmuschel decision logic (Planungs.md 5.8, 3). v1's muschel/app.js
   binds the coin-flip straight to its own DOM elements, so this is a fresh,
   tiny, DOM-free reimplementation of the same rule (50/50, keep last 12) -
   not an import of the v1 file. */

export const MAX_HISTORY_ENTRIES = 12;

export function askMuschel(question) {
  return {
    question: question?.trim() || "Ohne Frage",
    allowed: Math.random() < 0.5,
    at: Date.now(),
  };
}

export function pushHistory(history, entry) {
  return [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
}
