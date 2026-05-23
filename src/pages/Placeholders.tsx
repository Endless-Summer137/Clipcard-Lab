import { X } from 'lucide-react';
import type { ChangeEvent, MouseEvent } from 'react';
import { useEffect, useState } from 'react';
import type { SegmentCard } from '../core/types';
import type { Clipbook, ClipbookSlotPlacement } from '../core/clipbookStore';
import {
  createClipbook,
  getClipbooks,
  updateClipbook,
} from '../core/clipbookStore';
import type { ClipbookSlot, ClipbookTemplate } from '../core/clipbookTemplateStore';
import { getTemplates, updateClipbookSlot, updateTemplate } from '../core/clipbookTemplateStore';
import { useClipCards } from '../hooks/useClipCards';
import { CardDetailView, CardThumbnail, getSourceLine, getSourceVideoUrl } from './CardDetailView';
import { UserSubPageShell } from './UserSubPageShell';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook' | 'dresser';
type TemplateId = 'fps' | 'landscape' | 'blank';

const SOURCE_BACKFLOW_HINT = '发布手账时会自动标注原作者和原视频，帮助来源视频获得回流。';

interface SimplePageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean; template?: TemplateId }) => void;
}

interface ClipbookPageProps extends SimplePageProps {
  devMode?: boolean;
  templateId?: TemplateId;
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
            参与活动时点击活动胶囊，生成的片段卡会出现在这里。
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

export function ClipbookPage({ onNavigate, devMode = false, templateId }: ClipbookPageProps) {
  const { cards, refreshCards } = useClipCards();
  const [templates, setTemplates] = useState<ClipbookTemplate[]>(() => getTemplates());
  const [clipbooks, setClipbooks] = useState<Clipbook[]>(() => getClipbooks());
  const [selectedTemplateId, setSelectedTemplateId] = useState<TemplateId>(templateId ?? 'fps');
  const [mode, setMode] = useState<'home' | 'edit' | 'detail'>(() => (templateId || devMode ? 'edit' : 'home'));
  const [editingClipbookId, setEditingClipbookId] = useState<string | null>(null);
  const [viewingClipbookId, setViewingClipbookId] = useState<string | null>(null);
  const [draftSlots, setDraftSlots] = useState<ClipbookSlotPlacement[]>(() => buildDraftSlots(getTemplates().find((item) => getTemplateId(item) === (templateId ?? 'fps')) ?? getTemplates()[0]));
  const [selectingSlotId, setSelectingSlotId] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState(getDefaultClipbookTitle(templateId ?? 'fps'));
  const [feedback, setFeedback] = useState('');
  const [homeFeedback, setHomeFeedback] = useState('');
  const [templateFeedback, setTemplateFeedback] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [publishPreview, setPublishPreview] = useState<{ title: string; sourceCards: SegmentCard[] } | null>(null);

  const selectedTemplate = templates.find((item) => getTemplateId(item) === selectedTemplateId) ?? templates[0];
  const viewingClipbook = viewingClipbookId ? clipbooks.find((clipbook) => clipbook.clipbookId === viewingClipbookId) ?? null : null;
  const placedCardIds = new Set(draftSlots.map((slot) => slot.cardId).filter(Boolean) as string[]);

  useEffect(() => {
    if (templateId) {
      startNewClipbook(templateId);
      return;
    }

    if (!devMode) {
      setMode('home');
      setEditingClipbookId(null);
      setViewingClipbookId(null);
      setSelectingSlotId(null);
    }
  }, [devMode, templateId]);

  function selectTemplate(templateId: string) {
    const nextTemplateId = normalizeTemplateId(templateId);
    const nextTemplate = templates.find((item) => getTemplateId(item) === nextTemplateId) ?? selectedTemplate;
    setSelectedTemplateId(nextTemplateId);
    setDraftSlots(buildDraftSlots(nextTemplate));
    setBookTitle(getDefaultClipbookTitle(nextTemplateId));
    setEditingClipbookId(null);
    setViewingClipbookId(null);
    setMode('edit');
    setSelectingSlotId(null);
    setFeedback('');
    setHomeFeedback('');
    setTemplateFeedback('');
    setTemplateError('');
    setPublishPreview(null);
    refreshCards();
  }

  function startNewClipbook(templateId: string) {
    selectTemplate(templateId);
  }

  function openClipbookDetail(clipbook: Clipbook) {
    setViewingClipbookId(clipbook.clipbookId);
    setMode('detail');
    setFeedback('');
    setHomeFeedback('');
    setPublishPreview(null);
    refreshCards();
  }

  function editClipbook(clipbook: Clipbook) {
    const nextTemplateId = normalizeTemplateId(clipbook.templateId);
    const nextTemplate = templates.find((item) => getTemplateId(item) === nextTemplateId) ?? selectedTemplate;
    setSelectedTemplateId(nextTemplateId);
    setDraftSlots(buildDraftSlots(nextTemplate, clipbook));
    setBookTitle(clipbook.title || getDefaultClipbookTitle(nextTemplateId));
    setEditingClipbookId(clipbook.clipbookId);
    setViewingClipbookId(null);
    setMode('edit');
    setSelectingSlotId(null);
    setFeedback('');
    setPublishPreview(null);
    refreshCards();
  }

  function returnToHome(message?: string) {
    setClipbooks(getClipbooks());
    setMode('home');
    setEditingClipbookId(null);
    setViewingClipbookId(null);
    setSelectingSlotId(null);
    setFeedback('');
    setPublishPreview(null);
    setHomeFeedback(message ?? '');
  }

  function placeCard(card: SegmentCard) {
    if (!selectingSlotId || placedCardIds.has(card.cardId)) return;
    setDraftSlots((current) => current.map((slot) => (
      slot.slotId === selectingSlotId ? { ...slot, cardId: card.cardId } : slot
    )));
    refreshCards();
    setSelectingSlotId(null);
    setFeedback('已放入槽位。');
  }

  function clearSlot(slotId: string) {
    setDraftSlots((current) => current.map((slot) => (
      slot.slotId === slotId ? { ...slot, cardId: null } : slot
    )));
    refreshCards();
  }

  function openSlotPicker(slotId: string) {
    refreshCards();
    setSelectingSlotId(slotId);
  }

  function getCardInSlot(slotId: string) {
    const placement = draftSlots.find((item) => item.slotId === slotId);
    return placement?.cardId ? cards.find((card) => card.cardId === placement.cardId) ?? null : null;
  }

  function getClipbookCardInSlot(clipbook: Clipbook, slotId: string) {
    const placement = clipbook.slots.find((item) => item.slotId === slotId);
    return placement?.cardId ? cards.find((card) => card.cardId === placement.cardId) ?? null : null;
  }

  function saveCurrentClipbook() {
    const title = bookTitle.trim() || getDefaultClipbookTitle(selectedTemplateId);
    const payload = {
      title,
      templateId: selectedTemplateId,
      templateName: getTemplateDisplayName(selectedTemplate),
      coverImage: getClipbookCoverImage(selectedTemplate, draftSlots, cards),
      slots: draftSlots,
    };

    const savedClipbook = editingClipbookId
      ? updateClipbook(editingClipbookId, payload)
      : createClipbook(payload);

    setClipbooks(getClipbooks());
    setBookTitle(savedClipbook?.title ?? title);
    if (templateId) onNavigate('clipbook', { dev: devMode });
    returnToHome('手账已保存');
  }

  function openPublishPreview(title: string, sourceCards: SegmentCard[]) {
    setFeedback('');
    setPublishPreview({
      title: title.trim() || '我的活动手账',
      sourceCards,
    });
  }

  function confirmPublishPreview() {
    setPublishPreview(null);
    setFeedback('已生成发布预览，来源信息将随视频简介展示。');
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

  if (mode === 'home') {
    return (
      <UserSubPageShell
        title="卡片手账"
        subtitle="把活动中收集的片段卡整理成你的主题手账"
        onBack={() => onNavigate('profile', { dev: false })}
      >
        <ClipbookHome
          clipbooks={clipbooks}
          templates={templates}
          cards={cards}
          feedback={homeFeedback}
          onOpenClipbook={openClipbookDetail}
          onCreateDefault={() => startNewClipbook('fps')}
          onSelectTemplate={(id) => startNewClipbook(id)}
        />
      </UserSubPageShell>
    );
  }

  if (mode === 'detail' && viewingClipbook) {
    const detailTemplate = templates.find((item) => getTemplateId(item) === normalizeTemplateId(viewingClipbook.templateId)) ?? selectedTemplate;
    const detailSourceCards = getCardsFromSlotPlacements(viewingClipbook.slots, cards);

    return (
      <UserSubPageShell
        title={viewingClipbook.title}
        subtitle={viewingClipbook.templateName}
        onBack={() => returnToHome()}
      >
        <section className="rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
          <p className="text-xs font-medium text-stone-500">手账预览</p>
          <TemplateCanvas
            template={detailTemplate}
            cards={cards}
            getCardInSlot={(slotId) => getClipbookCardInSlot(viewingClipbook, slotId)}
            onSlotClick={() => undefined}
            onClearSlot={() => undefined}
            onImageMeasure={() => undefined}
            readOnly
            emptyMessage="这本手账还没有放入卡片。"
          />
        </section>

        <SourceVideoList sourceCards={detailSourceCards} onOpenSource={() => setFeedback('跳转原视频。')} />

        <section className="grid gap-3">
          <button type="button" onClick={() => setFeedback('已生成图片，后续可接入系统相册保存。')} className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white">
            保存到相册
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setFeedback('分享手账功能已预留。')} className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm shadow-stone-200">
              分享
            </button>
            <button type="button" onClick={() => openPublishPreview(viewingClipbook.title, detailSourceCards)} className="rounded-full bg-emerald-100 px-4 py-2.5 text-sm font-medium text-emerald-800">
              一键发布为视频
            </button>
          </div>
          <button type="button" onClick={() => editClipbook(viewingClipbook)} className="rounded-full bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-800">
            继续编辑
          </button>
          {feedback ? <p className="text-center text-sm text-emerald-700">{feedback}</p> : null}
        </section>
        {publishPreview ? (
          <PublishPreviewModal
            title={publishPreview.title}
            sourceCards={publishPreview.sourceCards}
            onCancel={() => setPublishPreview(null)}
            onConfirm={confirmPublishPreview}
          />
        ) : null}
      </UserSubPageShell>
    );
  }

  return (
    <UserSubPageShell
      title={editingClipbookId ? '编辑手账' : '新建手账'}
      subtitle="点击槽位，把保存过的片段卡放进当前模板。"
      onBack={() => returnToHome()}
    >
      {devMode ? (
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
      ) : null}

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
          <h2 className="font-semibold">{selectedTemplate.name}</h2>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">
            {getTemplateDisplayName(selectedTemplate)}
          </span>
        </div>
        <label className="mt-4 block text-sm font-medium text-stone-700">
          手账标题
          <input
            value={bookTitle}
            onChange={(event) => setBookTitle(event.target.value)}
            className="mt-2 w-full rounded-2xl bg-stone-100 px-3 py-2 text-sm outline-none"
            aria-label="手账标题"
          />
        </label>
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
        <div className="mt-4 grid gap-3">
          <button type="button" onClick={saveCurrentClipbook} className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white">
            保存手账
          </button>
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setFeedback('分享手账功能已预留。')} className="rounded-full bg-white px-4 py-2.5 text-sm font-medium text-stone-800 shadow-sm shadow-stone-200">
              分享手账
            </button>
            <button type="button" onClick={() => openPublishPreview(bookTitle, getCardsFromSlotPlacements(draftSlots, cards))} className="rounded-full bg-emerald-100 px-4 py-2.5 text-sm font-medium text-emerald-800">
              一键发布为视频
            </button>
          </div>
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
      {publishPreview ? (
        <PublishPreviewModal
          title={publishPreview.title}
          sourceCards={publishPreview.sourceCards}
          onCancel={() => setPublishPreview(null)}
          onConfirm={confirmPublishPreview}
        />
      ) : null}
    </UserSubPageShell>
  );
}

