import { useMemo, useState } from 'react';
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCards } from '../core/cardStore';
import { getEvents } from '../core/eventStore';
import { buildTrendBuckets } from '../core/trendAnalytics';
import { defaultDemoVideos } from './demoData';

export function CreatorCenter() {
  const [videoId, setVideoId] = useState(defaultDemoVideos[0].videoId);
  const events = getEvents();
  const cards = getCards();
  const video = defaultDemoVideos.find((item) => item.videoId === videoId) ?? defaultDemoVideos[0];
  const data = useMemo(() => buildTrendBuckets(videoId, events, 10, video.duration), [events, video.duration, videoId]);
  const chartData = data.map((bucket) => ({
    bucket: `${bucket.bucketStart}-${bucket.bucketEnd}s`,
    cardGenerated: bucket.cardGeneratedCount,
    saved: bucket.savedCount,
    shared: bucket.sharedCount,
    clipbook: bucket.addedToClipbookCount,
    adClicked: bucket.adClickedCount,
  }));
  const relatedCards = cards.filter((card) => card.videoId === videoId);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-semibold">创作者中心</h1>
        <p className="mt-2 text-sm text-slate-400">只读取 eventStore、cardStore 和 trendAnalytics，展示趋势和摘要，不暴露完整内部规则。</p>
        <select value={videoId} onChange={(event) => setVideoId(event.target.value)} className="mt-5 rounded-md border border-white/10 bg-slate-900 px-3 py-2">
          {defaultDemoVideos.map((item) => <option key={item.videoId} value={item.videoId}>{item.videoTitle}</option>)}
        </select>
        <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-lg font-semibold">片段兴趣趋势图</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,.18)" />
                <XAxis dataKey="bucket" />
                <YAxis allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,.14)' }} />
                <Line type="monotone" dataKey="cardGenerated" name="卡片生成" stroke="#2dd4bf" />
                <Line type="monotone" dataKey="saved" name="保存" stroke="#facc15" />
                <Line type="monotone" dataKey="shared" name="分享" stroke="#38bdf8" />
                <Line type="monotone" dataKey="clipbook" name="加入手账" stroke="#c084fc" />
                <Line type="monotone" dataKey="adClicked" name="广告点击" stroke="#fb923c" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="mt-5 rounded-lg border border-white/10 bg-white/[0.03] p-4">
          <h2 className="text-lg font-semibold">广告适配摘要</h2>
          <p className="mt-2 text-sm text-slate-400">已生成卡片 {relatedCards.length} 张。这里只展示摘要，不展开完整广告闸门规则。</p>
        </section>
      </div>
    </main>
  );
}
