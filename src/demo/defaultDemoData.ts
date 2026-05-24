import type { DemoVideoInput } from '../core/types';

export type DemoVideoAssetConfig = DemoVideoInput & {
  authorName: string;
  assetUrl: string;
  duration: number;
};

export interface DemoTemplateSlotConfig {
  id: string;
  slotId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface DemoTemplateConfig {
  templateId: 'fps' | 'scenery' | 'blank';
  name: string;
  description: string;
  backgroundImage: string;
  slots: DemoTemplateSlotConfig[];
}

export const DEMO_VIDEOS: DemoVideoAssetConfig[] = [
  {
    videoId: 'demo_food_001',
    assetUrl: '/demo-assets/videos/food.mp4',
    videoTitle: '热锅上的烟火气',
    authorName: '@clipcard_food',
    sourceVideoUrl: 'https://example.com/clipcard/demo_food_001',
    videoDescription: '餐桌、调料、菜品，以及升腾的热气，美食治愈人心。',
    tags: ['美食', '探店', '热锅', '火锅', '餐桌', '烟火气', '美食搭子', '活动手账'],
    defaultSegmentStart: 8,
    defaultSegmentEnd: 13,
    transcriptExcerpt: '无明确口播或字幕；音频主要为空镜氛围或背景音乐。',
    segmentNote: '这是一段美食空镜素材，画面包含热气腾腾的锅物、辣味菜品特写和餐桌氛围。没有明确店名、价格、菜单或口播信息，因此不应直接判断具体门店或真实消费信息。',
    segmentFacts: '画面展示热气腾腾的锅物和辣味菜品特写，食物表面有油光、辣椒、蒸汽和近景质感，整体更像美食氛围或菜品展示片段。',
    keyActions: ['热锅沸腾', '菜品特写', '热气上升', '餐桌氛围展示'],
    segmentOutcome: '适合作为美食活动中的心动菜品或烟火气片段收藏；不判断具体店铺、价格或菜名。',
    userValue: '适合加入 #分享你的美食搭子 活动手账，用来记录一段有食欲和生活氛围的美食瞬间，也适合之后做探店灵感或美食回忆卡。',
    visibleTextOrOcr: '无明显可读文字。',
    featuredPersonOrId: '',
    uncertainties: '当前视频无口播、无字幕、无店名和菜单信息；不判断具体门店、价格、菜名和真实推荐程度。',
    adCandidate: '',
    duration: 72,
    activityEnabled: true,
    activityId: 'activity_food_partner',
    activityName: '#分享你的美食搭子',
    activityCta: '收集这一刻',
    targetClipbookTemplate: 'blank',
  },
  {
    videoId: 'demo_game_001',
    assetUrl: '/demo-assets/videos/game.mp4',
    videoTitle: 'm0NESY 2025 超神高光回顾',
    authorName: '@ZqLjy20231124（仅做演示用）',
    sourceVideoUrl: 'https://example.com/clipcard/demo_game_001',
    videoDescription: '“我大尼之神啊！搓江湖下饭锅” m0NESY 荣获 2025 年度 TOP4！年度超神操作精选！',
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
    duration: 86,
    activityEnabled: true,
    activityId: 'activity_game_highlight',
    activityName: '#游戏高能操作时刻',
    activityCta: '收集高光',
    targetClipbookTemplate: 'fps',
  },
  {
    videoId: 'demo_city_001',
    assetUrl: '/demo-assets/videos/city.mp4',
    videoTitle: '城市航拍与天际线',
    authorName: '@clipcard_travel',
    sourceVideoUrl: 'https://example.com/clipcard/demo_city_001',
    videoDescription: '城市天际线、江景、高楼、道路和地标建筑组成的城市航拍空镜素材，适合展示普通非活动视频场景，也可作为旅行灵感素材备用。',
    tags: ['城市', '航拍', '天际线', '风景', '旅行灵感', '城市漫步', '空镜'],
    defaultSegmentStart: 4,
    defaultSegmentEnd: 11,
    transcriptExcerpt: '无明确口播或字幕；音频主要为空镜氛围或背景音乐。',
    segmentNote: '这是一段城市航拍空镜素材，画面包含高楼、江景、城市天际线和地标建筑。没有明确地点说明、路线信息或口播，因此不应直接判断具体城市、路线或出行建议。',
    segmentFacts: '画面展示城市高楼、江景、天际线和地标建筑，整体更像城市航拍或旅行风景空镜。片段有较强的城市氛围和出行灵感感，但缺少具体地点、路线和口播说明。',
    keyActions: ['城市航拍', '天际线展示', '江景远景', '地标建筑展示'],
    segmentOutcome: '适合保存为城市风景或旅行灵感素材；当前不判断具体城市、路线、景点名称或出行攻略。',
    userValue: '适合之后作为旅行灵感、城市漫步手账或风景收藏素材。如果参与旅行类活动，可放入风景灵感册。',
    visibleTextOrOcr: '开头可能出现城市航拍字样；其他具体文字不明显。',
    featuredPersonOrId: '',
    uncertainties: '当前视频无口播、无字幕、无明确地点说明；不判断具体城市、景点、路线或真实出行建议。',
    adCandidate: '',
    duration: 60,
    activityEnabled: false,
    activityId: '',
    activityName: '',
    activityCta: '',
    targetClipbookTemplate: 'scenery',
  },
];

export const DEMO_TEMPLATES: DemoTemplateConfig[] = [
  {
    templateId: 'fps',
    name: 'FPS 高光册',
    description: '深色背景、蓝紫/青色霓虹线条，一页可放 3 张卡片。',
    backgroundImage: '/demo-assets/templates/fps-template.png',
    slots: [
      { id: 'slot_1', slotId: 'slot_1', x: 7, y: 6, w: 26, h: 31, label: '高光 1' },
      { id: 'slot_2', slotId: 'slot_2', x: 37, y: 6, w: 26, h: 31, label: '高光 2' },
      { id: 'slot_3', slotId: 'slot_3', x: 67, y: 6, w: 26, h: 31, label: '高光 3' },
    ],
  },
  {
    templateId: 'scenery',
    name: '风景灵感册',
    description: '浅绿、雾蓝、山湖感背景，一页可放 3–4 张卡片。',
    backgroundImage: '/demo-assets/templates/scenery-template.png',
    slots: [
      { id: 'slot_1', slotId: 'slot_1', x: 8, y: 12, w: 38, h: 28, label: '灵感 1' },
      { id: 'slot_2', slotId: 'slot_2', x: 54, y: 12, w: 38, h: 28, label: '灵感 2' },
      { id: 'slot_3', slotId: 'slot_3', x: 8, y: 48, w: 38, h: 28, label: '灵感 3' },
      { id: 'slot_4', slotId: 'slot_4', x: 54, y: 48, w: 38, h: 28, label: '灵感 4' },
    ],
  },
  {
    templateId: 'blank',
    name: '空白书',
    description: '米白纸张和书本感背景，可输入书名，一页可放 3–4 张卡片。',
    backgroundImage: '/demo-assets/templates/blank-book-template.png',
    slots: [
      { id: 'slot_1', slotId: 'slot_1', x: 9, y: 22, w: 38, h: 26, label: '页面 1' },
      { id: 'slot_2', slotId: 'slot_2', x: 54, y: 22, w: 38, h: 26, label: '页面 2' },
      { id: 'slot_3', slotId: 'slot_3', x: 9, y: 51, w: 38, h: 26, label: '页面 3' },
      { id: 'slot_4', slotId: 'slot_4', x: 54, y: 51, w: 38, h: 26, label: '页面 4' },
    ],
  },
];
