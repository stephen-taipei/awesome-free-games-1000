/**
 * WebGPU Math Utilities - Sound Puzzle
 * Music / Sound Waves / Audio Visualization Theme
 * Game #073
 */

export function waveform(x: number, time: number, frequency: number = 1): number {
  return Math.sin(x * frequency * Math.PI * 2 + time) * 0.5 + 0.5;
}

export function beatPulse(time: number, bpm: number = 120): number {
  const beatTime = (60 / bpm);
  const phase = (time % beatTime) / beatTime;
  return Math.exp(-phase * 5);
}

export function harmonicSeries(time: number, harmonics: number = 4): number {
  let sum = 0;
  for (let i = 1; i <= harmonics; i++) {
    sum += Math.sin(time * i) / i;
  }
  return (sum + harmonics) / (harmonics * 2);
}

export function frequencyToColor(frequency: number): { r: number; g: number; b: number } {
  // Map frequency to hue (262Hz C4 = red, 523Hz C5 = back to red)
  const minFreq = 261;
  const maxFreq = 524;
  const hue = ((frequency - minFreq) / (maxFreq - minFreq)) * 360;
  return hueToRgb(hue);
}

function hueToRgb(hue: number): { r: number; g: number; b: number } {
  const h = hue / 60;
  const x = 1 - Math.abs((h % 2) - 1);
  let r = 0, g = 0, b = 0;

  if (h < 1) { r = 1; g = x; }
  else if (h < 2) { r = x; g = 1; }
  else if (h < 3) { g = 1; b = x; }
  else if (h < 4) { g = x; b = 1; }
  else if (h < 5) { r = x; b = 1; }
  else { r = 1; b = x; }

  return { r, g, b };
}

export function soundRipple(distance: number, time: number, speed: number = 3): number {
  const wave = Math.sin(distance * 10 - time * speed);
  const fade = Math.exp(-distance * 2);
  return Math.max(0, wave * fade);
}

export function bassDropIntensity(time: number, dropTime: number): number {
  const elapsed = time - dropTime;
  if (elapsed < 0) return 0;
  return Math.exp(-elapsed * 3) * Math.sin(elapsed * 20);
}

export function spectrumBar(index: number, count: number, time: number): number {
  const freq = (index / count) * 4 + 1;
  return (Math.sin(time * freq) + 1) * 0.5;
}

export function noteFloat(time: number, seed: number): { x: number; y: number } {
  return {
    x: Math.sin(time + seed * 1.7) * 0.3,
    y: Math.cos(time * 0.7 + seed * 2.3) * 0.2 - time * 0.1,
  };
}

export function echoFade(time: number, echoCount: number = 3): number {
  let total = 0;
  for (let i = 0; i < echoCount; i++) {
    const delay = i * 0.3;
    const amplitude = Math.pow(0.5, i);
    total += Math.sin(time - delay) * amplitude;
  }
  return (total + echoCount) / (echoCount * 2);
}
