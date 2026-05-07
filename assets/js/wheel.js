const SEGMENT_COLORS = [
  "#295780",
  "#325f39",
  "#6a3a35",
  "#5f4a27",
  "#4a356e",
  "#23656a",
  "#6a4b21",
  "#3b4866",
  "#5f3131",
  "#2d5a4d",
];

export function initializeWheelSpin(options = {}) {
  const section = document.getElementById("wheelSection");
  const toggleButton = document.getElementById("wheelToggleBtn");
  const canvas = document.getElementById("wheelCanvas");
  const centerButton = document.getElementById("wheelCenterBtn");
  const valuesInput = document.getElementById("wheelValuesInput");
  const applyButton = document.getElementById("wheelApplyBtn");
  const countLabel = document.getElementById("wheelCount");
  const resultLabel = document.getElementById("wheelResult");
  const toggleIcon = toggleButton?.querySelector(".wheel-check-icon");
  const manualToggleButton = document.getElementById("wheelManualToggleBtn");
  const sourceNote = document.getElementById("wheelSourceNote");

  if (
    !section ||
    !toggleButton ||
    !canvas ||
    !centerButton ||
    !valuesInput ||
    !applyButton ||
    !countLabel ||
    !resultLabel ||
    !manualToggleButton ||
    !sourceNote
  ) {
    return createNoopController();
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return createNoopController();
  }

  const callbacks = {
    onToggle: options.onToggle ?? (() => {}),
    onManualModeChange: options.onManualModeChange ?? (() => {}),
    onManualValuesChange: options.onManualValuesChange ?? (() => {}),
    onSpinRequest: options.onSpinRequest ?? (() => {}),
  };

  const state = {
    enabled: false,
    squadActive: false,
    isLeader: false,
    manualMode: false,
    manualValuesText: "",
    autoValues: [],
    displayValues: [],
    currentRotation: 0,
    winnerIndex: -1,
    spinning: false,
    lastSpinId: null,
  };

  valuesInput.value = state.manualValuesText;
  section.hidden = true;

  toggleButton.addEventListener("click", () => {
    if (state.squadActive) {
      return;
    }

    state.enabled = !state.enabled;
    syncUi();
    callbacks.onToggle(state.enabled);
  });

  manualToggleButton.addEventListener("click", () => {
    if (!canEditManualList(state)) {
      return;
    }

    state.manualMode = !state.manualMode;
    state.winnerIndex = -1;
    refreshDisplayValues();
    syncUi();
    callbacks.onManualModeChange(getConfigSnapshot(state));
  });

  applyButton.addEventListener("click", () => {
    if (!canEditManualList(state) || !state.manualMode) {
      syncUi();
      return;
    }

    state.manualValuesText = valuesInput.value;
    state.winnerIndex = -1;
    refreshDisplayValues();
    syncUi();
    callbacks.onManualValuesChange(getConfigSnapshot(state));
  });

  centerButton.addEventListener("click", () => {
    if (state.spinning || state.displayValues.length < 2) {
      return;
    }

    const spinPayload = buildSpinPayload(state.displayValues);
    if (!spinPayload) {
      return;
    }

    if (state.squadActive) {
      resultLabel.textContent = "Wheel wird im Squad synchronisiert...";
      callbacks.onSpinRequest(spinPayload);
      return;
    }

    playSpin(spinPayload);
  });

  refreshDisplayValues();
  syncUi();

  function refreshDisplayValues() {
    if (state.squadActive && !state.manualMode) {
      state.displayValues = sanitizeSpinValues(state.autoValues);
    } else {
      state.displayValues = parseManualValues(state.manualValuesText);
    }

    if (state.winnerIndex >= state.displayValues.length) {
      state.winnerIndex = -1;
    }

    drawCurrentWheel();
  }

  function drawCurrentWheel() {
    if (state.displayValues.length === 0) {
      drawEmptyWheel(context, canvas, "Noch keine Maps verfugbar");
      return;
    }

    drawWheel(context, canvas, state.displayValues, state.winnerIndex);
  }

  function syncUi() {
    section.hidden = !state.enabled;
    toggleButton.disabled = state.squadActive;
    updateWheelToggleState(toggleButton, toggleIcon, state.enabled);

    manualToggleButton.setAttribute("aria-pressed", String(state.manualMode));
    manualToggleButton.disabled = !canEditManualList(state);

    const canEditManualValues = canEditManualList(state) && state.manualMode;

    valuesInput.disabled = !canEditManualValues;
    applyButton.disabled = !canEditManualValues;
    updateCountLabel(countLabel, state.displayValues.length);
    centerButton.disabled = state.displayValues.length < 2 || state.spinning;
    sourceNote.textContent = buildSourceNote(state);

    if (!state.spinning) {
      resultLabel.textContent = buildResultHint(state);
    }
  }

  function playSpin(spinPayload) {
    if (!spinPayload || state.spinning) {
      return;
    }

    const values = sanitizeSpinValues(spinPayload.values);
    if (values.length < 2) {
      return;
    }

    state.lastSpinId = spinPayload.spinId ?? state.lastSpinId;
    state.spinning = true;
    state.enabled = true;
    state.displayValues = values;
    state.winnerIndex = -1;
    drawWheel(context, canvas, state.displayValues, -1);
    syncUi();

    const winnerIndex = clampWinnerIndex(
      spinPayload.winnerIndex,
      values.length,
    );
    const segmentAngle = 360 / values.length;
    const winnerCenterFromTop = winnerIndex * segmentAngle + segmentAngle / 2;
    const desiredModulo = (360 - (winnerCenterFromTop % 360)) % 360;
    const currentModulo = normalizeDegrees(state.currentRotation);
    const deltaToTarget = (desiredModulo - currentModulo + 360) % 360;
    const targetRotation = state.currentRotation + 1800 + deltaToTarget;

    resultLabel.textContent = "Dreht...";
    canvas.classList.add("spinning");
    canvas.style.transition = "transform 4.8s cubic-bezier(0.12, 0.85, 0.2, 1)";
    canvas.style.transform = `rotate(${targetRotation}deg)`;

    const onSpinEnd = () => {
      canvas.removeEventListener("transitionend", onSpinEnd);
      canvas.classList.remove("spinning");

      state.currentRotation = targetRotation;
      state.winnerIndex = winnerIndex;
      state.spinning = false;

      drawWheel(context, canvas, state.displayValues, state.winnerIndex);
      resultLabel.innerHTML = `Auswahl: <strong>${escapeHtml(
        state.displayValues[winnerIndex],
      )}</strong>`;
      centerButton.disabled = state.displayValues.length < 2;
    };

    canvas.addEventListener("transitionend", onSpinEnd, { once: true });
  }

  return {
    setSquadContext({ active, isLeader }) {
      state.squadActive = active;
      state.isLeader = isLeader;

      if (active) {
        state.enabled = true;
      } else {
        state.enabled = false;
        state.manualMode = false;
        state.winnerIndex = -1;
      }

      refreshDisplayValues();
      syncUi();
    },

    applySquadConfig(config = {}) {
      if (typeof config.manualMode === "boolean") {
        state.manualMode = config.manualMode;
      }

      if (typeof config.manualValuesText === "string") {
        state.manualValuesText = config.manualValuesText;
        valuesInput.value = state.manualValuesText;
      }

      if (!state.squadActive && typeof config.enabled === "boolean") {
        state.enabled = config.enabled;
      }

      refreshDisplayValues();
      syncUi();
    },

    setAutoValues(values) {
      state.autoValues = Array.isArray(values)
        ? sanitizeSpinValues(values)
        : [];
      refreshDisplayValues();
      syncUi();
    },

    applyRemoteSpin(spinPayload) {
      if (!spinPayload?.spinId || spinPayload.spinId === state.lastSpinId) {
        return;
      }

      if (state.squadActive && Array.isArray(spinPayload.values)) {
        state.manualValuesText = sanitizeSpinValues(spinPayload.values).join(
          "\n",
        );
        valuesInput.value = state.manualValuesText;
      }

      state.lastSpinId = spinPayload.spinId;
      playSpin(spinPayload);
    },

    getConfigSnapshot() {
      return getConfigSnapshot(state);
    },
  };
}

