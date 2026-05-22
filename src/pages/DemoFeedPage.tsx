import { Bookmark, MessageCircle, Share2 } from 'lucide-react';
import type { ChangeEvent, TouchEvent, WheelEvent } from 'react';
import { useEffect, useState } from 'react';
import { runAdGate } from '../core/adGate';
import { runBudgetGate } from '../core/budgetGate';
import { generateSegmentCard } from '../core/cardEngine';
import { saveCard } from '../core/cardStore';
import { recordEvent } from '../core/eventStore';
import type { SegmentCard } from '../core/types';
import { defaultDemoVideos, parseTags, readDemoConfig, readFileAsDataUrl, saveDemoConfig, type DemoVideoConfig } from './demoData';

export function DemoFeedPage() {
  const [videos, setVideos] = useState<DemoVideoConfig[]>(() => readDemoConfig());
  const [activeIndex, setActiveIndex] = useState(0);
  const [configMode, setConfigMode] = useState(false);
  const [activeCard, setActiveCard] = useState<SegmentCard | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  const video = videos[activeIndex] ?? defaultDemoVideos[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        setConfigMode((value) => !value);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function switchVideo(direction: 1 | -1) {
    setActiveCard(null);
    setActiveIndex((index) => (index + direction + 3) % 3);
  }

  function updateVideo(index: number, patch: Partial<DemoVideoConfig>) {
    setVideos((current) => {
      const next = current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
      saveDemoConfig(next);
      return next;
    });
  }

  async function onVideoUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    updateVideo(index, { videoDataUrl: await readFileAsDataUrl(file) });
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
      <section className="relative mx-auto flex min-h-screen max-w-md flex-col justify-between overflow-hidden bg-slate-950 md:max-w-lg">
        {video.videoDataUrl ? (
          <video key={video.videoId + video.videoDataUrl} src={video.videoDataUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(45,212,191,0.42),transparent_28%),radial-gradient(circle_at_70%_55%,rgba(251,146,60,0.34),transparent_32%),linear-gradient(160deg,#020617,#111827_50%,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/75" />
        <header className="relative z-10 flex justify-center gap-6 px-5 pt-5 text-sm font-medium text-white/75">
          <span>关注</span><span className="border-b-2 border-white pb-1 text-white">推荐</span><span>附近</span>
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
        <aside className="absolute bottom-28 right-4 z-20 flex flex-col items-center gap-4 text-xs">
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur" type="button"><MessageCircle className="h-5 w-5" /></button>
          <button className="grid h-11 w-11 place-items-center rounded-full bg-white/15 backdrop-blur" type="button"><Share2 className="h-5 w-5" /></button>
          <button className="grid h-12 w-12 place-items-center rounded-full bg-teal-300 text-slate-950" type="button" onClick={buildCardFromVideo} aria-label="保存这一刻"><Bookmark className="h-5 w-5" /></button>
          <span className="w-16 text-center text-[11px] leading-4">保存这一刻</span>
        </aside>
        <section className="relative z-10 px-5 pb-20">
          <p className="text-sm font-semibold">{video.authorName}</p>
          <p className="mt-2 max-w-[78%] text-sm leading-6 text-white/82">{video.videoDescription}</p>
          <p className="mt-2 text-xs text-white/55">{video.defaultSegmentStart}s - {video.defaultSegmentEnd}s</p>
          {activeCard ? (
            <div className="mt-4 max-w-[86%] rounded-lg border border-teal-300/30 bg-black/55 p-3 backdrop-blur">
              <p className="text-sm font-semibold text-teal-100">{activeCard.title}</p>
              <p className="mt-1 text-xs leading-5 text-white/75">{activeCard.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <button type="button" onClick={() => recordCardAction('card_saved')} className="rounded bg-white/15 px-2 py-1">保存</button>
                <button type="button" onClick={() => recordCardAction('card_shared')} className="rounded bg-white/15 px-2 py-1">分享</button>
                <button type="button" onClick={() => recordCardAction('card_added_to_clipbook')} className="rounded bg-white/15 px-2 py-1">加入手账</button>
              </div>
            </div>
          ) : null}
        </section>
        <footer className="absolute bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-white/10 bg-black/35 px-2 py-3 text-center text-xs text-white/70 backdrop-blur">
          <span>首页</span><span>朋友</span><span>+</span><span>消息</span><span>我</span>
        </footer>
        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          {[0, 1, 2].map((index) => <button key={index} type="button" onClick={() => { setActiveCard(null); setActiveIndex(index); }} className={'h-2 w-2 rounded-full ' + (activeIndex === index ? 'bg-white' : 'bg-white/35')} aria-label={`切换视频 ${index + 1}`} />)}
        </div>
      </section>
      {configMode ? (
        <section className="absolute inset-x-0 bottom-0 z-30 mx-auto max-h-[72vh] max-w-5xl overflow-auto rounded-t-2xl border border-white/10 bg-slate-950/95 p-5 text-slate-100 shadow-2xl backdrop-blur">
          <h2 className="text-lg font-semibold">隐藏原始素材配置</h2>
          <p className="mt-1 text-sm text-slate-400">再次按 Ctrl+U 退出。这里只能配置原始输入材料，最终卡片由 cardEngine 生成。</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {videos.map((item, index) => (
              <div key={item.videoId || index} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
                <h3 className="font-semibold">演示视频 {index + 1}</h3>
                <label className="mt-3 block text-sm">视频文件<input type="file" accept="video/mp4,video/webm" onChange={(event) => onVideoUpload(index, event)} className="mt-2 w-full text-sm" /></label>
                <label className="mt-3 block text-sm">videoId<input value={item.videoId} onChange={(event) => updateVideo(index, { videoId: event.target.value })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                <label className="mt-3 block text-sm">videoTitle<input value={item.videoTitle} onChange={(event) => updateVideo(index, { videoTitle: event.target.value })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                <label className="mt-3 block text-sm">videoDescription<textarea value={item.videoDescription} onChange={(event) => updateVideo(index, { videoDescription: event.target.value })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                <label className="mt-3 block text-sm">tags<input value={item.tags.join(',')} onChange={(event) => updateVideo(index, { tags: parseTags(event.target.value) })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <label className="block text-sm">start<input type="number" value={item.defaultSegmentStart} onChange={(event) => updateVideo(index, { defaultSegmentStart: Number(event.target.value) })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                  <label className="block text-sm">end<input type="number" value={item.defaultSegmentEnd} onChange={(event) => updateVideo(index, { defaultSegmentEnd: Number(event.target.value) })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                </div>
                <label className="mt-3 block text-sm">transcriptExcerpt<textarea value={item.transcriptExcerpt} onChange={(event) => updateVideo(index, { transcriptExcerpt: event.target.value })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                <label className="mt-3 block text-sm">segmentNote<textarea value={item.segmentNote} onChange={(event) => updateVideo(index, { segmentNote: event.target.value })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
                <label className="mt-3 block text-sm">adCandidate<input value={item.adCandidate} onChange={(event) => updateVideo(index, { adCandidate: event.target.value })} className="mt-2 w-full rounded bg-slate-900 p-2" /></label>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
