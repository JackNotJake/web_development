import { useEffect, useState } from 'react';
import { api } from '../api';
import MatchCard from '../components/MatchCard';

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('SCHEDULED');

  useEffect(() => {
    async function load() {
      try {
        const { data } = await api.get('/matches', { params: { status: filter, limit: 50 } });
        setMatches(data?.matches || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-slate-800">赛事列表</h1>
        <div className="flex gap-2">
          {['SCHEDULED', 'FINISHED', ''].map((key) => (
            <button
              key={key || 'all'}
              onClick={() => setFilter(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === key
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              {key === 'SCHEDULED' ? '未开始' : key === 'FINISHED' ? '已结束' : '全部'}
            </button>
          ))}
        </div>
      </div>

      {loading && <p className="text-slate-500">加载中...</p>}
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-4 sm:grid-cols-2">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </div>
      {!loading && matches.length === 0 && (
        <div className="py-12 text-center text-slate-400">暂无比赛</div>
      )}
    </div>
  );
}
