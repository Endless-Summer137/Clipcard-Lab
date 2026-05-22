import { Gamepad2, Grid3X3, Lightbulb, Menu, Search, ShoppingCart, UserPlus, WalletCards } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { defaultDemoVideos, readDemoConfig } from './demoData';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook';
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

export function ProfilePage({ onNavigate }: ProfilePageProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>('works');
  const videos = readDemoConfig();
  const displayVideos = videos.length >= 3 ? videos.slice(0, 3) : defaultDemoVideos;

  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-zinc-950">
        <header className="flex items-center justify-between px-5 py-4">
          <button type="button" className="text-white" aria-label="添加朋友">
            <UserPlus className="h-6 w-6" strokeWidth={2} />
          </button>
          <div className="flex items-center gap-5">
            <button type="button" className="text-white" aria-label="搜索">
              <Search className="h-6 w-6" strokeWidth={2} />
            </button>
            <button type="button" className="text-white" aria-label="菜单">
              <Menu className="h-6 w-6" strokeWidth={2} />
            </button>
          </div>
        </header>

        <section className="px-5 pb-4">
          <div className="flex items-end gap-4">
            <div className="h-[88px] w-[88px] rounded-full border border-white/15 bg-gradient-to-br from-teal-200/70 via-white/60 to-orange-200/60" />
            <div className="pb-1">
              <h1 className="text-2xl font-semibold">ClipCard Demo</h1>
              <p className="mt-1 text-sm text-white/58">clipcard_demo</p>
              <p className="mt-1 text-sm text-white/58">ID：clipcard_2026</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/76">用短视频片段卡验证“保存这一刻”的演示账号。</p>

          <div className="mt-5 grid grid-cols-4 gap-3 text-center">
            {[
              ['1.2w', '获赞'],
              ['128', '互关'],
              ['86', '关注'],
              ['2,026', '粉丝'],
            ].map(([value, label]) => (
              <div key={label}>
                <p className="text-base font-semibold">{value}</p>
                <p className="mt-1 text-xs text-white/52">{label}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[1fr_auto] gap-2">
            <button type="button" className="rounded-md bg-white/12 px-4 py-2.5 text-sm font-medium text-white">
              编辑资料
            </button>
            <button
              type="button"
              onClick={() => onNavigate('creatorCenter', { dev: false })}
              className="inline-flex items-center gap-2 rounded-md bg-white/12 px-3 py-2.5 text-sm font-medium text-white"
            >
              <Lightbulb className="h-4 w-4" />
              创作者中心
            </button>
          </div>
        </section>

        <section className="mx-5 rounded-xl bg-white/[0.06] px-2 py-3">
          <div className="grid grid-cols-5 gap-1 text-center text-xs text-white/76">
            <ProfileAction icon={<ShoppingCart className="h-6 w-6" />} label="订单" />
            <ProfileAction icon={<Lightbulb className="h-6 w-6" />} label="创作者中心" onClick={() => onNavigate('creatorCenter', { dev: false })} featured />
            <ProfileAction icon={<Gamepad2 className="h-6 w-6" />} label="游戏" />
            <ProfileAction icon={<WalletCards className="h-6 w-6" />} label="钱包" />
            <ProfileAction icon={<Grid3X3 className="h-6 w-6" />} label="更多功能" />
          </div>
        </section>

        <nav className="mt-4 grid grid-cols-5 border-b border-white/10 text-center text-sm text-white/58">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={['pb-3', activeTab === tab.id ? 'border-b-2 border-white font-semibold text-white' : ''].join(' ')}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <section className="px-2 py-2">
          {activeTab === 'works' ? (
            <div className="grid grid-cols-3 gap-1.5">
              {displayVideos.map((video, index) => (
                <article key={video.videoId || index} className="relative aspect-[3/4] overflow-hidden rounded bg-zinc-900">
                  {video.videoDataUrl ? (
                    <video src={video.videoDataUrl} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <div className="h-full w-full bg-[radial-gradient(circle_at_35%_25%,rgba(45,212,191,0.38),transparent_30%),radial-gradient(circle_at_74%_62%,rgba(251,146,60,0.32),transparent_34%),linear-gradient(160deg,#020617,#18181b)]" />
                  )}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-2">
                    <p className="line-clamp-2 text-xs leading-4 text-white">{video.videoTitle}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab !== 'works' && activeTab !== 'cards' ? (
            <div className="px-6 py-16 text-center text-sm text-white/48">这里先作为短视频平台个人页内容占位。</div>
          ) : null}

          {activeTab === 'cards' ? (
            <div className="space-y-3 px-3 py-4">
              <CardEntry title="我的卡片" description="保存你从视频里留下的片段" onClick={() => onNavigate('myCards', { dev: false })} />
              <CardEntry title="卡片手账" description="把卡片整理成可分享的手账" onClick={() => onNavigate('clipbook', { dev: false })} />
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function ProfileAction({ icon, label, featured, onClick }: { icon: ReactNode; label: string; featured?: boolean; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="flex flex-col items-center gap-2 rounded-lg px-1 py-2 text-white/80">
      <span className={featured ? 'text-teal-100' : 'text-white/82'}>{icon}</span>
      <span className={featured ? 'font-medium text-teal-50' : ''}>{label}</span>
    </button>
  );
}

function CardEntry({ title, description, onClick }: { title: string; description: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={`打开${title}`} className="flex w-full items-center justify-between rounded-xl bg-white/[0.07] px-4 py-4 text-left">
      <span>
        <span className="block text-base font-semibold text-white">{title}</span>
        <span className="mt-1 block text-sm text-white/52">{description}</span>
      </span>
      <span className="text-lg text-white/45">›</span>
    </button>
  );
}
