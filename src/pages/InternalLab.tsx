import { useEffect, useMemo, useState } from 'react';
import { runAdGate } from '../core/adGate';
import { getBudgetGateAcceptanceCases, runBudgetGate } from '../core/budgetGate';
import { generateSegmentCard } from '../core/cardEngine';
import { getCards } from '../core/cardStore';
import { getEvents } from '../core/eventStore';
import type { AnalyzeFramesResponse, Keyframe, VisionAnalysis, VisionProvider } from '../core/types';
import { defaultDemoVideos } from './demoData';

interface VisionApiStatus {
  configuredProvider?: VisionProvider;
  provider?: VisionProvider;
  todayCallCount?: number;
  attemptedCallCount?: number;
  successCallCount?: number;
  fallback?: boolean;
  recentVisionAnalysis?: VisionAnalysis;
  recentKeyframes?: Keyframe[];
  error?: string;
  debug?: AnalyzeFramesResponse['debug'];
}

export function InternalLab() {
  const [videoId, setVideoId] = useState(defaultDemoVideos[0].videoId);
  const [visionStatus, setVisionStatus] = useState<VisionApiStatus | null>(null);
  const video = defaultDemoVideos.find((item) => item.videoId === videoId) ?? defaultDemoVideos[0];
  const budget = useMemo(() => runBudgetGate({
    videoId: video.videoId,
    triggerMode: 'long_press',
    videoTitle: video.videoTitle,
    videoDescription: video.videoDescription,
    tags: video.tags,
    segmentStart: video.defaultSegmentStart,
    segmentEnd: video.defaultSegmentEnd,
    transcriptExcerpt: video.transcriptExcerpt,
    segmentNote: video.segmentNote,
  }), [video]);
  const adDecision = useMemo(() => runAdGate({
    videoId: video.videoId,
    tags: video.tags,
    cardType: 'internal-preview',
    segmentNote: video.segmentNote,
    transcriptExcerpt: video.transcriptExcerpt,
    adCandidate: video.adCandidate,
  }), [video]);
  const card = useMemo(() => generateSegmentCard({
    videoId: video.videoId,
    videoTitle: video.videoTitle,
    videoDescription: video.videoDescription,
    tags: video.tags,
    segmentStart: video.defaultSegmentStart,
    segmentEnd: video.defaultSegmentEnd,
    segmentSource: 'default_demo_segment',
    transcriptExcerpt: video.transcriptExcerpt,
    segmentNote: video.segmentNote,
    budgetResult: budget,
    adDecision,
  }), [adDecision, budget, video]);
  const events = getEvents();
  const cards = getCards();
  const latestFrameCard = cards.find((item) => item.keyframes?.length || item.budgetResult);
  const recentVisionAnalysis = visionStatus?.recentVisionAnalysis ?? latestFrameCard?.visionAnalysis;
  const recentKeyframes = visionStatus?.recentKeyframes ?? latestFrameCard?.keyframes;
  const budgetCases = getBudgetGateAcceptanceCases();

  useEffect(() => {
    let active = true;
    fetch('/api/analyze-frames/status')
      .then((response) => response.ok ? response.json() as Promise<VisionApiStatus> : null)
      .then((status) => {
        if (active && status) setVisionStatus(status);
      })
      .catch(() => {
        if (active) setVisionStatus({ configuredProvider: 'zhipu', provider: 'zhipu', fallback: true, error: '无法读取视觉分析后端状态。' });
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold">内部机制页</h1>
        <p className="mt-2 text-sm text-slate-400">用于答辩解释预算闸门、广告闸门和成本逻辑；不是用户端页面。</p>
        <select value={videoId} onChange={(event) => setVideoId(event.target.value)} className="mt-5 rounded-md border border-white/10 bg-slate-900 px-3 py-2">
          {defaultDemoVideos.map((item) => <option key={item.videoId} value={item.videoId}>{item.videoTitle}</option>)}
        </select>
        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold">budgetGate</h2>
            <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(budget, null, 2)}</pre>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold">adGate</h2>
            <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(adDecision, null, 2)}</pre>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold">cardEngine preview</h2>
            <pre className="mt-3 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(card, null, 2)}</pre>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold">最近一次关键帧抽取</h2>
            {latestFrameCard?.budgetResult ? (
              <div className="mt-3 space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Metric label="budget level" value={String(latestFrameCard.budgetResult.level)} />
                  <Metric label="frameCount" value={String(latestFrameCard.budgetResult.frameCount)} />
                  <Metric label="costLevel" value={latestFrameCard.budgetResult.costLevel} />
                </div>
                {latestFrameCard.keyframes?.length ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {latestFrameCard.keyframes.map((frame) => (
                      <figure key={`${frame.time}-${frame.source}`} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                        <img src={frame.image} alt="" className="aspect-video w-full object-cover" />
                        <figcaption className="px-2 py-1.5 text-xs text-slate-300">
                          {formatSeconds(frame.time)} · {frame.source}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="rounded bg-slate-900 p-3 text-xs text-slate-400">最近卡片没有保存关键帧，可能是视频截帧失败后走了 fallback。</p>
                )}
                <pre className="max-h-48 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(latestFrameCard.budgetResult, null, 2)}</pre>
              </div>
            ) : (
              <p className="mt-3 rounded bg-slate-900 p-3 text-sm text-slate-400">还没有生成带关键帧数据的卡片。</p>
            )}
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
            <h2 className="font-semibold">visionAnalysis 后端状态</h2>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <Metric label="requested provider" value={visionStatus?.debug?.requestedProvider ?? visionStatus?.configuredProvider ?? 'zhipu'} />
              <Metric label="actual provider" value={visionStatus?.debug?.actualProvider ?? visionStatus?.provider ?? latestFrameCard?.analysisSource ?? 'unknown'} />
              <Metric label="today calls" value={String(visionStatus?.attemptedCallCount ?? visionStatus?.todayCallCount ?? 0)} />
              <Metric label="success calls" value={String(visionStatus?.successCallCount ?? 0)} />
              <Metric label="fallback" value={String(Boolean(visionStatus?.fallback ?? latestFrameCard?.analysisSource === 'rule_fallback'))} />
              <Metric label="requested model" value={visionStatus?.debug?.requestedModel ?? 'unknown'} />
              <Metric label="actual model" value={visionStatus?.debug?.actualModel ?? 'unknown'} />
              <Metric label="errorType" value={visionStatus?.debug?.errorType ?? 'none'} />
              <Metric label="errorCode" value={visionStatus?.debug?.errorCode ?? 'none'} />
              <Metric label="fallbackUsed" value={String(Boolean(visionStatus?.debug?.fallbackUsed))} />
              <Metric label="retryCount" value={String(visionStatus?.debug?.retryCount ?? 0)} />
              <Metric label="fallbackReason" value={visionStatus?.debug?.fallbackReason ?? 'none'} />
            </div>
            {visionStatus?.error ? <p className="mt-3 rounded bg-amber-500/10 p-3 text-sm text-amber-100">{visionStatus.error}</p> : null}
            {recentVisionAnalysis ? (
              <pre className="mt-3 max-h-60 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(recentVisionAnalysis, null, 2)}</pre>
            ) : (
              <p className="mt-3 rounded bg-slate-900 p-3 text-sm text-slate-400">还没有 visionAnalysis 结果。</p>
            )}
            {recentKeyframes?.length ? (
              <div className="mt-3 grid grid-cols-3 gap-3">
                {recentKeyframes.slice(0, 3).map((frame) => (
                  <figure key={`${frame.time}-${frame.source}`} className="overflow-hidden rounded-lg border border-white/10 bg-slate-900">
                    <img src={frame.image} alt="" className="aspect-video w-full object-cover" />
                    <figcaption className="px-2 py-1.5 text-xs text-slate-300">{formatSeconds(frame.time)}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
            <h2 className="font-semibold">eventStore log</h2>
            <pre className="mt-3 max-h-96 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(events, null, 2)}</pre>
          </section>
          <section className="rounded-lg border border-white/10 bg-white/[0.03] p-4 lg:col-span-2">
            <h2 className="font-semibold">budgetGate 验收案例</h2>
            <pre className="mt-3 max-h-96 overflow-auto rounded bg-slate-900 p-3 text-xs">{JSON.stringify(budgetCases, null, 2)}</pre>
          </section>
        </div>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-slate-900 px-3 py-2">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value}</p>
    </div>
  );
}

function formatSeconds(seconds: number) {
  const safeSeconds = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}
