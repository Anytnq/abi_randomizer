import { gungameWeapons } from "./data.js";
import {
  cleanupInactivePlayers,
  createSession,
  joinSession,
  leaveSession,
  PRESENCE_HEARTBEAT_MS,
  publishPresence,
  publishResult,
  publishSpinning,
  rejoinSession,
  subscribeToSession,
} from "../randomizer/squad.js?v=20260507-4";
import {
  buildSquadStoragePayload,
  getRecentEvents,
  isSquadStoragePayloadValid,
} from "../randomizer/squad-utils.js?v=20260507-4";

const MIN_STAGES = 3;
const MAX_STAGES = 30;
const DEFAULT_STAGES = 12;
const GUNGAME_SQUAD_CATEGORIES = ["weapon"];
const SQUAD_STORAGE_KEY = "gungameSquadSession";

const elements = {
  stageCountInput: document.getElementById("gungameStageCount"),
  upgradeChanceInput: document.getElementById("gungameUpgradeChance"),
  generateButton: document.getElementById("gungameGenerateBtn"),
  statusText: document.getElementById("gungameStatusText"),
  raidDoneButton: document.getElementById("gungameRaidDoneBtn"),
  previousButton: document.getElementById("gungamePrevBtn"),
  nextButton: document.getElementById("gungameNextBtn"),
  resetButton: document.getElementById("gungameResetBtn"),
  raidResult: document.getElementById("gungameRaidResult"),
  list: document.getElementById("gungameList"),
};

const state = {
  route: [],
  currentIndex: 0,
  lastRaidResult:
    "Schließe einen Raid ab, um auf die nächsten Stufe zu gelangen.",
};

const squadState = {
  code: null,
  playerId: null,
  active: false,
  isLeader: false,
  role: "member",
  playerName: null,
  sessionUnsubscribe: null,
  rejoinPending: false,
  lastMembersSignature: "",
  lastEventsSignature: "",
  lastSeenUpdateAt: 0,
  heartbeatTimerId: null,
  cleanupTimerId: null,
};

initialize();

function initialize() {
  elements.generateButton?.addEventListener("click", regenerateRoute);
  elements.raidDoneButton?.addEventListener("click", completeRaid);
  elements.previousButton?.addEventListener("click", moveToPreviousStage);
  elements.nextButton?.addEventListener("click", moveToNextStage);
  elements.resetButton?.addEventListener("click", resetProgress);

  initConnectionWatchers();
  initSquad();
  tryAutoRejoinSquad();

  regenerateRoute();
  updateSquadRoleHint();
}

function regenerateRoute() {
  const stageCount = readStageCount();
  elements.stageCountInput.value = String(stageCount);

  state.route = buildRoute(stageCount);
  state.currentIndex = 0;
  state.lastRaidResult =
    "Neue Route generiert. Schließe einen Raid ab, um auf die nächsten Stufe zu gelangen.";

  render();
  syncSquadResult();
}

function completeRaid() {
  if (state.route.length === 0) {
    return;
  }

  const currentEntry = state.route[state.currentIndex];
  if (!currentEntry) {
    return;
  }

  if (squadState.active && squadState.code && squadState.playerId) {
    publishSpinning(squadState.code, squadState.playerId, true);
  }

  const nextIndex = state.currentIndex + 1;
  if (nextIndex >= state.route.length) {
    state.lastRaidResult = `Finale geschafft mit ${currentEntry.name}. GunGame Route abgeschlossen.`;
    render();
    syncSquadResult();

    if (squadState.active && squadState.code && squadState.playerId) {
      publishSpinning(squadState.code, squadState.playerId, false);
    }

    return;
  }

  const nextEntry = state.route[nextIndex];
  const upgradeChance = readUpgradeChance();
  const rolledUpgrade = Math.random() < upgradeChance;
  let raidResultText = `Raid abgeschlossen mit ${currentEntry.name} (Wert ${currentEntry.value}).`;

  if (rolledUpgrade) {
    const upgradedWeapon = pickHigherWeapon(nextEntry.value, nextEntry.name);
    if (upgradedWeapon) {
      state.route[nextIndex] = createRouteEntry(upgradedWeapon, nextIndex + 1);
      raidResultText += ` Upgrade aktiv: Stufe ${nextIndex + 1} wurde auf ${upgradedWeapon.name} (Wert ${state.route[nextIndex].value}) erhöht.`;
    } else {
      raidResultText +=
        " Upgrade gewürfelt, aber keine höhere Waffe verfügbar.";
    }
  } else {
    const percent = Math.round(upgradeChance * 100);
    raidResultText += ` Kein Upgrade dieses Mal (${percent}% Chance).`;
  }

  state.lastRaidResult = raidResultText;
  state.currentIndex = nextIndex;
  render();
  syncSquadResult();

  if (squadState.active && squadState.code && squadState.playerId) {
    publishSpinning(squadState.code, squadState.playerId, false);
  }
}

