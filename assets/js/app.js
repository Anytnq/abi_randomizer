import {
  armoredChestRigs,
  armors,
  backpacks,
  categoryOptions,
  chestRigs,
  helmets,
  headsets,
  maps,
  secondaries,
  tierNumberByType,
  weapons,
} from "./data.js";
import {
  SPIN_ANIMATION_MS,
  SPIN_STAGGER_MS,
  SPIN_START_OFFSET_MS,
  getWeightedRandom,
  pickMapWinner,
  pickWeaponWinner,
  spinColumn,
  updateWeaponHistory,
} from "./game.js";
import {
  loadExcludedArmorTiers,
  loadExcludedHelmetTiers,
  loadExcludedMaps,
  loadExcludedWeaponCategories,
  loadExcludedWeapons,
  loadSelectedCategories,
  loadWeaponHistory,
  saveExcludedArmorTiers,
  saveExcludedHelmetTiers,
  saveExcludedMaps,
  saveExcludedWeapons,
  saveSelectedCategories,
  saveWeaponHistory,
} from "./storage.js";
import { playSpinSound, stopSpinSound } from "./sound.js";
import { initializeVagariMode } from "./vagari.js";
import { initializeWheelSpin } from "./wheel.js";
import {
  createStripContent,
  enableAlarmMode,
  getElements,
  renderFilterButtons,
  resetHeader,
  setSpinButtonState,
  setupFilterToggle,
  syncPaylinePosition,
  syncVisibleCategories,
} from "./ui.js";
import {
  createSession,
  joinSession,
  leaveSession,
  publishSelectedCategories,
  publishWheelConfig,
  publishWheelSpin,
  publishResult,
  publishSpinning,
  publishZeroToHero,
  rejoinSession,
} from "./squad.js";

const defaultSelectedCategories = categoryOptions.map(
  (category) => category.key,
);

const state = {
  selectedCategories: [...defaultSelectedCategories],
  excludedArmorTiers: [],
  excludedHelmetTiers: [],
  excludedMaps: [],
  excludedWeapons: [],
  activeMaps: [...maps],
  activeHelmets: [...helmets],
  activeArmors: [...armors],
  activeWeapons: [...weapons],
  activeChestRigs: [...chestRigs],
  activeArmoredChestRigs: [...armoredChestRigs],
  activeHeadsets: [...headsets],
  activeSecondaries: [...secondaries],
  activeBackpacks: [...backpacks],
  weaponHistory: [],
  lastMap: null,
};

const elements = getElements();
let wheelController;

function canEditCategoryFilters() {
  return !squadState.active || squadState.isLeader;
}

function renderFilters() {
  renderFilterButtons(
    elements,
    state,
    {
      onCategoryToggle: toggleCategory,
      onArmorTierToggle: toggleArmorTier,
      onHelmetTierToggle: toggleHelmetTier,
      onMapToggle: toggleMap,
      onWeaponToggle: toggleWeapon,
      onWeaponGroupToggle: toggleWeaponGroup,
    },
    {
      canEditCategories: canEditCategoryFilters(),
    },
  );
}

function initialize() {
  state.weaponHistory = loadWeaponHistory();
  state.excludedArmorTiers = loadExcludedArmorTiers();
  state.excludedHelmetTiers = loadExcludedHelmetTiers();
  state.excludedMaps = loadExcludedMaps();
  state.excludedWeapons = loadExcludedWeapons();
  if (state.excludedWeapons.length === 0) {
    const excludedWeaponCategories = loadExcludedWeaponCategories();
    state.excludedWeapons = weapons
      .filter((weapon) => excludedWeaponCategories.includes(weapon.category))
      .map((weapon) => weapon.name);
  }
  state.selectedCategories = loadSelectedCategories(
    defaultSelectedCategories,
  ).filter((category) => defaultSelectedCategories.includes(category));

  if (state.selectedCategories.length === 0) {
    state.selectedCategories = [...defaultSelectedCategories];
  }

  updateActiveFilters();
  renderFilters();

  setupFilterToggle(elements);
  initializeVagariMode();
  wheelController = initializeWheelSpin({
    onManualModeChange: handleWheelConfigChange,
    onManualValuesChange: handleWheelConfigChange,
    onSpinRequest: handleWheelSpinRequest,
  });
  syncVisibleCategories(elements, state.selectedCategories);
  createInitialStrips();
  syncPaylinePosition();
  elements.spinButton.addEventListener("click", spinAll);
  window.addEventListener("resize", () => syncPaylinePosition());
  initSquad();
  tryAutoRejoinSquad();
}

