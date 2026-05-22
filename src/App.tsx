import { useEffect, useState } from 'react';
import { AdminConfigPage } from './pages/AdminConfigPage';
import { ClipbookPage, MyCardsPage } from './pages/Placeholders';
import { CreatorCenter } from './pages/CreatorCenter';
import { DemoFeedPage } from './pages/DemoFeedPage';
import { InternalLab } from './pages/InternalLab';
import { ProfilePage } from './pages/ProfilePage';

type PageId = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook';
type PageParam = 'demo' | 'admin' | 'internal' | 'creator' | 'profile' | 'cards' | 'clipbook';

const pageParamToId: Record<PageParam, PageId> = {
  demo: 'demoFeed',
  admin: 'adminConfig',
  internal: 'internalLab',
  creator: 'creatorCenter',
  profile: 'profile',
  cards: 'myCards',
  clipbook: 'clipbook',
};

const pageIdToParam: Record<PageId, PageParam> = {
  demoFeed: 'demo',
  adminConfig: 'admin',
  internalLab: 'internal',
  creatorCenter: 'creator',
  profile: 'profile',
  myCards: 'cards',
  clipbook: 'clipbook',
};

const devPages: Array<{ id: PageId; label: string; description: string }> = [
  { id: 'demoFeed', label: '短视频播放页', description: '录屏用端内概念页' },
  { id: 'adminConfig', label: '素材配置', description: '隐藏演示素材入口' },
  { id: 'internalLab', label: '内部机制页', description: '预算和广告闸门' },
  { id: 'creatorCenter', label: '创作者中心', description: '片段兴趣趋势图' },
  { id: 'profile', label: '我页面', description: '个人主页入口' },
  { id: 'myCards', label: '我的卡片', description: '卡片列表占位' },
  { id: 'clipbook', label: '卡片手账', description: '手账模板占位' },
];

function readRoute() {
  const params = new URLSearchParams(window.location.search);
  const pageParam = params.get('page') as PageParam | null;
  return {
    page: pageParam && pageParam in pageParamToId ? pageParamToId[pageParam] : 'demoFeed',
    dev: params.get('dev') === '1',
  };
}

export default function App() {
  const [route, setRoute] = useState(readRoute);

  function navigate(page: PageId, options?: { dev?: boolean }) {
    const nextDev = options?.dev ?? route.dev;
    const params = new URLSearchParams();
    params.set('page', pageIdToParam[page]);
    if (nextDev) params.set('dev', '1');
    const nextUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(null, '', nextUrl);
    setRoute({ page, dev: nextDev });
  }

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        navigate('adminConfig', { dev: true });
      }

      if (event.key === 'Escape' && readRoute().page === 'adminConfig') {
        event.preventDefault();
        navigate('demoFeed', { dev: true });
      }
    };

    window.addEventListener('popstate', syncRoute);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('popstate', syncRoute);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [route.dev]);

  function renderPage() {
    switch (route.page) {
      case 'adminConfig':
        return <AdminConfigPage onNavigate={navigate} />;
      case 'internalLab':
        return <InternalLab />;
      case 'creatorCenter':
        return <CreatorCenter />;
      case 'profile':
        return <ProfilePage onNavigate={navigate} />;
      case 'myCards':
        return <MyCardsPage onNavigate={navigate} />;
      case 'clipbook':
        return <ClipbookPage onNavigate={navigate} />;
      case 'demoFeed':
      default:
        return <DemoFeedPage onOpenProfile={() => navigate('profile', { dev: false })} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {route.dev ? (
        <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-teal-200">ClipCard Lab</p>
              <h1 className="mt-1 text-lg font-semibold text-white">开发导航</h1>
            </div>
            <nav className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
              {devPages.map((page) => {
                const isActive = page.id === route.page;
                return (
                  <button
                    key={page.id}
                    type="button"
                    onClick={() => navigate(page.id, { dev: true })}
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
      ) : null}

      {renderPage()}
    </div>
  );
}
