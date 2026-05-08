export const SQUAD_STORAGE_VERSION = 2;
export const SQUAD_STORAGE_TTL_MS = 6 * 60 * 60 * 1000;

export function buildSquadStorageChecksum(code, playerId, playerName, version) {
  return `${code}:${playerId}:${playerName}:${version}`;
}

export function buildSquadStoragePayload(code, playerId, playerName) {
  const savedAt = Date.now();
  const checksum = buildSquadStorageChecksum(
    code,
    playerId,
    playerName,
    SQUAD_STORAGE_VERSION,
  );

  return {
    code,
    playerId,
    playerName,
    savedAt,
    version: SQUAD_STORAGE_VERSION,
    checksum,
  };
}

export function isSquadStoragePayloadValid(payload, now = Date.now()) {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  if (
    typeof payload.code !== "string" ||
    typeof payload.playerId !== "string" ||
    typeof payload.playerName !== "string"
  ) {
    return false;
  }

  if (
    typeof payload.savedAt !== "number" ||
    typeof payload.version !== "number" ||
    typeof payload.checksum !== "string"
  ) {
    return false;
  }

  if (payload.version !== SQUAD_STORAGE_VERSION) {
    return false;
  }

  if (now - payload.savedAt > SQUAD_STORAGE_TTL_MS) {
    return false;
  }

  const expected = buildSquadStorageChecksum(
    payload.code,
    payload.playerId,
    payload.playerName,
    payload.version,
  );

  return expected === payload.checksum;
}

export function getRecentEvents(eventMap, limit = 12) {
  if (!eventMap || typeof eventMap !== "object") {
    return [];
  }

  return Object.values(eventMap)
    .filter((event) => event && typeof event.createdAt === "number")
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

export function getInactivePlayerIds(players, leaderId, now, timeoutMs) {
  if (!players || typeof players !== "object") {
    return [];
  }

  return Object.entries(players)
    .filter(([playerId, player]) => {
      if (playerId === leaderId) {
        return false;
      }
      if (!player || typeof player.lastSeenAt !== "number") {
        return true;
      }
      return now - player.lastSeenAt > timeoutMs;
    })
    .map(([playerId]) => playerId);
}
