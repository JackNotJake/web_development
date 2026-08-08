import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import TeamLogo from '../components/TeamLogo';

const statusOptions = [
  { value: 'SCHEDULED', label: '未开始' },
  { value: 'FINISHED', label: '已结束' },
  { value: '', label: '全部' },
];

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('SCHEDULED');
  const [teamFilter, setTeamFilter] = useState('');
  const [showFinished, setShowFinished] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [matchesRes, teamsRes] = await Promise.all([
          api.get('/matches', { params: { limit: 200 } }),
          api.get('/matches/teams'),
        ]);
        setMatches(matchesRes.data?.matches || []);
        setTeams(teamsRes.data?.teams || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredMatches = useMemo(() => {
    let list = [...matches];
    if (statusFilter) {
      list = list.filter((m) => m.status === statusFilter);
    }
    if (teamFilter) {
      list = list.filter((m) => m.homeTeamId === teamFilter || m.awayTeamId === teamFilter);
    }
    if (!showFinished && statusFilter !== 'FINISHED') {
      // 默认隐藏已结束在“未开始”视图里已自然过滤；这里保留开关语义
    }
    return list.sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));
  }, [matches, statusFilter, teamFilter, showFinished]);

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-6">
      <section className="card p-6">
        <h1 className="mb-1 text-2xl font-black text-white">2026 江苏省城市足球联赛赛程表</h1>
        <p className="text-sm text-slate-400">实时更新的赛事信息，包括比赛时间、地点、对阵双方等详细数据。</p>
      </section>

      <section className="card p-4">
        <div className="mb-3 text-sm font-medium text-slate-300">赛程筛选</div>
        <div className="flex flex-wrap gap-3">
          <select
            className="input w-40"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            className="input w-40"
            value={teamFilter}
            onChange={(e) => setTeamFilter(e.target.value)}
          >
            <option value="">全部队伍</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-pitch-700 bg-pitch-800 text-brand-600 focus:ring-brand-500"
              checked={showFinished}
              onChange={(e) => setShowFinished(e.target.checked)}
            />
            展示已结束的比赛
          </label>
        </div>
      </section>

      {loading && <p className="text-slate-400">加载中...</p>}
      {error && <div className="rounded bg-red-500/10 p-3 text-sm text-red-400">{error}</div>}

      {!loading && (
        <div className="card overflow-hidden">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="w-28">日期</th>
                <th className="w-20">时间</th>
                <th>对阵</th>
                <th className="w-16">比分</th>
                <th>场地</th>
                <th className="w-32">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredMatches.map((match) => (
                <tr key={match.id}>
                  <td>{formatDate(match.utcDate)}</td>
                  <td>{formatTime(match.utcDate)}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-1 items-center justify-end gap-2">
                        <TeamLogo team={match.homeTeam} size={28} />
                        <span className="font-medium text-white">{match.homeTeam.name}</span>
                      </div>
                      <span className="text-xs text-slate-500">vs</span>
                      <div className="flex flex-1 items-center gap-2">
                        <TeamLogo team={match.awayTeam} size={28} />
                        <span className="font-medium text-white">{match.awayTeam.name}</span>
                      </div>
                    </div>
                  </td>
                  <td className="font-mono text-white">
                    {match.status === 'FINISHED'
                      ? `${match.homeScore ?? 0} - ${match.awayScore ?? 0}`
                      : '-'}
                  </td>
                  <td className="text-slate-400">{match.venue || '-'}</td>
                  <td>
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex items-center gap-1 rounded bg-brand-600/10 px-3 py-1.5 text-xs font-medium text-brand-500 hover:bg-brand-600/20"
                    >
                      分析
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredMatches.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">暂无比赛</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
