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
  loadSelectedCategories,
  loadWeaponHistory,
  saveExcludedArmorTiers,
  saveExcludedHelmetTiers,
  saveExcludedMaps,
  saveSelectedCategories,
  saveWeaponHistory,
} from "./storage.js";
import { playSpinSound, stopSpinSound } from "./sound.js";
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

const defaultSelectedCategories = categoryOptions.map(
  (category) => category.key,
);

const state = {
  selectedCategories: [...defaultSelectedCategories],
  excludedArmorTiers: [],
  excludedHelmetTiers: [],
  excludedMaps: [],
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

function initialize() {
  state.weaponHistory = loadWeaponHistory();
  state.excludedArmorTiers = loadExcludedArmorTiers();
  state.excludedHelmetTiers = loadExcludedHelmetTiers();
  state.excludedMaps = loadExcludedMaps();
  state.selectedCategories = loadSelectedCategories(
    defaultSelectedCategories,
  ).filter((category) => defaultSelectedCategories.includes(category));

  if (state.selectedCategories.length === 0) {
    state.selectedCategories = [...defaultSelectedCategories];
  }

  updateActiveFilters();

  renderFilterButtons(elements, state, {
    onCategoryToggle: toggleCategory,
    onArmorTierToggle: toggleArmorTier,
    onHelmetTierToggle: toggleHelmetTier,
    onMapToggle: toggleMap,
  });

  setupFilterToggle(elements);
  syncVisibleCategories(elements, state.selectedCategories);
  createInitialStrips();
  syncPaylinePosition(elements);
  elements.spinButton.addEventListener("click", spinAll);
  window.addEventListener("resize", () => syncPaylinePosition(elements));
}

function toggleCategory(category) {
  const isSelected = state.selectedCategories.includes(category);

  if (isSelected && state.selectedCategories.length === 1) {
    return;
  }

  state.selectedCategories = toggleValue(state.selectedCategories, category);
  saveSelectedCategories(state.selectedCategories);
  syncVisibleCategories(elements, state.selectedCategories);
  renderFilterButtons(elements, state, {
    onCategoryToggle: toggleCategory,
    onArmorTierToggle: toggleArmorTier,
    onHelmetTierToggle: toggleHelmetTier,
    onMapToggle: toggleMap,
  });
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

function toggleValue(list, value) {
  return list.includes(value)
    ? list.filter((entry) => entry !== value)
    : [...list, value];
}

function updateFilters() {
  updateActiveFilters();

  renderFilterButtons(elements, state, {
    onCategoryToggle: toggleCategory,
    onArmorTierToggle: toggleArmorTier,
    onHelmetTierToggle: toggleHelmetTier,
    onMapToggle: toggleMap,
  });
}

function updateActiveFilters() {
  state.activeMaps = maps.filter(
    (map) => !state.excludedMaps.includes(map.name),
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

window.addEventListener("load", initialize);
