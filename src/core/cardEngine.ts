import type { CardEngineInput, SegmentCard } from './types';

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function hasTag(tags: string[], keywords: string[]) {
  const text = tags.join(' ');
  return keywords.some((keyword) => text.includes(keyword));
}

function inferCardType(input: CardEngineInput) {
  if (input.budgetResult.level === 0) return '待补充片段';
  if (hasTag(input.tags, ['美食', '探店', '门店'])) return '消费意图卡';
  if (hasTag(input.tags, ['游戏', '高光'])) return '游戏高光卡';
  if (hasTag(input.tags, ['旅行', '风景', '出行'])) return '旅行灵感卡';
  if (hasTag(input.tags, ['低信息'])) return '轻卡片';
  return '兴趣观察卡';
}

export function generateSegmentCard(input: CardEngineInput): SegmentCard {
  const hasTranscript = input.transcriptExcerpt.trim().length > 0;
  const hasNote = input.segmentNote.trim().length > 0;
  const cardType = inferCardType(input);
  const sourceText = hasTranscript ? input.transcriptExcerpt : input.segmentNote || input.videoDescription;
  const isLightCard = input.budgetResult.level === 0 || (!hasTranscript && !hasNote);

  if (isLightCard) {
    return {
      cardId: createId('card'),
      videoId: input.videoId,
      segmentStart: input.segmentStart,
      segmentEnd: input.segmentEnd,
      cardType: '待补充片段',
      title: '需要补充信息的片段',
      summary: '仅凭当前信息还不足以判断明确意图，更像是一个需要补充说明的保存点。',
      saveReason: '用户可能只是想暂存这一刻，等待后续补充片段说明、字幕、视觉识别或音频转写。',
      evidenceNote: '当前没有足够的片段说明或字幕/口播摘录；系统不能假装已经看懂视频画面。',
      adDecision: input.adDecision,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    cardId: createId('card'),
    videoId: input.videoId,
    segmentStart: input.segmentStart,
    segmentEnd: input.segmentEnd,
    cardType,
    title: `${cardType}：${input.videoTitle}`,
    summary: `从当前片段看，${sourceText} 可能形成一个值得保存的片段；如果后续内容进入更明确语境，判断可以继续收紧。`,
    saveReason: hasTranscript
      ? '用户可能想保存这段口播、字幕或关键表达，方便稍后复看。'
      : '用户可能想保存这段画面或说明中出现的兴趣点，方便稍后复看。',
    evidenceNote: hasTranscript
      ? '本卡片优先基于字幕/口播摘录生成，并结合视频简介、标签和片段说明；当前未假装调用视觉或音频模型。'
      : '本卡片基于视频简介、标签和片段说明生成；当前未接入视觉/音频模型，不能自动理解画面或声音。',
    adDecision: input.adDecision,
    createdAt: new Date().toISOString(),
  };
}
