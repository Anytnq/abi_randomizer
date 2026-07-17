/* Miesmuschel decision logic (Planungs.md 5.8, 3). v1's muschel/app.js
   binds the coin-flip straight to its own DOM elements, so this is a fresh,
   tiny, DOM-free reimplementation of the same rule (50/50, keep last 12) -
   not an import of the v1 file. */

export const MAX_HISTORY_ENTRIES = 12;
export const SPECIAL_RESPONSE_CHANCE = 0.2;

export const SPECIAL_RESPONSES = [
  { answer: "Keins von beiden.", allowed: false, tone: "neutral" },
  { answer: "Ich glaub eher nicht.", allowed: false, tone: "deny" },
  { answer: "Nein.", allowed: false, tone: "deny" },
  { answer: "Ja.", allowed: true, tone: "allow" },
  { answer: "Frag doch einfach noch mal!", allowed: false, tone: "neutral" },
  { answer: "Gar nichts.", allowed: false, tone: "neutral" },
  { answer: "Du Hurensohn.", allowed: false, tone: "deny" },
];

const ICH_QUESTION_PATTERNS = [
  [/^bin ich\b/i, "du bist"],
  [/^kann ich\b/i, "du kannst"],
  [/^darf ich\b/i, "du darfst"],
  [/^soll ich\b/i, "du sollst"],
  [/^muss ich\b/i, "du musst"],
  [/^werde ich\b/i, "du wirst"],
  [/^habe ich\b/i, "du hast"],
  [/^mag ich\b/i, "du magst"],
  [/^will ich\b/i, "du willst"],
  [/^brauche ich\b/i, "du brauchst"],
];

function lowerFirst(value) {
  return value ? value[0].toLocaleLowerCase("de-DE") + value.slice(1) : "";
}

export function buildMuschelAnswer(question, allowed) {
  const cleanQuestion = String(question ?? "")
    .trim()
    .replace(/[?!.]+$/u, "")
    .trim();
  const decision = allowed ? "Ja" : "Nein";

  for (const [pattern, statementStart] of ICH_QUESTION_PATTERNS) {
    if (!pattern.test(cleanQuestion)) continue;
    const rest = lowerFirst(cleanQuestion.replace(pattern, "").trim());
    if (!rest) return `${decision}.`;
    return allowed
      ? `${decision}, ${statementStart} ${rest}.`
      : `${decision}, ${statementStart} nicht ${rest}.`;
  }

  return cleanQuestion && cleanQuestion !== "Ohne Frage"
    ? `${decision}. Die Antwort auf deine Frage „${cleanQuestion}“ ist ${decision.toLowerCase()}.`
    : `${decision}.`;
}

export function askMuschel(question, random = Math.random) {
  const normalizedQuestion = question?.trim() || "Ohne Frage";
  if (random() < SPECIAL_RESPONSE_CHANCE) {
    const index = Math.min(
      SPECIAL_RESPONSES.length - 1,
      Math.floor(random() * SPECIAL_RESPONSES.length),
    );
    return {
      question: normalizedQuestion,
      ...SPECIAL_RESPONSES[index],
      special: true,
      at: Date.now(),
    };
  }

  const allowed = random() < 0.5;
  return {
    question: normalizedQuestion,
    allowed,
    answer: buildMuschelAnswer(normalizedQuestion, allowed),
    tone: allowed ? "allow" : "deny",
    special: false,
    at: Date.now(),
  };
}

export function pushHistory(history, entry) {
  return [entry, ...history].slice(0, MAX_HISTORY_ENTRIES);
}
