/* GunGame core engine (Planungs.md 5.7, 14: "GunGame-Engine extrahieren").
   v1's assets/js/gungame/gungame.js runs a DOM-coupled initialize() at
   import time (grabs elements, crashes if they're missing) so it can't be
   imported directly - this reimplements its route/upgrade rules cleanly
   against the same data pool (Planungs.md 3), no DOM anywhere. */

import { gungameWeapons } from "../../../../assets/js/gungame/data.js";
import { formatWeaponCategory } from "../../../../assets/js/randomizer/game.js";

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

export function getWeaponValue(weapon) {
  const parsed = Number.parseInt(String(weapon?.value ?? ""), 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
}

function createRouteEntry(weapon, step) {
  return {
    step,
    name: weapon.name,
    category: formatWeaponCategory(weapon.category) || "Unknown",
    value: getWeaponValue(weapon),
  };
}

export function buildRoute(stageCount) {
  const shuffled = shuffle(gungameWeapons);
  const route = [];
  for (let index = 0; index < stageCount; index += 1) {
    const weapon = shuffled[index % shuffled.length];
    route.push(createRouteEntry(weapon, index + 1));
  }
  return route;
}

export function pickHigherWeapon(currentValue, excludedName) {
  const candidates = gungameWeapons.filter(
    (weapon) =>
      weapon.name !== excludedName && getWeaponValue(weapon) > currentValue,
  );
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

export const MIN_STAGES = 3;
export const MAX_STAGES = 30;
export const DEFAULT_STAGES = 12;
export const DEFAULT_UPGRADE_CHANCE_PERCENT = 25;

export function createGunGameEngine() {
  let route = [];
  let currentIndex = 0;

  function regenerate(stageCount) {
    const clamped = Math.max(MIN_STAGES, Math.min(MAX_STAGES, stageCount));
    route = buildRoute(clamped);
    currentIndex = 0;
    return { route, currentIndex };
  }

  function completeRaid(upgradeChancePercent) {
    if (route.length === 0) return null;
    const currentEntry = route[currentIndex];
    if (!currentEntry) return null;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= route.length) {
      return {
        route,
        currentIndex,
        isFinal: true,
        message: `Finale geschafft mit ${currentEntry.name}. GunGame Route abgeschlossen.`,
      };
    }

    const nextEntry = route[nextIndex];
    const rolledUpgrade = Math.random() < upgradeChancePercent / 100;
    let message = `Raid abgeschlossen mit ${currentEntry.name} (Wert ${currentEntry.value}).`;

    if (rolledUpgrade) {
      const upgraded = pickHigherWeapon(nextEntry.value, nextEntry.name);
      if (upgraded) {
        route[nextIndex] = createRouteEntry(upgraded, nextIndex + 1);
        message += ` Upgrade aktiv: Stufe ${nextIndex + 1} wurde auf ${upgraded.name} (Wert ${route[nextIndex].value}) erhöht.`;
      } else {
        message += " Upgrade gewürfelt, aber keine höhere Waffe verfügbar.";
      }
    } else {
      message += ` Kein Upgrade dieses Mal (${Math.round(upgradeChancePercent)}% Chance).`;
    }

    currentIndex = nextIndex;
    return { route, currentIndex, isFinal: false, message };
  }

  function moveToPrevious() {
    currentIndex = Math.max(0, currentIndex - 1);
    return { route, currentIndex };
  }

  function moveToNext() {
    currentIndex = Math.min(route.length - 1, currentIndex + 1);
    return { route, currentIndex };
  }

  function reset() {
    currentIndex = 0;
    return { route, currentIndex };
  }

  function getState() {
    return { route, currentIndex };
  }

  return {
    regenerate,
    completeRaid,
    moveToPrevious,
    moveToNext,
    reset,
    getState,
  };
}
