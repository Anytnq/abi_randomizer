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
  pickEliteWeaponWinner,
  pickMapWinner,
  pickWeaponWinner,
  spinColumn,
  updateWeaponHistory,
} from "./game.js";
import {
  loadExcludedArmorTiers,
  loadExcludedHelmetTiers,
  loadExcludedMaps,
  loadStreamerMode,
  loadExcludedWeaponCategories,
  loadExcludedWeapons,
  loadSelectedCategories,
  loadWeaponHistory,
  saveExcludedArmorTiers,
  saveExcludedHelmetTiers,
  saveExcludedMaps,
  saveExcludedWeapons,
  saveSelectedCategories,
  saveStreamerMode,
  saveWeaponHistory,
} from "./storage.js";
import {
  playCrateRevealSound,
  playHeroSong,
  playMusselDecisionSound,
  playSpinSound,
  stopHeroSong,
  stopSpinSound,
} from "./sound.js";
import { initializeWheelSpin } from "./wheel.js";
import { initializeResponsiveLayout } from "./responsive-layout.js";
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
  cleanupInactivePlayers,
  createSession,
  joinSession,
  kickPlayer,
  leaveSession,
  PRESENCE_HEARTBEAT_MS,
  publishPresence,
  publishSelectedCategories,
  publishWheelConfig,
  publishWheelSpin,
  publishResult,
  publishSpinning,
  publishZeroToHero,
  rejoinSession,
  subscribeToSession,
  transferLeader,
} from "./squad.js?v=20260507-4";
import {
  buildSquadStoragePayload,
  getRecentEvents,
  isSquadStoragePayloadValid,
} from "./squad-utils.js?v=20260507-4";

const CACHE_HOTFIX_VERSION = "20260507-4";
const SW_SCRIPT_URL = "./sw.js?v=20260507-4";
const SQUAD_ZTH_TEAM_BANNER_CHANCE = 0.2;
const COMPACT_MODE_STORAGE_KEY = "compactModeEnabled";
const MUSSEL_MODE_STORAGE_KEY = "musselModeEnabled";
const MUSSEL_ALLOW_CHANCE = 0.52;
const CRATE_REVEAL_DELAY_MS = 440;
const CRATE_REVEAL_DISPLAY_MS = 3800;

const debugState = {
  enabled: false,
  statusElement: null,
};

const allCategoryKeys = categoryOptions.map((category) => category.key);
const defaultSelectedCategories = ["map", "weapon", "secondary"];

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
  lastResult: {},
  musselModeEnabled: false,
  activeOverlayTimeoutId: null,
};

const elements = getElements();
const compactControlsHost = document.getElementById("compactSideControls");
const filterHeaderActions = document.querySelector(".filters-header-actions");
const filterHeader = document.querySelector(".filters-header");
const initialFilterHeaderActionsNextSibling =
  filterHeaderActions?.nextElementSibling ?? null;
let wheelController;
let isMapReloading = false;

function canEditCategoryFilters() {
  return !squadState.active || squadState.isLeader;
}

