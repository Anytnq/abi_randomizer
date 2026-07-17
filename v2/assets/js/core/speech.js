/* Browser-native TTS for the Magische Miesmuschel. No network service or
   API key is required; the browser/operating system supplies the voice. */

function getSpeechSynthesis() {
  return globalThis.speechSynthesis ?? null;
}

function findGermanVoice(synthesis) {
  const voices = synthesis.getVoices();
  return (
    voices.find((voice) => voice.lang.toLowerCase() === "de-de") ??
    voices.find((voice) => voice.lang.toLowerCase().startsWith("de")) ??
    null
  );
}

export function speakMuschelDecision(allowed, options = {}) {
  return speakMuschelAnswer(
    `Die magische Miesmuschel sagt: ${allowed ? "Ja" : "Nein"}.`,
    options,
  );
}

export function speakMuschelAnswer(answer, options = {}) {
  const synthesis = getSpeechSynthesis();
  const Utterance = globalThis.SpeechSynthesisUtterance;
  if (!synthesis || typeof Utterance !== "function") return false;

  synthesis.cancel();
  const utterance = new Utterance(String(answer ?? ""));
  utterance.lang = "de-DE";
  utterance.rate = 0.88;
  utterance.pitch = 0.82;
  const requestedVolume = Number(options.volume);
  utterance.volume = Number.isFinite(requestedVolume)
    ? Math.min(1, Math.max(0, requestedVolume))
    : 1;

  const voice = findGermanVoice(synthesis);
  if (voice) utterance.voice = voice;
  synthesis.speak(utterance);
  return true;
}

export function cancelMuschelSpeech() {
  getSpeechSynthesis()?.cancel();
}
