import type { DemoVideoInput } from '../core/types';
import { DEMO_VIDEOS } from '../demo/defaultDemoData';

export interface DemoVideoConfig extends DemoVideoInput {
  authorName: string;
  videoDataUrl?: string;
  videoBlobKey?: string;
  videoFileName?: string;
  duration: number;
  demoConfigVersion?: number;
}

export const DEMO_CONFIG_KEY = 'clipcard-lab-demo-feed-inputs-v1';
const DEMO_CONFIG_VERSION = 3;

let demoConfigNotice = '';

export const defaultDemoVideos: DemoVideoConfig[] = DEMO_VIDEOS.map((video) => sanitizeDemoVideoConfig({
  ...video,
  demoConfigVersion: DEMO_CONFIG_VERSION,
}));

export function readDemoConfig() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DEMO_CONFIG_KEY);
    if (!raw) return defaultDemoVideos.map(sanitizeDemoVideoConfig);

    let shouldRewrite = false;
    if (raw.includes('data:video')) {
      demoConfigNotice = '已忽略旧版视频缓存，请重新上传视频。';
      shouldRewrite = true;
    }

    const parsed = JSON.parse(raw) as Partial<DemoVideoConfig>[];
    const sanitized = defaultDemoVideos.map((fallback, index) => {
      const input = findStoredDemoConfig(parsed, fallback, index);
      if (typeof input.videoDataUrl === 'string' && input.videoDataUrl.startsWith('data:video')) {
        shouldRewrite = true;
      }

      const merged = mergeStoredDemoConfig(fallback, input);
      if (JSON.stringify(merged) !== JSON.stringify(input)) shouldRewrite = true;
      return sanitizeDemoVideoConfig(merged);
    });

    if (shouldRewrite) saveDemoConfig(sanitized);
    return sanitized;
  } catch {
    demoConfigNotice = '配置加载失败，已使用默认 demo 数据。';
    if (raw?.includes('data:video')) localStorage.removeItem(DEMO_CONFIG_KEY);
    return defaultDemoVideos.map(sanitizeDemoVideoConfig);
  }
}

export function saveDemoConfig(videos: DemoVideoConfig[]) {
  const payload = videos.slice(0, 3).map(sanitizeDemoVideoConfig);
  localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(payload));
}

export function getDemoConfigNotice() {
  return demoConfigNotice;
}

export function clearDemoConfigNotice() {
  demoConfigNotice = '';
}

export function clearDemoConfig() {
  localStorage.removeItem(DEMO_CONFIG_KEY);
  demoConfigNotice = '';
}

function findStoredDemoConfig(parsed: Partial<DemoVideoConfig>[], fallback: DemoVideoConfig, index: number) {
  const exactMatch = parsed.find((item) => item.videoId === fallback.videoId);
  if (exactMatch) return exactMatch;

  if (fallback.videoId === 'demo_city_001') {
    const legacyTravel = parsed.find((item) => item.videoId === 'demo_travel_001');
    if (legacyTravel) return legacyTravel;
  }

  return parsed[index] ?? {};
}

function mergeStoredDemoConfig(fallback: DemoVideoConfig, input: Partial<DemoVideoConfig>) {
  const hasCurrentSchema = input.demoConfigVersion === DEMO_CONFIG_VERSION;

  if (!hasCurrentSchema) {
    return sanitizeDemoVideoConfig({
      ...fallback,
      videoBlobKey: input.videoBlobKey,
      videoFileName: input.videoFileName,
      duration: Number.isFinite(input.duration) ? (input.duration as number) : fallback.duration,
    });
  }

  return migrateDemoVideoConfig({
    ...fallback,
    ...input,
    assetUrl: fallback.assetUrl,
    videoId: input.videoId || fallback.videoId,
    tags: Array.isArray(input.tags) ? input.tags : fallback.tags,
    activityEnabled: input.activityEnabled ?? fallback.activityEnabled,
    activityId: input.activityId ?? fallback.activityId,
    activityName: input.activityName ?? fallback.activityName,
    activityCta: input.activityCta ?? fallback.activityCta,
    targetClipbookTemplate: input.targetClipbookTemplate ?? fallback.targetClipbookTemplate,
    sourceVideoUrl: input.sourceVideoUrl ?? fallback.sourceVideoUrl,
    demoConfigVersion: DEMO_CONFIG_VERSION,
  }, input, fallback);
}

function sanitizeDemoVideoConfig(video: DemoVideoConfig): DemoVideoConfig {
  const {
    videoDataUrl: _videoDataUrl,
    ...metadata
  } = video;
  return {
    ...metadata,
    tags: Array.isArray(metadata.tags) ? metadata.tags.map((item) => item.trim()).filter(Boolean) : [],
    segmentFacts: normalizeTextOrList(metadata.segmentFacts),
    keyActions: normalizeTextOrList(metadata.keyActions),
    segmentOutcome: metadata.segmentOutcome?.trim() ?? '',
    userValue: metadata.userValue?.trim() ?? '',
    visibleTextOrOcr: metadata.visibleTextOrOcr?.trim() ?? '',
    featuredPersonOrId: metadata.featuredPersonOrId?.trim() ?? '',
    uncertainties: normalizeTextOrList(metadata.uncertainties),
    assetUrl: metadata.assetUrl?.trim(),
    demoConfigVersion: DEMO_CONFIG_VERSION,
  };
}

function normalizeTextOrList(value?: string | string[]) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return value?.trim() ?? '';
}

function migrateDemoVideoConfig(video: DemoVideoConfig, input: Partial<DemoVideoConfig>, fallback: DemoVideoConfig) {
  if (fallback.videoId !== 'demo_game_001') return video;
  const hasNewSignal = Boolean(input.segmentFacts || input.keyActions || input.userValue || input.featuredPersonOrId);
  if (hasNewSignal) return video;

  const next = { ...video };
  if (!input.videoTitle || input.videoTitle === '团战反打高光') next.videoTitle = fallback.videoTitle;
  if (!input.videoDescription || input.videoDescription.includes('操作高光')) next.videoDescription = fallback.videoDescription;
  if (!Array.isArray(input.tags) || input.tags.join(',') === '游戏,高光') next.tags = fallback.tags;
  if (!input.transcriptExcerpt || input.transcriptExcerpt.includes('这一波可以复盘')) next.transcriptExcerpt = fallback.transcriptExcerpt;
  if (!input.segmentNote || input.segmentNote.includes('团战反打')) next.segmentNote = fallback.segmentNote;
  if (!input.authorName || input.authorName === '@clipcard_game') next.authorName = fallback.authorName;
  next.segmentFacts = fallback.segmentFacts;
  next.keyActions = fallback.keyActions;
  next.segmentOutcome = fallback.segmentOutcome;
  next.userValue = fallback.userValue;
  next.visibleTextOrOcr = fallback.visibleTextOrOcr;
  next.featuredPersonOrId = fallback.featuredPersonOrId;
  next.uncertainties = fallback.uncertainties;
  return next;
}

export function parseTags(value: string) {
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
