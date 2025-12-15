/**
 * MFCC Feature Extraction for Portal
 * 
 * Extracts MFCC (Mel-Frequency Cepstral Coefficients) from audio
 * for speech comparison in the mobile app.
 * 
 * Uses Web Audio API to decode audio, then pure JS for MFCC extraction.
 */

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const TARGET_SAMPLE_RATE = 16000;
const FRAME_SIZE_MS = 25;
const FRAME_HOP_MS = 10;
const NUM_MEL_FILTERS = 26;
const NUM_MFCC_COEFFS = 13;
const LOW_FREQ = 80;
const HIGH_FREQ = 8000;
const PRE_EMPHASIS = 0.97;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface MFCCResult {
  /** MFCC coefficients [numFrames][numCoeffs] */
  coefficients: number[][];
  /** Sample rate used */
  sampleRate: number;
  /** Hop size in ms */
  hopMs: number;
  /** Number of MFCC coefficients per frame */
  numCoeffs: number;
  /** Total duration in ms */
  durationMs: number;
  /** Number of frames */
  numFrames: number;
}

export interface SegmentTiming {
  word: string;
  startFrame: number;
  endFrame: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIO DECODING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Decode base64 audio to samples using Web Audio API
 */
export async function decodeAudioBase64(base64: string): Promise<Float32Array> {
  console.log('[MFCC] Converting base64 to ArrayBuffer...');
  
  // Convert base64 to ArrayBuffer
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  console.log(`[MFCC] ArrayBuffer size: ${bytes.length} bytes`);
  
  // Create AudioContext and decode
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) {
    throw new Error('Web Audio API not supported');
  }
  
  const audioContext = new AudioContextClass();
  
  try {
    console.log('[MFCC] Decoding audio data...');
    
    // Add timeout for decodeAudioData (can hang on invalid audio)
    const decodePromise = audioContext.decodeAudioData(bytes.buffer.slice(0));
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Audio decode timeout (10s)')), 10000);
    });
    
    const audioBuffer = await Promise.race([decodePromise, timeoutPromise]);
    
    console.log(`[MFCC] Decoded: ${audioBuffer.duration.toFixed(2)}s, ${audioBuffer.sampleRate}Hz, ${audioBuffer.numberOfChannels} channels`);
    
    // Get first channel (mono)
    const samples = audioBuffer.getChannelData(0);
    const originalSampleRate = audioBuffer.sampleRate;
    
    // Resample to target rate if needed
    if (originalSampleRate !== TARGET_SAMPLE_RATE) {
      console.log(`[MFCC] Resampling from ${originalSampleRate}Hz to ${TARGET_SAMPLE_RATE}Hz...`);
      return resample(samples, originalSampleRate, TARGET_SAMPLE_RATE);
    }
    
    return samples;
  } catch (error) {
    console.error('[MFCC] Decode error:', error);
    throw error;
  } finally {
    await audioContext.close();
  }
}

/**
 * Simple linear resampling
 */
function resample(samples: Float32Array, fromRate: number, toRate: number): Float32Array {
  const ratio = fromRate / toRate;
  const newLength = Math.floor(samples.length / ratio);
  const resampled = new Float32Array(newLength);
  
  for (let i = 0; i < newLength; i++) {
    const srcIdx = i * ratio;
    const srcIdxFloor = Math.floor(srcIdx);
    const srcIdxCeil = Math.min(srcIdxFloor + 1, samples.length - 1);
    const frac = srcIdx - srcIdxFloor;
    
    resampled[i] = samples[srcIdxFloor] * (1 - frac) + samples[srcIdxCeil] * frac;
  }
  
  return resampled;
}

// ═══════════════════════════════════════════════════════════════════════════
// PRE-PROCESSING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Apply pre-emphasis filter
 */
function preEmphasis(samples: Float32Array, coeff: number = PRE_EMPHASIS): Float32Array {
  const result = new Float32Array(samples.length);
  result[0] = samples[0];
  for (let i = 1; i < samples.length; i++) {
    result[i] = samples[i] - coeff * samples[i - 1];
  }
  return result;
}

/**
 * Apply Hamming window
 */
function hammingWindow(size: number): Float32Array {
  const window = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    window[i] = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (size - 1));
  }
  return window;
}

