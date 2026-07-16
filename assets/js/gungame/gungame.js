import { gungameWeapons } from "./data.js";
import { formatWeaponCategory } from "../randomizer/game.js";
import {
  publishResult,
  publishSpinning,
} from "../randomizer/squad.js?v=20260708-1";
import { createSquadUI } from "../randomizer/squad-ui.js";

const MIN_STAGES = 3;
const MAX_STAGES = 30;
const DEFAULT_STAGES = 12;
const GUNGAME_SQUAD_CATEGORIES = ["weapon"];
const SQUAD_STORAGE_KEY = "gungameSquadSession";
const GUNGAME_PROGRESS_STORAGE_KEY = "gungameProgress";

const elements = {
  stageCountInput: document.getElementById("gungameStageCount"),
  upgradeChanceInput: document.getElementById("gungameUpgradeChance"),
  generateButton: document.getElementById("gungameGenerateBtn"),
  statusText: document.getElementById("gungameStatusText"),
  raidDoneButton: document.getElementById("gungameRaidDoneBtn"),
  previousButton: document.getElementById("gungamePrevBtn"),
  nextButton: document.getElementById("gungameNextBtn"),
  resetButton: document.getElementById("gungameResetBtn"),
  raidResult: document.getElementById("gungameRaidResult"),
  list: document.getElementById("gungameList"),
};

const state = {
  route: [],
  currentIndex: 0,
  lastRaidResult:
    "Schließe einen Raid ab, um auf die nächsten Stufe zu gelangen.",
};

let squadState;
let isSquadReady;

initialize();

function initialize() {
  elements.generateButton?.addEventListener("click", regenerateRoute);
  elements.raidDoneButton?.addEventListener("click", completeRaid);
  elements.previousButton?.addEventListener("click", moveToPreviousStage);
  elements.nextButton?.addEventListener("click", moveToNextStage);
  elements.resetButton?.addEventListener("click", resetProgress);
  elements.stageCountInput?.addEventListener("change", saveProgress);
  elements.upgradeChanceInput?.addEventListener("change", saveProgress);

  const squadUI = createSquadUI({
    storageKey: SQUAD_STORAGE_KEY,
    memberHintText:
      "Du bist Squad Member. Dein Gungame-Stand wird live geteilt.",
    getSelectedCategories: () => GUNGAME_SQUAD_CATEGORIES,
    onSessionStart: (sq) => syncSquadResult(),
    onSessionReset: () => {},
    onSquadDataUpdate: () => {},
    idPrefix: "gungame-",
  });
  squadState = squadUI.squadState;
  isSquadReady = squadUI.isSquadReady;

  squadUI.initSquad();
  squadUI.tryAutoRejoinSquad();

  if (!restoreProgress()) {
    regenerateRoute();
  } else {
    render();
    syncSquadResult();
  }
  squadUI.updateSquadRoleHint();
}

function regenerateRoute() {
  const stageCount = readStageCount();
  elements.stageCountInput.value = String(stageCount);

  state.route = buildRoute(stageCount);
  state.currentIndex = 0;
  state.lastRaidResult =
    "Neue Route generiert. Schließe einen Raid ab, um auf die nächsten Stufe zu gelangen.";

  render();
  saveProgress();
  syncSquadResult();
}

