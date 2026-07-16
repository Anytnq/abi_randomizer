/* Filter Studio core logic (Planungs.md 5.4) - pure, no DOM. Mirrors v1's
   actual filter surface (map/weapon excludes, helmet/armor tier excludes)
   instead of inventing a new one (Planungs.md 3). */

import {
  maps,
  helmets,
  armors,
  weapons,
  weaponCategoryOptions,
  tierNumberByType,
} from "../../../../assets/js/randomizer/data.js";

/* Same 7 board categories as core/randomizer-engine.js CARD_KEYS - kept as
   an independent literal here to avoid a circular import between the two
   core modules. */
export const ALL_CATEGORY_KEYS = [
  "map",
  "helmet",
  "armor",
  "chestRig",
  "backpack",
  "primaryWeapon",
  "secondaryWeapon",
];
export const DEFAULT_CATEGORY_KEYS = [
  "map",
  "primaryWeapon",
  "secondaryWeapon",
];

export const TIERS = [1, 2, 3, 4, 5, 6];

export function getDefaultFilters() {
  return {
    selectedCategories: [...DEFAULT_CATEGORY_KEYS],
    excludedMaps: [],
    excludedHelmetTiers: [],
    excludedArmorTiers: [],
    excludedWeapons: [],
  };
}

export function getAvailableMaps(filters) {
  const excluded = new Set(filters.excludedMaps);
  return maps.filter((map) => !excluded.has(map.name));
}

export function getAvailableHelmets(filters) {
  const excluded = new Set(filters.excludedHelmetTiers);
  return helmets.filter((helmet) => !excluded.has(tierNumberByType[helmet.type]));
}

export function getAvailableArmors(filters) {
  const excluded = new Set(filters.excludedArmorTiers);
  return armors.filter((armor) => !excluded.has(tierNumberByType[armor.type]));
}

export function getAvailableWeapons(filters) {
  const excluded = new Set(filters.excludedWeapons);
  return weapons.filter((weapon) => !excluded.has(weapon.name));
}

export function getWeaponsByCategory() {
  const map = new Map(
    weaponCategoryOptions.map((category) => [
      category.key,
      weapons
        .filter((weapon) => weapon.category === category.key)
        .sort((a, b) => a.name.localeCompare(b.name)),
    ]),
  );
  return map;
}

/** List of concrete error strings, empty when valid. */
export function validateFilters(filters) {
  const errors = [];

  if (filters.selectedCategories.length === 0) {
    errors.push("Mindestens eine Kategorie muss aktiv sein.");
  }

  if (
    filters.selectedCategories.includes("map") &&
    getAvailableMaps(filters).length === 0
  ) {
    errors.push("Map ist aktiv, aber alle Maps sind ausgeschlossen.");
  }

  if (
    filters.selectedCategories.includes("helmet") &&
    getAvailableHelmets(filters).length === 0
  ) {
    errors.push("Helmet ist aktiv, aber alle Helm-Tiers sind ausgeschlossen.");
  }

  if (
    filters.selectedCategories.includes("armor") &&
    getAvailableArmors(filters).length === 0
  ) {
    errors.push("Armor ist aktiv, aber alle Rüstungs-Tiers sind ausgeschlossen.");
  }

  if (
    (filters.selectedCategories.includes("primaryWeapon")) &&
    getAvailableWeapons(filters).length === 0
  ) {
    errors.push("Primary Weapon ist aktiv, aber alle Waffen sind ausgeschlossen.");
  }

  return errors;
}
