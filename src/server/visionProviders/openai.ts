import type { AnalyzeFramesRequest, VisionAnalysis } from '../../core/types';
import type { ServerEnv } from '../env';
import { buildVisionPrompt, getImageMessageParts, getModel, parseVisionJson, postVisionChatCompletion } from './common';

export async function analyzeFrames(input: AnalyzeFramesRequest, env: ServerEnv): Promise<VisionAnalysis> {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error('缺少 OPENAI_API_KEY。');

  const content = await postVisionChatCompletion({
    endpoint: env.OPENAI_ENDPOINT?.trim() || 'https://api.openai.com/v1/chat/completions',
    apiKey,
    model: getModel(env, 'OPENAI_MODEL', 'gpt-4o-mini'),
    prompt: buildVisionPrompt(input),
    images: getImageMessageParts(input),
  });

  return parseVisionJson(content);
}
