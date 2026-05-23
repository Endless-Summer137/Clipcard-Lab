export interface ClipbookSlot {
  id: string;
  slotId?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface ClipbookTemplate {
  id: string;
  templateId?: string;
  name: string;
  description?: string;
  type: 'fps' | 'landscape' | 'blank' | 'custom';
  image?: string;
  backgroundImage?: string;
  backgroundImageSource?: 'uploaded' | 'default';
  imageFileName?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  aspectRatio?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  slots: ClipbookSlot[];
  updatedAt?: number;
}

const TEMPLATE_KEY = 'clipcard_clipbook_templates';
const LEGACY_TEMPLATE_KEYS = ['clipcard.clipbookTemplates', 'clipcard-lab-clipbook-templates-v1'];

export const defaultClipbookTemplates: ClipbookTemplate[] = [
  {
    id: 'fps',
    templateId: 'fps',
    name: 'FPS 游戏风格模板',
    description: '深色背景、蓝紫/青色霓虹线条，一页可放 3 张卡片。',
    type: 'fps',
    backgroundImageSource: 'default',
    imageNaturalWidth: 1600,
    imageNaturalHeight: 900,
    aspectRatio: 16 / 9,
    orientation: 'landscape',
    updatedAt: 0,
    slots: [
      { id: 'slot-1', slotId: 'slot-1', x: 7, y: 6, w: 26, h: 31, label: '高光 1' },
      { id: 'slot-2', slotId: 'slot-2', x: 37, y: 6, w: 26, h: 31, label: '高光 2' },
      { id: 'slot-3', slotId: 'slot-3', x: 67, y: 6, w: 26, h: 31, label: '高光 3' },
    ],
  },
  {
    id: 'landscape',
    templateId: 'landscape',
    name: '风景模板',
    description: '浅绿、雾蓝、奶白，一页可放 3–4 张卡片。',
    type: 'landscape',
    backgroundImageSource: 'default',
    imageNaturalWidth: 1200,
    imageNaturalHeight: 1500,
    aspectRatio: 4 / 5,
    orientation: 'portrait',
    updatedAt: 0,
    slots: [
      { id: 'slot-1', slotId: 'slot-1', x: 8, y: 12, w: 40, h: 28, label: '灵感 1' },
      { id: 'slot-2', slotId: 'slot-2', x: 52, y: 12, w: 40, h: 28, label: '灵感 2' },
      { id: 'slot-3', slotId: 'slot-3', x: 8, y: 52, w: 40, h: 30, label: '灵感 3' },
      { id: 'slot-4', slotId: 'slot-4', x: 52, y: 52, w: 40, h: 30, label: '灵感 4' },
    ],
  },
  {
    id: 'blank',
    templateId: 'blank',
    name: '空白书模板',
    description: '米白纸张和轻微书脊感，可输入书名。',
    type: 'blank',
    backgroundImageSource: 'default',
    imageNaturalWidth: 1200,
    imageNaturalHeight: 1500,
    aspectRatio: 4 / 5,
    orientation: 'portrait',
    updatedAt: 0,
    slots: [
      { id: 'slot-1', slotId: 'slot-1', x: 8, y: 14, w: 40, h: 26, label: '页面 1' },
      { id: 'slot-2', slotId: 'slot-2', x: 52, y: 14, w: 40, h: 26, label: '页面 2' },
      { id: 'slot-3', slotId: 'slot-3', x: 8, y: 52, w: 40, h: 30, label: '页面 3' },
      { id: 'slot-4', slotId: 'slot-4', x: 52, y: 52, w: 40, h: 30, label: '页面 4' },
    ],
  },
];

const legacyDefaultSlots: Record<string, ClipbookSlot[]> = {
  fps: [
    { id: 'slot-1', x: 7, y: 6, w: 26, h: 22 },
    { id: 'slot-2', x: 37, y: 6, w: 26, h: 22 },
    { id: 'slot-3', x: 67, y: 6, w: 26, h: 22 },
  ],
  blank: [
    { id: 'slot-1', x: 9, y: 16, w: 38, h: 27 },
    { id: 'slot-2', x: 53, y: 16, w: 38, h: 27 },
    { id: 'slot-3', x: 9, y: 55, w: 38, h: 27 },
    { id: 'slot-4', x: 53, y: 55, w: 38, h: 27 },
  ],
};

function slotsMatch(a: ClipbookSlot[] = [], b: ClipbookSlot[] = []) {
  if (a.length !== b.length) return false;
  return a.every((slot, index) => {
    const expected = b[index];
    return expected &&
      getSlotId(slot) === getSlotId(expected) &&
      slot.x === expected.x &&
      slot.y === expected.y &&
      slot.w === expected.w &&
      slot.h === expected.h;
  });
}

function getTemplateId(template: Partial<ClipbookTemplate>) {
  return template.templateId ?? template.id ?? '';
}

function getSlotId(slot: Partial<ClipbookSlot>) {
  return slot.slotId ?? slot.id ?? '';
}

function normalizeSlot(slot: ClipbookSlot): ClipbookSlot {
  const slotId = getSlotId(slot);
  return {
    ...slot,
    id: slotId,
    slotId,
    x: Math.max(0, Math.min(100, slot.x)),
    y: Math.max(0, Math.min(100, slot.y)),
    w: Math.max(0, Math.min(100, slot.w)),
    h: Math.max(0, Math.min(100, slot.h)),
  };
}

function normalizeTemplate(template: ClipbookTemplate): ClipbookTemplate {
  const templateId = getTemplateId(template);
  const backgroundImage = template.backgroundImage ?? template.image;
  return {
    ...template,
    id: templateId,
    templateId,
    description: template.description ?? '',
    image: backgroundImage,
    backgroundImage,
    backgroundImageSource: backgroundImage ? 'uploaded' : (template.backgroundImageSource ?? 'default'),
    slots: template.slots.map(normalizeSlot),
    updatedAt: template.updatedAt ?? 0,
  };
}

function readStoredTemplates(): ClipbookTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    const currentTemplates = raw ? (JSON.parse(raw) as ClipbookTemplate[]).map(normalizeTemplate) : [];
    const mergedTemplates = [...currentTemplates];
    let shouldWrite = false;

    for (const legacyKey of LEGACY_TEMPLATE_KEYS) {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) continue;

      const legacyTemplates = (JSON.parse(legacyRaw) as ClipbookTemplate[]).map(normalizeTemplate);
      legacyTemplates.forEach((legacyTemplate) => {
        const existingIndex = mergedTemplates.findIndex((template) => getTemplateId(template) === getTemplateId(legacyTemplate));
        if (existingIndex >= 0) {
          mergedTemplates[existingIndex] = {
            ...legacyTemplate,
            ...mergedTemplates[existingIndex],
            image: mergedTemplates[existingIndex].image ?? legacyTemplate.image,
            imageFileName: mergedTemplates[existingIndex].imageFileName ?? legacyTemplate.imageFileName,
            imageNaturalWidth: mergedTemplates[existingIndex].imageNaturalWidth ?? legacyTemplate.imageNaturalWidth,
            imageNaturalHeight: mergedTemplates[existingIndex].imageNaturalHeight ?? legacyTemplate.imageNaturalHeight,
            aspectRatio: mergedTemplates[existingIndex].aspectRatio ?? legacyTemplate.aspectRatio,
            orientation: mergedTemplates[existingIndex].orientation ?? legacyTemplate.orientation,
          };
        } else {
          mergedTemplates.push(legacyTemplate);
        }
        shouldWrite = true;
      });
    }

    if (shouldWrite) writeTemplates(mergedTemplates);
    return mergedTemplates;
  } catch {
    return [];
  }
}

