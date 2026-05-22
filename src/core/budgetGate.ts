import type { BudgetGateInput, BudgetResult } from './types';

const highInformationKeywords = [
  '教程',
  '知识',
  '口播',
  '解说',
  '讲解',
  '音乐',
  '舞蹈',
  '密集笑点',
  '搞笑',
  '游戏解说',
];

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function runBudgetGate(input: BudgetGateInput): BudgetResult {
  const duration = Math.max(0, input.segmentEnd - input.segmentStart);
  const joinedText = [...input.tags, input.segmentNote, input.transcriptExcerpt].join(' ');
  const hasTranscript = input.transcriptExcerpt.trim().length > 0;
  const hasNote = input.segmentNote.trim().length > 0;
  const hasAnyInfo = input.tags.length > 0 || hasTranscript || hasNote;
  const isLowInfo = includesAny(joinedText, ['低信息', '模糊', '过渡', '无主体']);
  const isHighInformation = includesAny(joinedText, highInformationKeywords);

  if (!hasAnyInfo || (isLowInfo && !hasTranscript && !hasNote)) {
    return {
      level: 0,
      frameCount: 0,
      audioWindowStrategy: 'none',
      costLevel: 'none',
      needsTranscriptOrAudio: false,
      reason: '信息不足，不建议生成完整卡片；不提取音频。',
    };
  }

  if (isHighInformation) {
    const tooLongHint = duration > 60 ? '片段超过 60 秒，建议缩短片段或只分析关键区间。' : '';
    return {
      level: 4,
      frameCount: duration > 30 ? 5 : 3,
      audioWindowStrategy: 'full_segment_or_transcript_first',
      costLevel: 'high',
      needsTranscriptOrAudio: true,
      reason: hasTranscript
        ? `高信息密度内容，优先使用字幕/口播摘录，关键帧只作为视觉锚点。${tooLongHint}`
        : `高信息密度内容，音频/字幕是主信息源；当前没有字幕摘录，应提取用户选择区间的相对完整音频。${tooLongHint}`,
    };
  }

  if (duration <= 3) {
    return {
      level: 1,
      frameCount: 1,
      audioWindowStrategy: '3s_around_frame',
      costLevel: 'low',
      needsTranscriptOrAudio: true,
      reason: '用于保存当前瞬间或不超过 3 秒片段；抽 1 帧，并取关键帧前后约 1.5 秒音频。',
    };
  }

  if (duration <= 30) {
    return {
      level: 2,
      frameCount: 3,
      audioWindowStrategy: '12s_around_3_frames',
      costLevel: 'medium',
      needsTranscriptOrAudio: true,
      reason: '3-30 秒标准片段；抽起点、中点、终点 3 帧，每帧前后约 2 秒音频并合并重叠区间。',
    };
  }

  if (duration <= 60) {
    return {
      level: 3,
      frameCount: 5,
      audioWindowStrategy: '20s_around_5_frames',
      costLevel: 'high',
      needsTranscriptOrAudio: true,
      reason: '30-60 秒稳健片段；抽 5 帧作为视觉锚点，每帧前后约 2 秒音频并合并重叠区间。',
    };
  }

  return {
    level: 3,
    frameCount: 5,
    audioWindowStrategy: '20s_around_5_frames',
    costLevel: 'high',
    needsTranscriptOrAudio: true,
    reason: '片段超过 60 秒，建议缩短；当前默认按高成本处理，只分析 5 个视觉锚点及其最小必要音频窗口。',
  };
}
