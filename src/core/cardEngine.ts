import type { CardEngineInput, SegmentCard } from './types';

type CardTopic = 'game' | 'game_collect' | 'food' | 'travel' | 'generic' | 'light';

const GAME_KEYWORDS = ['游戏', '高光', '反打', '狙击', '团战', '操作', 'FPS', 'fps', '射击', '回合', 'CS2', 'AWP', 'm0NESY', '职业选手', '高光混剪', '游戏高能操作时刻'];
const FOOD_KEYWORDS = ['美食', '探店', '店铺', '餐', '菜', '汤', '点单', '小店', 'food'];
const TRAVEL_KEYWORDS = ['旅行', '风景', '出行', '城市', '山', '湖', '景', 'travel'];

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function compactText(value?: string) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function toList(value?: string | string[]) {
  if (Array.isArray(value)) return value.map(compactText).filter(Boolean);
  const text = compactText(value);
  return text ? [text] : [];
}

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function firstSentence(value?: string) {
  const text = compactText(value);
  if (!text) return '';
  const match = text.match(/^(.+?[。.!！？?])/);
  return match?.[1] ?? text;
}

function buildContextText(input: CardEngineInput) {
  return [
    ...toList(input.segmentFacts),
    ...toList(input.keyActions),
    input.segmentOutcome,
    input.userValue,
    input.featuredPersonOrId,
    input.visibleTextOrOcr,
    input.transcriptExcerpt,
    input.segmentNote,
    input.visionAnalysis?.visualSummary,
    input.visionAnalysis?.visibleObjects.join(' '),
    input.visionAnalysis?.cardSuggestion.suggestedCardType,
    input.visionAnalysis?.cardSuggestion.reason,
    input.activityName,
    input.activityCta,
    input.videoTitle,
    input.videoDescription,
    input.tags.join(' '),
  ].map(compactText).filter(Boolean).join(' ');
}

function hasSpecificContext(contextText: string) {
  return includesAny(contextText, [...GAME_KEYWORDS, ...FOOD_KEYWORDS, ...TRAVEL_KEYWORDS]);
}

function isGameContext(input: CardEngineInput, contextText: string) {
  return includesAny(contextText, GAME_KEYWORDS) || input.visionAnalysis?.contentType === 'game';
}

function inferTopic(input: CardEngineInput, contextText: string): CardTopic {
  const contentType = input.visionAnalysis?.contentType;
  if (isSparseGameHighlight(input, contextText)) return 'game_collect';
  if (isGameContext(input, contextText)) return 'game';
  if (includesAny(contextText, FOOD_KEYWORDS) || contentType === 'food') return 'food';
  if (includesAny(contextText, TRAVEL_KEYWORDS) || contentType === 'travel') return 'travel';
  return 'generic';
}

function getSegmentFacts(input: CardEngineInput) {
  return toList(input.segmentFacts);
}

function getKeyActions(input: CardEngineInput) {
  return toList(input.keyActions);
}

function hasUsefulSignals(input: CardEngineInput) {
  return Boolean(
    getSegmentFacts(input).length
    || getKeyActions(input).length
    || compactText(input.userValue)
    || compactText(input.transcriptExcerpt)
    || compactText(input.visibleTextOrOcr)
    || compactText(input.segmentNote)
    || compactText(input.visionAnalysis?.visualSummary),
  );
}

function isSparseGameHighlight(input: CardEngineInput, contextText: string) {
  const activityContext = `${compactText(input.activityName)} ${input.tags.join(' ')}`;
  const hasGameActivitySignal = includesAny(activityContext, ['游戏', '高光', 'FPS', 'fps', '操作']);
  if (!hasGameActivitySignal) return false;

  const hasTranscript = Boolean(compactText(input.transcriptExcerpt));
  const hasVisibleText = Boolean(compactText(input.visibleTextOrOcr));
  const hasFacts = getSegmentFacts(input).length > 0;
  const hasOutcome = Boolean(compactText(input.segmentOutcome));
  const hasUserValue = Boolean(compactText(input.userValue));
  const contentType = input.visionAnalysis?.contentType;
  const visionOnlyGenericGame = contentType === 'game' || contentType === 'unknown' || includesAny(contextText, ['FPS', 'fps', '射击', '游戏画面']);

  return !hasTranscript && !hasVisibleText && !hasFacts && !hasOutcome && !hasUserValue && visionOnlyGenericGame;
}

function shouldGenerateLightCard(input: CardEngineInput, contextText: string) {
  const contentType = input.visionAnalysis?.contentType;
  const lowInfoVision = contentType === 'low_info' || contentType === 'unknown';
  return input.budgetResult.level === 0 || (!hasUsefulSignals(input) && lowInfoVision && !hasSpecificContext(contextText));
}

function getCardType(input: CardEngineInput, topic: CardTopic) {
  if (topic === 'light') return '待补充片段';
  if (topic === 'game_collect') return '游戏高光收藏卡';
  if (topic === 'game') return '游戏高光卡';
  if (topic === 'food') return '美食探店卡';
  if (topic === 'travel') return '旅行灵感卡';

  const suggestion = input.visionAnalysis?.cardSuggestion;
  if (suggestion?.shouldGenerateFullCard && compactText(suggestion.suggestedCardType)) {
    return compactText(suggestion.suggestedCardType).slice(0, 40);
  }
  return input.budgetResult.level === 1 ? '轻量瞬间卡' : '兴趣观察卡';
}

