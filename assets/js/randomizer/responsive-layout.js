function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clearStyleProps(element, properties) {
  if (!element) {
    return;
  }

  properties.forEach((property) => {
    element.style.removeProperty(property);
  });
}

function clearDynamicLayoutStyles(nodes) {
  clearStyleProps(nodes.pageShell, [
    "grid-template-columns",
    "grid-template-areas",
  ]);
  clearStyleProps(nodes.controls, ["justify-self", "width", "margin-inline"]);
  clearStyleProps(nodes.spinButton, ["width", "max-width", "margin-inline"]);
  clearStyleProps(nodes.leftStack, [
    "justify-self",
    "width",
    "max-height",
    "overflow",
  ]);
  clearStyleProps(nodes.wheelSection, ["justify-self", "width", "max-width"]);
  clearStyleProps(nodes.filtersContainer, [
    "justify-self",
    "width",
    "max-width",
  ]);
  clearStyleProps(nodes.wheelBoard, ["width"]);
  clearStyleProps(nodes.wheelInputPanel, ["width", "margin-inline"]);
}

function applyDynamicCompactLayout(nodes) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isPortrait = viewportHeight >= viewportWidth;
  const isTallPortrait = isPortrait && viewportHeight >= 1600;
  const isDesktop = !isPortrait && viewportWidth >= 1200;

  nodes.controls.style.setProperty("justify-self", "center");
  nodes.controls.style.setProperty("margin-inline", "auto");
  nodes.spinButton.style.setProperty("margin-inline", "auto");
  nodes.spinButton.style.setProperty("width", "100%");
  nodes.spinButton.style.setProperty("max-width", "280px");

  if (isDesktop) {
    nodes.pageShell.style.setProperty(
      "grid-template-columns",
      "minmax(240px, 0.95fr) minmax(520px, 1.35fr) minmax(240px, 0.95fr)",
    );
    nodes.pageShell.style.setProperty(
      "grid-template-areas",
      '"header header header" "left slots wheel" ". controls ." "filters filters filters"',
    );

    nodes.leftStack.style.setProperty("max-height", "470px");
    nodes.leftStack.style.setProperty("overflow", "auto");
    return;
  }

  nodes.pageShell.style.setProperty("grid-template-columns", "minmax(0, 1fr)");
  nodes.pageShell.style.setProperty(
    "grid-template-areas",
    '"header" "slots" "controls" "left" "wheel" "filters"',
  );

  const contentWidth = isTallPortrait
    ? clamp(Math.round(viewportWidth * 0.72), 560, 780)
    : clamp(Math.round(viewportWidth * 0.86), 420, 680);

  const wheelSectionWidth = isTallPortrait
    ? clamp(Math.round(viewportWidth * 0.68), 420, 620)
    : clamp(Math.round(viewportWidth * 0.82), 360, 560);

  const wheelSize = isTallPortrait
    ? clamp(Math.round(viewportWidth * 0.22), 190, 240)
    : clamp(Math.round(viewportWidth * 0.3), 180, 250);

  const controlsWidth = isTallPortrait
    ? clamp(Math.round(viewportWidth * 0.46), 320, 420)
    : clamp(Math.round(viewportWidth * 0.68), 280, 380);

  nodes.controls.style.setProperty("width", `${controlsWidth}px`);
  nodes.leftStack.style.setProperty("justify-self", "center");
  nodes.leftStack.style.setProperty("width", `${contentWidth}px`);
  nodes.wheelSection.style.setProperty("justify-self", "center");
  nodes.wheelSection.style.setProperty("width", `${wheelSectionWidth}px`);
  nodes.wheelSection.style.setProperty("max-width", "100%");
  nodes.filtersContainer.style.setProperty("justify-self", "center");
  nodes.filtersContainer.style.setProperty("width", `${contentWidth}px`);
  nodes.filtersContainer.style.setProperty("max-width", "100%");
  nodes.wheelBoard.style.setProperty("width", `${wheelSize}px`);
  nodes.wheelInputPanel.style.setProperty("width", "min(100%, 520px)");
  nodes.wheelInputPanel.style.setProperty("margin-inline", "auto");
}

export function initializeResponsiveLayout() {
  const nodes = {
    body: document.body,
    pageShell: document.querySelector(".page-shell"),
    controls: document.querySelector(".controls"),
    spinButton: document.getElementById("spinBtn"),
    leftStack: document.getElementById("compactLeftStack"),
    wheelSection: document.getElementById("wheelSection"),
    filtersContainer: document.querySelector(".filters-container"),
    wheelBoard: document.querySelector(".wheel-board"),
    wheelInputPanel: document.querySelector(".wheel-input-panel"),
  };

  if (
    !nodes.body ||
    !nodes.pageShell ||
    !nodes.controls ||
    !nodes.spinButton ||
    !nodes.leftStack ||
    !nodes.wheelSection ||
    !nodes.filtersContainer ||
    !nodes.wheelBoard ||
    !nodes.wheelInputPanel
  ) {
    return;
  }

  let frameId = 0;
  const apply = () => {
    frameId = 0;

    if (!nodes.body.classList.contains("compact-mode")) {
      clearDynamicLayoutStyles(nodes);
      return;
    }

    applyDynamicCompactLayout(nodes);
  };

  const scheduleApply = () => {
    if (frameId !== 0) {
      return;
    }

    frameId = window.requestAnimationFrame(apply);
  };

  const observer = new MutationObserver(() => {
    scheduleApply();
  });

  observer.observe(nodes.body, {
    attributes: true,
    attributeFilter: ["class"],
  });

  window.addEventListener("resize", scheduleApply);
  window.addEventListener("orientationchange", scheduleApply);
  scheduleApply();
}
