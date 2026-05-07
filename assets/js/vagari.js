const AD_LINES = [
  "1000% LOOT BOOST - TOTALLY LEGIT",
  "FREE SKIN IN 3 CLICKS",
  "MOUSE DPI HACK FOR PROS",
  "ULTRA VIP GAMER CHAIR NOW",
  "CLICK HERE TO LEVEL YOUR AIM",
  "SECRET DEV BUTTON FOUND",
  "DOWNLOAD MORE RAM TODAY",
  "SPIN AGAIN FOR DOUBLE CHAOS",
  "YOUR RNG IS NOW SUBSCRIBED",
  "UNLIMITED ENERGY DRINK CODE",
  "GOLDEN TOASTER GIVEAWAY",
  "ANTI-TILT CERTIFIED MAGIC",
];

const AD_IMAGE_FILES = [
  "2024-Siegessaule-Telefonsex-Anzeigen_2.width-720.png",
  "216110123-korsch-kalender-sexy-girls-mehrfarbig.jpg",
  "depositphotos_143762643-stock-photo-beautiful-erotic-girl-in-lace.jpg",
  "depositphotos_565783286-stock-photo-beautiful-girl-black-lace-lingerie.jpg",
  "erotikclub.avif",
  "Jason-Lewis-1.webp",
  "s-l300.jpg",
  "teletext_sexwerbung_ov__W500xh0.jpg",
];

const NOTE_SEQUENCE = [
  262, 330, 392, 494, 392, 330, 523, 659, 587, 494, 440, 392,
];

export function initializeVagariMode() {
  const button = document.getElementById("vagariModeBtn");

  if (!button) {
    return;
  }

  const state = {
    active: false,
    audioContext: null,
    tickIntervalId: null,
    sequenceIndex: 0,
    adsLayer: null,
  };

  button.addEventListener("click", async () => {
    if (state.active) {
      disableMode(state, button);
      return;
    }

    enableMode(state, button);
    await startChipMusic(state);
  });
}

function enableMode(state, button) {
  state.active = true;
  document.body.classList.add("vagari-mode-active");
  button.classList.add("active");
  button.textContent = "Vagari Mode: ON";

  if (!state.adsLayer) {
    state.adsLayer = createAdsLayer();
    document.body.appendChild(state.adsLayer);
  }

  state.adsLayer.hidden = false;
  renderAds(state.adsLayer);
}

function disableMode(state, button) {
  state.active = false;
  document.body.classList.remove("vagari-mode-active");
  button.classList.remove("active");
  button.textContent = "Vagari Mode";

  if (state.adsLayer) {
    state.adsLayer.hidden = true;
  }

  if (state.tickIntervalId) {
    clearInterval(state.tickIntervalId);
    state.tickIntervalId = null;
  }
}

async function startChipMusic(state) {
  if (!state.audioContext) {
    state.audioContext = new window.AudioContext();
  }

  if (state.audioContext.state === "suspended") {
    await state.audioContext.resume();
  }

  if (state.tickIntervalId) {
    clearInterval(state.tickIntervalId);
  }

  state.sequenceIndex = 0;
  state.tickIntervalId = setInterval(() => {
    if (!state.active) {
      return;
    }

    const base = NOTE_SEQUENCE[state.sequenceIndex % NOTE_SEQUENCE.length];
    const note = base + (Math.random() > 0.7 ? 24 : 0);
    playChipNote(state.audioContext, note, 0.13);
    state.sequenceIndex += 1;
  }, 125);
}

function playChipNote(audioContext, frequency, durationSeconds) {
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);

  gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(
    0.22,
    audioContext.currentTime + 0.015,
  );
  gain.gain.exponentialRampToValueAtTime(
    0.0001,
    audioContext.currentTime + durationSeconds,
  );

  oscillator.connect(gain);
  gain.connect(audioContext.destination);

  oscillator.start();
  oscillator.stop(audioContext.currentTime + durationSeconds + 0.02);
}

function createAdsLayer() {
  const layer = document.createElement("div");
  layer.className = "vagari-ads-layer";
  layer.setAttribute("aria-hidden", "true");
  return layer;
}

function renderAds(layer) {
  layer.replaceChildren();

  const adCount = 26;

  for (let index = 0; index < adCount; index += 1) {
    const ad = document.createElement("article");
    ad.className = "vagari-ad";

    const image = document.createElement("img");
    image.className = "vagari-ad-image";
    image.loading = "lazy";
    image.decoding = "async";
    image.src = buildImageUrl(pickImageFile(index));
    image.alt = "Vagari Werbung";

    const caption = document.createElement("p");
    caption.className = "vagari-ad-caption";
    caption.textContent = AD_LINES[index % AD_LINES.length];

    ad.append(image, caption);

    const top = Math.floor(Math.random() * 90);
    const left = Math.floor(Math.random() * 88);
    const rotate = Math.floor(Math.random() * 36) - 18;
    const delay = (index % 7) * 0.09;

    ad.style.top = `${top}%`;
    ad.style.left = `${left}%`;
    ad.style.transform = `translate(-50%, -50%) rotate(${rotate}deg)`;
    ad.style.animationDelay = `${delay}s`;

    layer.appendChild(ad);
  }
}

function pickImageFile(index) {
  const randomOffset = Math.floor(Math.random() * AD_IMAGE_FILES.length);
  const imageIndex = (index + randomOffset) % AD_IMAGE_FILES.length;
  return AD_IMAGE_FILES[imageIndex];
}

function buildImageUrl(fileName) {
  return new URL(`../pictures/${fileName}`, import.meta.url).href;
}