function toggleCategory(category) {
  if (!canEditCategoryFilters()) {
    showSquadError("Nur der Squad Leader kann Kategorien ändern.");
    return;
  }

  const isSelected = state.selectedCategories.includes(category);

  if (isSelected && state.selectedCategories.length === 1) {
    return;
  }

  state.selectedCategories = toggleValue(state.selectedCategories, category);
  saveSelectedCategories(state.selectedCategories);
  syncVisibleCategories(elements, state.selectedCategories);
  renderFilters();

  if (
    squadState.active &&
    squadState.code &&
    squadState.playerId &&
    squadState.isLeader
  ) {
    publishSelectedCategories(
      squadState.code,
      squadState.playerId,
      state.selectedCategories,
    );
  }
}

function toggleArmorTier(tier) {
  state.excludedArmorTiers = toggleValue(state.excludedArmorTiers, tier);
  saveExcludedArmorTiers(state.excludedArmorTiers);
  updateFilters();
}

function toggleHelmetTier(tier) {
  state.excludedHelmetTiers = toggleValue(state.excludedHelmetTiers, tier);
  saveExcludedHelmetTiers(state.excludedHelmetTiers);
  updateFilters();
}

function toggleMap(mapName) {
  state.excludedMaps = toggleValue(state.excludedMaps, mapName);
  saveExcludedMaps(state.excludedMaps);
  updateFilters();
}

function toggleWeapon(weaponName) {
  state.excludedWeapons = toggleValue(state.excludedWeapons, weaponName);
  saveExcludedWeapons(state.excludedWeapons);
  updateFilters();
}

function toggleWeaponGroup(weaponCategory) {
  const groupWeapons = weapons
    .filter((weapon) => weapon.category === weaponCategory)
    .map((weapon) => weapon.name);
  const allIncluded = groupWeapons.every(
    (weaponName) => !state.excludedWeapons.includes(weaponName),
  );

  if (allIncluded) {
    state.excludedWeapons = Array.from(
      new Set([...state.excludedWeapons, ...groupWeapons]),
    );
  } else {
    state.excludedWeapons = state.excludedWeapons.filter(
      (weaponName) => !groupWeapons.includes(weaponName),
    );
  }

  saveExcludedWeapons(state.excludedWeapons);
  updateFilters();
}

