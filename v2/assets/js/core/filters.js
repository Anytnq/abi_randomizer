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
import tierlist from "../../../../assets/js/tierlist.json" with { type: "json" };

export const WEAPON_SOURCE_V1 = "v1";
export const WEAPON_SOURCE_TIERLIST = "tierlist";
export const WEAPON_SOURCES = [WEAPON_SOURCE_V1, WEAPON_SOURCE_TIERLIST];

const TIERLIST_ORDER = ["S", "A", "B", "C", "D", "F"];
const TIERLIST_TYPE = { S: "t6", A: "t5", B: "t4", C: "t3", D: "t2", F: "t1" };
const V1_WEAPONS_BY_NAME = new Map(weapons.map((weapon) => [weapon.name, weapon]));
const TIERLIST_WEAPONS = TIERLIST_ORDER.flatMap((tier) =>
  (tierlist[tier] ?? []).map((name) => ({
    ...(V1_WEAPONS_BY_NAME.get(name) ?? {
      name,
      chancePercent: 25,
      type: TIERLIST_TYPE[tier],
    }),
    category: `tierlist-${tier.toLowerCase()}`,
    tierlistTier: tier,
  })),
);

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
    weaponSource: WEAPON_SOURCE_V1,
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
  return getWeaponPool(filters).filter((weapon) => !excluded.has(weapon.name));
}

export function getWeaponPool(filters) {
  return filters.weaponSource === WEAPON_SOURCE_TIERLIST
    ? TIERLIST_WEAPONS
    : weapons;
}

export function getWeaponCategoryOptions(filters) {
  if (filters.weaponSource !== WEAPON_SOURCE_TIERLIST) return weaponCategoryOptions;
  return TIERLIST_ORDER.map((tier) => ({
    key: `tierlist-${tier.toLowerCase()}`,
    label: `${tier}-Tier`,
  }));
}

export function getWeaponsByCategory(filters) {
  const pool = getWeaponPool(filters);
  const map = new Map(
    getWeaponCategoryOptions(filters).map((category) => [
      category.key,
      pool
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
