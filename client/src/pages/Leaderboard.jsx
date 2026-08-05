import { useEffect, useState } from 'react';
import { api } from '../api';

export default function Leaderboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/leaderboard', { params: { scope: 'all' } })
      .then(({ data }) => setRows(data.leaderboard))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">预测排行榜</h1>
      {loading ? (
        <p className="text-slate-500">加载中...</p>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">排名</th>
                <th className="px-4 py-3 font-medium">用户</th>
                <th className="px-4 py-3 font-medium">积分</th>
                <th className="px-4 py-3 font-medium">Elo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.username} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-700">{idx + 1}</td>
                  <td className="px-4 py-3 text-slate-800">{row.username}</td>
                  <td className="px-4 py-3 font-medium text-brand-700">{row.totalPoints}</td>
                  <td className="px-4 py-3 text-slate-500">{row.eloScore}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="py-8 text-center text-slate-400">暂无数据</div>
          )}
        </div>
      )}
    </div>
  );
}
