import {
  CARD_HEIGHT,
  TOTAL_CARDS,
  VISUAL_OFFSET,
  tierChancePercent,
} from "./data.js";

export const SPIN_START_OFFSET_MS = 50;
export const SPIN_STAGGER_MS = 400;
export const SPIN_ANIMATION_MS = 3000;

function formatWeaponCategory(category) {
  if (!category) {
    return "";
  }

  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCardContent(item) {
  const categoryLabel = formatWeaponCategory(item.category);
  const categoryLine = categoryLabel
    ? `<span class="card-category">(${categoryLabel})</span>`
    : "";

  return `<span class="card-text">${item.name}${categoryLine}</span>`;
}

export function getWeightedRandom(items) {
  if (!items || items.length === 0) {
    return items?.[0];
  }

  let totalChancePercent = 0;
  for (const item of items) {
    totalChancePercent +=
      item.chancePercent ?? tierChancePercent[item.type] ?? 10;
  }

  let randomValue = Math.random() * totalChancePercent;

  for (const item of items) {
    randomValue -= item.chancePercent ?? tierChancePercent[item.type] ?? 10;
    if (randomValue <= 0) {
      return item;
    }
  }

  return items[items.length - 1];
}

export function pickMapWinner(maps, lastMap) {
  let winner = getWeightedRandom(maps);
  let attempts = 0;

  while (winner.name === lastMap && maps.length > 1 && attempts < 20) {
    winner = getWeightedRandom(maps);
    attempts += 1;
  }

  return winner;
}

export function pickWeaponWinner(weapons, weaponHistory) {
  let winner;
  let attempts = 0;

  do {
    winner = getWeightedRandom(weapons);
    attempts += 1;
  } while (weaponHistory.includes(winner.name) && attempts < 50);

  return winner;
}

export function updateWeaponHistory(weaponHistory, weaponName) {
  const nextHistory = [weaponName, ...weaponHistory].slice(0, 3);
  return nextHistory;
}

export function spinColumn(
  elementId,
  dataset,
  delay,
  winnerItem,
  forceZth = false,
) {
  const strip = document.getElementById(elementId);
  let targetIndex;

  if (forceZth) {
    targetIndex = TOTAL_CARDS;
  } else {
    targetIndex = Math.floor(Math.random() * 15) + 40;
    replaceWinningCard(strip, dataset, targetIndex, winnerItem);
  }

  strip.style.transition = "none";
  strip.style.transform = `translateY(${CARD_HEIGHT + VISUAL_OFFSET}px)`;
  strip.offsetHeight;

  const targetPosition =
    -(targetIndex * CARD_HEIGHT) + CARD_HEIGHT + VISUAL_OFFSET;

  setTimeout(() => {
    strip.style.transition = `transform ${SPIN_ANIMATION_MS}ms cubic-bezier(0.15, 0.9, 0.35, 1)`;
    strip.style.transform = `translateY(${targetPosition}px)`;
  }, SPIN_START_OFFSET_MS + delay);
}

function replaceWinningCard(strip, dataset, targetIndex, winnerItem) {
  if (!winnerItem) {
    return;
  }

  const winningCard = strip.children[targetIndex];
  if (!winningCard) {
    return;
  }

  winningCard.className = `card ${winnerItem.type}`;
  winningCard.innerHTML = buildCardContent(winnerItem);

  const previousCard = strip.children[targetIndex - 1];
  const nextCard = strip.children[targetIndex + 1];
  const getDifferentItem = () => {
    const pool = dataset.filter((item) => item.name !== winnerItem.name);
    const safePool = pool.length > 0 ? pool : dataset;
    return safePool[Math.floor(Math.random() * safePool.length)];
  };

  if (previousCard && previousCard.textContent.trim() === winnerItem.name) {
    const replacement = getDifferentItem();
    previousCard.className = `card ${replacement.type}`;
    previousCard.innerHTML = buildCardContent(replacement);
  }

  if (nextCard && nextCard.textContent.trim() === winnerItem.name) {
    const replacement = getDifferentItem();
    nextCard.className = `card ${replacement.type}`;
    nextCard.innerHTML = buildCardContent(replacement);
  }
}
