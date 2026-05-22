import { Bookmark, Clock, ShieldAlert, ShieldCheck, ShieldX, Trash2, Upload } from 'lucide-react';
import type { ChangeEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type SourceMode = 'sample' | 'upload';
type ScenarioId = 'food' | 'game' | 'lowInfo';
type ClipTypeId = 'food' | 'game' | 'travel' | 'funny' | 'music' | 'tutorial' | 'lowInfo' | 'other';
type CardType = '消费意图卡' | '兴趣意图卡' | '低置信观察卡' | '轻卡片 / 不建议生成完整卡片';
type GateStatus = '允许展示' | '限制展示' | '拒绝展示';
type AdCandidateId = 'storeDeal' | 'gamingGear' | 'scenicAd' | 'longAd' | 'none';
type BudgetLevel = 'Level 0' | 'Level 1' | 'Level 2' | 'Level 3' | 'Level 4';
type AnalysisMethod = '不建议生成' | '1 帧' | '3 帧' | '5 帧' | '需要音频补充';
type CostLevel = '无' | '低' | '中' | '较高' | '需要额外音频成本';

interface Scenario {
  id: ScenarioId;
  clipType: ClipTypeId;
  title: string;
  tag: string;
  duration: number;
  frameTitle: string;
  frameHint: string;
  riskHint: string;
  accent: string;
}

interface AdCandidate {
  id: AdCandidateId;
  label: string;
  description: string;
}

interface ClipTypeOption {
  id: ClipTypeId;
  label: string;
}

interface ClipCard {
  id: string;
  sourceLabel: string;
  clipTypeLabel: string;
  startTime: number;
  endTime: number;
  cardType: CardType;
  carefulSummary: string;
  saveReason: string;
  basis: string;
  gateStatus: GateStatus;
  gateReason: string;
  adCandidate: string;
  createdAt: string;
}

interface ClipEvent {
  id: string;
  sourceKey: string;
  sourceLabel: string;
  clipType: ClipTypeId;
  startTime: number;
  endTime: number;
  adCandidateId: AdCandidateId;
  gateStatus: GateStatus;
  videoDuration: number;
  cardGenerated: number;
  saved: number;
  adShown: number;
  adClicked: number;
  shared: number;
  deleted: number;
  regenerated: number;
  createdAt: string;
}

interface BuildCardInput {
  sourceLabel: string;
  clipType: ClipTypeId;
  startTime: number;
  endTime: number;
  adCandidate: AdCandidate;
  title: string;
  description: string;
  transcript: string;
  isRealVideo: boolean;
  hasVisualModel: boolean;
  keyFrameCount: number;
}

interface AnalysisBudget {
  level: BudgetLevel;
  baseLevel: Exclude<BudgetLevel, 'Level 4'>;
  method: AnalysisMethod;
  cost: CostLevel;
  frameCount: 0 | 1 | 3 | 5;
  reason: string;
  audioHint: string | null;
  canExtractFrames: boolean;
}

interface KeyFrame {
  id: string;
  time: number;
  dataUrl: string;
}

const STORAGE_KEY = 'clipcard-lab-events';
const inputClasses = 'mt-2 w-full rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-300';

const scenarios: Scenario[] = [
  {
    id: 'food',
    clipType: 'food',
    title: '美食探店',
    tag: '门店 / 菜品 / 到店兴趣',
    duration: 72,
    frameTitle: '热菜上桌与店内环境',
    frameHint: '画面像是展示菜品质感、桌面摆盘和门店氛围。',
    riskHint: '消费意图可能存在，但仍需要后续内容确认是否为真实推荐或广告。',
    accent: 'from-teal-500/35 to-amber-400/25',
  },
  {
    id: 'game',
    clipType: 'game',
    title: '游戏高光',
    tag: '操作 / 设备 / 兴趣信号',
    duration: 86,
    frameTitle: '团战瞬间与外设露出',
    frameHint: '画面更像是一次操作高光，可能包含键鼠、手柄或显示器等外设线索。',
    riskHint: '如果后续内容进入恐怖游戏或强刺激情节，广告适配需要更谨慎。',
    accent: 'from-sky-500/35 to-fuchsia-500/20',
  },
  {
    id: 'lowInfo',
    clipType: 'lowInfo',
    title: '低信息片段',
    tag: '过渡 / 模糊 / 不足判断',
    duration: 48,
    frameTitle: '快速晃动画面',
    frameHint: '当前片段信息密度偏低，更像是过场或无法稳定识别的内容。',
    riskHint: '不适合直接推断明确消费意图，也不适合承接长广告。',
    accent: 'from-slate-500/25 to-zinc-300/10',
  },
];

const clipTypes: ClipTypeOption[] = [
  { id: 'food', label: '美食探店' },
  { id: 'game', label: '游戏高光' },
  { id: 'travel', label: '旅行风景' },
  { id: 'funny', label: '搞笑梗' },
  { id: 'music', label: '音乐舞蹈' },
  { id: 'tutorial', label: '教程/知识' },
  { id: 'lowInfo', label: '低信息片段' },
  { id: 'other', label: '其他' },
];

const adCandidates: AdCandidate[] = [
  { id: 'storeDeal', label: '门店团购', description: '短链路、本地门店优惠，需要清晰标注广告。' },
  { id: 'gamingGear', label: '游戏外设', description: '与游戏兴趣相关，但不能伪装成中立 AI 建议。' },
  { id: 'scenicAd', label: '景区广告', description: '泛旅游转化，需要与内容上下文强相关。' },
  { id: 'longAd', label: '长广告', description: '时长较长，对片段意图置信度要求更高。' },
  { id: 'none', label: '无广告', description: '只记录片段意图，不触发商业展示。' },
];

const sampleText: Record<ScenarioId, { description: string; transcript: string }> = {
  food: {
    description: '菜品近景、桌面摆盘和店内环境一起出现，像是一次探店推荐片段。',
    transcript: '这家店的招牌菜刚上桌，热气和摆盘都比较明显。',
  },
  game: {
    description: '团战高光、操作节奏和外设露出比较明显，像是游戏兴趣片段。',
    transcript: '这一波操作如果复盘，可能会关注手感、设备和技能释放时机。',
  },
  lowInfo: {
    description: '画面快速晃动，缺少稳定主体和明确上下文。',
    transcript: '当前没有足够字幕或口播信息。',
  },
};

const statusStyles: Record<GateStatus, string> = {
  允许展示: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  限制展示: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  拒绝展示: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
};

const statusIcons: Record<GateStatus, LucideIcon> = {
  允许展示: ShieldCheck,
  限制展示: ShieldAlert,
  拒绝展示: ShieldX,
};

const optionalTrendMetrics = [
  { key: 'shared', label: '分享数', color: '#38bdf8' },
  { key: 'deleted', label: '删除数', color: '#fb7185' },
  { key: 'regenerated', label: '重生成数', color: '#c084fc' },
] as const;

type OptionalTrendMetric = (typeof optionalTrendMetrics)[number]['key'];

function getClipTypeLabel(clipType: ClipTypeId) {
  return clipTypes.find((item) => item.id === clipType)?.label ?? '其他';
}

function readEvents(): ClipEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Array<Partial<ClipEvent> & { scenarioId?: ScenarioId }>) : [];

    return parsed
      .map((event) => {
        if (event.sourceKey && event.clipType && typeof event.startTime === 'number') {
          const gateStatus = event.gateStatus ?? '限制展示';
          return {
            ...event,
            gateStatus,
            cardGenerated: event.cardGenerated ?? 1,
            saved: event.saved ?? 1,
            adShown: event.adShown ?? (gateStatus === '允许展示' && event.adCandidateId !== 'none' ? 1 : 0),
            adClicked: event.adClicked ?? 0,
            shared: event.shared ?? 0,
            deleted: event.deleted ?? 0,
            regenerated: event.regenerated ?? 0,
          } as ClipEvent;
        }

        const legacyScenario = scenarios.find((item) => item.id === event.scenarioId);
        if (!legacyScenario || typeof event.startTime !== 'number' || typeof event.endTime !== 'number') {
          return null;
        }

        return {
          id: event.id ?? crypto.randomUUID(),
          sourceKey: 'sample:' + legacyScenario.id,
          sourceLabel: legacyScenario.title,
          clipType: legacyScenario.clipType,
          startTime: event.startTime,
          endTime: event.endTime,
          adCandidateId: event.adCandidateId ?? 'none',
          gateStatus: event.gateStatus ?? '限制展示',
          videoDuration: legacyScenario.duration,
          cardGenerated: 1,
          saved: 1,
          adShown: event.gateStatus === '允许展示' && event.adCandidateId !== 'none' ? 1 : 0,
          adClicked: 0,
          shared: 0,
          deleted: 0,
          regenerated: 0,
          createdAt: event.createdAt ?? new Date().toISOString(),
        } satisfies ClipEvent;
      })
      .filter((event): event is ClipEvent => Boolean(event));
  } catch {
    return [];
  }
}

