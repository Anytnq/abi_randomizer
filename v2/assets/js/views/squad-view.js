/* Squad Command Center (Planungs.md 5.6). Embedded inline in the Randomizer
   view and also reachable as its own /squad route (e.g. from GunGame) -
   same module either way. Firebase loads only now, via this view's dynamic
   import of squad-service.js (Planungs.md 8). */

import { getSquadService } from "../services/squad-service.js";
import { showConfirmDialog } from "../components/event-overlay.js";

export function render(outlet, options = {}) {
  const { embedded = false } = options;
  const service = getSquadService();
  let unsubscribeListener = null;

  const header = document.createElement("div");
  header.className = "randomizer-view-header";
  const headingTag = embedded ? "h2" : "h1";
  header.innerHTML = `<${headingTag} class="randomizer-view-title">Squad</${headingTag}>`;

  const content = document.createElement("div");
  content.className = "squad-content-wrap";

  outlet.append(header, content);

  function renderStartScreen() {
    content.replaceChildren();

    const card = document.createElement("div");
    card.className = "card card-body squad-start-card";

    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Dein Name";
    nameLabel.className = "squad-field-label";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 20;
    nameInput.className = "squad-text-input";
    nameInput.placeholder = "z.B. Nachtjaeger";
    nameLabel.appendChild(nameInput);

    const errorText = document.createElement("p");
    errorText.className = "squad-error-text";
    errorText.hidden = true;

    const createBtn = document.createElement("button");
    createBtn.type = "button";
    createBtn.className = "btn btn--primary";
    createBtn.textContent = "Squad erstellen";

    const joinRow = document.createElement("div");
    joinRow.className = "squad-join-row";
    const codeInput = document.createElement("input");
    codeInput.type = "text";
    codeInput.maxLength = 2;
    codeInput.className = "squad-text-input squad-code-input";
    codeInput.placeholder = "Code";
    const joinBtn = document.createElement("button");
    joinBtn.type = "button";
    joinBtn.className = "btn btn--secondary";
    joinBtn.textContent = "Beitreten";
    joinRow.append(codeInput, joinBtn);

    function requireName() {
      const name = nameInput.value.trim();
      if (!name) {
        errorText.textContent = "Bitte einen Namen eingeben.";
        errorText.hidden = false;
        nameInput.focus();
        return null;
      }
      errorText.hidden = true;
      return name;
    }

    createBtn.addEventListener("click", async () => {
      const name = requireName();
      if (!name) return;
      createBtn.disabled = true;
      createBtn.textContent = "Wird erstellt...";
      try {
        await service.create(name, [
          "map",
          "primaryWeapon",
          "secondaryWeapon",
        ]);
        renderSession();
      } catch {
        errorText.textContent = "Squad konnte nicht erstellt werden.";
        errorText.hidden = false;
        createBtn.disabled = false;
        createBtn.textContent = "Squad erstellen";
      }
    });

    joinBtn.addEventListener("click", () => {
      const name = requireName();
      if (!name) return;
      const code = codeInput.value.trim().toUpperCase();
      if (code.length < 2) {
        errorText.textContent = "Bitte einen gültigen Code eingeben.";
        errorText.hidden = false;
        return;
      }
      service.join(code, name, () => {
        errorText.textContent = "Session nicht gefunden oder abgelaufen.";
        errorText.hidden = false;
      });
      renderSession();
    });

    card.append(nameLabel, createBtn, joinRow, errorText);
    content.appendChild(card);
  }

  function renderSession() {
    content.replaceChildren();

    const snapshot = service.getSnapshot();
    const dashboard = document.createElement("div");
    dashboard.className = "squad-dashboard";

    const codeCard = document.createElement("div");
    codeCard.className = "card card-body squad-code-card";
    const codeLabel = document.createElement("p");
    codeLabel.className = "squad-field-label";
    codeLabel.textContent = "Session Code";
    const codeValue = document.createElement("p");
    codeValue.className = "squad-code-value";
    codeValue.textContent = snapshot?.code ?? "-";
    codeCard.append(codeLabel, codeValue);
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "btn btn--secondary";
    copyBtn.textContent = "Kopieren";
    copyBtn.addEventListener("click", () => {
      const currentCode = service.getSnapshot()?.code ?? "";
      navigator.clipboard?.writeText(currentCode).then(() => {
        copyBtn.textContent = "Kopiert";
        setTimeout(() => (copyBtn.textContent = "Kopieren"), 1500);
      });
    });
    codeCard.appendChild(copyBtn);

    const leaveBtn = document.createElement("button");
    leaveBtn.type = "button";
    leaveBtn.className = "btn btn--ghost";
    leaveBtn.textContent = "Squad verlassen";
    leaveBtn.addEventListener("click", () => {
      service.leave();
      renderStartScreen();
    });
    codeCard.appendChild(leaveBtn);

    const membersCard = document.createElement("div");
    membersCard.className = "card card-body squad-members-card";
    const membersHeading = document.createElement("h2");
    membersHeading.className = "wheel-side-heading";
    membersHeading.textContent = "Mitglieder";
    membersCard.appendChild(membersHeading);

    const membersList = document.createElement("div");
    membersList.className = "squad-member-grid";
    membersCard.appendChild(membersList);

    const feedCard = document.createElement("div");
    feedCard.className = "card card-body squad-feed-card";
    const feedHeading = document.createElement("h2");
    feedHeading.className = "wheel-side-heading";
    feedHeading.textContent = "Activity Feed";
    feedCard.appendChild(feedHeading);
    const feedList = document.createElement("ul");
    feedList.className = "squad-feed-list";
    feedCard.appendChild(feedList);

    dashboard.append(codeCard, membersCard, feedCard);
    content.appendChild(dashboard);

    function renderMembers(data) {
      membersList.replaceChildren();
      const entries = Object.entries(data?.players ?? {});
      if (entries.length === 0) {
        const empty = document.createElement("p");
        empty.className = "wheel-side-hint";
        empty.textContent = "Noch keine Mitglieder.";
        membersList.appendChild(empty);
        return;
      }

      entries.forEach(([id, player]) => {
        const isLeader = id === data.leaderId;
        const isMe = id === data.playerId;

        const card = document.createElement("div");
        card.className = "squad-member-card";

        const nameRow = document.createElement("div");
        nameRow.className = "squad-member-name-row";
        const nameText = document.createElement("span");
        nameText.textContent = player.name ?? "Unbekannt";
        nameRow.appendChild(nameText);
        if (isLeader) {
          const badge = document.createElement("span");
          badge.className = "status-chip status-chip--accent";
          badge.textContent = "Leader";
          nameRow.appendChild(badge);
        }
        if (isMe) {
          const badge = document.createElement("span");
          badge.className = "status-chip";
          badge.textContent = "Du";
          nameRow.appendChild(badge);
        }

        const statusChip = document.createElement("span");
        const stale =
          typeof player.lastSeenAt !== "number" ||
          Date.now() - player.lastSeenAt > 45000;
        statusChip.className =
          "status-chip " + (stale ? "status-chip--danger" : "status-chip--success");
        statusChip.textContent = stale ? "inaktiv" : "aktiv";

        const resultEl = document.createElement("div");
        resultEl.className = "squad-member-result";
        if (player.spinning) {
          const spinning = document.createElement("span");
          spinning.className = "status-chip status-chip--accent";
          spinning.textContent = "dreht...";
          resultEl.appendChild(spinning);
        } else if (player.result && typeof player.result === "object") {
          const entries = Object.entries(player.result);
          if (entries.length === 0) {
            const waiting = document.createElement("span");
            waiting.className = "wheel-side-hint";
            waiting.textContent = "Noch nicht gedreht";
            resultEl.appendChild(waiting);
          } else {
            entries.forEach(([key, value]) => {
              const item = document.createElement("span");
              item.className = "squad-result-item";
              const label = document.createElement("b");
              label.textContent = `${key}: `;
              item.appendChild(label);
              item.append(String(value ?? "-"));
              resultEl.appendChild(item);
            });
          }
        } else {
          const waiting = document.createElement("span");
          waiting.className = "wheel-side-hint";
          waiting.textContent = "Noch nicht gedreht";
          resultEl.appendChild(waiting);
        }

        card.append(nameRow, statusChip, resultEl);

        if (data.isLeader && !isMe) {
          const actions = document.createElement("div");
          actions.className = "squad-member-actions";

          const kickBtn = document.createElement("button");
          kickBtn.type = "button";
          kickBtn.className = "btn btn--danger";
          kickBtn.textContent = "Kick";
          kickBtn.addEventListener("click", async () => {
            const confirmed = await showConfirmDialog({
              title: "Mitglied kicken",
              text: `${player.name ?? "Dieses Mitglied"} wirklich aus dem Squad entfernen?`,
              confirmLabel: "Kicken",
              danger: true,
            });
            if (confirmed) service.kick(id);
          });

          const leaderBtn = document.createElement("button");
          leaderBtn.type = "button";
          leaderBtn.className = "btn btn--secondary";
          leaderBtn.textContent = "Leader machen";
          leaderBtn.addEventListener("click", async () => {
            const confirmed = await showConfirmDialog({
              title: "Leitung übergeben",
              text: `Leitung wirklich an ${player.name ?? "dieses Mitglied"} übergeben?`,
              confirmLabel: "Übergeben",
            });
            if (confirmed) service.transferLeadership(id);
          });

          actions.append(kickBtn, leaderBtn);
          card.appendChild(actions);
        }

        membersList.appendChild(card);
      });
    }

    function renderFeed(data) {
      feedList.replaceChildren();
      const events = data?.events ?? [];
      if (events.length === 0) {
        const li = document.createElement("li");
        li.className = "squad-feed-empty";
        li.textContent = "Noch keine Aktivität";
        feedList.appendChild(li);
        return;
      }
      events.forEach((event) => {
        const li = document.createElement("li");
        li.className = "squad-feed-item";
        const time = new Date(event.createdAt).toLocaleTimeString("de-DE", {
          hour: "2-digit",
          minute: "2-digit",
        });
        li.textContent = `${time} · ${event.type}`;
        feedList.appendChild(li);
      });
    }

    unsubscribeListener?.();
    unsubscribeListener = service.subscribe((data) => {
      if (!data) {
        renderStartScreen();
        return;
      }
      codeValue.textContent = data.code ?? "-";
      renderMembers(data);
      renderFeed(data);
    });

    if (snapshot) {
      renderMembers(snapshot);
      renderFeed(snapshot);
    }
  }

  const rejoined = service.tryAutoRejoin();
  if (rejoined) {
    renderSession();
  } else {
    renderStartScreen();
  }

  /* Stop updating this (now detached) view on navigation - the underlying
     Firebase connection/heartbeat keeps running via the singleton so the
     squad session survives moving to Randomizer/Wheel/GunGame. Only an
     explicit "Squad verlassen" click actually ends the session. */
  return () => {
    unsubscribeListener?.();
  };
}
