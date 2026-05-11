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

function playTone(ctx, { type, freqStart, freqEnd, freqRamp = "exponential", freqRampTime, gainPeak, attackTime, decayTime, stopTime }) {
  const now = ctx.currentTime;
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(freqStart, now);
  if (freqEnd !== undefined) {
    if (freqRamp === "linear") {
      oscillator.frequency.linearRampToValueAtTime(freqEnd, now + freqRampTime);
    } else {
      oscillator.frequency.exponentialRampToValueAtTime(freqEnd, now + freqRampTime);
    }
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + attackTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + decayTime);

  oscillator.connect(gain);
  connectGainToOutput(ctx, gain);

  oscillator.start(now);
  oscillator.stop(now + stopTime);
}

function playClick(ctx) {
  playTone(ctx, {
    type: "square",
    freqStart: 900 + Math.random() * 300,
    gainPeak: 0.06,
    attackTime: 0.005,
    decayTime: 0.05,
    stopTime: 0.055,
  });
}

function playFinishTone(ctx) {
  playTone(ctx, {
    type: "triangle",
    freqStart: 660,
    freqEnd: 990,
    freqRamp: "linear",
    freqRampTime: 0.12,
    gainPeak: 0.09,
    attackTime: 0.02,
    decayTime: 0.1,
    stopTime: 0.11,
  });
}

function playWhooshTone(ctx) {
  playTone(ctx, {
    type: "sawtooth",
    freqStart: 180,
    freqEnd: 780,
    freqRampTime: 0.28,
    gainPeak: 0.05,
    attackTime: 0.03,
    decayTime: 0.3,
    stopTime: 0.32,
  });
}

function playLowBloop(ctx) {
  playTone(ctx, {
    type: "triangle",
    freqStart: 240,
    freqEnd: 130,
    freqRampTime: 0.22,
    gainPeak: 0.08,
    attackTime: 0.02,
    decayTime: 0.24,
    stopTime: 0.26,
  });
}

function playHighChime(ctx) {
  playTone(ctx, {
    type: "sine",
    freqStart: 520,
    freqEnd: 860,
    freqRamp: "linear",
    freqRampTime: 0.16,
    gainPeak: 0.06,
    attackTime: 0.02,
    decayTime: 0.2,
    stopTime: 0.22,
  });
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