function formatTime(seconds: number) {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const mins = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const secs = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return mins + ':' + secs;
}

function hasManualClipInput(description: string, transcript: string) {
  return Boolean(description.trim() || transcript.trim());
}

function hasVoiceOrNarrationCue(transcript: string) {
  return /口播|解说|旁白|字幕|讲解|台词|声音|音乐|歌词|对话|教程|步骤|知识|说明/.test(transcript);
}

function getFrameTimes(startTime: number, endTime: number, frameCount: AnalysisBudget['frameCount']) {
  const safeStart = Math.max(0, startTime);
  const safeEnd = Math.max(safeStart, endTime);
  const duration = Math.max(0, safeEnd - safeStart);

  if (frameCount === 0) {
    return [];
  }

  if (frameCount === 1) {
    return [safeStart + duration / 2];
  }

  if (frameCount === 3) {
    return [safeStart + Math.min(0.4, duration * 0.08), safeStart + duration / 2, safeEnd - Math.min(0.4, duration * 0.08)];
  }

  return [safeStart, safeStart + duration * 0.25, safeStart + duration * 0.5, safeStart + duration * 0.75, safeEnd];
}

function getAnalysisBudget(clipType: ClipTypeId, startTime: number, endTime: number, description: string, transcript: string): AnalysisBudget {
  const clipDuration = Math.max(0, endTime - startTime);
  const hasInput = hasManualClipInput(description, transcript);
  const audioSensitive =
    clipType === 'music' ||
    clipType === 'funny' ||
    clipType === 'tutorial' ||
    (clipType === 'game' && hasVoiceOrNarrationCue(description + ' ' + transcript));

  if (clipType === 'lowInfo' && !hasInput) {
    return {
      level: 'Level 0',
      baseLevel: 'Level 0',
      method: '不建议生成',
      cost: '无',
      frameCount: 0,
      reason: '当前片段信息不足，不建议生成完整卡片。可以手动补充片段说明或字幕/口播摘录后再继续。',
      audioHint: null,
      canExtractFrames: false,
    };
  }

  let baseLevel: AnalysisBudget['baseLevel'] = 'Level 2';
  let method: AnalysisMethod = '3 帧';
  let cost: CostLevel = '中';
  let frameCount: AnalysisBudget['frameCount'] = 3;
  let reason = '片段时长大于 3 秒且不超过 30 秒，使用 3 帧标准模式：起点附近 / 中点 / 终点附近。';

  if (clipDuration <= 3) {
    baseLevel = 'Level 1';
    method = '1 帧';
    cost = '低';
    frameCount = 1;
    reason = '片段时长小于等于 3 秒，适合“保存这一刻”，只抽取中点 1 张关键帧。';
  } else if (clipDuration <= 30) {
    baseLevel = 'Level 2';
    method = '3 帧';
    cost = '中';
    frameCount = 3;
  } else if (clipDuration <= 60) {
    baseLevel = 'Level 3';
    method = '5 帧';
    cost = '较高';
    frameCount = 5;
    reason = '片段时长大于 30 秒且不超过 60 秒，使用 5 帧稳健模式：起点 / 25% / 50% / 75% / 终点。';
  } else {
    baseLevel = 'Level 3';
    method = '5 帧';
    cost = '较高';
    frameCount = 5;
    reason = '片段超过 60 秒，建议缩短测试范围；当前默认按 Level 3 抽取 5 帧，并提示较高成本。';
  }

  if (audioSensitive) {
    return {
      level: 'Level 4',
      baseLevel,
      method: '需要音频补充',
      cost: '需要额外音频成本',
      frameCount,
      reason,
      audioHint: '该类型片段可能依赖音频、口播或字幕，仅靠关键帧可能不足以生成可靠卡片。当前版本暂不转写音频，只显示提示。',
      canExtractFrames: frameCount > 0,
    };
  }

  return {
    level: baseLevel,
    baseLevel,
    method,
    cost,
    frameCount,
    reason,
    audioHint: null,
    canExtractFrames: frameCount > 0,
  };
}

