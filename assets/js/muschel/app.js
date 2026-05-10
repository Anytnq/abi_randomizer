import {
  getMasterVolume,
  playmuschelDecisionSound,
  setMasterVolume,
} from "../randomizer/sound.js";

const MASTER_VOLUME_STORAGE_KEY = "masterVolumeLevel";
const HISTORY_STORAGE_KEY = "muschelHistoryEntries";
const MAX_HISTORY_ENTRIES = 12;

const elements = {
  questionInput: document.getElementById("muschelQuestionInput"),
  askButton: document.getElementById("muschelAskBtn"),
  clearButton: document.getElementById("muschelClearBtn"),
  resultCard: document.getElementById("muschelResultCard"),
  resultTitle: document.getElementById("muschelResultTitle"),
  resultLine: document.getElementById("muschelResultLine"),
  historyList: document.getElementById("muschelHistoryList"),
  volumeSlider: document.getElementById("masterVolumeSlider"),
  volumeValue: document.getElementById("masterVolumeValue"),
};

function loadMasterVolumePreference() {
  try {
    const raw = localStorage.getItem(MASTER_VOLUME_STORAGE_KEY);
    if (raw === null) {
      return getMasterVolume();
    }

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      return getMasterVolume();
    }

    return Math.min(1, Math.max(0, parsed));
  } catch (_) {
    return getMasterVolume();
  }
}

function saveMasterVolumePreference(volume) {
  try {
    localStorage.setItem(MASTER_VOLUME_STORAGE_KEY, String(volume));
  } catch (_) {}
}

function updateVolumeValueLabel(volume) {
  if (!elements.volumeValue) {
    return;
  }

  elements.volumeValue.textContent = `${Math.round(volume * 100)}%`;
}

function initVolumeControl() {
  if (!elements.volumeSlider) {
    return;
  }

  const initialVolume = loadMasterVolumePreference();
  setMasterVolume(initialVolume);
  elements.volumeSlider.value = String(Math.round(initialVolume * 100));
  updateVolumeValueLabel(initialVolume);

  elements.volumeSlider.addEventListener("input", () => {
    const sliderValue = Number.parseInt(elements.volumeSlider.value, 10);
    const normalizedVolume = Math.min(1, Math.max(0, sliderValue / 100));
    setMasterVolume(normalizedVolume);
    saveMasterVolumePreference(normalizedVolume);
    updateVolumeValueLabel(normalizedVolume);
  });
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

function saveHistory(entries) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch (_) {}
}

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
}

window.addEventListener("load", initialize);
