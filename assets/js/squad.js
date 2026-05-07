import {
  get,
  onValue,
  ref,
  remove,
  set,
  update,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { db } from "./firebase.js";
import { getInactivePlayerIds } from "./squad-utils.js";

const SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const MAX_EVENTS = 80;

export const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_TIMEOUT_MS = 60_000;

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 2 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

function createPlayerRecord(name, role = "member") {
  return {
    name,
    role,
    result: null,
    spinning: false,
    joinedAt: Date.now(),
    lastSeenAt: Date.now(),
  };
}

function isSessionExpired(data) {
  const age = Date.now() - (data?.createdAt ?? 0);
  return age > SESSION_TTL_MS;
}

async function trimOldEvents(code, eventsMap) {
  const eventIds = Object.keys(eventsMap ?? {});
  if (eventIds.length <= MAX_EVENTS) {
    return;
  }

  const sorted = Object.values(eventsMap)
    .filter((event) => event && typeof event.createdAt === "number")
    .sort((a, b) => a.createdAt - b.createdAt);

  const idsToDelete = sorted
    .slice(0, sorted.length - MAX_EVENTS)
    .map((e) => e.id);
  await Promise.all(
    idsToDelete.map((id) => remove(ref(db, `sessions/${code}/events/${id}`))),
  );
}

export async function publishSquadEvent(code, eventType, payload = {}) {
  const eventId = crypto.randomUUID();
  const event = {
    id: eventId,
    type: eventType,
    payload,
    createdAt: Date.now(),
  };

  await set(ref(db, `sessions/${code}/events/${eventId}`), event);

  const snapshot = await get(ref(db, `sessions/${code}/events`));
  if (snapshot.exists()) {
    await trimOldEvents(code, snapshot.val());
  }
}

export function createSession(playerName, selectedCategories, onUpdate) {
  const code = generateCode();
  const sessionRef = ref(db, `sessions/${code}`);
  const playerId = crypto.randomUUID();

  set(sessionRef, {
    createdAt: Date.now(),
    leaderId: playerId,
    filters: {
      selectedCategories,
      wheel: {
        enabled: true,
        manualMode: false,
        manualValuesText: "",
      },
    },
    players: {
      [playerId]: createPlayerRecord(playerName, "leader"),
    },
    events: {},
  }).then(() => {
    publishSquadEvent(code, "session-created", { by: playerName });
  });

  listenToSession(code, onUpdate);
  return { code, playerId };
}

export function joinSession(code, playerName, onUpdate, onNotFound) {
  const sessionRef = ref(db, `sessions/${code}`);
  const playerId = crypto.randomUUID();

  onValue(
    sessionRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        onNotFound();
        return;
      }

      const data = snapshot.val();
      if (isSessionExpired(data)) {
        onNotFound();
        return;
      }

      set(
        ref(db, `sessions/${code}/players/${playerId}`),
        createPlayerRecord(playerName, "member"),
      ).then(() => {
        publishSquadEvent(code, "member-joined", {
          playerId,
          by: playerName,
        });
      });

      listenToSession(code, onUpdate);
    },
    { onlyOnce: true },
  );

  return { playerId };
}

export function rejoinSession(
  code,
  playerId,
  playerName,
  onUpdate,
  onNotFound,
) {
  const sessionRef = ref(db, `sessions/${code}`);

  get(sessionRef).then((snapshot) => {
    if (!snapshot.exists()) {
      onNotFound();
      return;
    }

    const data = snapshot.val();
    if (isSessionExpired(data)) {
      onNotFound();
      return;
    }

    const players = data.players ?? {};
    const currentRole = players[playerId]?.role ?? "member";

    update(ref(db, `sessions/${code}/players/${playerId}`), {
      name: playerName,
      role: currentRole,
      lastSeenAt: Date.now(),
    }).then(() => {
      publishSquadEvent(code, "member-rejoined", {
        playerId,
        by: playerName,
      });
    });

    listenToSession(code, onUpdate);
  });

  return { playerId };
}

export function publishResult(code, playerId, result) {
  update(ref(db, `sessions/${code}/players/${playerId}`), {
    result,
    spinning: false,
    lastSeenAt: Date.now(),
  });
}

export function publishSpinning(code, playerId, isSpinning) {
  update(ref(db, `sessions/${code}/players/${playerId}`), {
    spinning: isSpinning,
    lastSeenAt: Date.now(),
  });
}

export function publishPresence(code, playerId) {
  update(ref(db, `sessions/${code}/players/${playerId}`), {
    lastSeenAt: Date.now(),
  });
}

export function publishSelectedCategories(code, playerId, selectedCategories) {
  update(ref(db, `sessions/${code}`), {
    leaderId: playerId,
  });

  set(
    ref(db, `sessions/${code}/filters/selectedCategories`),
    selectedCategories,
  ).then(() => {
    publishSquadEvent(code, "filters-updated", {
      by: playerId,
      selectedCategories,
    });
  });
}

export function publishWheelConfig(code, wheelConfig) {
  set(ref(db, `sessions/${code}/filters/wheel`), wheelConfig).then(() => {
    publishSquadEvent(code, "wheel-config-updated", {
      manualMode: wheelConfig.manualMode,
    });
  });
}

