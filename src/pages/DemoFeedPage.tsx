import { Bookmark, Heart, MessageCircle, Search, Share2, Star } from 'lucide-react';
import type { TouchEvent, WheelEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { runAdGate } from '../core/adGate';
import { runBudgetGate } from '../core/budgetGate';
import { generateSegmentCard } from '../core/cardEngine';
import { saveCard } from '../core/cardStore';
import { recordEvent } from '../core/eventStore';
import type { SegmentCard } from '../core/types';
import { CardDetailView, CardQuickPreview } from './CardDetailView';
import { defaultDemoVideos, readDemoConfig, type DemoVideoConfig } from './demoData';

interface DemoFeedPageProps {
  onOpenProfile?: () => void;
}

export function DemoFeedPage({ onOpenProfile }: DemoFeedPageProps) {
  const [videos, setVideos] = useState<DemoVideoConfig[]>(() => readDemoConfig());
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeCard, setActiveCard] = useState<SegmentCard | null>(null);
  const [detailCard, setDetailCard] = useState<SegmentCard | null>(null);
  const [cardFeedback, setCardFeedback] = useState('');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [showSaveHint, setShowSaveHint] = useState(true);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

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
    setDetailCard(null);
    setCardFeedback('');
    setActiveIndex((index) => (index + direction + 3) % 3);
  }

  function drawVideoFrame(videoElement: HTMLVideoElement) {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const context = canvas.getContext('2d');
    if (!context || !videoElement.videoWidth || !videoElement.videoHeight) return '';

    const scale = Math.max(canvas.width / videoElement.videoWidth, canvas.height / videoElement.videoHeight);
    const width = videoElement.videoWidth * scale;
    const height = videoElement.videoHeight * scale;
    const x = (canvas.width - width) / 2;
    const y = (canvas.height - height) / 2;
    context.drawImage(videoElement, x, y, width, height);
    return canvas.toDataURL('image/jpeg', 0.82);
  }

  function seekVideo(videoElement: HTMLVideoElement, time: number) {
    return new Promise<void>((resolve) => {
      const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : time;
      const target = Math.max(0, Math.min(time, duration || time));
      const finish = () => {
        window.clearTimeout(timeout);
        videoElement.removeEventListener('seeked', finish);
        resolve();
      };
      const timeout = window.setTimeout(finish, 700);
      videoElement.addEventListener('seeked', finish, { once: true });
      videoElement.currentTime = target;
    });
  }

  async function captureVideoFrameAt(videoElement: HTMLVideoElement, time: number) {
    const originalTime = videoElement.currentTime;
    const wasPaused = videoElement.paused;
    await seekVideo(videoElement, time);
    const image = drawVideoFrame(videoElement);
    await seekVideo(videoElement, originalTime);
    if (!wasPaused) void videoElement.play();
    return image;
  }

  function drawCoverText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number) {
    const chars = Array.from(text);
    let line = '';
    let top = y;
    let lineCount = 0;

    chars.forEach((char) => {
      const nextLine = line + char;
      if (context.measureText(nextLine).width > maxWidth && line) {
        context.fillText(line, x, top);
        line = char;
        top += 46;
        lineCount += 1;
      } else {
        line = nextLine;
      }
    });

    if (line && lineCount < 2) context.fillText(line, x, top);
  }

  function createGeneratedCover(frame: number) {
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const context = canvas.getContext('2d');
    if (!context) return '';

    const palettes = [
      ['#fff4d6', '#b7f3d1', '#f6a55f'],
      ['#e0f2fe', '#172554', '#22d3ee'],
      ['#edf7ef', '#bfdbfe', '#86efac'],
    ];
    const palette = palettes[activeIndex] ?? palettes[0];
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, palette[0]);
    gradient.addColorStop(0.58, palette[1]);
    gradient.addColorStop(1, palette[2]);
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = 'rgba(255,255,255,0.42)';
    context.beginPath();
    context.arc(520, 180, 150, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.32)';
    context.beginPath();
    context.arc(150, 760, 210, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(24,24,27,0.78)';
    context.font = '600 42px sans-serif';
    drawCoverText(context, video.videoTitle, 56, 650, 560);
    context.font = '400 24px sans-serif';
    context.fillStyle = 'rgba(24,24,27,0.56)';
    context.fillText(`保存帧 ${formatSeconds(frame)}`, 56, 825);
    return canvas.toDataURL('image/jpeg', 0.88);
  }

  async function getCover(mode: 'current_frame' | 'segment_start_frame') {
    const videoElement = videoElementRef.current;
    const frame = mode === 'segment_start_frame'
      ? video.defaultSegmentStart
      : videoElement?.currentTime ?? video.defaultSegmentStart;

    if (video.videoDataUrl && videoElement && videoElement.readyState >= 2 && videoElement.videoWidth) {
      const coverImage = mode === 'segment_start_frame'
        ? await captureVideoFrameAt(videoElement, frame)
        : drawVideoFrame(videoElement);

      if (coverImage) return { coverImage, coverFrame: frame, coverSource: mode };
    }

    return {
      coverImage: createGeneratedCover(frame),
      coverFrame: frame,
      coverSource: 'generated_placeholder' as const,
    };
  }

  async function buildCardFromVideo(mode: 'current_frame' | 'segment_start_frame' = 'current_frame') {
    setIsGeneratingCard(true);
    setActiveCard(null);
    setDetailCard(null);
    setCardFeedback('');

    try {
      const cover = await getCover(mode);
      const budgetResult = runBudgetGate({
        videoId: video.videoId,
        triggerMode: mode === 'segment_start_frame' ? 'long_press' : 'short_press',
        videoTitle: video.videoTitle,
        videoDescription: video.videoDescription,
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
        ...cover,
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
    } finally {
      setIsGeneratingCard(false);
    }
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function onBookmarkPointerDown() {
    longPressTriggeredRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      void buildCardFromVideo('segment_start_frame');
    }, 650);
  }

  function onBookmarkPointerUp() {
    clearLongPressTimer();
  }

  function onBookmarkClick() {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }

    void buildCardFromVideo('current_frame');
  }

  function recordCardAction(eventType: 'card_saved' | 'card_shared' | 'card_added_to_clipbook') {
    if (!activeCard) return;
    if (eventType === 'card_saved') saveCard(activeCard);
    recordEvent({
      eventType,
      videoId: activeCard.videoId,
      cardId: activeCard.cardId,
      segmentStart: activeCard.segmentStart,
      segmentEnd: activeCard.segmentEnd,
    });

    if (eventType === 'card_saved') setCardFeedback('已保存到我的卡片');
    if (eventType === 'card_shared') setCardFeedback('已生成分享卡片');
    if (eventType === 'card_added_to_clipbook') setCardFeedback('已记录加入手账，稍后可去卡片手账排版');
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
          <video ref={videoElementRef} key={video.videoId + video.videoDataUrl} src={video.videoDataUrl} className="absolute inset-0 h-full w-full object-cover" autoPlay muted loop playsInline />
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
            <button
              className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]"
              type="button"
              onPointerDown={onBookmarkPointerDown}
              onPointerUp={onBookmarkPointerUp}
              onPointerLeave={clearLongPressTimer}
              onPointerCancel={clearLongPressTimer}
              onClick={onBookmarkClick}
              aria-label="保存这一刻"
            >
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
        <footer className="absolute bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-white/12 bg-[rgba(18,18,18,0.82)] px-2 py-3 text-center text-xs text-white/82 shadow-[0_-10px_28px_rgba(15,23,42,0.18)] backdrop-blur-[14px]">
          <button type="button" className="font-semibold text-white">首页</button>
          <button type="button">朋友</button>
          <button type="button" className="text-lg leading-none text-white">+</button>
          <button type="button">消息</button>
          <button type="button" onClick={onOpenProfile}>我</button>
        </footer>
        <div className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          {[0, 1, 2].map((index) => <button key={index} type="button" onClick={() => { setActiveCard(null); setDetailCard(null); setCardFeedback(''); setActiveIndex(index); }} className={'h-2 w-2 rounded-full ' + (activeIndex === index ? 'bg-white' : 'bg-white/35')} aria-label={`切换视频 ${index + 1}`} />)}
        </div>
      </section>
      {isGeneratingCard ? (
        <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <p className="rounded-full bg-white/92 px-4 py-2 text-sm font-medium text-stone-800 shadow-lg backdrop-blur">
            正在生成片段卡……
          </p>
        </div>
      ) : null}
      {activeCard ? (
        <CardQuickPreview
          card={activeCard}
          feedback={cardFeedback}
          onClose={() => setActiveCard(null)}
          onSave={() => recordCardAction('card_saved')}
          onShare={() => recordCardAction('card_shared')}
          onAddToClipbook={() => recordCardAction('card_added_to_clipbook')}
          onOpenDetail={() => setDetailCard(activeCard)}
        />
      ) : null}
      {detailCard ? (
        <CardDetailView
          card={detailCard}
          onClose={() => setDetailCard(null)}
          onDeleted={() => {
            setDetailCard(null);
            setActiveCard(null);
          }}
        />
      ) : null}
    </main>
  );
}
