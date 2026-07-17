/* Randomizer core engine (Planungs.md 7 + 14: real engine, no DOM).
   Reuses the battle-tested v1 selection logic and data pools instead of
   reinventing weighted-random/history rules (Planungs.md 3: "gewichtete
   Zufallsauswahl und History-Regeln aus randomizer/game.js" are portable
   as-is). This module never touches the DOM or knows about CSS classes. */

import {
  getWeightedRandom,
  getValueRarityLabel,
  pickMapWinner,
  pickWeaponWinner,
  updateWeaponHistory,
} from "../../../../assets/js/randomizer/game.js";
import {
  chestRigs,
  backpacks,
  secondaries,
  tierNumberByType,
} from "../../../../assets/js/randomizer/data.js";
import {
  getDefaultFilters,
  getAvailableMaps,
  getAvailableHelmets,
  getAvailableArmors,
  getAvailableWeapons,
} from "./filters.js";

export const TIER_COLOR = {
  1: "#8a97a6",
  2: "#6fcf7a",
  3: "#33d6ff",
  4: "#b06bff",
  5: "#ffb02e",
  6: "#ff3d5a",
};

/* chestRig/backpack/secondaryWeapon have no exclusion UI in v1 either -
   Filter Studio mirrors that surface, so these pools are never filtered. */
const UNFILTERED_POOLS = {
  chestRig: chestRigs,
  backpack: backpacks,
  secondaryWeapon: secondaries,
};

export function getRandomizerCandidates(key, filters = getDefaultFilters()) {
  switch (key) {
    case "map":
      return getAvailableMaps(filters);
    case "helmet":
      return getAvailableHelmets(filters);
    case "armor":
      return getAvailableArmors(filters);
    case "primaryWeapon":
      return getAvailableWeapons(filters);
    default:
      return UNFILTERED_POOLS[key] ?? [];
  }
}

export function getItemTier(item) {
  if (!item) return 1;
  if (typeof item.value === "number") return item.value;
  return tierNumberByType[item.type] ?? 1;
}

export function getItemRarityLabel(item) {
  return getValueRarityLabel(getItemTier(item));
}

export function createRandomizerEngine({ zeroToHeroChancePercent = 5 } = {}) {
  let weaponHistory = [];
  let lastMap = null;

  function rollLoadout(previous, lockedKeys, options = {}) {
    const filters = options.filters ?? getDefaultFilters();
    const selected = new Set(
      options.selectedCategories ?? filters.selectedCategories,
    );
    const next = { ...previous };
    const canRollPrimary =
      selected.has("primaryWeapon") && !lockedKeys.has("primaryWeapon");
    const isZeroToHero =
      canRollPrimary && Math.random() < zeroToHeroChancePercent / 100;

    if (selected.has("map") && !lockedKeys.has("map")) {
      const winner = pickMapWinner(getAvailableMaps(filters), lastMap);
      if (winner) lastMap = winner.name;
      next.map = winner;
    }

    if (canRollPrimary) {
      if (isZeroToHero) {
        next.primaryWeapon = { name: "ZERO TO HERO", type: "t6", value: 6 };
      } else {
        const winner = pickWeaponWinner(getAvailableWeapons(filters), weaponHistory);
        if (winner) {
          weaponHistory = updateWeaponHistory(weaponHistory, winner.name);
        }
        next.primaryWeapon = winner;
      }
    }

    if (selected.has("helmet") && !lockedKeys.has("helmet")) {
      next.helmet = getWeightedRandom(getAvailableHelmets(filters));
    }

    if (selected.has("armor") && !lockedKeys.has("armor")) {
      next.armor = getWeightedRandom(getAvailableArmors(filters));
    }

    for (const [key, pool] of Object.entries(UNFILTERED_POOLS)) {
      if (!selected.has(key) || lockedKeys.has(key)) continue;
      next[key] = getWeightedRandom(pool);
    }

    return { loadout: next, isZeroToHero };
  }

  function getWeaponHistory() {
    return [...weaponHistory];
  }

  function setWeaponHistory(history) {
    weaponHistory = Array.isArray(history) ? [...history] : [];
  }

  return { rollLoadout, getWeaponHistory, setWeaponHistory };
}
