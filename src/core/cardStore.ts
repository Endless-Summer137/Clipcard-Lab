import type { SegmentCard } from './types';
import { removeCardFromClipbooks } from './clipbookStore';
import { removeClipbookPlacementsByCardId } from './clipbookPlacementStore';

const CARD_STORE_KEY = 'clipcard.cards';
const LEGACY_CARD_STORE_KEYS = ['clipcard-lab-cards-v1'];
const SEED_INITIALIZED_KEY = 'clipcard_seed_cards_initialized';
const LEGACY_SEED_INITIALIZED_KEYS = ['clipcard.seedDemoCardsInitialized'];
const DELETED_SEED_CARD_IDS_KEY = 'clipcard_deleted_seed_card_ids';
const LEGACY_DELETED_SEED_CARD_IDS_KEYS = ['clipcard.deletedSeedCardIds'];
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

function getCardTime(card: SegmentCard) {
  const reflectionTime = card.personalReflection?.updatedAt ? Date.parse(card.personalReflection.updatedAt) : 0;
  const createdTime = card.createdAt ? Date.parse(card.createdAt) : 0;
  return Math.max(reflectionTime || 0, createdTime || 0);
}

function inferSourceType(card: SegmentCard) {
  if (card.sourceType) return card.sourceType;
  if (SEED_CARD_IDS.includes(card.cardId)) return 'seed_demo';
  if (card.cardId.startsWith('card_')) return 'user_generated';
  return 'fallback';
}

function buildStableCardId(card: Partial<SegmentCard>, index: number) {
  const parts = [
    'legacy',
    card.videoId || 'unknown',
    String(card.segmentStart ?? 0),
    String(card.segmentEnd ?? 0),
    card.createdAt || card.title || String(index),
  ];
  return parts.join('_').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 96);
}

function normalizeCard(card: SegmentCard, index = 0): SegmentCard {
  const cardId = card.cardId?.trim() || buildStableCardId(card, index);
  return migrateDemoGameSeedCard({
    ...card,
    cardId,
    createdAt: card.createdAt ?? new Date().toISOString(),
    segmentSource: card.segmentSource ?? 'default_demo_segment',
    sourceVideoTitle: card.sourceVideoTitle ?? getFallbackVideoTitle(card.videoId),
    sourceAuthor: card.sourceAuthor ?? getFallbackSourceAuthor(card.videoId),
    sourceVideoId: card.sourceVideoId ?? card.videoId,
    sourceVideoUrl: card.sourceVideoUrl ?? getFallbackSourceUrl(card.videoId),
    sourceType: inferSourceType({ ...card, cardId }),
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

function dedupeCards(cards: SegmentCard[]) {
  const byId = new Map<string, SegmentCard>();
  let hadDuplicates = false;

  cards.forEach((card) => {
    const existing = byId.get(card.cardId);
    if (!existing) {
      byId.set(card.cardId, card);
      return;
    }

    hadDuplicates = true;
    console.warn(`[cardStore] duplicate cardId "${card.cardId}" detected; keeping the newer card.`);
    if (getCardTime(card) > getCardTime(existing)) byId.set(card.cardId, card);
  });

  return { cards: Array.from(byId.values()), hadDuplicates };
}

function readCardsFromKey(key: string) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((card, index) => normalizeCard(card as SegmentCard, index));
  } catch {
    return [];
  }
}

function readCards(): SegmentCard[] {
  try {
    const currentCards = readCardsFromKey(CARD_STORE_KEY);
    const mergedCards = [...currentCards];
    let shouldWrite = false;

    for (const legacyKey of LEGACY_CARD_STORE_KEYS) {
      const legacyCards = readCardsFromKey(legacyKey);
      if (!legacyCards.length) continue;
      legacyCards.forEach((legacyCard) => mergedCards.push(legacyCard));
      localStorage.removeItem(legacyKey);
      shouldWrite = true;
    }

    const deletedSeedCardIds = readDeletedSeedCardIds();
    const activeCards = mergedCards.filter((card) => !(SEED_CARD_IDS.includes(card.cardId) && deletedSeedCardIds.has(card.cardId)));
    const deduped = dedupeCards(activeCards);
    shouldWrite = shouldWrite || deduped.hadDuplicates || JSON.stringify(deduped.cards) !== JSON.stringify(currentCards);
    if (shouldWrite) writeCards(deduped.cards);
    return deduped.cards;
  } catch {
    return [];
  }
}

function writeCards(cards: SegmentCard[]) {
  localStorage.setItem(CARD_STORE_KEY, JSON.stringify(cards));
}

function readDeletedSeedCardIds() {
  try {
    const deletedIds = new Set<string>();
    const keys = [DELETED_SEED_CARD_IDS_KEY, ...LEGACY_DELETED_SEED_CARD_IDS_KEYS];
    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) parsed.forEach((id) => deletedIds.add(String(id)));
    });
    return deletedIds;
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

function removeCardFromLegacyStores(cardId: string) {
  for (const key of LEGACY_CARD_STORE_KEYS) {
    const cards = readCardsFromKey(key);
    if (!cards.length) continue;
    const nextCards = cards.filter((card) => card.cardId !== cardId);
    if (nextCards.length === cards.length) continue;
    if (nextCards.length) localStorage.setItem(key, JSON.stringify(nextCards));
    else localStorage.removeItem(key);
  }
}

function hasSeedInitialized() {
  if (localStorage.getItem(SEED_INITIALIZED_KEY) === 'true') return true;
  const hasLegacyInitialized = LEGACY_SEED_INITIALIZED_KEYS.some((key) => localStorage.getItem(key) === '1' || localStorage.getItem(key) === 'true');
  if (hasLegacyInitialized) markSeedInitialized();
  return hasLegacyInitialized;
}

function markSeedInitialized() {
  localStorage.setItem(SEED_INITIALIZED_KEY, 'true');
  LEGACY_SEED_INITIALIZED_KEYS.forEach((key) => localStorage.removeItem(key));
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
  const targetCardId = cardId.trim();
  if (!targetCardId) return;
  markSeedCardDeleted(targetCardId);
  writeCards(readCards().filter((card) => card.cardId !== targetCardId));
  removeCardFromLegacyStores(targetCardId);
  removeCardFromClipbooks(targetCardId);
  removeClipbookPlacementsByCardId(targetCardId);
}

export function seedDemoCardsOnce() {
  if (hasSeedInitialized()) return;
  if (readCards().length > 0) {
    markSeedInitialized();
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
    sourceType: 'seed_demo' as const,
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
  markSeedInitialized();
}

export const seedDemoCardsIfEmpty = seedDemoCardsOnce;
