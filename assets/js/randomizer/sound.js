let audioContext;
let tickIntervalId = null;
let stopTimeoutId = null;
let heroAudio = null;
let heroFadeIntervalId = null;
let masterGainNode = null;
let masterVolume = 0.6;

const HERO_TRACK_PATH = "./assets/audio/i-need-a-hero.mp3";
const HERO_FADE_IN_MS = 800;
const HERO_TARGET_MULTIPLIER = 0.9;

function clampVolume(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0.6;
  }

  return Math.min(1, Math.max(0, parsed));
}

function getMasterGainNode(ctx) {
  if (!masterGainNode) {
    masterGainNode = ctx.createGain();
    masterGainNode.gain.setValueAtTime(masterVolume, ctx.currentTime);
    masterGainNode.connect(ctx.destination);
  }

  return masterGainNode;
}

function connectGainToOutput(ctx, gainNode) {
  gainNode.connect(getMasterGainNode(ctx));
}

function getHeroTrackTargetVolume() {
  return Math.min(1, masterVolume * HERO_TARGET_MULTIPLIER);
}

function applyHeroAudioVolume() {
  if (!heroAudio) {
    return;
  }

  if (heroAudio.dataset.fadingIn === "1") {
    return;
  }

  heroAudio.volume = getHeroTrackTargetVolume();
}

function ensureAudioContext() {
  if (!window.AudioContext && !window.webkitAudioContext) {
    return null;
  }

  if (!audioContext) {
    const ContextConstructor = window.AudioContext || window.webkitAudioContext;
    audioContext = new ContextConstructor();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }

  getMasterGainNode(audioContext);

  return audioContext;
}

function playClick(ctx) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(900 + Math.random() * 300, now);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

  oscillator.connect(gain);
  connectGainToOutput(ctx, gain);

  oscillator.start(now);
  oscillator.stop(now + 0.055);
}

function playFinishTone(ctx) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(660, now);
  oscillator.frequency.linearRampToValueAtTime(990, now + 0.12);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);

  oscillator.connect(gain);
  connectGainToOutput(ctx, gain);

  oscillator.start(now);
  oscillator.stop(now + 0.11);
}

function playWhooshTone(ctx) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sawtooth";
  oscillator.frequency.setValueAtTime(180, now);
  oscillator.frequency.exponentialRampToValueAtTime(780, now + 0.28);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.05, now + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

  oscillator.connect(gain);
  connectGainToOutput(ctx, gain);

  oscillator.start(now);
  oscillator.stop(now + 0.32);
}

function playLowBloop(ctx) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(240, now);
  oscillator.frequency.exponentialRampToValueAtTime(130, now + 0.22);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);

  oscillator.connect(gain);
  connectGainToOutput(ctx, gain);

  oscillator.start(now);
  oscillator.stop(now + 0.26);
}

function playHighChime(ctx) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(520, now);
  oscillator.frequency.linearRampToValueAtTime(860, now + 0.16);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);

  oscillator.connect(gain);
  connectGainToOutput(ctx, gain);

  oscillator.start(now);
  oscillator.stop(now + 0.22);
}

export function stopSpinSound() {
  if (tickIntervalId !== null) {
    window.clearInterval(tickIntervalId);
    tickIntervalId = null;
  }

  if (stopTimeoutId !== null) {
    window.clearTimeout(stopTimeoutId);
    stopTimeoutId = null;
  }
}

export function playSpinSound(durationMs) {
  if (isHeroSongPlaying()) {
    return;
  }

  stopSpinSound();

  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  playClick(ctx);
  tickIntervalId = window.setInterval(() => playClick(ctx), 105);

  const finishLeadMs = 110;
  const finishAtMs = Math.max(120, durationMs - finishLeadMs);

  stopTimeoutId = window.setTimeout(() => {
    stopSpinSound();
    playFinishTone(ctx);
  }, finishAtMs);
}

export function playCrateRevealSound() {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  playWhooshTone(ctx);
  window.setTimeout(() => playFinishTone(ctx), 220);
}

export function playmuschelDecisionSound(allowed) {
  const ctx = ensureAudioContext();
  if (!ctx) {
    return;
  }

  if (allowed) {
    playHighChime(ctx);
    window.setTimeout(() => playFinishTone(ctx), 120);
    return;
  }

  playLowBloop(ctx);
}

export function stopHeroSong() {
  if (heroFadeIntervalId !== null) {
    window.clearInterval(heroFadeIntervalId);
    heroFadeIntervalId = null;
  }

  if (!heroAudio) {
    return;
  }

  heroAudio.dataset.fadingIn = "0";
  heroAudio.pause();
  heroAudio.currentTime = 0;
}

export function isHeroSongPlaying() {
  return Boolean(heroAudio && !heroAudio.paused && !heroAudio.ended);
}

export function playHeroSong() {
  stopHeroSong();

  const audio = new Audio(HERO_TRACK_PATH);
  audio.preload = "auto";
  audio.volume = 0;
  audio.dataset.fadingIn = "1";
  audio.addEventListener(
    "ended",
    () => {
      audio.dataset.fadingIn = "0";
    },
    { once: true },
  );

  heroAudio = audio;

  audio
    .play()
    .then(() => {
      const targetVolume = getHeroTrackTargetVolume();
      const stepMs = 50;
      const steps = Math.max(1, Math.floor(HERO_FADE_IN_MS / stepMs));
      const stepValue = targetVolume / steps;
      let currentVolume = 0;

      heroFadeIntervalId = window.setInterval(() => {
        if (!heroAudio || heroAudio !== audio || heroAudio.paused) {
          window.clearInterval(heroFadeIntervalId);
          heroFadeIntervalId = null;
          return;
        }

        currentVolume = Math.min(targetVolume, currentVolume + stepValue);
        heroAudio.volume = currentVolume;

        if (currentVolume >= targetVolume) {
          heroAudio.dataset.fadingIn = "0";
          window.clearInterval(heroFadeIntervalId);
          heroFadeIntervalId = null;
        }
      }, stepMs);
    })
    .catch(() => {
      const ctx = ensureAudioContext();
      if (!ctx) {
        return;
      }

      // Fallback fanfare if no local hero track is available.
      playHighChime(ctx);
      window.setTimeout(() => playHighChime(ctx), 160);
      window.setTimeout(() => playFinishTone(ctx), 320);
    });
}

export function setMasterVolume(volume) {
  masterVolume = clampVolume(volume);

  const ctx = ensureAudioContext();
  if (ctx && masterGainNode) {
    masterGainNode.gain.setValueAtTime(masterVolume, ctx.currentTime);
  }

  applyHeroAudioVolume();
}

export function getMasterVolume() {
  return masterVolume;
}
