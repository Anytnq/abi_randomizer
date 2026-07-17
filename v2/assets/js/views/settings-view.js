/* Settings View (Planungs.md 4: Sound / Animationen / Streamer-Modus /
   Daten zurücksetzen). Volume reuses v1's pure Web Audio helpers
   (Planungs.md 3) - Motion/Streamer overrides are applied globally via
   data-attributes on <html> (see base.css), same mechanism bootstrap.js
   uses to restore them on load. */

import {
  setHeroVolume,
  setMasterVolume,
} from "../../../../assets/js/randomizer/sound.js";
import { loadV2State, saveV2State, resetV2Data } from "../core/storage.js";
import { showConfirmDialog } from "../components/event-overlay.js";

const STREAMER_LABELS = {
  off: "Aus",
  transparent: "Transparent",
  greenscreen: "Greenscreen",
};

export function render(outlet) {
  let settings = loadV2State().settings;

  const header = document.createElement("div");
  header.className = "randomizer-view-header";
  header.innerHTML = `<h1 class="randomizer-view-title">Einstellungen</h1>`;

  const content = document.createElement("div");
  content.className = "settings-content";

  outlet.append(header, content);

  function saveSettings(patch) {
    settings = { ...settings, ...patch };
    saveV2State({ settings });
  }

  function applyReducedMotion(enabled) {
    document.documentElement.dataset.reducedMotion = String(enabled);
  }

  function applyStreamerMode(mode) {
    document.documentElement.dataset.streamer = mode;
  }

  // --- Sound ---
  const soundSection = document.createElement("section");
  soundSection.className = "card card-body settings-section";
  const soundHeading = document.createElement("h2");
  soundHeading.className = "wheel-side-heading";
  soundHeading.textContent = "Sound";
  const volumeLabel = document.createElement("label");
  volumeLabel.className = "squad-field-label settings-volume-label";
  volumeLabel.textContent = "Lautstärke";
  const volumeSlider = document.createElement("input");
  volumeSlider.type = "range";
  volumeSlider.min = "0";
  volumeSlider.max = "100";
  volumeSlider.value = String(Math.round(settings.masterVolume * 100));
  const volumeValue = document.createElement("span");
  volumeValue.className = "settings-volume-value";
  volumeValue.textContent = `${Math.round(settings.masterVolume * 100)}%`;
  volumeLabel.append(volumeSlider);
  volumeSlider.addEventListener("input", () => {
    const volume = Math.min(1, Math.max(0, Number(volumeSlider.value) / 100));
    setMasterVolume(volume);
    saveSettings({ masterVolume: volume });
    volumeValue.textContent = `${Math.round(volume * 100)}%`;
  });
  soundSection.append(soundHeading, volumeLabel, volumeValue);

  const heroVolumeLabel = document.createElement("label");
  heroVolumeLabel.className = "squad-field-label settings-volume-label";
  heroVolumeLabel.textContent = "I Need a Hero";
  const heroVolumeSlider = document.createElement("input");
  heroVolumeSlider.type = "range";
  heroVolumeSlider.min = "0";
  heroVolumeSlider.max = "100";
  heroVolumeSlider.step = "1";
  heroVolumeSlider.value = String(Math.round(settings.heroVolume * 100));
  const heroVolumeValue = document.createElement("span");
  heroVolumeValue.className = "settings-volume-value";
  heroVolumeValue.textContent = `${Math.round(settings.heroVolume * 100)}%`;
  heroVolumeLabel.append(heroVolumeSlider);
  heroVolumeSlider.addEventListener("input", () => {
    const volume = Math.min(
      1,
      Math.max(0, Number(heroVolumeSlider.value) / 100),
    );
    setHeroVolume(volume);
    saveSettings({ heroVolume: volume });
    heroVolumeValue.textContent = `${Math.round(volume * 100)}%`;
  });
  soundSection.append(heroVolumeLabel, heroVolumeValue);

  // --- Animationen ---
  const motionSection = document.createElement("section");
  motionSection.className = "card card-body settings-section";
  const motionHeading = document.createElement("h2");
  motionHeading.className = "wheel-side-heading";
  motionHeading.textContent = "Animationen";
  const motionBtn = document.createElement("button");
  motionBtn.type = "button";
  motionBtn.className = "btn btn--secondary";
  function renderMotionBtn() {
    motionBtn.setAttribute("aria-pressed", String(settings.reducedMotion));
    motionBtn.textContent = settings.reducedMotion
      ? "Animationen reduziert"
      : "Animationen normal";
  }
  renderMotionBtn();
  motionBtn.addEventListener("click", () => {
    const next = !settings.reducedMotion;
    applyReducedMotion(next);
    saveSettings({ reducedMotion: next });
    renderMotionBtn();
  });
  motionSection.append(motionHeading, motionBtn);

  // --- Streamer-Modus ---
  const streamerSection = document.createElement("section");
  streamerSection.className = "card card-body settings-section";
  const streamerHeading = document.createElement("h2");
  streamerHeading.className = "wheel-side-heading";
  streamerHeading.textContent = "Streamer-Modus";
  const streamerRow = document.createElement("div");
  streamerRow.className = "settings-streamer-row";
  function renderStreamerButtons() {
    streamerRow.replaceChildren();
    Object.entries(STREAMER_LABELS).forEach(([mode, label]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "btn " + (settings.streamerMode === mode ? "btn--primary" : "btn--secondary");
      btn.setAttribute("aria-pressed", String(settings.streamerMode === mode));
      btn.textContent = label;
      btn.addEventListener("click", () => {
        applyStreamerMode(mode);
        saveSettings({ streamerMode: mode });
        renderStreamerButtons();
      });
      streamerRow.appendChild(btn);
    });
  }
  renderStreamerButtons();
  streamerSection.append(streamerHeading, streamerRow);

  // --- Daten zurücksetzen ---
  const dataSection = document.createElement("section");
  dataSection.className = "card card-body settings-section";
  const dataHeading = document.createElement("h2");
  dataHeading.className = "wheel-side-heading";
  dataHeading.textContent = "Daten";
  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "btn btn--danger";
  resetBtn.textContent = "Daten zurücksetzen";
  resetBtn.addEventListener("click", async () => {
    const confirmed = await showConfirmDialog({
      title: "Daten zurücksetzen",
      text: "Loadout-Verlauf, Filter, Wheel-Werte, Miesmuschel-Verlauf und Einstellungen werden gelöscht. Die aktive Squad-Session bleibt bestehen. Fortfahren?",
      confirmLabel: "Zurücksetzen",
      danger: true,
    });
    if (!confirmed) return;
    resetV2Data();
    settings = loadV2State().settings;
    applyReducedMotion(settings.reducedMotion);
    applyStreamerMode(settings.streamerMode);
    volumeSlider.value = String(Math.round(settings.masterVolume * 100));
    volumeValue.textContent = `${Math.round(settings.masterVolume * 100)}%`;
    setMasterVolume(settings.masterVolume);
    heroVolumeSlider.value = String(Math.round(settings.heroVolume * 100));
    heroVolumeValue.textContent = `${Math.round(settings.heroVolume * 100)}%`;
    setHeroVolume(settings.heroVolume);
    renderMotionBtn();
    renderStreamerButtons();
  });
  dataSection.append(dataHeading, resetBtn);

  content.append(soundSection, motionSection, streamerSection, dataSection);

  return null;
}
