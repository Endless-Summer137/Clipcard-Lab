import type { DemoVideoInput } from '../core/types';

export interface DemoVideoConfig extends DemoVideoInput {
  authorName: string;
  videoDataUrl?: string;
  duration: number;
}

export const DEMO_CONFIG_KEY = 'clipcard-lab-demo-feed-inputs-v1';

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
    duration: 72,
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
    duration: 86,
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
    duration: 60,
  },
];

export function readDemoConfig() {
  try {
    const raw = localStorage.getItem(DEMO_CONFIG_KEY);
    if (!raw) return defaultDemoVideos;
    const parsed = JSON.parse(raw) as Partial<DemoVideoConfig>[];
    return defaultDemoVideos.map((fallback, index) => ({
      ...fallback,
      ...parsed[index],
      videoId: parsed[index]?.videoId || fallback.videoId,
      tags: Array.isArray(parsed[index]?.tags) ? parsed[index]?.tags ?? fallback.tags : fallback.tags,
    }));
  } catch {
    return defaultDemoVideos;
  }
}

export function saveDemoConfig(videos: DemoVideoConfig[]) {
  localStorage.setItem(DEMO_CONFIG_KEY, JSON.stringify(videos.slice(0, 3)));
}

export function parseTags(value: string) {
  return value
    .split(/[，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('视频读取失败，请重新选择文件。'));
    reader.readAsDataURL(file);
  });
}
