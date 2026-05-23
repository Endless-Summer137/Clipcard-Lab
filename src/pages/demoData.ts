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
    segmentFacts: '热汤上桌、菜品近景和店内环境同时出现，适合记录一次探店片段。',
    keyActions: ['热汤上桌', '菜品近景', '店内停留'],
    segmentOutcome: '可作为美食探店活动中的菜品和门店氛围片段收藏。',
    userValue: '适合之后回看点单参考、整理探店记录或加入美食活动手账。',
    visibleTextOrOcr: '',
    featuredPersonOrId: '',
    uncertainties: '当前未确认店名、价格、具体菜品名称和完整口播信息。',
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
    videoTitle: 'm0NESY 2025 超神高光回顾',
    videoDescription: 'CS/FPS 职业选手 m0NESY 的高光混剪，包含多段狙击、击杀、残局或回合收尾片段。视频以音乐剪辑为主，缺少口播和字幕，具体地图、比赛场次和对阵信息需要结合原视频或赛事资料确认。',
    tags: ['CS2', 'FPS', 'm0NESY', 'AWP', '狙击', '游戏高光', '职业选手', '高光混剪', '游戏高能操作时刻'],
    defaultSegmentStart: 21,
    defaultSegmentEnd: 28,
    transcriptExcerpt: '无明确口播或字幕；音频主要为剪辑音乐。',
    segmentNote: '这是一段 m0NESY CS/FPS 高光混剪中的片段。画面以第一人称狙击视角为主，可能出现开镜预瞄、击杀、回合切换或场景转场。由于这是混剪，关键帧可能来自不同地图或不同场次，不应直接判断具体比赛、地图或对阵队伍。',
    segmentFacts: '这是一段 CS/FPS 职业选手 m0NESY 的高光混剪片段。关键帧中可见第一人称狙击/瞄准视角、游戏 HUD、击杀或回合变化画面。由于视频是混剪，画面可能来自不同地图、不同场次或不同对局片段。',
    keyActions: ['AWP/狙击视角', '开镜预瞄', '击杀高光', '回合收尾', '场景切换', '高光混剪'],
    segmentOutcome: '可作为 m0NESY 高光操作片段收藏；具体比赛结果、地图、对阵队伍和赛事场次暂不判断。',
    userValue: '适合加入 #游戏高能操作时刻 活动手账，用来收藏 m0NESY 的精彩狙击/击杀瞬间，也适合之后回看操作节奏、分享给朋友讨论或整理 FPS 高光册。',
    visibleTextOrOcr: '画面中可能出现 m0NESY、游戏 HUD、比分、击杀提示等信息；具体文字需要 OCR 或人工确认。',
    featuredPersonOrId: 'm0NESY',
    uncertainties: '当前视频为高光混剪，关键帧可能跨地图、跨比赛、跨场次；未分析完整音频、字幕、OCR 和连续操作过程；不判断具体地图、赛事、对阵队伍和每一枪的战术细节。',
    adCandidate: '游戏外设',
    authorName: '@ZqLjy20231124（仅做演示用）',
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
    segmentFacts: '画面出现城市转角、道路或建筑环境，适合记录一个旅行灵感点。',
    keyActions: ['城市转角', '地点停留', '风景记录'],
    segmentOutcome: '可作为旅行灵感片段收藏。',
    userValue: '适合之后回看地点氛围、整理旅行手账或作为出行灵感。',
    visibleTextOrOcr: '',
    featuredPersonOrId: '',
    uncertainties: '当前未确认具体地点、路线和拍摄时间。',
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
      const merged = migrateDemoVideoConfig({
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
      }, input, fallback);
      if (JSON.stringify(merged) !== JSON.stringify(input)) shouldRewrite = true;
      return sanitizeDemoVideoConfig(merged);
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
  return {
    ...metadata,
    tags: Array.isArray(metadata.tags) ? metadata.tags.filter(Boolean) : [],
    segmentFacts: normalizeTextOrList(metadata.segmentFacts),
    keyActions: normalizeTextOrList(metadata.keyActions),
    segmentOutcome: metadata.segmentOutcome?.trim() ?? '',
    userValue: metadata.userValue?.trim() ?? '',
    visibleTextOrOcr: metadata.visibleTextOrOcr?.trim() ?? '',
    featuredPersonOrId: metadata.featuredPersonOrId?.trim() ?? '',
    uncertainties: normalizeTextOrList(metadata.uncertainties),
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
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