function ClipbookHome({
  clipbooks,
  templates,
  cards,
  feedback,
  onOpenClipbook,
  onCreateDefault,
  onSelectTemplate,
}: {
  clipbooks: Clipbook[];
  templates: ClipbookTemplate[];
  cards: SegmentCard[];
  feedback: string;
  onOpenClipbook: (clipbook: Clipbook) => void;
  onCreateDefault: () => void;
  onSelectTemplate: (templateId: TemplateId) => void;
}) {
  return (
    <>
      <section className="rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">我的手账</h2>
          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-500">{clipbooks.length} 本</span>
        </div>
        {feedback ? <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{feedback}</p> : null}
        {clipbooks.length > 0 ? (
          <div className="mt-4 grid gap-3">
            {clipbooks.map((clipbook) => {
              const template = templates.find((item) => getTemplateId(item) === normalizeTemplateId(clipbook.templateId)) ?? templates[0];
              return (
                <ClipbookListCard
                  key={clipbook.clipbookId}
                  clipbook={clipbook}
                  template={template}
                  cardCount={getClipbookCardCount(clipbook, cards)}
                  onClick={() => onOpenClipbook(clipbook)}
                />
              );
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-3xl bg-[#f3f0e7] px-5 py-8 text-center text-sm leading-6 text-stone-500">
            还没有手账。选择一个模板，把保存的片段卡整理成你的第一本手账。
          </p>
        )}
      </section>

      <section className="rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">新建手账</h2>
            <p className="mt-1 text-sm text-stone-500">先选模板，再把卡片放进槽位。</p>
          </div>
          <button type="button" onClick={onCreateDefault} className="rounded-full bg-stone-900 px-3.5 py-2 text-sm font-medium text-white">
            新建手账
          </button>
        </div>
        <div className="mt-4">
          <p className="mb-3 text-xs font-medium text-stone-500">模板库预览</p>
          <TemplateSelectionPanel templates={templates} onSelect={onSelectTemplate} />
        </div>
      </section>
    </>
  );
}

function ClipbookListCard({
  clipbook,
  template,
  cardCount,
  onClick,
}: {
  clipbook: Clipbook;
  template: ClipbookTemplate;
  cardCount: number;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="grid grid-cols-[96px_1fr] gap-3 rounded-3xl bg-[#fbf8f0] p-3 text-left shadow-sm shadow-stone-200">
      <span className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-stone-100">
        {clipbook.coverImage ? (
          <img src={clipbook.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <TemplateChoiceBackground templateId={getTemplateId(template)} />
        )}
        <span className="absolute inset-0 bg-gradient-to-t from-stone-950/50 via-transparent to-white/10" />
        <span className="absolute bottom-2 left-2 right-2 text-xs font-semibold leading-4 text-white drop-shadow">
          {clipbook.templateName}
        </span>
      </span>
      <span className="min-w-0 py-1">
        <span className="block line-clamp-2 text-base font-semibold leading-6 text-stone-900">{clipbook.title}</span>
        <span className="mt-2 block text-sm text-stone-500">{clipbook.templateName}</span>
        <span className="mt-2 block text-sm text-stone-500">包含 {cardCount} 张卡片</span>
        <span className="mt-3 block text-xs text-stone-400">更新于 {formatTimestamp(clipbook.updatedAt || clipbook.createdAt)}</span>
      </span>
    </button>
  );
}

function SourceVideoList({ sourceCards, onOpenSource }: { sourceCards: SegmentCard[]; onOpenSource: () => void }) {
  return (
    <section className="rounded-[24px] bg-white p-4 shadow-sm shadow-stone-200">
      <h2 className="font-semibold">来源视频</h2>
      <p className="mt-1 text-xs leading-5 text-stone-500">{SOURCE_BACKFLOW_HINT}</p>
      {sourceCards.length > 0 ? (
        <ol className="mt-3 space-y-2">
          {sourceCards.map((card, index) => (
            <li key={card.cardId} className="rounded-2xl bg-stone-50 px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <p className="min-w-0 flex-1 break-words text-sm leading-6 text-stone-700">
                  <span className="mr-1 text-stone-400">{index + 1}.</span>
                  {getSourceLine(card)}
                </p>
                <button
                  type="button"
                  onClick={onOpenSource}
                  className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-stone-700 shadow-sm shadow-stone-200"
                  aria-label={`查看原视频 ${getSourceVideoUrl(card)}`}
                >
                  查看原视频
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 rounded-2xl bg-stone-50 px-4 py-4 text-center text-sm leading-6 text-stone-500">
          这本手账还没有放入卡片，暂无可标注的来源视频。
        </p>
      )}
    </section>
  );
}

function PublishPreviewModal({
  title,
  sourceCards,
  onCancel,
  onConfirm,
}: {
  title: string;
  sourceCards: SegmentCard[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-stone-900/35 px-4 backdrop-blur-sm">
      <section className="w-full max-w-[430px] rounded-t-[30px] bg-[#fffdf7] p-5 text-stone-900 shadow-2xl">
        <h2 className="text-lg font-semibold">发布活动手账视频</h2>
        <div className="mt-4 rounded-2xl bg-stone-100 px-4 py-3">
          <p className="text-xs font-medium text-stone-500">视频标题</p>
          <p className="mt-1 text-sm font-semibold">{title || '我的活动手账'}</p>
        </div>
        <div className="mt-3 rounded-2xl bg-white px-4 py-3 shadow-sm shadow-stone-200">
          <p className="text-xs font-medium text-stone-500">自动生成简介</p>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-stone-700">{formatPublishDescription(sourceCards)}</p>
        </div>
        <p className="mt-3 text-xs leading-5 text-stone-500">{SOURCE_BACKFLOW_HINT}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="rounded-full bg-stone-100 px-4 py-2.5 text-sm font-medium text-stone-700">
            取消
          </button>
          <button type="button" onClick={onConfirm} className="rounded-full bg-stone-900 px-4 py-2.5 text-sm font-medium text-white">
            确认发布
          </button>
        </div>
      </section>
    </div>
  );
}

function TemplateSelectionPanel({ templates, onSelect }: { templates: ClipbookTemplate[]; onSelect: (templateId: TemplateId) => void }) {
  return (
    <section>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {templates.map((template) => (
          <TemplateChoiceCard key={getTemplateId(template)} template={template} onClick={() => onSelect(getTemplateId(template))} />
        ))}
      </div>
      <p className="mt-3 rounded-2xl bg-white/70 px-4 py-3 text-sm leading-6 text-stone-500 shadow-sm shadow-stone-200">
        模板库只负责选择风格。选好模板后，就可以把保存过的片段卡放进槽位。
      </p>
    </section>
  );
}

function TemplateChoiceCard({ template, onClick }: { template: ClipbookTemplate; onClick: () => void }) {
  const backgroundImage = getTemplateBackgroundImage(template);

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-[9/16] w-[42%] min-w-[150px] max-w-[172px] shrink-0 overflow-hidden rounded-[22px] border border-white bg-white text-left shadow-sm shadow-stone-200"
    >
      {backgroundImage ? (
        <img src={backgroundImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <TemplateChoiceBackground templateId={getTemplateId(template)} />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-stone-950/62 via-transparent to-white/10" />
      {!backgroundImage ? <TemplateChoiceSlots template={template} /> : null}
      <p className="absolute inset-x-0 bottom-0 px-3 pb-3 pt-10 text-sm font-semibold leading-5 text-white drop-shadow">
        {getTemplateDisplayName(template)}
      </p>
    </button>
  );
}

function TemplateChoiceBackground({ templateId }: { templateId: TemplateId }) {
  if (templateId === 'fps') {
    return (
      <div className="absolute inset-0 bg-[linear-gradient(145deg,#0f172a,#1e1b4b_55%,#083344)]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(34,211,238,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.16)_1px,transparent_1px)] bg-[size:22px_22px]" />
      </div>
    );
  }

  if (templateId === 'landscape') {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_76%,#bbf7d0_0_19%,transparent_20%),radial-gradient(circle_at_78%_72%,#bfdbfe_0_22%,transparent_23%),linear-gradient(#dff3f7,#fffaf0)]" />;
  }

  return <div className="absolute inset-0 border-l-[14px] border-stone-200 bg-[#fffaf0]" />;
}

function TemplateChoiceSlots({ template }: { template: ClipbookTemplate }) {
  return (
    <>
      {template.slots.map((slot) => (
        <span
          key={getSlotId(slot)}
          className="absolute rounded-md border border-dashed border-white/75 bg-white/16 shadow-sm"
          style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
        />
      ))}
    </>
  );
}

function TemplateCanvas({
  template,
  cards,
  getCardInSlot,
  onSlotClick,
  onClearSlot,
  onImageMeasure,
  readOnly = false,
  emptyMessage = '先在视频里保存一张卡片，再放入槽位。',
}: {
  template: ClipbookTemplate;
  cards: SegmentCard[];
  getCardInSlot: (slotId: string) => SegmentCard | null;
  onSlotClick: (slotId: string) => void;
  onClearSlot: (slotId: string) => void;
  onImageMeasure: (width: number, height: number) => void;
  readOnly?: boolean;
  emptyMessage?: string;
}) {
  const canvasRatio = getTemplateAspectRatio(template);
  const backgroundImage = getTemplateBackgroundImage(template);
  const hasPlacedCards = template.slots.some((slot) => Boolean(getCardInSlot(getSlotId(slot))));

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
              onClick={() => { if (!readOnly) onSlotClick(getSlotId(slot)); }}
              onKeyDown={(event) => {
                if (readOnly) return;
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSlotClick(getSlotId(slot));
                }
              }}
              role={readOnly ? undefined : 'button'}
              tabIndex={readOnly ? undefined : 0}
              className={[
                'group absolute rounded-2xl border-2 border-dashed border-white/85 bg-white/24 p-1 shadow-sm backdrop-blur-[1px]',
                readOnly ? '' : 'transition hover:border-emerald-300 hover:bg-emerald-50/55 active:border-emerald-300 active:bg-emerald-50/55',
              ].join(' ')}
              style={{ left: `${slot.x}%`, top: `${slot.y}%`, width: `${slot.w}%`, height: `${slot.h}%` }}
            >
              {card ? (
                <SlotCard card={card} onClear={readOnly ? undefined : (event) => { event.stopPropagation(); onClearSlot(getSlotId(slot)); }} />
              ) : (
                <span className="flex h-full items-center justify-center text-2xl font-light text-white drop-shadow group-hover:text-emerald-700 group-active:text-emerald-700">
                  {readOnly ? '' : '+'}
                </span>
              )}
            </div>
          );
        })}
        {!hasPlacedCards && (cards.length === 0 || readOnly) ? <p className="absolute inset-x-6 bottom-6 rounded-2xl bg-white/80 px-4 py-3 text-center text-xs text-stone-500">{emptyMessage}</p> : null}
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

function SlotCard({ card, onClear }: { card: SegmentCard; onClear?: (event: MouseEvent<HTMLButtonElement>) => void }) {
  return (
    <div className="relative h-full">
      <CardThumbnail card={card} className="h-full w-full rounded-xl" />
      {onClear ? (
        <button type="button" onClick={onClear} aria-label="移除卡片" className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/50 text-xs text-white">
          ×
        </button>
      ) : null}
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
            还没有可放入手账的卡片。先在活动视频里点击活动胶囊生成卡片。
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

function normalizeTemplateId(value: string): TemplateId {
  if (value === 'landscape' || value === 'blank') return value;
  return 'fps';
}

function getTemplateId(template: ClipbookTemplate): TemplateId {
  return normalizeTemplateId(template.templateId ?? template.id);
}

function getSlotId(slot: ClipbookSlot) {
  return slot.slotId ?? slot.id;
}

function getTemplateBackgroundImage(template: ClipbookTemplate) {
  return template.backgroundImage ?? template.image;
}

function getTemplateDisplayName(template: ClipbookTemplate) {
  const id = getTemplateId(template);
  if (id === 'fps') return 'FPS 高光册';
  if (id === 'landscape') return '风景灵感册';
  return '空白书';
}

function getDefaultClipbookTitle(templateId: string) {
  const id = normalizeTemplateId(templateId);
  if (id === 'fps') return '我的 FPS 高光册';
  if (id === 'landscape') return '我的风景灵感册';
  return '我的空白书';
}

function buildDraftSlots(template: ClipbookTemplate, clipbook?: Clipbook): ClipbookSlotPlacement[] {
  return template.slots.map((slot) => {
    const slotId = getSlotId(slot);
    const savedSlot = clipbook?.slots.find((item) => item.slotId === slotId);
    return {
      slotId,
      cardId: savedSlot?.cardId ?? null,
    };
  });
}

function getClipbookCoverImage(template: ClipbookTemplate, slots: ClipbookSlotPlacement[], cards: SegmentCard[]) {
  const firstCardId = slots.find((slot) => slot.cardId)?.cardId;
  const firstCard = firstCardId ? cards.find((card) => card.cardId === firstCardId) : undefined;
  return firstCard?.coverImage ?? getTemplateBackgroundImage(template);
}

function getClipbookCardCount(clipbook: Clipbook, cards: SegmentCard[]) {
  return clipbook.slots.filter((slot) => slot.cardId && cards.some((card) => card.cardId === slot.cardId)).length;
}

function getCardsFromSlotPlacements(slots: ClipbookSlotPlacement[], cards: SegmentCard[]) {
  const usedCardIds = new Set<string>();
  return slots.flatMap((slot) => {
    if (!slot.cardId || usedCardIds.has(slot.cardId)) return [];
    const card = cards.find((item) => item.cardId === slot.cardId);
    if (!card) return [];
    usedCardIds.add(slot.cardId);
    return [card];
  });
}

function formatPublishDescription(sourceCards: SegmentCard[]) {
  const sourceLines = sourceCards.length > 0
    ? sourceCards.map((card, index) => `${index + 1}. ${getSourceLine(card)}`)
    : ['暂无已放入卡片。'];

  return [
    '本手账收集自以下视频片段：',
    ...sourceLines,
    '',
    '每条来源将自动附带可跳转原视频入口。',
  ].join('\n');
}

function formatTimestamp(value: number) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
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
