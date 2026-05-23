import { ArrowLeft } from 'lucide-react';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook' | 'dresser';

interface DresserPageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

const packs = ['基础贴纸包', '游戏像素包', '风景手账包'];

export function DresserPage({ onNavigate }: DresserPageProps) {
  return (
    <main className="min-h-screen bg-[#f7f4ec] px-4 py-5 text-stone-900">
      <section className="mx-auto min-h-[calc(100vh-40px)] w-full max-w-[430px] rounded-[28px] bg-[#fffdf7] px-5 py-5 shadow-xl shadow-stone-200/70">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => onNavigate('profile', { dev: false })} aria-label="返回我页面" className="rounded-full bg-stone-100 p-2 text-stone-800">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="text-xl font-semibold">卡片妆台</h1>
        </header>

        <p className="mt-5 text-sm leading-7 text-stone-600">
          给卡片换颜色、加贴纸，后续可使用基础贴纸包、创作者贴纸包和联动贴纸包。
        </p>

        <div className="mt-6 grid gap-3">
          {packs.map((pack) => (
            <article key={pack} className="rounded-3xl bg-white p-4 shadow-sm shadow-stone-200">
              <h2 className="font-semibold">{pack}</h2>
              <p className="mt-1 text-sm text-stone-500">贴纸能力占位，后续进入卡片编辑器。</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
