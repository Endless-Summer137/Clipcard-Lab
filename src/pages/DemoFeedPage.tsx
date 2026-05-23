import { Bookmark, Heart, MessageCircle, Play, Search, Share2, Star } from 'lucide-react';
import type { KeyboardEvent, MouseEvent, PointerEvent, TouchEvent, WheelEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { runAdGate } from '../core/adGate';
import { runBudgetGate } from '../core/budgetGate';
import { generateSegmentCard } from '../core/cardEngine';
import { saveCard } from '../core/cardStore';
import { recordEvent } from '../core/eventStore';
import type { BudgetResult, CardCoverSource, Keyframe, KeyframeSource, SegmentCard, SegmentSource, TriggerMode } from '../core/types';
import { createVideoObjectUrl } from '../core/videoBlobStore';
import { captureCurrentFrame, captureFrameAt, captureKeyframes } from '../core/videoFrameCapture';
import { CardDetailView, CardQuickPreview } from './CardDetailView';
import { defaultDemoVideos, readDemoConfig, type DemoVideoConfig } from './demoData';

interface DemoFeedPageProps {
  onOpenProfile?: () => void;
  onOpenClipbookTemplate?: (templateId: 'fps' | 'landscape' | 'blank') => void;
}

interface ResolvedSegment {
  segmentStart: number;
  segmentEnd: number;
  segmentSource: SegmentSource;
  triggerMode: TriggerMode;
  coverFrameTime: number;
}

interface ManualSegmentSelection {
  segmentStart: number;
  segmentEnd: number;
  triggerTime: number;
}

interface SegmentSelectionState {
  segmentStart: number;
  segmentEnd: number;
  triggerTime: number;
  duration: number;
}

interface SegmentPreviewState {
  kind: 'start' | 'end';
  time: number;
}

interface CapturedCover {
  coverImage?: string;
  coverFrame?: number;
  coverFrameTime?: number;
  coverSource: CardCoverSource;
}

const LONG_PRESS_MS = 500;
const MIN_SEGMENT_DURATION = 1;

function getRequestedVideoId() {
  return new URLSearchParams(window.location.search).get('videoId');
}

function getRequestedSeekTime() {
  const value = new URLSearchParams(window.location.search).get('time');
  if (value === null) return null;
  const seconds = Number(value);
  return Number.isFinite(seconds) ? Math.max(0, seconds) : null;
}

function findVideoIndex(videos: DemoVideoConfig[], videoId: string | null) {
  if (!videoId) return 0;
  const index = videos.findIndex((item) => item.videoId === videoId);
  return index >= 0 ? index : 0;
}

export function DemoFeedPage({ onOpenProfile, onOpenClipbookTemplate }: DemoFeedPageProps) {
  const [videos, setVideos] = useState<DemoVideoConfig[]>(() => readDemoConfig());
  const [activeIndex, setActiveIndex] = useState(() => findVideoIndex(readDemoConfig(), getRequestedVideoId()));
  const [activeCard, setActiveCard] = useState<SegmentCard | null>(null);
  const [detailCard, setDetailCard] = useState<SegmentCard | null>(null);
  const [cardFeedback, setCardFeedback] = useState('');
  const [isGeneratingCard, setIsGeneratingCard] = useState(false);
  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [segmentSelection, setSegmentSelection] = useState<SegmentSelectionState | null>(null);
  const [segmentPreview, setSegmentPreview] = useState<SegmentPreviewState | null>(null);
  const [requestedSeekTime, setRequestedSeekTime] = useState<number | null>(() => getRequestedSeekTime());
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [videoObjectUrls, setVideoObjectUrls] = useState<Record<string, string>>({});
  const [brokenVideoIds, setBrokenVideoIds] = useState<Set<string>>(() => new Set());
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const previewSeekFrameRef = useRef<number | null>(null);
  const didLongPressRef = useRef(false);
  const wasPlayingBeforeSegmentModeRef = useRef(false);

  const video = videos[activeIndex] ?? defaultDemoVideos[0];
  const videoSrc = brokenVideoIds.has(video.videoId) ? undefined : videoObjectUrls[video.videoId] ?? video.videoDataUrl;

  useEffect(() => {
    const nextVideos = readDemoConfig();
    setVideos(nextVideos);
    setActiveIndex(findVideoIndex(nextVideos, getRequestedVideoId()));
    setRequestedSeekTime(getRequestedSeekTime());
  }, []);

  useEffect(() => {
    let isActive = true;
    const createdUrls: string[] = [];

    async function loadVideoBlobs() {
      const nextUrls: Record<string, string> = {};
      for (const item of videos) {
        if (!item.videoBlobKey) continue;
        try {
          const objectUrl = await createVideoObjectUrl(item.videoBlobKey);
          if (!objectUrl) continue;
          if (!isActive) {
            URL.revokeObjectURL(objectUrl);
            continue;
          }
          createdUrls.push(objectUrl);
          nextUrls[item.videoId] = objectUrl;
        } catch {
          // A missing or blocked Blob should fall back to the demo placeholder instead of blanking the page.
        }
      }
      if (isActive) {
        setBrokenVideoIds(new Set());
        setVideoObjectUrls(nextUrls);
      }
    }

    void loadVideoBlobs();

    return () => {
      isActive = false;
      createdUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [videos]);

  function formatSeconds(seconds: number) {
    const safeSeconds = Math.max(0, Math.round(seconds));
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const remainder = (safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  }

  function switchVideo(direction: 1 | -1) {
    const videoCount = videos.length || 1;
    clearPreviewSeekFrame();
    setActiveCard(null);
    setDetailCard(null);
    setCardFeedback('');
    setSegmentSelection(null);
    setSegmentPreview(null);
    setIsVideoPaused(false);
    setRequestedSeekTime(null);
    setActiveIndex((index) => (index + direction + videoCount) % videoCount);
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function clearPreviewSeekFrame() {
    if (previewSeekFrameRef.current !== null) {
      window.cancelAnimationFrame(previewSeekFrameRef.current);
      previewSeekFrameRef.current = null;
    }
  }

  function stopVideoToggle(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  function seekToRequestedTime(videoElement: HTMLVideoElement) {
    if (requestedSeekTime === null) return;
    const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : requestedSeekTime;
    videoElement.currentTime = Math.max(0, Math.min(requestedSeekTime, duration || requestedSeekTime));
    setRequestedSeekTime(null);
  }

  function toggleVideoPlayback() {
    if (segmentSelection) return;
    const videoElement = videoElementRef.current;
    if (!videoSrc || !videoElement) return;

    if (videoElement.paused) {
      void videoElement.play()
        .then(() => setIsVideoPaused(false))
        .catch(() => setIsVideoPaused(true));
      return;
    }

    videoElement.pause();
    setIsVideoPaused(true);
  }

  function getVideoDuration() {
    const videoElement = videoElementRef.current;
    if (videoElement && Number.isFinite(videoElement.duration) && videoElement.duration > 0) return videoElement.duration;
    return Math.max(video.duration || 0, video.defaultSegmentEnd, video.defaultSegmentStart + 6, 12);
  }

  function getTriggerTime() {
    const videoElement = videoElementRef.current;
    if (videoElement && Number.isFinite(videoElement.currentTime)) return Math.max(0, videoElement.currentTime);
    return Math.max(0, video.defaultSegmentStart + (video.defaultSegmentEnd - video.defaultSegmentStart) / 2);
  }

  function buildDefaultSelection(currentTime = getTriggerTime()): SegmentSelectionState {
    const duration = getVideoDuration();
    const segmentStart = Math.max(0, Math.min(currentTime - 3, duration - MIN_SEGMENT_DURATION));
    const segmentEnd = Math.min(duration, Math.max(segmentStart + MIN_SEGMENT_DURATION, currentTime + 3));
    return {
      segmentStart,
      segmentEnd,
      triggerTime: currentTime,
      duration,
    };
  }

  function enterSegmentMode() {
    if (!video.activityEnabled || isGeneratingCard) return;
    const videoElement = videoElementRef.current;
    const triggerTime = getTriggerTime();
    wasPlayingBeforeSegmentModeRef.current = Boolean(videoElement && !videoElement.paused);
    videoElement?.pause();
    setIsVideoPaused(true);
    setSegmentSelection(buildDefaultSelection(triggerTime));
    setSegmentPreview(null);
    setActiveCard(null);
    setDetailCard(null);
    setCardFeedback('');
  }

  function restoreSegmentModePlayback() {
    const videoElement = videoElementRef.current;
    if (wasPlayingBeforeSegmentModeRef.current && videoElement) {
      void videoElement.play().catch(() => setIsVideoPaused(true));
    }
  }

  function cancelSegmentMode() {
    clearPreviewSeekFrame();
    setSegmentPreview(null);
    setSegmentSelection(null);
    restoreSegmentModePlayback();
  }

  function previewVideoFrame(time: number) {
    const duration = getVideoDuration();
    const targetTime = Math.max(0, Math.min(time, duration));
    clearPreviewSeekFrame();
    previewSeekFrameRef.current = window.requestAnimationFrame(() => {
      const videoElement = videoElementRef.current;
      if (!videoElement) return;

      try {
        videoElement.pause();
        videoElement.currentTime = targetTime;
        setIsVideoPaused(true);
      } finally {
        previewSeekFrameRef.current = null;
      }
    });
  }

  function updateSegmentStart(value: number) {
    let previewTime: number | null = null;
    setSegmentSelection((current) => {
      if (!current) return current;
      const maxStart = Math.max(0, current.segmentEnd - MIN_SEGMENT_DURATION);
      const nextStart = Math.max(0, Math.min(value, maxStart));
      previewTime = nextStart;
      return { ...current, segmentStart: nextStart };
    });
    if (previewTime !== null) {
      setSegmentPreview({ kind: 'start', time: previewTime });
      previewVideoFrame(previewTime);
    }
  }

  function updateSegmentEnd(value: number) {
    let previewTime: number | null = null;
    setSegmentSelection((current) => {
      if (!current) return current;
      const minEnd = Math.min(current.duration, current.segmentStart + MIN_SEGMENT_DURATION);
      const nextEnd = Math.min(current.duration, Math.max(value, minEnd));
      previewTime = nextEnd;
      return { ...current, segmentEnd: nextEnd };
    });
    if (previewTime !== null) {
      setSegmentPreview({ kind: 'end', time: previewTime });
      previewVideoFrame(previewTime);
    }
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
    canvas.width = 480;
    canvas.height = 640;
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
    context.arc(346, 120, 100, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(255,255,255,0.32)';
    context.beginPath();
    context.arc(100, 506, 140, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = 'rgba(24,24,27,0.78)';
    context.font = '600 28px sans-serif';
    drawCoverText(context, video.videoTitle, 38, 434, 374);
    context.font = '400 16px sans-serif';
    context.fillStyle = 'rgba(24,24,27,0.56)';
    context.fillText(`保存帧 ${formatSeconds(frame)}`, 38, 550);
    const webp = canvas.toDataURL('image/webp', 0.72);
    if (webp.startsWith('data:image/webp')) return webp;
    return canvas.toDataURL('image/jpeg', 0.72);
  }

  function getDefaultSegment(triggerMode: TriggerMode): ResolvedSegment {
    return {
      segmentStart: video.defaultSegmentStart,
      segmentEnd: video.defaultSegmentEnd,
      segmentSource: 'default_demo_segment',
      triggerMode,
      coverFrameTime: video.defaultSegmentStart,
    };
  }

  function resolveSegment(triggerMode: TriggerMode, selection?: ManualSegmentSelection): ResolvedSegment {
    const videoElement = videoElementRef.current;

    if (triggerMode === 'long_press' && selection) {
      const start = Math.max(0, Math.min(selection.segmentStart, selection.segmentEnd - MIN_SEGMENT_DURATION));
      return {
        segmentStart: start,
        segmentEnd: Math.max(start + MIN_SEGMENT_DURATION, selection.segmentEnd),
        segmentSource: 'long_press_selection',
        triggerMode,
        coverFrameTime: Math.max(0, selection.triggerTime),
      };
    }

    if (triggerMode === 'long_press') {
      // TODO: replace this fallback once the long-press range picker is wired.
      return getDefaultSegment(triggerMode);
    }

    if (videoSrc && videoElement && videoElement.readyState >= 1 && Number.isFinite(videoElement.currentTime)) {
      const currentTime = videoElement.currentTime;
      const duration = Number.isFinite(videoElement.duration) ? videoElement.duration : Math.max(video.defaultSegmentEnd, currentTime + 1.5);
      const segmentStart = Math.max(0, currentTime - 1.5);
      const segmentEnd = Math.max(segmentStart + 0.1, Math.min(duration, currentTime + 1.5));

      return {
        segmentStart,
        segmentEnd,
        segmentSource: 'short_press_current_time',
        triggerMode,
        coverFrameTime: currentTime,
      };
    }

    return getDefaultSegment(triggerMode);
  }

  async function getCover(segment: ResolvedSegment): Promise<CapturedCover> {
    const videoElement = videoElementRef.current;
    const midpoint = segment.segmentStart + (segment.segmentEnd - segment.segmentStart) / 2;
    const triggerFrameTime = segment.segmentSource === 'short_press_current_time' ? undefined : segment.coverFrameTime;
    const captureAttempts: Array<{ source: CardCoverSource; time?: number }> = [
      { source: 'trigger_frame', time: triggerFrameTime },
      { source: 'segment_start', time: segment.segmentStart },
      { source: 'segment_midpoint', time: midpoint },
    ];

    if (videoSrc && videoElement && videoElement.readyState >= 1) {
      for (const attempt of captureAttempts) {
        const captured = typeof attempt.time === 'number'
          ? await captureFrameAt(videoElement, attempt.time, { maxWidth: 640, quality: 0.72 })
          : await captureCurrentFrame(videoElement, {
          maxWidth: 640,
          quality: 0.72,
        });
        if (captured?.dataUrl) {
          return {
            coverImage: captured.dataUrl,
            coverFrame: captured.frameTime,
            coverFrameTime: captured.frameTime,
            coverSource: attempt.source,
          };
        }
      }
    }

    const fallbackFrameTime = Number.isFinite(segment.coverFrameTime) ? segment.coverFrameTime : midpoint;
    const fallbackImage = createGeneratedCover(fallbackFrameTime);
    return {
      coverImage: fallbackImage || undefined,
      coverFrame: fallbackFrameTime,
      coverFrameTime: fallbackFrameTime,
      coverSource: fallbackImage ? 'demo_placeholder' as const : 'none' as const,
    };
  }

  function getBudgetForSegment(segment: ResolvedSegment): BudgetResult {
    const budgetResult = runBudgetGate({
      videoId: video.videoId,
      triggerMode: segment.triggerMode,
      videoTitle: video.videoTitle,
      videoDescription: video.videoDescription,
      tags: video.tags,
      segmentStart: segment.segmentStart,
      segmentEnd: segment.segmentEnd,
      transcriptExcerpt: video.transcriptExcerpt,
      segmentNote: video.segmentNote,
    });

    if (segment.triggerMode !== 'short_press') return budgetResult;

    return {
      ...budgetResult,
      level: 1,
      frameCount: 1,
      audioStrategy: '3s_around_trigger',
      audioWindowStrategy: '3s_around_trigger',
      costLevel: 'low',
      needsTranscript: false,
      needsOCR: false,
      needsVisualStepAnalysis: false,
      needsTranscriptOrAudio: true,
      reason: '短按活动胶囊只生成 Level 1 轻量瞬间卡，保留触发帧作为视觉证据。',
    };
  }

  function getKeyframeSamples(segment: ResolvedSegment, budgetResult: BudgetResult): Array<{ time: number; source: KeyframeSource }> {
    const start = segment.segmentStart;
    const end = segment.segmentEnd;
    const midpoint = start + (end - start) / 2;
    const triggerTime = Math.max(start, Math.min(segment.coverFrameTime, end));

    if (budgetResult.frameCount === 0) return [] as Array<{ time: number; source: KeyframeSource }>;
    if (budgetResult.frameCount === 1) {
      return [{
        time: segment.triggerMode === 'short_press' ? triggerTime : midpoint,
        source: segment.triggerMode === 'short_press' ? 'trigger_frame' as const : 'segment_midpoint' as const,
      }];
    }
    if (budgetResult.frameCount === 3) {
      return [
        { time: start, source: 'segment_start' as const },
        { time: midpoint, source: 'segment_midpoint' as const },
        { time: end, source: 'segment_end' as const },
      ];
    }

    return [
      { time: start, source: 'segment_start' as const },
      { time: start + (end - start) * 0.25, source: 'sampled_frame' as const },
      { time: midpoint, source: 'segment_midpoint' as const },
      { time: start + (end - start) * 0.75, source: 'sampled_frame' as const },
      { time: end, source: 'segment_end' as const },
    ];
  }

  function keyframeFromCover(cover: CapturedCover): Keyframe[] {
    if (!cover.coverImage || typeof cover.coverFrameTime !== 'number') return [];
    if (!['trigger_frame', 'segment_start', 'segment_midpoint'].includes(cover.coverSource)) return [];
    return [{
      time: cover.coverFrameTime,
      image: cover.coverImage,
      source: cover.coverSource as KeyframeSource,
    }];
  }

  async function getKeyframes(segment: ResolvedSegment, budgetResult: BudgetResult, cover: CapturedCover): Promise<Keyframe[]> {
    const videoElement = videoElementRef.current;

    if (segment.triggerMode === 'short_press') return keyframeFromCover(cover).slice(0, 1);
    if (!videoSrc || !videoElement || videoElement.readyState < 1) return budgetResult.frameCount === 0 ? keyframeFromCover(cover).slice(0, 1) : [];

    const samples = getKeyframeSamples(segment, budgetResult);
    if (samples.length === 0) return keyframeFromCover(cover).slice(0, 1);
    return captureKeyframes(videoElement, samples, {
      maxWidth: 480,
      quality: 0.72,
    });
  }

  async function buildCardFromVideo(triggerMode: TriggerMode = 'short_press', selection?: ManualSegmentSelection) {
    setIsGeneratingCard(true);
    setActiveCard(null);
    setDetailCard(null);
    setCardFeedback('');

    try {
      const segment = resolveSegment(triggerMode, selection);
      const budgetResult = getBudgetForSegment(segment);
      const cover = await getCover(segment);
      const keyframes = await getKeyframes(segment, budgetResult, cover);
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
        segmentStart: segment.segmentStart,
        segmentEnd: segment.segmentEnd,
        segmentSource: segment.segmentSource,
        transcriptExcerpt: video.transcriptExcerpt,
        segmentNote: video.segmentNote,
        budgetResult,
        adDecision,
        sourceAuthor: video.authorName,
        sourceVideoId: video.videoId,
        sourceVideoUrl: video.sourceVideoUrl,
        ...(video.activityEnabled ? {
          activityId: video.activityId,
          activityName: video.activityName,
          activityCta: video.activityCta,
          targetClipbookTemplate: video.targetClipbookTemplate,
        } : {}),
        ...cover,
        keyframes,
      });

      saveCard(card);
      recordEvent({
        eventType: 'card_generated',
        videoId: video.videoId,
        cardId: card.cardId,
        segmentStart: card.segmentStart,
        segmentEnd: card.segmentEnd,
        metadata: {
          budgetLevel: budgetResult.level,
          adDecision: adDecision.decision,
          segmentSource: card.segmentSource,
          activityName: card.activityName,
          targetClipbookTemplate: card.targetClipbookTemplate,
          coverSource: card.coverSource,
          coverFrameTime: card.coverFrameTime,
          keyframeCount: card.keyframes?.length ?? 0,
          frameCount: budgetResult.frameCount,
          costLevel: budgetResult.costLevel,
          hasCoverImage: Boolean(card.coverImage),
        },
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
      if (card.activityName) setCardFeedback(`已生成「${card.activityName}」活动卡片`);
    } finally {
      setIsGeneratingCard(false);
    }
  }

  function recordCardAction(eventType: 'card_shared' | 'card_added_to_clipbook') {
    if (!activeCard) return;
    recordEvent({
      eventType,
      videoId: activeCard.videoId,
      cardId: activeCard.cardId,
      segmentStart: activeCard.segmentStart,
      segmentEnd: activeCard.segmentEnd,
      metadata: {
        activityName: activeCard.activityName,
        targetClipbookTemplate: activeCard.targetClipbookTemplate,
      },
    });

    if (eventType === 'card_shared') setCardFeedback('已生成分享卡片');
    if (eventType === 'card_added_to_clipbook') setCardFeedback('已进入活动手账编辑');
  }

  function normalizeTargetTemplate(value?: string): 'fps' | 'landscape' | 'blank' {
    if (value === 'fps' || value === 'landscape' || value === 'blank') return value;
    return 'blank';
  }

  function addToActivityClipbook() {
    if (!activeCard) return;
    recordCardAction('card_added_to_clipbook');
    onOpenClipbookTemplate?.(normalizeTargetTemplate(activeCard.targetClipbookTemplate));
  }

  function onActivityPointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (!video.activityEnabled || isGeneratingCard || segmentSelection) return;
    didLongPressRef.current = false;
    clearLongPressTimer();
    longPressTimerRef.current = window.setTimeout(() => {
      didLongPressRef.current = true;
      enterSegmentMode();
    }, LONG_PRESS_MS);
  }

  function onActivityPointerUp(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    clearLongPressTimer();
    if (didLongPressRef.current || segmentSelection || isGeneratingCard) return;
    void buildCardFromVideo('short_press');
  }

  function onActivityPointerCancel(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    clearLongPressTimer();
  }

  function onActivityKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    event.stopPropagation();
    if (!isGeneratingCard && !segmentSelection) void buildCardFromVideo('short_press');
  }

  function confirmSegmentCollection() {
    if (!segmentSelection) return;
    clearPreviewSeekFrame();
    const selection = {
      segmentStart: segmentSelection.segmentStart,
      segmentEnd: segmentSelection.segmentEnd,
      triggerTime: segmentSelection.triggerTime,
    };
    setSegmentSelection(null);
    setSegmentPreview(null);
    void buildCardFromVideo('long_press', selection).finally(() => restoreSegmentModePlayback());
  }

  function onWheel(event: WheelEvent<HTMLElement>) {
    if (segmentSelection) return;
    if (Math.abs(event.deltaY) > 24) switchVideo(event.deltaY > 0 ? 1 : -1);
  }

  function onTouchEnd(event: TouchEvent<HTMLElement>) {
    if (segmentSelection) return;
    if (touchStartY === null) return;
    const delta = touchStartY - event.changedTouches[0].clientY;
    if (Math.abs(delta) > 42) switchVideo(delta > 0 ? 1 : -1);
    setTouchStartY(null);
  }

  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (!videoElement || requestedSeekTime === null) return;
    if (videoElement.readyState >= 1) seekToRequestedTime(videoElement);
  }, [activeIndex, requestedSeekTime, videoSrc]);

  useEffect(() => () => {
    clearLongPressTimer();
    clearPreviewSeekFrame();
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-black text-white" onWheel={onWheel} onTouchStart={(event) => setTouchStartY(event.touches[0].clientY)} onTouchEnd={onTouchEnd}>
      <section onClick={toggleVideoPlayback} className="relative mx-auto flex min-h-screen w-full max-w-[430px] flex-col justify-between overflow-hidden bg-black shadow-2xl shadow-black md:my-0">
        {videoSrc ? (
          <video
            ref={videoElementRef}
            key={video.videoId + videoSrc}
            src={videoSrc}
            className="absolute inset-0 h-full w-full bg-black object-contain"
            autoPlay
            muted
            loop
            playsInline
            onLoadedMetadata={(event) => seekToRequestedTime(event.currentTarget)}
            onPlay={() => setIsVideoPaused(false)}
            onPause={() => setIsVideoPaused(true)}
            onError={() => setBrokenVideoIds((current) => new Set(current).add(video.videoId))}
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_25%,rgba(45,212,191,0.42),transparent_28%),radial-gradient(circle_at_70%_55%,rgba(251,146,60,0.34),transparent_32%),linear-gradient(160deg,#020617,#111827_50%,#0f172a)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/75" />
        {videoSrc && isVideoPaused ? (
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <span className="grid h-16 w-16 place-items-center rounded-full bg-black/42 text-white shadow-lg backdrop-blur-sm">
              <Play className="ml-1 h-8 w-8 fill-current" strokeWidth={1.8} />
            </span>
          </div>
        ) : null}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between px-5 pt-5 text-sm font-medium text-white/78 drop-shadow-[0_2px_6px_rgba(0,0,0,0.55)]">
          <div className="flex flex-1 items-center justify-center gap-7 pl-8">
            <span>关注</span>
            <span className="border-b-2 border-white pb-1 text-base font-semibold text-white">推荐</span>
            <span>附近</span>
          </div>
          <Search className="mt-0.5 h-6 w-6 text-white" strokeWidth={2.2} aria-hidden="true" />
        </header>
        {!videoSrc ? (
          <div className="relative z-10 flex flex-1 items-center justify-center px-6 text-center">
            <div className="rounded-xl border border-white/15 bg-black/20 px-5 py-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.2em] text-white/55">Demo Placeholder</p>
              <h1 className="mt-3 text-2xl font-semibold">{video.videoTitle}</h1>
              <p className="mt-3 text-sm leading-6 text-white/70">{video.videoDescription}</p>
            </div>
          </div>
        ) : <div className="flex-1" />}
        <aside onClick={stopVideoToggle} className="absolute bottom-24 right-4 z-20 flex flex-col items-center gap-5">
          <div className="h-11 w-11 overflow-hidden rounded-full border-2 border-white/90 bg-white/15 shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            <div className="h-full w-full bg-gradient-to-br from-white/60 via-teal-200/40 to-orange-200/45" />
          </div>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="喜欢">
            <Heart className="h-8 w-8" strokeWidth={2.1} />
          </button>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="评论">
            <MessageCircle className="h-8 w-8" strokeWidth={2.1} />
          </button>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="收藏">
            <Star className="h-8 w-8" strokeWidth={2.1} />
          </button>
          <button className="text-white drop-shadow-[0_2px_7px_rgba(0,0,0,0.65)]" type="button" aria-label="分享">
            <Share2 className="h-8 w-8" strokeWidth={2.1} />
          </button>
        </aside>
        <section className="relative z-10 px-5 pb-20">
          {video.activityEnabled && video.activityName ? (
            <button
              type="button"
              disabled={isGeneratingCard}
              onPointerDown={onActivityPointerDown}
              onPointerUp={onActivityPointerUp}
              onPointerLeave={onActivityPointerCancel}
              onPointerCancel={onActivityPointerCancel}
              onKeyDown={onActivityKeyDown}
              onClick={(event) => {
                event.stopPropagation();
                event.preventDefault();
              }}
              onTouchStart={(event) => event.stopPropagation()}
              onTouchEnd={(event) => event.stopPropagation()}
              className="mb-3 inline-flex max-w-[86%] items-center gap-2 rounded-full border border-white/35 bg-white/82 px-3 py-2 text-left text-xs font-semibold text-stone-900 shadow-lg shadow-black/18 backdrop-blur transition hover:bg-white disabled:opacity-70"
              aria-label={`${video.activityName} ${video.activityCta ?? '加入这一刻'}`}
            >
              <Bookmark className="h-4 w-4 shrink-0" strokeWidth={2.1} />
              <span className="truncate">{video.activityName} · {video.activityCta ?? '加入这一刻'}</span>
            </button>
          ) : null}
          <p className="text-sm font-semibold">{video.authorName}</p>
          <p className="mt-2 max-w-[78%] text-sm leading-6 text-white/82">{video.videoDescription}</p>
        </section>
        {segmentSelection ? (
          <section
            onClick={stopVideoToggle}
            onPointerDown={(event) => event.stopPropagation()}
            className="absolute inset-x-3 bottom-16 z-30 rounded-2xl border border-white/18 bg-black/68 p-4 text-white shadow-2xl backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-sm font-semibold">选择要收集的片段</h2>
                <p className="mt-1 text-xs text-white/62">当前长度：{Math.max(0, segmentSelection.segmentEnd - segmentSelection.segmentStart).toFixed(1)} 秒</p>
                <p className="mt-1 text-xs text-white/62">拖动起点或终点，可在视频中预览对应画面。</p>
              </div>
              <span className="rounded-full bg-white/12 px-2.5 py-1 text-xs text-white/78">
                {formatSeconds(segmentSelection.segmentStart)} - {formatSeconds(segmentSelection.segmentEnd)}
              </span>
            </div>
            {segmentPreview ? (
              <p className="mt-3 rounded-full bg-white/12 px-3 py-1.5 text-xs font-medium text-white">
                正在预览{segmentPreview.kind === 'start' ? '起点' : '终点'} {formatSeconds(segmentPreview.time)}
              </p>
            ) : null}
            <div className="mt-4 grid gap-3">
              <label className="block text-xs text-white/78">
                起点：{formatSeconds(segmentSelection.segmentStart)}
                <input
                  type="range"
                  min={0}
                  max={segmentSelection.duration}
                  step={0.1}
                  value={segmentSelection.segmentStart}
                  onChange={(event) => updateSegmentStart(Number(event.target.value))}
                  className="mt-2 w-full accent-white"
                />
              </label>
              <label className="block text-xs text-white/78">
                终点：{formatSeconds(segmentSelection.segmentEnd)}
                <input
                  type="range"
                  min={0}
                  max={segmentSelection.duration}
                  step={0.1}
                  value={segmentSelection.segmentEnd}
                  onChange={(event) => updateSegmentEnd(Number(event.target.value))}
                  className="mt-2 w-full accent-white"
                />
              </label>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button type="button" onClick={cancelSegmentMode} className="rounded-full bg-white/12 px-4 py-2.5 text-sm font-medium text-white">
                取消
              </button>
              <button type="button" onClick={confirmSegmentCollection} className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-stone-950">
                确认收集
              </button>
            </div>
          </section>
        ) : null}
        <footer onClick={stopVideoToggle} className="absolute bottom-0 left-0 right-0 z-20 grid grid-cols-5 border-t border-white/12 bg-[rgba(18,18,18,0.82)] px-2 py-3 text-center text-xs text-white/82 shadow-[0_-10px_28px_rgba(15,23,42,0.18)] backdrop-blur-[14px]">
          <button type="button" className="font-semibold text-white">首页</button>
          <button type="button">朋友</button>
          <button type="button" className="text-lg leading-none text-white">+</button>
          <button type="button">消息</button>
          <button type="button" onClick={onOpenProfile}>我</button>
        </footer>
        <div onClick={stopVideoToggle} className="absolute right-2 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
          {videos.map((item, index) => <button key={item.videoId || index} type="button" onClick={() => { setActiveCard(null); setDetailCard(null); setCardFeedback(''); setIsVideoPaused(false); setRequestedSeekTime(null); setActiveIndex(index); }} className={'h-2 w-2 rounded-full ' + (activeIndex === index ? 'bg-white' : 'bg-white/35')} aria-label={`切换视频 ${index + 1}`} />)}
        </div>
      </section>
      {isGeneratingCard ? (
        <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-4">
          <p className="rounded-full bg-white/92 px-4 py-2 text-sm font-medium text-stone-800 shadow-lg backdrop-blur">
            正在收集这一刻……
          </p>
        </div>
      ) : null}
      {activeCard ? (
        <CardQuickPreview
          card={activeCard}
          feedback={cardFeedback}
          onClose={() => setActiveCard(null)}
          onAddToActivityClipbook={addToActivityClipbook}
          onShare={() => recordCardAction('card_shared')}
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
