import { useMemo, useState } from 'react';
import { runAdGate } from '../core/adGate';
import { getBudgetGateAcceptanceCases, runBudgetGate } from '../core/budgetGate';
import { generateSegmentCard } from '../core/cardEngine';
import { getEvents } from '../core/eventStore';
import { defaultDemoVideos } from './demoData';

export function InternalLab() {
  const [videoId, setVideoId] = useState(defaultDemoVideos[0].videoId);
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
    transcriptExcerpt: video.transcriptExcerpt,
    segmentNote: video.segmentNote,
    budgetResult: budget,
    adDecision,
  }), [adDecision, budget, video]);
  const events = getEvents();
  const budgetCases = getBudgetGateAcceptanceCases();

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
