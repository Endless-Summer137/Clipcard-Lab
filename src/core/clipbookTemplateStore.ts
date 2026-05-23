export interface ClipbookSlot {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface ClipbookTemplate {
  id: string;
  name: string;
  type: 'fps' | 'landscape' | 'blank' | 'custom';
  image?: string;
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  aspectRatio?: number;
  orientation?: 'landscape' | 'portrait' | 'square';
  slots: ClipbookSlot[];
}

const TEMPLATE_KEY = 'clipcard-lab-clipbook-templates-v1';

export const defaultClipbookTemplates: ClipbookTemplate[] = [
  {
    id: 'fps',
    name: 'FPS 游戏风格模板',
    type: 'fps',
    imageNaturalWidth: 1600,
    imageNaturalHeight: 900,
    aspectRatio: 16 / 9,
    orientation: 'landscape',
    slots: [
      { id: 'slot-1', x: 7, y: 6, w: 26, h: 22, label: '高光 1' },
      { id: 'slot-2', x: 37, y: 6, w: 26, h: 22, label: '高光 2' },
      { id: 'slot-3', x: 67, y: 6, w: 26, h: 22, label: '高光 3' },
    ],
  },
  {
    id: 'landscape',
    name: '风景模板',
    type: 'landscape',
    imageNaturalWidth: 1200,
    imageNaturalHeight: 1500,
    aspectRatio: 4 / 5,
    orientation: 'portrait',
    slots: [
      { id: 'slot-1', x: 8, y: 12, w: 40, h: 28, label: '灵感 1' },
      { id: 'slot-2', x: 52, y: 12, w: 40, h: 28, label: '灵感 2' },
      { id: 'slot-3', x: 8, y: 52, w: 40, h: 30, label: '灵感 3' },
      { id: 'slot-4', x: 52, y: 52, w: 40, h: 30, label: '灵感 4' },
    ],
  },
  {
    id: 'blank',
    name: '空白书模板',
    type: 'blank',
    imageNaturalWidth: 1200,
    imageNaturalHeight: 1500,
    aspectRatio: 4 / 5,
    orientation: 'portrait',
    slots: [
      { id: 'slot-1', x: 9, y: 16, w: 38, h: 27, label: '页面 1' },
      { id: 'slot-2', x: 53, y: 16, w: 38, h: 27, label: '页面 2' },
      { id: 'slot-3', x: 9, y: 55, w: 38, h: 27, label: '页面 3' },
      { id: 'slot-4', x: 53, y: 55, w: 38, h: 27, label: '页面 4' },
    ],
  },
];

function readStoredTemplates(): ClipbookTemplate[] {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    return raw ? (JSON.parse(raw) as ClipbookTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeTemplates(templates: ClipbookTemplate[]) {
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(templates));
}

export function getClipbookTemplates() {
  const stored = readStoredTemplates();
  return defaultClipbookTemplates.map((template) => ({
    ...template,
    ...stored.find((item) => item.id === template.id),
    slots: stored.find((item) => item.id === template.id)?.slots ?? template.slots,
  }));
}

export function saveClipbookTemplate(template: ClipbookTemplate) {
  const templates = getClipbookTemplates().map((item) => (item.id === template.id ? template : item));
  writeTemplates(templates);
}

export function updateClipbookTemplate(templateId: string, patch: Partial<ClipbookTemplate>) {
  const template = getClipbookTemplates().find((item) => item.id === templateId);
  if (!template) return;
  saveClipbookTemplate({ ...template, ...patch });
}

export function updateClipbookSlot(templateId: string, slotId: string, patch: Partial<ClipbookSlot>) {
  const template = getClipbookTemplates().find((item) => item.id === templateId);
  if (!template) return;
  saveClipbookTemplate({
    ...template,
    slots: template.slots.map((slot) => (slot.id === slotId ? { ...slot, ...patch } : slot)),
  });
}
