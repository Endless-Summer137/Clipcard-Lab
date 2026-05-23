import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import type { SegmentCard } from '../core/types';
import { getCards } from '../core/cardStore';
import { CardDetailView, CardMini, getCardTheme } from './CardDetailView';

type NavigateTarget = 'demoFeed' | 'adminConfig' | 'internalLab' | 'creatorCenter' | 'profile' | 'myCards' | 'clipbook';

interface SimplePageProps {
  onNavigate: (page: NavigateTarget, options?: { dev?: boolean }) => void;
}

const templates = [
  {
    id: 'fps',
    title: 'FPS 游戏风格模板',
    description: '深色背景、蓝紫/青色霓虹线条，一页可放 3 张卡片。',
  },
  {
    id: 'landscape',
    title: '风景模板',
    description: '浅绿、雾蓝、奶白，一页可放 3–4 张卡片。',
  },
  {
    id: 'blank',
    title: '空白书模板',
    description: '米白纸张和轻微书脊感，可输入书名。',
  },
] as const;

type TemplateId = (typeof templates)[number]['id'];

export function MyCardsPage({ onNavigate }: SimplePageProps) {
  const [selectedCard, setSelectedCard] = useState<SegmentCard | null>(null);
  const cards = getCards();

  return (
    <main className="min-h-screen bg-[#f7f4ec] px-4 py-5 text-stone-900">
      <section className="mx-auto min-h-[calc(100vh-40px)] w-full max-w-[430px] rounded-[28px] bg-[#fffdf7] px-4 py-4 shadow-xl shadow-stone-200/70">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => onNavigate('profile', { dev: false })} aria-label="返回我页面" className="rounded-full bg-stone-100 p-2 text-stone-800">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <h1 className="text-xl font-semibold">我的卡片</h1>
        </header>

        {cards.length > 0 ? (
          <div className="mt-5 grid grid-cols-3 gap-3 overflow-y-auto pb-5">
            {cards.map((card) => <CardMini key={card.cardId} card={card} onClick={() => setSelectedCard(card)} />)}
          </div>
        ) : (
          <div className="mt-24 rounded-3xl bg-[#f3f0e7] px-5 py-9 text-center text-sm leading-6 text-stone-500">
            刷视频时点击“保存这一刻”，片段卡会出现在这里。
          </div>
        )}
      </section>

      {selectedCard ? <CardDetailView card={selectedCard} onClose={() => setSelectedCard(null)} /> : null}
    </main>
  );
}

