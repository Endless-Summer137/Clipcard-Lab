import { X } from 'lucide-react';
import type { ChangeEvent, MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import type { SegmentCard } from '../core/types';
import type { ClipbookSlot, ClipbookTemplate } from '../core/clipbookTemplateStore';
import { getTemplates, updateClipbookSlot, updateTemplate } from '../core/clipbookTemplateStore';
import {
  getClipbookPlacements,
  removeClipbookPlacement,
  setClipbookPlacement,
} from '../core/clipbookPlacementStore';
import { useClipCards } from '../hooks/useClipCards';
import { CardDetailView, CardThumbnail } from './CardDetailView';
import { UserSubPageShell } from './UserSubPageShell';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook' | 'dresser';

interface SimplePageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

interface ClipbookPageProps extends SimplePageProps {
  devMode?: boolean;
}

export function MyCardsPage({ onNavigate }: SimplePageProps) {
  const [selectedCard, setSelectedCard] = useState<SegmentCard | null>(null);
  const { cards, refreshCards } = useClipCards();

  return (
    <UserSubPageShell title="我的卡片" onBack={() => onNavigate('profile', { dev: false })} contentClassName="mt-5">
      <section>
        {cards.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 pb-5">
            {cards.map((card) => <CardThumbnail key={card.cardId} card={card} onClick={() => setSelectedCard(card)} />)}
          </div>
        ) : (
          <div className="mt-24 rounded-3xl bg-[#f3f0e7] px-5 py-9 text-center text-sm leading-6 text-stone-500 shadow-sm shadow-stone-200">
            刷视频时点击“保存这一刻”，片段卡会出现在这里。
          </div>
        )}
      </section>

      {selectedCard ? (
        <CardDetailView
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onDeleted={refreshCards}
        />
      ) : null}
    </UserSubPageShell>
  );
}

