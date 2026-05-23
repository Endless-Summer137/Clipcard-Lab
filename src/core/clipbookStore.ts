export interface ClipbookSlotPlacement {
  slotId: string;
  cardId: string | null;
}

export interface Clipbook {
  clipbookId: string;
  title: string;
  templateId: string;
  templateName: string;
  coverImage?: string;
  slots: ClipbookSlotPlacement[];
  createdAt: number;
  updatedAt: number;
}

type ClipbookInput = Pick<Clipbook, 'title' | 'templateId' | 'templateName' | 'slots'> & Partial<Pick<Clipbook, 'coverImage'>>;

const CLIPBOOK_STORE_KEY = 'clipcard_clipbooks';

function createId() {
  return `clipbook_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeSlot(slot: ClipbookSlotPlacement): ClipbookSlotPlacement {
  return {
    slotId: slot.slotId,
    cardId: slot.cardId ?? null,
  };
}

function normalizeClipbook(clipbook: Clipbook): Clipbook {
  const now = Date.now();
  return {
    ...clipbook,
    clipbookId: clipbook.clipbookId || createId(),
    title: clipbook.title?.trim() || '未命名手账',
    templateId: clipbook.templateId || 'fps',
    templateName: clipbook.templateName || 'FPS 高光册',
    slots: Array.isArray(clipbook.slots) ? clipbook.slots.map(normalizeSlot) : [],
    createdAt: clipbook.createdAt || now,
    updatedAt: clipbook.updatedAt || clipbook.createdAt || now,
  };
}

function readClipbooks(): Clipbook[] {
  try {
    const raw = localStorage.getItem(CLIPBOOK_STORE_KEY);
    return raw ? (JSON.parse(raw) as Clipbook[]).map(normalizeClipbook) : [];
  } catch {
    return [];
  }
}

function writeClipbooks(clipbooks: Clipbook[]) {
  localStorage.setItem(CLIPBOOK_STORE_KEY, JSON.stringify(clipbooks.map(normalizeClipbook)));
}

export function createClipbook(input: ClipbookInput) {
  const now = Date.now();
  const clipbook = normalizeClipbook({
    ...input,
    clipbookId: createId(),
    createdAt: now,
    updatedAt: now,
  });
  saveClipbook(clipbook);
  return clipbook;
}

export function saveClipbook(clipbook: Clipbook) {
  const normalized = normalizeClipbook({ ...clipbook, updatedAt: clipbook.updatedAt || Date.now() });
  const nextClipbooks = [
    normalized,
    ...readClipbooks().filter((item) => item.clipbookId !== normalized.clipbookId),
  ];
  writeClipbooks(nextClipbooks);
  return normalized;
}

export function getClipbooks() {
  return readClipbooks();
}

export function getClipbookById(clipbookId: string) {
  return readClipbooks().find((clipbook) => clipbook.clipbookId === clipbookId);
}

export function updateClipbook(clipbookId: string, patch: Partial<Clipbook>) {
  const clipbooks = readClipbooks();
  const existing = clipbooks.find((clipbook) => clipbook.clipbookId === clipbookId);
  if (!existing) return undefined;

  const updated = normalizeClipbook({
    ...existing,
    ...patch,
    clipbookId,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  });
  writeClipbooks([updated, ...clipbooks.filter((clipbook) => clipbook.clipbookId !== clipbookId)]);
  return updated;
}

export function deleteClipbook(clipbookId: string) {
  writeClipbooks(readClipbooks().filter((clipbook) => clipbook.clipbookId !== clipbookId));
}

export function removeCardFromClipbooks(cardId: string) {
  const clipbooks = readClipbooks();
  let changed = false;
  const nextClipbooks = clipbooks.map((clipbook) => {
    let clipbookChanged = false;
    const slots = clipbook.slots.map((slot) => {
      if (slot.cardId !== cardId) return slot;
      changed = true;
      clipbookChanged = true;
      return { ...slot, cardId: null };
    });

    return clipbookChanged ? { ...clipbook, slots, updatedAt: Date.now() } : clipbook;
  });

  if (changed) writeClipbooks(nextClipbooks);
}
