import {
  ref,
  set,
  onValue,
  remove,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.8.1/firebase-database.js";
import { db } from "./firebase.js";

const SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 Stunden

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join("");
}

export function createSession(playerName, onUpdate) {
  const code = generateCode();
  const sessionRef = ref(db, `sessions/${code}`);
  const playerId = crypto.randomUUID();

  set(sessionRef, {
    createdAt: Date.now(),
    players: {
      [playerId]: {
        name: playerName,
        result: null,
        spinning: false,
        joinedAt: Date.now(),
      },
    },
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
      const age = Date.now() - (data.createdAt ?? 0);
      if (age > SESSION_TTL_MS) {
        onNotFound();
        return;
      }

      set(ref(db, `sessions/${code}/players/${playerId}`), {
        name: playerName,
        result: null,
        spinning: false,
        joinedAt: Date.now(),
      });

      listenToSession(code, onUpdate);
    },
    { onlyOnce: true },
  );

  return { playerId };
}

export function publishResult(code, playerId, result) {
  set(ref(db, `sessions/${code}/players/${playerId}/result`), result);
  set(ref(db, `sessions/${code}/players/${playerId}/spinning`), false);
}

export function publishSpinning(code, playerId, isSpinning) {
  set(ref(db, `sessions/${code}/players/${playerId}/spinning`), isSpinning);
}

export function leaveSession(code, playerId) {
  remove(ref(db, `sessions/${code}/players/${playerId}`));
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
