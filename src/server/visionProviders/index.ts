import type { AnalyzeFramesRequest, VisionAnalysis, VisionProvider } from '../../core/types';
import type { ServerEnv } from '../env';
import { analyzeFrames as analyzeWithAliyun } from './aliyun';
import { analyzeFrames as analyzeWithMock } from './mock';
import { analyzeFrames as analyzeWithOpenAI } from './openai';
import { analyzeFrames as analyzeWithZhipu } from './zhipu';

export function getVisionProvider(env: ServerEnv): VisionProvider {
  const provider = env.VISION_PROVIDER?.trim().toLowerCase();
  if (provider === 'zhipu' || provider === 'aliyun' || provider === 'openai' || provider === 'mock') return provider;
  return 'mock';
}

export function hasProviderKey(provider: VisionProvider, env: ServerEnv) {
  if (provider === 'mock') return true;
  if (provider === 'zhipu') return Boolean(env.ZHIPU_API_KEY?.trim());
  if (provider === 'aliyun') return Boolean(env.ALIYUN_API_KEY?.trim());
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export async function analyzeFrames(input: AnalyzeFramesRequest, provider: VisionProvider, env: ServerEnv): Promise<VisionAnalysis> {
  if (provider === 'zhipu') return analyzeWithZhipu(input, env);
  if (provider === 'aliyun') return analyzeWithAliyun(input, env);
  if (provider === 'openai') return analyzeWithOpenAI(input, env);
  return analyzeWithMock(input);
}

export { analyzeFrames as analyzeFramesWithMock } from './mock';
