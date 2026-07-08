import { escapeHtml } from "../utils.js";
import { initVolumeControl } from "../volume-control.js";
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
  isHeroSongPlaying,
  playCrateRevealSound,
  playHeroSong,
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
  publishSelectedCategories,
  publishWheelConfig,
  publishWheelSpin,
  publishResult,
  publishSpinning,
  publishZeroToHero,
} from "./squad.js?v=20260708-1";
import { createSquadUI } from "./squad-ui.js";

const CACHE_HOTFIX_VERSION = "20260708-1";
const SW_SCRIPT_URL = "./sw.js?v=20260708-1";
const SQUAD_ZTH_TEAM_BANNER_CHANCE = 0.2;
const COMPACT_MODE_STORAGE_KEY = "compactModeEnabled";
const CRATE_REVEAL_DISPLAY_MS = 3800;
const MYSTERY_WEAPON_CHANCE_PERCENT = 6;

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
  zeroToHeroPending: false,
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
let squadState;
let isSquadReady;
let showSquadError;
let renderSquadMembers;
let buildMembersSignature;

const CATEGORY_CONFIG = [
  { key: "map", stateKey: "activeMaps", stripId: "strip-map", hasZth: false },
  {
    key: "helmet",
    stateKey: "activeHelmets",
    stripId: "strip-helmet",
    hasZth: true,
  },
  {
    key: "armor",
    stateKey: "activeArmors",
    stripId: "strip-armor",
    hasZth: true,
  },
  {
    key: "weapon",
    stateKey: "activeWeapons",
    stripId: "strip-weapon",
    hasZth: true,
  },
  {
    key: "chestRig",
    stateKey: "activeChestRigs",
    stripId: "strip-chest-rig",
    hasZth: true,
  },
  {
    key: "armoredChestRig",
    stateKey: "activeArmoredChestRigs",
    stripId: "strip-armored-chest-rig",
    hasZth: true,
  },
  {
    key: "headset",
    stateKey: "activeHeadsets",
    stripId: "strip-headset",
    hasZth: true,
  },
  {
    key: "secondary",
    stateKey: "activeSecondaries",
    stripId: "strip-secondary",
    hasZth: true,
  },
  {
    key: "backpack",
    stateKey: "activeBackpacks",
    stripId: "strip-backpack",
    hasZth: true,
  },
];

const MYSTERY_WEAPON_CARD = {
  name: "?",
  type: "t6",
  value: 6,
};
const MYSTERY_CRATE_STATIC_REWARDS = [
  {
    title: "?-Kisten Bonus",
    subtitle: "Freie Auswahl erhalten",
    highlight: "Waffe nach Wahl",
    resultKey: "?-Kiste",
    resultValue: "Waffe nach Wahl",
  },
  {
    title: "?-Kisten Bonus",
    subtitle: "Team-Bonus erhalten",
    highlight: "Waffe für 1 Squad Member aussuchen",
    resultKey: "?-Kiste",
    resultValue: "Waffe für 1 Squad Member aussuchen",
  },
  {
    title: "?-Kisten Bonus",
    subtitle: "Map-Bonus erhalten",
    highlight: "Map aussuchen",
    resultKey: "?-Kiste",
    resultValue: "Map aussuchen",
  },
  {
    title: "?-Kisten Bonus",
    subtitle: "Kommunikations-Bonus erhalten",
    highlight: "Shot Caller 1 Runde",
    resultKey: "?-Kiste",
    resultValue: "Shot Caller 1 Runde",
  },
  {
    title: "?-Kisten Bonus",
    subtitle: "Start-Bonus erhalten",
    highlight: "1. Red für Dich",
    resultKey: "?-Kiste",
    resultValue: "1. Red für Dich",
  },
];