function mentionsTravelIntent(text: string) {
  return /地点|地址|城市|景区|门票|路线|出行|旅行|旅游|酒店|民宿|机场|高铁|海边|山|湖|公园|古镇|博物馆/.test(text);
}

function getGate(clipType: ClipTypeId, adCandidateId: AdCandidateId, contextText: string): { status: GateStatus; reason: string } {
  if (adCandidateId === 'none') {
    return {
      status: '允许展示',
      reason: '当前选择为无广告，更适合只记录片段事件和片段兴趣趋势；页面不应把片段卡包装成商业推荐。',
    };
  }

  if (clipType === 'food' && adCandidateId === 'storeDeal') {
    return {
      status: '允许展示',
      reason: '从当前片段看，门店团购与菜品和到店场景较匹配；仍必须明确标注为广告，不得伪装成 AI 中立建议。',
    };
  }

  if (clipType === 'game' && adCandidateId === 'gamingGear') {
    return {
      status: '允许展示',
      reason: '从当前片段看，游戏外设与操作高光的兴趣信号可能相关；展示时必须明确标注广告来源。',
    };
  }

  if (clipType === 'travel' && adCandidateId === 'scenicAd') {
    if (mentionsTravelIntent(contextText)) {
      return {
        status: '允许展示',
        reason: '从当前片段说明看，内容可能明确提到地点、路线或出行语境，景区广告具备较强上下文相关性；展示时仍需清晰标注广告。',
      };
    }

    return {
      status: '限制展示',
      reason: '当前更像是旅行风景，但片段说明尚未明确地点或出行意图，景区广告只能作为受限候选，不能伪装成中立建议。',
    };
  }

  if (clipType === 'funny') {
    return {
      status: adCandidateId === 'longAd' || adCandidateId === 'scenicAd' ? '拒绝展示' : '限制展示',
      reason: '搞笑梗片段通常以情绪或梗点为主，当前广告更像是无关商业插入，至少应限制展示；若广告较长或语境差异明显，应拒绝展示。',
    };
  }

  if (clipType === 'lowInfo' && adCandidateId === 'longAd') {
    return {
      status: '拒绝展示',
      reason: '当前片段信息不足，无法形成明确意图；长广告需要更高置信度，因此不应展示。',
    };
  }

  if (clipType === 'lowInfo') {
    return {
      status: '限制展示',
      reason: '从当前片段看，信息密度偏低，只能作为弱信号；如展示广告，必须弱化推荐语并明确标注广告。',
    };
  }

  return {
    status: '限制展示',
    reason: '当前广告与片段存在部分相关性但依据不够强，更适合作为候选观察，不应包装成确定推荐。',
  };
}

