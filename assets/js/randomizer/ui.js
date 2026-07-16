import {
  CARD_HEIGHT,
  TOTAL_CARDS,
  VISUAL_OFFSET,
  categoryOptionsRow1,
  categoryOptionsRow2,
  categoryOptionsRow3,
  maps,
  weapons,
  weaponCategoryOptions,
} from "./data.js";
import { buildCardContent } from "./game.js";

const mapOptions = maps.map((map) => map.name);

const weaponsByCategory = new Map(
  weaponCategoryOptions.map((weaponCategory) => [
    weaponCategory.key,
    weapons
      .filter((weapon) => weapon.category === weaponCategory.key)
      .sort((left, right) => left.name.localeCompare(right.name)),
  ]),
);

export function getElements() {
  return {
    body: document.body,
    slotMachine: document.querySelector(".slot-machine"),
    payline: document.querySelector(".payline"),
    mainTitle: document.getElementById("mainTitle"),
    subTitle: document.getElementById("subTitle"),
    spinButton: document.getElementById("spinBtn"),
    diedButton: document.getElementById("diedBtn"),
    survivedButton: document.getElementById("survivedBtn"),
    switchModeButton: document.getElementById("switchModeBtn"),
    streamerModeButton: document.getElementById("streamerModeBtn"),
    chanceInput: document.getElementById("chanceInput"),
    filterToggle: document.getElementById("filterToggle"),
    filterChevron: document.getElementById("filterChevron"),
    filterContent: document.getElementById("filterContent"),
    categoryContainer1: document.getElementById("categoryContainer1"),
    categoryContainer2: document.getElementById("categoryContainer2"),
    categoryContainer3: document.getElementById("categoryContainer3"),
    clearAllCategoriesButton: document.getElementById("clearAllCategoriesBtn"),
    resetCategoriesButton: document.getElementById("resetCategoriesBtn"),
    armorTierContainer: document.getElementById("armorTierContainer"),
    helmetTierContainer: document.getElementById("helmetTierContainer"),
    mapContainer: document.getElementById("mapContainer"),
    weaponCategoryContainer: document.getElementById("weaponCategoryContainer"),
    weaponFilterSearchInput: document.getElementById("weaponFilterSearch"),
    reloadMapButton: document.getElementById("reloadMapBtn"),
    columns: Array.from(
      document.querySelectorAll(".col-container[data-category]"),
    ),
  };
}

export function renderFilterButtons(elements, filters, handlers, options = {}) {
  const canEditCategories = options.canEditCategories ?? true;
  const selectedCategorySet = new Set(filters.selectedCategories);
  const allCategoryKeys = [
    ...categoryOptionsRow1,
    ...categoryOptionsRow2,
    ...categoryOptionsRow3,
  ].map((category) => category.key);
  const areAllCategoriesSelected = allCategoryKeys.every((category) =>
    selectedCategorySet.has(category),
  );

  setClearButtonState(
    elements.clearAllCategoriesButton,
    canEditCategories,
    areAllCategoriesSelected,
  );

  if (elements.resetCategoriesButton) {
    elements.resetCategoriesButton.disabled = !canEditCategories;
    elements.resetCategoriesButton.setAttribute(
      "aria-disabled",
      String(!canEditCategories),
    );
  }

  renderCategoryButtonsRow(
    elements.categoryContainer1,
    "Map",
    categoryOptionsRow1,
    selectedCategorySet,
    handlers.onCategoryToggle,
    handlers.onCategoryGroupToggle,
    canEditCategories,
  );
  renderCategoryButtonsRow(
    elements.categoryContainer2,
    "Equipment",
    categoryOptionsRow2,
    selectedCategorySet,
    handlers.onCategoryToggle,
    handlers.onCategoryGroupToggle,
    canEditCategories,
  );
  renderCategoryButtonsRow(
    elements.categoryContainer3,
    "Weapons",
    categoryOptionsRow3,
    selectedCategorySet,
    handlers.onCategoryToggle,
    handlers.onCategoryGroupToggle,
    canEditCategories,
  );
  renderTierButtons(
    elements.armorTierContainer,
    filters.excludedArmorTiers,
    handlers.onArmorTierToggle,
  );
  renderTierButtons(
    elements.helmetTierContainer,
    filters.excludedHelmetTiers,
    handlers.onHelmetTierToggle,
  );
  renderMapButtons(
    elements.mapContainer,
    filters.excludedMaps,
    handlers.onMapToggle,
  );
  renderWeaponCategoryButtons(
    elements.weaponCategoryContainer,
    filters.excludedWeapons,
    handlers.onWeaponToggle,
    handlers.onWeaponGroupToggle,
    filters.weaponSearchQuery ?? "",
  );
}

