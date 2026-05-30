import { getMasterVolume, setMasterVolume } from "./randomizer/sound.js";

const MASTER_VOLUME_STORAGE_KEY = "masterVolumeLevel";

function loadMasterVolumePreference() {
  try {
    const raw = localStorage.getItem(MASTER_VOLUME_STORAGE_KEY);
    if (raw === null) {
      return getMasterVolume();
    }

    const parsed = Number.parseFloat(raw);
    if (!Number.isFinite(parsed)) {
      return getMasterVolume();
    }

    return Math.min(1, Math.max(0, parsed));
  } catch (_) {
    return getMasterVolume();
  }
}

function saveMasterVolumePreference(volume) {
  try {
    localStorage.setItem(MASTER_VOLUME_STORAGE_KEY, String(volume));
  } catch (_) {}
}

function updateVolumeValueLabel(volume) {
  const volumeValue =
    document.querySelector(".master-volume-value") ||
    document.getElementById("masterVolumeValue") ||
    document.getElementById("muschel-masterVolumeValue");
  if (!volumeValue) {
    return;
  }

  volumeValue.textContent = `${Math.round(volume * 100)}%`;
}

export function initVolumeControl() {
  const volumeSlider =
    document.querySelector(".master-volume-slider") ||
    document.getElementById("masterVolumeSlider") ||
    document.getElementById("muschel-masterVolumeSlider");
  if (!volumeSlider) {
    return;
  }

  const initialVolume = loadMasterVolumePreference();
  setMasterVolume(initialVolume);
  volumeSlider.value = String(Math.round(initialVolume * 100));
  updateVolumeValueLabel(initialVolume);

  volumeSlider.addEventListener("input", () => {
    const sliderValue = Number.parseInt(volumeSlider.value, 10);
    const normalizedVolume = Math.min(1, Math.max(0, sliderValue / 100));
    setMasterVolume(normalizedVolume);
    saveMasterVolumePreference(normalizedVolume);
    updateVolumeValueLabel(normalizedVolume);
  });
}
