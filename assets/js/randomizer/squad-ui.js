import {
  cleanupInactivePlayers,
  createSession,
  joinSession,
  leaveSession,
  PRESENCE_HEARTBEAT_MS,
  publishPresence,
  rejoinSession,
  subscribeToSession,
} from "./squad.js?v=20260507-4";
import {
  buildSquadStoragePayload,
  getRecentEvents,
  isSquadStoragePayloadValid,
} from "./squad-utils.js?v=20260507-4";
import { categoryOptions } from "./data.js";

export function createSquadUI({
  storageKey,
  memberHintText,
  getSelectedCategories,
  onSessionStart,
  onSessionReset,
  onSquadDataUpdate,
}) {
  const squadState = {
    code: null,
    playerId: null,
    active: false,
    isLeader: false,
    role: "member",
    playerName: null,
    lastZeroToHero: null,
    hasProcessedInitialUpdate: false,
    sessionUnsubscribe: null,
    rejoinPending: false,
    lastMembersSignature: "",
    lastEventsSignature: "",
    lastWheelConfigSignature: "",
    lastAutoValuesSignature: "",
    lastRemoteSpinId: null,
    lastPlayers: {},
    lastLeaderId: null,
    lastSeenUpdateAt: 0,
    heartbeatTimerId: null,
    cleanupTimerId: null,
  };

  function createInitialSquadState() {
    return {
      code: null,
      playerId: null,
      active: false,
      isLeader: false,
      role: "member",
      playerName: null,
      lastZeroToHero: null,
      hasProcessedInitialUpdate: false,
      sessionUnsubscribe: null,
      rejoinPending: false,
      lastMembersSignature: "",
      lastEventsSignature: "",
      lastWheelConfigSignature: "",
      lastAutoValuesSignature: "",
      lastRemoteSpinId: null,
      lastPlayers: {},
      lastLeaderId: null,
      lastSeenUpdateAt: 0,
      heartbeatTimerId: null,
      cleanupTimerId: null,
    };
  }

  function isSquadReady() {
    return Boolean(squadState.active && squadState.code && squadState.playerId);
  }

  function saveSquadToStorage(code, playerId, playerName) {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify(buildSquadStoragePayload(code, playerId, playerName)),
      );
    } catch (_) {}
  }

  function loadSquadFromStorage() {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) {
        return null;
      }
      const payload = JSON.parse(raw);
      return isSquadStoragePayloadValid(payload) ? payload : null;
    } catch (_) {
      return null;
    }
  }

  function clearSquadFromStorage() {
    try {
      localStorage.removeItem(storageKey);
    } catch (_) {}
  }

  function unsubscribeFromSession() {
    if (typeof squadState.sessionUnsubscribe === "function") {
      squadState.sessionUnsubscribe();
    }

    squadState.sessionUnsubscribe = null;
  }

  function ensureSessionSubscription() {
    if (!squadState.code) {
      return;
    }

    unsubscribeFromSession();
    squadState.sessionUnsubscribe = subscribeToSession(
      squadState.code,
      onSquadUpdate,
    );
  }

  function showReconnectBanner(show, text = "") {
    const el = document.getElementById("squadConnectionBanner");
    if (!el) {
      return;
    }
    el.hidden = !show;
    if (show && text) {
      el.textContent = text;
    }
  }

  function showSquadError(msg) {
    const el = document.getElementById("squadError");
    if (!el) {
      return;
    }
    el.textContent = msg;
    el.hidden = false;
  }

  function hideSquadError() {
    const el = document.getElementById("squadError");
    if (!el) {
      return;
    }
    el.hidden = true;
  }

  function updateSquadRoleHint() {
    const hintEl = document.getElementById("squadRoleHint");
    const connectionEl = document.getElementById("squadConnectionState");
    if (!hintEl || !connectionEl) {
      return;
    }

    hintEl.classList.remove("leader", "member", "readonly");

    if (!squadState.active) {
      hintEl.textContent = "";
      connectionEl.textContent = "Nicht verbunden";
      connectionEl.className = "squad-connection-state offline";
      return;
    }

    const stale =
      Date.now() - squadState.lastSeenUpdateAt > PRESENCE_HEARTBEAT_MS * 3;
    connectionEl.textContent =
      stale || !navigator.onLine ? "Verbindung instabil" : "Live verbunden";
    connectionEl.className =
      stale || !navigator.onLine
        ? "squad-connection-state unstable"
        : "squad-connection-state online";

    if (squadState.isLeader) {
      hintEl.classList.add("leader");
      hintEl.textContent = "Du bist Squad Leader.";
      return;
    }

    if (squadState.role === "readonly") {
      hintEl.classList.add("readonly");
      hintEl.textContent =
        "Du bist Read-only Member. Du siehst alles live, kannst aber nicht drehen.";
      return;
    }

    hintEl.classList.add("member");
    hintEl.textContent = memberHintText;
  }

  function getSquadName() {
    const input = document.getElementById("squadName");
    const name = String(input?.value ?? "").trim();
    if (!name) {
      showSquadError("Bitte einen Namen eingeben.");
      input?.focus();
      return null;
    }
    hideSquadError();
    return name;
  }

  function showSquadSession(code) {
    const setup = document.getElementById("squadSetup");
    const session = document.getElementById("squadSession");
    const codeDisplay = document.getElementById("squadCodeDisplay");

    if (setup) {
      setup.hidden = true;
    }
    if (session) {
      session.hidden = false;
    }
    if (codeDisplay) {
      codeDisplay.textContent = code;
    }

    updateSquadRoleHint();
  }

  function startHeartbeat() {
    stopHeartbeat();
    if (!isSquadReady()) {
      return;
    }

    publishPresence(squadState.code, squadState.playerId);
    squadState.heartbeatTimerId = window.setInterval(() => {
      publishPresence(squadState.code, squadState.playerId);
    }, PRESENCE_HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (squadState.heartbeatTimerId) {
      clearInterval(squadState.heartbeatTimerId);
      squadState.heartbeatTimerId = null;
    }
  }

  function startCleanupLoop() {
    stopCleanupLoop();
    if (!squadState.active || !squadState.isLeader) {
      return;
    }

    squadState.cleanupTimerId = window.setInterval(() => {
      if (!squadState.code || !squadState.playerId) {
        return;
      }
      cleanupInactivePlayers(squadState.code, squadState.playerId);
    }, PRESENCE_HEARTBEAT_MS * 2);
  }

  function stopCleanupLoop() {
    if (squadState.cleanupTimerId) {
      clearInterval(squadState.cleanupTimerId);
      squadState.cleanupTimerId = null;
    }
  }

  function resolveActivityActorName(payload, players) {
    if (typeof payload.byName === "string" && payload.byName.trim()) {
      return payload.byName;
    }

    if (typeof payload.by === "string" && payload.by.trim()) {
      return players[payload.by]?.name || payload.by;
    }

    return "Jemand";
  }

  function resolveActivityTargetName(payload, players) {
    if (typeof payload.targetName === "string" && payload.targetName.trim()) {
      return payload.targetName;
    }

    if (typeof payload.playerName === "string" && payload.playerName.trim()) {
      return payload.playerName;
    }

    if (typeof payload.targetId === "string" && payload.targetId.trim()) {
      return players[payload.targetId]?.name || payload.targetId;
    }

    return "Jemand";
  }

  function formatSelectedCategoryNames(selectedCategories) {
    if (!Array.isArray(selectedCategories)) {
      return "keine";
    }

    const labels = selectedCategories
      .map(
        (key) =>
          categoryOptions.find((category) => category.key === key)?.label ?? key,
      )
      .filter((label) => typeof label === "string" && label.length > 0);

    return labels.length > 0 ? labels.join(", ") : "keine";
  }

  function formatActivityMessage(event, players) {
    const payload = event.payload ?? {};
    const actorName = resolveActivityActorName(payload, players);
    const targetName = resolveActivityTargetName(payload, players);

    switch (event.type) {
      case "session-created":
        return `${actorName} hat die Session erstellt.`;
      case "member-joined":
        return `${actorName} ist dem Squad beigetreten.`;
      case "member-rejoined":
        return `${actorName} ist wieder online.`;
      case "member-left":
        return `${actorName} hat den Squad verlassen.`;
      case "member-timeout":
        return `${targetName} wurde wegen Inaktivitat entfernt.`;
      case "leader-changed":
        return `${actorName} hat die Leitung an ${targetName} uebergeben.`;
      case "member-kicked":
        return `${actorName} hat ${targetName} aus dem Squad gekickt.`;
      case "role-changed":
        return `${actorName} hat ${targetName} auf ${payload.role === "readonly" ? "Read-only" : "Member"} gesetzt.`;
      case "filters-updated":
        return `${actorName} hat die Kategorien geändert: ${formatSelectedCategoryNames(payload.selectedCategories)}.`;
      case "wheel-config-updated":
        return payload.manualMode
          ? `${actorName} hat den Wheel-Modus auf Manuell gesetzt.`
          : `${actorName} hat den Wheel-Modus auf Auto gesetzt.`;
      case "wheel-spun":
        return `${actorName} hat das Wheel gedreht.`;
      case "result-published":
        return payload.crateReward
          ? `${actorName} hat ?-Kiste gezogen: ${payload.crateReward}.`
          : `${actorName} hat ein Ergebnis veroeffentlicht.`;
      case "zero-to-hero":
        return payload.appliesToTeam
          ? `${actorName} hat 0 to Hero fuer das ganze Team ausgelost.`
          : `${actorName} hat 0 to Hero ausgelost.`;
      default:
        return "Squad-Event";
    }
  }

  function getActivityItemClass(eventType) {
    switch (eventType) {
      case "session-created":
      case "member-joined":
      case "member-rejoined":
        return "squad-feed-item--join";
      case "member-left":
      case "member-timeout":
      case "member-kicked":
        return "squad-feed-item--leave";
      case "leader-changed":
        return "squad-feed-item--leader";
      case "wheel-spun":
      case "result-published":
        return "squad-feed-item--wheel";
      case "wheel-config-updated":
      case "filters-updated":
      case "role-changed":
        return "squad-feed-item--config";
      case "zero-to-hero":
        return "squad-feed-item--zth";
      default:
        return "squad-feed-item--default";
    }
  }

  function renderActivityFeed(eventMap, players) {
    const list = document.getElementById("squadActivityFeed");
    if (!list) {
      return;
    }

    const events = getRecentEvents(eventMap, 10);
    if (events.length === 0) {
      list.innerHTML = '<li class="squad-feed-empty">Noch keine Aktivitat</li>';
      return;
    }

    list.innerHTML = "";
    events.forEach((event) => {
      const item = document.createElement("li");
      item.className = `squad-feed-item ${getActivityItemClass(event.type)}`;
      const time = new Date(event.createdAt).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      item.innerHTML = `<span class="squad-feed-time">${time}</span><span class="squad-feed-text">${formatActivityMessage(event, players)}</span>`;
      list.appendChild(item);
    });
  }

  function buildMembersSignature(players, leaderId) {
    const now = Date.now();

    return Object.entries(players)
      .sort(([leftId], [rightId]) => leftId.localeCompare(rightId))
      .map(([playerId, player]) => {
        const stale =
          typeof player?.lastSeenAt === "number"
            ? now - player.lastSeenAt > PRESENCE_HEARTBEAT_MS * 3
            : true;
        const resultEntries =
          player?.result && typeof player.result === "object"
            ? Object.entries(player.result)
                .map(([key, value]) => `${key}:${String(value)}`)
                .join(",")
            : "";

        return `${playerId}|${player?.name ?? ""}|${player?.role ?? ""}|${playerId === leaderId ? 1 : 0}|${player?.spinning ? 1 : 0}|${stale ? 1 : 0}|${resultEntries}`;
      })
      .join("||");
  }

  function buildEventsSignature(eventMap) {
    const events = getRecentEvents(eventMap, 10);
    return events.map((event) => `${event.id}:${event.createdAt}`).join("|");
  }

  function renderSquadMembers(players, leaderId) {
    const membersEl = document.getElementById("squadMembers");
    if (!membersEl) {
      return;
    }

    membersEl.innerHTML = "";
    const now = Date.now();

    Object.entries(players).forEach(([id, player]) => {
      const isMe = id === squadState.playerId;
      const card = document.createElement("div");
      card.className = "squad-member" + (isMe ? " squad-member--me" : "");

      const nameEl = document.createElement("div");
      nameEl.className = "squad-member-name";
      const isLeader = id === leaderId;
      const roleTag = player.role === "readonly" ? " [RO]" : "";
      nameEl.textContent =
        `${player.name ?? "Unbekannt"}${roleTag}` +
        (isLeader ? " 👑" : "") +
        (isMe ? " (Du)" : "");

      const statusEl = document.createElement("div");
      statusEl.className = "squad-member-status";
      const stale =
        typeof player.lastSeenAt === "number"
          ? now - player.lastSeenAt > PRESENCE_HEARTBEAT_MS * 3
          : true;
      statusEl.textContent = stale ? "inaktiv" : "aktiv";
      statusEl.classList.toggle("offline", stale);

      const resultEl = document.createElement("div");
      resultEl.className = "squad-member-result";
      if (player.spinning) {
        resultEl.innerHTML = '<span class="squad-spinning">🎰 dreht...</span>';
      } else if (player.result && typeof player.result === "object") {
        const entries = Object.entries(player.result)
          .map(
            ([key, val]) =>
              `<span class="squad-result-item"><b>${key}:</b> ${String(val ?? "-")}</span>`,
          )
          .join("");
        resultEl.innerHTML = entries;
      } else {
        resultEl.innerHTML =
          '<span class="squad-waiting">Noch nicht gedreht</span>';
      }

      card.append(nameEl, statusEl, resultEl);
      membersEl.appendChild(card);
    });
  }

  function resetSquadUI(clearStorage = true) {
    stopHeartbeat();
    stopCleanupLoop();
    unsubscribeFromSession();
    Object.assign(squadState, createInitialSquadState());

    if (clearStorage) {
      clearSquadFromStorage();
    }

    const session = document.getElementById("squadSession");
    const setup = document.getElementById("squadSetup");
    if (session) {
      session.hidden = true;
    }
    if (setup) {
      setup.hidden = false;
    }

    renderSquadMembers({}, null);
    renderActivityFeed({}, {});
    showReconnectBanner(false);
    updateSquadRoleHint();
    onSessionReset();
  }

  function onSquadUpdate(data) {
    if (!data) {
      resetSquadUI(true);
      return;
    }

    const previousIsLeader = squadState.isLeader;
    squadState.isLeader = data.leaderId === squadState.playerId;
    squadState.lastSeenUpdateAt = Date.now();
    showReconnectBanner(false);

    const players = data.players ?? {};
    squadState.lastPlayers = players;
    squadState.lastLeaderId = data.leaderId ?? null;

    const me = players[squadState.playerId];
    if (
      !me &&
      squadState.active &&
      squadState.code &&
      squadState.playerName &&
      !squadState.rejoinPending
    ) {
      squadState.rejoinPending = true;
      rejoinSession(
        squadState.code,
        squadState.playerId,
        squadState.playerName,
        () => resetSquadUI(true),
      );
      return;
    }

    if (me) {
      squadState.rejoinPending = false;
    }

    squadState.role = me?.role || (squadState.isLeader ? "leader" : "member");
    updateSquadRoleHint();
    startCleanupLoop();

    onSquadDataUpdate(data, squadState, previousIsLeader);

    const membersSignature = buildMembersSignature(players, data.leaderId);
    if (membersSignature !== squadState.lastMembersSignature) {
      squadState.lastMembersSignature = membersSignature;
      renderSquadMembers(players, data.leaderId);
    }

    const eventsSignature = buildEventsSignature(data.events ?? {});
    if (eventsSignature !== squadState.lastEventsSignature) {
      squadState.lastEventsSignature = eventsSignature;
      renderActivityFeed(data.events ?? {}, players);
    }
  }

  function initConnectionWatchers() {
    window.addEventListener("online", () => {
      if (!squadState.active) {
        return;
      }
      showReconnectBanner(false);
      publishPresence(squadState.code, squadState.playerId);
    });

    window.addEventListener("offline", () => {
      if (!squadState.active) {
        return;
      }
      showReconnectBanner(true, "Offline: verbinde neu...");
    });

    document.addEventListener("visibilitychange", () => {
      if (
        document.visibilityState !== "visible" ||
        !squadState.active ||
        !squadState.code ||
        !squadState.playerId
      ) {
        return;
      }
      publishPresence(squadState.code, squadState.playerId);
    });
  }

  function tryAutoRejoinSquad() {
    const saved = loadSquadFromStorage();
    if (!saved?.code || !saved?.playerId || !saved?.playerName) {
      clearSquadFromStorage();
      return;
    }

    rejoinSession(saved.code, saved.playerId, saved.playerName, () => {
      clearSquadFromStorage();
    });

    squadState.code = saved.code;
    squadState.playerId = saved.playerId;
    squadState.playerName = saved.playerName;
    squadState.active = true;
    squadState.isLeader = false;
    squadState.role = "member";

    ensureSessionSubscription();
    showSquadSession(saved.code);
    startHeartbeat();
    onSessionStart(squadState, { isLeader: false });
  }

  function closeOpenSquadMemberMenus(exceptMenu = null) {
    document.querySelectorAll(".squad-member-menu").forEach((menu) => {
      if (menu === exceptMenu) {
        return;
      }

      menu.hidden = true;
      const triggerId = menu.getAttribute("data-trigger-id");
      if (!triggerId) {
        return;
      }

      const trigger = document.getElementById(triggerId);
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  }

  function initSquad() {
    const toggleBtn = document.getElementById("squadToggle");
    const content = document.getElementById("squadContent");
    const chevron = document.getElementById("squadChevron");
    const createBtn = document.getElementById("squadCreateBtn");
    const joinBtn = document.getElementById("squadJoinBtn");
    const leaveBtn = document.getElementById("squadLeaveBtn");
    const copyBtn = document.getElementById("squadCopyBtn");

    if (!toggleBtn || !content || !chevron) {
      return;
    }

    toggleBtn.addEventListener("click", () => {
      const isOpen = content.classList.toggle("open");
      chevron.textContent = isOpen ? "▲" : "▼";
      toggleBtn.setAttribute("aria-expanded", String(isOpen));
    });

    createBtn?.addEventListener("click", () => {
      const name = getSquadName();
      if (!name) {
        return;
      }

      const { code, playerId } = createSession(name, getSelectedCategories());

      squadState.code = code;
      squadState.playerId = playerId;
      squadState.active = true;
      squadState.isLeader = true;
      squadState.role = "leader";
      squadState.playerName = name;

      saveSquadToStorage(code, playerId, name);
      ensureSessionSubscription();
      showSquadSession(code);
      startHeartbeat();
      startCleanupLoop();
      onSessionStart(squadState, { isLeader: true });
    });

    joinBtn?.addEventListener("click", () => {
      const name = getSquadName();
      if (!name) {
        return;
      }

      const joinCodeInput = document.getElementById("squadJoinCode");
      const code = String(joinCodeInput?.value ?? "")
        .trim()
        .toUpperCase();

      if (code.length < 2) {
        showSquadError("Bitte einen gueltigen Code eingeben.");
        return;
      }

      const { playerId } = joinSession(code, name, () => {
        showSquadError("Session nicht gefunden oder abgelaufen.");
      });

      squadState.code = code;
      squadState.playerId = playerId;
      squadState.active = true;
      squadState.isLeader = false;
      squadState.role = "member";
      squadState.playerName = name;

      saveSquadToStorage(code, playerId, name);
      ensureSessionSubscription();
      showSquadSession(code);
      startHeartbeat();
      onSessionStart(squadState, { isLeader: false });
    });

    leaveBtn?.addEventListener("click", () => {
      if (squadState.code && squadState.playerId) {
        leaveSession(squadState.code, squadState.playerId);
      }
      resetSquadUI(true);
    });

    copyBtn?.addEventListener("click", () => {
      if (!squadState.code) {
        return;
      }

      navigator.clipboard
        .writeText(squadState.code)
        .then(() => {
          copyBtn.textContent = "OK";
          setTimeout(() => {
            copyBtn.textContent = "📋";
          }, 1500);
        })
        .catch(() => {});
    });

    document.addEventListener("click", () => {
      closeOpenSquadMemberMenus();
    });
  }

  initConnectionWatchers();

  return {
    squadState,
    isSquadReady,
    initSquad,
    tryAutoRejoinSquad,
    resetSquadUI,
    showSquadError,
    hideSquadError,
    showReconnectBanner,
    updateSquadRoleHint,
    renderSquadMembers,
    renderActivityFeed,
    buildMembersSignature,
    startHeartbeat,
    stopHeartbeat,
    startCleanupLoop,
    stopCleanupLoop,
  };
}