function createNoopController() {
  return {
    setSquadContext() {},
    applySquadConfig() {},
    setAutoValues() {},
    applyRemoteSpin() {},
    getConfigSnapshot() {
      return { enabled: false, manualMode: false, manualValuesText: "" };
    },
  };
}

function getConfigSnapshot(state) {
  return {
    enabled: state.squadActive ? true : state.enabled,
    manualMode: state.manualMode,
    manualValuesText: state.manualValuesText,
  };
}

function buildSpinPayload(values) {
  const sanitizedValues = sanitizeSpinValues(values);
  if (sanitizedValues.length < 2) {
    return null;
  }

  return {
    spinId: `${Date.now()}-${crypto.randomUUID()}`,
    values: sanitizedValues,
    winnerIndex: Math.floor(Math.random() * sanitizedValues.length),
  };
}

function parseManualValues(rawInput) {
  const uniqueValues = new Set();

  rawInput
    .split(/[,;\n\r]+/)
    .map((entry) => entry.trim())
    .forEach((entry) => {
      if (entry.length > 0) {
        uniqueValues.add(entry);
      }
    });

  return Array.from(uniqueValues).slice(0, 32);
}

function sanitizeSpinValues(values) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter((value) => value.length > 0)
    .slice(0, 64);
}

function buildSourceNote(state) {
  if (state.squadActive && !state.manualMode) {
    return state.isLeader
      ? "Auto: Squad Maps"
      : "Auto: Squad Maps | alle durfen spinnen";
  }

  if (state.squadActive && state.manualMode) {
    return state.isLeader
      ? "Manuell: Leader steuert"
      : "Manuell: Leader Vorgabe";
  }

  return "Lokale Werte aktiv";
}

