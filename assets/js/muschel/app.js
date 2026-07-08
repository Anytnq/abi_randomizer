import {
  playmuschelDecisionSound,
} from "../randomizer/sound.js";
import { initVolumeControl } from "../volume-control.js";
import { loadArray, saveArray } from "../randomizer/storage.js";
import { publishResult } from "../randomizer/squad.js?v=20260708-1";
import { createSquadUI } from "../randomizer/squad-ui.js";

const HISTORY_STORAGE_KEY = "muschelHistoryEntries";
const CUSTOM_ANSWERS_STORAGE_KEY = "muschelCustomAnswers";
const MAX_HISTORY_ENTRIES = 12;
const SQUAD_STORAGE_KEY = "muschelSquadSession";
const DEFAULT_ALLOW_ANSWERS = ["Du darfst das Gear spielen."];
const DEFAULT_DENY_ANSWERS = ["Du spielst nur Pistole. Kein Diskussion."];

let squadState;
let isSquadReady;
let lastDecision = null;

const elements = {
  questionInput: document.getElementById("muschelQuestionInput"),
  askButton: document.getElementById("muschelAskBtn"),
  clearButton: document.getElementById("muschelClearBtn"),
  allowAnswersInput: document.getElementById("muschelAllowAnswersInput"),
  denyAnswersInput: document.getElementById("muschelDenyAnswersInput"),
  saveAnswersButton: document.getElementById("muschelSaveAnswersBtn"),
  resetAnswersButton: document.getElementById("muschelResetAnswersBtn"),
  resultCard: document.getElementById("muschelResultCard"),
  resultTitle: document.getElementById("muschelResultTitle"),
  resultLine: document.getElementById("muschelResultLine"),
  historyList: document.getElementById("muschelHistoryList"),
};

const loadHistory = () => loadArray(HISTORY_STORAGE_KEY);
const saveHistory = (entries) => saveArray(HISTORY_STORAGE_KEY, entries);

function renderHistory(entries) {
  if (!elements.historyList) {
    return;
  }

  if (!entries.length) {
    elements.historyList.innerHTML =
      '<li class="muschel-history-empty">Noch keine Entscheidung</li>';
    return;
  }

  elements.historyList.replaceChildren();
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = `muschel-history-item ${entry.allowed ? "allow" : "deny"}`;

    const question = document.createElement("span");
    question.textContent = entry.question;

    const answer = document.createElement("strong");
    answer.textContent = entry.allowed ? "JA" : "NEIN";

    item.append(question, answer);
    elements.historyList.appendChild(item);
  });
}

function showDecision(question, allowed, answerLine) {
  if (!elements.resultCard || !elements.resultTitle || !elements.resultLine) {
    return;
  }

  elements.resultCard.hidden = false;
  elements.resultCard.classList.toggle("allow", allowed);
  elements.resultCard.classList.toggle("deny", !allowed);
  elements.resultTitle.textContent = allowed
    ? "Die Miesmuschel sagt: JA"
    : "Die Miesmuschel sagt: NEIN";
  elements.resultLine.textContent = answerLine;

  playmuschelDecisionSound(allowed);

  lastDecision = { question, allowed, answerLine };
  syncSquadResult();

  const historyEntries = loadHistory();
  const nextEntries = [
    {
      question,
      allowed,
      answerLine,
      at: Date.now(),
    },
    ...historyEntries,
  ].slice(0, MAX_HISTORY_ENTRIES);

  saveHistory(nextEntries);
  renderHistory(nextEntries);
}

function askmuschel() {
  const question = elements.questionInput?.value.trim() || "Ohne Frage";
  const allowed = Math.random() < 0.5;
  const answers = loadCustomAnswers();
  const pool = allowed ? answers.allow : answers.deny;
  const answerLine = pickAnswer(
    pool,
    allowed ? DEFAULT_ALLOW_ANSWERS : DEFAULT_DENY_ANSWERS,
  );
  showDecision(question, allowed, answerLine);
}

function clearHistory() {
  saveHistory([]);
  renderHistory([]);
}

