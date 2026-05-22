import { getCards } from '../core/cardStore';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook';

interface SimplePageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function MyCardsPage({ onNavigate }: SimplePageProps) {
  const cards = getCards();

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto min-h-[calc(100vh-48px)] w-full max-w-[430px] rounded-t-3xl bg-zinc-950 px-5 py-5">
        <button type="button" onClick={() => onNavigate('profile', { dev: false })} className="text-sm text-white/62">
          返回“我”页面
        </button>
        <h1 className="mt-5 text-2xl font-semibold">我的卡片</h1>

        {cards.length > 0 ? (
          <div className="mt-5 space-y-3">
            {cards.map((card) => (
              <article key={card.cardId} className="rounded-xl bg-white/[0.07] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-white">{card.title}</h2>
                  <span className="shrink-0 text-xs text-white/50">{formatSeconds(card.segmentStart)} - {formatSeconds(card.segmentEnd)}</span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/64">{card.summary}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-24 rounded-xl bg-white/[0.06] px-5 py-8 text-center text-sm leading-6 text-white/58">
            刷视频时点击“保存这一刻”，片段卡会出现在这里。
          </div>
        )}
      </section>
    </main>
  );
}

export function ClipbookPage({ onNavigate }: SimplePageProps) {
  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto min-h-[calc(100vh-48px)] w-full max-w-[430px] rounded-t-3xl bg-zinc-950 px-5 py-5">
        <button type="button" onClick={() => onNavigate('profile', { dev: false })} className="text-sm text-white/62">
          返回“我”页面
        </button>
        <h1 className="mt-5 text-2xl font-semibold">卡片手账</h1>
        <p className="mt-3 text-sm leading-6 text-white/62">把保存的片段卡放进模板，生成可分享的卡片手账。</p>

        <div className="mt-6 grid gap-3">
          {['周末探店手账', '游戏高光册', '旅行灵感册'].map((template) => (
            <article key={template} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
              <h2 className="text-base font-semibold text-white">{template}</h2>
              <p className="mt-2 text-sm text-white/50">模板占位，后续可接入卡片排版能力。</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
