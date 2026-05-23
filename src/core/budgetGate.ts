import type { AudioStrategy, BudgetGateInput, BudgetLevel, BudgetResult, BudgetRoute, CostLevel, VisualSignals } from './types';

const highInformationKeywords = [
  '教程',
  '技巧',
  '攻略',
  '步骤',
  '复盘',
  '参数',
  '设置',
  '教学',
  '避坑',
  '操作',
  '构图',
  '剪辑',
  '压枪',
  '运镜',
];

const transcriptKeywords = ['科普', '知识', '口播', '剧情解说', '观点', '表达', '讲解', '解说'];
const visualStepKeywords = ['游戏技巧', '摄影技巧', '做饭', '烹饪', '健身', '手工', '操作演示', '动作分解', '压枪', '复盘', '步骤'];
const ocrKeywords = ['剪辑', '软件', '界面', '游戏 UI', '游戏UI', '参数', 'PPT', '屏幕文字', '字幕卡', '设置面板'];
const motionAudioKeywords = ['舞蹈', '运镜', '动作节奏', '转场教学', '节奏', '转场'];
const sceneKeywords = ['美食', '风景', '穿搭', '商品展示', '探店', '旅行', '城市', '门店', '商品'];
const lowInfoKeywords = ['低信息', '模糊', '无主体', '纯转场', '空镜', '过渡'];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function getText(input: BudgetGateInput) {
  return [
    input.videoTitle,
    input.videoDescription,
    input.tags.join(' '),
    input.segmentNote ?? '',
    input.transcriptExcerpt ?? '',
  ].join(' ');
}

function hasMeaningfulMetadata(input: BudgetGateInput) {
  const metadataText = [input.videoTitle, input.videoDescription, input.tags.join(' ')].join(' ');
  const cleaned = lowInfoKeywords.reduce((text, keyword) => text.replaceAll(keyword, ''), metadataText).replace(/[，。,.、\s]/g, '');
  return cleaned.length >= 4;
}

function hasHighPlatformSignal(input: BudgetGateInput) {
  const signals = input.platformSignals;
  if (!signals) return false;

  const collectRate = signals.collectRate ?? (
    signals.favoriteCount && signals.likeCount ? signals.favoriteCount / Math.max(1, signals.likeCount) : 0
  );

  return collectRate >= 0.08 || (signals.favoriteCount ?? 0) >= 1000 || (signals.shareCount ?? 0) >= 500;
}

function getBaseLevel(input: BudgetGateInput, duration: number): BudgetLevel {
  const triggerBase = input.triggerMode === 'short_press' ? 1 : 2;
  let durationBase: BudgetLevel = 1;

  if (duration > 3 && duration <= 30) durationBase = 2;
  if (duration > 30 && duration <= 60) durationBase = 3;

  return Math.max(triggerBase, durationBase) as BudgetLevel;
}

function inferRoute({
  text,
  hasTranscript,
  visualSignals = {},
  isLowInfo,
}: {
  text: string;
  hasTranscript: boolean;
  visualSignals?: VisualSignals;
  isLowInfo: boolean;
}): BudgetRoute {
  if (isLowInfo) return 'low_info';
  if (includesAny(text, transcriptKeywords)) return 'transcript_first';
  if (visualSignals.hasTextOnScreen || includesAny(text, ocrKeywords)) return 'ocr_first';
  if (includesAny(text, motionAudioKeywords)) return 'motion_audio_first';
  if (
    visualSignals.hasGameUI ||
    visualSignals.hasHandsOrTools ||
    visualSignals.hasStepLikeMotion ||
    includesAny(text, visualStepKeywords) ||
    includesAny(text, highInformationKeywords)
  ) {
    return 'visual_step_first';
  }
  if (includesAny(text, sceneKeywords) || visualSignals.hasStableScene) return 'visual_scene_first';
  if (hasTranscript) return 'transcript_first';
  return 'visual_scene_first';
}

function getFrameAndAudio(level: BudgetLevel): { frameCount: BudgetResult['frameCount']; audioStrategy: AudioStrategy; costLevel: CostLevel } {
  if (level === 0) return { frameCount: 0, audioStrategy: 'none', costLevel: 'none' };
  if (level === 1) return { frameCount: 1, audioStrategy: '3s_around_trigger', costLevel: 'low' };
  if (level === 2) return { frameCount: 3, audioStrategy: '12s_around_3_frames', costLevel: 'medium' };
  return { frameCount: 5, audioStrategy: '20s_around_5_frames', costLevel: 'high' };
}

