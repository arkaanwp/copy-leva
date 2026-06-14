const fs = require('fs');
const path = require('path');
global.MPEGMode = require('lamejs/src/js/MPEGMode.js');
global.Lame = require('lamejs/src/js/Lame.js');
global.BitStream = require('lamejs/src/js/BitStream.js');
global.Encoder = require('lamejs/src/js/Encoder.js');
const { Mp3Encoder } = require('lamejs/src/js/index.js');

const SAMPLE_RATE = 44100;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const toMp3 = (samples, outputPath, bitRate = 96) => {
  const encoder = new Mp3Encoder(1, SAMPLE_RATE, bitRate);
  const chunkSize = 1152;
  const parts = [];

  for (let i = 0; i < samples.length; i += chunkSize) {
    const slice = samples.subarray(i, i + chunkSize);
    const mp3buf = encoder.encodeBuffer(slice);
    if (mp3buf.length > 0) parts.push(Buffer.from(mp3buf));
  }

  const flush = encoder.flush();
  if (flush.length > 0) parts.push(Buffer.from(flush));

  fs.writeFileSync(outputPath, Buffer.concat(parts));
};

const createBuffer = (durationSec, sampleFn) => {
  const totalSamples = Math.floor(durationSec * SAMPLE_RATE);
  const buffer = new Int16Array(totalSamples);

  for (let i = 0; i < totalSamples; i += 1) {
    const t = i / SAMPLE_RATE;
    const attack = clamp(i / (SAMPLE_RATE * 0.02), 0, 1);
    const release = clamp((totalSamples - i) / (SAMPLE_RATE * 0.08), 0, 1);
    const envelope = attack * release;
    const sample = sampleFn(t) * envelope;
    buffer[i] = Math.max(-32767, Math.min(32767, Math.round(sample * 32767)));
  }

  return buffer;
};

const chimeBuffer = createBuffer(0.36, (t) => {
  const base = Math.sin(2 * Math.PI * 880 * t) * 0.45;
  const harmonic = Math.sin(2 * Math.PI * 1320 * t) * 0.2;
  return base + harmonic;
});

const celebrationBuffer = createBuffer(1.0, (t) => {
  const freq = t < 0.34 ? 660 : t < 0.68 ? 880 : 1046;
  const main = Math.sin(2 * Math.PI * freq * t) * 0.38;
  const harmony = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.16;
  return main + harmony;
});

const soundsDir = path.join(__dirname, '..', 'public', 'sounds');
fs.mkdirSync(soundsDir, { recursive: true });

toMp3(chimeBuffer, path.join(soundsDir, 'chime.mp3'));
toMp3(celebrationBuffer, path.join(soundsDir, 'celebration.mp3'));

console.log('Generated sound assets in public/sounds');
