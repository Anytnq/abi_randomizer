import { gungameWeapons } from "./data.js";

const MIN_STAGES = 3;
const MAX_STAGES = 30;
const DEFAULT_STAGES = 12;

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
    "Schließe einen Raid ab, um auf der naechsten Stufe eine Upgrade-Chance zu erhalten.",
};

initialize();

function initialize() {
  elements.generateButton?.addEventListener("click", regenerateRoute);
  elements.raidDoneButton?.addEventListener("click", completeRaid);
  elements.previousButton?.addEventListener("click", moveToPreviousStage);
  elements.nextButton?.addEventListener("click", moveToNextStage);
  elements.resetButton?.addEventListener("click", resetProgress);

  regenerateRoute();
}

function regenerateRoute() {
  const stageCount = readStageCount();
  elements.stageCountInput.value = String(stageCount);

  state.route = buildRoute(stageCount);
  state.currentIndex = 0;
  state.lastRaidResult =
    "Neue Route generiert. Schließe einen Raid ab, um Upgrade-Chancen zu nutzen.";

  render();
}

function completeRaid() {
  if (state.route.length === 0) {
    return;
  }

  const currentEntry = state.route[state.currentIndex];
  if (!currentEntry) {
    return;
  }

  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.route.length) {
    state.lastRaidResult = `Finale geschafft mit ${currentEntry.name}. GunGame Route abgeschlossen.`;
    render();
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
      raidResultText += ` Upgrade aktiv: Stufe ${nextIndex + 1} wurde auf ${upgradedWeapon.name} (Wert ${state.route[nextIndex].value}) erhoeht.`;
    } else {
      raidResultText +=
        " Upgrade gewuerfelt, aber keine hoehere Waffe verfuegbar.";
    }
  } else {
    const percent = Math.round(upgradeChance * 100);
    raidResultText += ` Kein Upgrade dieses Mal (${percent}% Chance).`;
  }

  state.lastRaidResult = raidResultText;
  state.currentIndex = nextIndex;
  render();
}

function moveToPreviousStage() {
  if (state.route.length === 0) {
    return;
  }

  state.currentIndex = Math.max(0, state.currentIndex - 1);
  render();
}

function moveToNextStage() {
  if (state.route.length === 0) {
    return;
  }

  state.currentIndex = Math.min(state.route.length - 1, state.currentIndex + 1);
  render();
}

function resetProgress() {
  state.currentIndex = 0;
  state.lastRaidResult =
    "Progress zurueckgesetzt. Schließe einen Raid ab, um Upgrade-Chancen zu nutzen.";
  render();
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
    category: formatCategory(weapon.category),
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

function formatCategory(category) {
  if (!category) {
    return "Unknown";
  }

  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}
