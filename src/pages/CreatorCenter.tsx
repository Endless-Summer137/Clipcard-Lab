import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { getCards } from '../core/cardStore';
import { getEvents } from '../core/eventStore';
import { buildTrendBuckets } from '../core/trendAnalytics';
import type { DemoVideoConfig } from './demoData';
import { defaultDemoVideos } from './demoData';
import { UserSubPageShell } from './UserSubPageShell';

interface CreatorCenterProps {
  onBack: () => void;
}

export function CreatorCenter({ onBack }: CreatorCenterProps) {
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
  const totals = chartData.reduce(
    (sum, item) => ({
      cardGenerated: sum.cardGenerated + item.cardGenerated,
      saved: sum.saved + item.saved,
      shared: sum.shared + item.shared,
      clipbook: sum.clipbook + item.clipbook,
      adClicked: sum.adClicked + item.adClicked,
    }),
    { cardGenerated: 0, saved: 0, shared: 0, clipbook: 0, adClicked: 0 },
  );
  const adSummary = getAdSummary(video, relatedCards);
  const insights = getInsights(video, totals);

  return (
    <UserSubPageShell title="创作者中心" onBack={onBack}>
        <section className="rounded-3xl bg-[#f4f0e7] p-4">
          <p className="text-xs font-medium text-stone-500">当前视频</p>
          <h2 className="mt-1 text-lg font-semibold">{video.videoTitle}</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {defaultDemoVideos.map((item) => {
              const active = item.videoId === videoId;
              return (
                <button
                  key={item.videoId}
                  type="button"
                  onClick={() => setVideoId(item.videoId)}
                  className={[
                    'min-h-16 rounded-2xl border px-2 py-2 text-left text-xs leading-5 transition',
                    active ? 'border-emerald-300 bg-white text-emerald-900 shadow-sm' : 'border-transparent bg-white/70 text-stone-600',
                  ].join(' ')}
                >
                  {item.videoTitle}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3">
          <MetricCard label="卡片生成" value={totals.cardGenerated} />
          <MetricCard label="保存" value={totals.saved} />
          <MetricCard label="分享" value={totals.shared} />
          <MetricCard label="加入手账" value={totals.clipbook} />
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm shadow-stone-200">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">观众最想保存的时间段</h2>
            <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] text-stone-500">10 秒分段</span>
          </div>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,.18)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#78716c' }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#78716c' }} />
                <Tooltip
                  contentStyle={{ background: '#fffdf7', border: '1px solid rgba(214,211,209,.8)', borderRadius: 14, color: '#292524' }}
                  labelStyle={{ color: '#57534e' }}
                />
                <Line type="monotone" dataKey="cardGenerated" name="卡片生成" stroke="#059669" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="saved" name="保存" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="shared" name="分享" stroke="#0ea5e9" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-[#eef7ef] p-4 shadow-sm shadow-emerald-100">
          <h2 className="font-semibold text-emerald-950">片段洞察</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-emerald-950/78">
            {insights.map((insight) => <p key={insight}>{insight}</p>)}
          </div>
        </section>

        <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm shadow-stone-200">
          <h2 className="font-semibold">广告适配摘要</h2>
          <p className="mt-2 text-sm leading-6 text-stone-600">
            当前视频：{video.adCandidate}广告适配状态：<span className="font-medium text-stone-900">{adSummary.status}</span>
          </p>
          <p className="mt-1 text-sm leading-6 text-stone-500">原因：{adSummary.reason}</p>
        </section>
    </UserSubPageShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="rounded-3xl bg-white px-4 py-4 shadow-sm shadow-stone-200">
      <p className="text-2xl font-semibold text-stone-900">{value}</p>
      <p className="mt-1 text-xs text-stone-500">{label}</p>
    </article>
  );
}

function getAdSummary(video: DemoVideoConfig, cards: ReturnType<typeof getCards>) {
  const latestDecision = cards.find((card) => card.adDecision)?.adDecision;
  if (latestDecision) {
    const statusMap = {
      allow: '允许',
      limit: '限制',
      reject: '拒绝',
    } as const;
    return {
      status: statusMap[latestDecision.decision],
      reason: simplifyAdReason(latestDecision.reason),
    };
  }

  const tagText = video.tags.join(' ');
  if (tagText.includes('美食') || tagText.includes('探店')) return { status: '允许', reason: '与美食探店片段相关，适合承接明确标注的门店团购入口。' };
  if (tagText.includes('游戏')) return { status: '允许', reason: '与游戏高光内容相关，适合承接明确标注的外设入口。' };
  if (tagText.includes('旅行') || tagText.includes('风景')) return { status: '限制', reason: '与出行灵感相关，但需要片段中地点或出行语境更明确。' };
  return { status: '限制', reason: '当前内容语境较弱，商业入口需要更谨慎。' };
}

function simplifyAdReason(reason: string) {
  if (reason.includes('美食') || reason.includes('探店') || reason.includes('门店')) return '与美食探店片段相关。';
  if (reason.includes('游戏') || reason.includes('外设')) return '与游戏高光内容相关。';
  if (reason.includes('景区') || reason.includes('旅行') || reason.includes('风景')) return '与出行灵感相关，但仍需明确标注。';
  if (reason.includes('低信息') || reason.includes('不足')) return '当前片段信息不足，不适合强展示商业入口。';
  return '与当前片段语境相关性有限，需要明确标注并谨慎展示。';
}

function getInsights(video: DemoVideoConfig, totals: { saved: number; shared: number; cardGenerated: number }) {
  const tagText = video.tags.join(' ');
  if (tagText.includes('美食') || tagText.includes('探店')) {
    return [
      '菜品展示段保存次数更高，说明用户更关注可复看的实用片段。',
      '价格或套餐段更适合承接明确标注的商业入口。',
    ];
  }

  if (tagText.includes('游戏')) {
    return [
      '高光操作段更容易触发保存，适合沉淀为复盘卡。',
      totals.shared > 0 ? '有分享行为的片段更适合作为创作者二次剪辑素材。' : '可以继续观察分享行为，判断高光是否具备传播性。',
    ];
  }

  return [
    '风景停留段更像是旅行灵感收藏点，适合做轻量卡片沉淀。',
    totals.cardGenerated > totals.saved ? '生成多于保存时，可以继续优化片段标题和摘要，让收藏理由更明确。' : '保存行为集中时，说明该片段具备复看价值。',
  ];
}