function canEditCategoryFilters() {
  return !squadState?.active || squadState?.isLeader;
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
  initVolumeControl();
  initDebugMode();
  syncPaylinePosition();
  elements.spinButton.addEventListener("click", spinAll);
  elements.diedButton?.addEventListener("click", handleDiedReroll);
  elements.survivedButton?.addEventListener("click", handleSurvivedReroll);
  elements.clearAllCategoriesButton?.addEventListener("click", () => {
    toggleAllCategoriesSelection();
  });
  elements.reloadMapButton?.addEventListener("click", reloadMapOnly);
  window.addEventListener("resize", () => syncPaylinePosition());
  initServiceWorkerUpdateFlow();

  const squadUI = createSquadUI({
    storageKey: SQUAD_STORAGE_KEY,
    memberHintText:
      "Du bist Squad Member. Kategorien und manuelle Wheel-Liste steuert der Leader.",
    getSelectedCategories: () => state.selectedCategories,
    onSessionStart: (sq, { isLeader }) => {
      wheelController.setSquadContext({ active: true, isLeader });
      renderFilters();
    },
    onSessionReset: () => {
      wheelController?.setSquadContext({ active: false, isLeader: false });
      renderFilters();
    },
    onSquadDataUpdate: (data, sq, previousIsLeader) => {
      const me = (data.players ?? {})[sq.playerId];
      if (me) {
        state.lastResult =
          me.result && typeof me.result === "object" ? me.result : {};
      }
      const zth = data.zeroToHero;
      if (!sq.hasProcessedInitialUpdate) {
        sq.lastZeroToHero = zth?.triggeredAt ?? null;
        sq.hasProcessedInitialUpdate = true;
      } else if (zth?.triggeredAt && zth.triggeredAt !== sq.lastZeroToHero) {
        sq.lastZeroToHero = zth.triggeredAt;
        const appliesToTeam = Boolean(zth.appliesToTeam);
        const triggeredByMe = zth.triggeredBy === sq.playerId;
        if (appliesToTeam || triggeredByMe) {
          playHeroSong();
          setTimeout(() => enableAlarmMode(elements), 500);
          showSquadZeroToHeroOverlay(
            zth.triggeredByName ?? "Jemand",
            appliesToTeam,
          );
        }
      }
      const remoteCategories = data.filters?.selectedCategories;
      let shouldRenderFilters = previousIsLeader !== sq.isLeader;
      if (Array.isArray(remoteCategories)) {
        const sanitized = remoteCategories.filter((c) =>
          allCategoryKeys.includes(c),
        );
        if (!arraysEqual(sanitized, state.selectedCategories)) {
          state.selectedCategories = sanitized;
          saveSelectedCategories(state.selectedCategories);
          syncVisibleCategories(elements, state.selectedCategories);
          createInitialStrips();
          shouldRenderFilters = true;
        }
      }
      if (shouldRenderFilters) renderFilters();
      const autoValues = buildSquadWheelValues(data.players ?? {});
      const autoValuesSignature = autoValues.join("\u0001");
      if (autoValuesSignature !== sq.lastAutoValuesSignature) {
        sq.lastAutoValuesSignature = autoValuesSignature;
        wheelController.setAutoValues(autoValues);
      }
      const wheelConfig = data.filters?.wheel ?? {};
      const wheelConfigSignature = `${wheelConfig.enabled === true ? 1 : 0}|${wheelConfig.manualMode === true ? 1 : 0}|${wheelConfig.manualValuesText ?? ""}`;
      if (wheelConfigSignature !== sq.lastWheelConfigSignature) {
        sq.lastWheelConfigSignature = wheelConfigSignature;
        wheelController.applySquadConfig(wheelConfig);
      }
      const remoteSpinId = data.wheelSpin?.spinId ?? null;
      if (remoteSpinId && remoteSpinId !== sq.lastRemoteSpinId) {
        sq.lastRemoteSpinId = remoteSpinId;
        wheelController.applyRemoteSpin(data.wheelSpin);
      }
    },
  });
  squadState = squadUI.squadState;
  isSquadReady = squadUI.isSquadReady;
  showSquadError = squadUI.showSquadError;
  renderSquadMembers = squadUI.renderSquadMembers;
  buildMembersSignature = squadUI.buildMembersSignature;

  squadUI.initSquad();
  squadUI.tryAutoRejoinSquad();
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
      setDebugStatus("Bitte eine Debug-Aktion auswählen.", true);
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
      setDebugStatus("Debug: erzwungener ?-Kisten-Spin gestartet.");
      spinAll({ forceZeroToHero: false, forceMysteryWeapon: true });
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
      const testReward = pickMysteryCrateReward(state.activeWeapons);
      if (!testReward) {
        setDebugStatus("Debug: Kein Kisten-Reward verfügbar.", true);
        return;
      }
      setDebugStatus("Debug: Elite-Kisten Overlay angezeigt.");
      await showEliteCrateReveal(testReward);
      return;
    }
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
    showSquadError("Nur der Squad Leader kann Kategorien ändern.");
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

  if (isSquadReady() && squadState.isLeader) {
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

  if (isSquadReady()) {
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

    if (isSquadReady()) {
      publishResult(
        squadState.code,
        squadState.playerId,
        state.lastResult,
        squadState.playerName,
      );
    }

    isMapReloading = false;
  }, spinDurationMs);
}

