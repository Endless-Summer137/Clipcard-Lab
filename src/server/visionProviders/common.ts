import type { AnalyzeFramesRequest, VisionAnalysis } from '../../core/types';
import type { ServerEnv } from '../env';

declare const fetch: (input: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export function buildVisionPrompt(input: AnalyzeFramesRequest) {
  return [
    '你是 ClipCard 的谨慎视觉分析器。请只根据提供的关键帧、视频标题、活动名称和视频简介判断。',
    '不要假装分析了音频、口播、字幕、OCR、背景音乐或完整视频。',
    '如果关键帧信息不足，请返回 contentType 为 low_info 或 unknown，并给出低置信度。',
    '如果适合生成卡片，请给出 suggestedCardType；所有结论都使用谨慎表达。',
    '只输出 JSON，不要输出 Markdown 或解释性长文。',
    '',
    `videoId: ${input.videoId}`,
    `videoTitle: ${input.videoTitle}`,
    `activityName: ${input.activityName ?? '无'}`,
    `videoDescription: ${input.videoDescription ?? '无'}`,
    `segment: ${input.segmentStart}-${input.segmentEnd}`,
    '',
    'JSON schema:',
    '{"confidence":"low|medium|high","contentType":"food|game|travel|people|low_info|unknown","visualSummary":"谨慎的一句话总结","visibleObjects":["对象1"],"likelyScene":"可能场景","cardSuggestion":{"shouldGenerateFullCard":true,"suggestedCardType":"卡片类型","reason":"原因"},"limitations":["限制1"]}',
  ].join('\n');
}

export function getImageMessageParts(input: AnalyzeFramesRequest) {
  return input.keyframes.slice(0, 3).map((frame) => ({
    type: 'image_url',
    image_url: { url: frame.image },
  }));
}

export async function postVisionChatCompletion({
  endpoint,
  apiKey,
  model,
  prompt,
  images,
}: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  images: Array<{ type: string; image_url: { url: string } }>;
}) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: 'json_object' },
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...images,
        ],
      }],
    }),
  });

  const raw = await response.text();
  if (!response.ok) throw new Error(`视觉模型请求失败：${response.status} ${raw.slice(0, 200)}`);

  const data = JSON.parse(raw) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return data.choices?.[0]?.message?.content ?? '';
}

export function parseVisionJson(content: string): VisionAnalysis {
  const jsonText = extractJsonObject(content);
  const parsed = JSON.parse(jsonText) as Partial<VisionAnalysis>;
  return normalizeVisionAnalysis(parsed);
}

export function normalizeVisionAnalysis(value: Partial<VisionAnalysis>): VisionAnalysis {
  const confidence = value.confidence === 'high' || value.confidence === 'medium' || value.confidence === 'low' ? value.confidence : 'low';
  const contentTypes: VisionAnalysis['contentType'][] = ['food', 'game', 'travel', 'people', 'low_info', 'unknown'];
  const contentType = value.contentType && contentTypes.includes(value.contentType) ? value.contentType : 'unknown';

  return {
    confidence,
    contentType,
    visualSummary: String(value.visualSummary || '关键帧信息有限，暂不做确定判断。').slice(0, 160),
    visibleObjects: Array.isArray(value.visibleObjects) ? value.visibleObjects.map(String).slice(0, 8) : [],
    likelyScene: String(value.likelyScene || '未知场景').slice(0, 80),
    cardSuggestion: {
      shouldGenerateFullCard: Boolean(value.cardSuggestion?.shouldGenerateFullCard),
      suggestedCardType: String(value.cardSuggestion?.suggestedCardType || '待补充片段').slice(0, 40),
      reason: String(value.cardSuggestion?.reason || '关键帧信息不足，需要保守处理。').slice(0, 160),
    },
    limitations: Array.isArray(value.limitations)
      ? value.limitations.map(String).slice(0, 6)
      : ['仅分析了抽取的关键帧，没有分析音频、字幕、OCR 或完整视频。'],
  };
}

export function getModel(env: ServerEnv, key: string, fallback: string) {
  return env[key]?.trim() || fallback;
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error('视觉模型没有返回 JSON。');
}
