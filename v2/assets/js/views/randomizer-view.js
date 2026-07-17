/* Randomizer Play View (Planungs.md 5.3) - Loadout Board.
   Wired to the real engine (Phase 3): weighted-random picks, weapon
   history, 0-to-Hero probability, all reused from v1's randomizer/game.js
   and randomizer/data.js (Planungs.md 3). Wheel and Squad are embedded
   inline as collapsible sections on this same page (not separate routes) -
   their view modules are reused as-is, just mounted into a local container
   instead of the router's #main outlet. */

import {
  TIER_COLOR,
  createRandomizerEngine,
  getRandomizerCandidates,
  getItemResultLabel,
  getItemTier,
} from "../core/randomizer-engine.js";
import { loadV2State, saveV2State } from "../core/storage.js";
import { showEventOverlay } from "../components/event-overlay.js";
import { getDefaultFilters, ALL_CATEGORY_KEYS } from "../core/filters.js";
import { appStore } from "../app/app-store.js";
import {
  playSpinSound,
  stopSpinSound,
  playCrateRevealSound,
  playHeroSong,
  stopHeroSong,
} from "../../../../assets/js/randomizer/sound.js";

const CARD_LABELS = {
  helmet: "Helmet",
  armor: "Armor",
  chestRig: "Rig",
  backpack: "Backpack",
};
const EQUIPMENT_KEYS = ["helmet", "armor", "chestRig", "backpack"];

const WEAPON_LABELS = {
  primaryWeapon: "Primary Weapon",
  secondaryWeapon: "Secondary Weapon",
};
const WEAPON_KEYS = ["primaryWeapon", "secondaryWeapon"];

const SPIN_DURATION_MS = 2800;
const REEL_DURATION_MS = 2500;

function reloadIcon() {
  return `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" focusable="false">
    <path d="M20 11a8 8 0 1 1-2.35-5.65" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
    <path d="M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
  </svg>`;
}

