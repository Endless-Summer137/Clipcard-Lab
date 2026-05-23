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
} from './common';

declare const setTimeout: (callback: () => void, timeout: number) => unknown;

const RETRY_DELAY_MS = 2400;

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
  const prompt = buildVisionPrompt(input);
  const images = getImageMessageParts(input);
  const maxAttempts = Math.max(0, options.maxAttempts ?? Number.MAX_SAFE_INTEGER);

  let attemptedCallCount = 0;
  let retryCount = 0;
  let lastError: unknown;
  let initialOverload = false;
  let primaryFailedModel: string | undefined;
  let primaryErrorCode: string | undefined;

  async function callModel(model: string) {
    if (attemptedCallCount >= maxAttempts) {
      throw new VisionProviderError({
        message: '今日真实视觉 API 调用次数已达上限。',
        errorType: 'daily_limit',
        model,
      });
    }

    attemptedCallCount += 1;
    const content = await postVisionChatCompletion({
      endpoint,
      apiKey: zhipuApiKey,
      model,
      prompt,
      images,
    });
    return parseVisionJson(content);
  }

  try {
    const visionAnalysis = await callModel(requestedModel);
    return {
      visionAnalysis,
      provider: 'zhipu',
      requestedModel,
      actualModel: requestedModel,
      fallbackUsed: false,
      retryCount,
      attemptedCallCount,
      successCallCount: 1,
    };
  } catch (error) {
    lastError = error;
    initialOverload = isProviderOverloaded(error);
    if (initialOverload) {
      const details = getProviderErrorDetails(error);
      primaryFailedModel = details.failedModel ?? requestedModel;
      primaryErrorCode = details.errorCode;
    }
  }

  if (initialOverload && attemptedCallCount < maxAttempts) {
    await delay(RETRY_DELAY_MS);
    retryCount = 1;
    try {
      const visionAnalysis = await callModel(requestedModel);
      return {
        visionAnalysis,
        provider: 'zhipu',
        requestedModel,
        actualModel: requestedModel,
        fallbackUsed: false,
        retryCount,
        attemptedCallCount,
        successCallCount: 1,
      };
    } catch (error) {
      lastError = error;
      if (isProviderOverloaded(error)) {
        const details = getProviderErrorDetails(error);
        primaryFailedModel = primaryFailedModel ?? details.failedModel ?? requestedModel;
        primaryErrorCode = primaryErrorCode ?? details.errorCode;
      }
    }
  }

  if (isProviderOverloaded(lastError)) {
    const overloadDetails = getProviderErrorDetails(lastError);
    for (const fallbackModel of fallbackModels) {
      if (attemptedCallCount >= maxAttempts) break;
      try {
        const visionAnalysis = await callModel(fallbackModel);
        return {
          visionAnalysis,
          provider: 'zhipu',
          requestedModel,
          actualModel: fallbackModel,
          failedModel: overloadDetails.failedModel ?? requestedModel,
          errorType: 'provider_overloaded',
          errorCode: overloadDetails.errorCode,
          fallbackReason: `${requestedModel} 当前访问量过大，已切换到备用模型 ${fallbackModel}。`,
          fallbackUsed: true,
          retryCount,
          attemptedCallCount,
          successCallCount: 1,
        };
      } catch (error) {
        lastError = error;
      }
    }
  }

  const finalDetails = getProviderErrorDetails(lastError);
  throw new VisionProviderError({
    message: finalDetails.message,
    errorType: initialOverload ? 'provider_overloaded' : finalDetails.errorType,
    code: primaryErrorCode ?? finalDetails.errorCode,
    model: primaryFailedModel ?? finalDetails.failedModel ?? requestedModel,
    requestedModel,
    fallbackReason: finalDetails.fallbackReason ?? (initialOverload
      ? '主模型当前访问量过大，备用模型未成功，已交给本地兜底。'
      : '真实视觉模型调用失败，已交给本地兜底。'),
    fallbackUsed: true,
    retryCount,
    attemptedCallCount,
    successCallCount: 0,
  });
}

function getFallbackModels(env: ServerEnv, primaryModel: string) {
  return String(env.ZHIPU_FALLBACK_MODELS ?? '')
    .split(',')
    .map((model) => model.trim())
    .filter((model) => model && model !== primaryModel);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