function writeTemplates(templates: ClipbookTemplate[]) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates.map(normalizeTemplate)));
}

export function getTemplates() {
  const stored = readStoredTemplates();
  return defaultClipbookTemplates.map((template) => {
    const storedTemplate = stored.find((item) => getTemplateId(item) === getTemplateId(template));
    const storedSlots = storedTemplate?.slots;
    const slots = storedSlots && !slotsMatch(storedSlots, legacyDefaultSlots[getTemplateId(template)])
      ? storedSlots
      : template.slots;

    return normalizeTemplate({
      ...template,
      ...storedTemplate,
      slots,
    });
  });
}

export function getClipbookTemplates() {
  return getTemplates();
}

export function getTemplate(templateId: string) {
  return getTemplates().find((template) => getTemplateId(template) === templateId);
}

export function saveTemplate(template: ClipbookTemplate) {
  const normalized = normalizeTemplate(template);
  const templates = getTemplates();
  const nextTemplates = templates.some((item) => getTemplateId(item) === getTemplateId(normalized))
    ? templates.map((item) => (getTemplateId(item) === getTemplateId(normalized) ? normalized : item))
    : [...templates, normalized];
  writeTemplates(nextTemplates);
  return normalized;
}

export function saveClipbookTemplate(template: ClipbookTemplate) {
  return saveTemplate(template);
}

export function updateTemplate(templateId: string, patch: Partial<ClipbookTemplate>) {
  const template = getTemplate(templateId);
  if (!template) return undefined;
  return saveTemplate({ ...template, ...patch, updatedAt: Date.now() });
}

export function updateClipbookTemplate(templateId: string, patch: Partial<ClipbookTemplate>) {
  return updateTemplate(templateId, patch);
}

export function updateClipbookSlot(templateId: string, slotId: string, patch: Partial<ClipbookSlot>) {
  const template = getTemplate(templateId);
  if (!template) return;
  return saveTemplate({
    ...template,
    slots: template.slots.map((slot) => (getSlotId(slot) === slotId ? { ...slot, ...patch } : slot)),
    updatedAt: Date.now(),
  });
}

export function resetTemplate(templateId: string) {
  const template = defaultClipbookTemplates.find((item) => getTemplateId(item) === templateId);
  if (!template) return undefined;
  return saveTemplate({ ...template, updatedAt: Date.now() });
}
