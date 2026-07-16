/* Wheel View (Planungs.md 5.5) - own route, canvas only created here (only
   initialized while this view is open). Reuses v1's pure canvas-drawing and
   value-sanitizing helpers from randomizer/wheel.js (Planungs.md 3), not
   its DOM-coupled initializeWheelSpin - that part stays v1-only per the
   Phase 4 task "Wheel-Logik vom DOM entkoppeln". */

import {
  drawWheel,
  drawEmptyWheel,
  sanitizeSpinValues,
  buildSpinPayload,
  clampWinnerIndex,
  normalizeDegrees,
} from "../../../../assets/js/randomizer/wheel.js";
import { loadV2State, saveV2State } from "../core/storage.js";
import { appStore } from "../app/app-store.js";

const SPIN_DURATION_MS = 4800;

export function render(outlet, options = {}) {
  const { embedded = false } = options;
  const persisted = loadV2State();
  let manualValues = Array.isArray(persisted.wheelValues)
    ? persisted.wheelValues
    : [];
  let source = "manual";
  let currentRotation = 0;
  let winnerIndex = -1;
  let spinning = false;

  const header = document.createElement("div");
  header.className = "randomizer-view-header";
  const headingTag = embedded ? "h2" : "h1";
  header.innerHTML = `<${headingTag} class="randomizer-view-title">Wheel</${headingTag}>`;

  const sourceRow = document.createElement("div");
  sourceRow.className = "wheel-source-row";

  const manualBtn = document.createElement("button");
  manualBtn.type = "button";
  manualBtn.className = "btn btn--secondary";
  manualBtn.textContent = "Eigene Werte";

  const squadBtn = document.createElement("button");
  squadBtn.type = "button";
  squadBtn.className = "btn btn--secondary";
  squadBtn.textContent = "Squad";

  sourceRow.append(manualBtn, squadBtn);

  const layout = document.createElement("div");
  layout.className = "wheel-layout";

  const board = document.createElement("div");
  board.className = "wheel-board";
  const canvas = document.createElement("canvas");
  canvas.width = 480;
  canvas.height = 480;
  canvas.className = "wheel-canvas";
  canvas.setAttribute("aria-label", "Wheel Spin Auswahl");
  board.appendChild(canvas);

  const spinBtn = document.createElement("button");
  spinBtn.type = "button";
  spinBtn.className = "btn btn--primary btn--lg wheel-spin-btn";
  spinBtn.textContent = "Spin";
  board.appendChild(spinBtn);

  const resultText = document.createElement("p");
  resultText.className = "wheel-result-text";
  resultText.setAttribute("role", "status");
  resultText.setAttribute("aria-live", "polite");

  const sidePanel = document.createElement("div");
  sidePanel.className = "wheel-side-panel";

  layout.append(board, sidePanel);
  outlet.append(header, sourceRow, layout, resultText);

  const context = canvas.getContext("2d");

  function getActiveValues() {
    if (source === "squad") {
      return sanitizeSpinValues(appStore.getState().squad.mapValues ?? []);
    }
    return sanitizeSpinValues(manualValues);
  }

  function persistManualValues() {
    saveV2State({ wheelValues: manualValues });
  }

  function renderSidePanel() {
    sidePanel.replaceChildren();

    if (source === "squad") {
      const squad = appStore.getState().squad;
      const info = document.createElement("p");
      info.className = "wheel-side-hint";
      info.textContent = squad.active
        ? `Squad-Werte: ${squad.mapValues.length} Map-Ergebnisse.`
        : "Kein aktiver Squad. Wechsle zu Squad Command Center, um beizutreten.";
      sidePanel.appendChild(info);
      return;
    }

    const heading = document.createElement("h2");
    heading.textContent = `Teilnehmer (${manualValues.length})`;
    heading.className = "wheel-side-heading";
    sidePanel.appendChild(heading);

    const chipList = document.createElement("div");
    chipList.className = "wheel-chip-list";
    manualValues.forEach((value, index) => {
      const chip = document.createElement("span");
      chip.className = "wheel-chip";
      const label = document.createElement("span");
      label.textContent = value;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.className = "wheel-chip-remove";
      removeBtn.setAttribute("aria-label", `${value} entfernen`);
      removeBtn.textContent = "✕";
      removeBtn.addEventListener("click", () => {
        manualValues = manualValues.filter((_, i) => i !== index);
        persistManualValues();
        renderAll();
      });
      chip.append(label, removeBtn);
      chipList.appendChild(chip);
    });
    sidePanel.appendChild(chipList);

    const addRow = document.createElement("form");
    addRow.className = "wheel-add-row";
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Wert hinzufügen...";
    input.setAttribute("aria-label", "Neuen Wert hinzufügen");
    input.maxLength = 40;
    const addBtn = document.createElement("button");
    addBtn.type = "submit";
    addBtn.className = "btn btn--secondary";
    addBtn.textContent = "Hinzufügen";
    addRow.append(input, addBtn);
    addRow.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value || manualValues.length >= 32) return;
      manualValues = [...manualValues, value];
      persistManualValues();
      renderAll();
    });
    sidePanel.appendChild(addRow);
  }

  function renderCanvas() {
    const values = getActiveValues();
    if (values.length === 0) {
      drawEmptyWheel(context, canvas, "Keine Werte");
    } else {
      drawWheel(context, canvas, values, winnerIndex);
    }
    spinBtn.disabled = values.length < 2 || spinning;
  }

  function renderSourceButtons() {
    manualBtn.setAttribute("aria-pressed", String(source === "manual"));
    squadBtn.setAttribute("aria-pressed", String(source === "squad"));
    manualBtn.className =
      "btn " + (source === "manual" ? "btn--primary" : "btn--secondary");
    squadBtn.className =
      "btn " + (source === "squad" ? "btn--primary" : "btn--secondary");
  }

  function renderAll() {
    renderSourceButtons();
    renderSidePanel();
    renderCanvas();
    if (!spinning) {
      const values = getActiveValues();
      resultText.textContent =
        values.length < 2
          ? "Mindestens 2 Werte für einen Spin nötig."
          : "Klicke auf Spin.";
    }
  }

  manualBtn.addEventListener("click", () => {
    source = "manual";
    winnerIndex = -1;
    renderAll();
  });

  squadBtn.addEventListener("click", () => {
    source = "squad";
    winnerIndex = -1;
    renderAll();
  });

  spinBtn.addEventListener("click", () => {
    if (spinning) return;
    const values = getActiveValues();
    const payload = buildSpinPayload(values);
    if (!payload) return;

    spinning = true;
    spinBtn.disabled = true;
    manualBtn.disabled = true;
    squadBtn.disabled = true;
    resultText.textContent = "Dreht...";

    const targetWinnerIndex = clampWinnerIndex(
      payload.winnerIndex,
      values.length,
    );
    const segmentAngle = 360 / values.length;
    const winnerCenterFromTop =
      targetWinnerIndex * segmentAngle + segmentAngle / 2;
    const desiredModulo = (360 - (winnerCenterFromTop % 360)) % 360;
    const currentModulo = normalizeDegrees(currentRotation);
    const deltaToTarget = (desiredModulo - currentModulo + 360) % 360;
    const targetRotation = currentRotation + 1800 + deltaToTarget;

    canvas.style.transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.12, 0.85, 0.2, 1)`;
    canvas.style.transform = `rotate(${targetRotation}deg)`;

    const onEnd = () => {
      canvas.removeEventListener("transitionend", onEnd);
      currentRotation = targetRotation;
      winnerIndex = targetWinnerIndex;
      spinning = false;
      manualBtn.disabled = false;
      squadBtn.disabled = false;
      renderCanvas();
      resultText.innerHTML = `Auswahl: <strong>${values[targetWinnerIndex]}</strong>`;
    };
    canvas.addEventListener("transitionend", onEnd, { once: true });
  });

  const unsubscribe = appStore.subscribe(() => {
    if (source === "squad") renderAll();
  });

  renderAll();
  return unsubscribe;
}