// ═══════════════════════════════════════════════════════════════════════════
// FFT (Cooley-Tukey)
// ═══════════════════════════════════════════════════════════════════════════

function nextPowerOf2(n: number): number {
  return Math.pow(2, Math.ceil(Math.log2(n)));
}

function fft(real: Float32Array, imag: Float32Array): void {
  const n = real.length;
  
  if (n <= 1) return;
  
  // Bit reversal
  for (let i = 0, j = 0; i < n; i++) {
    if (i < j) {
      [real[i], real[j]] = [real[j], real[i]];
      [imag[i], imag[j]] = [imag[j], imag[i]];
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
  
  // Cooley-Tukey
  for (let size = 2; size <= n; size *= 2) {
    const halfSize = size / 2;
    const step = (2 * Math.PI) / size;
    
    for (let i = 0; i < n; i += size) {
      for (let j = 0; j < halfSize; j++) {
        const angle = -step * j;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        const idx1 = i + j;
        const idx2 = i + j + halfSize;
        
        const tr = real[idx2] * cos - imag[idx2] * sin;
        const ti = real[idx2] * sin + imag[idx2] * cos;
        
        real[idx2] = real[idx1] - tr;
        imag[idx2] = imag[idx1] - ti;
        real[idx1] = real[idx1] + tr;
        imag[idx1] = imag[idx1] + ti;
      }
    }
  }
}

function powerSpectrum(samples: Float32Array): Float32Array {
  const n = nextPowerOf2(samples.length);
  const real = new Float32Array(n);
  const imag = new Float32Array(n);
  
  // Copy and zero-pad
  for (let i = 0; i < samples.length; i++) {
    real[i] = samples[i];
  }
  
  fft(real, imag);
  
  // Power spectrum (only first half + 1)
  const power = new Float32Array(n / 2 + 1);
  for (let i = 0; i <= n / 2; i++) {
    power[i] = real[i] * real[i] + imag[i] * imag[i];
  }
  
  return power;
}

// ═══════════════════════════════════════════════════════════════════════════
// MEL FILTERBANK
// ═══════════════════════════════════════════════════════════════════════════

function hzToMel(hz: number): number {
  return 2595 * Math.log10(1 + hz / 700);
}

function melToHz(mel: number): number {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

function createMelFilterbank(
  numFilters: number,
  fftSize: number,
  sampleRate: number,
  lowFreq: number,
  highFreq: number
): Float32Array[] {
  const melLow = hzToMel(lowFreq);
  const melHigh = hzToMel(highFreq);
  const melPoints = new Float32Array(numFilters + 2);
  
  // Linearly spaced mel points
  for (let i = 0; i < numFilters + 2; i++) {
    melPoints[i] = melLow + (i / (numFilters + 1)) * (melHigh - melLow);
  }
  
  // Convert to Hz and then to FFT bin
  const binPoints = new Float32Array(numFilters + 2);
  const numBins = fftSize / 2 + 1;
  for (let i = 0; i < numFilters + 2; i++) {
    const hz = melToHz(melPoints[i]);
    binPoints[i] = Math.floor((hz / sampleRate) * fftSize);
  }
  
  // Create filterbank
  const filterbank: Float32Array[] = [];
  for (let i = 0; i < numFilters; i++) {
    const filter = new Float32Array(numBins);
    const start = binPoints[i];
    const center = binPoints[i + 1];
    const end = binPoints[i + 2];
    
    // Rising slope
    for (let j = start; j < center; j++) {
      filter[j] = (j - start) / (center - start);
    }
    
    // Falling slope
    for (let j = center; j < end; j++) {
      filter[j] = (end - j) / (end - center);
    }
    
    filterbank.push(filter);
  }
  
  return filterbank;
}

// ═══════════════════════════════════════════════════════════════════════════
// DCT (Discrete Cosine Transform)
// ═══════════════════════════════════════════════════════════════════════════

function dct(input: Float32Array, numCoeffs: number): Float32Array {
  const N = input.length;
  const output = new Float32Array(numCoeffs);
  
  const factor = Math.PI / N;
  
  for (let k = 0; k < numCoeffs; k++) {
    let sum = 0;
    for (let n = 0; n < N; n++) {
      sum += input[n] * Math.cos(factor * (n + 0.5) * k);
    }
    output[k] = sum;
  }
  
  return output;
}

// ═══════════════════════════════════════════════════════════════════════════
// MFCC EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract MFCC features from audio samples (async with chunking to prevent UI freeze)
 */
export async function extractMFCC(
  samples: Float32Array,
  sampleRate: number = TARGET_SAMPLE_RATE
): Promise<MFCCResult> {
  // Apply pre-emphasis
  const emphasized = preEmphasis(samples);
  
  // Frame parameters
  const frameSize = Math.floor((FRAME_SIZE_MS / 1000) * sampleRate);
  const hopSize = Math.floor((FRAME_HOP_MS / 1000) * sampleRate);
  const numFrames = Math.floor((emphasized.length - frameSize) / hopSize) + 1;
  
  console.log(`[MFCC] Processing ${numFrames} frames...`);
  
  if (numFrames <= 0) {
    return {
      coefficients: [],
      sampleRate,
      hopMs: FRAME_HOP_MS,
      numCoeffs: NUM_MFCC_COEFFS,
      durationMs: (samples.length / sampleRate) * 1000,
      numFrames: 0,
    };
  }
  
  // Create window and filterbank (once)
  const window = hammingWindow(frameSize);
  const fftSize = nextPowerOf2(frameSize);
  const filterbank = createMelFilterbank(NUM_MEL_FILTERS, fftSize, sampleRate, LOW_FREQ, HIGH_FREQ);
  
  const coefficients: number[][] = [];
  
  // Process in chunks to prevent UI freeze
  const CHUNK_SIZE = 20; // Process 20 frames, then yield
  
  for (let i = 0; i < numFrames; i++) {
    const start = i * hopSize;
    
    // Extract and window frame
    const frame = new Float32Array(frameSize);
    for (let j = 0; j < frameSize; j++) {
      frame[j] = emphasized[start + j] * window[j];
    }
    
    // Power spectrum
    const power = powerSpectrum(frame);
    
    // Apply mel filterbank
    const melEnergies = new Float32Array(NUM_MEL_FILTERS);
    for (let f = 0; f < NUM_MEL_FILTERS; f++) {
      let sum = 0;
      for (let k = 0; k < power.length && k < filterbank[f].length; k++) {
        sum += power[k] * filterbank[f][k];
      }
      // Log energy (with floor to avoid log(0))
      melEnergies[f] = Math.log(Math.max(sum, 1e-10));
    }
    
    // DCT to get MFCC
    const mfcc = dct(melEnergies, NUM_MFCC_COEFFS);
    coefficients.push(Array.from(mfcc));
    
    // Yield to UI every CHUNK_SIZE frames
    if (i > 0 && i % CHUNK_SIZE === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  console.log(`[MFCC] Completed ${numFrames} frames`);
  
  return {
    coefficients,
    sampleRate,
    hopMs: FRAME_HOP_MS,
    numCoeffs: NUM_MFCC_COEFFS,
    durationMs: (samples.length / sampleRate) * 1000,
    numFrames,
  };
}

/**
 * Extract MFCC from base64 audio
 */
export async function extractMFCCFromBase64(audioBase64: string): Promise<MFCCResult> {
  console.log('[MFCC] Decoding audio...');
  const samples = await decodeAudioBase64(audioBase64);
  console.log(`[MFCC] Decoded ${samples.length} samples at ${TARGET_SAMPLE_RATE}Hz`);
  
  console.log('[MFCC] Extracting features...');
  const result = await extractMFCC(samples, TARGET_SAMPLE_RATE);
  console.log(`[MFCC] Extracted ${result.numFrames} frames with ${result.numCoeffs} coefficients each`);
  
  return result;
}

/**
 * Calculate segment frame indices from timing
 */
export function calculateSegmentFrames(
  segments: Array<{ word: string; startMs: number; endMs: number }>,
  hopMs: number
): SegmentTiming[] {
  return segments.map(seg => ({
    word: seg.word,
    startFrame: Math.floor(seg.startMs / hopMs),
    endFrame: Math.floor(seg.endMs / hopMs),
  }));
}

