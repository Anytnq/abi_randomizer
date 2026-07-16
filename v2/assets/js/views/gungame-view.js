/* GunGame View (Planungs.md 5.7): Setup Wizard before a route exists, then
   a full Run View - current weapon in focus, prev/next as context, route as
   a vertical Timeline. Squad reuses the same Squad Command Center route. */

import {
  createGunGameEngine,
  DEFAULT_STAGES,
  DEFAULT_UPGRADE_CHANCE_PERCENT,
  MIN_STAGES,
  MAX_STAGES,
} from "../core/gungame-engine.js";
import { showConfirmDialog } from "../components/event-overlay.js";
import { appStore } from "../app/app-store.js";

export function render(outlet) {
  const engine = createGunGameEngine();
  let upgradeChance = DEFAULT_UPGRADE_CHANCE_PERCENT;
  let lastMessage =
    "Schließe einen Raid ab, um auf die nächste Stufe zu gelangen.";

  const header = document.createElement("div");
  header.className = "randomizer-view-header";
  const title = document.createElement("h1");
  title.className = "randomizer-view-title";
  title.textContent = "GunGame";
  const squadLink = document.createElement("a");
  squadLink.className = "btn btn--secondary";
  squadLink.href = "#/squad";
  squadLink.textContent = "Squad";
  header.append(title, squadLink);

  const content = document.createElement("div");
  content.className = "gungame-content-wrap";

  outlet.append(header, content);

  async function publishToSquadIfActive() {
    if (!appStore.getState().squad.active) return;
    const state = engine.getState();
    const current = state.route[state.currentIndex] ?? null;
    const { getSquadService } = await import("../services/squad-service.js");
    getSquadService().publishMyResult({
      Stufe: `${Math.min(state.currentIndex + 1, state.route.length)} / ${state.route.length}`,
      Waffe: current?.name ?? "-",
    });
  }

  function renderSetup() {
    content.replaceChildren();

    const card = document.createElement("div");
    card.className = "card card-body gungame-setup-card";

    const stageLabel = document.createElement("label");
    stageLabel.className = "squad-field-label";
    stageLabel.textContent = "Anzahl Waffenstufen";
    const stageInput = document.createElement("input");
    stageInput.type = "number";
    stageInput.min = String(MIN_STAGES);
    stageInput.max = String(MAX_STAGES);
    stageInput.value = String(DEFAULT_STAGES);
    stageInput.className = "squad-text-input";
    stageLabel.appendChild(stageInput);

    const chanceLabel = document.createElement("label");
    chanceLabel.className = "squad-field-label";
    chanceLabel.textContent = "Upgrade-Chance (%)";
    const chanceInput = document.createElement("input");
    chanceInput.type = "number";
    chanceInput.min = "0";
    chanceInput.max = "100";
    chanceInput.value = String(DEFAULT_UPGRADE_CHANCE_PERCENT);
    chanceInput.className = "squad-text-input";
    chanceLabel.appendChild(chanceInput);

    const startBtn = document.createElement("button");
    startBtn.type = "button";
    startBtn.className = "btn btn--primary btn--lg";
    startBtn.textContent = "Route generieren";
    startBtn.addEventListener("click", () => {
      const stageCount =
        Number.parseInt(stageInput.value, 10) || DEFAULT_STAGES;
      upgradeChance =
        Number.parseInt(chanceInput.value, 10) ??
        DEFAULT_UPGRADE_CHANCE_PERCENT;
      engine.regenerate(stageCount);
      lastMessage =
        "Neue Route generiert. Schließe einen Raid ab, um auf die nächste Stufe zu gelangen.";
      publishToSquadIfActive();
      renderRun();
    });

    card.append(stageLabel, chanceLabel, startBtn);
    content.appendChild(card);
  }

  function renderRun() {
    content.replaceChildren();

    const state = engine.getState();
    const total = state.route.length;
    const current = state.route[state.currentIndex];
    const prev = state.route[state.currentIndex - 1];
    const next = state.route[state.currentIndex + 1];

    const focusCard = document.createElement("section");
    focusCard.className = "gungame-focus-card";
    focusCard.innerHTML = `
      <p class="loadout-stage-label">Stufe ${state.currentIndex + 1} / ${total}</p>
      <p class="gungame-focus-weapon">${current?.name ?? "-"}</p>
      <p class="gungame-focus-meta">${current?.category ?? ""} · Wert ${current?.value ?? "-"}</p>
    `;

    const contextRow = document.createElement("div");
    contextRow.className = "gungame-context-row";
    contextRow.innerHTML = `
      <span class="gungame-context-item">${prev ? `Zuvor: ${prev.name}` : ""}</span>
      <span class="gungame-context-item">${next ? `Danach: ${next.name}` : ""}</span>
    `;

    const messageText = document.createElement("p");
    messageText.className = "gungame-message";
    messageText.setAttribute("role", "status");
    messageText.setAttribute("aria-live", "polite");
    messageText.textContent = lastMessage;

    const actionsRow = document.createElement("div");
    actionsRow.className = "loadout-actions gungame-actions-row";

    const raidBtn = document.createElement("button");
    raidBtn.type = "button";
    raidBtn.className = "btn btn--primary btn--lg";
    raidBtn.textContent = "Raid abgeschlossen";
    raidBtn.disabled = total === 0;
    raidBtn.addEventListener("click", () => {
      const result = engine.completeRaid(upgradeChance);
      if (!result) return;
      lastMessage = result.message;
      publishToSquadIfActive();
      renderRun();
    });

    const prevBtn = document.createElement("button");
    prevBtn.type = "button";
    prevBtn.className = "btn btn--secondary";
    prevBtn.textContent = "Zurück";
    prevBtn.disabled = state.currentIndex <= 0;
    prevBtn.addEventListener("click", () => {
      engine.moveToPrevious();
      publishToSquadIfActive();
      renderRun();
    });

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn btn--secondary";
    nextBtn.textContent = "Weiter";
    nextBtn.disabled = state.currentIndex >= total - 1;
    nextBtn.addEventListener("click", () => {
      engine.moveToNext();
      publishToSquadIfActive();
      renderRun();
    });

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "btn btn--ghost";
    resetBtn.textContent = "Reset";
    resetBtn.addEventListener("click", async () => {
      if (state.currentIndex > 0) {
        const confirmed = await showConfirmDialog({
          title: "Fortschritt zurücksetzen",
          text: "Der aktuelle Run-Fortschritt geht verloren. Wirklich zurücksetzen?",
          confirmLabel: "Zurücksetzen",
          danger: true,
        });
        if (!confirmed) return;
      }
      engine.reset();
      lastMessage =
        "Fortschritt zurückgesetzt. Schließe einen Raid ab, um Upgrade-Chancen zu nutzen.";
      publishToSquadIfActive();
      renderRun();
    });

    const newRouteBtn = document.createElement("button");
    newRouteBtn.type = "button";
    newRouteBtn.className = "btn btn--ghost";
    newRouteBtn.textContent = "Neue Route";
    newRouteBtn.addEventListener("click", () => renderSetup());

    actionsRow.append(raidBtn, prevBtn, nextBtn, resetBtn, newRouteBtn);

    const timeline = document.createElement("ol");
    timeline.className = "gungame-timeline";
    state.route.forEach((entry, index) => {
      const item = document.createElement("li");
      item.className = "gungame-timeline-item";
      if (index < state.currentIndex) item.classList.add("is-done");
      if (index === state.currentIndex) item.classList.add("is-current");
      item.innerHTML = `
        <span class="gungame-timeline-step">${entry.step}</span>
        <span class="gungame-timeline-weapon">${entry.name}</span>
        <span class="status-chip">${entry.category}</span>
        <span class="status-chip">Wert ${entry.value}</span>
      `;
      timeline.appendChild(item);
    });

    content.append(focusCard, contextRow, messageText, actionsRow, timeline);
  }

  renderSetup();
  return null;
}
