import * as faceapi from '@vladmandic/face-api';

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export async function loadFaceModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (err) {
      modelLoadingPromise = null;
      console.error('Failed to load face-api models from CDN:', err);
      throw new Error('Could not load face recognition models. Please check your internet connection.');
    }
  })();

  return modelLoadingPromise;
}

export interface FaceDetectionResult {
  descriptor: number[];
  score: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export async function detectFace(video: HTMLVideoElement): Promise<FaceDetectionResult | null> {
  if (!modelsLoaded) {
    await loadFaceModels();
  }

  if (!video || video.readyState < 2) {
    return null;
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 224,
      scoreThreshold: 0.5,
    });

    const result = await faceapi
      .detectSingleFace(video, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!result || !result.descriptor) {
      return null;
    }

    return {
      descriptor: Array.from(result.descriptor),
      score: result.detection.score,
      box: {
        x: result.detection.box.x,
        y: result.detection.box.y,
        width: result.detection.box.width,
        height: result.detection.box.height,
      },
    };
  } catch (err) {
    console.warn('Face detection error:', err);
    return null;
  }
}

/**
 * Capture an averaged face descriptor from multiple consecutive frames for high stability
 */
export async function captureAveragedDescriptor(
  video: HTMLVideoElement,
  framesNeeded = 3,
  intervalMs = 250
): Promise<number[] | null> {
  const descriptors: number[][] = [];

  for (let i = 0; i < framesNeeded; i++) {
    const res = await detectFace(video);
    if (res && res.descriptor.length === 128) {
      descriptors.push(res.descriptor);
    }
    if (i < framesNeeded - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }

  if (descriptors.length === 0) {
    return null;
  }

  // Average the captured descriptors across all frames
  const averaged = new Array(128).fill(0);
  for (let d = 0; d < descriptors.length; d++) {
    for (let j = 0; j < 128; j++) {
      averaged[j] += descriptors[d][j];
    }
  }

  for (let j = 0; j < 128; j++) {
    averaged[j] = averaged[j] / descriptors.length;
  }

  return averaged;
}
