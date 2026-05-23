import type { SegmentCard } from './types';
import { removeCardFromClipbooks } from './clipbookStore';

const CARD_STORE_KEY = 'clipcard.cards';
const LEGACY_CARD_STORE_KEYS = ['clipcard-lab-cards-v1'];
const SEED_INITIALIZED_KEY = 'clipcard.seedDemoCardsInitialized';
const DELETED_SEED_CARD_IDS_KEY = 'clipcard.deletedSeedCardIds';
const SEED_CARD_IDS = ['demo_card_food', 'demo_card_game', 'demo_card_travel'];

function getFallbackVideoTitle(videoId: string) {
  const map: Record<string, string> = {
    demo_food_001: '深夜小店热汤',
    demo_game_001: 'm0NESY 2025 超神高光回顾',
    demo_travel_001: '城市转角风景',
  };
  return map[videoId] ?? '演示视频片段';
}

function getFallbackSourceAuthor(videoId: string) {
  const map: Record<string, string> = {
    demo_food_001: '@clipcard_food',
    demo_game_001: '@ZqLjy20231124（仅做演示用）',
    demo_travel_001: '@clipcard_travel',
  };
  return map[videoId] ?? '@clipcard_demo';
}

function getFallbackSourceUrl(videoId: string) {
  const map: Record<string, string> = {
    demo_food_001: 'https://example.com/clipcard/demo_food_001',
    demo_game_001: 'https://example.com/clipcard/demo_game_001',
    demo_travel_001: 'https://example.com/clipcard/demo_travel_001',
  };
  return map[videoId] ?? `https://example.com/clipcard/${videoId || 'demo'}`;
}

function migrateDemoGameSeedCard(card: SegmentCard): SegmentCard {
  if (card.cardId !== 'demo_card_game') return card;
  const hasLegacyTitle = !card.title || card.title.includes('团战反打高光');
  const hasLegacySource = !card.sourceVideoTitle || card.sourceVideoTitle.includes('团战反打高光');
  const hasLegacyAuthor = !card.sourceAuthor || card.sourceAuthor === '@clipcard_game';
  if (!hasLegacyTitle && !hasLegacySource && !hasLegacyAuthor) return card;

  return {
    ...card,
    sourceVideoTitle: 'm0NESY 2025 超神高光回顾',
    sourceAuthor: '@ZqLjy20231124（仅做演示用）',
    title: 'm0NESY 高光：AWP 狙击片段',
    summary: '这段适合作为 m0NESY 的 FPS 高光片段收藏。重点可关注 AWP/狙击视角、游戏 HUD 和高光混剪节奏，适合加入 FPS 高光册或分享给朋友讨论。',
    saveReason: '适合收藏选手高光、回看狙击/操作节奏，或作为 #游戏高能操作时刻 活动手账素材。',
  };
}

function normalizeCard(card: SegmentCard): SegmentCard {
  return migrateDemoGameSeedCard({
    ...card,
    createdAt: card.createdAt ?? new Date().toISOString(),
    segmentSource: card.segmentSource ?? 'default_demo_segment',
    sourceVideoTitle: card.sourceVideoTitle ?? getFallbackVideoTitle(card.videoId),
    sourceAuthor: card.sourceAuthor ?? getFallbackSourceAuthor(card.videoId),
    sourceVideoId: card.sourceVideoId ?? card.videoId,
    sourceVideoUrl: card.sourceVideoUrl ?? getFallbackSourceUrl(card.videoId),
    coverFrameTime: card.coverFrameTime ?? card.coverFrame,
    coverSource: card.coverSource ?? (card.coverImage ? 'demo_placeholder' : 'none'),
    keyframes: Array.isArray(card.keyframes)
      ? card.keyframes.filter((frame) => frame?.image && Number.isFinite(frame.time))
      : undefined,
    analysisSource: card.analysisSource,
    visionAnalysis: card.visionAnalysis,
    personalReflection: card.personalReflection?.text?.trim()
      ? {
        text: card.personalReflection.text.slice(0, 300),
        updatedAt: card.personalReflection.updatedAt ?? new Date().toISOString(),
    }
      : undefined,
  });
}

function readCards(): SegmentCard[] {
  try {
    const raw = localStorage.getItem(CARD_STORE_KEY);
    const currentCards = raw ? (JSON.parse(raw) as SegmentCard[]).map(normalizeCard) : [];
    const mergedCards = [...currentCards];
    let shouldWrite = raw ? JSON.stringify(currentCards) !== raw : false;

    for (const legacyKey of LEGACY_CARD_STORE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const legacyCards = (JSON.parse(legacyRaw) as SegmentCard[]).map(normalizeCard);
        legacyCards.forEach((legacyCard) => {
          if (!mergedCards.some((card) => card.cardId === legacyCard.cardId)) {
            mergedCards.push(legacyCard);
            shouldWrite = true;
          }
        });
      }
    }

    if (shouldWrite) writeCards(mergedCards);
    return mergedCards;
  } catch {
    return [];
  }
}

function writeCards(cards: SegmentCard[]) {
  localStorage.setItem(CARD_STORE_KEY, JSON.stringify(cards));
}

