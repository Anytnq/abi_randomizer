import { loadV2State, saveV2State } from "./storage.js";

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Test fehlgeschlagen: ${name}`);
  }
}

function testDefaultStateOnEmptyStorage() {
  localStorage.removeItem("abi-randomizer:v2");
  const state = loadV2State();
  assert("default schemaVersion is 1", state.schemaVersion === 1);
  assert("default weaponHistory is an empty array", Array.isArray(state.weaponHistory) && state.weaponHistory.length === 0);
  assert("default lastLoadout is null", state.lastLoadout === null);
}

function testSaveLoadRoundtrip() {
  localStorage.removeItem("abi-randomizer:v2");
  saveV2State({ weaponHistory: ["AKM"], lastLoadout: { map: { name: "Farm" } } });
  const state = loadV2State();
  assert("weaponHistory roundtrips", state.weaponHistory[0] === "AKM");
  assert("lastLoadout roundtrips", state.lastLoadout.map.name === "Farm");
}

function testCorruptSchemaVersionResetsToDefault() {
  localStorage.setItem(
    "abi-randomizer:v2",
    JSON.stringify({ schemaVersion: 99, weaponHistory: ["stale"] }),
  );
  const state = loadV2State();
  assert(
    "mismatched schemaVersion falls back to a clean default state",
    state.schemaVersion === 1 && state.weaponHistory.length === 0,
  );
}

function testCorruptJsonResetsToDefault() {
  localStorage.setItem("abi-randomizer:v2", "{not json");
  const state = loadV2State();
  assert("invalid JSON falls back to default state", state.schemaVersion === 1);
}

export function runStorageTests() {
  testDefaultStateOnEmptyStorage();
  testSaveLoadRoundtrip();
  testCorruptSchemaVersionResetsToDefault();
  testCorruptJsonResetsToDefault();
  localStorage.removeItem("abi-randomizer:v2");
  return "Alle storage Tests bestanden.";
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("runV2Tests") === "1") {
    try {
      console.log(runStorageTests());
    } catch (error) {
      console.error(error);
    }
  }
}
