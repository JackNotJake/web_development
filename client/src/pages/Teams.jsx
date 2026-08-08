import { useEffect, useState } from 'react';
import { api } from '../api';
import TeamLogo from '../components/TeamLogo';

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/matches/teams')
      .then(({ data }) => setTeams(data?.teams || []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-slate-400">加载中...</p>;

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="mb-1 text-2xl font-black text-white">2026 苏超 · 十三设区市代表队一览</h1>
        <p className="text-sm text-slate-400">江苏省 13 个设区市城市代表队，一城一队。</p>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t, idx) => (
          <div key={t.id} className="card p-5 transition hover:bg-pitch-800/40">
            <div className="mb-3 flex items-center gap-3">
              <TeamLogo team={t} size={48} />
              <div>
                <div className="text-lg font-bold text-white">{t.name}</div>
                <div className="text-xs text-slate-400">{t.alias}</div>
              </div>
              <div className="ml-auto text-2xl font-black text-pitch-700">{String(idx + 1).padStart(2, '0')}</div>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="rounded bg-pitch-800 p-2">
                <div className="text-slate-400">场次</div>
                <div className="font-bold text-white">{t.record.played}</div>
              </div>
              <div className="rounded bg-pitch-800 p-2">
                <div className="text-slate-400">胜</div>
                <div className="font-bold text-brand-500">{t.record.won}</div>
              </div>
              <div className="rounded bg-pitch-800 p-2">
                <div className="text-slate-400">平</div>
                <div className="font-bold text-yellow-500">{t.record.drawn}</div>
              </div>
              <div className="rounded bg-pitch-800 p-2">
                <div className="text-slate-400">负</div>
                <div className="font-bold text-red-400">{t.record.lost}</div>
              </div>
            </div>
            <div className="mt-3 flex justify-between text-xs text-slate-400">
              <span>积分 <strong className="text-white">{t.record.points}</strong></span>
              <span>Elo <strong className="text-white">{t.eloRating}</strong></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
