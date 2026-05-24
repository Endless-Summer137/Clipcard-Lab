import type { AnalyzeFramesRequest } from '../../core/types';
import type { ServerEnv } from '../env';
import {
  VisionProviderError,
  buildVisionPrompt,
  getImageMessageParts,
  getModel,
  getProviderErrorDetails,
  isProviderOverloaded,
  parseVisionJson,
  postVisionChatCompletion,
  type ProviderAnalyzeOptions,
  type ProviderAnalyzeResult,
  type VisionModelStatus,
} from './common';

declare const AbortController: {
  new(): { signal: unknown; abort: () => void };
};
declare const setTimeout: (callback: () => void, timeout: number) => unknown;
declare const clearTimeout: (timeout: unknown) => void;

const DEFAULT_MODEL_TIMEOUT_MS = 1200;
const DEFAULT_TOTAL_TIMEOUT_MS = 2600;

export async function analyzeFrames(input: AnalyzeFramesRequest, env: ServerEnv, options: ProviderAnalyzeOptions = {}): Promise<ProviderAnalyzeResult> {
  const apiKey = env.ZHIPU_API_KEY?.trim();
  if (!apiKey) {
    throw new VisionProviderError({
      message: 'missing_api_key',
      errorType: 'missing_api_key',
    });
  }
  const zhipuApiKey = apiKey;

  const endpoint = env.ZHIPU_ENDPOINT?.trim() || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
  const requestedModel = getModel(env, 'ZHIPU_MODEL', 'glm-4.6v-flash');
  const fallbackModels = getFallbackModels(env, requestedModel);
  const fallbackModel = fallbackModels[0];
  const fallbackEnabled = env.VISION_ENABLE_FALLBACK_MODEL?.trim().toLowerCase() !== 'false';
  const primaryTimeoutMs = getPositiveNumber(env.VISION_API_TIMEOUT_MS, DEFAULT_MODEL_TIMEOUT_MS);
  const fallbackTimeoutMs = getPositiveNumber(env.VISION_API_TIMEOUT_MS, DEFAULT_MODEL_TIMEOUT_MS);
  const totalTimeoutMs = getPositiveNumber(env.VISION_TOTAL_TIMEOUT_MS, DEFAULT_TOTAL_TIMEOUT_MS);
  const startedAt = Date.now();
  const prompt = buildVisionPrompt(input);
  const images = getImageMessageParts(input);
  const maxAttempts = Math.max(0, options.maxAttempts ?? Number.MAX_SAFE_INTEGER);

  let attemptedCallCount = 0;
  let lastError: unknown;
  let primaryFailedModel: string | undefined;
  let primaryErrorCode: string | undefined;
  let primaryStatus: VisionModelStatus = 'skipped';
  let fallbackStatus: VisionModelStatus = 'skipped';

  async function callModel(model: string, timeoutMs: number) {
    if (attemptedCallCount >= maxAttempts) {
      throw new VisionProviderError({
        message: '今日真实视觉 API 调用次数已达上限。',
        errorType: 'daily_limit',
        model,
      });
    }

    attemptedCallCount += 1;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const content = await postVisionChatCompletion({
        endpoint,
        apiKey: zhipuApiKey,
        model,
        prompt,
        images,
        signal: controller.signal,
      });
      return parseVisionJson(content);
    } catch (error) {
      if (isAbortError(error)) {
        throw new VisionProviderError({
          message: `视觉模型 ${model} 等待超时。`,
          errorType: 'timeout',
          model,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  try {
    const visionAnalysis = await callModel(requestedModel, primaryTimeoutMs);
    primaryStatus = 'success';
    return {
      visionAnalysis,
      provider: 'zhipu',
      requestedModel,
      actualModel: requestedModel,
      primaryModel: requestedModel,
      fallbackModel,
      fallbackUsed: false,
      retryCount: 0,
      primaryTimeoutMs,
      fallbackTimeoutMs,
      totalElapsedMs: Date.now() - startedAt,
      primaryStatus,
      fallbackStatus: 'skipped',
      finalAnalysisSource: 'vision_api',
      attemptedCallCount,
      successCallCount: 1,
    };
  } catch (error) {
    lastError = error;
    primaryStatus = getModelStatus(error);
    const details = getProviderErrorDetails(error);
    primaryFailedModel = details.failedModel ?? requestedModel;
    primaryErrorCode = details.errorCode;
  }

  const canTryFallback = Boolean(
    fallbackEnabled
    && fallbackModel
    && attemptedCallCount < maxAttempts
    && Date.now() - startedAt < totalTimeoutMs,
  );

  if (canTryFallback) {
    try {
      const remainingBudgetMs = Math.max(250, totalTimeoutMs - (Date.now() - startedAt));
      const visionAnalysis = await callModel(fallbackModel, Math.min(fallbackTimeoutMs, remainingBudgetMs));
      fallbackStatus = 'success';
      return {
        visionAnalysis,
        provider: 'zhipu',
        requestedModel,
        actualModel: fallbackModel,
        primaryModel: requestedModel,
        fallbackModel,
        failedModel: primaryFailedModel ?? requestedModel,
        errorType: getProviderErrorDetails(lastError).errorType,
        errorCode: primaryErrorCode,
        fallbackReason: `${requestedModel} 未在演示等待时间内完成，已切换到备用模型 ${fallbackModel}。`,
        fallbackUsed: true,
        retryCount: 0,
        primaryTimeoutMs,
        fallbackTimeoutMs,
        totalElapsedMs: Date.now() - startedAt,
        primaryStatus,
        fallbackStatus,
        finalAnalysisSource: 'vision_api',
        attemptedCallCount,
        successCallCount: 1,
      };
    } catch (error) {
      lastError = error;
      fallbackStatus = getModelStatus(error);
    }
  }

  const finalDetails = getProviderErrorDetails(lastError);
  throw new VisionProviderError({
    message: finalDetails.message,
    errorType: primaryStatus === 'overloaded' ? 'provider_overloaded' : finalDetails.errorType,
    code: primaryErrorCode ?? finalDetails.errorCode,
    model: primaryFailedModel ?? finalDetails.failedModel ?? requestedModel,
    requestedModel,
    fallbackReason: finalDetails.fallbackReason ?? getFallbackReason(primaryStatus, fallbackStatus, fallbackEnabled, fallbackModel),
    fallbackUsed: true,
    retryCount: 0,
    primaryTimeoutMs,
    fallbackTimeoutMs,
    totalElapsedMs: Date.now() - startedAt,
    primaryStatus,
    fallbackStatus: canTryFallback ? fallbackStatus : 'skipped',
    finalAnalysisSource: 'mock_fallback',
    attemptedCallCount,
    successCallCount: 0,
  });
}

function getFallbackModels(env: ServerEnv, primaryModel: string) {
  return String(env.ZHIPU_FALLBACK_MODELS ?? 'glm-4v-flash')
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model && model !== primaryModel);
}

function getPositiveNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === 'AbortError';
}

function getModelStatus(error: unknown): VisionModelStatus {
  const details = getProviderErrorDetails(error);
  if (details.errorType === 'timeout') return 'timeout';
  if (isProviderOverloaded(error)) return 'overloaded';
  return 'error';
}

function getFallbackReason(primaryStatus: VisionModelStatus, fallbackStatus: VisionModelStatus, fallbackEnabled: boolean, fallbackModel?: string) {
  if (primaryStatus === 'timeout' && fallbackStatus === 'timeout') return '视觉模型连续超时，已使用本地兜底生成。';
  if (primaryStatus === 'timeout') return fallbackModel && fallbackEnabled
    ? '主模型等待超时，备用模型未成功，已使用本地兜底生成。'
    : '主模型等待超时，已使用本地兜底生成。';
  if (primaryStatus === 'overloaded') return fallbackModel && fallbackEnabled
    ? '主模型当前访问量过大，备用模型未成功，已使用本地兜底生成。'
    : '主模型当前访问量过大，已使用本地兜底生成。';
  return '真实视觉模型调用失败，已使用本地兜底生成。';
}
