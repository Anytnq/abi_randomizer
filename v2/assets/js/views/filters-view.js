/* Filter Studio (Planungs.md 5.4): opened as a Sheet from the Randomizer
   view. Works on a draft copy - nothing is saved until "Übernehmen" passes
   validation (Planungs.md: "lokale Speicherung erfolgt erst nach
   erfolgreicher Validierung"). */

import { openSheet } from "../components/sheet.js";
import {
  ALL_CATEGORY_KEYS,
  DEFAULT_CATEGORY_KEYS,
  TIERS,
  WEAPON_SOURCE_TIERLIST,
  WEAPON_SOURCE_V1,
  getAvailableWeapons,
  getWeaponCategoryOptions,
  getWeaponsByCategory,
  validateFilters,
} from "../core/filters.js";
import { maps as allMaps } from "../../../../assets/js/randomizer/data.js";

const CATEGORY_LABELS = {
  map: "Map",
  helmet: "Helmet",
  armor: "Armor",
  chestRig: "Rig",
  backpack: "Backpack",
  primaryWeapon: "Primary Weapon",
  secondaryWeapon: "Secondary Weapon",
};

function toggleInSet(set, value) {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

export function openFilterStudio({ currentFilters, onApply }) {
  const draft = {
    selectedCategories: [...currentFilters.selectedCategories],
    excludedMaps: [...currentFilters.excludedMaps],
    excludedHelmetTiers: [...currentFilters.excludedHelmetTiers],
    excludedArmorTiers: [...currentFilters.excludedArmorTiers],
    excludedWeapons: [...currentFilters.excludedWeapons],
    weaponSource: currentFilters.weaponSource ?? WEAPON_SOURCE_V1,
  };
  let weaponSearch = "";

  const sheet = openSheet({
    title: "Filter Studio",
    buildBody(body) {
      renderBody(body);
    },
    buildFooter(footer, controller) {
      renderFooter(footer, controller);
    },
  });

  function renderBody(body) {
    body.replaceChildren();
    body.appendChild(buildCategorySection());
    body.appendChild(buildToggleSection("Maps", "excludedMaps", allMaps));
    body.appendChild(buildTierSection("Helmet Tiers", "excludedHelmetTiers"));
    body.appendChild(buildTierSection("Armor Tiers", "excludedArmorTiers"));
    body.appendChild(buildWeaponSection());
  }

  function refresh() {
    renderBody(sheet.bodyEl);
    renderFooter(sheet.footerEl, sheet);
  }

  function buildCategorySection() {
    const section = document.createElement("section");
    section.style.marginBottom = "var(--space-6)";

    const heading = document.createElement("h3");
    heading.textContent = "Kategorien";
    heading.style.marginBottom = "var(--space-2)";
    section.appendChild(heading);

    const quickActions = document.createElement("div");
    quickActions.style.display = "flex";
    quickActions.style.gap = "var(--space-2)";
    quickActions.style.marginBottom = "var(--space-3)";

    const allBtn = document.createElement("button");
    allBtn.type = "button";
    allBtn.className = "btn btn--secondary";
    allBtn.textContent = "Alle";
    allBtn.addEventListener("click", () => {
      draft.selectedCategories = [...ALL_CATEGORY_KEYS];
      refresh();
    });

    const noneBtn = document.createElement("button");
    noneBtn.type = "button";
    noneBtn.className = "btn btn--secondary";
    noneBtn.textContent = "Keine";
    noneBtn.addEventListener("click", () => {
      draft.selectedCategories = [];
      refresh();
    });

    const defaultBtn = document.createElement("button");
    defaultBtn.type = "button";
    defaultBtn.className = "btn btn--secondary";
    defaultBtn.textContent = "Standard wiederherstellen";
    defaultBtn.addEventListener("click", () => {
      draft.selectedCategories = [...DEFAULT_CATEGORY_KEYS];
      refresh();
    });

    quickActions.append(allBtn, noneBtn, defaultBtn);
    section.appendChild(quickActions);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
    grid.style.gap = "var(--space-2)";

    ALL_CATEGORY_KEYS.forEach((key) => {
      const isSelected = draft.selectedCategories.includes(key);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn " + (isSelected ? "btn--primary" : "btn--secondary");
      btn.setAttribute("aria-pressed", String(isSelected));
      btn.textContent = CATEGORY_LABELS[key];
      btn.addEventListener("click", () => {
        draft.selectedCategories = isSelected
          ? draft.selectedCategories.filter((k) => k !== key)
          : [...draft.selectedCategories, key];
        refresh();
      });
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
  }

  function buildToggleSection(title, filterKey, items) {
    const section = document.createElement("section");
    section.style.marginBottom = "var(--space-6)";

    const excludedSet = new Set(draft[filterKey]);
    const activeCount = items.length - excludedSet.size;

    const heading = document.createElement("h3");
    heading.textContent = `${title} (${activeCount}/${items.length} aktiv)`;
    heading.style.marginBottom = "var(--space-2)";
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
    grid.style.gap = "var(--space-2)";

    items.forEach((item) => {
      const isExcluded = excludedSet.has(item.name);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--secondary";
      btn.style.opacity = isExcluded ? "0.5" : "1";
      btn.setAttribute("aria-pressed", String(!isExcluded));
      btn.textContent = item.name;
      btn.addEventListener("click", () => {
        draft[filterKey] = [...toggleInSet(excludedSet, item.name)];
        refresh();
      });
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
  }

  function buildTierSection(title, filterKey) {
    const section = document.createElement("section");
    section.style.marginBottom = "var(--space-6)";

    const excludedSet = new Set(draft[filterKey]);

    const heading = document.createElement("h3");
    heading.textContent = `${title} (${TIERS.length - excludedSet.size}/${TIERS.length} aktiv)`;
    heading.style.marginBottom = "var(--space-2)";
    section.appendChild(heading);

    const grid = document.createElement("div");
    grid.style.display = "flex";
    grid.style.gap = "var(--space-2)";
    grid.style.flexWrap = "wrap";

    TIERS.forEach((tier) => {
      const isExcluded = excludedSet.has(tier);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn--secondary";
      btn.style.opacity = isExcluded ? "0.5" : "1";
      btn.setAttribute("aria-pressed", String(!isExcluded));
      btn.textContent = `Tier ${tier}`;
      btn.addEventListener("click", () => {
        draft[filterKey] = [...toggleInSet(excludedSet, tier)];
        refresh();
      });
      grid.appendChild(btn);
    });

    section.appendChild(grid);
    return section;
  }

  function buildWeaponSection() {
    const section = document.createElement("section");

    const excludedSet = new Set(draft.excludedWeapons);
    const available = getAvailableWeapons(draft);

    const heading = document.createElement("h3");
    heading.textContent = `Waffen (${available.length} aktiv)`;
    heading.style.marginBottom = "var(--space-2)";
    section.appendChild(heading);

    const sourceRow = document.createElement("div");
    sourceRow.style.display = "flex";
    sourceRow.style.flexWrap = "wrap";
    sourceRow.style.gap = "var(--space-2)";
    sourceRow.style.marginBottom = "var(--space-3)";
    [
      [WEAPON_SOURCE_V1, "Randomizer V1 Waffen"],
      [WEAPON_SOURCE_TIERLIST, "Randomizer Tierlist Waffen"],
    ].forEach(([source, label]) => {
      const btn = document.createElement("button");
      const selected = draft.weaponSource === source;
      btn.type = "button";
      btn.className = `btn ${selected ? "btn--primary" : "btn--secondary"}`;
      btn.setAttribute("aria-pressed", String(selected));
      btn.textContent = label;
      btn.addEventListener("click", () => {
        draft.weaponSource = source;
        refresh();
      });
      sourceRow.appendChild(btn);
    });
    section.appendChild(sourceRow);

    const search = document.createElement("input");
    search.type = "search";
    search.placeholder = "Waffe suchen...";
    search.setAttribute("aria-label", "Waffe suchen");
    search.value = weaponSearch;
    search.className = "weapon-search-input";
    search.addEventListener("input", (event) => {
      weaponSearch = event.target.value;
      refresh();
      sheet.bodyEl.querySelector(".weapon-search-input")?.focus();
    });
    section.appendChild(search);

    const query = weaponSearch.trim().toLowerCase();
    const groups = getWeaponsByCategory(draft);

    getWeaponCategoryOptions(draft).forEach((category) => {
      const groupWeapons = (groups.get(category.key) ?? []).filter((weapon) =>
        !query || weapon.name.toLowerCase().includes(query),
      );
      if (groupWeapons.length === 0) return;

      const groupEl = document.createElement("div");
      groupEl.style.marginTop = "var(--space-3)";

      const groupHeading = document.createElement("p");
      groupHeading.style.color = "var(--color-text-muted)";
      groupHeading.style.fontSize = "var(--text-xs)";
      groupHeading.style.textTransform = "uppercase";
      groupHeading.textContent = category.label;
      groupEl.appendChild(groupHeading);

      const grid = document.createElement("div");
      grid.style.display = "grid";
      grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
      grid.style.gap = "var(--space-2)";
      grid.style.marginTop = "var(--space-1)";

      groupWeapons.forEach((weapon) => {
        const isExcluded = excludedSet.has(weapon.name);
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn--secondary";
        btn.style.opacity = isExcluded ? "0.5" : "1";
        btn.setAttribute("aria-pressed", String(!isExcluded));
        btn.textContent = weapon.name;
        btn.addEventListener("click", () => {
          draft.excludedWeapons = [...toggleInSet(excludedSet, weapon.name)];
          refresh();
        });
        grid.appendChild(btn);
      });

      groupEl.appendChild(grid);
      section.appendChild(groupEl);
    });

    return section;
  }

  function renderFooter(footer, controller) {
    footer.replaceChildren();

    const errors = validateFilters(draft);

    if (errors.length > 0) {
      const errorBox = document.createElement("div");
      errorBox.className = "sheet-errors";
      errorBox.setAttribute("role", "alert");
      const list = document.createElement("ul");
      errors.forEach((error) => {
        const li = document.createElement("li");
        li.textContent = error;
        list.appendChild(li);
      });
      errorBox.appendChild(list);
      footer.appendChild(errorBox);
    }

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "var(--space-2)";
    actions.style.marginLeft = "auto";

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "btn btn--ghost";
    cancelBtn.textContent = "Abbrechen";
    cancelBtn.addEventListener("click", () => controller.close());

    const applyBtn = document.createElement("button");
    applyBtn.type = "button";
    applyBtn.className = "btn btn--primary";
    applyBtn.textContent = "Übernehmen";
    applyBtn.disabled = errors.length > 0;
    applyBtn.addEventListener("click", () => {
      onApply(draft);
      controller.close();
    });

    actions.append(cancelBtn, applyBtn);
    footer.appendChild(actions);
  }
}
