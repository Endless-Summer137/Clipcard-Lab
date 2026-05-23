import type { AnalyzeFramesRequest, VisionProvider } from '../../core/types';
import type { ServerEnv } from '../env';
import { analyzeFrames as analyzeWithAliyun } from './aliyun';
import { analyzeFrames as analyzeWithMock } from './mock';
import { analyzeFrames as analyzeWithOpenAI } from './openai';
import { analyzeFrames as analyzeWithZhipu } from './zhipu';
import { getModel, type ProviderAnalyzeOptions, type ProviderAnalyzeResult } from './common';

export function getVisionProvider(env: ServerEnv): VisionProvider {
  const provider = env.VISION_PROVIDER?.trim().toLowerCase();
  if (provider === 'zhipu' || provider === 'aliyun' || provider === 'openai' || provider === 'mock') return provider;
  return 'zhipu';
}

export function hasProviderKey(provider: VisionProvider, env: ServerEnv) {
  if (provider === 'mock') return true;
  if (provider === 'zhipu') return Boolean(env.ZHIPU_API_KEY?.trim());
  if (provider === 'aliyun') return Boolean(env.ALIYUN_API_KEY?.trim());
  return Boolean(env.OPENAI_API_KEY?.trim());
}

export async function analyzeFrames(input: AnalyzeFramesRequest, provider: VisionProvider, env: ServerEnv, options: ProviderAnalyzeOptions = {}): Promise<ProviderAnalyzeResult> {
  if (provider === 'zhipu') return analyzeWithZhipu(input, env, options);
  if (provider === 'aliyun') {
    const requestedModel = getModel(env, 'ALIYUN_MODEL', 'qwen-vl-plus');
    return {
      visionAnalysis: await analyzeWithAliyun(input, env),
      provider,
      requestedModel,
      actualModel: requestedModel,
      fallbackUsed: false,
      retryCount: 0,
      attemptedCallCount: 1,
      successCallCount: 1,
    };
  }
  if (provider === 'openai') {
    const requestedModel = getModel(env, 'OPENAI_MODEL', 'gpt-4o-mini');
    return {
      visionAnalysis: await analyzeWithOpenAI(input, env),
      provider,
      requestedModel,
      actualModel: requestedModel,
      fallbackUsed: false,
      retryCount: 0,
      attemptedCallCount: 1,
      successCallCount: 1,
    };
  }
  return {
    visionAnalysis: await analyzeWithMock(input),
    provider: 'mock',
    requestedModel: 'mock',
    actualModel: 'mock',
    fallbackUsed: false,
    retryCount: 0,
    attemptedCallCount: 0,
    successCallCount: 0,
  };
}

export { analyzeFrames as analyzeFramesWithMock } from './mock';