function moveToPreviousStage() {
  if (state.route.length === 0) {
    return;
  }

  state.currentIndex = Math.max(0, state.currentIndex - 1);
  render();
  syncSquadResult();
}

function moveToNextStage() {
  if (state.route.length === 0) {
    return;
  }

  state.currentIndex = Math.min(state.route.length - 1, state.currentIndex + 1);
  render();
  syncSquadResult();
}

function resetProgress() {
  state.currentIndex = 0;
  state.lastRaidResult =
    "Progress zurueckgesetzt. Schließe einen Raid ab, um Upgrade-Chancen zu nutzen.";
  render();
  syncSquadResult();
}

function buildRoute(stageCount) {
  const shuffledWeapons = shuffle([...gungameWeapons]);
  const route = [];

  for (let index = 0; index < stageCount; index += 1) {
    const weapon = shuffledWeapons[index % shuffledWeapons.length];
    route.push(createRouteEntry(weapon, index + 1));
  }

  return route;
}

function createRouteEntry(weapon, step) {
  return {
    step,
    name: weapon.name,
    category: formatCategory(weapon.category),
    value: getWeaponValue(weapon),
  };
}

function getWeaponValue(weapon) {
  const parsedValue = Number.parseInt(String(weapon?.value ?? ""), 10);
  if (!Number.isFinite(parsedValue)) {
    return 1;
  }

  return Math.max(1, parsedValue);
}

function readUpgradeChance() {
  const raw = Number.parseInt(
    String(elements.upgradeChanceInput?.value ?? "25"),
    10,
  );
  const percent = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 25;
  elements.upgradeChanceInput.value = String(percent);
  return percent / 100;
}

function pickHigherWeapon(currentValue, excludedName) {
  const candidates = gungameWeapons.filter((weapon) => {
    if (weapon.name === excludedName) {
      return false;
    }

    return getWeaponValue(weapon) > currentValue;
  });

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function readStageCount() {
  const parsed = Number.parseInt(elements.stageCountInput?.value || "", 10);

  if (!Number.isFinite(parsed)) {
    return DEFAULT_STAGES;
  }

  return Math.max(MIN_STAGES, Math.min(MAX_STAGES, parsed));
}

function render() {
  renderStatus();
  renderList();
  renderControls();
}

function renderStatus() {
  const total = state.route.length;
  const current = total > 0 ? state.currentIndex + 1 : 0;
  const currentEntry = state.route[state.currentIndex];
  const valueText = currentEntry ? ` | Waffenwert: ${currentEntry.value}` : "";

  elements.statusText.innerHTML = `Aktuelle Stufe: <strong>${current} / ${total}</strong>${valueText}`;

  if (elements.raidResult) {
    elements.raidResult.textContent = state.lastRaidResult;
  }
}

function renderList() {
  elements.list.replaceChildren();

  state.route.forEach((entry, index) => {
    const item = document.createElement("li");
    item.className = "gungame-item";

    if (index < state.currentIndex) {
      item.classList.add("is-done");
    }

    if (index === state.currentIndex) {
      item.classList.add("is-current");
    }

    const step = document.createElement("span");
    step.className = "gungame-step";
    step.textContent = String(entry.step);

    const weapon = document.createElement("span");
    weapon.className = "gungame-weapon";
    weapon.textContent = entry.name;

    const category = document.createElement("span");
    category.className = "gungame-category";
    category.textContent = entry.category;

    const value = document.createElement("span");
    value.className = "gungame-value";
    value.textContent = `Wert ${entry.value}`;

    item.append(step, weapon, category, value);
    elements.list.appendChild(item);
  });
}

function renderControls() {
  const total = state.route.length;
  const hasRoute = total > 0;

  elements.previousButton.disabled = !hasRoute || state.currentIndex <= 0;
  elements.nextButton.disabled = !hasRoute || state.currentIndex >= total - 1;
  elements.raidDoneButton.disabled = !hasRoute;
  elements.resetButton.disabled = !hasRoute;
}

function formatCategory(category) {
  if (!category) {
    return "Unknown";
  }

  return category
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function shuffle(items) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }

  return items;
}

