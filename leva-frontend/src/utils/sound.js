let audioContext = null;

const SOUND_SOURCES = {
  chime: '/sounds/chime.mp3',
  celebration: '/sounds/celebration.mp3',
};

const preloadedAudioMap = new Map();

const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  const ContextClass = window.AudioContext || window.webkitAudioContext;
  if (!ContextClass) return null;

  if (!audioContext) audioContext = new ContextClass();
  return audioContext;
};

const playOscillatorFallback = ({ duration = 0.24, frequency = 800, volume = 0.3 } = {}) => {
  const ctx = getAudioContext();
  if (!ctx) return false;

  try {
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(now);
    oscillator.stop(now + duration + 0.03);
    return true;
  } catch {
    return false;
  }
};

const getFallbackOptions = (effectName) => {
  if (effectName === 'celebration') {
    return { duration: 0.92, frequency: 980, volume: 0.32 };
  }

  return { duration: 0.22, frequency: 880, volume: 0.28 };
};

const primeAudioElement = (audioElement) => {
  audioElement.preload = 'auto';
  audioElement.load();
};

export const preloadSoundEffects = () => {
  if (typeof window === 'undefined') return;

  Object.entries(SOUND_SOURCES).forEach(([effectName, source]) => {
    if (preloadedAudioMap.has(effectName)) return;

    try {
      const audioEl = new Audio(source);
      primeAudioElement(audioEl);
      preloadedAudioMap.set(effectName, audioEl);
    } catch {
      // Ignore preload failures; playback will fallback silently.
    }
  });
};

export const playSoundEffect = (effectName = 'chime') => {
  const fallbackOptions = getFallbackOptions(effectName);

  if (typeof window === 'undefined') {
    return playOscillatorFallback(fallbackOptions);
  }

  try {
    if (!preloadedAudioMap.has(effectName)) preloadSoundEffects();

    const preloadedAudio = preloadedAudioMap.get(effectName);
    if (!preloadedAudio) return playOscillatorFallback(fallbackOptions);

    const playbackAudio = preloadedAudio.cloneNode(true);
    playbackAudio.currentTime = 0;

    const playPromise = playbackAudio.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {
        playOscillatorFallback(fallbackOptions);
      });
    }

    return true;
  } catch {
    return playOscillatorFallback(fallbackOptions);
  }
};
