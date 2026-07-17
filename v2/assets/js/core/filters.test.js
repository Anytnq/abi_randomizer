import {
  getDefaultFilters,
  getAvailableMaps,
  getAvailableWeapons,
  WEAPON_SOURCE_TIERLIST,
  validateFilters,
} from "./filters.js";
import { maps, weapons } from "../../../../assets/js/randomizer/data.js";

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Test fehlgeschlagen: ${name}`);
  }
}

function testDefaultFiltersAreValid() {
  const errors = validateFilters(getDefaultFilters());
  assert("default filters have no validation errors", errors.length === 0);
}

function testEmptyCategoriesIsInvalid() {
  const filters = { ...getDefaultFilters(), selectedCategories: [] };
  const errors = validateFilters(filters);
  assert("no selected categories produces an error", errors.length > 0);
}

function testExcludingAllMapsIsInvalid() {
  const filters = {
    ...getDefaultFilters(),
    selectedCategories: ["map"],
    excludedMaps: maps.map((map) => map.name),
  };
  const errors = validateFilters(filters);
  assert(
    "excluding every map while map is active produces an error",
    errors.some((error) => error.includes("Map")),
  );
  assert("getAvailableMaps is empty", getAvailableMaps(filters).length === 0);
}

function testWeaponExclusionNarrowsPool() {
  const filters = { ...getDefaultFilters(), excludedWeapons: [weapons[0].name] };
  const available = getAvailableWeapons(filters);
  assert(
    "excluded weapon is removed from the available pool",
    !available.some((weapon) => weapon.name === weapons[0].name),
  );
  assert(
    "pool shrinks by exactly one",
    available.length === weapons.length - 1,
  );
}

function testTierlistSourceIncludesJsonOnlyWeapons() {
  const filters = {
    ...getDefaultFilters(),
    weaponSource: WEAPON_SOURCE_TIERLIST,
  };
  const names = new Set(getAvailableWeapons(filters).map((weapon) => weapon.name));
  assert("tierlist source includes ZB07", names.has("ZB07"));
  assert("tierlist source includes MPF45", names.has("MPF45"));
}

export function runFiltersTests() {
  testDefaultFiltersAreValid();
  testEmptyCategoriesIsInvalid();
  testExcludingAllMapsIsInvalid();
  testWeaponExclusionNarrowsPool();
  testTierlistSourceIncludesJsonOnlyWeapons();
  return "Alle filters Tests bestanden.";
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("runV2Tests") === "1") {
    try {
      console.log(runFiltersTests());
    } catch (error) {
      console.error(error);
    }
  }
}
