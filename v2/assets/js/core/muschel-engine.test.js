import {
  askMuschel,
  buildMuschelAnswer,
  pushHistory,
  MAX_HISTORY_ENTRIES,
  SPECIAL_RESPONSES,
} from "./muschel-engine.js";

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Test fehlgeschlagen: ${name}`);
  }
}

function testAskMuschelShape() {
  const entry = askMuschel("Darf ich?");
  assert("question is preserved", entry.question === "Darf ich?");
  assert("allowed is a boolean", typeof entry.allowed === "boolean");
  assert("at is a timestamp", typeof entry.at === "number");
}

function testAskMuschelFallsBackOnEmptyQuestion() {
  const entry = askMuschel("   ");
  assert("blank question falls back to 'Ohne Frage'", entry.question === "Ohne Frage");
}

function testPushHistoryCapsAtMax() {
  let history = [];
  for (let i = 0; i < MAX_HISTORY_ENTRIES + 5; i += 1) {
    history = pushHistory(history, { question: `Q${i}`, allowed: true, at: i });
  }
  assert(
    `history caps at ${MAX_HISTORY_ENTRIES} entries`,
    history.length === MAX_HISTORY_ENTRIES,
  );
  assert("newest entry is first", history[0].question === `Q${MAX_HISTORY_ENTRIES + 4}`);
}

function testQuestionBecomesNaturalAnswer() {
  assert(
    "positive bin-ich question becomes du statement",
    buildMuschelAnswer("Bin ich Gut?", true) === "Ja, du bist gut.",
  );
  assert(
    "negative modal question is negated",
    buildMuschelAnswer("Darf ich dieses Gear spielen?", false) ===
      "Nein, du darfst nicht dieses Gear spielen.",
  );
}

function testSpecialResponsesCanBeSelected() {
  const randomValues = [0, 0.999];
  const entry = askMuschel("Was jetzt?", () => randomValues.shift());
  assert("special response is marked", entry.special === true);
  assert(
    "last configured special response can be selected",
    entry.answer === SPECIAL_RESPONSES.at(-1).answer,
  );
}

export function runMuschelEngineTests() {
  testAskMuschelShape();
  testAskMuschelFallsBackOnEmptyQuestion();
  testPushHistoryCapsAtMax();
  testQuestionBecomesNaturalAnswer();
  testSpecialResponsesCanBeSelected();
  return "Alle muschel-engine Tests bestanden.";
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("runV2Tests") === "1") {
    try {
      console.log(runMuschelEngineTests());
    } catch (error) {
      console.error(error);
    }
  }
}
