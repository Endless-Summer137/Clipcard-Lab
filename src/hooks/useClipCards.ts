import { useCallback, useState } from 'react';
import {
  deleteCard as deleteStoredCard,
  getCards,
  saveCard as saveStoredCard,
  seedDemoCardsIfEmpty,
} from '../core/cardStore';
import { removeClipbookPlacementsByCardId } from '../core/clipbookPlacementStore';
import type { SegmentCard } from '../core/types';

export function getAllCardsForSelection() {
  return getCards();
}

export function useClipCards() {
  const [cards, setCards] = useState<SegmentCard[]>(() => getAllCardsForSelection());

  const refreshCards = useCallback(() => {
    const nextCards = getAllCardsForSelection();
    setCards(nextCards);
    return nextCards;
  }, []);

  const saveCard = useCallback((card: SegmentCard) => {
    saveStoredCard(card);
    return refreshCards();
  }, [refreshCards]);

  const deleteCard = useCallback((cardId: string) => {
    deleteStoredCard(cardId);
    removeClipbookPlacementsByCardId(cardId);
    return refreshCards();
  }, [refreshCards]);

  const seedDemoCards = useCallback(() => {
    seedDemoCardsIfEmpty();
    return refreshCards();
  }, [refreshCards]);

  return { cards, refreshCards, saveCard, deleteCard, seedDemoCards };
}