function getTitle(input: CardEngineInput, topic: CardTopic) {
  const title = compactText(input.videoTitle) || '未命名片段';
  const featured = compactText(input.featuredPersonOrId);
  const actions = getKeyActions(input).join(' ');
  const isAwpClip = includesAny(`${actions} ${title}`, ['AWP', '狙击']);

  if (topic === 'game' && featured && isAwpClip) return `${featured} 高光：AWP 狙击片段`;
  if (topic === 'game' && featured) return `游戏高光：${featured} 高光片段`;
  if (topic === 'game') return `游戏高光：${title}`;
  if (topic === 'game_collect' && featured) return `游戏高光收藏：${featured} 高光片段`;
  if (topic === 'game_collect') return `游戏高光收藏：${title}`;
  if (topic === 'food') return `美食探店：${title}`;
  if (topic === 'travel') return `旅行灵感：${title}`;
  if (topic === 'light') return `待补充片段：${title}`;
  return `片段卡：${title}`;
}

function getActivityPhrase(input: CardEngineInput) {
  const activityName = compactText(input.activityName);
  if (!activityName) return '';
  return `结合「${activityName}」活动，`;
}

function getUsefulObjects(input: CardEngineInput, fallback: string[]) {
  const objects = input.visionAnalysis?.visibleObjects
    ?.map(compactText)
    .filter(Boolean)
    .slice(0, 3) ?? [];
  return objects.length ? objects : fallback;
}

function getGameFocus(input: CardEngineInput, contextText: string) {
  const focus: string[] = [];
  const actionText = getKeyActions(input).join(' ');
  if (includesAny(`${actionText} ${contextText}`, ['AWP', '狙击', 'FPS', 'fps', '射击'])) focus.push('AWP/狙击视角');
  if (includesAny(actionText, ['开镜预瞄'])) focus.push('开镜预瞄');
  if (includesAny(actionText, ['击杀高光'])) focus.push('击杀高光');
  if (includesAny(actionText, ['回合收尾'])) focus.push('回合收尾');
  if (includesAny(actionText, ['高光混剪'])) focus.push('高光混剪节奏');
  if (contextText.includes('反打')) focus.push('反打时机');
  if (contextText.includes('团战')) focus.push('团战节奏');

  input.visionAnalysis?.visibleObjects.forEach((object) => {
    const cleanObject = compactText(object);
    if (includesAny(cleanObject, ['第一人称', '射击', '游戏画面', 'HUD', 'UI']) && focus.length < 5) {
      focus.push(cleanObject);
    }
  });

  return Array.from(new Set(focus)).slice(0, 5);
}

function buildGameSummary(input: CardEngineInput, contextText: string) {
  const activityPhrase = getActivityPhrase(input);
  const featured = compactText(input.featuredPersonOrId);
  const subject = featured ? `${featured} 的 FPS 高光片段` : 'FPS/游戏高光片段';
  const facts = firstSentence(getSegmentFacts(input)[0]);
  const focus = getGameFocus(input, contextText);
  const focusText = focus.length ? focus.join('、') : '第一人称视角、游戏 HUD 和高光剪辑节奏';
  const value = compactText(input.userValue);
  const outcome = compactText(input.segmentOutcome);

  return [
    `${activityPhrase}这段更适合作为${subject}收藏。`,
    facts || `画面信息指向${focusText}。`,
    `重点可关注${focusText}。`,
    value || outcome || '适合加入 FPS 高光册，之后回看操作节奏或分享给朋友讨论。',
  ].join('');
}

function buildSummary(input: CardEngineInput, topic: CardTopic, contextText: string) {
  const activityPhrase = getActivityPhrase(input);
  const timeRange = `${formatSeconds(input.segmentStart)}-${formatSeconds(input.segmentEnd)}`;

  if (topic === 'light') {
    return `当前片段信息不足，已保存为待补充片段。片段时间 ${timeRange}，后续可补充画面说明、字幕或个人备注。`;
  }

  if (topic === 'game') return buildGameSummary(input, contextText);

  if (topic === 'game_collect') {
    return `${activityPhrase}这段适合作为活动高光片段收藏。当前可先加入 FPS 高光册，之后再补充操作说明；也适合分享给朋友讨论这一刻。`;
  }

  if (topic === 'food') {
    const facts = firstSentence(getSegmentFacts(input)[0]);
    const focusText = getUsefulObjects(input, ['菜品状态', '店铺氛围', '点单线索']).join('、');
    return `${activityPhrase}${facts || `这段适合作为美食探店片段保存。重点在${focusText}。`}可用于回看点单参考、整理探店记录或加入主题手账。`;
  }

  if (topic === 'travel') {
    const facts = firstSentence(getSegmentFacts(input)[0]);
    const focusText = getUsefulObjects(input, ['风景氛围', '地点感', '出行灵感']).join('、');
    return `${activityPhrase}${facts || `这段适合作为旅行灵感片段保存。重点在${focusText}。`}可用于规划路线、记录城市漫步或整理旅行手账。`;
  }

  const summary = firstSentence(getSegmentFacts(input)[0])
    || compactText(input.segmentOutcome)
    || compactText(input.userValue)
    || compactText(input.segmentNote)
    || compactText(input.transcriptExcerpt)
    || compactText(input.visionAnalysis?.visualSummary)
    || compactText(input.videoDescription)
    || '这段包含一个值得稍后回看的兴趣点。';
  return `${activityPhrase}${summary}适合保存为片段卡，方便之后复看、整理或分享。`;
}

