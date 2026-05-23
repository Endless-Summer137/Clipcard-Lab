import type { AnalyzeFramesRequest, VisionAnalysis } from '../../core/types';
import type { ServerEnv } from '../env';
import { buildVisionPrompt, getImageMessageParts, getModel, parseVisionJson, postVisionChatCompletion } from './common';

export async function analyzeFrames(input: AnalyzeFramesRequest, env: ServerEnv): Promise<VisionAnalysis> {
  const apiKey = env.ZHIPU_API_KEY?.trim();
  if (!apiKey) throw new Error('missing_api_key');

  const content = await postVisionChatCompletion({
    endpoint: env.ZHIPU_ENDPOINT?.trim() || 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey,
    model: getModel(env, 'ZHIPU_MODEL', 'glm-4.6v-flash'),
    prompt: buildVisionPrompt(input),
    images: getImageMessageParts(input),
  });

  return parseVisionJson(content);
}
