import {
  CARD_HEIGHT,
  TOTAL_CARDS,
  VISUAL_OFFSET,
  categoryOptions,
  categoryOptionsRow1,
  categoryOptionsRow2,
  categoryOptionsRow3,
} from "./data.js";

export function getElements() {
  return {
    body: document.body,
    slotMachine: document.querySelector(".slot-machine"),
    payline: document.querySelector(".payline"),
    mainTitle: document.getElementById("mainTitle"),
    subTitle: document.getElementById("subTitle"),
    spinButton: document.getElementById("spinBtn"),
    chanceInput: document.getElementById("chanceInput"),
    filterToggle: document.getElementById("filterToggle"),
    filterChevron: document.getElementById("filterChevron"),
    filterContent: document.getElementById("filterContent"),
    categoryContainer1: document.getElementById("categoryContainer1"),
    categoryContainer2: document.getElementById("categoryContainer2"),
    categoryContainer3: document.getElementById("categoryContainer3"),
    armorTierContainer: document.getElementById("armorTierContainer"),
    helmetTierContainer: document.getElementById("helmetTierContainer"),
    mapContainer: document.getElementById("mapContainer"),
    columns: Array.from(
      document.querySelectorAll(".col-container[data-category]"),
    ),
  };
}

export function renderFilterButtons(elements, filters, handlers) {
  renderCategoryButtonsRow(
    elements.categoryContainer1,
    categoryOptionsRow1,
    filters.selectedCategories,
    handlers.onCategoryToggle,
  );
  renderCategoryButtonsRow(
    elements.categoryContainer2,
    categoryOptionsRow2,
    filters.selectedCategories,
    handlers.onCategoryToggle,
  );
  renderCategoryButtonsRow(
    elements.categoryContainer3,
    categoryOptionsRow3,
    filters.selectedCategories,
    handlers.onCategoryToggle,
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
}

function renderCategoryButtonsRow(
  container,
  categoryOptions,
  selectedCategories,
  onToggle,
) {
  container.replaceChildren();

  categoryOptions.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "filter-item";
    button.dataset.category = category.key;
    button.textContent = category.label;
    button.classList.toggle(
      "active",
      selectedCategories.includes(category.key),
    );
    button.setAttribute(
      "aria-pressed",
      String(selectedCategories.includes(category.key)),
    );
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
    button.classList.toggle("excluded", excludedTiers.includes(tier));
    button.addEventListener("click", () => onToggle(tier));
    container.appendChild(button);
  }
}

function renderMapButtons(container, excludedMaps, onToggle) {
  container.replaceChildren();

  ["Farm", "Northridge", "Armory", "TV Station", "Airport"].forEach(
    (mapName) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "filter-item";
      button.dataset.map = mapName;
      button.textContent = mapName;
      button.classList.toggle("excluded", excludedMaps.includes(mapName));
      button.addEventListener("click", () => onToggle(mapName));
      container.appendChild(button);
    },
  );
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
    html += `<div class="card ${item.type}"><span class="card-text">${item.name}</span></div>`;
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
