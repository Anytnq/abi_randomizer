/* Versioned v2 storage schema (Planungs.md 3: "Migration auf ein
   versioniertes v2-Schema"). Deliberately its own namespace, separate from
   v1's raw localStorage keys - v1 keeps running untouched, v2 starts with a
   clean profile. Importing/migrating actual v1 data is a separate task
   (Planungs.md 13.6 is still open), not done here. */

const STORAGE_KEY = "abi-randomizer:v2";
const SCHEMA_VERSION = 1;

function defaultState() {
  return {
    schemaVersion: SCHEMA_VERSION,
    weaponHistory: [],
    lastLoadout: null,
    filters: null,
    wheelValues: [],
    muschelHistory: [],
    settings: {
      masterVolume: 0.6,
      reducedMotion: false,
      streamerMode: "off",
    },
  };
}

export function loadV2State() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schemaVersion !== SCHEMA_VERSION) {
      return defaultState();
    }

    return { ...defaultState(), ...parsed };
  } catch {
    return defaultState();
  }
}

export function saveV2State(patch) {
  try {
    const current = loadV2State();
    const next = { ...current, ...patch, schemaVersion: SCHEMA_VERSION };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

/** Settings-View "Daten zurücksetzen" - wipes the whole v2 profile (not the
    live Squad session, that's network state, not local data). */
export function resetV2Data() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}
