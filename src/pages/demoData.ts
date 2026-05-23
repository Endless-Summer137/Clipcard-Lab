import type { DemoVideoInput } from '../core/types';

export interface DemoVideoConfig extends DemoVideoInput {
  authorName: string;
  videoDataUrl?: string;
  videoBlobKey?: string;
  videoFileName?: string;
  duration: number;
}

export const DEMO_CONFIG_KEY = 'clipcard-lab-demo-feed-inputs-v1';

let demoConfigNotice = '';

export const defaultDemoVideos: DemoVideoConfig[] = [
  {
    videoId: 'demo_food_001',
    videoTitle: '深夜小店热汤',
    videoDescription: '热汤上桌、门店环境和短暂停留动作，用于演示保存片段卡。',
    tags: ['美食', '探店'],
    defaultSegmentStart: 8,
    defaultSegmentEnd: 13,
    transcriptExcerpt: '这口汤刚上桌，热气很明显。',
    segmentNote: '菜品近景和店内氛围同时出现。',
    adCandidate: '门店团购',
    authorName: '@clipcard_food',
    sourceVideoUrl: 'https://example.com/clipcard/demo_food_001',
    duration: 72,
    activityEnabled: true,
    activityId: 'activity_food_partner',
    activityName: '#分享你的美食搭子',
    activityCta: '收集这一刻',
    targetClipbookTemplate: 'blank',
  },
  {
    videoId: 'demo_game_001',
    videoTitle: '团战反打高光',
    videoDescription: '操作高光、节奏变化和复看动机，用于演示游戏高光卡。',
    tags: ['游戏', '高光'],
    defaultSegmentStart: 21,
    defaultSegmentEnd: 28,
    transcriptExcerpt: '这一波可以复盘技能释放和走位。',
    segmentNote: '团战反打和操作节奏比较集中。',
    adCandidate: '游戏外设',
    authorName: '@clipcard_game',
    sourceVideoUrl: 'https://example.com/clipcard/demo_game_001',
    duration: 86,
    activityEnabled: true,
    activityId: 'activity_game_highlight',
    activityName: '#游戏高能操作时刻',
    activityCta: '收集高光',
    targetClipbookTemplate: 'fps',
  },
  {
    videoId: 'demo_travel_001',
    videoTitle: '城市转角风景',
    videoDescription: '旅行风景、地点线索和停留动作，用于演示旅行灵感卡。',
    tags: ['旅行', '风景'],
    defaultSegmentStart: 4,
    defaultSegmentEnd: 11,
    transcriptExcerpt: '',
    segmentNote: '画面出现城市转角和地点停留，像是出行灵感片段。',
    adCandidate: '景区广告',
    authorName: '@clipcard_travel',
    sourceVideoUrl: 'https://example.com/clipcard/demo_travel_001',
    duration: 60,
    activityEnabled: false,
  },
];

export function readDemoConfig() {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(DEMO_CONFIG_KEY);
    if (!raw) return defaultDemoVideos;
    let shouldRewrite = false;
    if (raw.includes('data:video')) {
      demoConfigNotice = '已忽略旧版视频缓存，请重新上传视频。';
      shouldRewrite = true;
    }
    const parsed = JSON.parse(raw) as Partial<DemoVideoConfig>[];
    const sanitized = defaultDemoVideos.map((fallback, index) => {
      const input = parsed[index] ?? {};
      if (typeof input.videoDataUrl === 'string' && input.videoDataUrl.startsWith('data:video')) {
        shouldRewrite = true;
      }
      return sanitizeDemoVideoConfig({
        ...fallback,
        ...input,
        videoId: input.videoId || fallback.videoId,
        tags: Array.isArray(input.tags) ? input.tags ?? fallback.tags : fallback.tags,
        activityEnabled: input.activityEnabled ?? fallback.activityEnabled,
        activityId: input.activityId ?? fallback.activityId,
        activityName: input.activityName ?? fallback.activityName,
        activityCta: input.activityCta ?? fallback.activityCta,
        targetClipbookTemplate: input.targetClipbookTemplate ?? fallback.targetClipbookTemplate,
        sourceVideoUrl: input.sourceVideoUrl ?? fallback.sourceVideoUrl,
      });
    });
    if (shouldRewrite) saveDemoConfig(sanitized);
    return sanitized;
  } catch {
    demoConfigNotice = '配置加载失败，已使用默认 demo 数据。';
    if (raw?.includes('data:video')) localStorage.removeItem(DEMO_CONFIG_KEY);
    return defaultDemoVideos;
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

function sanitizeDemoVideoConfig(video: DemoVideoConfig): DemoVideoConfig {
  const {
    videoDataUrl: _videoDataUrl,
    ...metadata
  } = video;
  return metadata;
}

export function parseTags(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
