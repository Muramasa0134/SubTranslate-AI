/**
 * Utility to encode raw PCM Float32 audio samples directly into a 16kHz mono WAV Blob.
 * Produces clean, self-contained RIFF WAV audio chunks that decode instantaneously
 * in backend PyAV and FFmpeg with zero container header errors.
 */

export function encodeWAV(samples, sampleRate = 16000) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = samples.length * (bitsPerSample / 8);
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // 1. RIFF Chunk Descriptor
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeAsciiString(view, 8, 'WAVE');

  // 2. "fmt " Sub-chunk
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Sub-chunk 1 size (16 for PCM)
  view.setUint16(20, 1, true); // Audio format 1 = PCM
  view.setUint16(22, numChannels, true); // Mono = 1
  view.setUint32(24, sampleRate, true); // Sample rate (e.g. 16000 or 44100)
  view.setUint32(28, byteRate, true); // Byte rate
  view.setUint16(32, blockAlign, true); // Block align
  view.setUint16(34, bitsPerSample, true); // Bits per sample (16)

  // 3. "data" Sub-chunk
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // 4. Write 16-bit PCM samples with clipping protection
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeAsciiString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}