function completeRaid() {
  if (state.route.length === 0) {
    return;
  }

  const currentEntry = state.route[state.currentIndex];
  if (!currentEntry) {
    return;
  }

  if (isSquadReady()) {
    publishSpinning(squadState.code, squadState.playerId, true);
  }

  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.route.length) {
    state.lastRaidResult = `Finale geschafft mit ${currentEntry.name}. GunGame Route abgeschlossen.`;
    render();
    saveProgress();
    syncSquadResult();

    if (isSquadReady()) {
      publishSpinning(squadState.code, squadState.playerId, false);
    }

    return;
  }

  const nextEntry = state.route[nextIndex];
  const upgradeChance = readUpgradeChance();
  const rolledUpgrade = Math.random() < upgradeChance;
  let raidResultText = `Raid abgeschlossen mit ${currentEntry.name} (Wert ${currentEntry.value}).`;

  if (rolledUpgrade) {
    const upgradedWeapon = pickHigherWeapon(nextEntry.value, nextEntry.name);
    if (upgradedWeapon) {
      state.route[nextIndex] = createRouteEntry(upgradedWeapon, nextIndex + 1);
      raidResultText += ` Upgrade aktiv: Stufe ${nextIndex + 1} wurde auf ${upgradedWeapon.name} (Wert ${state.route[nextIndex].value}) erhöht.`;
    } else {
      raidResultText +=
        " Upgrade gewürfelt, aber keine höhere Waffe verfügbar.";
    }
  } else {
    const percent = Math.round(upgradeChance * 100);
    raidResultText += ` Kein Upgrade dieses Mal (${percent}% Chance).`;
  }

  state.lastRaidResult = raidResultText;
  state.currentIndex = nextIndex;
  render();
  saveProgress();
  syncSquadResult();

  if (isSquadReady()) {
    publishSpinning(squadState.code, squadState.playerId, false);
  }
}

function moveToPreviousStage() {
  if (state.route.length === 0) {
    return;
  }

  state.currentIndex = Math.max(0, state.currentIndex - 1);
  render();
  saveProgress();
  syncSquadResult();
}

function moveToNextStage() {
  if (state.route.length === 0) {
    return;
  }

  state.currentIndex = Math.min(state.route.length - 1, state.currentIndex + 1);
  render();
  saveProgress();
  syncSquadResult();
}

function resetProgress() {
  state.currentIndex = 0;
  state.lastRaidResult =
    "Progress zurueckgesetzt. Schließe einen Raid ab, um Upgrade-Chancen zu nutzen.";
  render();
  saveProgress();
  syncSquadResult();
}

function buildRoute(stageCount) {
  const shuffledWeapons = shuffle([...gungameWeapons]);
  const route = [];

  for (let index = 0; index < stageCount; index += 1) {
    const weapon = shuffledWeapons[index % shuffledWeapons.length];
    route.push(createRouteEntry(weapon, index + 1));
  }

  return route;
}

function createRouteEntry(weapon, step) {
  return {
    step,
    name: weapon.name,
    category: formatWeaponCategory(weapon.category) || "Unknown",
    value: getWeaponValue(weapon),
  };
}

function getWeaponValue(weapon) {
  const parsedValue = Number.parseInt(String(weapon?.value ?? ""), 10);
  if (!Number.isFinite(parsedValue)) {
    return 1;
  }

  return Math.max(1, parsedValue);
}

function readUpgradeChance() {
  const raw = Number.parseInt(
    String(elements.upgradeChanceInput?.value ?? "25"),
    10,
  );
  const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 25;
  elements.upgradeChanceInput.value = String(percent);
  return percent / 100;
}

