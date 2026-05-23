import type { AnalyzeFramesRequest, AnalyzeFramesResponse, Keyframe, VisionAnalysis, VisionProvider } from '../core/types';
import { getServerEnv } from './env';
import { analyzeFrames, analyzeFramesWithMock, getVisionProvider, hasProviderKey } from './visionProviders';

declare const console: {
  info: (message?: unknown, ...optionalParams: unknown[]) => void;
};

const MAX_BODY_CHARS = 9_000_000;
const REAL_DAILY_LIMIT = 10;

interface VisionApiStatus {
  configuredProvider: VisionProvider;
  provider: VisionProvider;
  todayCallCount: number;
  fallback: boolean;
  recentVisionAnalysis?: VisionAnalysis;
  recentKeyframes?: Keyframe[];
  error?: string;
  debug?: AnalyzeFramesResponse['debug'];
}

let usageDate = getDateKey();
let realCallCount = 0;
let recentStatus: VisionApiStatus | null = null;
let hasLoggedEnvDiagnostics = false;

export function createAnalyzeFramesMiddleware() {
  logVisionEnvDiagnostics();

  return (request: any, response: any, next?: () => void) => {
    const path = (request.url ?? '').split('?')[0];
    if (path === '/api/analyze-frames/status' && request.method === 'GET') {
      writeJson(response, 200, getStatus());
      return;
    }

    if (path !== '/api/analyze-frames' || request.method !== 'POST') {
      next?.();
      return;
    }

    void readJsonBody(request)
      .then((body) => handleAnalyzeFrames(body))
      .then((payload) => writeJson(response, payload.ok ? 200 : 400, payload))
      .catch((error) => {
        const message = error instanceof Error ? error.message : '视觉分析接口异常。';
        const status = getStatus();
        const debug = createDebug(status.provider, message);
        recentStatus = { ...status, fallback: true, error: message, debug };
        writeJson(response, 500, { ok: false, provider: status.provider, error: message, fallback: true, todayCallCount: status.todayCallCount, debug } satisfies AnalyzeFramesResponse);
      });
  };
}

