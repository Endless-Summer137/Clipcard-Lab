import type { AnalyzeFramesRequest, AnalyzeFramesResponse, Keyframe } from './types';

export async function analyzeFramesForCard(input: Omit<AnalyzeFramesRequest, 'keyframes'> & { keyframes: Keyframe[] }): Promise<AnalyzeFramesResponse> {
  if (!input.keyframes.length) return { ok: false, provider: 'mock', error: '没有可分析的关键帧。' };

  try {
    const response = await fetch('/api/analyze-frames', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  } catch {
    return { ok: false, provider: 'mock', error: '视觉分析接口不可用。' };
  }
}