function buildResult({
  level,
  route,
  reason,
  hasTranscript,
}: {
  level: BudgetLevel;
  route: BudgetRoute;
  reason: string;
  hasTranscript: boolean;
}): BudgetResult {
  const { frameCount, audioStrategy, costLevel } = getFrameAndAudio(level);
  const needsTranscript = level > 0 && route === 'transcript_first' && !hasTranscript;
  const needsOCR = level > 0 && route === 'ocr_first';
  const needsVisualStepAnalysis = level > 0 && ['visual_step_first', 'ocr_first', 'motion_audio_first'].includes(route);

  return {
    level,
    route,
    frameCount,
    audioStrategy,
    audioWindowStrategy: audioStrategy,
    costLevel,
    needsTranscript,
    needsOCR,
    needsVisualStepAnalysis,
    needsTranscriptOrAudio: level > 0 && (audioStrategy !== 'none' || needsTranscript),
    reason,
  };
}

export function runBudgetGate(input: BudgetGateInput): BudgetResult {
  const duration = Math.max(0, input.segmentEnd - input.segmentStart);
  const text = getText(input);
  const transcriptExcerpt = input.transcriptExcerpt ?? '';
  const segmentNote = input.segmentNote ?? '';
  const hasTranscript = transcriptExcerpt.trim().length > 0;
  const hasNote = segmentNote.trim().length > 0;
  const visualSignals = input.visualSignals ?? {};
  const highInformationIntent = includesAny(text, highInformationKeywords);
  const transcriptIntent = includesAny(text, transcriptKeywords);
  const visualStepSignal = Boolean(
    visualSignals.hasGameUI ||
    visualSignals.hasHandsOrTools ||
    visualSignals.hasStepLikeMotion,
  );
  const ocrSignal = Boolean(visualSignals.hasTextOnScreen || includesAny(text, ocrKeywords));
  const isLowInfo = Boolean(
    visualSignals.isBlurryOrLowInfo ||
    includesAny(text, lowInfoKeywords) ||
    (input.tags.length === 0 && !hasTranscript && !hasNote && !hasMeaningfulMetadata(input)),
  );
  const route = inferRoute({ text, hasTranscript, visualSignals, isLowInfo });

  if (duration > 60) {
    return buildResult({
      level: 0,
      route,
      hasTranscript,
      reason: `片段时长约 ${Math.round(duration)} 秒，超过 60 秒；当前默认不分析，建议缩短片段或由用户确认关键区间后再生成卡片。`,
    });
  }

  if ((visualSignals.isBlurryOrLowInfo || includesAny(text, lowInfoKeywords)) && !hasTranscript && !hasNote && !hasMeaningfulMetadata(input)) {
    return buildResult({
      level: 0,
      route: 'low_info',
      hasTranscript,
      reason: '当前片段呈现低信息或模糊特征，且没有字幕、片段说明或有效标题/标签/简介，不建议生成完整卡片。',
    });
  }

  if (route === 'low_info' && !hasTranscript && !hasNote && !highInformationIntent) {
    return buildResult({
      level: 0,
      route: 'low_info',
      hasTranscript,
      reason: '当前片段更像低信息片段，缺少可支撑判断的字幕、说明和高信息意图，不建议生成完整卡片。',
    });
  }

  let level = getBaseLevel(input, duration);
  const baseReason = `基础预算由触发方式 ${input.triggerMode === 'short_press' ? '短按' : '长按'} 和 ${Math.round(duration)} 秒片段确定为 Level ${level}`;
  const adjustments: string[] = [];

  if (highInformationIntent || (transcriptIntent && hasTranscript)) {
    const nextLevel = Math.min(3, level + 1) as BudgetLevel;
    if (nextLevel > level) {
      level = nextLevel;
      adjustments.push('标题、简介、标签或字幕体现教程/技巧/知识等高信息意图，提升一级');
    }
  }

  if (input.triggerMode === 'long_press') {
    const nextLevel = Math.min(3, level + 1) as BudgetLevel;
    if (nextLevel > level) {
      level = nextLevel;
      adjustments.push('用户长按明确选择了片段，提升一级');
    }
  }

  if (hasHighPlatformSignal(input) && (highInformationIntent || transcriptIntent)) {
    const nextLevel = Math.min(3, level + 1) as BudgetLevel;
    if (nextLevel > level) {
      level = nextLevel;
      adjustments.push('收藏量、收藏率或分享等平台信号较高，仅作为预算提升参考');
    }
  }

  if (ocrSignal || visualStepSignal) {
    if (level < 3) {
      level = 3;
      adjustments.push('画面可能包含屏幕文字、游戏 UI、手部工具或步骤动作，提升到 Level 3');
    }
  }

  if (route === 'transcript_first' && hasTranscript && level < 3 && transcriptIntent) {
    level = 3;
    adjustments.push('字幕/口播承载科普、观点或讲解信息，提升到 Level 3');
  }

  const routeReasonMap: Record<BudgetRoute, string> = {
    visual_scene_first: '采用视觉场景优先路线',
    visual_step_first: '采用视觉步骤优先路线',
    transcript_first: hasTranscript ? '采用字幕/口播优先路线' : '需要补充字幕/口播后走文本优先路线',
    ocr_first: '采用 OCR 优先路线',
    motion_audio_first: '采用动作节奏与最小音频窗口路线',
    low_info: '采用低信息路线',
  };
  const finalReason = [
    baseReason,
    adjustments.length > 0 ? adjustments.join('；') : '未发现需要提升预算的高信息修正信号',
    `${routeReasonMap[route]}，最终为 Level ${level}`,
  ].join('；') + '。';

  return buildResult({
    level,
    route,
    hasTranscript,
    reason: finalReason,
  });
}

