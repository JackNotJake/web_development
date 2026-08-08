import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Faqs() {
  const [faqs, setFaqs] = useState([]);
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/matches/faqs')
      .then(({ data }) => setFaqs(data?.faqs || []))
      .catch(() => setFaqs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">加载中...</p>;

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="mb-1 text-2xl font-black text-white">2026 苏超常见问题</h1>
        <p className="text-sm text-slate-400">关于江苏省城市足球联赛的常见疑问解答。</p>
      </section>

      <div className="space-y-3">
        {faqs.map((faq) => {
          const isOpen = openId === faq.id;
          return (
            <div key={faq.id} className="card overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : faq.id)}
                className="flex w-full items-center justify-between px-5 py-4 text-left font-bold text-white transition hover:bg-pitch-800/40"
              >
                <span>{faq.question}</span>
                <span className="text-xl text-brand-500">{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && (
                <div className="border-t border-pitch-800 px-5 py-4 text-sm leading-relaxed text-slate-300">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
