import type { SegmentCard } from './types';

const CARD_STORE_KEY = 'clipcard-lab-cards-v1';

function readCards(): SegmentCard[] {
  try {
    const raw = localStorage.getItem(CARD_STORE_KEY);
    return raw ? (JSON.parse(raw) as SegmentCard[]) : [];
  } catch {
    return [];
  }
}

function writeCards(cards: SegmentCard[]) {
  localStorage.setItem(CARD_STORE_KEY, JSON.stringify(cards));
}

export function saveCard(card: SegmentCard) {
  const cards = readCards();
  writeCards([card, ...cards.filter((item) => item.cardId !== card.cardId)]);
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
  writeCards(readCards().filter((card) => card.cardId !== cardId));
}
