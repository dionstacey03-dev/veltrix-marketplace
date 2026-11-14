import React, { useEffect, useState } from 'react';
import { Send, Sparkles, X } from 'lucide-react';
import { useMarketplace } from '../context/MarketplaceContext.tsx';
import { formatPrice, getEffectivePriceUsd } from '../lib/currency.ts';
import { ProductImage } from './ProductImage.tsx';

interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
  referencedProductIds?: string[];
}

export const AiAssistantDrawer: React.FC = () => {
  const {
    aiDrawerOpen,
    setAiDrawerOpen,
    aiInitialPrompt,
    products,
    currency,
    settings,
    navigate,
  } = useMarketplace();

  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: 'assistant',
      text: 'Welcome to VELTRIX. Ask me to find hardware by budget, compare specifications, or check USD/LKR pricing.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const nextHistory: ChatTurn[] = [...messages, { role: 'user', text: trimmed }];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: nextHistory.slice(-8).map((m) => ({ role: m.role, text: m.text })),
          currency,
          lkrPerUsd: settings.lkrPerUsd,
          products: products.map((p) => ({
            id: p.id,
            title: p.title,
            categoryName: p.categoryName,
            priceUsd: getEffectivePriceUsd(p),
            rating: p.rating,
            stock: p.stock,
            specs: p.specs,
            description: p.description,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.error || 'Gemini AI assistant is temporarily unavailable.',
          },
        ]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.reply || 'Here is what I found in the catalog.',
          referencedProductIds: Array.isArray(data.referencedProductIds)
            ? data.referencedProductIds
            : [],
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: 'Network error reaching the VELTRIX AI service.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (aiDrawerOpen && aiInitialPrompt) {
      setInput(aiInitialPrompt);
    }
  }, [aiDrawerOpen, aiInitialPrompt]);

  if (!aiDrawerOpen) return null;

  const quickPrompts = [
    'Best wireless audio under $350',
    'Compare Aethel H1 vs Orbit Pro',
    'Build a minimalist desk setup in LKR',
  ];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/50 backdrop-blur-xs">
      <div
        className="flex-1"
        onClick={() => setAiDrawerOpen(false)}
        aria-hidden="true"
      />
      <aside
        aria-label="VELTRIX AI Shopping Specialist"
        className="glass-panel w-full max-w-md h-full flex flex-col shadow-2xl border-l border-slate-200/80 dark:border-white/10"
      >
        <div className="p-6 border-b border-slate-200/70 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-violet-600 dark:text-cyan-400" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-950 dark:text-white">
                VELTRIX Shopping Specialist
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Powered by Gemini · Live catalog grounded
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiDrawerOpen(false)}
            aria-label="Close AI specialist"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((turn, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                turn.role === 'user' ? 'items-end' : 'items-start'
              } space-y-2`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  turn.role === 'user'
                    ? 'bg-slate-950 dark:bg-white text-white dark:text-slate-950'
                    : 'border border-slate-200/80 dark:border-white/10 bg-white/75 dark:bg-white/5 text-slate-800 dark:text-slate-100'
                }`}
              >
                {turn.text}
              </div>

              {turn.referencedProductIds && turn.referencedProductIds.length > 0 && (
                <div className="w-full space-y-2">
                  {turn.referencedProductIds.map((pid) => {
                    const p = products.find((item) => item.id === pid);
                    if (!p) return null;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          setAiDrawerOpen(false);
                          navigate('product', { productId: p.id });
                        }}
                        className="w-full text-left rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-white/5 p-2.5 flex items-center gap-3 hover:border-violet-500/40 dark:hover:border-cyan-400/40 cursor-pointer"
                      >
                        <ProductImage
                          src={p.imageUrl}
                          alt={p.title}
                          className="w-12 h-12 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-950 dark:text-white truncate">
                            {p.title}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {formatPrice(getEffectivePriceUsd(p), currency, settings.lkrPerUsd)}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-xs text-slate-500 dark:text-slate-400">
              Checking catalog specifications...
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-200/70 dark:border-white/10 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {quickPrompts.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => void sendMessage(qp)}
                className="rounded-lg border border-slate-200 dark:border-white/10 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage(input);
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about products, specs, or deals..."
              className="flex-1 rounded-xl border border-slate-200 dark:border-white/15 bg-white/80 dark:bg-slate-950/60 px-3.5 py-2.5 text-xs text-slate-900 dark:text-white"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label="Send message"
              className="rounded-xl bg-violet-600 dark:bg-cyan-400 px-3.5 py-2.5 text-white dark:text-slate-950 disabled:opacity-40 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </aside>
    </div>
  );
};
