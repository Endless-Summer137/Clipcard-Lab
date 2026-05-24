import type { AnalyzeFramesRequest, VisionAnalysis, VisionErrorType, VisionProvider } from '../../core/types';
import type { ServerEnv } from '../env';

declare const fetch: (input: string, init?: {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: unknown;
}) => Promise<{
  ok: boolean;
  status: number;
  text: () => Promise<string>;
}>;

export interface ProviderAnalyzeOptions {
  maxAttempts?: number;
}

export type VisionModelStatus = 'success' | 'timeout' | 'overloaded' | 'error' | 'skipped';

export interface ProviderAnalyzeResult {
  visionAnalysis: VisionAnalysis;
  provider: VisionProvider;
  requestedModel?: string;
  actualModel?: string;
  primaryModel?: string;
  fallbackModel?: string;
  failedModel?: string;
  errorType?: VisionErrorType;
  errorCode?: string;
  fallbackReason?: string;
  fallbackUsed: boolean;
  retryCount: number;
  primaryTimeoutMs?: number;
  fallbackTimeoutMs?: number;
  totalElapsedMs?: number;
  primaryStatus?: VisionModelStatus;
  fallbackStatus?: VisionModelStatus;
  finalAnalysisSource?: 'vision_api' | 'rule_fallback' | 'mock_fallback';
  attemptedCallCount: number;
  successCallCount: number;
}

export class VisionProviderError extends Error {
  status?: number;
  code?: string;
  errorType: VisionErrorType;
  raw?: string;
  model?: string;
  requestedModel?: string;
  fallbackReason?: string;
  fallbackUsed?: boolean;
  retryCount?: number;
  primaryTimeoutMs?: number;
  fallbackTimeoutMs?: number;
  totalElapsedMs?: number;
  primaryStatus?: VisionModelStatus;
  fallbackStatus?: VisionModelStatus;
  finalAnalysisSource?: 'vision_api' | 'rule_fallback' | 'mock_fallback';
  attemptedCallCount?: number;
  successCallCount?: number;

  constructor(input: {
    message: string;
    status?: number;
    code?: string;
    errorType?: VisionErrorType;
    raw?: string;
    model?: string;
    requestedModel?: string;
    fallbackReason?: string;
    fallbackUsed?: boolean;
    retryCount?: number;
    primaryTimeoutMs?: number;
    fallbackTimeoutMs?: number;
    totalElapsedMs?: number;
    primaryStatus?: VisionModelStatus;
    fallbackStatus?: VisionModelStatus;
    finalAnalysisSource?: 'vision_api' | 'rule_fallback' | 'mock_fallback';
    attemptedCallCount?: number;
    successCallCount?: number;
  }) {
    super(input.message);
    this.name = 'VisionProviderError';
    this.status = input.status;
    this.code = input.code;
    this.errorType = input.errorType ?? 'provider_error';
    this.raw = input.raw;
    this.model = input.model;
    this.requestedModel = input.requestedModel;
    this.fallbackReason = input.fallbackReason;
    this.fallbackUsed = input.fallbackUsed;
    this.retryCount = input.retryCount;
    this.primaryTimeoutMs = input.primaryTimeoutMs;
    this.fallbackTimeoutMs = input.fallbackTimeoutMs;
    this.totalElapsedMs = input.totalElapsedMs;
    this.primaryStatus = input.primaryStatus;
    this.fallbackStatus = input.fallbackStatus;
    this.finalAnalysisSource = input.finalAnalysisSource;
    this.attemptedCallCount = input.attemptedCallCount;
    this.successCallCount = input.successCallCount;
  }
}

export function isProviderOverloaded(error: unknown) {
  if (error instanceof VisionProviderError) return error.errorType === 'provider_overloaded';
  if (!(error instanceof Error)) return false;
  return error.message.includes('429') || error.message.includes('1305') || error.message.includes('访问量过大');
}

export interface ProviderErrorDetails {
  message: string;
  errorType: VisionErrorType;
  errorCode?: string;
  failedModel?: string;
  requestedModel?: string;
  fallbackReason?: string;
  fallbackUsed?: boolean;
  retryCount?: number;
  primaryTimeoutMs?: number;
  fallbackTimeoutMs?: number;
  totalElapsedMs?: number;
  primaryStatus?: VisionModelStatus;
  fallbackStatus?: VisionModelStatus;
  finalAnalysisSource?: 'vision_api' | 'rule_fallback' | 'mock_fallback';
  attemptedCallCount?: number;
  successCallCount?: number;
}

export function getProviderErrorDetails(error: unknown): ProviderErrorDetails {
  if (error instanceof VisionProviderError) {
    return {
      message: error.message,
      errorType: error.errorType,
      errorCode: error.code,
      failedModel: error.model,
      requestedModel: error.requestedModel,
      fallbackReason: error.fallbackReason,
      fallbackUsed: error.fallbackUsed,
      retryCount: error.retryCount,
      primaryTimeoutMs: error.primaryTimeoutMs,
      fallbackTimeoutMs: error.fallbackTimeoutMs,
      totalElapsedMs: error.totalElapsedMs,
      primaryStatus: error.primaryStatus,
      fallbackStatus: error.fallbackStatus,
      finalAnalysisSource: error.finalAnalysisSource,
      attemptedCallCount: error.attemptedCallCount,
      successCallCount: error.successCallCount,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      errorType: isProviderOverloaded(error) ? 'provider_overloaded' : 'provider_error',
    };
  }

  return {
    message: '视觉模型调用失败。',
    errorType: 'unknown',
  };
}

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
  signal,
}: {
  endpoint: string;
  apiKey: string;
  model: string;
  prompt: string;
  images: Array<{ type: string; image_url: { url: string } }>;
  signal?: unknown;
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
    signal,
  });

  const raw = await response.text();
  if (!response.ok) {
    const parsedError = parseProviderError(raw);
    const errorType = classifyProviderError(response.status, parsedError.code, parsedError.message);
    throw new VisionProviderError({
      status: response.status,
      code: parsedError.code,
      errorType,
      raw,
      model,
      message: `视觉模型请求失败：${response.status} ${raw.slice(0, 200)}`,
    });
  }

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

function parseProviderError(raw: string) {
  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: string | number; message?: string };
      code?: string | number;
      message?: string;
    };
    return {
      code: parsed.error?.code !== undefined ? String(parsed.error.code) : parsed.code !== undefined ? String(parsed.code) : undefined,
      message: parsed.error?.message ?? parsed.message ?? raw,
    };
  } catch {
    return {
      code: undefined,
      message: raw,
    };
  }
}

export function classifyProviderError(status: number, code?: string, message = ''): VisionErrorType {
  if (status === 429 || code === '1305' || message.includes('访问量过大')) return 'provider_overloaded';
  return 'provider_error';
}

function extractJsonObject(content: string) {
  const trimmed = content.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed;
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  throw new Error('视觉模型没有返回 JSON。');
}
