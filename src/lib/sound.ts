"use client";

export type SoundCue =
  | "cash-register"
  | "sad-trombone"
  | "margin-call"
  | "titanic-flute"
  | "copium-alarm";

type BrowserAudioWindow = Window & {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
};

function getAudioContext(): AudioContext | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const audioWindow = window as BrowserAudioWindow;
  const AudioCtor = audioWindow.AudioContext ?? audioWindow.webkitAudioContext;

  return AudioCtor ? new AudioCtor() : undefined;
}

function tone(
  context: AudioContext,
  frequency: number,
  start: number,
  duration: number,
  type: OscillatorType,
  volume = 0.12
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.04);
}

export function playCue(cue: SoundCue) {
  const context = getAudioContext();
  if (!context) {
    return;
  }

  const now = context.currentTime;

  if (cue === "cash-register") {
    tone(context, 1568, now, 0.08, "triangle", 0.11);
    tone(context, 2093, now + 0.08, 0.1, "triangle", 0.13);
    tone(context, 2637, now + 0.18, 0.12, "square", 0.07);
    return;
  }

  if (cue === "sad-trombone") {
    [349, 330, 294, 247].forEach((frequency, index) => {
      tone(context, frequency, now + index * 0.19, 0.22, "sawtooth", 0.1);
    });
    return;
  }

  if (cue === "margin-call") {
    [880, 660, 880, 440, 330].forEach((frequency, index) => {
      tone(context, frequency, now + index * 0.11, 0.1, "square", 0.08);
    });
    return;
  }

  if (cue === "titanic-flute") {
    [523, 587, 659, 587, 523].forEach((frequency, index) => {
      tone(context, frequency, now + index * 0.16, 0.22, "sine", 0.07);
    });
    return;
  }

  [220, 220, 196, 185, 174].forEach((frequency, index) => {
    tone(context, frequency, now + index * 0.09, 0.08, "sawtooth", 0.08);
  });
}

export function playAlertSequence() {
  playCue("cash-register");
  window.setTimeout(() => playCue("sad-trombone"), 360);
}
