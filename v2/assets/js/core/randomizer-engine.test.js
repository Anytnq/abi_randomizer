import {
  createRandomizerEngine,
  getItemTier,
  getItemRarityLabel,
  getItemResultLabel,
} from "./randomizer-engine.js";
import { getDefaultFilters, ALL_CATEGORY_KEYS } from "./filters.js";

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Test fehlgeschlagen: ${name}`);
  }
}

function testRollFillsAllSelectedCategories() {
  const engine = createRandomizerEngine({ zeroToHeroChancePercent: 0 });
  const filters = { ...getDefaultFilters(), selectedCategories: [...ALL_CATEGORY_KEYS] };
  const { loadout } = engine.rollLoadout({}, new Set(), { filters });

  ALL_CATEGORY_KEYS.forEach((key) => {
    assert(`rollLoadout fills ${key}`, loadout[key] != null);
  });
}

function testLockedCategoryUnchanged() {
  const engine = createRandomizerEngine({ zeroToHeroChancePercent: 0 });
  const filters = { ...getDefaultFilters(), selectedCategories: ["map"] };
  const first = engine.rollLoadout({}, new Set(), { filters });
  const locked = new Set(["map"]);
  const second = engine.rollLoadout(first.loadout, locked, { filters });

  assert(
    "locked map stays identical across rolls",
    second.loadout.map === first.loadout.map,
  );
}

function testDeselectedCategoryNotRolled() {
  const engine = createRandomizerEngine({ zeroToHeroChancePercent: 0 });
  const filters = { ...getDefaultFilters(), selectedCategories: ["map"] };
  const { loadout } = engine.rollLoadout({}, new Set(), { filters });

  assert("map rolled", loadout.map != null);
  assert("helmet not rolled when deselected", loadout.helmet === undefined);
}

function testZeroToHeroForced() {
  const engine = createRandomizerEngine({ zeroToHeroChancePercent: 100 });
  const filters = { ...getDefaultFilters(), selectedCategories: ["primaryWeapon"] };
  const { loadout, isZeroToHero } = engine.rollLoadout({}, new Set(), { filters });

  assert("zeroToHeroChancePercent 100 always triggers", isZeroToHero === true);
  assert("ZTH card is named ZERO TO HERO", loadout.primaryWeapon.name === "ZERO TO HERO");
}

function testWeaponHistoryRoundtrip() {
  const engine = createRandomizerEngine({ zeroToHeroChancePercent: 0 });
  const filters = { ...getDefaultFilters(), selectedCategories: ["primaryWeapon"] };
  const { loadout } = engine.rollLoadout({}, new Set(), { filters });
  engine.setWeaponHistory([loadout.primaryWeapon.name, "Other Weapon"]);

  assert(
    "getWeaponHistory reflects setWeaponHistory (persistence roundtrip)",
    engine.getWeaponHistory().length === 2,
  );
}

function testGetItemTierAndRarity() {
  assert("weapon tier uses .value", getItemTier({ value: 5, type: "t2" }) === 5);
  assert("non-weapon tier uses .type", getItemTier({ type: "t3" }) === 3);
  assert("missing item defaults to tier 1", getItemTier(null) === 1);
  assert(
    "rarity label matches game.js scale",
    getItemRarityLabel({ value: 6 }) === "Immortal",
  );
  assert(
    "tierlist result combines rarity and tier",
    getItemResultLabel({ value: 3, tierlistTier: "D" }) === "Rare [D-Tier]",
  );
  assert(
    "v1 result keeps rarity-only label",
    getItemResultLabel({ value: 3 }) === "Rare",
  );
}

export function runRandomizerEngineTests() {
  testRollFillsAllSelectedCategories();
  testLockedCategoryUnchanged();
  testDeselectedCategoryNotRolled();
  testZeroToHeroForced();
  testWeaponHistoryRoundtrip();
  testGetItemTierAndRarity();
  return "Alle randomizer-engine Tests bestanden.";
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("runV2Tests") === "1") {
    try {
      console.log(runRandomizerEngineTests());
    } catch (error) {
      console.error(error);
    }
  }
}
