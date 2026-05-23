export interface ClipbookPlacement {
  templateId: string;
  slotId: string;
  cardId: string;
}

const PLACEMENT_KEY = 'clipcard-lab-clipbook-placements-v1';

function readPlacements(): ClipbookPlacement[] {
  try {
    const raw = localStorage.getItem(PLACEMENT_KEY);
    return raw ? (JSON.parse(raw) as ClipbookPlacement[]) : [];
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