function renderFilters() {
  renderFilterButtons(
    elements,
    state,
    {
      onCategoryToggle: toggleCategory,
      onCategoryGroupToggle: toggleCategoryGroup,
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

async function applyCacheHotfixOnce() {
  if (!("serviceWorker" in navigator) || !("caches" in window)) {
    return false;
  }

  const markerKey = "cache-hotfix-version";
  if (localStorage.getItem(markerKey) === CACHE_HOTFIX_VERSION) {
    return false;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
    const cacheKeys = await caches.keys();
    await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    localStorage.setItem(markerKey, CACHE_HOTFIX_VERSION);
    location.reload();
    return true;
  } catch (_) {
    return false;
  }
}

async function initialize() {
  if (await applyCacheHotfixOnce()) {
    return;
  }

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
  ).filter((category) => allCategoryKeys.includes(category));

  updateActiveFilters();
  renderFilters();

  setupFilterToggle(elements);
  wheelController = initializeWheelSpin({
    onManualModeChange: handleWheelConfigChange,
    onManualValuesChange: handleWheelConfigChange,
    onSpinRequest: handleWheelSpinRequest,
  });
  syncVisibleCategories(elements, state.selectedCategories);
  createInitialStrips();
  initCompactMode();
  initStreamerMode();
  initMusselMode();
  initDebugMode();
  syncPaylinePosition();
  elements.spinButton.addEventListener("click", spinAll);
  elements.clearAllCategoriesButton?.addEventListener("click", () => {
    toggleAllCategoriesSelection();
  });
  elements.reloadMapButton?.addEventListener("click", reloadMapOnly);
  window.addEventListener("resize", () => syncPaylinePosition());
  initServiceWorkerUpdateFlow();
  initConnectionWatchers();
  initSquad();
  tryAutoRejoinSquad();
  initializeResponsiveLayout();
}

function initCompactMode() {
  const switchModeButton = elements.switchModeButton;
  if (!switchModeButton) {
    return;
  }

  const savedCompactMode = loadCompactModePreference();
  applyCompactMode(savedCompactMode);

  switchModeButton.addEventListener("click", () => {
    const compactModeEnabled =
      !elements.body.classList.contains("compact-mode");
    applyCompactMode(compactModeEnabled);
    saveCompactModePreference(compactModeEnabled);
  });
}

function applyCompactMode(enabled) {
  elements.body.classList.toggle("compact-mode", enabled);
  if (elements.switchModeButton) {
    elements.switchModeButton.setAttribute("aria-pressed", String(enabled));
  }

  relocateCompactSideControls(enabled);

  window.requestAnimationFrame(() => {
    syncPaylinePosition();
  });
}

function initStreamerMode() {
  const streamerModeButton = elements.streamerModeButton;
  if (!streamerModeButton) {
    return;
  }

  const savedMode = loadStreamerMode();
  applyStreamerMode(savedMode);

  streamerModeButton.addEventListener("click", () => {
    const currentMode = streamerModeButton.dataset.mode || "off";
    const nextMode = getNextStreamerMode(currentMode);
    applyStreamerMode(nextMode);
    saveStreamerMode(nextMode);
  });
}

function initMusselMode() {
  const musselModeButton = elements.musselModeButton;
  if (!musselModeButton) {
    return;
  }

  state.musselModeEnabled = loadMusselModePreference();
  applyMusselModeButtonState();

  musselModeButton.addEventListener("click", () => {
    state.musselModeEnabled = !state.musselModeEnabled;
    applyMusselModeButtonState();
    saveMusselModePreference(state.musselModeEnabled);
  });
}

function applyMusselModeButtonState() {
  if (!elements.musselModeButton) {
    return;
  }

  elements.musselModeButton.setAttribute(
    "aria-pressed",
    String(state.musselModeEnabled),
  );
  elements.musselModeButton.textContent = state.musselModeEnabled
    ? "Magische Miesmuschel: AN"
    : "Magische Miesmuschel: AUS";
}

function loadMusselModePreference() {
  try {
    return localStorage.getItem(MUSSEL_MODE_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function saveMusselModePreference(enabled) {
  try {
    localStorage.setItem(MUSSEL_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch (_) {}
}

function isLocalDebugContext() {
  return (
    location.protocol === "file:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.hostname === "[::1]"
  );
}

function initDebugMode() {
  if (!isLocalDebugContext()) {
    return;
  }

  const panel = document.getElementById("debugPanel");
  const select = document.getElementById("debugActionSelect");
  const runButton = document.getElementById("debugRunBtn");
  const status = document.getElementById("debugStatus");

  if (!panel || !select || !runButton || !status) {
    return;
  }

  debugState.enabled = true;
  debugState.statusElement = status;

  panel.hidden = false;
  elements.body.classList.add("debug-mode-enabled");

  setDebugStatus("Debug Modus aktiv (lokale Umgebung erkannt).");

  runButton.addEventListener("click", async () => {
    const action = select.value;
    if (!action) {
      setDebugStatus("Bitte eine Debug-Aktion auswaehlen.", true);
      return;
    }

    await runDebugAction(action);
  });
}

function setDebugStatus(message, isError = false) {
  if (!debugState.statusElement) {
    return;
  }

  debugState.statusElement.textContent = message;
  debugState.statusElement.classList.toggle("debug-status--error", isError);
}

function ensureMusselModeEnabledForDebug() {
  if (state.musselModeEnabled) {
    return;
  }

  state.musselModeEnabled = true;
  applyMusselModeButtonState();
  saveMusselModePreference(true);
}

async function runDebugAction(action) {
  if (!debugState.enabled) {
    return;
  }

  switch (action) {
    case "spin-default":
      setDebugStatus("Debug: normaler Spin gestartet.");
      spinAll();
      return;
    case "spin-zth":
      setDebugStatus("Debug: erzwungener 0-to-Hero Spin gestartet.");
      spinAll({ forceZeroToHero: true });
      return;
    case "spin-elite":
      setDebugStatus("Debug: erzwungener Elite-Kisten-Spin gestartet.");
      spinAll({ forceZeroToHero: false, forceEliteCrate: true });
      return;
    case "spin-mussel-allow":
      ensureMusselModeEnabledForDebug();
      setDebugStatus("Debug: Miesmuschel-Spin mit JA gestartet.");
      spinAll({
        forceZeroToHero: false,
        forceEliteCrate: true,
        forceMusselDecision: true,
      });
      return;
    case "spin-mussel-deny":
      ensureMusselModeEnabledForDebug();
      setDebugStatus("Debug: Miesmuschel-Spin mit NEIN gestartet.");
      spinAll({
        forceZeroToHero: false,
        forceEliteCrate: true,
        forceMusselDecision: false,
      });
      return;
    case "map-reload":
      setDebugStatus("Debug: Map-Reload gestartet.");
      reloadMapOnly();
      return;
    case "overlay-zth":
      setDebugStatus("Debug: Squad-0-to-Hero Overlay angezeigt.");
      showSquadZeroToHeroOverlay("Debug", false);
      return;
    case "overlay-crate": {
      const testWeapon =
        pickEliteWeaponWinner(state.activeWeapons) ?? state.activeWeapons[0];
      if (!testWeapon) {
        setDebugStatus("Debug: Keine Waffe verfuegbar.", true);
        return;
      }
      setDebugStatus("Debug: Elite-Kisten Overlay angezeigt.");
      await showEliteCrateReveal(testWeapon);
      return;
    }
    case "overlay-mussel-allow":
      setDebugStatus("Debug: Miesmuschel Overlay (JA) angezeigt.");
      await resolveMusselDecision(true);
      return;
    case "overlay-mussel-deny":
      setDebugStatus("Debug: Miesmuschel Overlay (NEIN) angezeigt.");
      await resolveMusselDecision(false);
      return;
    case "audio-hero-play":
      setDebugStatus("Debug: Hero-Song gestartet.");
      playHeroSong();
      return;
    case "audio-hero-stop":
      setDebugStatus("Debug: Hero-Song gestoppt.");
      stopHeroSong();
      return;
    case "alarm-on":
      setDebugStatus("Debug: Alarmmodus aktiv.");
      enableAlarmMode(elements);
      return;
    case "alarm-off":
      setDebugStatus("Debug: Alarmmodus deaktiviert.");
      resetHeader(elements);
      stopHeroSong();
      return;
    default:
      setDebugStatus("Debug: Unbekannte Aktion.", true);
  }
}

function getNextStreamerMode(currentMode) {
  switch (currentMode) {
    case "off":
      return "transparent";
    case "transparent":
      return "greenscreen";
    default:
      return "off";
  }
}

function applyStreamerMode(mode) {
  const normalizedMode =
    mode === "transparent" || mode === "greenscreen" ? mode : "off";

  elements.body.classList.toggle(
    "streamer-mode-transparent",
    normalizedMode === "transparent",
  );
  elements.body.classList.toggle(
    "streamer-mode-greenscreen",
    normalizedMode === "greenscreen",
  );

  if (!elements.streamerModeButton) {
    return;
  }

  const labelByMode = {
    off: "Streamer Modus: AUS",
    transparent: "Streamer Modus: Transparent",
    greenscreen: "Streamer Modus: Greenscreen",
  };

  elements.streamerModeButton.dataset.mode = normalizedMode;
  elements.streamerModeButton.textContent = labelByMode[normalizedMode];
  elements.streamerModeButton.setAttribute(
    "aria-pressed",
    String(normalizedMode !== "off"),
  );
}

function relocateCompactSideControls(compactModeEnabled) {
  if (!compactControlsHost || !filterHeaderActions || !filterHeader) {
    return;
  }

  if (compactModeEnabled) {
    compactControlsHost.hidden = false;
    if (filterHeaderActions.parentElement !== compactControlsHost) {
      compactControlsHost.appendChild(filterHeaderActions);
    }
    return;
  }

  compactControlsHost.hidden = true;
  if (filterHeaderActions.parentElement === filterHeader) {
    return;
  }

  if (
    initialFilterHeaderActionsNextSibling &&
    initialFilterHeaderActionsNextSibling.parentElement === filterHeader
  ) {
    filterHeader.insertBefore(
      filterHeaderActions,
      initialFilterHeaderActionsNextSibling,
    );
    return;
  }

  filterHeader.appendChild(filterHeaderActions);
}

function loadCompactModePreference() {
  try {
    return localStorage.getItem(COMPACT_MODE_STORAGE_KEY) === "1";
  } catch (_) {
    return false;
  }
}

function saveCompactModePreference(enabled) {
  try {
    localStorage.setItem(COMPACT_MODE_STORAGE_KEY, enabled ? "1" : "0");
  } catch (_) {}
}

function setSelectedCategories(nextSelection) {
  if (!canEditCategoryFilters()) {
    showSquadError("Nur der Squad Leader kann Kategorien aendern.");
    return;
  }

  state.selectedCategories = Array.from(
    new Set(
      nextSelection.filter((category) => allCategoryKeys.includes(category)),
    ),
  );

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
      squadState.playerName,
    );
  }
}

function toggleAllCategoriesSelection() {
  const areAllSelected = allCategoryKeys.every((category) =>
    state.selectedCategories.includes(category),
  );

  setSelectedCategories(areAllSelected ? [] : allCategoryKeys);
}

function toggleCategoryGroup(categoryKeys) {
  const uniqueKeys = Array.from(new Set(categoryKeys));
  const areAllSelected = uniqueKeys.every((category) =>
    state.selectedCategories.includes(category),
  );

  if (areAllSelected) {
    setSelectedCategories(
      state.selectedCategories.filter(
        (category) => !uniqueKeys.includes(category),
      ),
    );
    return;
  }

  setSelectedCategories([...state.selectedCategories, ...uniqueKeys]);
}

function reloadMapOnly() {
  if (elements.spinButton.disabled || isMapReloading) {
    return;
  }

  if (squadState.active && squadState.role === "readonly") {
    showSquadError("Du bist im Read-only Modus und kannst nicht drehen.");
    return;
  }

  if (!isCategorySelected("map") || state.activeMaps.length === 0) {
    return;
  }

  const mapWinner = pickMapWinner(state.activeMaps, state.lastMap);
  if (!mapWinner) {
    return;
  }

  state.lastMap = mapWinner.name;
  createStripContent("strip-map", state.activeMaps, false);

  const spinDurationMs = getSpinDuration(1);
  isMapReloading = true;
  playSpinSound(spinDurationMs);

  if (squadState.active && squadState.code && squadState.playerId) {
    publishSpinning(squadState.code, squadState.playerId, true);
  }

  spinColumn("strip-map", state.activeMaps, 0, mapWinner, false);

  setTimeout(() => {
    stopSpinSound();

    state.lastResult = {
      ...state.lastResult,
      Map: mapWinner.name,
    };

    if (
      squadState.active &&
      squadState.playerId &&
      squadState.lastPlayers?.[squadState.playerId]
    ) {
      const optimisticPlayers = {
        ...squadState.lastPlayers,
        [squadState.playerId]: {
          ...squadState.lastPlayers[squadState.playerId],
          spinning: false,
          lastSeenAt: Date.now(),
          result: state.lastResult,
        },
      };

      squadState.lastPlayers = optimisticPlayers;
      squadState.lastMembersSignature = buildMembersSignature(
        optimisticPlayers,
        squadState.lastLeaderId,
      );
      renderSquadMembers(optimisticPlayers, squadState.lastLeaderId);

      const optimisticAutoValues = buildSquadWheelValues(optimisticPlayers);
      const optimisticAutoValuesSignature = optimisticAutoValues.join("\u0001");
      if (
        optimisticAutoValuesSignature !== squadState.lastAutoValuesSignature
      ) {
        squadState.lastAutoValuesSignature = optimisticAutoValuesSignature;
        wheelController.setAutoValues(optimisticAutoValues);
      }
    }

    if (squadState.active && squadState.code && squadState.playerId) {
      publishResult(squadState.code, squadState.playerId, state.lastResult);
    }

    isMapReloading = false;
  }, spinDurationMs);
}

function toggleCategory(category) {
  if (!canEditCategoryFilters()) {
    showSquadError("Nur der Squad Leader kann Kategorien aendern.");
    return;
  }

  setSelectedCategories(toggleValue(state.selectedCategories, category));
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
  const excludedMapSet = new Set(state.excludedMaps);
  const excludedWeaponSet = new Set(state.excludedWeapons);
  const excludedHelmetTierSet = new Set(state.excludedHelmetTiers);
  const excludedArmorTierSet = new Set(state.excludedArmorTiers);

  state.activeMaps = maps.filter((map) => !excludedMapSet.has(map.name));
  state.activeWeapons = weapons.filter(
    (weapon) => !excludedWeaponSet.has(weapon.name),
  );
  state.activeHelmets = helmets.filter(
    (helmet) => !excludedHelmetTierSet.has(tierNumberByType[helmet.type]),
  );
  state.activeArmors = armors.filter(
    (armor) => !excludedArmorTierSet.has(tierNumberByType[armor.type]),
  );
  state.activeChestRigs = chestRigs;
  state.activeArmoredChestRigs = armoredChestRigs;
  state.activeHeadsets = headsets;
  state.activeSecondaries = secondaries;
  state.activeBackpacks = backpacks;
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

function spinAll(options = {}) {
  if (state.selectedCategories.length === 0) {
    return;
  }

  if (squadState.active && squadState.role === "readonly") {
    showSquadError("Du bist im Read-only Modus und kannst nicht drehen.");
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
  const isZeroToHero =
    typeof options.forceZeroToHero === "boolean"
      ? options.forceZeroToHero
      : Math.random() < chancePercent / 100;
  const isSquadWideZeroToHeroBanner =
    isZeroToHero && Math.random() < SQUAD_ZTH_TEAM_BANNER_CHANCE;
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
  const eliteWeaponWinner =
    !isZeroToHero && isCategorySelected("weapon")
      ? pickEliteWeaponWinner(state.activeWeapons)
      : null;
  const effectiveEliteWeaponWinner =
    !isZeroToHero && isCategorySelected("weapon")
      ? options.forceEliteCrate
        ? pickEliteWeaponWinner(state.activeWeapons)
        : eliteWeaponWinner
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
    playHeroSong();
    setTimeout(() => enableAlarmMode(elements), 500);
  } else {
    stopHeroSong();
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

  setTimeout(async () => {
    stopSpinSound();
    setSpinButtonState(elements, false);

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

    state.lastResult = buildResult(winners);

    let grantedByMussel = true;
    if (!isZeroToHero && effectiveEliteWeaponWinner) {
      await showEliteCrateReveal(effectiveEliteWeaponWinner);
    }

    if (
      state.musselModeEnabled &&
      !isZeroToHero &&
      Object.keys(state.lastResult).length > 0
    ) {
      grantedByMussel = await resolveMusselDecision(
        options.forceMusselDecision,
      );
    }

    if (effectiveEliteWeaponWinner) {
      state.lastResult["Vollmodded"] = effectiveEliteWeaponWinner.name;
    }

    if (state.musselModeEnabled && !isZeroToHero) {
      state.lastResult["Miesmuschel"] = grantedByMussel
        ? "Gear erlaubt"
        : "Gear verweigert";
      if (!grantedByMussel) {
        state.lastResult["Waffe"] = "Pistole Challenge";
      }
    }

    if (squadState.active && squadState.code && squadState.playerId) {
      publishResult(squadState.code, squadState.playerId, state.lastResult);
      if (isZeroToHero) {
        publishZeroToHero(
          squadState.code,
          squadState.playerId,
          squadState.playerName,
          {
            appliesToTeam: isSquadWideZeroToHeroBanner,
          },
        );
      }
    }
  }, spinDurationMs);
}

function getSpinDuration(columnCount) {
  const lastColumnDelay = Math.max(0, columnCount - 1) * SPIN_STAGGER_MS;
  return SPIN_START_OFFSET_MS + SPIN_ANIMATION_MS + lastColumnDelay;
}

function clearOverlay() {
  const overlay = document.getElementById("eventOverlay");
  if (overlay) {
    overlay.remove();
  }

  if (state.activeOverlayTimeoutId) {
    clearTimeout(state.activeOverlayTimeoutId);
    state.activeOverlayTimeoutId = null;
  }
}

function showEliteCrateReveal(weapon) {
  return new Promise((resolve) => {
    clearOverlay();

    const overlay = document.createElement("div");
    overlay.id = "eventOverlay";
    overlay.className = "event-overlay event-overlay--crate";
    overlay.innerHTML = `
      <div class="event-modal crate-modal">
        <div class="crate-box" aria-hidden="true">📦</div>
        <h2 class="event-title">Elite-Kiste geoffnet</h2>
        <p class="event-subtitle">Vollmodded Waffe gezogen</p>
        <p class="event-highlight">${escapeHtml(weapon.name)}</p>
      </div>
    `;

    overlay.addEventListener("click", () => {
      clearOverlay();
      resolve();
    });

    document.body.appendChild(overlay);
    playCrateRevealSound();

    state.activeOverlayTimeoutId = window.setTimeout(() => {
      clearOverlay();
      resolve();
    }, CRATE_REVEAL_DISPLAY_MS);
  });
}

function resolveMusselDecision(forcedDecision) {
  return new Promise((resolve) => {
    clearOverlay();

    const allowGear =
      typeof forcedDecision === "boolean"
        ? forcedDecision
        : Math.random() < MUSSEL_ALLOW_CHANCE;
    const overlay = document.createElement("div");
    overlay.id = "eventOverlay";
    overlay.className = "event-overlay event-overlay--mussel";

    const resultText = allowGear
      ? "Die Miesmuschel sagt: JA, du darfst das Gear nehmen."
      : "Die Miesmuschel sagt: NEIN, nur Pistole in dieser Runde.";

    overlay.innerHTML = `
      <div class="event-modal mussel-modal">
        <div class="mussel-icon" aria-hidden="true">🦪</div>
        <h2 class="event-title">Magische Miesmuschel</h2>
        <p class="event-subtitle">Entscheidung zum erlangten Gear</p>
        <p class="event-decision ${allowGear ? "allow" : "deny"}">${resultText}</p>
      </div>
    `;

    overlay.addEventListener("click", () => {
      clearOverlay();
      resolve(allowGear);
    });

    document.body.appendChild(overlay);
    playMusselDecisionSound(allowGear);

    state.activeOverlayTimeoutId = window.setTimeout(() => {
      clearOverlay();
      resolve(allowGear);
    }, 3200);
  });
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
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
    publishWheelConfig(
      squadState.code,
      {
        enabled: true,
        manualMode: config.manualMode,
        manualValuesText: config.manualValuesText,
      },
      squadState.playerId,
      squadState.playerName,
    );
  }
}

function handleWheelSpinRequest(spinPayload) {
  if (!squadState.active || !squadState.code || !squadState.playerId) {
    return;
  }

  // A new leader spin should override old manual entries across the squad.
  if (squadState.isLeader) {
    publishWheelConfig(
      squadState.code,
      {
        enabled: true,
        manualMode: false,
        manualValuesText: "",
      },
      squadState.playerId,
      squadState.playerName,
    );
  }

  publishWheelSpin(
    squadState.code,
    squadState.playerId,
    spinPayload,
    squadState.playerName,
  );
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

// -- Squad Modus -----------------------------------------------------------

const squadState = {
  code: null,
  playerId: null,
  active: false,
  isLeader: false,
  role: "member",
  playerName: null,
  lastZeroToHero: null,
  hasProcessedInitialUpdate: false,
  sessionUnsubscribe: null,
  rejoinPending: false,
  lastMembersSignature: "",
  lastEventsSignature: "",
  lastWheelConfigSignature: "",
  lastAutoValuesSignature: "",
  lastRemoteSpinId: null,
  lastPlayers: {},
  lastLeaderId: null,
  lastSeenUpdateAt: 0,
  heartbeatTimerId: null,
  cleanupTimerId: null,
};

const SQUAD_STORAGE_KEY = "squadSession";

function initServiceWorkerUpdateFlow() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  const isSupportedContext =
    location.protocol === "https:" ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  if (!isSupportedContext) {
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {});
    return;
  }

  navigator.serviceWorker
    .register(SW_SCRIPT_URL, { updateViaCache: "none" })
    .then((registration) => {
      registration.update().catch(() => {});

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (
            worker.state === "installed" &&
            navigator.serviceWorker.controller
          ) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      });
    })
    .catch(() => {});

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (sessionStorage.getItem("sw-reloaded") === "1") {
      return;
    }
    sessionStorage.setItem("sw-reloaded", "1");
    location.reload();
  });
}

function saveSquadToStorage(code, playerId, playerName) {
  try {
    localStorage.setItem(
      SQUAD_STORAGE_KEY,
      JSON.stringify(buildSquadStoragePayload(code, playerId, playerName)),
    );
  } catch (_) {}
}

function unsubscribeFromSession() {
  if (typeof squadState.sessionUnsubscribe === "function") {
    squadState.sessionUnsubscribe();
  }

  squadState.sessionUnsubscribe = null;
}

function ensureSessionSubscription() {
  if (!squadState.code) {
    return;
  }

  unsubscribeFromSession();
  squadState.sessionUnsubscribe = subscribeToSession(
    squadState.code,
    onSquadUpdate,
  );
}

function loadSquadFromStorage() {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const payload = JSON.parse(raw);
    return isSquadStoragePayloadValid(payload) ? payload : null;
  } catch (_) {
    return null;
  }
}

