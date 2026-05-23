import type { AnalyzeFramesRequest, VisionAnalysis } from '../../core/types';
import type { ServerEnv } from '../env';
import { buildVisionPrompt, getImageMessageParts, getModel, parseVisionJson, postVisionChatCompletion } from './common';

export async function analyzeFrames(input: AnalyzeFramesRequest, env: ServerEnv): Promise<VisionAnalysis> {
  const apiKey = env.ALIYUN_API_KEY?.trim();
  if (!apiKey) throw new Error('缺少 ALIYUN_API_KEY。');

  const content = await postVisionChatCompletion({
    endpoint: env.ALIYUN_ENDPOINT?.trim() || 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey,
    model: getModel(env, 'ALIYUN_MODEL', 'qwen-vl-plus'),
    prompt: buildVisionPrompt(input),
    images: getImageMessageParts(input),
  });

  return parseVisionJson(content);
}