export function render(outlet) {
  const engine = createRandomizerEngine({ zeroToHeroChancePercent: 5 });
  const persisted = loadV2State();
  engine.setWeaponHistory(persisted.weaponHistory);

  let filters = persisted.filters ?? getDefaultFilters();
  const lockedKeys = new Set();
  let loadout = persisted.lastLoadout ?? {};
  let phase = "idle";
  let spinningKeys = new Set();

  if (!persisted.lastLoadout) {
    ({ loadout } = engine.rollLoadout({}, new Set(), { filters }));
  }

  const header = document.createElement("div");
  header.className = "randomizer-view-header";

  const title = document.createElement("h1");
  title.className = "randomizer-view-title";
  title.textContent = "Loadout";

  const headerActions = document.createElement("div");
  headerActions.className = "randomizer-header-actions";

  const filterChip = document.createElement("button");
  filterChip.type = "button";
  filterChip.className = "btn btn--secondary randomizer-filter-chip";

  const wheelToggle = document.createElement("button");
  wheelToggle.type = "button";
  wheelToggle.className = "btn btn--secondary";
  wheelToggle.setAttribute("aria-expanded", "false");
  wheelToggle.textContent = "Wheel";

  const squadToggle = document.createElement("button");
  squadToggle.type = "button";
  squadToggle.className = "btn btn--secondary";
  squadToggle.setAttribute("aria-expanded", "false");
  squadToggle.textContent = "Squad";

  headerActions.append(filterChip, wheelToggle, squadToggle);
  header.append(title, headerActions);

  const board = document.createElement("div");
  board.className = "loadout-board";

  const spinBtn = document.createElement("button");
  spinBtn.type = "button";
  spinBtn.className = "btn btn--primary btn--lg slot-spin-btn";
  spinBtn.textContent = "SPIN";
  spinBtn.addEventListener("click", rerollAll);

  const boardWrap = document.createElement("div");
  boardWrap.className = "loadout-board-wrap";
  boardWrap.append(board, spinBtn);

  const wheelSection = document.createElement("section");
  wheelSection.className = "randomizer-inline-section";
  wheelSection.hidden = true;
  wheelSection.setAttribute("aria-label", "Wheel");

  const squadSection = document.createElement("section");
  squadSection.className = "randomizer-inline-section";
  squadSection.hidden = true;
  squadSection.setAttribute("aria-label", "Squad");

  outlet.append(header, boardWrap, wheelSection, squadSection);

  function makeInlineToggle(toggleBtn, section, mountKey) {
    const state = { mounted: false, cleanup: null };
    toggleBtn.addEventListener("click", async () => {
      const willShow = section.hidden;
      section.hidden = !willShow;
      toggleBtn.setAttribute("aria-expanded", String(willShow));
      if (willShow && !state.mounted) {
        state.mounted = true;
        const { render: renderInline } = await import(`./${mountKey}-view.js`);
        state.cleanup = renderInline(section, { embedded: true }) ?? null;
      }
    });
    return state;
  }

  const wheelState = makeInlineToggle(wheelToggle, wheelSection, "wheel");
  const squadState = makeInlineToggle(squadToggle, squadSection, "squad");

  function persist() {
    saveV2State({
      lastLoadout: loadout,
      weaponHistory: engine.getWeaponHistory(),
      filters,
    });
  }

  async function publishToSquadIfActive() {
    if (!appStore.getState().squad.active) return;
    const { getSquadService } = await import("../services/squad-service.js");
    const result = {};
    if (loadout.map) result.Map = loadout.map.name;
    if (loadout.helmet) result.Helm = loadout.helmet.name;
    if (loadout.armor) result.Ruestung = loadout.armor.name;
    if (loadout.chestRig) result["Chest Rig"] = loadout.chestRig.name;
    if (loadout.backpack) result.Rucksack = loadout.backpack.name;
    if (loadout.primaryWeapon) result.Waffe = loadout.primaryWeapon.name;
    if (loadout.secondaryWeapon) result.Zweitwaffe = loadout.secondaryWeapon.name;
    getSquadService().publishMyResult(result);
  }

  function updateFilterChip() {
    filterChip.textContent = `Filter (${filters.selectedCategories.length}/${ALL_CATEGORY_KEYS.length})`;
  }

  filterChip.addEventListener("click", async () => {
    const { openFilterStudio } = await import("./filters-view.js");
    openFilterStudio({
      currentFilters: filters,
      onApply: (nextFilters) => {
        filters = nextFilters;
        for (const key of [...lockedKeys]) {
          if (!filters.selectedCategories.includes(key)) lockedKeys.delete(key);
        }
        updateFilterChip();
        runRoll(new Set(lockedKeys));
      },
    });
  });

  function setButtonsDisabled(disabled) {
    board
      .querySelectorAll("button")
      .forEach((btn) => (btn.disabled = disabled));
    spinBtn.disabled = disabled;
  }

  async function runRoll(lockSetForThisRoll) {
    if (phase === "spinning") return;
    phase = "spinning";
    spinningKeys = new Set(
      filters.selectedCategories.filter((key) => !lockSetForThisRoll.has(key)),
    );
    const previousLoadout = loadout;
    const result = engine.rollLoadout(loadout, lockSetForThisRoll, {
      filters,
      selectedCategories: filters.selectedCategories,
    });
    loadout = result.loadout;
    renderBoard(previousLoadout);
    board.classList.add("is-rolling");
    setButtonsDisabled(true);

    if (result.isZeroToHero) {
      playHeroSong();
    } else {
      stopHeroSong();
      playSpinSound(SPIN_DURATION_MS);
    }

    await new Promise((resolve) => setTimeout(resolve, SPIN_DURATION_MS));

    persist();
    publishToSquadIfActive();

    phase = "result";
    spinningKeys.clear();
    board.classList.remove("is-rolling");
    renderBoard();

    if (result.isZeroToHero) {
      stopSpinSound();
      playCrateRevealSound();
      await showEventOverlay({
        title: "0 to Hero",
        text: "Volle Wert-Ausrüstung ausgelost - alles auf eine Karte.",
        accent: "var(--color-danger)",
      });
    }

    phase = "idle";
    setButtonsDisabled(false);
  }

  function toggleLock(key) {
    if (lockedKeys.has(key)) {
      lockedKeys.delete(key);
    } else {
      lockedKeys.add(key);
    }
    renderBoard();
  }

  function rerollOne(key) {
    const singleLock = new Set(filters.selectedCategories);
    singleLock.delete(key);
    runRoll(singleLock);
  }

  function rerollAll() {
    runRoll(new Set(lockedKeys));
  }

  function buildLockButton(key) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn loadout-card-lock-btn";
    btn.setAttribute("aria-pressed", String(lockedKeys.has(key)));
    btn.setAttribute(
      "aria-label",
      lockedKeys.has(key) ? "Entsperren" : "Sperren",
    );
    btn.textContent = lockedKeys.has(key) ? "🔒" : "🔓";
    btn.addEventListener("click", () => toggleLock(key));
    return btn;
  }

  function buildRerollButton(key, label) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "icon-btn";
    btn.setAttribute("aria-label", `${label} neu würfeln`);
    btn.innerHTML = reloadIcon();
    btn.addEventListener("click", () => rerollOne(key));
    return btn;
  }

  function isSelected(key) {
    return filters.selectedCategories.includes(key);
  }

  function shuffledNames(items) {
    const names = [...new Set(items.map((item) => item?.name).filter(Boolean))];
    for (let index = names.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [names[index], names[swapIndex]] = [names[swapIndex], names[index]];
    }
    return names;
  }

  function animateSlotStrip(viewport, strip) {
    requestAnimationFrame(() => {
      const distance = Math.max(0, strip.scrollHeight - viewport.clientHeight);
      if (distance === 0) return;

      const startedAt = performance.now();
      function frame(now) {
        const elapsed = Math.min(1, (now - startedAt) / REEL_DURATION_MS);
        // Lang anlaufen, schnell durch den Pool laufen und weich einrasten.
        const progress =
          elapsed < 0.5
            ? 4 * elapsed * elapsed * elapsed
            : 1 - Math.pow(-2 * elapsed + 2, 3) / 2;
        strip.style.transform = `translate3d(0, ${-distance * Math.min(1, progress)}px, 0)`;
        strip.style.filter =
          elapsed > 0.08 && elapsed < 0.82 ? "blur(1.2px)" : "none";

        if (elapsed < 1 && strip.isConnected) {
          requestAnimationFrame(frame);
        } else {
          strip.style.transform = `translate3d(0, ${-distance}px, 0)`;
          strip.style.filter = "none";
        }
      }
      requestAnimationFrame(frame);
    });
  }

  function setSlotValue(element, key, previousItem, nextItem, shouldSpin) {
    const nextName = nextItem?.name ?? "-";
    element.classList.add("slot-reel");
    element.replaceChildren();

    const strip = document.createElement("span");
    strip.className = "slot-reel-strip";

    const names = shouldSpin
      ? [
          previousItem?.name ?? "-",
          ...shuffledNames(getRandomizerCandidates(key, filters)),
          nextName,
        ]
      : [nextName];

    names.forEach((name) => {
      const stop = document.createElement("span");
      stop.className = "slot-reel-stop";
      stop.textContent = name;
      strip.appendChild(stop);
    });
    element.appendChild(strip);

    if (shouldSpin) {
      animateSlotStrip(element, strip);
    }
  }

  function renderBoard(previousLoadout = null) {
    board.replaceChildren();
    updateFilterChip();

    if (filters.selectedCategories.length === 0) {
      const empty = document.createElement("p");
      empty.className = "randomizer-example-note";
      empty.textContent =
        "Keine Kategorie aktiv. Öffne Filter, um Kategorien zu aktivieren.";
      board.appendChild(empty);
      return;
    }

    if (isSelected("map")) {
      const stage = document.createElement("section");
      stage.className = "loadout-stage";
      stage.setAttribute("aria-label", "Map");
      const stageLabel = document.createElement("p");
      stageLabel.className = "loadout-stage-label";
      stageLabel.textContent = "Map";
      const stageValue = document.createElement("p");
      stageValue.className = "loadout-stage-value";
      setSlotValue(
        stageValue,
        "map",
        previousLoadout?.map,
        loadout.map,
        phase === "spinning" && spinningKeys.has("map"),
      );
      const stageReroll = document.createElement("div");
      stageReroll.className = "loadout-stage-reroll";
      stageReroll.append(
        buildLockButton("map"),
        buildRerollButton("map", "Map"),
      );
      stage.append(stageLabel, stageValue, stageReroll);
      board.appendChild(stage);
    }

    const activeEquipment = EQUIPMENT_KEYS.filter(isSelected);
    if (activeEquipment.length > 0) {
      const grid = document.createElement("div");
      grid.className = "loadout-grid";
      activeEquipment.forEach((key) => {
        const label = CARD_LABELS[key];
        const card = document.createElement("div");
        card.className = "loadout-card";
        if (lockedKeys.has(key)) card.classList.add("loadout-card--locked");

        const labelRow = document.createElement("div");
        labelRow.className = "loadout-card-label";
        const labelText = document.createElement("span");
        labelText.textContent = label;
        const actions = document.createElement("span");
        actions.append(buildRerollButton(key, label), buildLockButton(key));
        labelRow.append(labelText, actions);

        const value = document.createElement("p");
        value.className = "loadout-card-value";
        setSlotValue(
          value,
          key,
          previousLoadout?.[key],
          loadout[key],
          phase === "spinning" && spinningKeys.has(key),
        );

        card.append(labelRow, value);
        grid.appendChild(card);
      });
      board.appendChild(grid);
    }

    const activeWeapons = WEAPON_KEYS.filter(isSelected);
    if (activeWeapons.length > 0) {
      const weaponGrid = document.createElement("div");
      weaponGrid.className = "loadout-weapon-grid";
      activeWeapons.forEach((key) => {
        const label = WEAPON_LABELS[key];
        const item = loadout[key];
        const card = document.createElement("div");
        card.className = "loadout-card loadout-card--weapon";
        if (lockedKeys.has(key)) card.classList.add("loadout-card--locked");
        if (item) {
          card.style.setProperty(
            "--rarity-color",
            TIER_COLOR[getItemTier(item)],
          );
        }

        const labelRow = document.createElement("div");
        labelRow.className = "loadout-card-label";
        const labelText = document.createElement("span");
        labelText.textContent = label;
        const actions = document.createElement("span");
        actions.append(buildRerollButton(key, label), buildLockButton(key));
        labelRow.append(labelText, actions);

        const value = document.createElement("p");
        value.className = "loadout-card-value";
        setSlotValue(
          value,
          key,
          previousLoadout?.[key],
          item,
          phase === "spinning" && spinningKeys.has(key),
        );

        const rarity = document.createElement("span");
        rarity.className = "status-chip";
        if (item) {
          rarity.style.color = TIER_COLOR[getItemTier(item)];
          rarity.textContent = getItemResultLabel(item);
        }

        card.append(labelRow, value, rarity);
        weaponGrid.appendChild(card);
      });
      board.appendChild(weaponGrid);
    }
  }

  persist();
  renderBoard();

  return () => {
    wheelState.cleanup?.();
    squadState.cleanup?.();
  };
}
