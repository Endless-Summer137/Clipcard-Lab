import { UserSubPageShell } from './UserSubPageShell';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook' | 'dresser';

interface DresserPageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

const packs = ['基础贴纸包', '游戏像素包', '风景手账包'];

export function DresserPage({ onNavigate }: DresserPageProps) {
  return (
    <UserSubPageShell title="卡片妆台" onBack={() => onNavigate('profile', { dev: false })}>
      <p className="text-sm leading-7 text-stone-600">
        给卡片换颜色、加贴纸，后续可使用基础贴纸包、创作者贴纸包和联动贴纸包。
      </p>

      <div className="grid gap-3">
        {packs.map((pack) => (
          <article key={pack} className="rounded-3xl bg-white p-4 shadow-sm shadow-stone-200">
            <h2 className="font-semibold">{pack}</h2>
            <p className="mt-1 text-sm text-stone-500">贴纸能力占位，后续进入卡片编辑器。</p>
          </article>
        ))}
      </div>
    </UserSubPageShell>
  );
}
