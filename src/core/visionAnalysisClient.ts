import type { AnalyzeFramesRequest, AnalyzeFramesResponse, Keyframe } from './types';

const CLIENT_ANALYSIS_TIMEOUT_MS = 2800;

export async function analyzeFramesForCard(input: Omit<AnalyzeFramesRequest, 'keyframes'> & { keyframes: Keyframe[] }): Promise<AnalyzeFramesResponse> {
  if (!input.keyframes.length) return { ok: false, provider: 'mock', error: '没有可分析的关键帧。' };

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), CLIENT_ANALYSIS_TIMEOUT_MS);

  try {
    const response = await fetch('/api/analyze-frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        ...input,
        keyframes: input.keyframes.slice(0, 3).map((frame) => ({
          time: frame.time,
          image: frame.image,
        })),
      }),
    });

    const payload = await response.json() as AnalyzeFramesResponse;
    if (!response.ok) return { ...payload, ok: false, provider: payload.provider, error: payload.error ?? '视觉分析接口请求失败。' };
    return payload;
  } catch (error) {
    const isTimeout = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      provider: 'mock',
      error: isTimeout ? '视觉分析超时，已使用本地规则生成。' : '视觉分析接口不可用。',
      debug: isTimeout ? {
        requestedProvider: 'zhipu',
        actualProvider: 'mock',
        provider: 'zhipu',
        hasApiKey: false,
        errorType: 'timeout',
        fallbackUsed: true,
        fallbackReason: '前端等待视觉分析超时，已使用本地规则生成。',
        totalElapsedMs: CLIENT_ANALYSIS_TIMEOUT_MS,
        finalAnalysisSource: 'rule_fallback',
      } : undefined,
    };
  } finally {
    window.clearTimeout(timeout);
  }
}
