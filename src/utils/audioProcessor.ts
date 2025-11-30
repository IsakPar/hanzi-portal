/**
 * Audio Processing Utilities
 * 
 * Uses Web Audio API to process audio files client-side,
 * including time-stretching for playback speed changes.
 */

/**
 * Convert base64 audio to AudioBuffer
 */
export async function base64ToAudioBuffer(
  base64: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  
  // Decode base64 to ArrayBuffer
  const binaryString = atob(base64Data);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Decode audio data
  return await audioContext.decodeAudioData(bytes.buffer);
}

/**
 * Process audio at a different speed using OfflineAudioContext
 * Returns a new base64-encoded audio file
 */
export async function processAudioAtSpeed(
  base64Audio: string,
  speed: number
): Promise<string> {
  // Create audio context to decode
  const audioContext = new AudioContext();
  const audioBuffer = await base64ToAudioBuffer(base64Audio, audioContext);
  
  // Calculate new duration based on speed
  const newDuration = audioBuffer.duration / speed;
  const newLength = Math.ceil(audioBuffer.sampleRate * newDuration);
  
  // Create offline context for processing
  const offlineContext = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    newLength,
    audioBuffer.sampleRate
  );
  
  // Create buffer source
  const source = offlineContext.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = speed;
  source.connect(offlineContext.destination);
  source.start(0);
  
  // Render to new buffer
  const renderedBuffer = await offlineContext.startRendering();
  
  // Close contexts
  await audioContext.close();
  
  // Convert to WAV and then to base64
  const wavBlob = audioBufferToWav(renderedBuffer);
  const base64Result = await blobToBase64(wavBlob);
  
  return base64Result;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const samples = buffer.length;
  const dataSize = samples * blockAlign;
  const bufferSize = 44 + dataSize;
  
  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);
  
  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(view, 8, 'WAVE');
  
  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // chunk size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  
  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  
  // Write interleaved audio data
  let offset = 44;
  for (let i = 0; i < samples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buffer.getChannelData(ch)[i];
      const clamped = Math.max(-1, Math.min(1, sample));
      const int16 = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;
      view.setInt16(offset, int16, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Convert Blob to base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Return just the base64 part (remove data URL prefix)
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}