function getCurrentResult() {
  if (!lastDecision) {
    return { Frage: "-", Antwort: "-" };
  }

  return {
    Frage: lastDecision.question,
    Antwort: lastDecision.allowed ? "JA" : "NEIN",
    Urteil: lastDecision.answerLine,
  };
}

function syncSquadResult() {
  if (!isSquadReady()) {
    return;
  }

  publishResult(squadState.code, squadState.playerId, getCurrentResult());
}

function initialize() {
  initVolumeControl();
  syncAnswerInputs(loadCustomAnswers());
  renderHistory(loadHistory());

  elements.askButton?.addEventListener("click", askmuschel);
  elements.questionInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      askmuschel();
    }
  });
  elements.clearButton?.addEventListener("click", clearHistory);
  elements.saveAnswersButton?.addEventListener("click", saveAnswersFromInputs);
  elements.resetAnswersButton?.addEventListener("click", resetCustomAnswers);

  const squadUI = createSquadUI({
    storageKey: SQUAD_STORAGE_KEY,
    memberHintText:
      "Du bist Squad Member. Deine Muschel-Antworten werden live geteilt.",
    getSelectedCategories: () => [],
    onSessionStart: () => syncSquadResult(),
    onSessionReset: () => {},
    onSquadDataUpdate: () => {},
    idPrefix: "muschel-",
  });
  squadState = squadUI.squadState;
  isSquadReady = squadUI.isSquadReady;

  squadUI.initSquad();
  squadUI.tryAutoRejoinSquad();
  squadUI.updateSquadRoleHint();
}

window.addEventListener("load", initialize);

function loadCustomAnswers() {
  try {
    const raw = localStorage.getItem(CUSTOM_ANSWERS_STORAGE_KEY);
    if (!raw) {
      return getDefaultAnswers();
    }

    const parsed = JSON.parse(raw);
    const allow = normalizeAnswerList(parsed?.allow, DEFAULT_ALLOW_ANSWERS);
    const deny = normalizeAnswerList(parsed?.deny, DEFAULT_DENY_ANSWERS);
    return { allow, deny };
  } catch (_) {
    return getDefaultAnswers();
  }
}

function saveCustomAnswers(answers) {
  try {
    localStorage.setItem(CUSTOM_ANSWERS_STORAGE_KEY, JSON.stringify(answers));
  } catch (_) {}
}

function getDefaultAnswers() {
  return {
    allow: [...DEFAULT_ALLOW_ANSWERS],
    deny: [...DEFAULT_DENY_ANSWERS],
  };
}

function normalizeAnswerList(value, fallback) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  const normalized = value
    .map((entry) => String(entry ?? "").trim())
    .filter((entry) => entry.length > 0)
    .slice(0, 20);

  return normalized.length > 0 ? normalized : [...fallback];
}

function parseAnswerInput(value, fallback) {
  return normalizeAnswerList(String(value ?? "").split(/\r?\n/), fallback);
}

function syncAnswerInputs(answers) {
  if (elements.allowAnswersInput) {
    elements.allowAnswersInput.value = answers.allow.join("\n");
  }

  if (elements.denyAnswersInput) {
    elements.denyAnswersInput.value = answers.deny.join("\n");
  }
}

function saveAnswersFromInputs() {
  const answers = {
    allow: parseAnswerInput(
      elements.allowAnswersInput?.value,
      DEFAULT_ALLOW_ANSWERS,
    ),
    deny: parseAnswerInput(
      elements.denyAnswersInput?.value,
      DEFAULT_DENY_ANSWERS,
    ),
  };

  saveCustomAnswers(answers);
  syncAnswerInputs(answers);
}

function resetCustomAnswers() {
  const answers = getDefaultAnswers();
  saveCustomAnswers(answers);
  syncAnswerInputs(answers);
}

function pickAnswer(answers, fallback) {
  const safeAnswers = normalizeAnswerList(answers, fallback);
  return safeAnswers[Math.floor(Math.random() * safeAnswers.length)];
}
