export function MyCardsPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <h1 className="text-2xl font-semibold">我的卡片</h1>
      <p className="mt-2 text-slate-400">占位页：后续从 cardStore 读取用户保存的卡片。</p>
    </main>
  );
}

export function ClipbookPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100">
      <h1 className="text-2xl font-semibold">卡片手账</h1>
      <p className="mt-2 text-slate-400">占位页：后续从 cardStore 读取加入手账的卡片。</p>
    </main>
  );
}
