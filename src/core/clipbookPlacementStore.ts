export interface ClipbookPlacement {
  templateId: string;
  slotId: string;
  cardId: string;
}

const PLACEMENT_KEY = 'clipcard.clipbookPlacements';
const LEGACY_PLACEMENT_KEYS = ['clipcard-lab-clipbook-placements-v1'];

function readPlacements(): ClipbookPlacement[] {
  try {
    const raw = localStorage.getItem(PLACEMENT_KEY);
    const currentPlacements = raw ? (JSON.parse(raw) as ClipbookPlacement[]) : [];
    const mergedPlacements = [...currentPlacements];

    for (const legacyKey of LEGACY_PLACEMENT_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw) {
        const legacyPlacements = JSON.parse(legacyRaw) as ClipbookPlacement[];
        legacyPlacements.forEach((legacyPlacement) => {
          const hasSlot = mergedPlacements.some(
            (placement) => placement.templateId === legacyPlacement.templateId && placement.slotId === legacyPlacement.slotId,
          );
          if (!hasSlot) mergedPlacements.push(legacyPlacement);
        });
      }
    }

    if (mergedPlacements.length !== currentPlacements.length) writePlacements(mergedPlacements);
    return mergedPlacements;
  } catch {
    return [];
  }
}

function writePlacements(placements: ClipbookPlacement[]) {
  localStorage.setItem(PLACEMENT_KEY, JSON.stringify(placements));
}

export function getClipbookPlacements(templateId?: string) {
  const placements = readPlacements();
  return templateId ? placements.filter((item) => item.templateId === templateId) : placements;
}

export function setClipbookPlacement(placement: ClipbookPlacement) {
  const next = readPlacements().filter(
    (item) => !(item.templateId === placement.templateId && item.slotId === placement.slotId),
  );
  writePlacements([placement, ...next]);
}

export function removeClipbookPlacement(templateId: string, slotId: string) {
  writePlacements(readPlacements().filter((item) => !(item.templateId === templateId && item.slotId === slotId)));
}

export function removeClipbookPlacementsByCardId(cardId: string) {
  writePlacements(readPlacements().filter((item) => item.cardId !== cardId));
}
