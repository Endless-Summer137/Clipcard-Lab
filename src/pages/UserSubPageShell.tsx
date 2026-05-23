import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';

interface UserSubPageShellProps {
  title: string;
  subtitle?: string;
  onBack: () => void;
  rightSlot?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}

export function UserSubPageShell({ title, subtitle, onBack, rightSlot, children, contentClassName = 'mt-5 space-y-5' }: UserSubPageShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f4ec] text-stone-900">
      <section className="mx-auto min-h-screen w-full max-w-[430px] bg-[#fbf8f0] px-4 pb-8 pt-5 shadow-xl shadow-stone-200/60">
        <header className="flex items-start gap-3">
          <button type="button" onClick={onBack} aria-label="返回我页面" className="shrink-0 rounded-full bg-stone-100 p-2 text-stone-800 shadow-sm">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold leading-8">{title}</h1>
            {subtitle ? <p className="mt-1 text-sm leading-6 text-stone-500">{subtitle}</p> : null}
          </div>
          {rightSlot ? <div className="shrink-0">{rightSlot}</div> : null}
        </header>
        <div className={contentClassName}>{children}</div>
      </section>
    </main>
  );
}