export function ClipbookPage({ onNavigate, devMode = false }: ClipbookPageProps) {
  const { cards, refreshCards } = useClipCards();
  const [templates, setTemplates] = useState<ClipbookTemplate[]>(() => getTemplates());
  const [selectedTemplateId, setSelectedTemplateId] = useState('fps');
  const [placements, setPlacements] = useState(() => getClipbookPlacements('fps'));
  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState('我的空白书');
  const [feedback, setFeedback] = useState('');
  const [templateFeedback, setTemplateFeedback] = useState('');
  const [templateError, setTemplateError] = useState('');

  const selectedTemplate = templates.find((item) => getTemplateId(item) === selectedTemplateId) ?? templates[0];
  const placedCardIds = new Set(placements.map((item) => item.cardId));

  function selectTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    setPlacements(getClipbookPlacements(templateId));
    setSelectingSlotId(null);
    setFeedback('');
    setTemplateFeedback('');
    setTemplateError('');
    refreshCards();
  }

  function placeCard(card: SegmentCard) {
    if (!selectingSlotId || placedCardIds.has(card.cardId)) return;
    setClipbookPlacement({ templateId: selectedTemplateId, slotId: selectingSlotId, cardId: card.cardId });
    setPlacements(getClipbookPlacements(selectedTemplateId));
    refreshCards();
    setSelectingSlotId(null);
    setFeedback('已放入槽位。');
  }

  function clearSlot(slotId: string) {
    removeClipbookPlacement(selectedTemplateId, slotId);
    setPlacements(getClipbookPlacements(selectedTemplateId));
    refreshCards();
  }

  function openSlotPicker(slotId: string) {
    refreshCards();
    setSelectingSlotId(slotId);
  }

  function getCardInSlot(slotId: string) {
    const placement = placements.find((item) => item.slotId === slotId);
    return placement ? cards.find((card) => card.cardId === placement.cardId) ?? null : null;
  }

  async function onTemplateImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const targetTemplateId = selectedTemplateId;
    setTemplateFeedback('');
    setTemplateError('');

    try {
      const imageMeta = await readTemplateImage(file);
      const updatedTemplate = updateTemplate(targetTemplateId, imageMeta);
      setTemplates(getTemplates());
      if (!updatedTemplate) throw new Error('没有找到当前模板，请重新选择模板后再上传。');
      setTemplateFeedback('模板图已保存，已应用到当前手账预览。');
    } catch (error) {
      const message = error instanceof Error ? error.message : '模板图保存失败，请尝试更小的图片。';
      setTemplateError(message);
    } finally {
      event.target.value = '';
    }
  }

  function updateSlot(slot: ClipbookSlot, key: 'x' | 'y' | 'w' | 'h', value: number) {
    const safeValue = Math.max(0, Math.min(100, value));
    updateClipbookSlot(selectedTemplateId, getSlotId(slot), { [key]: safeValue });
    setTemplates(getTemplates());
  }

  function updateTemplateImageSize(imageNaturalWidth: number, imageNaturalHeight: number) {
    if (
      selectedTemplate.imageNaturalWidth === imageNaturalWidth &&
      selectedTemplate.imageNaturalHeight === imageNaturalHeight
    ) {
      return;
    }

    const patch = {
      imageNaturalWidth,
      imageNaturalHeight,
      aspectRatio: imageNaturalWidth / imageNaturalHeight,
      orientation: getTemplateOrientation(imageNaturalWidth, imageNaturalHeight),
    };
    updateTemplate(selectedTemplateId, patch);
    setTemplates(getTemplates());
  }

  return (
    <UserSubPageShell
      title="卡片手账"
      subtitle="把保存的片段卡放进模板，生成可分享的卡片手账。"
      onBack={() => onNavigate('profile', { dev: false })}
    >
      <section className="grid gap-2.5">
        {templates.map((template) => (
          <button
            key={getTemplateId(template)}
            type="button"
            onClick={() => selectTemplate(getTemplateId(template))}
            className={[
              'rounded-2xl border px-3 py-3 text-left shadow-sm transition',
              selectedTemplateId === getTemplateId(template) ? 'border-emerald-300 bg-white shadow-emerald-100' : 'border-white/70 bg-white/70 shadow-stone-200',
            ].join(' ')}
          >
            <h2 className="font-semibold">{template.name}</h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">{getTemplateDescription(template)}</p>
          </button>
        ))}
      </section>

      {devMode ? (
        <section className="rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
          <h2 className="font-semibold">模板配置</h2>
          <label className="mt-3 block text-sm text-stone-600">
            上传模板图
            <input type="file" accept="image/png,image/jpeg,image/webp" onChange={onTemplateImageUpload} className="mt-2 block w-full text-sm" />
          </label>
          <p className="mt-2 text-xs text-stone-500">
            {getTemplateBackgroundImage(selectedTemplate) ? `已上传：${selectedTemplate.imageFileName ?? '自定义模板图'}` : `${selectedTemplate.name} 暂未上传模板图，正在使用内置占位背景。`}
          </p>
          {templateFeedback ? <p className="mt-2 text-xs font-medium text-emerald-700">{templateFeedback}</p> : null}
          {templateError ? <p className="mt-2 text-xs font-medium text-red-600">{templateError}</p> : null}
          <div className="mt-4 grid gap-3">
            {selectedTemplate.slots.map((slot) => (
              <div key={getSlotId(slot)} className="rounded-2xl bg-stone-50 p-3">
                <p className="text-sm font-medium">{slot.label ?? getSlotId(slot)}</p>
                <div className="mt-2 grid grid-cols-4 gap-2 text-xs">
                  {(['x', 'y', 'w', 'h'] as const).map((key) => (
                    <label key={key} className="text-stone-500">
                      {key}
                      <input
                        type="number"
                        value={slot[key]}
                        onChange={(event) => updateSlot(slot, key, Number(event.target.value))}
                        className="mt-1 w-full rounded-md border border-stone-200 bg-white px-2 py-1 text-stone-800 outline-none"
                      />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">当前手账</h2>
          {selectedTemplate.type === 'blank' ? (
            <input
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value)}
              className="w-32 rounded-full bg-stone-100 px-3 py-1.5 text-sm outline-none"
              aria-label="书名"
            />
          ) : null}
        </div>
        <p className="mt-2 text-sm font-medium text-stone-700">
          当前手账：{selectedTemplate.type === 'blank' ? bookTitle : selectedTemplate.name}
        </p>
        <p className="mt-1 text-xs text-stone-500">
          {getTemplateBackgroundImage(selectedTemplate) ? `已上传：${selectedTemplate.imageFileName ?? '自定义模板图'}` : `${selectedTemplate.name} 待上传 / 使用内置占位背景`}
        </p>
        <TemplateCanvas
          key={selectedTemplateId}
          template={selectedTemplate}
          cards={cards}
          getCardInSlot={getCardInSlot}
          onSlotClick={openSlotPicker}
          onClearSlot={clearSlot}
          onImageMeasure={updateTemplateImageSize}
        />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setFeedback('分享手账功能已预留。')} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
            分享手账
          </button>
          <button type="button" onClick={() => setFeedback('一键发布为视频功能已预留。')} className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
            一键发布为视频
          </button>
        </div>
        {feedback ? <p className="mt-3 text-sm text-emerald-700">{feedback}</p> : null}
      </section>

      {selectingSlotId ? (
        <CardPickerModal
          placedCardIds={placedCardIds}
          devMode={devMode}
          templateId={selectedTemplateId}
          selectedSlotId={selectingSlotId}
          onClose={() => setSelectingSlotId(null)}
          onSelect={placeCard}
        />
      ) : null}
    </UserSubPageShell>
  );
}

function TemplateCanvas({
  template,
  cards,
  getCardInSlot,
  onSlotClick,
  onClearSlot,
  onImageMeasure,
}: {
  template: ClipbookTemplate;
  cards: SegmentCard[];
  getCardInSlot: (slotId: string) => SegmentCard | null;
  onSlotClick: (slotId: string) => void;
  onClearSlot: (slotId: string) => void;
  onImageMeasure: (width: number, height: number) => void;
}) {
  const canvasRatio = getTemplateAspectRatio(template);
  const backgroundImage = getTemplateBackgroundImage(template);

  return (
    <div className="mt-4 overflow-x-auto rounded-[24px] border border-stone-100 bg-[#f8f4e9] p-2 shadow-inner">
      <div
        className="relative mx-auto w-full min-w-[280px] overflow-hidden rounded-[18px] bg-white"
        style={{ aspectRatio: canvasRatio }}
      >
        {backgroundImage ? (
          <img
            src={backgroundImage}
            alt=""
            onLoad={(event) => onImageMeasure(event.currentTarget.naturalWidth || 1, event.currentTarget.naturalHeight || 1)}
            className="absolute inset-0 h-full w-full object-contain"
          />
        ) : <BuiltInTemplateBackground template={template} />}
        {template.slots.map((slot) => {
          const card = getCardInSlot(getSlotId(slot));
          return (
            <div
              key={getSlotId(slot)}
              onClick={() => onSlotClick(getSlotId(slot))}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSlotClick(getSlotId(slot));
                }
              }}
              role="button"
              tabIndex={0}
              className="group absolute rounded-2xl border-2 border-dashed border-white/85 bg-white/24 p-1 shadow-sm backdrop-blur-[1px] transition hover:border-emerald-300 hover:bg-emerald-50/55 active:border-emerald-300 active:bg-emerald-50/55"
              style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
            >
              {card ? (
                <SlotCard card={card} onClear={(event) => { event.stopPropagation(); onClearSlot(getSlotId(slot)); }} />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl font-light text-white drop-shadow group-hover:text-emerald-700 group-active:text-emerald-700">+</span>
              )}
            </div>
          );
        })}
        {cards.length === 0 ? <p className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/80 px-4 py-3 text-center text-xs text-stone-500">先在视频里保存一张卡片，再放入槽位。</p> : null}
      </div>
    </div>
  );
}

function BuiltInTemplateBackground({ template }: { template: ClipbookTemplate }) {
  if (template.type === 'fps') {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(135deg,#111827,#1e1b4b_56%,#083344)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.12)_1px,transparent_1px)] bg-[size:28px_28px]" />
        <div className="absolute bottom-8 right-8 h-24 w-24 rounded-full border border-cyan-300/30" />
      </div>
    );
  }

  if (template.type === 'landscape') {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_80%,#bbf7d0_0_18%,transparent_19%),radial-gradient(circle_at_75%_78%,#bfdbfe_0_18%,transparent_19%),linear-gradient(#dff3f7,#fffaf0)]" />;
  }

  return <div className="absolute inset-0 border-l-[18px] border-stone-200 bg-[#fffaf0]" />;
}

function SlotCard({ card, onClear }: { card: SegmentCard; onClear: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="relative h-full">
      <CardThumbnail card={card} className="h-full w-full rounded-xl" />
      <button type="button" onClick={onClear} aria-label="移除卡片" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-xs text-white">
        ×
      </button>
    </div>
  );
}

function CardPickerModal({
  placedCardIds,
  devMode = false,
  templateId,
  selectedSlotId,
  onClose,
  onSelect,
}: {
  placedCardIds: Set<string>;
  devMode?: boolean;
  templateId: string;
  selectedSlotId: string;
  onClose: () => void;
  onSelect: (card: SegmentCard) => void;
}) {
  const { cards, refreshCards } = useClipCards();

  useEffect(() => {
    refreshCards();
  }, [refreshCards, selectedSlotId, templateId]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-stone-900/35 px-4 backdrop-blur-sm">
      <section className="relative z-10 flex h-[72vh] w-full max-w-[430px] flex-col rounded-t-[30px] bg-[#fffdf7] p-4 text-stone-900 shadow-2xl">
        <header className="flex shrink-0 items-center justify-between">
          <h2 className="text-lg font-semibold">选择卡片</h2>
          <button type="button" onClick={onClose} aria-label="退出选择" className="rounded-full bg-stone-100 p-2">
            <X className="h-5 w-5" />
          </button>
        </header>
        {cards.length > 0 ? (
          <div className="mt-4 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-y-auto pb-4 min-[390px]:grid-cols-3">
            {cards.map((card) => {
              const placed = placedCardIds.has(card.cardId);
              return (
                <div key={card.cardId} className="relative block min-h-[120px] w-full">
                  <div className={placed ? 'pointer-events-none grayscale opacity-45' : 'opacity-100'}>
                    <CardThumbnail
                      card={card}
                      onClick={() => onSelect(card)}
                      className="aspect-[3/4] min-h-[120px] w-full opacity-100"
                    />
                  </div>
                  {placed ? (
                    <span className="pointer-events-none absolute inset-x-1 top-1/2 -rotate-12 rounded-full bg-stone-900/75 py-1 text-center text-xs font-semibold text-white">
                      已放置
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-8 rounded-2xl bg-stone-100 px-4 py-6 text-center text-sm leading-6 text-stone-500">
            还没有可放入手账的卡片。先在视频里点击“保存这一刻”生成卡片。
          </p>
        )}
        {devMode ? (
          <div className="mt-2 rounded-2xl bg-stone-100 px-3 py-2 text-xs leading-5 text-stone-500">
            <p>当前 cardStore 卡片数量：{cards.length}</p>
            <p>当前 templateId：{templateId}</p>
            <p>当前 selectedSlotId：{selectedSlotId}</p>
            <p>当前已放置 cardIds：{Array.from(placedCardIds).join(', ') || '无'}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function getTemplateDescription(template: ClipbookTemplate) {
  if (template.description) return template.description;
  if (template.type === 'fps') return '深色背景、蓝紫/青色霓虹线条，一页可放 3 张卡片。';
  if (template.type === 'landscape') return '浅绿、雾蓝、奶白，一页可放 3–4 张卡片。';
  return '米白纸张和轻微书脊感，可输入书名。';
}

function getTemplateId(template: ClipbookTemplate) {
  return template.templateId ?? template.id;
}

function getSlotId(slot: ClipbookSlot) {
  return slot.slotId ?? slot.id;
}

function getTemplateBackgroundImage(template: ClipbookTemplate) {
  return template.backgroundImage ?? template.image;
}

function getTemplateAspectRatio(template: ClipbookTemplate) {
  if (template.imageNaturalWidth && template.imageNaturalHeight) {
    return `${template.imageNaturalWidth} / ${template.imageNaturalHeight}`;
  }

  if (template.aspectRatio) return String(template.aspectRatio);
  return template.type === 'fps' ? '16 / 9' : '4 / 5';
}

function getTemplateOrientation(width: number, height: number): ClipbookTemplate['orientation'] {
  if (Math.abs(width - height) <= 1) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

function readTemplateImage(file: File) {
  return new Promise<Pick<ClipbookTemplate, 'image' | 'backgroundImage' | 'backgroundImageSource' | 'imageFileName' | 'imageNaturalWidth' | 'imageNaturalHeight' | 'aspectRatio' | 'orientation'>>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const image = String(reader.result || '');
      const preview = new Image();
      preview.onload = () => {
        const imageNaturalWidth = preview.naturalWidth || 1;
        const imageNaturalHeight = preview.naturalHeight || 1;
        const maxWidth = 1600;
        const scale = Math.min(1, maxWidth / imageNaturalWidth);
        const canvasWidth = Math.max(1, Math.round(imageNaturalWidth * scale));
        const canvasHeight = Math.max(1, Math.round(imageNaturalHeight * scale));
        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const context = canvas.getContext('2d');
        if (!context) {
          reject(new Error('模板图压缩失败，请重新选择图片。'));
          return;
        }

        context.drawImage(preview, 0, 0, canvasWidth, canvasHeight);
        const compressedImage = canvas.toDataURL('image/webp', 0.85);
        resolve({
          image: compressedImage,
          backgroundImage: compressedImage,
          backgroundImageSource: 'uploaded',
          imageFileName: file.name,
          imageNaturalWidth,
          imageNaturalHeight,
          aspectRatio: imageNaturalWidth / imageNaturalHeight,
          orientation: getTemplateOrientation(imageNaturalWidth, imageNaturalHeight),
        });
      };
      preview.onerror = () => reject(new Error('模板图尺寸读取失败，请重新选择文件。'));
      preview.src = image;
    };
    reader.onerror = () => reject(new Error('模板图读取失败，请重新选择文件。'));
    reader.readAsDataURL(file);
  });
}