export function publishWheelSpin(code, playerId, spinPayload) {
  set(ref(db, `sessions/${code}/wheelSpin`), {
    ...spinPayload,
    initiatedBy: playerId,
    updatedAt: Date.now(),
  }).then(() => {
    publishSquadEvent(code, "wheel-spun", { by: playerId });
  });
}

export function publishZeroToHero(code, playerId, playerName) {
  set(ref(db, `sessions/${code}/zeroToHero`), {
    triggeredBy: playerId,
    triggeredByName: playerName,
    triggeredAt: Date.now(),
  }).then(() => {
    publishSquadEvent(code, "zero-to-hero", {
      by: playerId,
      byName: playerName,
    });
  });
}

export async function transferLeader(code, actorId, targetId) {
  const sessionRef = ref(db, `sessions/${code}`);
  const snapshot = await get(sessionRef);
  if (!snapshot.exists()) {
    return false;
  }

  const data = snapshot.val();
  if (data.leaderId !== actorId) {
    return false;
  }

  const players = data.players ?? {};
  if (!players[targetId]) {
    return false;
  }

  await update(ref(db, `sessions/${code}`), {
    leaderId: targetId,
  });

  await update(ref(db, `sessions/${code}/players/${actorId}`), {
    role: "member",
  });

  await update(ref(db, `sessions/${code}/players/${targetId}`), {
    role: "leader",
  });

  await publishSquadEvent(code, "leader-changed", {
    by: actorId,
    targetId,
  });

  return true;
}

export async function setPlayerRole(code, actorId, targetId, role) {
  if (!["member", "readonly"].includes(role)) {
    return false;
  }

  const sessionRef = ref(db, `sessions/${code}`);
  const snapshot = await get(sessionRef);
  if (!snapshot.exists()) {
    return false;
  }

  const data = snapshot.val();
  if (data.leaderId !== actorId || targetId === actorId) {
    return false;
  }

  const player = data.players?.[targetId];
  if (!player) {
    return false;
  }

  await update(ref(db, `sessions/${code}/players/${targetId}`), { role });
  await publishSquadEvent(code, "role-changed", {
    by: actorId,
    targetId,
    role,
  });

  return true;
}

export async function kickPlayer(code, actorId, targetId) {
  const sessionRef = ref(db, `sessions/${code}`);
  const snapshot = await get(sessionRef);
  if (!snapshot.exists()) {
    return false;
  }

  const data = snapshot.val();
  if (data.leaderId !== actorId || targetId === actorId) {
    return false;
  }

  const playerName = data.players?.[targetId]?.name ?? "Unbekannt";
  await remove(ref(db, `sessions/${code}/players/${targetId}`));
  await publishSquadEvent(code, "member-kicked", {
    by: actorId,
    targetId,
    playerName,
  });

  return true;
}

export async function cleanupInactivePlayers(code, actorId) {
  const sessionRef = ref(db, `sessions/${code}`);
  const snapshot = await get(sessionRef);
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  if (data.leaderId !== actorId) {
    return [];
  }

  const players = data.players ?? {};
  const inactiveIds = getInactivePlayerIds(
    players,
    data.leaderId,
    Date.now(),
    PRESENCE_TIMEOUT_MS,
  );

  for (const playerId of inactiveIds) {
    const playerName = players[playerId]?.name ?? "Unbekannt";
    await remove(ref(db, `sessions/${code}/players/${playerId}`));
    await publishSquadEvent(code, "member-timeout", {
      playerId,
      playerName,
      timeoutMs: PRESENCE_TIMEOUT_MS,
    });
  }

  return inactiveIds;
}

export function leaveSession(code, playerId) {
  const sessionRef = ref(db, `sessions/${code}`);

  get(sessionRef).then((snapshot) => {
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.val();
    const players = data.players ?? {};
    const isLeader = data.leaderId === playerId;
    const playerName = players[playerId]?.name ?? "Unbekannt";

    remove(ref(db, `sessions/${code}/players/${playerId}`)).then(() => {
      publishSquadEvent(code, "member-left", {
        by: playerId,
        byName: playerName,
      });
    });

    if (!isLeader) {
      return;
    }

    const remainingIds = Object.keys(players).filter((id) => id !== playerId);
    if (remainingIds.length === 0) {
      remove(sessionRef);
      return;
    }

    const nextLeaderId = remainingIds[0];
    update(ref(db, `sessions/${code}`), {
      leaderId: nextLeaderId,
    }).then(() => {
      update(ref(db, `sessions/${code}/players/${nextLeaderId}`), {
        role: "leader",
      });
      publishSquadEvent(code, "leader-changed", {
        by: playerId,
        targetId: nextLeaderId,
      });
    });
  });
}

function listenToSession(code, onUpdate) {
  const sessionRef = ref(db, `sessions/${code}`);
  onValue(sessionRef, (snapshot) => {
    if (!snapshot.exists()) {
      onUpdate(null);
      return;
    }
    onUpdate(snapshot.val());
  });
}
