const WEAPON_HISTORY_KEY = "weaponHistory";
const SELECTED_CATEGORIES_KEY = "selectedCategories";
const EXCLUDED_ARMOR_TIERS_KEY = "excludedArmorTiers";
const EXCLUDED_HELMET_TIERS_KEY = "excludedHelmetTiers";
const EXCLUDED_MAPS_KEY = "excludedMaps";
const EXCLUDED_WEAPON_CATEGORIES_KEY = "excludedWeaponCategories";
const EXCLUDED_WEAPONS_KEY = "excludedWeapons";
const STREAMER_MODE_KEY = "streamerMode";

export function loadWeaponHistory() {
  try {
    const saved = localStorage.getItem(WEAPON_HISTORY_KEY);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWeaponHistory(history) {
  try {
    localStorage.setItem(WEAPON_HISTORY_KEY, JSON.stringify(history));
  } catch {}
}

export function loadSelectedCategories(defaultCategories) {
  try {
    const saved = localStorage.getItem(SELECTED_CATEGORIES_KEY);
    if (!saved) {
      return [...defaultCategories];
    }

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      return [...defaultCategories];
    }

    return parsed;
  } catch {
    return [...defaultCategories];
  }
}

export function saveSelectedCategories(categories) {
  try {
    localStorage.setItem(SELECTED_CATEGORIES_KEY, JSON.stringify(categories));
  } catch {}
}

export function loadExcludedArmorTiers() {
  return loadArray(EXCLUDED_ARMOR_TIERS_KEY);
}

export function saveExcludedArmorTiers(tiers) {
  saveArray(EXCLUDED_ARMOR_TIERS_KEY, tiers);
}

export function loadExcludedHelmetTiers() {
  return loadArray(EXCLUDED_HELMET_TIERS_KEY);
}

export function saveExcludedHelmetTiers(tiers) {
  saveArray(EXCLUDED_HELMET_TIERS_KEY, tiers);
}

export function loadExcludedMaps() {
  return loadArray(EXCLUDED_MAPS_KEY);
}

export function saveExcludedMaps(maps) {
  saveArray(EXCLUDED_MAPS_KEY, maps);
}

export function loadExcludedWeaponCategories() {
  return loadArray(EXCLUDED_WEAPON_CATEGORIES_KEY);
}

export function saveExcludedWeaponCategories(categories) {
  saveArray(EXCLUDED_WEAPON_CATEGORIES_KEY, categories);
}

export function loadExcludedWeapons() {
  return loadArray(EXCLUDED_WEAPONS_KEY);
}

export function saveExcludedWeapons(weapons) {
  saveArray(EXCLUDED_WEAPONS_KEY, weapons);
}

export function loadStreamerMode() {
  try {
    const saved = localStorage.getItem(STREAMER_MODE_KEY);
    return saved === "transparent" || saved === "greenscreen" ? saved : "off";
  } catch {
    return "off";
  }
}

export function saveStreamerMode(mode) {
  try {
    localStorage.setItem(STREAMER_MODE_KEY, mode);
  } catch {}
}

export function loadArray(key) {
  try {
    const saved = localStorage.getItem(key);
    if (!saved) {
      return [];
    }

    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveArray(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
