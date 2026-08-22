// Gera efeitos sonoros 100% sintéticos (originais, sem amostras de terceiros ou de
// qualquer franquia). Usa osciladores, ruído filtrado e envelopes ADSR simples para
// simular um kit de SFX estilo fliperama de luta, sem copiar assets proprietários.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = join(dirname(fileURLToPath(import.meta.url)), '../public/audio')
mkdirSync(dir, { recursive: true })

const SAMPLE_RATE = 22050

function writeWav(samples) {
  const dataSize = samples.length * 2
  const buffer = Buffer.alloc(44 + dataSize)
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16)
  buffer.writeUInt16LE(1, 20)
  buffer.writeUInt16LE(1, 22)
  buffer.writeUInt32LE(SAMPLE_RATE, 24)
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28)
  buffer.writeUInt16LE(2, 32)
  buffer.writeUInt16LE(16, 34)
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)
  for (let i = 0; i < samples.length; i += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    buffer.writeInt16LE(Math.round(clamped * 32767), 44 + i * 2)
  }
  return buffer
}

function seconds(n) {
  return Math.floor(n * SAMPLE_RATE)
}

function mix(duration, layers) {
  const total = seconds(duration)
  const out = new Float32Array(total)
  for (const layer of layers) {
    const startSample = seconds(layer.start ?? 0)
    const layerSamples = seconds(layer.duration)
    for (let i = 0; i < layerSamples; i += 1) {
      const idx = startSample + i
      if (idx < 0 || idx >= total) continue
      const t = i / SAMPLE_RATE
      out[idx] += layer.render(t, i, layerSamples)
    }
  }
  let peak = 0
  for (let i = 0; i < out.length; i += 1) peak = Math.max(peak, Math.abs(out[i]))
  if (peak > 0.98) {
    const gain = 0.98 / peak
    for (let i = 0; i < out.length; i += 1) out[i] *= gain
  }
  return out
}

function envelope(t, dur, attack = 0.005, release = 0.05) {
  const rel = Math.max(release, 0.001)
  const a = Math.min(1, t / attack)
  const r = Math.min(1, (dur - t) / rel)
  return Math.max(0, Math.min(a, r))
}

function sine(freq) {
  return (t) => Math.sin(2 * Math.PI * freq * t)
}

function square(freq) {
  return (t) => (Math.sin(2 * Math.PI * freq * t) >= 0 ? 1 : -1)
}

function triangle(freq) {
  return (t) => Math.asin(Math.sin(2 * Math.PI * freq * t)) * (2 / Math.PI)
}

function sawtooth(freq) {
  return (t) => 2 * (t * freq - Math.floor(0.5 + t * freq))
}

let noiseSeed = 42
function noiseSample() {
  noiseSeed = (Math.imul(noiseSeed, 1664525) + 1013904223) >>> 0
  return (noiseSeed / 0x100000000) * 2 - 1
}

function tone({ duration, start = 0, freqFrom, freqTo, wave = sine, volume = 0.35, attack = 0.005, release = 0.06 }) {
  return {
    start,
    duration,
    render(t) {
      const freq = freqTo !== undefined ? freqFrom + (freqTo - freqFrom) * (t / duration) : freqFrom
      const shape = wave(freq)(t)
      return shape * volume * envelope(t, duration, attack, release)
    },
  }
}

function noiseBurst({ duration, start = 0, volume = 0.3, attack = 0.002, release = 0.08, lowpass = 1 }) {
  let last = 0
  return {
    start,
    duration,
    render(t) {
      const raw = noiseSample()
      last = last + (raw - last) * lowpass
      return last * volume * envelope(t, duration, attack, release)
    },
  }
}

function chord(freqs, { duration, start = 0, wave = sine, volume = 0.22, attack = 0.005, release = 0.12 }) {
  return {
    start,
    duration,
    render(t) {
      const env = envelope(t, duration, attack, release)
      let sum = 0
      for (const f of freqs) sum += wave(f)(t)
      return (sum / freqs.length) * volume * env
    },
  }
}

