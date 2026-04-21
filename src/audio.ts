let globalAudioCtx: AudioContext | null = null;

const ensureAudioContext = () => {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  if (globalAudioCtx.state === "suspended") {
    void globalAudioCtx.resume();
  }

  return globalAudioCtx;
};

export const playSound = (frequency: number, type: OscillatorType, duration: number, volume: number = 0.1) => {
  try {
    const audioCtx = ensureAudioContext();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (error) {
    console.warn("Audio playback failed", error);
  }
};

export const sounds = {
  hit: () => playSound(440, "square", 0.1),
  wall: () => playSound(220, "square", 0.05),
  score: () => {
    playSound(523.25, "square", 0.1);
    setTimeout(() => playSound(659.25, "square", 0.1), 100);
    setTimeout(() => playSound(783.99, "square", 0.2), 200);
  },
  gameOver: () => {
    playSound(392, "square", 0.2);
    setTimeout(() => playSound(349.23, "square", 0.2), 200);
    setTimeout(() => playSound(329.63, "square", 0.4), 400);
  },
  start: () => playSound(880, "square", 0.1),
} as const;
