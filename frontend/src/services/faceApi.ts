import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (err) {
      console.warn('Face API models failed to load from /models, attempting ssdMobilenet fallback or synthetic fallback:', err);
    }
  })();

  return loadingPromise;
}

export async function extractFaceDescriptor(
  videoOrImage: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<number[] | null> {
  await loadFaceApiModels();
  try {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const detection = await faceapi
      .detectSingleFace(videoOrImage, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection || !detection.descriptor) {
      return null;
    }

    return Array.from(detection.descriptor);
  } catch (err) {
    console.warn('Error during face detection:', err);
    return null;
  }
}

/**
 * Generates a deterministic or seeded 128-float unit vector descriptor for demo/testing
 * when webcam is unavailable or in synthetic mode.
 */
export function generateSyntheticDescriptor(seed = 'lakshmi'): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const descriptor: number[] = [];
  let sumSq = 0;
  for (let i = 0; i < 128; i++) {
    const val = Math.sin(hash + i * 1.618);
    descriptor.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq);
  return descriptor.map((v) => Number((v / norm).toFixed(6)));
}
