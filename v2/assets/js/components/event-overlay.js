/* EventOverlay component (Planungs.md 6, 9): focus trap + focus return,
   Escape to close, single dialog style reused for every special event and
   for confirm dialogs (Squad kick/leader-transfer, GunGame reset). */

function openDialog({ title, text, accent, buttons }) {
  return new Promise((resolve) => {
    const previouslyFocused = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "event-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "eventOverlayTitle");
    if (accent) overlay.style.setProperty("--event-accent", accent);

    const modal = document.createElement("div");
    modal.className = "event-modal";

    const titleEl = document.createElement("p");
    titleEl.className = "event-modal-title";
    titleEl.id = "eventOverlayTitle";
    titleEl.textContent = title;

    const textEl = document.createElement("p");
    textEl.className = "event-modal-text";
    textEl.textContent = text;

    const actions = document.createElement("div");
    actions.className = "event-modal-actions";

    modal.append(titleEl, textEl, actions);
    overlay.appendChild(modal);

    function close(value) {
      document.removeEventListener("keydown", onKeydown);
      overlay.remove();
      previouslyFocused?.focus?.();
      resolve(value);
    }

    const buttonEls = buttons.map((buttonDef) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `btn ${buttonDef.variant}`;
      btn.textContent = buttonDef.label;
      btn.addEventListener("click", () => close(buttonDef.value));
      return btn;
    });
    actions.append(...buttonEls);

    function onKeydown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        close(buttons.find((b) => b.isCancel)?.value);
        return;
      }

      if (event.key !== "Tab") return;

      const first = buttonEls[0];
      const last = buttonEls[buttonEls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) {
        close(buttons.find((b) => b.isCancel)?.value);
      }
    });
    document.addEventListener("keydown", onKeydown);

    document.body.appendChild(overlay);
    buttonEls[buttonEls.length - 1].focus();
  });
}

export function showEventOverlay({ title, text, accent, confirmLabel = "OK" }) {
  return openDialog({
    title,
    text,
    accent,
    buttons: [{ label: confirmLabel, variant: "btn--primary", value: undefined }],
  });
}

/** Resolves true/false. Cancel (button, backdrop click, Escape) resolves false. */
export function showConfirmDialog({
  title,
  text,
  accent,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  danger = false,
}) {
  return openDialog({
    title,
    text,
    accent,
    buttons: [
      { label: cancelLabel, variant: "btn--ghost", value: false, isCancel: true },
      {
        label: confirmLabel,
        variant: danger ? "btn--danger" : "btn--primary",
        value: true,
      },
    ],
  });
}
