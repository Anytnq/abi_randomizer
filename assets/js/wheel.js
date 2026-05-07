const FALLBACK_VALUES = ["Mosin", "MP5", "AKM", "Knife", "Rat", "Rush"];

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

export function initializeWheelSpin() {
  const section = document.getElementById("wheelSection");
  const toggleButton = document.getElementById("wheelToggleBtn");
  const canvas = document.getElementById("wheelCanvas");
  const centerButton = document.getElementById("wheelCenterBtn");
  const valuesInput = document.getElementById("wheelValuesInput");
  const applyButton = document.getElementById("wheelApplyBtn");
  const countLabel = document.getElementById("wheelCount");
  const resultLabel = document.getElementById("wheelResult");
  const toggleIcon = toggleButton.querySelector(".wheel-check-icon");

  if (
    !section ||
    !toggleButton ||
    !canvas ||
    !centerButton ||
    !valuesInput ||
    !applyButton ||
    !countLabel ||
    !resultLabel
  ) {
    return;
  }

  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  const state = {
    values: [...FALLBACK_VALUES],
    currentRotation: 0,
    winnerIndex: -1,
    spinning: false,
  };

  valuesInput.value = state.values.join("\n");
  updateCountLabel(countLabel, state.values.length);
  drawWheel(context, canvas, state.values, state.winnerIndex);
  updateSpinAvailability(centerButton, state.values.length);
  section.hidden = true;
  updateWheelToggleState(toggleButton, toggleIcon, false);

  toggleButton.addEventListener("click", () => {
    const isHidden = section.hidden;
    section.hidden = !isHidden;
    updateWheelToggleState(toggleButton, toggleIcon, isHidden);
  });

  applyButton.addEventListener("click", () => {
    const nextValues = parseValues(valuesInput.value);

    if (nextValues.length < 2) {
      resultLabel.textContent =
        "Bitte mindestens 2 Werte eintragen, damit das Wheel drehen kann.";
      updateSpinAvailability(centerButton, nextValues.length);
      return;
    }

    state.values = nextValues;
    state.winnerIndex = -1;
    valuesInput.value = state.values.join("\n");
    updateCountLabel(countLabel, state.values.length);
    updateSpinAvailability(centerButton, state.values.length);
    resultLabel.textContent =
      "Werte aktualisiert. Klick auf die Mitte zum Drehen.";
    drawWheel(context, canvas, state.values, state.winnerIndex);
  });

  centerButton.addEventListener("click", () => {
    if (state.spinning || state.values.length < 2) {
      return;
    }

    spinWheel(state, canvas, centerButton, resultLabel, context);
  });
}

function updateWheelToggleState(button, icon, isActive) {
  button.setAttribute("aria-pressed", String(isActive));
  if (icon) {
    icon.textContent = isActive ? "☑" : "☐";
  }
}

function parseValues(rawInput) {
  return rawInput
    .split(/[,;\n\r]+/)
    .map((entry) => entry.trim())
    .filter(
      (entry, index, list) => entry.length > 0 && list.indexOf(entry) === index,
    )
    .slice(0, 32);
}

function updateCountLabel(label, count) {
  label.textContent = `${count} Werte`;
}

function updateSpinAvailability(button, valueCount) {
  button.disabled = valueCount < 2;
}

function spinWheel(state, canvas, centerButton, resultLabel, context) {
  state.spinning = true;
  centerButton.disabled = true;

  const segmentAngle = 360 / state.values.length;
  const winnerIndex = Math.floor(Math.random() * state.values.length);
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

    drawWheel(context, canvas, state.values, state.winnerIndex);
    resultLabel.innerHTML = `Auswahl: <strong>${escapeHtml(state.values[winnerIndex])}</strong>`;
    centerButton.disabled = false;
  };

  canvas.addEventListener("transitionend", onSpinEnd, { once: true });
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
