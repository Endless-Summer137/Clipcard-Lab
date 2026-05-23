export interface VideoFrameCaptureOptions {
  time?: number;
  maxWidth?: number;
  quality?: number;
}

export interface VideoFrameCaptureResult {
  dataUrl: string;
  frameTime: number;
}

const DEFAULT_MAX_WIDTH = 640;
const DEFAULT_QUALITY = 0.72;
const SEEK_TIMEOUT_MS = 900;

function waitForSeek(videoElement: HTMLVideoElement, time: number) {
  return new Promise<void>((resolve, reject) => {
    const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : time;
    const target = Math.max(0, Math.min(time, duration || time));
    const cleanup = () => {
      window.clearTimeout(timeout);
      videoElement.removeEventListener('seeked', onSeeked);
      videoElement.removeEventListener('error', onError);
    };
    const onSeeked = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(new Error('视频跳转失败，无法截取该帧。'));
    };
    const timeout = window.setTimeout(() => {
      cleanup();
      resolve();
    }, SEEK_TIMEOUT_MS);

    videoElement.addEventListener('seeked', onSeeked, { once: true });
    videoElement.addEventListener('error', onError, { once: true });
    videoElement.currentTime = target;
  });
}

function getCanvasDataUrl(canvas: HTMLCanvasElement, quality: number) {
  const webp = canvas.toDataURL('image/webp', quality);
  if (webp.startsWith('data:image/webp')) return webp;
  return canvas.toDataURL('image/jpeg', quality);
}

export async function captureVideoFrame(
  videoElement: HTMLVideoElement,
  options: VideoFrameCaptureOptions = {},
): Promise<VideoFrameCaptureResult | null> {
  if (!videoElement || !videoElement.videoWidth || !videoElement.videoHeight) return null;

  const originalTime = Number.isFinite(videoElement.currentTime) ? videoElement.currentTime : 0;
  const wasPaused = videoElement.paused;
  const targetTime = options.time;

  try {
    if (typeof targetTime === 'number' && Number.isFinite(targetTime)) {
      await waitForSeek(videoElement, targetTime);
    }

    const sourceWidth = videoElement.videoWidth;
    const sourceHeight = videoElement.videoHeight;
    if (!sourceWidth || !sourceHeight) return null;

    const maxWidth = Math.max(1, Math.min(options.maxWidth ?? DEFAULT_MAX_WIDTH, DEFAULT_MAX_WIDTH));
    const scale = Math.min(1, maxWidth / sourceWidth);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) return null;

    context.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
    const quality = Math.max(0.1, Math.min(0.92, options.quality ?? DEFAULT_QUALITY));
    return {
      dataUrl: getCanvasDataUrl(canvas, quality),
      frameTime: Number.isFinite(videoElement.currentTime) ? videoElement.currentTime : targetTime ?? originalTime,
    };
  } catch {
    return null;
  } finally {
    if (typeof targetTime === 'number' && Number.isFinite(targetTime)) {
      try {
        await waitForSeek(videoElement, originalTime);
        if (!wasPaused) void videoElement.play();
      } catch {
        // Restoring playback is best effort; capture callers still receive fallback behavior.
      }
    }
  }
}