function setClearButtonState(button, enabled, areAllSelected) {
  if (!button) {
    return;
  }

  button.textContent = areAllSelected
    ? "Alle Kategorien de-selecten"
    : "Alle Kategorien selecten";
  button.disabled = !enabled;
  button.setAttribute("aria-disabled", String(!enabled));
}

function renderCategoryButtonsRow(
  container,
  groupLabel,
  categoryOptions,
  selectedCategorySet,
  onToggle,
  onGroupToggle,
  canEditCategories,
) {
  container.replaceChildren();

  const groupKeys = categoryOptions.map((category) => category.key);
  const selectedCount = groupKeys.filter((category) =>
    selectedCategorySet.has(category),
  ).length;
  const areAllGroupCategoriesSelected = selectedCount === groupKeys.length;

  const groupToggleButton = document.createElement("button");
  groupToggleButton.type = "button";
  groupToggleButton.className = "filter-item filter-item--group-toggle";
  groupToggleButton.textContent = `${
    areAllGroupCategoriesSelected
      ? `${groupLabel}: alles de-selecten`
      : `${groupLabel}: alles selecten`
  } (${selectedCount}/${groupKeys.length})`;
  groupToggleButton.classList.toggle("active", areAllGroupCategoriesSelected);
  groupToggleButton.disabled = !canEditCategories;
  groupToggleButton.classList.toggle("locked", !canEditCategories);
  groupToggleButton.setAttribute("aria-disabled", String(!canEditCategories));
  groupToggleButton.addEventListener("click", () => onGroupToggle(groupKeys));
  container.appendChild(groupToggleButton);

  categoryOptions.forEach((category) => {
    const isSelected = selectedCategorySet.has(category.key);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-item";
    button.dataset.category = category.key;
    button.textContent = category.label;
    button.classList.toggle("active", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
    button.disabled = !canEditCategories;
    button.classList.toggle("locked", !canEditCategories);
    button.setAttribute("aria-disabled", String(!canEditCategories));
    button.addEventListener("click", () => onToggle(category.key));
    container.appendChild(button);
  });
}

function renderTierButtons(container, excludedTiers, onToggle) {
  container.replaceChildren();

  for (let tier = 1; tier <= 6; tier += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-tier-btn";
    button.dataset.tier = String(tier);
    button.textContent = `Tier ${tier}`;
    const isExcluded = excludedTiers.includes(tier);
    button.classList.toggle("excluded", isExcluded);
    button.setAttribute("aria-pressed", String(isExcluded));
    button.addEventListener("click", () => onToggle(tier));
    container.appendChild(button);
  }
}

function renderMapButtons(container, excludedMaps, onToggle) {
  container.replaceChildren();
  const excludedMapSet = new Set(excludedMaps);

  mapOptions.forEach((mapName) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-item";
    button.dataset.map = mapName;
    button.textContent = mapName;
    const isExcluded = excludedMapSet.has(mapName);
    button.classList.toggle("excluded", isExcluded);
    button.setAttribute("aria-pressed", String(isExcluded));
    button.addEventListener("click", () => onToggle(mapName));
    container.appendChild(button);
  });
}