function toggleValue(list, value) {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

function updateFilters() {
  updateActiveFilters();
  renderFilters();
}

function updateActiveFilters() {
  state.activeMaps = maps.filter(
    (map) => !state.excludedMaps.includes(map.name),
  );
  state.activeWeapons = weapons.filter(
    (weapon) => !state.excludedWeapons.includes(weapon.name),
  );
  state.activeHelmets = helmets.filter(
    (helmet) =>
      !state.excludedHelmetTiers.includes(tierNumberByType[helmet.type]),
  );
  state.activeArmors = armors.filter(
    (armor) => !state.excludedArmorTiers.includes(tierNumberByType[armor.type]),
  );
  state.activeChestRigs = [...chestRigs];
  state.activeArmoredChestRigs = [...armoredChestRigs];
  state.activeHeadsets = [...headsets];
  state.activeSecondaries = [...secondaries];
  state.activeBackpacks = [...backpacks];
}

function createInitialStrips() {
  if (isCategorySelected("map")) {
    createStripContent("strip-map", state.activeMaps, false);
  }

  if (isCategorySelected("helmet")) {
    createStripContent("strip-helmet", state.activeHelmets, true);
  }

  if (isCategorySelected("armor")) {
    createStripContent("strip-armor", state.activeArmors, true);
  }

  if (isCategorySelected("weapon")) {
    createStripContent("strip-weapon", state.activeWeapons, true);
  }

  if (isCategorySelected("chestRig")) {
    createStripContent("strip-chest-rig", state.activeChestRigs, true);
  }

  if (isCategorySelected("armoredChestRig")) {
    createStripContent(
      "strip-armored-chest-rig",
      state.activeArmoredChestRigs,
      true,
    );
  }

  if (isCategorySelected("headset")) {
    createStripContent("strip-headset", state.activeHeadsets, true);
  }

  if (isCategorySelected("secondary")) {
    createStripContent("strip-secondary", state.activeSecondaries, true);
  }

  if (isCategorySelected("backpack")) {
    createStripContent("strip-backpack", state.activeBackpacks, true);
  }
}

function spinAll() {
  if (state.selectedCategories.length === 0) {
    return;
  }

  if (isCategorySelected("map") && state.activeMaps.length === 0) {
    return;
  }

  if (isCategorySelected("helmet") && state.activeHelmets.length === 0) {
    return;
  }

  if (isCategorySelected("armor") && state.activeArmors.length === 0) {
    return;
  }

  if (isCategorySelected("weapon") && state.activeWeapons.length === 0) {
    return;
  }

  if (isCategorySelected("chestRig") && state.activeChestRigs.length === 0) {
    return;
  }

  if (
    isCategorySelected("armoredChestRig") &&
    state.activeArmoredChestRigs.length === 0
  ) {
    return;
  }

  if (isCategorySelected("headset") && state.activeHeadsets.length === 0) {
    return;
  }

  if (isCategorySelected("secondary") && state.activeSecondaries.length === 0) {
    return;
  }

  if (isCategorySelected("backpack") && state.activeBackpacks.length === 0) {
    return;
  }

  setSpinButtonState(elements, true);
  resetHeader(elements);
  createInitialStrips();

  const chancePercent = normalizeChanceValue(elements.chanceInput.value);
  const isZeroToHero = Math.random() < chancePercent / 100;
  const mapWinner = isCategorySelected("map")
    ? pickMapWinner(state.activeMaps, state.lastMap)
    : null;
  const helmetWinner = isCategorySelected("helmet")
    ? getWeightedRandom(state.activeHelmets)
    : null;
  const armorWinner = isCategorySelected("armor")
    ? getWeightedRandom(state.activeArmors)
    : null;
  const weaponWinner = isCategorySelected("weapon")
    ? pickWeaponWinner(state.activeWeapons, state.weaponHistory)
    : null;
  const chestRigWinner = isCategorySelected("chestRig")
    ? getWeightedRandom(state.activeChestRigs)
    : null;
  const armoredChestRigWinner = isCategorySelected("armoredChestRig")
    ? getWeightedRandom(state.activeArmoredChestRigs)
    : null;
  const headsetWinner = isCategorySelected("headset")
    ? getWeightedRandom(state.activeHeadsets)
    : null;
  const secondaryWinner = isCategorySelected("secondary")
    ? getWeightedRandom(state.activeSecondaries)
    : null;
  const backpackWinner = isCategorySelected("backpack")
    ? getWeightedRandom(state.activeBackpacks)
    : null;

  if (mapWinner) {
    state.lastMap = mapWinner.name;
  }

  if (weaponWinner) {
    state.weaponHistory = updateWeaponHistory(
      state.weaponHistory,
      weaponWinner.name,
    );
    saveWeaponHistory(state.weaponHistory);
  }

  const spinQueue = [];

  if (isCategorySelected("map")) {
    spinQueue.push({
      stripId: "strip-map",
      dataset: state.activeMaps,
      winner: mapWinner,
      forceZth: false,
    });
  }

  if (isCategorySelected("helmet")) {
    spinQueue.push({
      stripId: "strip-helmet",
      dataset: state.activeHelmets,
      winner: helmetWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("armor")) {
    spinQueue.push({
      stripId: "strip-armor",
      dataset: state.activeArmors,
      winner: armorWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("weapon")) {
    spinQueue.push({
      stripId: "strip-weapon",
      dataset: state.activeWeapons,
      winner: weaponWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("chestRig")) {
    spinQueue.push({
      stripId: "strip-chest-rig",
      dataset: state.activeChestRigs,
      winner: chestRigWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("armoredChestRig")) {
    spinQueue.push({
      stripId: "strip-armored-chest-rig",
      dataset: state.activeArmoredChestRigs,
      winner: armoredChestRigWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("headset")) {
    spinQueue.push({
      stripId: "strip-headset",
      dataset: state.activeHeadsets,
      winner: headsetWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("secondary")) {
    spinQueue.push({
      stripId: "strip-secondary",
      dataset: state.activeSecondaries,
      winner: secondaryWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isCategorySelected("backpack")) {
    spinQueue.push({
      stripId: "strip-backpack",
      dataset: state.activeBackpacks,
      winner: backpackWinner,
      forceZth: isZeroToHero,
    });
  }

  if (isZeroToHero) {
    setTimeout(() => enableAlarmMode(elements), 500);
  }

  const spinDurationMs = getSpinDuration(spinQueue.length);
  playSpinSound(spinDurationMs);

  if (squadState.active && squadState.code && squadState.playerId) {
    publishSpinning(squadState.code, squadState.playerId, true);
  }

  spinQueue.forEach((entry, index) => {
    spinColumn(
      entry.stripId,
      entry.dataset,
      index * SPIN_STAGGER_MS,
      entry.forceZth ? null : entry.winner,
      entry.forceZth,
    );
  });

  setTimeout(() => {
    stopSpinSound();
    setSpinButtonState(elements, false);

    if (squadState.active && squadState.code && squadState.playerId) {
      const winners = {
        map: mapWinner,
        helmet: helmetWinner,
        headset: headsetWinner,
        armor: armorWinner,
        chestRig: chestRigWinner,
        armoredChestRig: armoredChestRigWinner,
        backpack: backpackWinner,
        weapon: isZeroToHero ? { name: "ZERO TO HERO" } : weaponWinner,
        secondary: secondaryWinner,
      };
      publishResult(squadState.code, squadState.playerId, buildResult(winners));
      if (isZeroToHero) {
        publishZeroToHero(
          squadState.code,
          squadState.playerId,
          squadState.playerName,
        );
      }
    }
  }, spinDurationMs);
}

function getSpinDuration(columnCount) {
  const lastColumnDelay = Math.max(0, columnCount - 1) * SPIN_STAGGER_MS;
  return SPIN_START_OFFSET_MS + SPIN_ANIMATION_MS + lastColumnDelay;
}

function isCategorySelected(category) {
  return state.selectedCategories.includes(category);
}

function normalizeChanceValue(rawValue) {
  const parsed = Number.parseFloat(rawValue);
  if (Number.isNaN(parsed)) {
    return 5;
  }

  return Math.min(100, Math.max(0, parsed));
}

function handleWheelConfigChange(config) {
  if (squadState.active && squadState.code && squadState.isLeader) {
    publishWheelConfig(squadState.code, {
      enabled: true,
      manualMode: config.manualMode,
      manualValuesText: config.manualValuesText,
    });
  }
}

function handleWheelSpinRequest(spinPayload) {
  if (!squadState.active || !squadState.code || !squadState.playerId) {
    return;
  }

  publishWheelSpin(squadState.code, squadState.playerId, spinPayload);
}

function buildSquadWheelValues(players) {
  const playerList = Object.values(players ?? {});

  if (playerList.length === 0) {
    return [];
  }

  const allMembersRolledMap = playerList.every(
    (player) =>
      typeof player?.result?.Map === "string" && player.result.Map.length > 0,
  );

  if (!allMembersRolledMap) {
    return [];
  }

  // Doppelte Maps bleiben erhalten und erhohen dadurch die Zieh-Chance im Wheel.
  return playerList.map((player) => player.result.Map);
}

// ── Squad Modus ────────────────────────────────────────────────────────────

const squadState = {
  code: null,
  playerId: null,
  active: false,
  isLeader: false,
  playerName: null,
  lastZeroToHero: null,

const SQUAD_STORAGE_KEY = "squadSession";

function saveSquadToStorage(code, playerId, playerName) {
  try {
    localStorage.setItem(
      SQUAD_STORAGE_KEY,
      JSON.stringify({ code, playerId, playerName }),
    );
  } catch (_) {}
}

function loadSquadFromStorage() {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearSquadFromStorage() {
  try {
    localStorage.removeItem(SQUAD_STORAGE_KEY);
  } catch (_) {}
}
};

function initSquad() {
  const toggleBtn = document.getElementById("squadToggle");
  const content = document.getElementById("squadContent");
  const chevron = document.getElementById("squadChevron");
  const createBtn = document.getElementById("squadCreateBtn");
  const joinBtn = document.getElementById("squadJoinBtn");
  const leaveBtn = document.getElementById("squadLeaveBtn");
  const copyBtn = document.getElementById("squadCopyBtn");

  toggleBtn.addEventListener("click", () => {
    const isOpen = content.classList.toggle("open");
    chevron.textContent = isOpen ? "▲" : "▼";
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
  });

  createBtn.addEventListener("click", () => {
    const name = getSquadName();
    if (!name) return;

    const { code, playerId } = createSession(
      name,
      state.selectedCategories,
      onSquadUpdate,
    );
    squadState.code = code;
    squadState.playerId = playerId;
    squadState.active = true;
    squadState.isLeader = true;
    squadState.playerName = name;
    wheelController.setSquadContext({ active: true, isLeader: true });
    showSquadSession(code);
      saveSquadToStorage(code, playerId, name);
    renderFilters();
  });

  joinBtn.addEventListener("click", () => {
    const name = getSquadName();
    if (!name) return;

    const code = document
      .getElementById("squadJoinCode")
      .value.trim()
      .toUpperCase();
    if (code.length < 2) {
      showSquadError("Bitte einen gültigen Code eingeben.");
      return;
    }

    const { playerId } = joinSession(code, name, onSquadUpdate, () => {
      showSquadError("Session nicht gefunden oder abgelaufen.");
    });
    squadState.code = code;
    squadState.playerId = playerId;
    squadState.active = true;
    squadState.isLeader = false;
    squadState.playerName = name;
    wheelController.setSquadContext({ active: true, isLeader: false });
      saveSquadToStorage(code, playerId, name);
    showSquadSession(code);
    renderFilters();
  });

  leaveBtn.addEventListener("click", () => {
    if (squadState.code && squadState.playerId) {
      leaveSession(squadState.code, squadState.playerId);
    }
    squadState.code = null;
    squadState.playerId = null;
    squadState.active = false;
      clearSquadFromStorage();
    squadState.isLeader = false;
    document.getElementById("squadSession").hidden = true;
    document.getElementById("squadSetup").hidden = false;
    document.getElementById("squadMembers").innerHTML = "";
    wheelController.setSquadContext({ active: false, isLeader: false });
    updateSquadRoleHint();
    hideSquadError();
    renderFilters();
  });

  copyBtn.addEventListener("click", () => {
    if (!squadState.code) return;
    navigator.clipboard
      .writeText(squadState.code)
      .then(() => {
        copyBtn.textContent = "✅";
        setTimeout(() => {
          copyBtn.textContent = "📋";
        }, 1500);
      })
      .catch(() => {});
  });
}

function getSquadName() {
  const input = document.getElementById("squadName");
  const name = input.value.trim();
  if (!name) {
    showSquadError("Bitte einen Namen eingeben.");
    input.focus();
    return null;
  }
  hideSquadError();
  return name;
}

function showSquadSession(code) {
  document.getElementById("squadSetup").hidden = true;
  document.getElementById("squadSession").hidden = false;
  document.getElementById("squadCodeDisplay").textContent = code;
  updateSquadRoleHint();
}

function updateSquadRoleHint() {
  const hintEl = document.getElementById("squadRoleHint");
  if (!hintEl) {
    return;
  }

  hintEl.classList.remove("leader", "member");

  if (!squadState.active) {
    hintEl.textContent = "";
    return;
  }

  if (squadState.isLeader) {
    hintEl.classList.add("leader");
    hintEl.textContent =
      "Du bist Squad Leader. Du entscheidest die Kategorien und die manuelle Wheel-Liste fur alle.";
    return;
  }

  hintEl.classList.add("member");
  hintEl.textContent =
    "Du bist Squad Member. Kategorien und manuelle Wheel-Liste steuert der Leader, spinnen durfen aber alle.";
}

function showSquadError(msg) {
  const el = document.getElementById("squadError");
  el.textContent = msg;
  el.hidden = false;
}

function hideSquadError() {
  document.getElementById("squadError").hidden = true;
}

function resetSquadUi() {
  squadState.code = null;
  squadState.playerId = null;
  squadState.active = false;
  squadState.isLeader = false;
  squadState.playerName = null;
  clearSquadFromStorage();
  document.getElementById("squadSession").hidden = true;
  document.getElementById("squadSetup").hidden = false;
  document.getElementById("squadMembers").innerHTML = "";
  wheelController?.setSquadContext({ active: false, isLeader: false });
  updateSquadRoleHint();
  renderFilters();
}

function tryAutoRejoinSquad() {
  const saved = loadSquadFromStorage();
  if (!saved?.code || !saved?.playerId || !saved?.playerName) return;

  rejoinSession(
    saved.code,
    saved.playerId,
    saved.playerName,
    onSquadUpdate,
    () => {
      // Session abgelaufen oder nicht mehr vorhanden
      clearSquadFromStorage();
    },
  );

  squadState.code = saved.code;
  squadState.playerId = saved.playerId;
  squadState.playerName = saved.playerName;
  squadState.active = true;
  // isLeader wird über onSquadUpdate gesetzt sobald die Daten ankommen
  wheelController.setSquadContext({ active: true, isLeader: false });
  showSquadSession(saved.code);
  renderFilters();
}

function onSquadUpdate(data) {
  if (!data) {
    resetSquadUi();
    return;
  }
  squadState.isLeader = data.leaderId === squadState.playerId;
  wheelController.setSquadContext({
    active: squadState.active,
    isLeader: squadState.isLeader,
  });
  updateSquadRoleHint();

  // Squad-weites 0TH Event erkennen
  const zth = data.zeroToHero;
  if (zth?.triggeredAt && zth.triggeredAt !== squadState.lastZeroToHero) {
    squadState.lastZeroToHero = zth.triggeredAt;
    showSquadZeroToHeroOverlay(zth.triggeredByName ?? "Jemand");
  }

  const remoteCategories = data.filters?.selectedCategories;
  if (Array.isArray(remoteCategories) && remoteCategories.length > 0) {
    const sanitizedCategories = remoteCategories.filter((category) =>
      defaultSelectedCategories.includes(category),
    );

    if (
      sanitizedCategories.length > 0 &&
      JSON.stringify(sanitizedCategories) !==
        JSON.stringify(state.selectedCategories)
    ) {
      state.selectedCategories = sanitizedCategories;
      saveSelectedCategories(state.selectedCategories);
      syncVisibleCategories(elements, state.selectedCategories);
      createInitialStrips();
    }
  }

  renderFilters();

  const membersEl = document.getElementById("squadMembers");
  const players = data.players ?? {};
  wheelController.setAutoValues(buildSquadWheelValues(players));
  wheelController.applySquadConfig(data.filters?.wheel ?? {});
  wheelController.applyRemoteSpin(data.wheelSpin);
  membersEl.innerHTML = "";

  Object.entries(players).forEach(([id, player]) => {
    const isMe = id === squadState.playerId;
    const card = document.createElement("div");
    card.className = "squad-member" + (isMe ? " squad-member--me" : "");

    const nameEl = document.createElement("div");
    nameEl.className = "squad-member-name";
    const isLeader = id === data.leaderId;
    nameEl.textContent =
      player.name + (isLeader ? " 👑" : "") + (isMe ? " (Du)" : "");

    const resultEl = document.createElement("div");
    resultEl.className = "squad-member-result";

    if (player.spinning) {
      resultEl.innerHTML = '<span class="squad-spinning">🎰 dreht...</span>';
    } else if (player.result) {
      const r = player.result;
      const entries = Object.entries(r)
        .map(
          ([key, val]) =>
            `<span class="squad-result-item"><b>${key}:</b> ${val}</span>`,
        )
        .join("");
      resultEl.innerHTML = entries;
    } else {
      resultEl.innerHTML =
        '<span class="squad-waiting">Noch nicht gedreht</span>';
    }

    card.appendChild(nameEl);
    card.appendChild(resultEl);
    membersEl.appendChild(card);
  });
}

function showSquadZeroToHeroOverlay(triggerName) {
  const existingOverlay = document.getElementById("squadZthOverlay");
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement("div");
  overlay.id = "squadZthOverlay";
  overlay.className = "squad-zth-overlay";

  overlay.innerHTML = `
    <div class="squad-zth-content">
      <div class="squad-zth-skull">💀</div>
      <div class="squad-zth-title">SQUAD 0TH</div>
      <div class="squad-zth-sub">${triggerName} hat 0TH bekommen!</div>
      <div class="squad-zth-msg">Ihr wart alle mit dabei – ihr bekommt alle 0TH!</div>
    </div>
  `;

  overlay.addEventListener("click", () => overlay.remove());
  document.body.appendChild(overlay);

  setTimeout(() => overlay?.remove(), 8000);
}

function buildResult(winners) {
  const result = {};
  if (winners.map) result["Map"] = winners.map.name;
  if (winners.helmet) result["Helm"] = winners.helmet.name;
  if (winners.headset) result["Headset"] = winners.headset.name;
  if (winners.armor) result["Rüstung"] = winners.armor.name;
  if (winners.chestRig) result["Chest Rig"] = winners.chestRig.name;
  if (winners.armoredChestRig)
    result["Armored Rig"] = winners.armoredChestRig.name;
  if (winners.backpack) result["Rucksack"] = winners.backpack.name;
  if (winners.weapon) result["Waffe"] = winners.weapon.name;
  if (winners.secondary) result["Zweitwaffe"] = winners.secondary.name;
  return result;
}

window.addEventListener("load", initialize);