function handleDiedReroll() {
  state.zeroToHeroPending = false;
  spinAll();
}

async function handleSurvivedReroll() {
  if (!isCategorySelected("map") || state.activeMaps.length === 0) {
    return;
  }

  if (state.zeroToHeroPending && state.lastResult?.Waffe === "ZERO TO HERO") {
    const keepGear = await requestZeroToHeroSurvivalOutcome();
    if (!keepGear) {
      state.zeroToHeroPending = true;
    } else {
      state.zeroToHeroPending = false;
    }
  }

  reloadMapOnly();
}
function requestZeroToHeroSurvivalOutcome() {
  return new Promise((resolve) => {
    const existingOverlay = document.getElementById("survivedZthOverlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const keepGear = Math.random() < 0.5;
    const title = "Zero to Hero überlebt";
    const message = keepGear
      ? "Das Skript hat entschieden: Du darfst das Gear behalten."
      : "Das Skript hat entschieden: Du darfst das Gear noch nicht behalten. Zero to Hero bleibt bestehen.";

    const overlay = document.createElement("div");
    overlay.id = "survivedZthOverlay";
    overlay.className = "event-overlay";
    overlay.innerHTML = `
      <div class="event-modal">
        <p class="event-modal-title">${title}</p>
        <p class="event-modal-text">${message}</p>
        <div class="event-modal-actions">
          <button type="button" class="event-action-btn event-action-btn--confirm">OK</button>
        </div>
      </div>
    `;

    const confirmBtn = overlay.querySelector(".event-action-btn--confirm");
    const cleanup = () => {
      overlay.remove();
      resolve(keepGear);
    };

    confirmBtn?.addEventListener("click", cleanup, { once: true });
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
      }
    });

    document.body.appendChild(overlay);
    confirmBtn?.focus();
  });
}

