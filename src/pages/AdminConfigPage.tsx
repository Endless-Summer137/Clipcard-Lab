import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { parseTags, readDemoConfig, readFileAsDataUrl, saveDemoConfig, type DemoVideoConfig } from './demoData';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook';

interface AdminConfigPageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

export function AdminConfigPage({ onNavigate }: AdminConfigPageProps) {
  const [videos, setVideos] = useState<DemoVideoConfig[]>(() => readDemoConfig());

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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-teal-200">Hidden Config</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">隐藏素材配置页</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              这里只配置 3 个演示视频的原始输入材料。最终卡片标题、摘要和保存理由仍由 cardEngine 生成。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate('demoFeed', { dev: false })} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950">
              返回演示页
            </button>
            <button type="button" onClick={() => onNavigate('demoFeed', { dev: true })} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white">
              返回开发导航
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {videos.map((item, index) => (
            <section key={item.videoId || index} className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
              <h2 className="font-semibold text-white">演示视频 {index + 1}</h2>
              <p className="mt-2 rounded-md border border-teal-300/20 bg-teal-300/10 px-3 py-2 text-xs leading-5 text-teal-50">
                默认演示片段，仅用于未手动选段时的 fallback。真实使用时，片段时间来自用户短按或长按选择。
              </p>
              <label className="mt-3 block text-sm text-slate-300">
                视频文件
                <input type="file" accept="video/mp4,video/webm" onChange={(event) => onVideoUpload(index, event)} className="mt-2 w-full text-sm text-slate-300" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                videoId
                <input value={item.videoId} onChange={(event) => updateVideo(index, { videoId: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                videoTitle
                <input value={item.videoTitle} onChange={(event) => updateVideo(index, { videoTitle: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                videoDescription
                <textarea value={item.videoDescription} onChange={(event) => updateVideo(index, { videoDescription: event.target.value })} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                tags
                <input value={item.tags.join(',')} onChange={(event) => updateVideo(index, { tags: parseTags(event.target.value) })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="block text-sm text-slate-300">
                  defaultSegmentStart
                  <input type="number" value={item.defaultSegmentStart} onChange={(event) => updateVideo(index, { defaultSegmentStart: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
                </label>
                <label className="block text-sm text-slate-300">
                  defaultSegmentEnd
                  <input type="number" value={item.defaultSegmentEnd} onChange={(event) => updateVideo(index, { defaultSegmentEnd: Number(event.target.value) })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
                </label>
              </div>
              <label className="mt-3 block text-sm text-slate-300">
                transcriptExcerpt
                <textarea value={item.transcriptExcerpt} onChange={(event) => updateVideo(index, { transcriptExcerpt: event.target.value })} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                segmentNote
                <textarea value={item.segmentNote} onChange={(event) => updateVideo(index, { segmentNote: event.target.value })} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                adCandidate
                <input value={item.adCandidate} onChange={(event) => updateVideo(index, { adCandidate: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
                <input type="checkbox" checked={Boolean(item.activityEnabled)} onChange={(event) => updateVideo(index, { activityEnabled: event.target.checked })} />
                activityEnabled
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                activityId
                <input value={item.activityId ?? ''} onChange={(event) => updateVideo(index, { activityId: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                activityName
                <input value={item.activityName ?? ''} onChange={(event) => updateVideo(index, { activityName: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                activityCta
                <input value={item.activityCta ?? ''} onChange={(event) => updateVideo(index, { activityCta: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                targetClipbookTemplate
                <input value={item.targetClipbookTemplate ?? ''} onChange={(event) => updateVideo(index, { targetClipbookTemplate: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