async function handleAnalyzeFrames(body: unknown): Promise<AnalyzeFramesResponse> {
  resetUsageIfNeeded();
  const env = getServerEnv();
  const configuredProvider = getVisionProvider(env);
  const input = sanitizeRequest(body);
  const provider = configuredProvider;
  const debug = createDebug(provider);

  if (provider !== 'mock') {
    if (!hasProviderKey(provider, env)) {
      const missingKeyDebug = createDebug(provider, 'missing_api_key');
      recentStatus = {
        configuredProvider,
        provider,
        todayCallCount: realCallCount,
        fallback: true,
        recentKeyframes: input.keyframes.map(toDebugKeyframe),
        error: 'missing_api_key',
        debug: missingKeyDebug,
      };
      return {
        ok: false,
        provider,
        error: 'missing_api_key',
        fallback: true,
        todayCallCount: realCallCount,
        debug: missingKeyDebug,
      };
    }

    if (realCallCount >= REAL_DAILY_LIMIT) {
      const mockAnalysis = await analyzeFramesWithMock(input);
      recentStatus = {
        configuredProvider,
        provider: 'mock',
        todayCallCount: realCallCount,
        fallback: true,
        recentVisionAnalysis: mockAnalysis,
        recentKeyframes: input.keyframes.map(toDebugKeyframe),
        error: '今日真实视觉 API 调用次数已达上限，已切到 mock。',
        debug,
      };
      return {
        ok: true,
        provider: 'mock',
        visionAnalysis: mockAnalysis,
        fallback: true,
        todayCallCount: realCallCount,
        debug,
      };
    }

    realCallCount += 1;
  }

  try {
    const visionAnalysis = await analyzeFrames(input, provider, env);
    recentStatus = {
      configuredProvider,
      provider,
      todayCallCount: realCallCount,
      fallback: false,
      recentVisionAnalysis: visionAnalysis,
      recentKeyframes: input.keyframes.map(toDebugKeyframe),
      debug,
    };
    return {
      ok: true,
      provider,
      visionAnalysis,
      fallback: false,
      todayCallCount: realCallCount,
      debug,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : '视觉模型调用失败。';
    const errorDebug = createDebug(provider, message);
    recentStatus = {
      configuredProvider,
      provider,
      todayCallCount: realCallCount,
      fallback: true,
      recentKeyframes: input.keyframes.map(toDebugKeyframe),
      error: message,
      debug: errorDebug,
    };
    return {
      ok: false,
      provider,
      error: message,
      fallback: true,
      todayCallCount: realCallCount,
      debug: errorDebug,
    };
  }
}

function sanitizeRequest(body: unknown): AnalyzeFramesRequest {
  const raw = body as Partial<AnalyzeFramesRequest>;
  const keyframes = Array.isArray(raw.keyframes)
    ? raw.keyframes.slice(0, 3).flatMap((frame) => {
      const time = Number(frame?.time);
      const image = String(frame?.image ?? '');
      if (!Number.isFinite(time) || !image.startsWith('data:image/')) return [];
      return [{ time, image }];
    })
    : [];

  return {
    videoId: String(raw.videoId || 'unknown_video'),
    videoTitle: String(raw.videoTitle || '未命名视频').slice(0, 120),
    videoDescription: raw.videoDescription ? String(raw.videoDescription).slice(0, 300) : undefined,
    activityName: raw.activityName ? String(raw.activityName).slice(0, 80) : undefined,
    segmentStart: Number.isFinite(Number(raw.segmentStart)) ? Number(raw.segmentStart) : 0,
    segmentEnd: Number.isFinite(Number(raw.segmentEnd)) ? Number(raw.segmentEnd) : 0,
    keyframes,
  };
}

function readJsonBody(request: { on?: (event: string, callback: (chunk?: unknown) => void) => void }) {
  return new Promise<unknown>((resolve, reject) => {
    let body = '';
    request.on?.('data', (chunk) => {
      body += String(chunk ?? '');
      if (body.length > MAX_BODY_CHARS) reject(new Error('请求体过大，请减少关键帧数量或压缩图片。'));
    });
    request.on?.('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('请求体 JSON 解析失败。'));
      }
    });
    request.on?.('error', () => reject(new Error('读取请求体失败。')));
  });
}

function getStatus(): VisionApiStatus {
  resetUsageIfNeeded();
  const configuredProvider = getVisionProvider(getServerEnv());
  return recentStatus ?? {
    configuredProvider,
    provider: configuredProvider,
    todayCallCount: realCallCount,
    fallback: false,
    debug: createDebug(configuredProvider),
  };
}

function writeJson(response: { statusCode?: number; setHeader?: (key: string, value: string) => void; end?: (value?: string) => void }, statusCode: number, payload: unknown) {
  response.statusCode = statusCode;
  response.setHeader?.('Content-Type', 'application/json; charset=utf-8');
  response.end?.(JSON.stringify(payload));
}

function resetUsageIfNeeded() {
  const today = getDateKey();
  if (today === usageDate) return;
  usageDate = today;
  realCallCount = 0;
}

function getDateKey() {
  return new Date().toISOString().slice(0, 10);
}

function toDebugKeyframe(frame: AnalyzeFramesRequest['keyframes'][number]): Keyframe {
  return {
    time: frame.time,
    image: frame.image,
    source: 'sampled_frame',
  };
}

function createDebug(provider: VisionProvider, error?: string): AnalyzeFramesResponse['debug'] {
  const env = getServerEnv();
  return {
    provider,
    hasApiKey: hasProviderKey(provider, env),
    error,
  };
}

function logVisionEnvDiagnostics() {
  if (hasLoggedEnvDiagnostics) return;
  hasLoggedEnvDiagnostics = true;
  const env = getServerEnv();
  const provider = getVisionProvider(env);
  const key = env.ZHIPU_API_KEY?.trim() ?? '';
  const keyPreview = key ? `${key.slice(0, 4)}****${key.slice(-4)}` : 'none';
  console.info(`[ClipCard vision] VISION_PROVIDER=${provider} hasZhipuKey=${Boolean(key)} zhipuKey=${keyPreview}`);
}