function pickHigherWeapon(currentValue, excludedName) {
  const candidates = gungameWeapons.filter((weapon) => {
    if (weapon.name === excludedName) {
      return false;
    }

    return getWeaponValue(weapon) > currentValue;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function readStageCount() {
  const parsed = Number.parseInt(elements.stageCountInput?.value || "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_STAGES;
  }

  return Math.max(MIN_STAGES, Math.min(MAX_STAGES, parsed));
}

function render() {
  renderStatus();
  renderList();
  renderControls();
}

function renderStatus() {
  const total = state.route.length;
  const current = total > 0 ? state.currentIndex + 1 : 0;
  const currentEntry = state.route[state.currentIndex];
  const valueText = currentEntry ? ` | Waffenwert: ${currentEntry.value}` : "";

  elements.statusText.innerHTML = `Aktuelle Stufe: <strong>${current} / ${total}</strong>${valueText}`;

  if (elements.raidResult) {
    elements.raidResult.textContent = state.lastRaidResult;
  }
}

function renderList() {
  elements.list.replaceChildren();

  state.route.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "gungame-item";

    if (index < state.currentIndex) {
      item.classList.add("is-done");
    }

    if (index === state.currentIndex) {
      item.classList.add("is-current");
    }

    const step = document.createElement("span");
    step.className = "gungame-step";
    step.textContent = String(entry.step);

    const weapon = document.createElement("span");
    weapon.className = "gungame-weapon";
    weapon.textContent = entry.name;

    const category = document.createElement("span");
    category.className = "gungame-category";
    category.textContent = entry.category;

    const value = document.createElement("span");
    value.className = "gungame-value";
    value.textContent = `Wert ${entry.value}`;

    item.append(step, weapon, category, value);
    elements.list.appendChild(item);
  });
}

function renderControls() {
  const total = state.route.length;
  const hasRoute = total > 0;

  elements.previousButton.disabled = !hasRoute || state.currentIndex <= 0;
  elements.nextButton.disabled = !hasRoute || state.currentIndex >= total - 1;
  elements.raidDoneButton.disabled = !hasRoute;
  elements.resetButton.disabled = !hasRoute;
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}

function getCurrentResult() {
  const currentEntry = state.route[state.currentIndex] ?? null;

  return {
    Stufe: `${Math.min(state.currentIndex + 1, state.route.length)} / ${state.route.length}`,
    Waffe: currentEntry?.name ?? "-",
  };
}

function syncSquadResult() {
  if (!isSquadReady()) {
    return;
  }

  publishResult(squadState.code, squadState.playerId, getCurrentResult());
}

function restoreProgress() {
  try {
    const raw = localStorage.getItem(GUNGAME_PROGRESS_STORAGE_KEY);
    if (!raw) {
      return false;
    }

    const saved = JSON.parse(raw);
    if (!saved || typeof saved !== "object") {
      return false;
    }

    const route = Array.isArray(saved.route)
      ? saved.route.filter(isValidRouteEntry)
      : [];
    if (route.length === 0) {
      return false;
    }

    state.route = route;
    state.currentIndex = Math.min(
      route.length - 1,
      Math.max(0, Number.parseInt(String(saved.currentIndex ?? 0), 10) || 0),
    );
    state.lastRaidResult =
      typeof saved.lastRaidResult === "string" && saved.lastRaidResult
        ? saved.lastRaidResult
        : "Gespeicherte GunGame Route geladen.";

    if (elements.stageCountInput) {
      elements.stageCountInput.value = String(route.length);
    }
    if (elements.upgradeChanceInput) {
      const chance = Number.parseInt(String(saved.upgradeChance ?? "25"), 10);
      elements.upgradeChanceInput.value = String(
        Number.isFinite(chance) ? Math.max(0, Math.min(100, chance)) : 25,
      );
    }

    return true;
  } catch (_) {
    return false;
  }
}

function saveProgress() {
  try {
    if (state.route.length === 0) {
      localStorage.removeItem(GUNGAME_PROGRESS_STORAGE_KEY);
      return;
    }

    localStorage.setItem(
      GUNGAME_PROGRESS_STORAGE_KEY,
      JSON.stringify({
        route: state.route,
        currentIndex: state.currentIndex,
        lastRaidResult: state.lastRaidResult,
        upgradeChance: elements.upgradeChanceInput?.value ?? "25",
        savedAt: Date.now(),
      }),
    );
  } catch (_) {}
}

function isValidRouteEntry(entry) {
  return (
    entry &&
    typeof entry === "object" &&
    Number.isFinite(Number(entry.step)) &&
    typeof entry.name === "string" &&
    typeof entry.category === "string" &&
    Number.isFinite(Number(entry.value))
  );
}
