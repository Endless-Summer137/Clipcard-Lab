import { Download, Share2, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { SegmentCard } from '../core/types';
import { deleteCard, getCardById, updateCard } from '../core/cardStore';
import { recordEvent } from '../core/eventStore';
import { removeClipbookPlacementsByCardId } from '../core/clipbookPlacementStore';

const userAdPreference = {
  enabled: true,
};

export function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function formatCreatedAt(value?: string) {
  if (!value) return '生成时间未知';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '生成时间未知';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export function getVideoSourceName(card: SegmentCard) {
  if (card.sourceVideoTitle) return card.sourceVideoTitle;

  const map: Record<string, string> = {
    demo_food_001: '深夜小店热汤',
    demo_game_001: '团战反打高光',
    demo_travel_001: '城市转角风景',
  };
  return map[card.videoId] ?? '演示视频片段';
}

export function getSourceAuthor(card: SegmentCard) {
  const author = card.sourceAuthor?.trim();
  if (author) return author.startsWith('@') ? author : `@${author}`;

  const map: Record<string, string> = {
    demo_food_001: '@clipcard_food',
    demo_game_001: '@clipcard_game',
    demo_travel_001: '@clipcard_travel',
  };
  return map[card.videoId] ?? '@clipcard_demo';
}

export function getSourceVideoUrl(card: SegmentCard) {
  if (card.sourceVideoUrl) return card.sourceVideoUrl;
  return `https://example.com/clipcard/${card.sourceVideoId ?? card.videoId}`;
}

export function getSourceLine(card: SegmentCard) {
  return `${getSourceAuthor(card)}《${getVideoSourceName(card)}》${formatSeconds(card.segmentStart)}–${formatSeconds(card.segmentEnd)}`;
}

export function getCardKind(card: SegmentCard) {
  const text = `${card.cardType} ${card.title} ${card.summary}`;
  const duration = Math.max(0, card.segmentEnd - card.segmentStart);

  if (text.includes('待补充') || text.includes('轻卡')) return 'light';
  if (duration <= 3) return 'moment';
  if (text.includes('游戏') || text.includes('高光')) return 'game';
  if (text.includes('美食') || text.includes('探店') || text.includes('消费')) return 'food';
  if (text.includes('旅行') || text.includes('风景') || text.includes('城市')) return 'travel';
  return 'travel';
}

export function getCardTypeLabel(card: SegmentCard) {
  const kind = getCardKind(card);
  if (kind === 'light') return '待补充片段';
  if (kind === 'moment') return '轻量瞬间卡';
  return card.cardType;
}

export function getCardDisplayTitle(card: SegmentCard) {
  const title = card.title.trim();
  const separatorIndex = title.search(/[：:]/);
  if (separatorIndex > 0 && separatorIndex < 16) {
    return title.slice(separatorIndex + 1).trim();
  }
  return title;
}

export function getCardTheme(card: SegmentCard) {
  const kind = getCardKind(card);

  if (kind === 'game') {
    return {
      mini: 'border-slate-800 bg-slate-950 text-cyan-50 shadow-cyan-950/20',
      panel: 'border-slate-800 bg-[linear-gradient(135deg,#0f172a,#1e1b4b_55%,#083344)] text-cyan-50',
      tag: 'bg-cyan-300/14 text-cyan-100',
      muted: 'text-cyan-50/68',
      accent: 'text-cyan-200',
      ad: 'border-cyan-200/30 bg-cyan-200/12 text-cyan-50',
    };
  }

  if (kind === 'food') {
    return {
      mini: 'border-orange-100 bg-[#fff7e8] text-stone-800 shadow-orange-100/60',
      panel: 'border-orange-100 bg-[#fff8ea] text-stone-800',
      tag: 'bg-orange-100 text-orange-800',
      muted: 'text-stone-600',
      accent: 'text-orange-700',
      ad: 'border-orange-200 bg-orange-50 text-orange-900',
    };
  }

  if (kind === 'light') {
    return {
      mini: 'border-stone-200 bg-stone-100 text-stone-700 shadow-stone-200/60',
      panel: 'border-stone-200 bg-stone-100 text-stone-700',
      tag: 'bg-white text-stone-600',
      muted: 'text-stone-500',
      accent: 'text-stone-700',
      ad: 'border-stone-200 bg-white text-stone-600',
    };
  }

  return {
    mini: 'border-emerald-100 bg-[#eef8ef] text-slate-800 shadow-emerald-100/70',
    panel: 'border-emerald-100 bg-[#f3fbf4] text-slate-800',
    tag: 'bg-emerald-100 text-emerald-800',
    muted: 'text-slate-600',
    accent: 'text-emerald-700',
    ad: 'border-emerald-200 bg-white/82 text-emerald-900',
  };
}

function getAdLabel(card: SegmentCard) {
  if (!userAdPreference.enabled) return null;
  if (card.adDecision.decision === 'reject') return null;
  if (card.adDecision.reason.includes('无广告')) return null;

  const text = `${card.cardType} ${card.title} ${card.adDecision.reason}`;
  if (text.includes('门店') || text.includes('团购') || text.includes('美食')) return '门店团购';
  if (text.includes('游戏') || text.includes('外设')) return '游戏外设';
  if (text.includes('景区') || text.includes('旅行') || text.includes('风景')) return '景区活动';
  return '内容相关服务';
}

export function CardThumbnail({ card, onClick, className = 'aspect-[3/4]' }: { card: SegmentCard; onClick?: () => void; className?: string }) {
  const theme = getCardTheme(card);
  const showCover = Boolean(card.coverImage);
  const cardClassName = `relative block w-full ${className} min-w-0 overflow-hidden rounded-2xl border text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${showCover ? 'border-white bg-stone-200' : theme.mini}`;
  const content = (
    <>
      {showCover ? (
        <img src={card.coverImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.65),transparent_26%),linear-gradient(160deg,rgba(255,255,255,0.34),rgba(255,255,255,0))]" />
      )}
      <span className={`absolute left-2 top-2 z-10 max-w-[calc(100%-16px)] rounded-full px-2 py-0.5 text-[10px] font-medium ${showCover ? 'bg-white/86 text-stone-800 shadow-sm' : theme.tag}`}>
        {getCardTypeLabel(card)}
      </span>
      <span className={`absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-10 ${showCover ? 'bg-gradient-to-t from-black/70 via-black/32 to-transparent' : ''}`}>
        {card.activityName ? (
          <span className={`mb-1 block truncate text-[10px] font-medium ${showCover ? 'text-white/86 drop-shadow' : theme.accent}`}>
            {card.activityName}
          </span>
        ) : null}
        <span className={`line-clamp-2 text-sm font-semibold leading-5 ${showCover ? 'text-white drop-shadow' : ''}`}>{getCardDisplayTitle(card)}</span>
      </span>
    </>
  );

  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cardClassName}
      data-card-thumbnail="true"
      data-card-id={card.cardId}
    >
      {content}
    </button>
  ) : (
    <div className={cardClassName} data-card-thumbnail="true" data-card-id={card.cardId}>{content}</div>
  );
}

