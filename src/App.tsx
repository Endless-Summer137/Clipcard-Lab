import { useState } from 'react';
import { ClipbookPage, MyCardsPage } from './pages/Placeholders';
import { CreatorCenter } from './pages/CreatorCenter';
import { DemoFeedPage } from './pages/DemoFeedPage';
import { InternalLab } from './pages/InternalLab';

type PageId = 'demo' | 'creator' | 'internal' | 'myCards' | 'clipbook';

const pages: Array<{ id: PageId; label: string; description: string }> = [
  { id: 'demo', label: '短视频播放页', description: '用户端只展示片段卡结果' },
  { id: 'creator', label: '创作者中心', description: '查看片段兴趣趋势' },
  { id: 'internal', label: '内部机制页', description: '解释预算和广告闸门' },
  { id: 'myCards', label: '我的卡片', description: '预留入口' },
  { id: 'clipbook', label: '卡片手账', description: '预留入口' },
];

function renderPage(pageId: PageId) {
  switch (pageId) {
    case 'creator':
      return <CreatorCenter />;
    case 'internal':
      return <InternalLab />;
    case 'myCards':
      return <MyCardsPage />;
    case 'clipbook':
      return <ClipbookPage />;
    case 'demo':
    default:
      return <DemoFeedPage />;
  }
}

export default function App() {
  const [activePage, setActivePage] = useState<PageId>('demo');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-teal-200">ClipCard Lab</p>
            <h1 className="mt-1 text-lg font-semibold text-white">共享 core 架构验证</h1>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
            {pages.map((page) => {
              const isActive = page.id === activePage;
              return (
                <button
                  key={page.id}
                  type="button"
                  onClick={() => setActivePage(page.id)}
                  className={[
                    'shrink-0 rounded-md border px-3 py-2 text-left transition',
                    isActive
                      ? 'border-teal-300/60 bg-teal-300/15 text-teal-50'
                      : 'border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/25 hover:bg-white/[0.06]',
                  ].join(' ')}
                >
                  <span className="block text-sm font-medium">{page.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-400">{page.description}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {renderPage(activePage)}
    </div>
  );
}
