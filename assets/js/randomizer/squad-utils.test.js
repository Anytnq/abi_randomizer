import {
  buildSquadStoragePayload,
  getInactivePlayerIds,
  getRecentEvents,
  isSquadStoragePayloadValid,
} from "./squad-utils.js";

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Test fehlgeschlagen: ${name}`);
  }
}

function testStoragePayloadValidation() {
  const payload = buildSquadStoragePayload("AB", "player-1", "Denni");
  assert("Storage payload valid", isSquadStoragePayloadValid(payload));

  const broken = { ...payload, checksum: "invalid" };
  assert("Storage checksum invalid", !isSquadStoragePayloadValid(broken));
}

function testRecentEventsSort() {
  const events = {
    a: { id: "a", createdAt: 1, type: "member-joined", payload: {} },
    b: { id: "b", createdAt: 9, type: "member-left", payload: {} },
    c: { id: "c", createdAt: 4, type: "role-changed", payload: {} },
  };

  const sorted = getRecentEvents(events, 2);
  assert("Recent events limit", sorted.length === 2);
  assert("Recent events order", sorted[0].id === "b" && sorted[1].id === "c");
}

function testInactivePlayerDetection() {
  const now = 1_000_000;
  const players = {
    leader: { lastSeenAt: now - 999_999 },
    active: { lastSeenAt: now - 5_000 },
    stale: { lastSeenAt: now - 200_000 },
    missing: {},
  };

  const ids = getInactivePlayerIds(players, "leader", now, 60_000);
  assert("Inactive contains stale", ids.includes("stale"));
  assert("Inactive contains missing", ids.includes("missing"));
  assert("Inactive excludes active", !ids.includes("active"));
  assert("Inactive excludes leader", !ids.includes("leader"));
}

export function runSquadUtilsTests() {
  testStoragePayloadValidation();
  testRecentEventsSort();
  testInactivePlayerDetection();
  return "Alle squad-utils Tests bestanden.";
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("runSquadTests") === "1") {
    try {
      const result = runSquadUtilsTests();
      console.log(result);
    } catch (error) {
      console.error(error);
    }
  }
}