function toggleCategory(category) {
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
  for (const { key, stateKey, stripId, hasZth } of CATEGORY_CONFIG) {
    if (isCategorySelected(key)) {
      createStripContent(stripId, state[stateKey], hasZth);
    }
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

  for (const { key, stateKey } of CATEGORY_CONFIG) {
    if (isCategorySelected(key) && state[stateKey].length === 0) {
      return;
    }
  }

  setSpinButtonState(elements, true);
  resetHeader(elements);
  createInitialStrips();

  const chancePercent = normalizeChanceValue(elements.chanceInput.value);
  const isZeroToHero =
    typeof options.forceZeroToHero === "boolean"
      ? options.forceZeroToHero
      : Math.random() < chancePercent / 100;
  state.zeroToHeroPending = isZeroToHero;
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
  const mysteryWeaponTriggered =
    !isZeroToHero &&
    isCategorySelected("weapon") &&
    (options.forceMysteryWeapon === true ||
      Math.random() < MYSTERY_WEAPON_CHANCE_PERCENT / 100);
  const rolledWeaponWinner = isCategorySelected("weapon")
    ? mysteryWeaponTriggered
      ? MYSTERY_WEAPON_CARD
      : pickWeaponWinner(state.activeWeapons, state.weaponHistory)
    : null;
  const mysteryCrateReward =
    mysteryWeaponTriggered && isCategorySelected("weapon")
      ? pickMysteryCrateReward(state.activeWeapons)
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

  if (rolledWeaponWinner && rolledWeaponWinner.name !== "?") {
    state.weaponHistory = updateWeaponHistory(
      state.weaponHistory,
      rolledWeaponWinner.name,
    );
    saveWeaponHistory(state.weaponHistory);
  }

  const spinQueue = [];

  const winnersByKey = {
    map: mapWinner,
    helmet: helmetWinner,
    armor: armorWinner,
    weapon: rolledWeaponWinner,
    chestRig: chestRigWinner,
    armoredChestRig: armoredChestRigWinner,
    headset: headsetWinner,
    secondary: secondaryWinner,
    backpack: backpackWinner,
  };

  for (const { key, stateKey, stripId } of CATEGORY_CONFIG) {
    if (isCategorySelected(key)) {
      spinQueue.push({
        stripId,
        dataset: state[stateKey],
        winner: winnersByKey[key],
        forceZth: key !== "map" && isZeroToHero,
      });
    }
  }

  if (isZeroToHero) {
    playHeroSong();
    setTimeout(() => enableAlarmMode(elements), 500);
  } else {
    stopHeroSong();
  }

  const spinDurationMs = getSpinDuration(spinQueue.length);
  if (!isZeroToHero && !isHeroSongPlaying()) {
    playSpinSound(spinDurationMs);
  }

  if (isSquadReady()) {
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
      weapon: isZeroToHero ? { name: "ZERO TO HERO" } : rolledWeaponWinner,
      secondary: secondaryWinner,
    };

    state.lastResult = buildResult(winners);

    if (mysteryWeaponTriggered && mysteryCrateReward) {
      await showEliteCrateReveal(mysteryCrateReward);
    }

    if (mysteryCrateReward) {
      state.lastResult[mysteryCrateReward.resultKey] =
        mysteryCrateReward.resultValue;
    }

    if (mysteryCrateReward?.weaponName) {
      state.lastResult["Waffe"] = mysteryCrateReward.weaponName;
      state.lastResult["Vollmodded"] = mysteryCrateReward.weaponName;
      state.weaponHistory = updateWeaponHistory(
        state.weaponHistory,
        mysteryCrateReward.weaponName,
      );
      saveWeaponHistory(state.weaponHistory);
    }

    if (isSquadReady()) {
      publishResult(
        squadState.code,
        squadState.playerId,
        state.lastResult,
        squadState.playerName,
      );
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
}

function pickMysteryCrateReward(activeWeapons) {
  const rewards = [...MYSTERY_CRATE_STATIC_REWARDS];
  const eliteWeapon = pickEliteWeaponWinner(activeWeapons);
  if (eliteWeapon) {
    rewards.push({
      title: "?-Kiste geöffnet",
      subtitle: "Vollmodded Waffe gezogen",
      highlight: eliteWeapon.name,
      resultKey: "Vollmodded",
      resultValue: eliteWeapon.name,
      weaponName: eliteWeapon.name,
    });
  }

  if (rewards.length === 0) {
    return null;
  }

  return rewards[Math.floor(Math.random() * rewards.length)];
}

function showEliteCrateReveal(reward) {
  return new Promise((resolve) => {
    const existing = document.getElementById("eventOverlay");
    if (existing) {
      existing.remove();
    }

    const overlay = document.createElement("div");
    overlay.id = "eventOverlay";
    overlay.className = "event-overlay";
    overlay.innerHTML = `
      <div class="event-modal crate-modal">
        <p class="event-modal-title">${escapeHtml(reward.title)}</p>
        <p class="event-subtitle">${escapeHtml(reward.subtitle)}</p>
        <p class="event-highlight">${escapeHtml(reward.highlight ?? "")}</p>
      </div>
    `;

    const cleanup = () => {
      overlay.remove();
      resolve();
    };

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        cleanup();
      }
    });

    document.body.appendChild(overlay);
    setTimeout(() => {
      cleanup();
    }, CRATE_REVEAL_DISPLAY_MS);
  });
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
  if (isSquadReady() && squadState.isLeader) {
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
  if (!isSquadReady()) {
    return;
  }

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

  return playerList.map((player) => player.result.Map);
}

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
      <div class="squad-zth-sub">${escapeHtml(triggerName)} hat 0 to Hero bekommen!</div>
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