function buildSaveReason(input: CardEngineInput, topic: CardTopic) {
  const userValue = compactText(input.userValue);
  if (userValue) return userValue;
  if (topic === 'light') return '适合先暂存这一刻，稍后补充标题、画面说明或个人备注。';
  if (topic === 'game_collect') return '适合先收藏为游戏高光素材，加入 FPS 高光册，或分享给朋友一起判断这段操作亮点。';
  if (topic === 'game') return '适合之后回看 AWP/狙击和操作节奏、整理 FPS 高光册，或分享给朋友讨论这段高光。';
  if (topic === 'food') return '适合之后回看菜品和店铺氛围，作为点单参考，也可以加入活动探店手账。';
  if (topic === 'travel') return '适合之后回看风景和地点氛围，沉淀出行灵感，也可以加入旅行手账。';
  return compactText(input.transcriptExcerpt)
    ? '适合保存这段表达，方便之后复看、引用或继续整理。'
    : '适合保存这个片段中的兴趣点，方便之后复看、整理或分享。';
}

function buildEvidenceNote(input: CardEngineInput, topic: CardTopic) {
  const uncertainties = toList(input.uncertainties).join('；');
  const base = topic === 'light'
    ? '本卡片未强行生成完整判断，仅保留片段时间、活动信息和已有元数据。'
    : topic === 'game_collect' || topic === 'game'
      ? '本卡片结合活动主题、视频标题、片段级分析信号和关键帧视觉结果生成；当前尚未完整分析音频、字幕、OCR、连续操作过程和赛事资料。'
      : '本卡片结合活动主题、视频标题、视频简介、标签、片段时间和关键帧画面生成；视觉模型结果只作为辅助信号。';
  const sourceNote = input.analysisSource === 'mock_vision_fallback'
    ? '视觉模型当前限流，已使用本地兜底生成；卡片可能不包含完整画面理解。'
    : input.analysisSource === 'rule_fallback'
      ? '当前未完成视觉分析，卡片主要基于标题、活动信息和片段时间生成。'
      : '重要信息请结合原视频核查。';
  const gameBoundary = topic === 'game_collect' || topic === 'game'
    ? '不判断具体地图、赛事、对阵队伍、每一枪的战术细节或不可靠的选手 ID。'
    : '';
  const limitations = input.visionAnalysis?.limitations?.map(compactText).filter(Boolean).slice(0, 2);
  const limitationNote = limitations?.length ? `模型限制：${limitations.join('；')}` : '';
  const uncertaintyNote = uncertainties ? `不确定信息：${uncertainties}` : '';
  return [base, sourceNote, gameBoundary, uncertaintyNote, limitationNote].filter(Boolean).join(' ');
}

export function generateSegmentCard(input: CardEngineInput): SegmentCard {
  const contextText = buildContextText(input);
  const topic = shouldGenerateLightCard(input, contextText) ? 'light' : inferTopic(input, contextText);
  const cardType = getCardType(input, topic);
  const createdAt = new Date().toISOString();
  const coverFields = {
    coverImage: input.coverImage,
    coverFrame: input.coverFrame,
    coverFrameTime: input.coverFrameTime,
    coverSource: input.coverSource,
    keyframes: input.keyframes,
    budgetResult: input.budgetResult,
    visionAnalysis: input.visionAnalysis,
    analysisSource: input.analysisSource,
  };
  const activityFields = {
    activityId: input.activityId,
    activityName: input.activityName,
    activityCta: input.activityCta,
    targetClipbookTemplate: input.targetClipbookTemplate,
  };
  const sourceFields = {
    segmentSource: input.segmentSource,
    sourceVideoTitle: input.videoTitle,
    sourceAuthor: input.sourceAuthor,
    sourceVideoId: input.sourceVideoId ?? input.videoId,
    sourceVideoUrl: input.sourceVideoUrl,
    sourceType: input.sourceType ?? 'user_generated' as const,
  };

  return {
    cardId: createId('card'),
    videoId: input.videoId,
    segmentStart: input.segmentStart,
    segmentEnd: input.segmentEnd,
    ...sourceFields,
    cardType,
    title: getTitle(input, topic),
    summary: buildSummary(input, topic, contextText),
    saveReason: buildSaveReason(input, topic),
    evidenceNote: buildEvidenceNote(input, topic),
    adDecision: input.adDecision,
    createdAt,
    ...coverFields,
    ...activityFields,
  };
}
