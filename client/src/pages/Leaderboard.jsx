import { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import TeamLogo from '../components/TeamLogo';

export default function Leaderboard() {
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/matches/teams')
      .then(({ data }) => setTeams(data?.teams || []))
      .catch(() => setTeams([]))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => {
    return [...teams].sort((a, b) => {
      const ar = a.record || {};
      const br = b.record || {};
      const aDiff = (ar.gf || 0) - (ar.ga || 0);
      const bDiff = (br.gf || 0) - (br.ga || 0);
      if (br.points !== ar.points) return br.points - ar.points;
      if (bDiff !== aDiff) return bDiff - aDiff;
      return (br.gf || 0) - (ar.gf || 0);
    });
  }, [teams]);

  return (
    <div className="space-y-4">
      <section className="card p-6">
        <h1 className="mb-1 text-2xl font-black text-white">球队积分榜</h1>
        <p className="text-sm text-slate-400">按积分、净胜球、进球数排序。</p>
      </section>

      {loading ? (
        <p className="text-slate-400">加载中...</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="w-16">排名</th>
                <th>球队</th>
                <th className="w-16">场次</th>
                <th className="w-12">胜</th>
                <th className="w-12">平</th>
                <th className="w-12">负</th>
                <th className="w-14">进球</th>
                <th className="w-14">失球</th>
                <th className="w-16">净胜球</th>
                <th className="w-16">积分</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((team, idx) => {
                const r = team.record || {};
                const diff = (r.gf || 0) - (r.ga || 0);
                return (
                  <tr key={team.id}>
                    <td className="font-semibold text-white">{idx + 1}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <TeamLogo team={team} size={28} />
                        <span className="font-medium text-white">{team.name}</span>
                      </div>
                    </td>
                    <td className="text-slate-300">{r.played || 0}</td>
                    <td className="text-emerald-400">{r.won || 0}</td>
                    <td className="text-yellow-500">{r.drawn || 0}</td>
                    <td className="text-red-400">{r.lost || 0}</td>
                    <td className="text-slate-300">{r.gf || 0}</td>
                    <td className="text-slate-300">{r.ga || 0}</td>
                    <td className={`font-medium ${diff > 0 ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-slate-300'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                    <td className="font-bold text-brand-500">{r.points || 0}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-500">暂无数据</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