function buildCard(input: BuildCardInput): ClipCard {
  const contextText = (input.title + ' ' + input.description + ' ' + input.transcript).trim();
  const gate = getGate(input.clipType, input.adCandidate.id, contextText);
  const descriptionTooShort = input.description.trim().length < 12;
  const hasInput = hasManualClipInput(input.description, input.transcript);
  const shouldUseLightCard = input.clipType === 'lowInfo' || descriptionTooShort;
  const clipTypeLabel = getClipTypeLabel(input.clipType);
  const base = {
    id: crypto.randomUUID(),
    sourceLabel: input.sourceLabel,
    clipTypeLabel,
    startTime: input.startTime,
    endTime: input.endTime,
    adCandidate: input.adCandidate.label,
    gateStatus: gate.status,
    gateReason: gate.reason,
    createdAt: new Date().toISOString(),
  };

  if (input.isRealVideo && !input.hasVisualModel && !hasInput) {
    const frameState = input.keyFrameCount > 0 ? '当前已提取关键帧' : '当前尚未提取关键帧';
    return {
      ...base,
      cardType: '轻卡片 / 不建议生成完整卡片',
      carefulSummary: frameState + '，但尚未接入视觉模型，因此无法自动理解画面内容。',
      saveReason: '你可以先把这一刻作为定位点保存，用于后续补充片段说明或接入视觉识别接口后再生成完整卡片。',
      basis: '当前版本不自动识别完整视频画面和声音。你可以补充片段说明，或在下一阶段接入视觉识别接口。',
    };
  }

  if (shouldUseLightCard) {
    return {
      ...base,
      cardType: '轻卡片 / 不建议生成完整卡片',
      carefulSummary: '仅凭当前信息还不足以判断明确意图，更像是需要暂存观察的片段。',
      saveReason: '用户保存这一刻，可能只是为了回看时间点或等待后续内容补充，并不一定代表稳定兴趣。',
      basis: descriptionTooShort
        ? '当前片段说明过短，字幕/口播信息也不足以支撑完整卡片；如果后续内容进入明确主题，再重新生成会更稳妥。'
        : '当前视频类型被标记为低信息片段，系统只记录弱事件，不建议生成完整意图卡。',
    };
  }

  if (input.clipType === 'food') {
    return {
      ...base,
      cardType: '消费意图卡',
      carefulSummary: '从当前片段看，' + input.description + ' 可能与到店、菜品或消费决策有关。',
      saveReason: '用户保存这一刻，可能是因为菜品状态、门店线索、价格信息或口播内容值得回看。',
      basis: '判断依据来自片段说明和字幕/口播摘录：' + (input.transcript || '当前未提供字幕摘录') + '。但不能直接断定用户一定有购买意图。',
    };
  }

  if (input.clipType === 'game') {
    return {
      ...base,
      cardType: '兴趣意图卡',
      carefulSummary: '从当前片段看，' + input.description + ' 更像是游戏兴趣或操作高光信号。',
      saveReason: '用户保存这一刻，可能是为了复盘操作、记住装备配置，或稍后查看相关设备。',
      basis: '判断依据来自片段说明和字幕/口播摘录：' + (input.transcript || '当前未提供字幕摘录') + '。如果后续内容进入恐怖游戏或强刺激语境，适配判断需要收紧。',
    };
  }

  if (input.clipType === 'travel') {
    return {
      ...base,
      cardType: '兴趣意图卡',
      carefulSummary: '从当前片段看，' + input.description + ' 可能与地点、风景或出行兴趣有关。',
      saveReason: '用户保存这一刻，可能是想回看地点、路线、景观或后续出行信息。',
      basis: '判断依据来自用户输入的片段说明和字幕/口播摘录：' + (input.transcript || '当前未提供字幕摘录') + '。如果没有明确地点或出行语境，只能作为弱兴趣信号。',
    };
  }

  if (input.clipType === 'funny') {
    return {
      ...base,
      cardType: '兴趣意图卡',
      carefulSummary: '从当前片段看，' + input.description + ' 更像是情绪、梗点或社交传播型内容。',
      saveReason: '用户保存这一刻，可能是因为梗点、反转或台词值得二次观看。',
      basis: '判断依据来自片段说明和字幕/口播摘录：' + (input.transcript || '当前未提供字幕摘录') + '。这类内容通常不应承接无关强转化广告。',
    };
  }

  return {
    ...base,
    cardType: input.clipType === 'music' ? '兴趣意图卡' : '低置信观察卡',
    carefulSummary: '从当前片段看，' + input.description + ' 可能形成某种兴趣信号，但仍需要后续内容确认。',
    saveReason: '用户保存这一刻，可能是因为画面、音乐、台词或情绪节点值得回看。',
    basis: '判断依据来自用户输入的片段说明和字幕/口播摘录：' + (input.transcript || '当前未提供字幕摘录') + '。仅凭当前信息还不足以做强判断。',
  };
}

