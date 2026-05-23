import { Gamepad2, Grid3X3, Lightbulb, Menu, Search, ShoppingCart, UserPlus, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import type { SegmentCard } from '../core/types';
import { getCards } from '../core/cardStore';
import { CardDetailView, CardMini } from './CardDetailView';
import { defaultDemoVideos, readDemoConfig } from './demoData';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook' | 'dresser';
type ProfileTab = 'works' | 'daily' | 'favorites' | 'likes' | 'cards';

interface ProfilePageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

const tabs: Array<{ id: ProfileTab; label: string }> = [
  { id: 'works', label: '作品' },
  { id: 'daily', label: '日常' },
  { id: 'favorites', label: '收藏' },
  { id: 'likes', label: '喜欢' },
  { id: 'cards', label: '卡片' },
];

const templates = [
  { title: 'FPS 高光册', tone: 'bg-slate-950 text-cyan-50 border-cyan-300/30' },
  { title: '风景灵感册', tone: 'bg-[#e9f6ee] text-emerald-900 border-emerald-100' },
  { title: '空白书', tone: 'bg-[#fffaf0] text-stone-800 border-stone-200' },
];

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('works');
  const [selectedCard, setSelectedCard] = useState<SegmentCard | null>(null);
  const [cards, setCards] = useState<SegmentCard[]>(() => getCards());
  const videos = readDemoConfig();
  const displayVideos = videos.length >= 3 ? videos.slice(0, 3) : defaultDemoVideos;
  const recentCards = cards.slice(0, 3);

  return (
    <main className="min-h-screen bg-[#f7f4ec] text-stone-900">
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbf8f0] pb-20 shadow-xl shadow-stone-200/60">
        <header className="flex items-center justify-between px-5 py-4">
          <button type="button" className="text-stone-800" aria-label="添加朋友">
            <UserPlus className="h-6 w-6" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-5">
            <button type="button" className="text-stone-800" aria-label="搜索">
              <Search className="h-6 w-6" strokeWidth={2} />
            </button>
            <button type="button" className="text-stone-800" aria-label="菜单">
              <Menu className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>
        </header>

        <section className="px-5 pb-4">
          <div className="flex items-end gap-4">
            <div className="h-[88px] w-[88px] rounded-full border border-white bg-gradient-to-br from-emerald-100 via-white to-orange-100 shadow-md shadow-stone-200" />
            <div className="pb-1">
              <h1 className="text-2xl font-semibold">ClipCard Demo</h1>
              <p className="mt-1 text-sm text-stone-500">ID：clipcard_2026</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-stone-600">用短视频片段卡验证“保存这一刻”的演示账号。</p>

          <div className="mt-5 grid grid-cols-5 items-center gap-2 text-center">
            {[
              ['1.2w', '获赞'],
              ['86', '互关'],
              ['128', '关注'],
              ['2,026', '粉丝'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-base font-semibold">{value}</p>
                <p className="mt-1 text-xs text-stone-500">{label}</p>
              </div>
            ))}
            <button type="button" className="h-8 min-w-[72px] justify-self-end whitespace-nowrap rounded-full bg-white px-2.5 text-xs font-medium leading-8 text-stone-700 shadow-sm shadow-stone-200">
              编辑资料
            </button>
          </div>
        </section>

        <section className="mx-5 rounded-2xl bg-white px-2 py-3 shadow-sm shadow-stone-200">
          <div className="grid grid-cols-5 gap-1 text-center text-xs text-stone-600">
            <ProfileAction icon={<ShoppingCart className="h-6 w-6" />} label="订单" />
            <ProfileAction icon={<Lightbulb className="h-6 w-6" />} label="创作者中心" onClick={() => onNavigate('creatorCenter', { dev: false })} featured />
            <ProfileAction icon={<Gamepad2 className="h-6 w-6" />} label="游戏" />
            <ProfileAction icon={<WalletCards className="h-6 w-6" />} label="钱包" />
            <ProfileAction icon={<Grid3X3 className="h-6 w-6" />} label="更多功能" />
          </div>
        </section>

        <nav className="mt-4 grid grid-cols-5 border-b border-stone-200 text-center text-sm text-stone-500">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={['pb-3', activeTab === tab.id ? 'border-b-2 border-stone-900 font-semibold text-stone-900' : ''].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="px-2 py-2">
          {activeTab === 'works' ? (
            <div className="grid grid-cols-3 gap-1.5">
              {displayVideos.map((video, index) => (
                <article key={video.videoId || index} className="relative aspect-[3/4] overflow-hidden rounded-xl bg-stone-100 shadow-sm">
                  {video.videoDataUrl ? (
                    <video src={video.videoDataUrl} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_35%_25%,rgba(187,247,208,0.76),transparent_30%),radial-gradient(circle_at_74%_62%,rgba(254,215,170,0.72),transparent_34%),linear-gradient(160deg,#fffaf0,#eef8ef)]" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/75 to-transparent p-2">
                    <p className="line-clamp-2 text-xs leading-4 text-white">{video.videoTitle}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab !== 'works' && activeTab !== 'cards' ? (
            <div className="px-6 py-16 text-center text-sm text-stone-500">这里先作为短视频平台个人页内容占位。</div>
          ) : null}

          {activeTab === 'cards' ? (
            <CardCenter cards={recentCards} onNavigate={onNavigate} onOpenCard={setSelectedCard} />
          ) : null}
        </section>

        <footer className="fixed bottom-0 left-1/2 z-30 grid w-full max-w-[430px] -translate-x-1/2 grid-cols-5 border-t border-stone-200 bg-white/90 px-2 py-3 text-center text-xs text-stone-500 backdrop-blur">
          <button type="button" onClick={() => onNavigate('demoFeed', { dev: false })}>首页</button>
          <button type="button">朋友</button>
          <button type="button" className="text-lg leading-none text-stone-900">+</button>
          <button type="button">消息</button>
          <button type="button" className="font-semibold text-stone-900">我</button>
        </footer>
      </section>

      {selectedCard ? (
        <CardDetailView
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onDeleted={(cardId) => setCards((current) => current.filter((card) => card.cardId !== cardId))}
        />
      ) : null}
    </main>
  );
}

function CardCenter({
  cards,
  onNavigate,
  onOpenCard,
}: {
  cards: SegmentCard[];
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
  onOpenCard: (card: SegmentCard) => void;
}) {
  return (
    <div className="space-y-5 px-3 py-4">
      <section className="grid gap-3">
        <HubEntry title="我的卡片" description="保存过的片段卡都在这里。" onClick={() => onNavigate('myCards', { dev: false })} />
        <HubEntry title="卡片手账" description="把卡片放进模板，生成可分享手账。" onClick={() => onNavigate('clipbook', { dev: false })} />
        <HubEntry title="卡片妆台" description="给卡片换颜色、加贴纸，整理成你的专属风格。" onClick={() => onNavigate('dresser', { dev: false })} />
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">模板库</h2>
          <span className="text-xs text-stone-500">选择适合你的手账风格</span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {templates.map((template) => (
            <article key={template.title} className={`aspect-[4/5] rounded-2xl border p-3 shadow-sm ${template.tone}`}>
              <p className="text-sm font-semibold leading-5">{template.title}</p>
              <div className="mt-4 grid grid-cols-2 gap-1 opacity-60">
                <span className="h-8 rounded bg-current/10" />
                <span className="h-8 rounded bg-current/10" />
                <span className="h-8 rounded bg-current/10" />
              </div>
            </article>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-base font-semibold">最近保存</h2>
        {cards.length > 0 ? (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {cards.map((card) => <CardMini key={card.cardId} card={card} onClick={() => onOpenCard(card)} />)}
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-white px-4 py-6 text-center text-sm leading-6 text-stone-500 shadow-sm shadow-stone-200">
            刷视频时点击“保存这一刻”，片段卡会出现在这里。
          </div>
        )}
      </section>
    </div>
  );
}

function HubEntry({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-2xl bg-white px-4 py-4 text-left shadow-sm shadow-stone-200">
      <span>
        <span className="block text-base font-semibold text-stone-900">{title}</span>
        <span className="mt-1 block text-sm text-stone-500">{description}</span>
      </span>
      <span className="text-lg text-stone-400">›</span>
    </button>
  );
}

function ProfileAction({ icon, label, featured, onClick }: { icon: ReactNode; label: string; featured?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex flex-col items-center gap-2 rounded-lg px-1 py-2 text-stone-600">
      <span className={featured ? 'text-emerald-700' : 'text-stone-700'}>{icon}</span>
      <span className={featured ? 'font-medium text-emerald-800' : ''}>{label}</span>
    </button>
  );
}
