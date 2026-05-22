import { Bookmark, Heart, MessageCircle, Search, Share2, Star } from 'lucide-react';
import type { TouchEvent, WheelEvent } from 'react';
import { useEffect, useState } from 'react';
import { runAdGate } from '../core/adGate';
import { runBudgetGate } from '../core/budgetGate';
import { generateSegmentCard } from '../core/cardEngine';
import { saveCard } from '../core/cardStore';
import { recordEvent } from '../core/eventStore';
import type { SegmentCard } from '../core/types';
import { defaultDemoVideos, readDemoConfig, type DemoVideoConfig } from './demoData';

interface DemoFeedPageProps {
  onOpenProfile?: () => void;
}

export function DemoFeedPage({ onOpenProfile }: DemoFeedPageProps) {
  const [videos, setVideos] = useState<DemoVideoConfig[]>(() => readDemoConfig());
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCard, setActiveCard] = useState<SegmentCard | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [showSaveHint, setShowSaveHint] = useState(true);

  const video = videos[activeIndex] ?? defaultDemoVideos[0];

  useEffect(() => {
    setVideos(readDemoConfig());
    const timer = window.setTimeout(() => setShowSaveHint(false), 1200);
    return () => window.clearTimeout(timer);
  }, []);

  function formatSeconds(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const remainder = (safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function switchVideo(direction: 1 | -1) {
    setActiveCard(null);
    setActiveIndex((index) => (index + direction + 3) % 3);
  }

  function buildCardFromVideo() {
    const budgetResult = runBudgetGate({
      videoId: video.videoId,
      tags: video.tags,
      segmentStart: video.defaultSegmentStart,
      segmentEnd: video.defaultSegmentEnd,
      transcriptExcerpt: video.transcriptExcerpt,
      segmentNote: video.segmentNote,
    });
    const adDecision = runAdGate({
      videoId: video.videoId,
      tags: video.tags,
      cardType: 'pending',
      segmentNote: video.segmentNote,
      transcriptExcerpt: video.transcriptExcerpt,
      adCandidate: video.adCandidate,
    });
    const card = generateSegmentCard({
      videoId: video.videoId,
      videoTitle: video.videoTitle,
      videoDescription: video.videoDescription,
      tags: video.tags,
      segmentStart: video.defaultSegmentStart,
      segmentEnd: video.defaultSegmentEnd,
      transcriptExcerpt: video.transcriptExcerpt,
      segmentNote: video.segmentNote,
      budgetResult,
      adDecision,
    });

    saveCard(card);
    recordEvent({
      eventType: 'card_generated',
      videoId: video.videoId,
      cardId: card.cardId,
      segmentStart: card.segmentStart,
      segmentEnd: card.segmentEnd,
      metadata: { budgetLevel: budgetResult.level, adDecision: adDecision.decision },
    });
    if (adDecision.decision === 'allow') {
      recordEvent({
        eventType: 'ad_shown',
        videoId: video.videoId,
        cardId: card.cardId,
        segmentStart: card.segmentStart,
        segmentEnd: card.segmentEnd,
        metadata: { adCandidate: video.adCandidate, adLabel: adDecision.adLabel },
      });
    }
    setActiveCard(card);
  }

  function recordCardAction(eventType: 'card_saved' | 'card_shared' | 'card_added_to_clipbook') {
    if (!activeCard) return;
    recordEvent({
      eventType,
      videoId: activeCard.videoId,
      cardId: activeCard.cardId,
      segmentStart: activeCard.segmentStart,
      segmentEnd: activeCard.segmentEnd,
    });
  }

  function onWheel(event: WheelEvent<HTMLElement>) {
    if (Math.abs(event.deltaY) > 24) switchVideo(event.deltaY > 0 ? 1 : -1);
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (touchStartY === null) return;
    const delta = touchStartY - event.changedTouches[0].clientY;
    if (Math.abs(delta) > 42) switchVideo(delta > 0 ? 1 : -1);
    setTouchStartY(null);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white" onWheel={onWheel} onTouchStart={(event) => setTouchStartY(event.touches[0].clientY)} onTouchEnd={onTouchEnd}>
      <section className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-between overflow-hidden bg-slate-950 shadow-2xl shadow-black md:my-0">
        {video.videoDataUrl ? (
          <video key={video.videoId + video.videoDataUrl} src={video.videoDataUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(45,212,191,0.42),transparent_28%),radial-gradient(circle_at_70%_55%,rgba(251,146,60,0.34),transparent_32%),linear-gradient(160deg,#020617,#111827_50%,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/75" />
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-5 text-sm font-medium text-white/78 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
          <div className="flex flex-1 items-center justify-center gap-7 pl-8">
            <span>关注</span>
            <span className="border-b-2 border-white pb-1 text-base font-semibold text-white">推荐</span>
            <span>附近</span>
          </div>
          <Search className="mt-0.5 h-6 w-6 text-white" strokeWidth={2.2} aria-hidden="true" />
        </header>
        {!video.videoDataUrl ? (
          <div className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
            <div className="rounded-xl border border-white/15 bg-black/20 px-5 py-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.2em] text-white/55">Demo Placeholder</p>
              <h1 className="mt-3 text-2xl font-semibold">{video.videoTitle}</h1>
              <p className="mt-3 text-sm leading-6 text-white/70">{video.videoDescription}</p>
            </div>
          </div>
        ) : <div className="flex-1" />}
        <aside className="absolute bottom-24 right-4 z-20 flex flex-col items-center gap-5">
          <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white/90 bg-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            <div className="h-full w-full bg-gradient-to-br from-white/60 via-teal-200/40 to-orange-200/45" />
          </div>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="喜欢">
            <Heart className="h-8 w-8" strokeWidth={2.1} />
          </button>
          <div className="relative">
            {showSaveHint ? (
              <span className="pointer-events-none absolute right-9 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-black/70 px-2.5 py-1 text-xs text-white shadow-lg backdrop-blur">
                保存这一刻
              </span>
            ) : null}
            <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" onClick={buildCardFromVideo} aria-label="保存这一刻">
              <Bookmark className="h-8 w-8" strokeWidth={2.1} />
            </button>
          </div>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="收藏">
            <Star className="h-8 w-8" strokeWidth={2.1} />
          </button>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="评论">
            <MessageCircle className="h-8 w-8" strokeWidth={2.1} />
          </button>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="分享">
            <Share2 className="h-8 w-8" strokeWidth={2.1} />
          </button>
        </aside>
        <section className="relative z-10 px-5 pb-20">
          <p className="text-sm font-semibold">{video.authorName}</p>
          <p className="mt-2 max-w-[78%] text-sm leading-6 text-white/82">{video.videoDescription}</p>
        </section>
        <footer className="absolute bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-white/10 bg-black/35 px-2 py-3 text-center text-xs text-white/70 backdrop-blur">
          <button type="button" className="font-semibold text-white">首页</button>
          <button type="button">朋友</button>
          <button type="button" className="text-lg leading-none text-white">+</button>
          <button type="button">消息</button>
          <button type="button" onClick={onOpenProfile}>我</button>
        </footer>
        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          {[0, 1, 2].map((index) => <button key={index} type="button" onClick={() => { setActiveCard(null); setActiveIndex(index); }} className={'h-2 w-2 rounded-full ' + (activeIndex === index ? 'bg-white' : 'bg-white/35')} aria-label={`切换视频 ${index + 1}`} />)}
        </div>
      </section>
      {activeCard ? (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-black/28 px-3 pb-20">
          <article className="w-full max-w-[390px] rounded-2xl border border-white/12 bg-zinc-950/92 p-4 text-white shadow-2xl backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-white/55">
                  {formatSeconds(activeCard.segmentStart)} - {formatSeconds(activeCard.segmentEnd)}
                </p>
                <h2 className="mt-1 text-base font-semibold leading-6">{activeCard.title}</h2>
              </div>
              <button type="button" onClick={() => setActiveCard(null)} className="text-xl leading-none text-white/60" aria-label="关闭片段卡">
                ×
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-white/76">{activeCard.summary}</p>
            <div className="mt-4 flex gap-2 text-sm">
              <button type="button" onClick={() => recordCardAction('card_saved')} className="flex-1 rounded-md bg-white px-3 py-2 font-medium text-zinc-950">保存</button>
              <button type="button" onClick={() => recordCardAction('card_shared')} className="flex-1 rounded-md border border-white/18 px-3 py-2 text-white">分享</button>
              <button type="button" onClick={() => recordCardAction('card_added_to_clipbook')} className="flex-1 rounded-md border border-white/18 px-3 py-2 text-white">加入手账</button>
            </div>
          </article>
        </div>
      ) : null}
    </main>
  );
}