function renderWeaponCategoryButtons(
  container,
  excludedWeapons,
  onToggle,
  onGroupToggle,
  searchQuery = "",
) {
  container.replaceChildren();
  const excludedWeaponSet = new Set(excludedWeapons);
  const normalizedQuery = searchQuery.trim().toLowerCase();

  weaponCategoryOptions.forEach((weaponCategory) => {
    const groupElement = document.createElement("section");
    groupElement.className = "weapon-filter-group";

    const groupHeader = document.createElement("div");
    groupHeader.className = "weapon-filter-header";

    const title = document.createElement("h3");
    title.className = "weapon-filter-title";
    title.textContent = weaponCategory.label;

    const groupWeapons = weaponsByCategory.get(weaponCategory.key) ?? [];
    const includedWeapons = groupWeapons.filter(
      (weapon) => !excludedWeaponSet.has(weapon.name),
    );

    const groupToggleButton = document.createElement("button");
    groupToggleButton.type = "button";
    groupToggleButton.className = "weapon-filter-all";
    groupToggleButton.textContent = "ALL";
    const isGroupFullyIncluded = includedWeapons.length === groupWeapons.length;
    groupToggleButton.classList.toggle("active", isGroupFullyIncluded);
    groupToggleButton.setAttribute("aria-pressed", String(isGroupFullyIncluded));
    groupToggleButton.addEventListener("click", () =>
      onGroupToggle(weaponCategory.key),
    );

    groupHeader.append(title, groupToggleButton);

    const groupGrid = document.createElement("div");
    groupGrid.className = "weapon-filter-grid";

    let visibleWeaponCount = 0;

    groupWeapons.forEach((weapon) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "weapon-filter-item";
      button.dataset.weapon = weapon.name;
      button.dataset.tier = String(weapon.value ?? 3);
      const isExcluded = excludedWeaponSet.has(weapon.name);
      button.classList.toggle("excluded", isExcluded);
      button.setAttribute("aria-pressed", String(isExcluded));
      button.innerHTML = `<span class="weapon-filter-dot" aria-hidden="true"></span><span class="weapon-filter-text">${weapon.name}</span>`;
      button.addEventListener("click", () => onToggle(weapon.name));

      const matchesSearch =
        !normalizedQuery || weapon.name.toLowerCase().includes(normalizedQuery);
      button.hidden = !matchesSearch;
      if (matchesSearch) {
        visibleWeaponCount += 1;
      }

      groupGrid.appendChild(button);
    });

    groupElement.hidden = visibleWeaponCount === 0;
    groupElement.append(groupHeader, groupGrid);
    container.appendChild(groupElement);
  });
}

export function setupFilterToggle(elements) {
  elements.filterToggle.addEventListener("click", () => {
    const isOpen = elements.filterContent.classList.toggle("open");
    elements.filterChevron.textContent = isOpen ? "▲" : "▼";
    elements.filterToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

export function createStripContent(elementId, items, addHiddenZth) {
  const strip = document.getElementById(elementId);
  let html = "";
  let lastItemName = "";

  for (let index = 0; index < TOTAL_CARDS; index += 1) {
    let item;
    let attempts = 0;

    do {
      item = items[Math.floor(Math.random() * items.length)];
      attempts += 1;
    } while (item.name === lastItemName && attempts < 10);

    lastItemName = item.name;
    html += `<div class="card ${item.type}">${buildCardContent(item)}</div>`;
  }

  if (addHiddenZth) {
    html +=
      '<div class="card zth"><span class="card-text">ZERO TO HERO</span></div>';
  }

  strip.innerHTML = html;
  strip.style.transform = `translateY(${CARD_HEIGHT + VISUAL_OFFSET}px)`;
}

export function resetHeader(elements) {
  elements.body.classList.remove("alarm-mode");
  elements.mainTitle.innerText = "HL Idioten";
  elements.subTitle.innerText = "OPERATION: RNG";
}

export function enableAlarmMode(elements) {
  elements.body.classList.add("alarm-mode");
  elements.mainTitle.innerText = "⚠ ZERO TO HERO ⚠";
  elements.spinButton.innerText = "GOOD LUCK...";
}

export function setSpinButtonState(elements, isSpinning) {
  elements.spinButton.disabled = isSpinning;
  elements.spinButton.innerText = isSpinning ? "SHUFFLING..." : "START";
}

export function syncVisibleCategories(elements, selectedCategories) {
  elements.columns.forEach((column) => {
    const category = column.dataset.category;
    column.hidden = !selectedCategories.includes(category);
  });

  elements.slotMachine.dataset.visibleCount = String(selectedCategories.length);
  syncPaylinePosition();
}

export function syncPaylinePosition() {
  const winningCardCenterOffset = VISUAL_OFFSET + CARD_HEIGHT * 1.5;

  document.querySelectorAll(".slot-row").forEach((row) => {
    const payline = row.querySelector(".payline");
    if (!payline) return;

    const firstWindow = row.querySelector(
      ".col-container:not([hidden]) .window",
    );
    if (!firstWindow) {
      payline.hidden = true;
      return;
    }

    payline.hidden = false;
    const rowRect = row.getBoundingClientRect();
    const windowRect = firstWindow.getBoundingClientRect();
    const top = windowRect.top - rowRect.top + winningCardCenterOffset;
    payline.style.top = `${top}px`;
  });
}