function readDeletedSeedCardIds() {
  try {
    const raw = localStorage.getItem(DELETED_SEED_CARD_IDS_KEY);
    return new Set(raw ? JSON.parse(raw) as string[] : []);
  } catch {
    return new Set<string>();
  }
}

function markSeedCardDeleted(cardId: string) {
  if (!SEED_CARD_IDS.includes(cardId)) return;
  const deletedIds = readDeletedSeedCardIds();
  deletedIds.add(cardId);
  localStorage.setItem(DELETED_SEED_CARD_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
}

export function saveCard(card: SegmentCard) {
  const cards = readCards();
  const normalizedCard = normalizeCard(card);
  writeCards([normalizedCard, ...cards.filter((item) => item.cardId !== normalizedCard.cardId)]);
}

export function getCards() {
  return readCards();
}

export function getCardsByVideo(videoId: string) {
  return readCards().filter((card) => card.videoId === videoId);
}

export function getCardById(cardId: string) {
  return readCards().find((card) => card.cardId === cardId);
}

export function updateCard(cardId: string, patch: Partial<SegmentCard>) {
  const next = readCards().map((card) => (card.cardId === cardId ? { ...card, ...patch } : card));
  writeCards(next);
}

export function deleteCard(cardId: string) {
  markSeedCardDeleted(cardId);
  writeCards(readCards().filter((card) => card.cardId !== cardId));
  removeCardFromClipbooks(cardId);
}

export function seedDemoCardsIfEmpty() {
  if (localStorage.getItem(SEED_INITIALIZED_KEY) === '1') return;
  if (readCards().length > 0) {
    localStorage.setItem(SEED_INITIALIZED_KEY, '1');
    return;
  }

  const createdAt = new Date().toISOString();
  const baseCard = {
    segmentSource: 'default_demo_segment' as const,
    adDecision: {
      decision: 'limit' as const,
      reason: '演示卡片仅用于本地空状态兜底，广告必须明确标注。',
      disclosureRequired: true as const,
      adLabel: '广告' as const,
    },
    createdAt,
    coverSource: 'none' as const,
  };

  const deletedSeedCardIds = readDeletedSeedCardIds();
  const seedCards: SegmentCard[] = [
    {
      ...baseCard,
      cardId: 'demo_card_food',
      videoId: 'demo_food_001',
      sourceVideoTitle: '深夜小店热汤',
      sourceAuthor: '@clipcard_food',
      sourceVideoId: 'demo_food_001',
      sourceVideoUrl: 'https://example.com/clipcard/demo_food_001',
      segmentStart: 8,
      segmentEnd: 13,
      cardType: '消费意图卡',
      title: '消费意图卡：深夜小店热汤',
      summary: '从当前片段看，这更像是一个适合保存的探店片段；如果后续内容进入菜单或价格，判断可以继续收紧。',
      saveReason: '用户可能想保存这段用于稍后点单或回看门店氛围。',
      evidenceNote: '演示卡片基于本地 demo 输入生成，不代表真实视觉识别结果。',
    },
    {
      ...baseCard,
      cardId: 'demo_card_game',
      videoId: 'demo_game_001',
      sourceVideoTitle: 'm0NESY 2025 超神高光回顾',
      sourceAuthor: '@ZqLjy20231124（仅做演示用）',
      sourceVideoId: 'demo_game_001',
      sourceVideoUrl: 'https://example.com/clipcard/demo_game_001',
      segmentStart: 21,
      segmentEnd: 28,
      cardType: '游戏高光卡',
      title: 'm0NESY 高光：AWP 狙击片段',
      summary: '这段适合作为 m0NESY 的 FPS 高光片段收藏。重点可关注 AWP/狙击视角、游戏 HUD 和高光混剪节奏，适合加入 FPS 高光册或分享给朋友讨论。',
      saveReason: '适合收藏选手高光、回看狙击/操作节奏，或作为 #游戏高能操作时刻 活动手账素材。',
      evidenceNote: '演示卡片基于本地 demo 输入生成，不代表真实视觉识别结果。',
    },
    {
      ...baseCard,
      cardId: 'demo_card_travel',
      videoId: 'demo_travel_001',
      sourceVideoTitle: '城市转角风景',
      sourceAuthor: '@clipcard_travel',
      sourceVideoId: 'demo_travel_001',
      sourceVideoUrl: 'https://example.com/clipcard/demo_travel_001',
      segmentStart: 4,
      segmentEnd: 11,
      cardType: '旅行灵感卡',
      title: '旅行灵感卡：城市转角风景',
      summary: '从当前片段看，这更像是一个轻量旅行灵感点；如果后续出现地点信息，保存价值会更明确。',
      saveReason: '用户可能想保存这段作为城市漫步或出行灵感。',
      evidenceNote: '演示卡片基于本地 demo 输入生成，不代表真实视觉识别结果。',
    },
  ].filter((card) => !deletedSeedCardIds.has(card.cardId));

  writeCards(seedCards);
  localStorage.setItem(SEED_INITIALIZED_KEY, '1');
}
