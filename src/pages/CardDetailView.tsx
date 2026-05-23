import { Download, Share2, Trash2, X } from 'lucide-react';
import type { SegmentCard } from '../core/types';

const userAdPreference = {
  enabled: true,
};

export function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function getVideoSourceName(card: SegmentCard) {
  const map: Record<string, string> = {
    demo_food_001: '深夜小店热汤',
    demo_game_001: '团战反打高光',
    demo_travel_001: '城市转角风景',
  };
  return map[card.videoId] ?? '演示视频片段';
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

export function CardMini({ card, onClick }: { card: SegmentCard; onClick: () => void }) {
  const theme = getCardTheme(card);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex aspect-[3/4] min-w-0 flex-col rounded-2xl border p-2.5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${theme.mini}`}
    >
      <span className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${theme.tag}`}>{getCardTypeLabel(card)}</span>
      <span className="mt-2 text-[11px] opacity-65">
        {formatSeconds(card.segmentStart)} - {formatSeconds(card.segmentEnd)}
      </span>
      <span className="mt-2 line-clamp-2 text-sm font-semibold leading-5">{card.title}</span>
      <span className="mt-2 line-clamp-2 text-xs leading-5 opacity-70">{card.summary}</span>
      <span className="mt-auto line-clamp-1 pt-2 text-[11px] opacity-55">{getVideoSourceName(card)}</span>
    </button>
  );
}

export function CardDetailView({ card, onClose }: { card: SegmentCard; onClose: () => void }) {
  const theme = getCardTheme(card);
  const adLabel = getAdLabel(card);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/30 px-4 py-6 backdrop-blur-sm">
      <article className={`relative flex h-[82vh] w-full max-w-[430px] flex-col overflow-hidden rounded-[30px] border p-4 shadow-2xl ${theme.panel}`}>
        <header className="flex shrink-0 items-center justify-between px-1 pb-3">
          <div className="flex items-center gap-4">
            <button type="button" aria-label="删除" className="opacity-72 transition hover:opacity-100">
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
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${theme.tag}`}>{getCardTypeLabel(card)}</span>
              <span className={`text-xs ${theme.muted}`}>
                {formatSeconds(card.segmentStart)} - {formatSeconds(card.segmentEnd)}
              </span>
            </div>
            <h2 className="mt-5 text-2xl font-semibold leading-8">{card.title}</h2>
            <section className="mt-6 space-y-5 text-sm leading-7">
              <div>
                <p className={`text-xs font-medium ${theme.accent}`}>谨慎摘要</p>
                <p className="mt-1">{card.summary}</p>
              </div>
              <div>
                <p className={`text-xs font-medium ${theme.accent}`}>保存理由</p>
                <p className="mt-1">{card.saveReason}</p>
              </div>
              <div>
                <p className={`text-xs font-medium ${theme.accent}`}>来源视频</p>
                <p className="mt-1">{getVideoSourceName(card)}</p>
              </div>
              <div>
                <p className={`text-xs font-medium ${theme.accent}`}>判断依据</p>
                <p className="mt-1">{card.evidenceNote}</p>
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
    </div>
  );
}