export function CardMini(props: { card: SegmentCard; onClick: () => void }) {
  return <CardThumbnail {...props} />;
}

export function CardQuickPreview({
  card,
  feedback,
  onClose,
  onAddToActivityClipbook,
  onShare,
  onOpenDetail,
}: {
  card: SegmentCard;
  feedback?: string;
  onClose: () => void;
  onAddToActivityClipbook?: () => void;
  onShare: () => void;
  onOpenDetail: () => void;
}) {
  const theme = getCardTheme(card);
  const kind = getCardKind(card);
  const quickTheme = kind === 'game'
    ? {
      panel: 'border-cyan-100 bg-[#f3fbff] text-slate-900',
      tag: 'bg-cyan-100 text-cyan-900',
      muted: 'text-slate-600',
      accent: 'text-cyan-700',
    }
    : {
      panel: theme.panel,
      tag: theme.tag,
      muted: theme.muted,
      accent: theme.accent,
    };

  return (
    <div className="absolute inset-0 z-40 flex items-end justify-center bg-stone-900/24 px-3 pb-20 backdrop-blur-[2px]">
      <article className={`w-full max-w-[390px] overflow-hidden rounded-[28px] border p-4 shadow-2xl ${quickTheme.panel}`}>
        <header className="flex items-start justify-between gap-3">
          <button type="button" onClick={onOpenDetail} className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${quickTheme.tag}`}>{getCardTypeLabel(card)}</span>
              {card.activityName ? (
                <span className="rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-stone-700 shadow-sm">
                  {card.activityName}
                </span>
              ) : null}
              <span className={`text-xs ${quickTheme.muted}`}>
                {formatSeconds(card.segmentStart)} - {formatSeconds(card.segmentEnd)}
              </span>
            </div>
            <h2 className="mt-3 text-lg font-semibold leading-7">{card.title}</h2>
          </button>
          <button type="button" onClick={onClose} aria-label="关闭片段卡预览" className="rounded-full bg-white/55 p-1.5 opacity-75 transition hover:opacity-100">
            <X className="h-5 w-5" strokeWidth={1.9} />
          </button>
        </header>

        <button type="button" onClick={onOpenDetail} className="mt-3 block w-full text-left">
          <p className={`line-clamp-3 text-sm leading-6 ${quickTheme.muted}`}>{card.summary}</p>
        </button>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          {card.activityName ? (
            <button type="button" onClick={onAddToActivityClipbook} className="rounded-full bg-stone-900 px-3.5 py-2 text-xs font-medium text-white shadow-sm">
              加入活动手账
            </button>
          ) : (
            <button type="button" onClick={onOpenDetail} className={`rounded-full bg-white/65 px-3.5 py-2 text-xs font-medium shadow-sm ${quickTheme.accent}`}>
              查看完整卡片
            </button>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onShare} className="rounded-full bg-white/75 px-3.5 py-2 text-xs font-medium shadow-sm">
              分享
            </button>
            {card.activityName ? (
              <button type="button" onClick={onOpenDetail} className={`rounded-full bg-white/65 px-3.5 py-2 text-xs font-medium shadow-sm ${quickTheme.accent}`}>
                查看完整卡片
              </button>
            ) : null}
          </div>
        </div>
        {feedback ? <p className={`mt-3 text-center text-xs font-medium ${quickTheme.accent}`}>{feedback}</p> : null}
      </article>
    </div>
  );
}

export function CardDetailView({ card, onClose, onDeleted }: { card: SegmentCard; onClose: () => void; onDeleted?: (cardId: string) => void }) {
  const [currentCard, setCurrentCard] = useState<SegmentCard>(() => getCardById(card.cardId) ?? card);
  const theme = getCardTheme(currentCard);
  const adLabel = getAdLabel(currentCard);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [reflectionDraft, setReflectionDraft] = useState(currentCard.personalReflection?.text ?? '');
  const [sourceFeedback, setSourceFeedback] = useState('');

  useEffect(() => {
    const nextCard = getCardById(card.cardId) ?? card;
    setCurrentCard(nextCard);
    setReflectionDraft(nextCard.personalReflection?.text ?? '');
    setIsEditingReflection(false);
    setSourceFeedback('');
  }, [card]);

  function openReflectionEditor() {
    setReflectionDraft(currentCard.personalReflection?.text ?? '');
    setIsEditingReflection(true);
  }

  function saveReflection() {
    const text = reflectionDraft.trim().slice(0, 300);
    const patch: Partial<SegmentCard> = text
      ? { personalReflection: { text, updatedAt: new Date().toISOString() } }
      : { personalReflection: undefined };

    updateCard(currentCard.cardId, patch);
    const nextCard = getCardById(currentCard.cardId) ?? { ...currentCard, ...patch };
    setCurrentCard(nextCard);
    setReflectionDraft(nextCard.personalReflection?.text ?? '');
    setIsEditingReflection(false);
  }

  function deleteReflection() {
    updateCard(currentCard.cardId, { personalReflection: undefined });
    setCurrentCard({ ...currentCard, personalReflection: undefined });
    setReflectionDraft('');
    setIsEditingReflection(false);
  }

  function confirmDeleteCard() {
    deleteCard(currentCard.cardId);
    removeClipbookPlacementsByCardId(currentCard.cardId);
    recordEvent({
      eventType: 'card_deleted',
      videoId: currentCard.videoId,
      cardId: currentCard.cardId,
      segmentStart: currentCard.segmentStart,
      segmentEnd: currentCard.segmentEnd,
    });
    onDeleted?.(currentCard.cardId);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 px-4 py-6 backdrop-blur-sm">
      <article className={`relative flex h-[82vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] border p-4 shadow-2xl ${theme.panel}`}>
        <header className="flex shrink-0 items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => setConfirmingDelete(true)} aria-label="删除" className="opacity-72 transition hover:opacity-100">
              <Trash2 className="h-5 w-5" strokeWidth={1.9} />
            </button>
            <button type="button" aria-label="分享" className="opacity-72 transition hover:opacity-100">
              <Share2 className="h-5 w-5" strokeWidth={1.9} />
            </button>
            <button type="button" aria-label="下载" className="opacity-72 transition hover:opacity-100">
              <Download className="h-5 w-5" strokeWidth={1.9} />
            </button>
          </div>
          <button type="button" onClick={onClose} aria-label="退出" className="opacity-72 transition hover:opacity-100">
            <X className="h-6 w-6" strokeWidth={1.9} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-24 pt-4">
          <div className="mx-auto max-w-[290px]">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${theme.tag}`}>{getCardTypeLabel(currentCard)}</span>
              <span className={`text-xs ${theme.muted}`}>
                {formatSeconds(currentCard.segmentStart)} - {formatSeconds(currentCard.segmentEnd)}
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-8">{currentCard.title}</h2>
            <p className={`mt-2 text-xs ${theme.muted}`}>生成于 {formatCreatedAt(currentCard.createdAt)}</p>
            <section className="mt-6 space-y-5 text-sm leading-7">
              <div>
                <p className={`text-xs font-medium ${theme.accent}`}>谨慎摘要</p>
                <p className="mt-1">{currentCard.summary}</p>
              </div>
              <div>
                <p className={`text-xs font-medium ${theme.accent}`}>保存理由</p>
                <p className="mt-1">{currentCard.saveReason}</p>
              </div>
              <div>
                <section className="rounded-3xl bg-white/38 p-3 shadow-sm">
                  <p className={`text-xs font-medium ${theme.accent}`}>来源视频</p>
                  <p className="mt-1 break-words text-sm leading-6">
                    来源视频：{getSourceAuthor(currentCard)}《{getVideoSourceName(currentCard)}》
                  </p>
                  <p className={`mt-1 text-xs ${theme.muted}`}>
                    片段时间：{formatSeconds(currentCard.segmentStart)}–{formatSeconds(currentCard.segmentEnd)}
                  </p>
                  <button
                    type="button"
                    onClick={() => setSourceFeedback('跳转原视频。')}
                    className={`mt-2 text-xs font-medium ${theme.accent}`}
                    aria-label={`查看原视频 ${getSourceVideoUrl(currentCard)}`}
                  >
                    查看原视频 →
                  </button>
                  {sourceFeedback ? <p className={`mt-1 text-xs ${theme.muted}`}>{sourceFeedback}</p> : null}
                </section>
              </div>
              <div className="rounded-2xl bg-white/32 px-3 py-2 shadow-sm">
                <p className={`text-xs ${theme.muted}`}>AI 生成内容，请核查重要信息。</p>
                <details className="mt-2">
                  <summary className={`cursor-pointer select-none text-xs font-medium ${theme.accent}`}>
                    生成依据
                  </summary>
                  <p className={`mt-2 text-xs leading-5 ${theme.muted}`}>{currentCard.evidenceNote}</p>
                </details>
              </div>
              <div>
                {isEditingReflection ? (
                  <section className="rounded-3xl bg-white/55 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-xs font-medium ${theme.accent}`}>个人感悟</p>
                      <span className={`text-xs ${theme.muted}`}>{reflectionDraft.length}/300</span>
                    </div>
                    <textarea
                      value={reflectionDraft}
                      maxLength={300}
                      onChange={(event) => setReflectionDraft(event.target.value.slice(0, 300))}
                      placeholder="写下你看到这个片段时的想法，最多 300 字。"
                      className="mt-2 min-h-[112px] w-full resize-none rounded-2xl border border-white/60 bg-white/70 px-3 py-2 text-sm leading-6 text-stone-800 outline-none placeholder:text-stone-400"
                    />
                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" onClick={() => setIsEditingReflection(false)} className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-medium">
                        取消
                      </button>
                      <button type="button" onClick={saveReflection} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-medium text-white">
                        保存感悟
                      </button>
                    </div>
                  </section>
                ) : currentCard.personalReflection?.text ? (
                  <section className="rounded-3xl bg-white/48 p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <p className={`text-xs font-medium ${theme.accent}`}>个人感悟</p>
                      <span className={`text-[11px] ${theme.muted}`}>{formatCreatedAt(currentCard.personalReflection.updatedAt)}</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap">{currentCard.personalReflection.text}</p>
                    <div className="mt-3 flex gap-2">
                      <button type="button" onClick={openReflectionEditor} className="rounded-full bg-white/65 px-3 py-1.5 text-xs font-medium shadow-sm">
                        编辑
                      </button>
                      <button type="button" onClick={deleteReflection} className="rounded-full bg-white/45 px-3 py-1.5 text-xs font-medium shadow-sm">
                        删除
                      </button>
                    </div>
                  </section>
                ) : (
                  <button type="button" onClick={openReflectionEditor} className="w-full rounded-3xl bg-white/52 px-4 py-3 text-left text-sm font-medium shadow-sm">
                    + 个人感悟
                  </button>
                )}
              </div>
            </section>
          </div>
        </div>

        {adLabel ? (
          <aside className={`absolute bottom-5 left-5 max-w-[170px] rounded-2xl border px-3 py-2 text-xs shadow-sm ${theme.ad}`}>
            <p className="font-semibold">广告 · {adLabel}</p>
            <p className="mt-1 opacity-70">商业内容已明确标注。</p>
          </aside>
        ) : null}
      </article>

      {confirmingDelete ? (
        <section className="absolute inset-0 z-10 flex items-center justify-center bg-stone-900/35 px-8 backdrop-blur-sm">
          <div className="w-full max-w-[300px] rounded-[24px] bg-white px-5 py-5 text-center text-stone-900 shadow-2xl">
            <h3 className="text-base font-semibold">确定删除这张卡片吗？</h3>
            <p className="mt-2 text-sm leading-6 text-stone-500">删除后会从我的卡片和已放入的手账槽位中移除。</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirmingDelete(false)} className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium text-stone-700">
                取消
              </button>
              <button type="button" onClick={confirmDeleteCard} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
                删除
              </button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
