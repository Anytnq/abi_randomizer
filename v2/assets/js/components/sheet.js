/* Sheet / Drawer component (Planungs.md 6, 9): focus trap across all
   focusable children, focus return to trigger, Escape to close. */

function getFocusable(container) {
  return Array.from(
    container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function openSheet({ title, buildBody, buildFooter }) {
  const previouslyFocused = document.activeElement;

  const overlay = document.createElement("div");
  overlay.className = "sheet-overlay";

  const panel = document.createElement("div");
  panel.className = "sheet-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-labelledby", "sheetTitle");
  panel.tabIndex = -1;

  const header = document.createElement("div");
  header.className = "sheet-header";
  const titleEl = document.createElement("h2");
  titleEl.className = "sheet-title";
  titleEl.id = "sheetTitle";
  titleEl.textContent = title;
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "icon-btn";
  closeBtn.setAttribute("aria-label", "Schließen");
  closeBtn.textContent = "✕";
  header.append(titleEl, closeBtn);

  const body = document.createElement("div");
  body.className = "sheet-body";

  const footer = document.createElement("div");
  footer.className = "sheet-footer";

  panel.append(header, body, footer);
  overlay.appendChild(panel);

  function close() {
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
    previouslyFocused?.focus?.();
  }

  function onKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;

    const focusable = getFocusable(panel);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  closeBtn.addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKeydown);

  document.body.appendChild(overlay);

  const controller = { close, bodyEl: body, footerEl: footer };
  buildBody?.(body, controller);
  buildFooter?.(footer, controller);

  const focusable = getFocusable(panel);
  (focusable[0] ?? panel).focus?.();

  return controller;
}