function arpeggio(notes, noteDuration, { start = 0, wave = square, volume = 0.3 }) {
  return notes.map((freq, i) => tone({
    freqFrom: freq,
    duration: noteDuration * 1.05,
    start: start + i * noteDuration,
    wave,
    volume,
    attack: 0.004,
    release: noteDuration * 0.4,
  }))
}

const sounds = {
  ui_confirm: () => mix(0.12, [
    tone({ freqFrom: 720, freqTo: 980, duration: 0.09, wave: square, volume: 0.28 }),
  ]),

  fake_shuffle_tick: () => mix(0.05, [
    tone({ freqFrom: 900, duration: 0.035, wave: square, volume: 0.22, release: 0.02 }),
    noiseBurst({ duration: 0.02, volume: 0.12, lowpass: 0.6 }),
  ]),

  press_start: () => mix(0.34, [
    tone({ freqFrom: 660, duration: 0.1, wave: square, volume: 0.3 }),
    tone({ freqFrom: 990, duration: 0.22, start: 0.1, wave: square, volume: 0.3 }),
  ]),

  pair_reveal: () => mix(0.5, [
    tone({ freqFrom: 300, freqTo: 700, duration: 0.22, wave: triangle, volume: 0.3 }),
    ...chordAt(0.2, [660, 880, 1320], 0.3),
  ]),

  bracket_shuffle: () => mix(0.35, [
    noiseBurst({ duration: 0.3, volume: 0.18, lowpass: 0.35, release: 0.2 }),
    tone({ freqFrom: 220, freqTo: 340, duration: 0.3, wave: sawtooth, volume: 0.12 }),
  ]),

  bracket_lock: () => mix(0.4, [
    tone({ freqFrom: 180, duration: 0.28, wave: square, volume: 0.32, release: 0.2 }),
    noiseBurst({ duration: 0.06, volume: 0.35, lowpass: 0.7, release: 0.04 }),
  ]),

  vs_impact: () => mix(0.32, [
    noiseBurst({ duration: 0.09, volume: 0.4, lowpass: 0.8, release: 0.06 }),
    tone({ freqFrom: 150, freqTo: 60, duration: 0.28, wave: sine, volume: 0.5, release: 0.22 }),
  ]),

  timer_detected: () => mix(0.1, [
    tone({ freqFrom: 1200, duration: 0.06, wave: sine, volume: 0.22 }),
  ]),

  round_reveal: () => mix(0.5, [
    tone({ freqFrom: 260, freqTo: 780, duration: 0.32, wave: triangle, volume: 0.32 }),
    noiseBurst({ duration: 0.05, volume: 0.2, lowpass: 0.7 }),
  ]),

  round_win: () => mix(0.45, arpeggio([523, 659, 784], 0.13, { wave: square, volume: 0.28 })),

  tie: () => mix(0.4, [
    tone({ freqFrom: 420, freqTo: 300, duration: 0.18, wave: square, volume: 0.26 }),
    tone({ freqFrom: 420, freqTo: 300, duration: 0.18, start: 0.2, wave: square, volume: 0.26 }),
  ]),

  match_win: () => mix(0.65, arpeggio([392, 523, 659, 784], 0.14, { wave: square, volume: 0.3 })),

  advance: () => mix(0.22, [
    tone({ freqFrom: 400, freqTo: 760, duration: 0.18, wave: triangle, volume: 0.3 }),
  ]),

  champion: () => mix(1.2, [
    ...arpeggio([392, 523, 659, 784, 988], 0.16, { wave: square, volume: 0.3 }),
    chord([392, 523, 784], { duration: 0.6, start: 0.55, wave: sine, volume: 0.28, release: 0.5 }),
  ]),

  error: () => mix(0.28, [
    tone({ freqFrom: 180, duration: 0.24, wave: square, volume: 0.3, release: 0.18 }),
    tone({ freqFrom: 140, duration: 0.24, start: 0.02, wave: square, volume: 0.22, release: 0.18 }),
  ]),
}

function chordAt(start, freqs, duration) {
  return [chord(freqs, { duration, start, wave: sine, volume: 0.24, attack: 0.01, release: duration * 0.6 })]
}

for (const [name, build] of Object.entries(sounds)) {
  writeFileSync(join(dir, `${name}.wav`), writeWav(build()))
}

console.log('wavs sintetizados:', Object.keys(sounds).length)