function getCurrentResult() {
  const currentEntry = state.route[state.currentIndex] ?? null;

  return {
    Stufe: `${Math.min(state.currentIndex + 1, state.route.length)} / ${state.route.length}`,
    Waffe: currentEntry?.name ?? "-",
  };
}

function syncSquadResult() {
  if (!squadState.active || !squadState.code || !squadState.playerId) {
    return;
  }

  publishResult(squadState.code, squadState.playerId, getCurrentResult());
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

    const { code, playerId } = createSession(name, GUNGAME_SQUAD_CATEGORIES);

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
    syncSquadResult();
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
    syncSquadResult();
  });

  leaveBtn?.addEventListener("click", () => {
    if (squadState.code && squadState.playerId) {
      leaveSession(squadState.code, squadState.playerId);
    }

    resetSquadUi(true);
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

function showSquadError(message) {
  const errorElement = document.getElementById("squadError");
  if (!errorElement) {
    return;
  }

  errorElement.textContent = message;
  errorElement.hidden = false;
}

function hideSquadError() {
  const errorElement = document.getElementById("squadError");
  if (!errorElement) {
    return;
  }

  errorElement.hidden = true;
}

function updateSquadRoleHint() {
  const hintElement = document.getElementById("squadRoleHint");
  const connectionElement = document.getElementById("squadConnectionState");
  if (!hintElement || !connectionElement) {
    return;
  }

  hintElement.classList.remove("leader", "member", "readonly");

  if (!squadState.active) {
    hintElement.textContent = "";
    connectionElement.textContent = "Nicht verbunden";
    connectionElement.className = "squad-connection-state offline";
    return;
  }

  const stale =
    Date.now() - squadState.lastSeenUpdateAt > PRESENCE_HEARTBEAT_MS * 3;
  connectionElement.textContent =
    stale || !navigator.onLine ? "Verbindung instabil" : "Live verbunden";
  connectionElement.className =
    stale || !navigator.onLine
      ? "squad-connection-state unstable"
      : "squad-connection-state online";

  if (squadState.isLeader) {
    hintElement.classList.add("leader");
    hintElement.textContent = "Du bist Squad Leader.";
    return;
  }

  if (squadState.role === "readonly") {
    hintElement.classList.add("readonly");
    hintElement.textContent =
      "Du bist Read-only Member. Du siehst alles live, kannst aber nichts steuern.";
    return;
  }

  hintElement.classList.add("member");
  hintElement.textContent =
    "Du bist Squad Member. Dein Gungame-Stand wird live geteilt.";
}

function renderSquadMembers(players, leaderId) {
  const membersElement = document.getElementById("squadMembers");
  if (!membersElement) {
    return;
  }

  membersElement.innerHTML = "";

  Object.entries(players).forEach(([playerId, player]) => {
    const isMe = playerId === squadState.playerId;
    const card = document.createElement("div");
    card.className = "squad-member" + (isMe ? " squad-member--me" : "");

    const nameElement = document.createElement("div");
    nameElement.className = "squad-member-name";
    const isLeader = playerId === leaderId;
    const roleTag = player.role === "readonly" ? " [RO]" : "";
    nameElement.textContent =
      `${player.name ?? "Unbekannt"}${roleTag}` +
      (isLeader ? " 👑" : "") +
      (isMe ? " (Du)" : "");

    const statusElement = document.createElement("div");
    statusElement.className = "squad-member-status";
    const stale =
      typeof player.lastSeenAt === "number"
        ? Date.now() - player.lastSeenAt > PRESENCE_HEARTBEAT_MS * 3
        : true;
    statusElement.textContent = stale ? "inaktiv" : "aktiv";
    statusElement.classList.toggle("offline", stale);

    const resultElement = document.createElement("div");
    resultElement.className = "squad-member-result";
    if (player.spinning) {
      resultElement.innerHTML =
        '<span class="squad-spinning">🎰 aktualisiert...</span>';
    } else if (player.result && typeof player.result === "object") {
      const entries = Object.entries(player.result)
        .map(
          ([key, value]) =>
            `<span class="squad-result-item"><b>${key}:</b> ${String(value ?? "-")}</span>`,
        )
        .join("");
      resultElement.innerHTML = entries;
    } else {
      resultElement.innerHTML =
        '<span class="squad-waiting">Noch kein Stand</span>';
    }

    card.append(nameElement, statusElement, resultElement);
    membersElement.appendChild(card);
  });
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
    default:
      return "Squad-Event";
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
    default:
      return "squad-feed-item--default";
  }
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

function onSquadUpdate(data) {
  if (!data) {
    resetSquadUi(true);
    return;
  }

  squadState.lastSeenUpdateAt = Date.now();
  showReconnectBanner(false);

  squadState.isLeader = data.leaderId === squadState.playerId;
  const players = data.players ?? {};
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
      () => resetSquadUi(true),
    );
    return;
  }

  if (me) {
    squadState.rejoinPending = false;
  }

  squadState.role = me?.role || (squadState.isLeader ? "leader" : "member");
  updateSquadRoleHint();
  startCleanupLoop();

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

function saveSquadToStorage(code, playerId, playerName) {
  try {
    localStorage.setItem(
      SQUAD_STORAGE_KEY,
      JSON.stringify(buildSquadStoragePayload(code, playerId, playerName)),
    );
  } catch (_) {}
}

function loadSquadFromStorage() {
  try {
    const raw = localStorage.getItem(SQUAD_STORAGE_KEY);
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
    localStorage.removeItem(SQUAD_STORAGE_KEY);
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
  syncSquadResult();
}

function resetSquadUi(clearStorage = true) {
  stopHeartbeat();
  stopCleanupLoop();
  unsubscribeFromSession();

  squadState.code = null;
  squadState.playerId = null;
  squadState.active = false;
  squadState.isLeader = false;
  squadState.role = "member";
  squadState.playerName = null;
  squadState.rejoinPending = false;
  squadState.lastMembersSignature = "";
  squadState.lastEventsSignature = "";
  squadState.lastSeenUpdateAt = 0;

  if (clearStorage) {
    clearSquadFromStorage();
  }

  const setup = document.getElementById("squadSetup");
  const session = document.getElementById("squadSession");
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
}

function showReconnectBanner(show, text = "") {
  const banner = document.getElementById("squadConnectionBanner");
  if (!banner) {
    return;
  }

  banner.hidden = !show;
  if (show && text) {
    banner.textContent = text;
  }
}

function initConnectionWatchers() {
  window.addEventListener("online", () => {
    if (!squadState.active || !squadState.code || !squadState.playerId) {
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

function startHeartbeat() {
  stopHeartbeat();
  if (!squadState.active || !squadState.code || !squadState.playerId) {
    return;
  }

  publishPresence(squadState.code, squadState.playerId);
  squadState.heartbeatTimerId = window.setInterval(() => {
    publishPresence(squadState.code, squadState.playerId);
  }, PRESENCE_HEARTBEAT_MS);
}

function stopHeartbeat() {
  if (!squadState.heartbeatTimerId) {
    return;
  }

  clearInterval(squadState.heartbeatTimerId);
  squadState.heartbeatTimerId = null;
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
  if (!squadState.cleanupTimerId) {
    return;
  }

  clearInterval(squadState.cleanupTimerId);
  squadState.cleanupTimerId = null;
}
