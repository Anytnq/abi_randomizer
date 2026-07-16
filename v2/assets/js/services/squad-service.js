/* Squad service (Planungs.md 7: "Squad-Service als einzige
   Firebase-Schnittstelle"). Thin coordination layer over v1's pure
   randomizer/squad.js + squad-utils.js (Planungs.md 3) - this file is the
   only place in v2 that touches Firebase, and it's only reached via the
   dynamic import chain from squad-view.js, so Firebase never loads unless
   Squad is actually opened (Planungs.md 8). */

import {
  createSession,
  joinSession,
  rejoinSession,
  leaveSession,
  subscribeToSession,
  publishPresence,
  publishResult,
  publishSpinning,
  cleanupInactivePlayers,
  kickPlayer,
  transferLeader,
  PRESENCE_HEARTBEAT_MS,
} from "../../../../assets/js/randomizer/squad.js";
import {
  buildSquadStoragePayload,
  isSquadStoragePayloadValid,
  getRecentEvents,
} from "../../../../assets/js/randomizer/squad-utils.js";
import { appStore } from "../app/app-store.js";

const STORAGE_KEY = "abi-randomizer:v2:squad";
const CLEANUP_INTERVAL_MS = PRESENCE_HEARTBEAT_MS * 2;

function saveSession(code, playerId, playerName) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(buildSquadStoragePayload(code, playerId, playerName)),
    );
  } catch {}
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw);
    return isSquadStoragePayloadValid(payload) ? payload : null;
  } catch {
    return null;
  }
}

function clearSession() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function createSquadService() {
  let code = null;
  let playerId = null;
  let playerName = null;
  let unsubscribeSession = null;
  let heartbeatTimer = null;
  let cleanupTimer = null;
  let lastSnapshot = null;
  const listeners = new Set();

  function notify() {
    listeners.forEach((listener) => listener(lastSnapshot));
  }

  function setStoreSquad(patch) {
    appStore.setState({
      squad: { ...appStore.getState().squad, ...patch },
    });
  }

  function buildMapValues(players) {
    const list = Object.values(players ?? {});
    if (list.length === 0) return [];
    const allRolled = list.every(
      (player) => typeof player?.result?.Map === "string",
    );
    return allRolled ? list.map((player) => player.result.Map) : [];
  }

  function onSessionUpdate(data) {
    if (!data) {
      resetLocal();
      return;
    }

    const isLeader = data.leaderId === playerId;
    lastSnapshot = {
      code,
      playerId,
      playerName,
      isLeader,
      leaderId: data.leaderId ?? null,
      players: data.players ?? {},
      events: getRecentEvents(data.events ?? {}, 30),
    };

    setStoreSquad({
      active: true,
      isLeader,
      code,
      playerId,
      playerName,
      mapValues: buildMapValues(data.players),
    });

    notify();
  }

  function startHeartbeat() {
    stopHeartbeat();
    publishPresence(code, playerId);
    heartbeatTimer = setInterval(() => {
      publishPresence(code, playerId);
    }, PRESENCE_HEARTBEAT_MS);
  }

  function stopHeartbeat() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  }

  function startCleanupLoop() {
    stopCleanupLoop();
    cleanupTimer = setInterval(() => {
      if (code && playerId) cleanupInactivePlayers(code, playerId);
    }, CLEANUP_INTERVAL_MS);
  }

  function stopCleanupLoop() {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
    }
  }

  function resetLocal(clearStorage = true) {
    stopHeartbeat();
    stopCleanupLoop();
    if (typeof unsubscribeSession === "function") unsubscribeSession();
    unsubscribeSession = null;
    code = null;
    playerId = null;
    playerName = null;
    lastSnapshot = null;
    if (clearStorage) clearSession();
    setStoreSquad({
      active: false,
      isLeader: false,
      code: null,
      playerId: null,
      playerName: null,
      mapValues: [],
    });
    notify();
  }

  function connect(nextCode, nextPlayerId, nextPlayerName) {
    code = nextCode;
    playerId = nextPlayerId;
    playerName = nextPlayerName;
    // Firebase delivers the full session asynchronously. Keep the locally known
    // connection data available immediately so the UI can show/copy the code.
    lastSnapshot = {
      code,
      playerId,
      playerName,
      isLeader: false,
      leaderId: null,
      players: {},
      events: [],
    };
    setStoreSquad({
      active: true,
      isLeader: false,
      code,
      playerId,
      playerName,
      mapValues: [],
    });
    saveSession(code, playerId, playerName);
    unsubscribeSession = subscribeToSession(code, onSessionUpdate);
    startHeartbeat();
    startCleanupLoop();
    notify();
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    getSnapshot() {
      return lastSnapshot;
    },

    async create(name, selectedCategories) {
      const session = await createSession(name, selectedCategories);
      connect(session.code, session.playerId, name);
      return session.code;
    },

    join(joinCode, name, onNotFound) {
      const session = joinSession(
        joinCode,
        name,
        onNotFound,
        () => setStoreSquad({ active: false }),
      );
      connect(joinCode, session.playerId, name);
    },

    tryAutoRejoin() {
      const saved = loadSession();
      if (!saved) return false;

      rejoinSession(
        saved.code,
        saved.playerId,
        saved.playerName,
        () => clearSession(),
        () => {},
      );
      connect(saved.code, saved.playerId, saved.playerName);
      return true;
    },

    leave() {
      if (code && playerId) leaveSession(code, playerId);
      resetLocal(true);
    },

    publishMyResult(result) {
      if (!code || !playerId) return;
      publishResult(code, playerId, result, playerName);
    },

    publishMySpinning(isSpinning) {
      if (!code || !playerId) return;
      publishSpinning(code, playerId, isSpinning);
    },

    kick(targetId) {
      if (!code || !playerId) return Promise.resolve(false);
      return kickPlayer(code, playerId, targetId);
    },

    transferLeadership(targetId) {
      if (!code || !playerId) return Promise.resolve(false);
      return transferLeader(code, playerId, targetId);
    },

    destroy() {
      stopHeartbeat();
      stopCleanupLoop();
      if (typeof unsubscribeSession === "function") unsubscribeSession();
    },
  };
}

/* App-wide singleton: the squad connection must survive navigating between
   views (Squad -> Randomizer -> Wheel) - only an explicit "leave" should
   end it, not a route change. Lazily constructed so Firebase still only
   loads on first real use, not at module-graph-build time. */
let singleton = null;
export function getSquadService() {
  if (!singleton) {
    singleton = createSquadService();
  }
  return singleton;
}
