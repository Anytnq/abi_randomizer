import { createGunGameEngine } from "./gungame-engine.js";

function assert(name, condition) {
  if (!condition) {
    throw new Error(`Test fehlgeschlagen: ${name}`);
  }
}

function testRegenerateClampsStageCount() {
  const engine = createGunGameEngine();
  const tooLow = engine.regenerate(1);
  assert("stage count clamps up to MIN_STAGES", tooLow.route.length === 3);

  const tooHigh = engine.regenerate(999);
  assert("stage count clamps down to MAX_STAGES", tooHigh.route.length === 30);
}

function testCompleteRaidAdvancesAndFinalizes() {
  // 3-stage route: completing stage 0 -> advance to 1, completing stage 1 ->
  // advance to 2 (last), completing stage 2 -> final (index does not
  // advance past the last stage, mirrors v1's exact semantics).
  const engine = createGunGameEngine();
  engine.regenerate(3);

  const first = engine.completeRaid(0);
  assert("first raid advances to stage index 1", first.currentIndex === 1);
  assert("first raid is not final", first.isFinal === false);

  const second = engine.completeRaid(0);
  assert("second raid advances to stage index 2 (last)", second.currentIndex === 2);
  assert("second raid is not yet final", second.isFinal === false);

  const third = engine.completeRaid(0);
  assert("third raid stays at the last stage index", third.currentIndex === 2);
  assert("third raid is final (no next stage)", third.isFinal === true);
}

function testResetReturnsToStart() {
  const engine = createGunGameEngine();
  engine.regenerate(5);
  engine.completeRaid(0);
  engine.completeRaid(0);
  const { currentIndex } = engine.reset();
  assert("reset returns to stage index 0", currentIndex === 0);
}

function testNavigationClampsAtBounds() {
  const engine = createGunGameEngine();
  engine.regenerate(3);
  const atStart = engine.moveToPrevious();
  assert("moveToPrevious clamps at 0", atStart.currentIndex === 0);

  engine.moveToNext();
  engine.moveToNext();
  const atEnd = engine.moveToNext();
  assert("moveToNext clamps at route.length - 1", atEnd.currentIndex === 2);
}

export function runGunGameEngineTests() {
  testRegenerateClampsStageCount();
  testCompleteRaidAdvancesAndFinalizes();
  testResetReturnsToStart();
  testNavigationClampsAtBounds();
  return "Alle gungame-engine Tests bestanden.";
}

if (typeof window !== "undefined") {
  const params = new URLSearchParams(window.location.search);
  if (params.get("runV2Tests") === "1") {
    try {
      console.log(runGunGameEngineTests());
    } catch (error) {
      console.error(error);
    }
  }
}
