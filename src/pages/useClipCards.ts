import { useCallback, useState } from 'react';
import { getCards } from '../core/cardStore';
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

  return { cards, refreshCards };
}