export function getBudgetGateAcceptanceCases() {
  const cases: Array<{
    name: string;
    input: BudgetGateInput;
    expected: Pick<BudgetResult, 'level' | 'route'>;
  }> = [
    {
      name: '12 秒游戏技巧，标签含技巧/操作',
      input: {
        videoId: 'case_game_skill',
        triggerMode: 'short_press',
        videoTitle: '压枪技巧 12 秒操作复盘',
        videoDescription: '短时间展示游戏操作步骤。',
        tags: ['游戏', '技巧', '操作'],
        segmentStart: 0,
        segmentEnd: 12,
        transcriptExcerpt: '',
        segmentNote: '画面出现准星和操作节奏。',
        visualSignals: { hasGameUI: true, hasStepLikeMotion: true },
      },
      expected: { level: 3, route: 'visual_step_first' },
    },
    {
      name: '8 秒风景片段',
      input: {
        videoId: 'case_landscape',
        triggerMode: 'short_press',
        videoTitle: '海边日落',
        videoDescription: '稳定风景和旅行氛围。',
        tags: ['旅行', '风景'],
        segmentStart: 0,
        segmentEnd: 8,
        transcriptExcerpt: '',
        segmentNote: '画面稳定，主要是风景。',
        visualSignals: { hasStableScene: true },
      },
      expected: { level: 2, route: 'visual_scene_first' },
    },
    {
      name: '5 秒模糊转场，无说明无字幕',
      input: {
        videoId: 'case_low_info',
        triggerMode: 'short_press',
        videoTitle: '模糊转场',
        videoDescription: '',
        tags: ['低信息'],
        segmentStart: 0,
        segmentEnd: 5,
        transcriptExcerpt: '',
        segmentNote: '',
        visualSignals: { isBlurryOrLowInfo: true },
      },
      expected: { level: 0, route: 'low_info' },
    },
    {
      name: '20 秒知识科普，有字幕',
      input: {
        videoId: 'case_science_transcript',
        triggerMode: 'short_press',
        videoTitle: '知识科普：为什么会这样',
        videoDescription: '观点表达和知识讲解。',
        tags: ['知识', '科普'],
        segmentStart: 0,
        segmentEnd: 20,
        transcriptExcerpt: '这个现象的关键原因在于前后条件发生了变化。',
        segmentNote: '',
      },
      expected: { level: 3, route: 'transcript_first' },
    },
    {
      name: '15 秒剪辑软件教程，无口播但有界面文字',
      input: {
        videoId: 'case_editing_ocr',
        triggerMode: 'short_press',
        videoTitle: '剪辑软件教程：三步调参数',
        videoDescription: '屏幕录制展示设置面板和参数变化。',
        tags: ['剪辑', '教程', '参数'],
        segmentStart: 0,
        segmentEnd: 15,
        transcriptExcerpt: '',
        segmentNote: '',
        visualSignals: { hasTextOnScreen: true, hasStepLikeMotion: true },
      },
      expected: { level: 3, route: 'ocr_first' },
    },
  ];

  return cases.map((item) => {
    const result = runBudgetGate(item.input);
    return {
      ...item,
      result,
      passed: result.level === item.expected.level && result.route === item.expected.route,
    };
  });
}