export default function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [sourceMode, setSourceMode] = useState<SourceMode>('sample');
  const [scenarioId, setScenarioId] = useState<ScenarioId>('food');
  const [startTime, setStartTime] = useState(8);
  const [endTime, setEndTime] = useState(18);
  const [adCandidateId, setAdCandidateId] = useState<AdCandidateId>('storeDeal');
  const [events, setEvents] = useState<ClipEvent[]>([]);
  const [currentCard, setCurrentCard] = useState<ClipCard | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoName, setVideoName] = useState('');
  const [videoDuration, setVideoDuration] = useState(60);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [uploadedTitle, setUploadedTitle] = useState('');
  const [clipDescription, setClipDescription] = useState('');
  const [transcript, setTranscript] = useState('');
  const [uploadedClipType, setUploadedClipType] = useState<ClipTypeId>('food');
  const [keyFrames, setKeyFrames] = useState<KeyFrame[]>([]);
  const [frameError, setFrameError] = useState('');
  const [isExtractingFrames, setIsExtractingFrames] = useState(false);
  const [visibleOptionalMetrics, setVisibleOptionalMetrics] = useState<Record<OptionalTrendMetric, boolean>>({
    shared: false,
    deleted: false,
    regenerated: false,
  });

  const scenario = scenarios.find((item) => item.id === scenarioId)!;
  const activeDuration = sourceMode === 'upload' ? videoDuration : scenario.duration;
  const durationMax = Math.max(1, Math.floor(activeDuration));
  const sourceKey = sourceMode === 'upload' ? 'upload:' + (videoName || uploadedTitle || 'local-video') : 'sample:' + scenario.id;
  const sourceLabel = sourceMode === 'upload' ? uploadedTitle || videoName || '上传真实视频' : scenario.title;
  const activeClipType = sourceMode === 'upload' ? uploadedClipType : scenario.clipType;
  const activeClipTypeLabel = getClipTypeLabel(activeClipType);
  const activeDescription = sourceMode === 'upload' ? clipDescription : sampleText[scenario.id].description;
  const activeTranscript = sourceMode === 'upload' ? transcript : sampleText[scenario.id].transcript;
  const adCandidate = adCandidates.find((item) => item.id === adCandidateId)!;
  const gate = getGate(activeClipType, adCandidate.id, sourceLabel + ' ' + activeDescription + ' ' + activeTranscript);
  const GateIcon = statusIcons[gate.status];
  const normalizedStart = Math.min(startTime, Math.max(0, durationMax - 1));
  const normalizedEnd = Math.min(Math.max(endTime, normalizedStart + 1), durationMax);
  const clipDuration = Math.max(0, normalizedEnd - normalizedStart);
  const analysisBudget = getAnalysisBudget(activeClipType, normalizedStart, normalizedEnd, activeDescription, activeTranscript);
  const hasRealVideoInput = hasManualClipInput(activeDescription, activeTranscript);

  useEffect(() => {
    setEvents(readEvents());
  }, []);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  useEffect(() => {
    setStartTime((value) => Math.min(Math.max(0, value), Math.max(0, durationMax - 1)));
    setEndTime((value) => Math.min(Math.max(value, 1), durationMax));
  }, [durationMax]);

  useEffect(() => {
    if (endTime <= startTime) {
      setEndTime(Math.min(startTime + 1, durationMax));
    }
  }, [durationMax, endTime, startTime]);

  useEffect(() => {
    if (sourceMode === 'upload') {
      setKeyFrames([]);
      setFrameError('');
    }
  }, [activeClipType, clipDescription, durationMax, endTime, sourceMode, startTime, transcript, videoUrl]);

  const trendData = useMemo(() => {
    const bins = Array.from({ length: Math.max(1, Math.ceil(durationMax / 10)) }, (_, index) => {
      const start = index * 10;
      const end = Math.min(start + 9, durationMax);
      return {
        bucket: formatTime(start) + '-' + formatTime(end),
        cardGenerated: 0,
        saved: 0,
        adShown: 0,
        adClicked: 0,
        shared: 0,
        deleted: 0,
        regenerated: 0,
      };
    });

    events
      .filter((event) => event.sourceKey === sourceKey)
      .forEach((event) => {
        const index = Math.floor(event.startTime / 10);
        if (bins[index]) {
          bins[index].cardGenerated += event.cardGenerated ?? 1;
          bins[index].saved += event.saved ?? 1;
          bins[index].adShown += event.adShown ?? 0;
          bins[index].adClicked += event.adClicked ?? 0;
          bins[index].shared += event.shared ?? 0;
          bins[index].deleted += event.deleted ?? 0;
          bins[index].regenerated += event.regenerated ?? 0;
        }
      });

    return bins;
  }, [durationMax, events, sourceKey]);

  function handleVideoUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const nextUrl = URL.createObjectURL(file);
    setSourceMode('upload');
    setVideoUrl(nextUrl);
    setVideoName(file.name);
    setUploadedTitle((value) => value || file.name.replace(/\.(mp4|webm)$/i, ''));
    setPlaybackTime(0);
    setStartTime(0);
    setEndTime(10);
    setKeyFrames([]);
    setFrameError('');
    setCurrentCard(null);
  }

  function seekTo(value: number) {
    const nextTime = Math.min(Math.max(0, value), durationMax);
    if (videoRef.current) {
      videoRef.current.currentTime = nextTime;
    }
    setPlaybackTime(nextTime);
  }

  async function captureKeyFrames() {
    const video = videoRef.current;
    if (!video || !videoUrl) {
      setFrameError('请先上传本地 mp4/webm 视频。');
      return;
    }

    if (!analysisBudget.canExtractFrames || analysisBudget.frameCount === 0) {
      setKeyFrames([]);
      setFrameError('当前预算等级不建议抽帧。你可以手动补充说明后再继续。');
      return;
    }

    setIsExtractingFrames(true);
    setFrameError('');

    const originalTime = video.currentTime;
    const frameTimes = getFrameTimes(normalizedStart, normalizedEnd, analysisBudget.frameCount);
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      setFrameError('浏览器无法创建 canvas 上下文，暂时不能抽取关键帧。');
      setIsExtractingFrames(false);
      return;
    }

    try {
      const frames: KeyFrame[] = [];
      for (const time of frameTimes) {
        await new Promise<void>((resolve, reject) => {
          const targetTime = Math.min(Math.max(0, time), durationMax);
          if (Math.abs(video.currentTime - targetTime) < 0.05) {
            requestAnimationFrame(() => resolve());
            return;
          }
          const timeoutId = window.setTimeout(() => {
            video.removeEventListener('seeked', handleSeeked);
            reject(new Error('关键帧定位超时，请重新选择片段或视频。'));
          }, 2500);
          const handleSeeked = () => {
            video.removeEventListener('seeked', handleSeeked);
            window.clearTimeout(timeoutId);
            resolve();
          };
          video.addEventListener('seeked', handleSeeked, { once: true });
          video.currentTime = targetTime;
        });
        context.drawImage(video, 0, 0, width, height);
        frames.push({
          id: crypto.randomUUID(),
          time,
          dataUrl: canvas.toDataURL('image/jpeg', 0.78),
        });
      }

      video.currentTime = originalTime;
      setPlaybackTime(originalTime);
      setKeyFrames(frames);
    } catch (error) {
      setFrameError(error instanceof Error ? error.message : '关键帧抽取失败，请重新尝试。');
    } finally {
      setIsExtractingFrames(false);
    }
  }

  function saveMoment() {
    const normalizedStart = Math.min(startTime, durationMax - 1);
    const normalizedEnd = Math.min(Math.max(endTime, normalizedStart + 1), durationMax);
    const card = buildCard({
      sourceLabel,
      clipType: activeClipType,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      adCandidate,
      title: sourceLabel,
      description: activeDescription,
      transcript: activeTranscript,
      isRealVideo: sourceMode === 'upload',
      hasVisualModel: false,
      keyFrameCount: keyFrames.length,
    });
    const event: ClipEvent = {
      id: card.id,
      sourceKey,
      sourceLabel,
      clipType: activeClipType,
      startTime: normalizedStart,
      endTime: normalizedEnd,
      adCandidateId,
      gateStatus: card.gateStatus,
      videoDuration: durationMax,
      cardGenerated: 1,
      saved: 1,
      adShown: card.gateStatus === '允许展示' && adCandidateId !== 'none' ? 1 : 0,
      adClicked: 0,
      shared: 0,
      deleted: 0,
      regenerated: 0,
      createdAt: card.createdAt,
    };
    const nextEvents = [event, ...events].slice(0, 120);
    setCurrentCard(card);
    setEvents(nextEvents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  }

  function clearEvents() {
    setEvents([]);
    localStorage.removeItem(STORAGE_KEY);
  }

  function toggleOptionalMetric(metric: OptionalTrendMetric) {
    setVisibleOptionalMetrics((current) => ({
      ...current,
      [metric]: !current[metric],
    }));
  }

  function simulateAdClick() {
    if (!currentCard || currentCard.gateStatus !== '允许展示' || currentCard.adCandidate === '无广告') {
      return;
    }

    const nextEvents = events.map((event) =>
      event.id === currentCard.id ? { ...event, adClicked: (event.adClicked ?? 0) + 1 } : event,
    );
    setEvents(nextEvents);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEvents));
  }

  const sampleModeClass = 'rounded px-3 py-2 font-medium ' + (sourceMode === 'sample' ? 'bg-teal-300 text-slate-950' : 'text-slate-300');
  const uploadModeClass = 'rounded px-3 py-2 font-medium ' + (sourceMode === 'upload' ? 'bg-teal-300 text-slate-950' : 'text-slate-300');

  return (
    <main className="min-h-screen px-4 py-5 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-white/10 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-teal-300">Clipcard Lab</p>
            <h1 className="mt-2 text-2xl font-semibold text-white md:text-4xl">短视频片段意图卡验证工作台</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">验证选择视频片段、生成片段卡、记录片段事件、观察片段兴趣趋势和广告适配判断的核心机制。</p>
          </div>
          <div className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-400">本地前端数据 / localStorage events</div>
        </header>

        <div className="rounded-lg border border-amber-300/25 bg-amber-300/[0.08] p-4 text-sm leading-6 text-amber-100">当前版本不自动识别完整视频画面和声音，先通过用户输入的字幕/说明验证片段卡机制。</div>
        <div className="rounded-lg border border-teal-300/25 bg-teal-300/[0.07] p-4 text-sm leading-6 text-teal-100">当前版本正在验证：不同片段应采用不同分析预算，而不是对所有视频进行高成本统一分析。</div>

        <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-white">视频实验区</h2>
                <p className="mt-1 text-sm text-slate-400">使用样例场景，或上传本地 mp4/webm 进行真实片段测试。</p>
              </div>
              <Clock className="h-5 w-5 text-slate-500" />
            </div>

            <div className="mt-4 grid grid-cols-2 rounded-md border border-white/10 bg-white/[0.03] p-1 text-sm">
              <button type="button" onClick={() => setSourceMode('sample')} className={sampleModeClass}>样例场景</button>
              <button type="button" onClick={() => setSourceMode('upload')} className={uploadModeClass}>上传真实视频</button>
            </div>

            {sourceMode === 'sample' ? (
              <>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {scenarios.map((item) => {
                    const itemClass = 'rounded-md border p-3 text-left transition ' + (scenarioId === item.id ? 'border-teal-300/70 bg-teal-400/10 text-white' : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25');
                    return (
                      <button key={item.id} type="button" onClick={() => setScenarioId(item.id)} className={itemClass}>
                        <span className="block text-sm font-semibold">{item.title}</span>
                        <span className="mt-1 block text-xs leading-5 text-slate-400">{item.tag}</span>
                      </button>
                    );
                  })}
                </div>

                <div className={'mt-4 rounded-lg border border-white/10 bg-gradient-to-br p-4 ' + scenario.accent}>
                  <div className="aspect-video rounded-md border border-white/10 bg-black/35 p-4">
                    <div className="flex h-full flex-col justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-white/55">Simulated Frame</p>
                        <h3 className="mt-2 text-xl font-semibold text-white md:text-2xl">{scenario.frameTitle}</h3>
                        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-200/85">{scenario.frameHint}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-300">
                        <span>{formatTime(startTime)}</span>
                        <span>{formatTime(endTime)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-slate-400">{scenario.riskHint}</div>
              </>
            ) : (
              <div className="mt-4 grid gap-4">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-teal-300/35 bg-teal-300/[0.05] px-4 py-6 text-center text-sm text-slate-300 hover:border-teal-200/70">
                  <Upload className="mb-2 h-6 w-6 text-teal-200" />
                  <span className="font-medium text-white">选择本地 mp4/webm 视频</span>
                  <span className="mt-1 text-xs text-slate-400">视频只在浏览器本地预览，不上传到后端。</span>
                  <input type="file" accept="video/mp4,video/webm" onChange={handleVideoUpload} className="sr-only" />
                </label>

                {videoUrl ? (
                  <div className="rounded-lg border border-white/10 bg-black/40 p-3">
                    <video
                      ref={videoRef}
                      src={videoUrl}
                      controls
                      className="aspect-video w-full rounded-md bg-black object-contain"
                      onLoadedMetadata={(event) => {
                        const duration = event.currentTarget.duration;
                        const safeDuration = Number.isFinite(duration) ? Math.max(1, Math.floor(duration)) : 60;
                        setVideoDuration(safeDuration);
                        setEndTime(Math.min(10, safeDuration));
                      }}
                      onTimeUpdate={(event) => setPlaybackTime(event.currentTarget.currentTime)}
                    />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <span>当前播放时间：{formatTime(playbackTime)}</span>
                      <span>视频总时长：{formatTime(videoDuration)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6 text-sm leading-6 text-slate-400">还没有选择视频。可以先继续使用样例场景，也可以上传本地视频开始真实片段测试。</div>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">视频标题</span>
                    <input value={uploadedTitle} onChange={(event) => setUploadedTitle(event.target.value)} className={inputClasses} placeholder="例如：周末南京路探店片段" />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium text-slate-300">视频类型</span>
                    <select value={uploadedClipType} onChange={(event) => setUploadedClipType(event.target.value as ClipTypeId)} className={inputClasses}>
                      {clipTypes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">当前片段说明</span>
                    <textarea value={clipDescription} onChange={(event) => setClipDescription(event.target.value)} rows={3} className={inputClasses} placeholder="描述这一段里出现的人、物、地点、动作或情绪节点" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">字幕/口播摘录</span>
                    <textarea value={transcript} onChange={(event) => setTranscript(event.target.value)} rows={3} className={inputClasses} placeholder="粘贴这一段的字幕、口播或关键台词" />
                  </label>
                  <label className="block md:col-span-2">
                    <span className="text-sm font-medium text-slate-300">广告候选</span>
                    <select value={adCandidateId} onChange={(event) => setAdCandidateId(event.target.value as AdCandidateId)} className={inputClasses}>
                      {adCandidates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                    </select>
                  </label>
                </div>

                <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-base font-semibold text-white">分析预算闸门</h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">当前版本正在验证：不同片段应采用不同分析预算，而不是对所有视频进行高成本统一分析。</p>
                    </div>
                    <span className="rounded-md border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-sm font-medium text-teal-100">{analysisBudget.level}</span>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
                      <dt className="text-slate-400">分析方式</dt>
                      <dd className="mt-1 font-medium text-white">{analysisBudget.method}{analysisBudget.frameCount > 0 ? ` / 先抽 ${analysisBudget.frameCount} 帧` : ''}</dd>
                    </div>
                    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3">
                      <dt className="text-slate-400">预计成本等级</dt>
                      <dd className="mt-1 font-medium text-white">{analysisBudget.cost}</dd>
                    </div>
                    <div className="rounded-md border border-white/10 bg-slate-950/50 p-3 sm:col-span-2">
                      <dt className="text-slate-400">判断原因</dt>
                      <dd className="mt-1 leading-6 text-slate-200">{analysisBudget.reason}</dd>
                    </div>
                    {analysisBudget.audioHint ? (
                      <div className="rounded-md border border-amber-300/25 bg-amber-300/[0.08] p-3 text-amber-100 sm:col-span-2">
                        {analysisBudget.audioHint}
                      </div>
                    ) : null}
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      onClick={captureKeyFrames}
                      disabled={!videoUrl || isExtractingFrames || !analysisBudget.canExtractFrames}
                      className="rounded-md border border-teal-300/40 px-3 py-2 text-sm font-medium text-teal-100 hover:bg-teal-300/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isExtractingFrames ? '正在抽取关键帧' : `抽取 ${analysisBudget.frameCount} 张关键帧`}
                    </button>
                    {frameError ? <span className="text-sm text-rose-200">{frameError}</span> : null}
                  </div>
                  {keyFrames.length > 0 ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {keyFrames.map((frame) => (
                        <figure key={frame.id} className="overflow-hidden rounded-md border border-white/10 bg-black/30">
                          <img src={frame.dataUrl} alt={`关键帧 ${formatTime(frame.time)}`} className="aspect-video w-full object-cover" />
                          <figcaption className="px-3 py-2 text-xs text-slate-300">关键帧时间点：{formatTime(frame.time)}</figcaption>
                        </figure>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-300">startTime: {formatTime(startTime)}</span>
                <div className="mt-2 flex items-center gap-3">
                  <input type="number" min={0} max={durationMax - 1} value={startTime} onChange={(event) => setStartTime(Number(event.target.value))} className="w-24 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-300" />
                  <button type="button" onClick={() => seekTo(startTime)} className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-teal-300/60">跳到起点</button>
                </div>
                <input type="range" min={0} max={durationMax - 1} value={Math.min(startTime, durationMax - 1)} onChange={(event) => setStartTime(Number(event.target.value))} className="mt-3 w-full accent-teal-300" />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-300">endTime: {formatTime(endTime)}</span>
                <div className="mt-2 flex items-center gap-3">
                  <input type="number" min={1} max={durationMax} value={endTime} onChange={(event) => setEndTime(Number(event.target.value))} className="w-24 rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-300" />
                  <button type="button" onClick={() => seekTo(endTime)} className="rounded-md border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-amber-300/60">跳到终点</button>
                </div>
                <input type="range" min={1} max={durationMax} value={Math.min(endTime, durationMax)} onChange={(event) => setEndTime(Number(event.target.value))} className="mt-3 w-full accent-amber-300" />
              </label>
            </div>

            <button type="button" onClick={saveMoment} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-teal-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 sm:w-auto">
              <Bookmark className="h-4 w-4" />
              保存这一刻
            </button>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/20 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">片段卡生成区</h2>
                <p className="mt-1 text-sm text-slate-400">根据当前样例或真实视频输入生成弱断言卡片。</p>
              </div>
              {sourceMode === 'sample' ? (
                <select value={adCandidateId} onChange={(event) => setAdCandidateId(event.target.value as AdCandidateId)} className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-sm text-slate-100 outline-none focus:border-teal-300">
                  {adCandidates.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                </select>
              ) : null}
            </div>

            <div className="mt-4 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm leading-6 text-slate-400">
              <span className="font-medium text-slate-200">当前片段：</span>
              {sourceLabel} / {activeClipTypeLabel} / {formatTime(startTime)} - {formatTime(endTime)}
              <br />
              <span className="font-medium text-slate-200">广告候选：</span>
              {adCandidate.description}
              {sourceMode === 'upload' ? (
                <>
                  <br />
                  <span className="font-medium text-slate-200">真实视频关键帧：</span>
                  {keyFrames.length > 0 ? `已抽取 ${keyFrames.length} 张，用于片段定位与后续视觉识别准备。` : '尚未抽取。'}
                  <br />
                  <span className="font-medium text-slate-200">用户手动补充说明：</span>
                  {activeDescription.trim() || '未填写'}
                  <br />
                  <span className="font-medium text-slate-200">字幕/口播摘录：</span>
                  {activeTranscript.trim() || '未填写'}
                  <br />
                  <span className="font-medium text-slate-200">视觉模型接入：</span>
                  当前版本未接入视觉模型，不会自动理解画面内容。
                </>
              ) : null}
            </div>

            {currentCard ? (
              <article className="mt-4 rounded-lg border border-teal-300/25 bg-teal-300/[0.06] p-4">
                <div className="flex flex-col gap-2 border-b border-white/10 pb-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.16em] text-teal-200">Generated Clip Card</p>
                    <h3 className="mt-1 text-xl font-semibold text-white">{currentCard.cardType}</h3>
                    <p className="mt-1 text-sm text-slate-400">{currentCard.sourceLabel} / {currentCard.clipTypeLabel}</p>
                  </div>
                  <span className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-sm text-slate-300">{formatTime(currentCard.startTime)} - {formatTime(currentCard.endTime)}</span>
                </div>
                {sourceMode === 'upload' && hasRealVideoInput ? (
                  <div className="mt-4 rounded-md border border-sky-300/25 bg-sky-300/[0.08] p-3 text-sm leading-6 text-sky-100">
                    本卡片结合用户补充说明生成，关键帧仅作为片段定位与后续视觉识别准备。
                  </div>
                ) : null}
                <dl className="mt-4 grid gap-4 text-sm leading-6">
                  <div><dt className="font-medium text-slate-200">谨慎总结</dt><dd className="mt-1 text-slate-400">{currentCard.carefulSummary}</dd></div>
                  <div><dt className="font-medium text-slate-200">保存理由</dt><dd className="mt-1 text-slate-400">{currentCard.saveReason}</dd></div>
                  <div><dt className="font-medium text-slate-200">判断依据</dt><dd className="mt-1 text-slate-400">{currentCard.basis}</dd></div>
                  <div>
                    <dt className="font-medium text-slate-200">广告适配结果</dt>
                    <dd className={'mt-2 rounded-md border px-3 py-2 ' + statusStyles[currentCard.gateStatus]}>{currentCard.gateStatus}：{currentCard.gateReason}</dd>
                  </div>
                </dl>
              </article>
            ) : (
              <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6 text-sm leading-6 text-slate-400">还没有生成片段卡。选择时间段后点击“保存这一刻”。</div>
            )}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4 md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white">片段兴趣趋势图</h2>
                <p className="mt-1 text-sm text-slate-400">按 10 秒区间聚合当前视频或样例的多指标片段行为。</p>
              </div>
              <button type="button" onClick={clearEvents} className="inline-flex items-center justify-center gap-2 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-rose-300/60 hover:text-rose-200">
                <Trash2 className="h-4 w-4" />
                清空事件
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-300">
              {optionalTrendMetrics.map((metric) => (
                <label key={metric.key} className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2">
                  <input
                    type="checkbox"
                    checked={visibleOptionalMetrics[metric.key]}
                    onChange={() => toggleOptionalMetric(metric.key)}
                    className="accent-teal-300"
                  />
                  {metric.label}
                </label>
              ))}
            </div>
            <div className="mt-5 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 14, left: -22, bottom: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.16)" />
                  <XAxis dataKey="bucket" angle={-25} textAnchor="end" interval={0} height={58} />
                  <YAxis allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(45, 212, 191, 0.08)' }} contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }} labelStyle={{ color: '#e2e8f0' }} />
                  <Line type="monotone" dataKey="cardGenerated" name="卡片生成数" stroke="#2dd4bf" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="saved" name="保存数" stroke="#facc15" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="adClicked" name="广告点击数" stroke="#fb923c" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  {visibleOptionalMetrics.shared ? <Line type="monotone" dataKey="shared" name="分享数" stroke="#38bdf8" strokeWidth={2} dot={{ r: 2 }} /> : null}
                  {visibleOptionalMetrics.deleted ? <Line type="monotone" dataKey="deleted" name="删除数" stroke="#fb7185" strokeWidth={2} dot={{ r: 2 }} /> : null}
                  {visibleOptionalMetrics.regenerated ? <Line type="monotone" dataKey="regenerated" name="重生成数" stroke="#c084fc" strokeWidth={2} dot={{ r: 2 }} /> : null}
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-400">折线表示不同片段行为在视频时间轴上的变化，用于判断观众真正想保存、复看或转化的片段。</p>
          </div>

          <div className="rounded-lg border border-white/10 bg-slate-950/70 p-4 md:p-5">
            <div className="flex items-start gap-3">
              <div className={'rounded-md border p-2 ' + statusStyles[gate.status]}><GateIcon className="h-5 w-5" /></div>
              <div>
                <h2 className="text-lg font-semibold text-white">广告适配闸门区</h2>
                <p className="mt-1 text-sm text-slate-400">当前片段和广告候选的展示判断。</p>
              </div>
            </div>

            <div className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-200">{activeClipTypeLabel}</span>
                <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-200">{formatTime(startTime)} - {formatTime(endTime)}</span>
                <span className="rounded-md bg-slate-800 px-2.5 py-1 text-slate-200">{adCandidate.label}</span>
              </div>
              <div className={'mt-4 rounded-md border px-3 py-3 text-sm font-medium ' + statusStyles[gate.status]}>{gate.status}</div>
              <p className="mt-4 text-sm leading-6 text-slate-400">{gate.reason}</p>
              <button
                type="button"
                onClick={simulateAdClick}
                disabled={!currentCard || currentCard.gateStatus !== '允许展示' || currentCard.adCandidate === '无广告'}
                className="mt-4 rounded-md border border-white/10 px-3 py-2 text-sm text-slate-300 hover:border-orange-300/60 hover:text-orange-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                模拟广告点击
              </button>
              <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-slate-300">广告必须明确标注为广告或商业内容，不得伪装成 AI 中立建议，也不得用片段卡的弱判断包装成确定性推荐。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