export function ClipbookPage({ onNavigate }: SimplePageProps) {
  const cards = getCards();
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>('fps');
  const [bookTitle, setBookTitle] = useState('我的空白书');
  const [slots, setSlots] = useState<Array<SegmentCard | null>>([null, null, null, null]);
  const [feedback, setFeedback] = useState('');

  const maxSlots = selectedTemplate === 'fps' ? 3 : 4;
  const visibleSlots = slots.slice(0, maxSlots);

  function addCard(card: SegmentCard) {
    const emptyIndex = visibleSlots.findIndex((slot) => !slot);
    if (emptyIndex === -1) {
      setFeedback('当前模板槽位已满，可以先更换模板或清空后再添加。');
      return;
    }

    setSlots((current) => current.map((slot, index) => (index === emptyIndex ? card : slot)));
    setFeedback('已加入当前手账模板。');
  }

  function selectTemplate(templateId: TemplateId) {
    setSelectedTemplate(templateId);
    setSlots([null, null, null, null]);
    setFeedback('');
  }

  return (
    <main className="min-h-screen bg-[#f7f4ec] px-4 py-5 text-stone-900">
      <section className="mx-auto w-full max-w-[430px]">
        <header className="flex items-center gap-3">
          <button type="button" onClick={() => onNavigate('profile', { dev: false })} aria-label="返回我页面" className="rounded-full bg-white p-2 text-stone-800 shadow-sm">
            <ArrowLeft className="h-5 w-5" strokeWidth={2} />
          </button>
          <div>
            <h1 className="text-xl font-semibold">卡片手账</h1>
            <p className="mt-1 text-sm text-stone-500">把保存的片段卡放进模板，生成可分享的卡片手账。</p>
          </div>
        </header>

        <section className="mt-5 grid gap-3">
          {templates.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() => selectTemplate(template.id)}
              className={[
                'rounded-3xl border p-4 text-left shadow-sm transition',
                selectedTemplate === template.id ? 'border-emerald-300 bg-white shadow-emerald-100' : 'border-white bg-white/70 shadow-stone-200',
              ].join(' ')}
            >
              <h2 className="font-semibold">{template.title}</h2>
              <p className="mt-1 text-sm leading-6 text-stone-500">{template.description}</p>
              <TemplatePreview id={template.id} />
            </button>
          ))}
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-4 shadow-sm shadow-stone-200">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">当前手账</h2>
            {selectedTemplate === 'blank' ? (
              <input
                value={bookTitle}
                onChange={(event) => setBookTitle(event.target.value)}
                className="w-32 rounded-full bg-stone-100 px-3 py-1.5 text-sm outline-none"
                aria-label="书名"
              />
            ) : null}
          </div>
          <p className="mt-2 text-sm text-stone-500">{selectedTemplate === 'blank' ? bookTitle : templates.find((item) => item.id === selectedTemplate)?.title}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {visibleSlots.map((slot, index) => (
              <div key={index} className="min-h-28 rounded-2xl border border-dashed border-stone-200 bg-[#fbf8f0] p-2">
                {slot ? <SmallSlot card={slot} /> : <span className="flex h-full items-center justify-center text-xs text-stone-400">卡片槽位 {index + 1}</span>}
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setFeedback('分享手账功能已预留。')} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">
              分享手账
            </button>
            <button type="button" onClick={() => setFeedback('一键发布为视频功能已预留。')} className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
              一键发布为视频
            </button>
          </div>
          {feedback ? <p className="mt-3 text-sm text-emerald-700">{feedback}</p> : null}
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-4 shadow-sm shadow-stone-200">
          <h2 className="font-semibold">可用卡片</h2>
          {cards.length > 0 ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              {cards.map((card) => <CardMini key={card.cardId} card={card} onClick={() => addCard(card)} />)}
            </div>
          ) : (
            <p className="mt-3 rounded-2xl bg-[#f3f0e7] px-4 py-6 text-center text-sm leading-6 text-stone-500">
              还没有可加入手账的卡片。
            </p>
          )}
        </section>

        <section className="mt-5 rounded-[28px] bg-white p-4 shadow-sm shadow-stone-200">
          <h2 className="font-semibold">基础贴纸</h2>
          <div className="mt-3 flex flex-wrap gap-2 text-sm">
            {['星星', '便签', '小旗', '箭头', '叶子', '准星', '像素心'].map((sticker) => (
              <button key={sticker} type="button" onClick={() => setFeedback(`${sticker} 贴纸已作为后续编辑能力预留。`)} className="rounded-full bg-[#f3f0e7] px-3 py-1.5 text-stone-600">
                {sticker}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}

function TemplatePreview({ id }: { id: TemplateId }) {
  if (id === 'fps') {
    return (
      <div className="mt-3 rounded-2xl bg-slate-950 p-3 text-cyan-100">
        <div className="grid grid-cols-3 gap-2">
          <span className="h-16 rounded border border-cyan-300/25 bg-cyan-300/10" />
          <span className="h-16 rounded border border-violet-300/25 bg-violet-300/10" />
          <span className="h-16 rounded border border-cyan-300/25 bg-cyan-300/10" />
        </div>
      </div>
    );
  }

  if (id === 'landscape') {
    return (
      <div className="mt-3 overflow-hidden rounded-2xl bg-[#eaf6ef] p-3">
        <div className="h-16 rounded-xl bg-[radial-gradient(circle_at_25%_80%,#bbf7d0_0_22%,transparent_23%),radial-gradient(circle_at_75%_78%,#bfdbfe_0_20%,transparent_21%),linear-gradient(#dff3f7,#fffaf0)]" />
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-2xl bg-[#fffaf0] p-3">
      <div className="h-16 rounded-xl border-l-4 border-stone-200 bg-white shadow-inner" />
    </div>
  );
}

function SmallSlot({ card }: { card: SegmentCard }) {
  const theme = getCardTheme(card);
  return (
    <div className={`h-full rounded-xl border p-2 text-xs ${theme.mini}`}>
      <p className="line-clamp-2 font-semibold">{card.title}</p>
      <p className="mt-1 line-clamp-2 opacity-60">{card.summary}</p>
    </div>
  );
}
