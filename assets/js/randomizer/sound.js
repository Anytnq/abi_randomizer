let audioContext;
let tickIntervalId = null;
let stopTimeoutId = null;
let heroAudio = null;

const HERO_TRACK_PATH = "./assets/audio/i-need-a-hero.mp3";

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
  gain.connect(ctx.destination);

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
  gain.connect(ctx.destination);

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
  gain.connect(ctx.destination);

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
  gain.connect(ctx.destination);

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
  gain.connect(ctx.destination);

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

export function playMusselDecisionSound(allowed) {
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
  if (!heroAudio) {
    return;
  }

  heroAudio.pause();
  heroAudio.currentTime = 0;
}

export function playHeroSong() {
  stopHeroSong();

  const audio = new Audio(HERO_TRACK_PATH);
  audio.preload = "auto";
  audio.volume = 0.5;

  heroAudio = audio;

  audio.play().catch(() => {
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