function clearSquadFromStorage() {
  try {
    localStorage.removeItem(SQUAD_STORAGE_KEY);
  } catch (_) {}
}

function showReconnectBanner(show, text) {
  const el = document.getElementById("squadConnectionBanner");
  if (!el) {
    return;
  }
  el.hidden = !show;
  if (show && text) {
    el.textContent = text;
  }
}

function initConnectionWatchers() {
  window.addEventListener("online", () => {
    if (squadState.active) {
      showReconnectBanner(false);
      publishPresence(squadState.code, squadState.playerId);
    }
  });

  window.addEventListener("offline", () => {
    if (squadState.active) {
      showReconnectBanner(true, "Offline: verbinde neu...");
    }
  });

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && squadState.active) {
      publishPresence(squadState.code, squadState.playerId);
    }
  });
}

function startHeartbeat() {
  stopHeartbeat();
  if (!squadState.active || !squadState.code || !squadState.playerId) {
    return;
  }

  publishPresence(squadState.code, squadState.playerId);
  squadState.heartbeatTimerId = window.setInterval(() => {
    publishPresence(squadState.code, squadState.playerId);
  }, PRESENCE_HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (squadState.heartbeatTimerId) {
    clearInterval(squadState.heartbeatTimerId);
    squadState.heartbeatTimerId = null;
  }
}

function startCleanupLoop() {
  stopCleanupLoop();
  if (!squadState.active || !squadState.isLeader) {
    return;
  }

  squadState.cleanupTimerId = window.setInterval(() => {
    cleanupInactivePlayers(squadState.code, squadState.playerId);
  }, PRESENCE_HEARTBEAT_MS * 2);
}

function stopCleanupLoop() {
  if (squadState.cleanupTimerId) {
    clearInterval(squadState.cleanupTimerId);
    squadState.cleanupTimerId = null;
  }
}

function formatActivityMessage(event, players) {
  const payload = event.payload ?? {};
  const actorName = resolveActivityActorName(payload, players);
  const targetName = resolveActivityTargetName(payload, players);

  switch (event.type) {
    case "session-created":
      return `${actorName} hat die Session erstellt.`;
    case "member-joined":
      return `${actorName} ist dem Squad beigetreten.`;
    case "member-rejoined":
      return `${actorName} ist wieder online.`;
    case "member-left":
      return `${actorName} hat den Squad verlassen.`;
    case "member-timeout":
      return `${targetName} wurde wegen Inaktivitat entfernt.`;
    case "leader-changed":
      return `${actorName} hat die Leitung an ${targetName} uebergeben.`;
    case "member-kicked":
      return `${actorName} hat ${targetName} aus dem Squad gekickt.`;
    case "role-changed":
      return `${actorName} hat ${targetName} auf ${payload.role === "readonly" ? "Read-only" : "Member"} gesetzt.`;
    case "filters-updated":
      return `${actorName} hat die Kategorien geaendert: ${formatSelectedCategoryNames(payload.selectedCategories)}.`;
    case "wheel-config-updated":
      return payload.manualMode
        ? `${actorName} hat den Wheel-Modus auf Manuell gesetzt.`
        : `${actorName} hat den Wheel-Modus auf Auto gesetzt.`;
    case "wheel-spun":
      return `${actorName} hat das Wheel gedreht.`;
    case "zero-to-hero":
      return payload.appliesToTeam
        ? `${actorName} hat 0 to Hero fuer das ganze Team ausgelost.`
        : `${actorName} hat 0 to Hero ausgelost.`;
    default:
      return "Squad-Event";
  }
}

function resolveActivityActorName(payload, players) {
  if (typeof payload.byName === "string" && payload.byName.trim()) {
    return payload.byName;
  }

  if (typeof payload.by === "string" && payload.by.trim()) {
    return players[payload.by]?.name || payload.by;
  }

  return "Jemand";
}

function resolveActivityTargetName(payload, players) {
  if (typeof payload.targetName === "string" && payload.targetName.trim()) {
    return payload.targetName;
  }

  if (typeof payload.playerName === "string" && payload.playerName.trim()) {
    return payload.playerName;
  }

  if (typeof payload.targetId === "string" && payload.targetId.trim()) {
    return players[payload.targetId]?.name || payload.targetId;
  }

  return "Jemand";
}

function formatSelectedCategoryNames(selectedCategories) {
  if (!Array.isArray(selectedCategories)) {
    return "keine";
  }

  const labels = selectedCategories
    .map(
      (key) =>
        categoryOptions.find((category) => category.key === key)?.label ?? key,
    )
    .filter((label) => typeof label === "string" && label.length > 0);

  return labels.length > 0 ? labels.join(", ") : "keine";
}

function renderActivityFeed(eventMap, players) {
  const list = document.getElementById("squadActivityFeed");
  if (!list) {
    return;
  }

  const events = getRecentEvents(eventMap, 10);
  if (events.length === 0) {
    list.innerHTML = '<li class="squad-feed-empty">Noch keine Aktivitat</li>';
    return;
  }

  list.innerHTML = "";
  events.forEach((event) => {
    const item = document.createElement("li");
    item.className = `squad-feed-item ${getActivityItemClass(event.type)}`;
    const time = new Date(event.createdAt).toLocaleTimeString("de-DE", {
      hour: "2-digit",
      minute: "2-digit",
    });
    item.innerHTML = `<span class="squad-feed-time">${time}</span><span class="squad-feed-text">${formatActivityMessage(event, players)}</span>`;
    list.appendChild(item);
  });
}

function getActivityItemClass(eventType) {
  switch (eventType) {
    case "session-created":
    case "member-joined":
    case "member-rejoined":
      return "squad-feed-item--join";
    case "member-left":
    case "member-timeout":
    case "member-kicked":
      return "squad-feed-item--leave";
    case "leader-changed":
      return "squad-feed-item--leader";
    case "wheel-spun":
      return "squad-feed-item--wheel";
    case "wheel-config-updated":
    case "filters-updated":
    case "role-changed":
      return "squad-feed-item--config";
    case "zero-to-hero":
      return "squad-feed-item--zth";
    default:
      return "squad-feed-item--default";
  }
}

function closeOpenSquadMemberMenus(exceptMenu = null) {
  document.querySelectorAll(".squad-member-menu").forEach((menu) => {
    if (menu === exceptMenu) {
      return;
    }

    menu.hidden = true;
    const triggerId = menu.getAttribute("data-trigger-id");
    if (!triggerId) {
      return;
    }

    const trigger = document.getElementById(triggerId);
    if (trigger) {
      trigger.setAttribute("aria-expanded", "false");
    }
  });
}

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

    const { code, playerId } = createSession(name, state.selectedCategories);

    squadState.code = code;
    squadState.playerId = playerId;
    squadState.active = true;
    squadState.isLeader = true;
    squadState.role = "leader";
    squadState.playerName = name;

    saveSquadToStorage(code, playerId, name);
    ensureSessionSubscription();
    wheelController.setSquadContext({ active: true, isLeader: true });
    showSquadSession(code);
    startHeartbeat();
    startCleanupLoop();
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
      showSquadError("Bitte einen gueltigen Code eingeben.");
      return;
    }

    const { playerId } = joinSession(code, name, () => {
      showSquadError("Session nicht gefunden oder abgelaufen.");
    });

    squadState.code = code;
    squadState.playerId = playerId;
    squadState.active = true;
    squadState.isLeader = false;
    squadState.role = "member";
    squadState.playerName = name;

    saveSquadToStorage(code, playerId, name);
    ensureSessionSubscription();
    wheelController.setSquadContext({ active: true, isLeader: false });
    showSquadSession(code);
    startHeartbeat();
    renderFilters();
  });

  leaveBtn.addEventListener("click", () => {
    if (squadState.code && squadState.playerId) {
      leaveSession(squadState.code, squadState.playerId);
    }
    resetSquadUi(true);
  });

  copyBtn.addEventListener("click", () => {
    if (!squadState.code) return;
    navigator.clipboard
      .writeText(squadState.code)
      .then(() => {
        copyBtn.textContent = "OK";
        setTimeout(() => {
          copyBtn.textContent = "📋";
        }, 1500);
      })
      .catch(() => {});
  });

  document.addEventListener("click", () => {
    closeOpenSquadMemberMenus();
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
  const connectionEl = document.getElementById("squadConnectionState");
  if (!hintEl || !connectionEl) {
    return;
  }

  hintEl.classList.remove("leader", "member", "readonly");

  if (!squadState.active) {
    hintEl.textContent = "";
    connectionEl.textContent = "Nicht verbunden";
    connectionEl.className = "squad-connection-state offline";
    return;
  }

  const stale =
    Date.now() - squadState.lastSeenUpdateAt > PRESENCE_HEARTBEAT_MS * 3;
  connectionEl.textContent =
    stale || !navigator.onLine ? "Verbindung instabil" : "Live verbunden";
  connectionEl.className =
    stale || !navigator.onLine
      ? "squad-connection-state unstable"
      : "squad-connection-state online";

  if (squadState.isLeader) {
    hintEl.classList.add("leader");
    hintEl.textContent = "Du bist Squad Leader.";
    return;
  }

  if (squadState.role === "readonly") {
    hintEl.classList.add("readonly");
    hintEl.textContent =
      "Du bist Read-only Member. Du siehst alles live, kannst aber nicht drehen.";
    return;
  }

  hintEl.classList.add("member");
  hintEl.textContent =
    "Du bist Squad Member. Kategorien und manuelle Wheel-Liste steuert der Leader.";
}

function showSquadError(msg) {
  const el = document.getElementById("squadError");
  el.textContent = msg;
  el.hidden = false;
}

function hideSquadError() {
  document.getElementById("squadError").hidden = true;
}

function resetSquadUi(clearStorage = true) {
  stopHeartbeat();
  stopCleanupLoop();
  unsubscribeFromSession();
  squadState.code = null;
  squadState.playerId = null;
  squadState.active = false;
  squadState.isLeader = false;
  squadState.role = "member";
  squadState.playerName = null;
  squadState.lastZeroToHero = null;
  squadState.hasProcessedInitialUpdate = false;
  squadState.rejoinPending = false;
  squadState.lastMembersSignature = "";
  squadState.lastEventsSignature = "";
  squadState.lastWheelConfigSignature = "";
  squadState.lastAutoValuesSignature = "";
  squadState.lastRemoteSpinId = null;
  squadState.lastPlayers = {};
  squadState.lastLeaderId = null;
  squadState.lastSeenUpdateAt = 0;
  if (clearStorage) {
    clearSquadFromStorage();
  }
  document.getElementById("squadSession").hidden = true;
  document.getElementById("squadSetup").hidden = false;
  document.getElementById("squadMembers").innerHTML = "";
  renderActivityFeed({}, {});
  showReconnectBanner(false);
  wheelController?.setSquadContext({ active: false, isLeader: false });
  updateSquadRoleHint();
  renderFilters();
}

function tryAutoRejoinSquad() {
  const saved = loadSquadFromStorage();
  if (!saved?.code || !saved?.playerId || !saved?.playerName) {
    clearSquadFromStorage();
    return;
  }

  rejoinSession(saved.code, saved.playerId, saved.playerName, () => {
    clearSquadFromStorage();
  });

  squadState.code = saved.code;
  squadState.playerId = saved.playerId;
  squadState.playerName = saved.playerName;
  squadState.active = true;
  ensureSessionSubscription();
  wheelController.setSquadContext({ active: true, isLeader: false });
  showSquadSession(saved.code);
  startHeartbeat();
  renderFilters();
}

function renderAdminActions(card, playerId, player, isMe) {
  return;
}

function onSquadUpdate(data) {
  if (!data) {
    resetSquadUi(true);
    return;
  }

  const previousIsLeader = squadState.isLeader;
  squadState.lastSeenUpdateAt = Date.now();
  showReconnectBanner(false);
  squadState.isLeader = data.leaderId === squadState.playerId;

  const players = data.players ?? {};
  squadState.lastPlayers = players;
  squadState.lastLeaderId = data.leaderId ?? null;
  const me = players[squadState.playerId];
  if (
    !me &&
    squadState.active &&
    squadState.code &&
    squadState.playerName &&
    !squadState.rejoinPending
  ) {
    squadState.rejoinPending = true;
    rejoinSession(
      squadState.code,
      squadState.playerId,
      squadState.playerName,
      () => resetSquadUi(true),
    );
    return;
  }

  if (me) {
    squadState.rejoinPending = false;
    state.lastResult =
      me.result && typeof me.result === "object" ? me.result : {};
  }

  squadState.role = me?.role || (squadState.isLeader ? "leader" : "member");
  wheelController.setSquadContext({
    active: squadState.active,
    isLeader: squadState.isLeader,
  });
  updateSquadRoleHint();
  startCleanupLoop();

  const zth = data.zeroToHero;
  if (!squadState.hasProcessedInitialUpdate) {
    squadState.lastZeroToHero = zth?.triggeredAt ?? null;
    squadState.hasProcessedInitialUpdate = true;
  } else if (
    zth?.triggeredAt &&
    zth.triggeredAt !== squadState.lastZeroToHero
  ) {
    squadState.lastZeroToHero = zth.triggeredAt;
    showSquadZeroToHeroOverlay(
      zth.triggeredByName ?? "Jemand",
      Boolean(zth.appliesToTeam),
    );
  }

  const remoteCategories = data.filters?.selectedCategories;
  let shouldRenderFilters = previousIsLeader !== squadState.isLeader;
  if (Array.isArray(remoteCategories)) {
    const sanitizedCategories = remoteCategories.filter((category) =>
      allCategoryKeys.includes(category),
    );

    if (!arraysEqual(sanitizedCategories, state.selectedCategories)) {
      state.selectedCategories = sanitizedCategories;
      saveSelectedCategories(state.selectedCategories);
      syncVisibleCategories(elements, state.selectedCategories);
      createInitialStrips();
      shouldRenderFilters = true;
    }
  }

  if (shouldRenderFilters) {
    renderFilters();
  }

  const autoValues = buildSquadWheelValues(players);
  const autoValuesSignature = autoValues.join("\u0001");
  if (autoValuesSignature !== squadState.lastAutoValuesSignature) {
    squadState.lastAutoValuesSignature = autoValuesSignature;
    wheelController.setAutoValues(autoValues);
  }

  const wheelConfig = data.filters?.wheel ?? {};
  const wheelConfigSignature = `${wheelConfig.enabled === true ? 1 : 0}|${wheelConfig.manualMode === true ? 1 : 0}|${wheelConfig.manualValuesText ?? ""}`;
  if (wheelConfigSignature !== squadState.lastWheelConfigSignature) {
    squadState.lastWheelConfigSignature = wheelConfigSignature;
    wheelController.applySquadConfig(wheelConfig);
  }

  const remoteSpinId = data.wheelSpin?.spinId ?? null;
  if (remoteSpinId && remoteSpinId !== squadState.lastRemoteSpinId) {
    squadState.lastRemoteSpinId = remoteSpinId;
    wheelController.applyRemoteSpin(data.wheelSpin);
  }

  const membersSignature = buildMembersSignature(players, data.leaderId);
  if (membersSignature !== squadState.lastMembersSignature) {
    squadState.lastMembersSignature = membersSignature;
    renderSquadMembers(players, data.leaderId);
  }

  const eventsSignature = buildEventsSignature(data.events ?? {});
  if (eventsSignature !== squadState.lastEventsSignature) {
    squadState.lastEventsSignature = eventsSignature;
    renderActivityFeed(data.events ?? {}, players);
  }
}

function renderSquadMembers(players, leaderId) {
  const membersEl = document.getElementById("squadMembers");
  membersEl.innerHTML = "";

  Object.entries(players).forEach(([id, player]) => {
    const isMe = id === squadState.playerId;
    const card = document.createElement("div");
    card.className = "squad-member" + (isMe ? " squad-member--me" : "");

    const nameEl = document.createElement("div");
    nameEl.className = "squad-member-name";
    const isLeader = id === leaderId;
    const roleTag = player.role === "readonly" ? " [RO]" : "";
    nameEl.textContent =
      player.name + roleTag + (isLeader ? " 👑" : "") + (isMe ? " (Du)" : "");

    const statusEl = document.createElement("div");
    statusEl.className = "squad-member-status";
    const stale =
      typeof player.lastSeenAt === "number"
        ? Date.now() - player.lastSeenAt > PRESENCE_HEARTBEAT_MS * 3
        : true;
    statusEl.textContent = stale ? "inaktiv" : "aktiv";
    statusEl.classList.toggle("offline", stale);

    const resultEl = document.createElement("div");
    resultEl.className = "squad-member-result";
    if (player.spinning) {
      resultEl.innerHTML = '<span class="squad-spinning">🎰 dreht...</span>';
    } else if (player.result) {
      const entries = Object.entries(player.result)
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
    card.appendChild(statusEl);
    card.appendChild(resultEl);
    renderAdminActions(card, id, player, isMe);
    membersEl.appendChild(card);
  });
}

function buildMembersSignature(players, leaderId) {
  const now = Date.now();

  return Object.entries(players)
    .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
    .map(([playerId, player]) => {
      const stale =
        typeof player?.lastSeenAt === "number"
          ? now - player.lastSeenAt > PRESENCE_HEARTBEAT_MS * 3
          : true;
      const resultEntries = player?.result
        ? Object.entries(player.result)
            .map(([key, value]) => `${key}:${value}`)
            .join(",")
        : "";

      return `${playerId}|${player?.name ?? ""}|${player?.role ?? ""}|${playerId === leaderId ? 1 : 0}|${player?.spinning ? 1 : 0}|${stale ? 1 : 0}|${resultEntries}`;
    })
    .join("||");
}

function buildEventsSignature(eventMap) {
  const events = getRecentEvents(eventMap, 10);
  return events.map((event) => `${event.id}:${event.createdAt}`).join("|");
}

function arraysEqual(left, right) {
  if (left === right) {
    return true;
  }

  if (!Array.isArray(left) || !Array.isArray(right)) {
    return false;
  }

  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }

  return true;
}

function showSquadZeroToHeroOverlay(triggerName, appliesToTeam) {
  const existingOverlay = document.getElementById("squadZthOverlay");
  if (existingOverlay) existingOverlay.remove();

  const overlay = document.createElement("div");
  overlay.id = "squadZthOverlay";
  overlay.className = "squad-zth-overlay";

  overlay.innerHTML = `
    <div class="squad-zth-content">
      <div class="squad-zth-skull">💀</div>
      <div class="squad-zth-title">SQUAD 0 TO HERO</div>
      <div class="squad-zth-sub">${triggerName} hat 0 to Hero bekommen!</div>
      <div class="squad-zth-msg">${
        appliesToTeam
          ? "Team-Banner aktiv: Ihr bekommt alle 0 to Hero!"
          : "Solo-Banner aktiv: Nur diese Person bekommt 0 to Hero."
      }</div>
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
  if (winners.armor) result["Ruestung"] = winners.armor.name;
  if (winners.chestRig) result["Chest Rig"] = winners.chestRig.name;
  if (winners.armoredChestRig)
    result["Armored Rig"] = winners.armoredChestRig.name;
  if (winners.backpack) result["Rucksack"] = winners.backpack.name;
  if (winners.weapon) result["Waffe"] = winners.weapon.name;
  if (winners.secondary) result["Zweitwaffe"] = winners.secondary.name;
  return result;
}

window.addEventListener("load", initialize);
