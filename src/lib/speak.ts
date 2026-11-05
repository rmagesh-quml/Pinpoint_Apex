// Read an answer aloud, but only with an on-device voice (localService), so
// no audio or text leaves the phone. If none exists, the answer is text only.
export function speakLocal(text: string): boolean {
  if (!('speechSynthesis' in window)) return false;
  const voices = speechSynthesis.getVoices().filter((v) => v.localService && v.lang.startsWith('en'));
  if (!voices.length) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voices.find((v) => v.default) ?? voices[0];
  u.rate = 1;
  speechSynthesis.speak(u);
  return true;
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
