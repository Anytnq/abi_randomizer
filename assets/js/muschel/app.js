import {
  playmuschelDecisionSound,
} from "../randomizer/sound.js";
import { escapeHtml } from "../utils.js";
import { initVolumeControl } from "../volume-control.js";
import { loadArray, saveArray } from "../randomizer/storage.js";
import { publishResult } from "../randomizer/squad.js?v=20260507-4";
import { createSquadUI } from "../randomizer/squad-ui.js";

const HISTORY_STORAGE_KEY = "muschelHistoryEntries";
const MAX_HISTORY_ENTRIES = 12;
const SQUAD_STORAGE_KEY = "muschelSquadSession";

let squadState;
let isSquadReady;
let lastDecision = null;

const elements = {
  questionInput: document.getElementById("muschelQuestionInput"),
  askButton: document.getElementById("muschelAskBtn"),
  clearButton: document.getElementById("muschelClearBtn"),
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

  elements.historyList.innerHTML = "";
  entries.forEach((entry) => {
    const item = document.createElement("li");
    item.className = `muschel-history-item ${entry.allowed ? "allow" : "deny"}`;
    item.innerHTML = `<span>${escapeHtml(entry.question)}</span><strong>${entry.allowed ? "JA" : "NEIN"}</strong>`;
    elements.historyList.appendChild(item);
  });
}

function showDecision(question, allowed) {
  if (!elements.resultCard || !elements.resultTitle || !elements.resultLine) {
    return;
  }

  elements.resultCard.hidden = false;
  elements.resultCard.classList.toggle("allow", allowed);
  elements.resultCard.classList.toggle("deny", !allowed);
  elements.resultTitle.textContent = allowed
    ? "Die Miesmuschel sagt: JA"
    : "Die Miesmuschel sagt: NEIN";
  elements.resultLine.textContent = allowed
    ? "Du darfst das Gear spielen."
    : "Du spielst nur Pistole. Kein Diskussion.";

  playmuschelDecisionSound(allowed);

  lastDecision = { question, allowed };
  syncSquadResult();

  const historyEntries = loadHistory();
  const nextEntries = [
    {
      question,
      allowed,
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
  showDecision(question, allowed);
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
  renderHistory(loadHistory());

  elements.askButton?.addEventListener("click", askmuschel);
  elements.questionInput?.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      askmuschel();
    }
  });
  elements.clearButton?.addEventListener("click", clearHistory);

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
