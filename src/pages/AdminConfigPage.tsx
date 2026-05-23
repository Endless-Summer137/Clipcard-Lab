import type { ChangeEvent } from 'react';
import { useState } from 'react';
import { saveVideoBlob } from '../core/videoBlobStore';
import {
  clearDemoConfig,
  clearDemoConfigNotice,
  getDemoConfigNotice,
  parseTags,
  readDemoConfig,
  saveDemoConfig,
  type DemoVideoConfig,
} from './demoData';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook';

interface AdminConfigPageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

const MAX_VIDEO_FILE_SIZE = 200 * 1024 * 1024;
const SUPPORTED_VIDEO_TYPES = ['video/mp4', 'video/webm'];

function fieldToText(value?: string | string[]) {
  return Array.isArray(value) ? value.join('\n') : value ?? '';
}

function parseListField(value: string) {
  return value
    .split(/[\n，,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function AdminConfigPage({ onNavigate }: AdminConfigPageProps) {
  const [videos, setVideos] = useState<DemoVideoConfig[]>(() => {
    try {
      return readDemoConfig();
    } catch {
      return [];
    }
  });
  const [pageError, setPageError] = useState(() => (videos.length === 0 ? '配置加载失败' : ''));
  const [notice, setNotice] = useState(() => getDemoConfigNotice());
  const [uploadStatus, setUploadStatus] = useState<Record<number, { type: 'success' | 'error'; message: string }>>({});

  function updateVideo(index: number, patch: Partial<DemoVideoConfig>) {
    try {
      setVideos((current) => {
        const next = current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item));
        saveDemoConfig(next);
        return next;
      });
    } catch {
      setPageError('配置保存失败，请清除本地配置后重试。');
    }
  }

  async function onVideoUpload(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploadStatus((current) => ({ ...current, [index]: { type: 'success', message: '正在保存视频…' } }));

    try {
      if (!SUPPORTED_VIDEO_TYPES.includes(file.type)) {
        throw new Error('仅支持 mp4 或 webm 视频。');
      }
      if (file.size > MAX_VIDEO_FILE_SIZE) {
        throw new Error('视频过大，建议压缩到 200MB 以内后上传。');
      }

      const videoId = videos[index]?.videoId || `demo_video_${index + 1}`;
      const videoBlobKey = await saveVideoBlob(videoId, file);
      updateVideo(index, {
        videoBlobKey,
        videoFileName: file.name,
        videoDataUrl: undefined,
      });
      setUploadStatus((current) => ({ ...current, [index]: { type: 'success', message: '视频已保存' } }));
    } catch (error) {
      const message = error instanceof Error ? error.message : '视频保存失败，请换一个较小的视频文件。';
      setUploadStatus((current) => ({ ...current, [index]: { type: 'error', message } }));
    } finally {
      event.target.value = '';
    }
  }

  function clearLocalConfig() {
    clearDemoConfig();
    clearDemoConfigNotice();
    const nextVideos = readDemoConfig();
    setVideos(nextVideos);
    setPageError('');
    setNotice('');
    setUploadStatus({});
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-6 text-slate-100">
        <div className="mx-auto max-w-xl rounded-lg border border-red-300/20 bg-red-300/10 p-5">
          <h1 className="text-xl font-semibold text-white">配置加载失败</h1>
          <p className="mt-2 text-sm leading-6 text-red-50">{pageError}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate('demoFeed', { dev: false })} className="rounded-md bg-white px-3 py-2 text-sm font-medium text-slate-950">
              返回演示页
            </button>
            <button type="button" onClick={() => onNavigate('demoFeed', { dev: true })} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white">
              返回开发导航
            </button>
            <button type="button" onClick={clearLocalConfig} className="rounded-md border border-white/15 px-3 py-2 text-sm text-white">
              清除本地配置并重试
            </button>
          </div>
        </div>
      </main>
    );
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
            {notice ? <p className="mt-3 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs leading-5 text-amber-50">{notice}</p> : null}
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
              {item.videoFileName ? <p className="mt-2 text-xs text-slate-400">当前视频：{item.videoFileName}</p> : null}
              {uploadStatus[index] ? (
                <p className={['mt-2 rounded-md px-3 py-2 text-xs leading-5', uploadStatus[index].type === 'success' ? 'bg-emerald-300/10 text-emerald-50' : 'bg-red-300/10 text-red-50'].join(' ')}>
                  {uploadStatus[index].message}
                </p>
              ) : null}
              <label className="mt-3 block text-sm text-slate-300">
                videoId
                <input value={item.videoId} onChange={(event) => updateVideo(index, { videoId: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                videoTitle
                <input value={item.videoTitle} onChange={(event) => updateVideo(index, { videoTitle: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                authorName
                <input value={item.authorName ?? ''} onChange={(event) => updateVideo(index, { authorName: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                sourceVideoUrl
                <input value={item.sourceVideoUrl ?? ''} onChange={(event) => updateVideo(index, { sourceVideoUrl: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
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
                segmentFacts
                <textarea value={fieldToText(item.segmentFacts)} onChange={(event) => updateVideo(index, { segmentFacts: event.target.value })} rows={4} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                keyActions
                <textarea value={fieldToText(item.keyActions)} onChange={(event) => updateVideo(index, { keyActions: parseListField(event.target.value) })} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                segmentOutcome
                <textarea value={item.segmentOutcome ?? ''} onChange={(event) => updateVideo(index, { segmentOutcome: event.target.value })} rows={2} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                userValue
                <textarea value={item.userValue ?? ''} onChange={(event) => updateVideo(index, { userValue: event.target.value })} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                visibleTextOrOcr
                <textarea value={item.visibleTextOrOcr ?? ''} onChange={(event) => updateVideo(index, { visibleTextOrOcr: event.target.value })} rows={2} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                featuredPersonOrId
                <input value={item.featuredPersonOrId ?? ''} onChange={(event) => updateVideo(index, { featuredPersonOrId: event.target.value })} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
              </label>
              <label className="mt-3 block text-sm text-slate-300">
                uncertainties
                <textarea value={fieldToText(item.uncertainties)} onChange={(event) => updateVideo(index, { uncertainties: event.target.value })} rows={3} className="mt-2 w-full rounded-md border border-white/10 bg-slate-900 p-2 text-white" />
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
