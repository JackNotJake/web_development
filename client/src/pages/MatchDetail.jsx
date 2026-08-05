import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuthStore } from '../store';
import { connectSocket, getSocket, joinMatchRoom, leaveMatchRoom } from '../socket';

function statusLabel(status) {
  const map = { SCHEDULED: '未开始', LIVE: '进行中', FINISHED: '已结束' };
  return map[status] || status;
}

function formatPercent(n) {
  return `${(n * 100).toFixed(1)}%`;
}

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [match, setMatch] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const joinedRef = useRef(false);

  async function loadAll() {
    try {
      const [{ data: m }, { data: f }, { data: d }] = await Promise.all([
        api.get(`/matches/${id}`),
        api.get(`/matches/${id}/prediction-final`),
        api.get(`/matches/${id}/discussions`, { params: { limit: 100 } }),
      ]);
      setMatch(m);
      setForecast(f);
      setDiscussions(d.discussions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [id]);

  // Socket:加入房间并监听比分/讨论更新
  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    function onConnect() {
      if (!joinedRef.current) {
        joinMatchRoom(id);
        joinedRef.current = true;
      }
    }
    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('match:score', (payload) => {
      if (payload.matchId === id) {
        setMatch((prev) => (prev ? { ...prev, ...payload } : prev));
      }
    });
    socket.on('discussion:new', (payload) => {
      if (payload.matchId === id) {
        setDiscussions((prev) => {
          if (payload.parentId) {
            return prev.map((root) =>
              root.id === payload.parentId
                ? { ...root, replies: [...(root.replies || []), payload] }
                : root
            );
          }
          return [payload, ...prev];
        });
      }
    });
    return () => {
      leaveMatchRoom(id);
      joinedRef.current = false;
      socket.off('connect', onConnect);
      socket.off('match:score');
      socket.off('discussion:new');
    };
  }, [id, token]);

  async function submitPrediction(e) {
    e.preventDefault();
    if (!user) return navigate('/login');
    try {
      await api.post(`/matches/${id}/predictions`, {
        homeScore: Number(homeScore),
        awayScore: Number(awayScore),
      });
      // 重新拉取融合预测(投票数变化)
      const { data } = await api.get(`/matches/${id}/prediction-final`);
      setForecast(data);
      alert('预测提交成功');
    } catch (err) {
      alert(err.message);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!user) return navigate('/login');
    if (!comment.trim()) return;
    try {
      await api.post(`/matches/${id}/discussions`, {
        content: comment,
        parentId: replyTo || undefined,
      });
      setComment('');
      setReplyTo(null);
      loadAll();
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <p className="text-slate-500">加载中...</p>;
  if (error || !match) return <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error || '赛事不存在'}</div>;

  const date = new Date(match.utcDate);
  const canPredict = match.status === 'SCHEDULED';

  return (
    <div className="space-y-6">
      <Link to="/matches" className="text-sm text-slate-500 hover:text-brand-700">← 返回赛事列表</Link>

      {/* 比赛头部 */}
      <div className="card p-6">
        <div className="mb-4 flex items-center justify-between text-sm text-slate-500">
          <span>{match.competition} · 第 {match.matchday ?? '-'} 轮</span>
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-700">{statusLabel(match.status)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-slate-800">{match.homeTeam.name}</div>
            <div className="text-sm text-slate-500">Elo {match.homeTeam.eloRating}</div>
          </div>
          <div className="px-6 text-4xl font-black text-brand-700">
            {match.status === 'FINISHED'
              ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
              : 'vs'}
          </div>
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-slate-800">{match.awayTeam.name}</div>
            <div className="text-sm text-slate-500">Elo {match.awayTeam.eloRating}</div>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-slate-400">
          开赛时间 {date.toLocaleString('zh-CN')}
        </div>
      </div>

      {/* 预测融合 */}
      {forecast && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">智能预测</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-2 text-sm text-slate-500">最可能比分</div>
              <div className="text-3xl font-bold text-brand-700">
                {forecast.mostLikely[0]} : {forecast.mostLikely[1]}
              </div>
              <div className="mt-1 text-xs text-slate-400">基于 Elo + Poisson 模型</div>
            </div>
            <div>
              <div className="mb-2 text-sm text-slate-500">胜/平/负概率</div>
              <div className="space-y-2">
                <Bar label={`主胜 ${formatPercent(forecast.final3[0])}`} value={forecast.final3[0]} color="bg-brand-600" />
                <Bar label={`平局 ${formatPercent(forecast.final3[1])}`} value={forecast.final3[1]} color="bg-amber-400" />
                <Bar label={`客胜 ${formatPercent(forecast.final3[2])}`} value={forecast.final3[2]} color="bg-blue-500" />
              </div>
              <div className="mt-2 text-xs text-slate-400">
                算法权重 {forecast.w.toFixed(2)} · 社区投票 {forecast.votes?.length ?? 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 提交预测 */}
      {canPredict && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-slate-800">提交你的预测</h2>
          {user ? (
            <form onSubmit={submitPrediction} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">主队</label>
                <input type="number" min={0} className="input w-20" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} required />
              </div>
              <div className="pb-2 text-slate-400">:</div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">客队</label>
                <input type="number" min={0} className="input w-20" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary">提交预测</button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              <Link to="/login" className="text-brand-700 hover:underline">登录</Link> 后提交预测
            </p>
          )}
        </div>
      )}

      {/* 讨论区 */}
      <div className="card p-6">
        <h2 className="mb-4 text-lg font-bold text-slate-800">赛后讨论</h2>
        {user ? (
          <form onSubmit={submitComment} className="mb-6">
            <textarea
              className="input mb-2 min-h-[80px] resize-y"
              placeholder={replyTo ? '写下你的回复...' : '参与讨论...'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={500}
              required
            />
            <div className="flex items-center gap-3">
              <button type="submit" className="btn-primary">{replyTo ? '回复' : '发表评论'}</button>
              {replyTo && <button type="button" onClick={() => setReplyTo(null)} className="text-sm text-slate-500 hover:text-slate-700">取消回复</button>}
            </div>
          </form>
        ) : (
          <p className="mb-6 text-sm text-slate-500">
            <Link to="/login" className="text-brand-700 hover:underline">登录</Link> 后参与讨论
          </p>
        )}

        <div className="space-y-4">
          {discussions.map((root) => (
            <div key={root.id} className="border-b border-slate-100 pb-4 last:border-0">
              <div className="mb-1 flex items-center gap-2 text-sm">
                <span className="font-semibold text-slate-700">{root.user.username}</span>
                <span className="text-xs text-slate-400">{new Date(root.createdAt).toLocaleString('zh-CN')}</span>
              </div>
              <p className="text-slate-700">{root.content}</p>
              {user && (
                <button onClick={() => setReplyTo(root.id)} className="mt-2 text-xs text-brand-700 hover:underline">
                  回复
                </button>
              )}
              {root.replies?.length > 0 && (
                <div className="mt-3 space-y-3 pl-4 border-l-2 border-slate-100">
                  {root.replies.map((reply) => (
                    <div key={reply.id}>
                      <div className="mb-1 flex items-center gap-2 text-sm">
                        <span className="font-semibold text-slate-700">{reply.user.username}</span>
                        <span className="text-xs text-slate-400">{new Date(reply.createdAt).toLocaleString('zh-CN')}</span>
                      </div>
                      <p className="text-sm text-slate-600">{reply.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {discussions.length === 0 && <div className="text-center text-slate-400">暂无评论,快来抢沙发</div>}
        </div>
      </div>
    </div>
  );
}

function Bar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span>{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