function canEditManualList(state) {
  return !state.squadActive || state.isLeader;
}

function buildResultHint(state) {
  if (
    state.squadActive &&
    !state.manualMode &&
    state.displayValues.length === 0
  ) {
    return "Wheel bleibt leer, bis alle Squad-Mitglieder eine Map gedreht haben.";
  }

  if (state.displayValues.length < 2) {
    return "Mindestens 2 Werte fur einen Spin erforderlich.";
  }

  if (state.squadActive) {
    return "Wheel bereit fur Squad-Spin.";
  }

  return "Klicke auf die Mitte vom Wheel.";
}

function updateWheelToggleState(button, icon, isActive) {
  button.setAttribute("aria-pressed", String(isActive));
  if (icon) {
    icon.textContent = isActive ? "☑" : "☐";
  }
}

function updateCountLabel(label, count) {
  label.textContent = `${count} Werte`;
}

function clampWinnerIndex(winnerIndex, length) {
  if (!Number.isInteger(winnerIndex) || length <= 0) {
    return 0;
  }

  return Math.min(length - 1, Math.max(0, winnerIndex));
}

function drawEmptyWheel(context, canvas, label) {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 10;

  context.clearRect(0, 0, size, size);
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.fillStyle = "#1a212a";
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = "#e1b85d";
  context.stroke();

  context.fillStyle = "#d9e5ef";
  context.font = "700 28px Rajdhani";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, center, center);
}

function drawWheel(context, canvas, values, winnerIndex) {
  const size = canvas.width;
  const center = size / 2;
  const radius = center - 10;
  const segmentAngle = (Math.PI * 2) / values.length;

  context.clearRect(0, 0, size, size);

  for (let index = 0; index < values.length; index += 1) {
    const startAngle = -Math.PI / 2 + index * segmentAngle;
    const endAngle = startAngle + segmentAngle;
    const isWinner = index === winnerIndex;

    context.beginPath();
    context.moveTo(center, center);
    context.arc(center, center, radius, startAngle, endAngle);
    context.closePath();
    context.fillStyle = pickColor(index, isWinner);
    context.fill();

    context.lineWidth = isWinner ? 3 : 1.2;
    context.strokeStyle = isWinner ? "#ffe39a" : "#ffffff4d";
    context.stroke();

    drawSegmentText(
      context,
      values[index],
      center,
      radius,
      startAngle,
      segmentAngle,
    );
  }

  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.lineWidth = 4;
  context.strokeStyle = "#e1b85d";
  context.stroke();
}

function drawSegmentText(
  context,
  text,
  center,
  radius,
  startAngle,
  segmentAngle,
) {
  const safeText = text.slice(0, 18);
  const angle = startAngle + segmentAngle / 2;

  context.save();
  context.translate(center, center);
  context.rotate(angle);
  context.textAlign = "right";
  context.fillStyle = "#f5f8fb";
  context.font = "700 20px Rajdhani";
  context.shadowColor = "#000000aa";
  context.shadowBlur = 4;
  context.fillText(safeText, radius - 24, 7);
  context.restore();
}

function pickColor(index, isWinner) {
  if (isWinner) {
    return "#bf8b2f";
  }

  return SEGMENT_COLORS[index % SEGMENT_COLORS.length];
}

function normalizeDegrees(value) {
  return ((value % 360) + 360) % 360;
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
