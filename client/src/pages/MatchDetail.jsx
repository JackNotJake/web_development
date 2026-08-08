import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuthStore } from '../store';
import { connectSocket, getSocket, joinMatchRoom, leaveMatchRoom } from '../socket';
import TeamLogo from '../components/TeamLogo';

const tabs = [
  { key: 'analysis', label: '分析' },
  { key: 'prediction', label: '预测' },
  { key: 'discussion', label: '讨论' },
];

function statusLabel(status) {
  const map = { SCHEDULED: '未开始', LIVE: '进行中', FINISHED: '已结束' };
  return map[status] || status;
}

function formatPercent(n) {
  return `${(n * 100).toFixed(1)}%`;
}

function resultOf(match, teamId) {
  const isHome = match.homeTeamId === teamId;
  const myScore = isHome ? match.homeScore : match.awayScore;
  const oppScore = isHome ? match.awayScore : match.homeScore;
  if (myScore > oppScore) return { label: '胜', class: 'bg-emerald-500/20 text-emerald-400' };
  if (myScore < oppScore) return { label: '负', class: 'bg-red-500/20 text-red-400' };
  return { label: '平', class: 'bg-yellow-500/20 text-yellow-400' };
}

function RecentTable({ team, matches }) {
  if (!matches?.length) {
    return <div className="py-8 text-center text-sm text-slate-500">暂无近期战绩</div>;
  }

  const wins = matches.filter((m) => resultOf(m, team.id).label === '胜').length;
  const draws = matches.filter((m) => resultOf(m, team.id).label === '平').length;
  const losses = matches.filter((m) => resultOf(m, team.id).label === '负').length;

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-pitch-800 px-4 py-3">
        <span className="font-bold text-white">{team.name}</span>
        <span className="ml-2 text-xs text-slate-400">近期战绩：{wins}胜{losses}负{draws}平</span>
      </div>
      <table className="table-dark">
        <thead>
          <tr>
            <th className="w-24">日期</th>
            <th>主队</th>
            <th className="w-12 text-center">比分</th>
            <th>客队</th>
            <th className="w-10">赛果</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((m) => {
            const res = resultOf(m, team.id);
            return (
              <tr key={m.id}>
                <td>{new Date(m.utcDate).toLocaleDateString('zh-CN')}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <TeamLogo team={m.homeTeam} size={20} />
                    <span className={m.homeTeamId === team.id ? 'text-white' : 'text-slate-400'}>{m.homeTeam.name}</span>
                  </div>
                </td>
                <td className="text-center font-mono text-white">{m.homeScore}-{m.awayScore}</td>
                <td>
                  <div className="flex items-center gap-1.5">
                    <TeamLogo team={m.awayTeam} size={20} />
                    <span className={m.awayTeamId === team.id ? 'text-white' : 'text-slate-400'}>{m.awayTeam.name}</span>
                  </div>
                </td>
                <td>
                  <span className={`badge ${res.class}`}>{res.label}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function MatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token } = useAuthStore();
  const [match, setMatch] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [discussions, setDiscussions] = useState([]);
  const [activeTab, setActiveTab] = useState('analysis');
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [myPrediction, setMyPrediction] = useState(null);
  const [comment, setComment] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const joinedRef = useRef(false);

  async function loadAll() {
    try {
      const requests = [
        api.get(`/matches/${id}`),
        api.get(`/matches/${id}/prediction-final`),
        api.get(`/matches/${id}/discussions`, { params: { limit: 100 } }),
      ];
      if (user) {
        requests.push(api.get(`/matches/${id}/my-prediction`));
      }
      const [mRes, fRes, dRes, pRes] = await Promise.all(requests);
      setMatch(typeof mRes.data === 'object' && mRes.data !== null ? mRes.data : null);
      setForecast(typeof fRes.data === 'object' && fRes.data !== null ? fRes.data : null);
      setDiscussions(typeof dRes.data === 'object' && dRes.data !== null ? (dRes.data.discussions || []) : []);
      setMyPrediction(pRes?.data?.prediction || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadAll();
  }, [id]);

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
      await loadAll();
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

  if (loading) return <p className="text-slate-400">加载中...</p>;
  if (error || !match) return <div className="rounded bg-red-500/10 p-3 text-sm text-red-400">{error || '赛事不存在'}</div>;

  const date = new Date(match.utcDate);
  const canPredict = match.status === 'SCHEDULED';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between text-sm text-slate-400">
        <Link to="/matches" className="hover:text-white">← 返回赛程</Link>
        <div className="flex gap-3">
          <span>赛段：常规赛</span>
          <span>总场次：第{match.matchday ?? '-'}轮</span>
          <span>比赛日期：{date.toLocaleString('zh-CN', { hour12: false }).replace(/:\d{2}$/, '')}</span>
        </div>
      </div>

      <section className="card p-6">
        <h1 className="mb-6 text-center text-xl font-bold text-brand-500">比赛分析：{match.homeTeam.name} vs {match.awayTeam.name}</h1>

        <div className="flex items-center justify-center gap-6 sm:gap-12">
          <div className="flex flex-col items-center gap-3">
            <TeamLogo team={match.homeTeam} size={88} />
            <div className="text-xl font-bold text-white">{match.homeTeam.name}</div>
            <span className="rounded-full bg-pitch-800 px-3 py-1 text-xs text-slate-400">
              {match.homeTeam.alias}
            </span>
          </div>

          <div className="flex flex-col items-center gap-2">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-blue-600 text-3xl font-black text-white shadow-lg">
              VS
            </div>
            <span className="text-xs text-slate-500">{statusLabel(match.status)}</span>
          </div>

          <div className="flex flex-col items-center gap-3">
            <TeamLogo team={match.awayTeam} size={88} />
            <div className="text-xl font-bold text-white">{match.awayTeam.name}</div>
            <span className="rounded-full bg-pitch-800 px-3 py-1 text-xs text-slate-400">
              {match.awayTeam.alias}
            </span>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-slate-400">
          比赛场地：{match.venue || '-'}
        </div>
      </section>

      <div className="flex border-b border-pitch-800">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`relative px-5 py-3 text-sm font-medium transition ${
              activeTab === tab.key ? 'text-brand-500' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span className="absolute bottom-0 left-0 h-0.5 w-full bg-brand-500" />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'analysis' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <RecentTable team={match.homeTeam} matches={match.homeRecent} />
          <RecentTable team={match.awayTeam} matches={match.awayRecent} />
        </div>
      )}

      {activeTab === 'prediction' && (
        <div className="space-y-4">
          {forecast && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-bold text-white">智能预测</h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm text-slate-400">最可能比分</div>
                  <div className="text-3xl font-bold text-brand-500">
                    {forecast.mostLikely[0]} : {forecast.mostLikely[1]}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">基于 Elo + Poisson 模型</div>
                </div>
                <div>
                  <div className="mb-2 text-sm text-slate-400">胜/平/负概率</div>
                  <div className="space-y-2">
                    <Bar label={`主胜 ${formatPercent(forecast.final3[0])}`} value={forecast.final3[0]} color="bg-brand-500" />
                    <Bar label={`平局 ${formatPercent(forecast.final3[1])}`} value={forecast.final3[1]} color="bg-yellow-500" />
                    <Bar label={`客胜 ${formatPercent(forecast.final3[2])}`} value={forecast.final3[2]} color="bg-blue-500" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {canPredict && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-bold text-white">提交你的预测</h2>
              {user ? (
                <form onSubmit={submitPrediction} className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">主队</label>
                    <input type="number" min={0} className="input w-20" value={homeScore} onChange={(e) => setHomeScore(e.target.value)} required />
                  </div>
                  <div className="pb-2 text-slate-500">:</div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-400">客队</label>
                    <input type="number" min={0} className="input w-20" value={awayScore} onChange={(e) => setAwayScore(e.target.value)} required />
                  </div>
                  <button type="submit" className="btn-primary">提交预测</button>
                </form>
              ) : (
                <p className="text-sm text-slate-400">
                  <Link to="/login" className="text-brand-500 hover:underline">登录</Link> 后提交预测
                </p>
              )}
            </div>
          )}

          {myPrediction && (
            <div className="card p-6">
              <h2 className="mb-4 text-lg font-bold text-white">我的预测</h2>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8">
                <div className="flex items-center gap-2">
                  <TeamLogo team={match.homeTeam} size={36} />
                  <span className="font-medium text-white">{match.homeTeam.name}</span>
                </div>
                <div className="text-3xl font-black text-brand-500">
                  {myPrediction.homeScore} : {myPrediction.awayScore}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white">{match.awayTeam.name}</span>
                  <TeamLogo team={match.awayTeam} size={36} />
                </div>
              </div>
              <div className="mt-4 text-center text-xs text-slate-500">
                预测于 {new Date(myPrediction.createdAt).toLocaleString('zh-CN')}
              </div>
              <p className="mt-2 text-center text-xs text-slate-500">
                同场比赛仅保留最新预测，后续提交将覆盖当前记录
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'discussion' && (
        <div className="card p-6">
          <h2 className="mb-4 text-lg font-bold text-white">赛后讨论</h2>
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
                {replyTo && <button type="button" onClick={() => setReplyTo(null)} className="text-sm text-slate-400 hover:text-white">取消回复</button>}
              </div>
            </form>
          ) : (
            <p className="mb-6 text-sm text-slate-400">
              <Link to="/login" className="text-brand-500 hover:underline">登录</Link> 后参与讨论
            </p>
          )}

          <div className="space-y-4">
            {discussions.map((root) => (
              <div key={root.id} className="border-b border-pitch-800 pb-4 last:border-0">
                <div className="mb-1 flex items-center gap-2 text-sm">
                  <span className="font-semibold text-white">{root.user?.username}</span>
                  <span className="text-xs text-slate-500">{new Date(root.createdAt).toLocaleString('zh-CN')}</span>
                </div>
                <p className="text-slate-300">{root.content}</p>
                {user && (
                  <button onClick={() => setReplyTo(root.id)} className="mt-2 text-xs text-brand-500 hover:underline">
                    回复
                  </button>
                )}
                {root.replies?.length > 0 && (
                  <div className="mt-3 space-y-3 border-l-2 border-pitch-800 pl-4">
                    {root.replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="mb-1 flex items-center gap-2 text-sm">
                          <span className="font-semibold text-white">{reply.user?.username}</span>
                          <span className="text-xs text-slate-500">{new Date(reply.createdAt).toLocaleString('zh-CN')}</span>
                        </div>
                        <p className="text-sm text-slate-400">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {discussions.length === 0 && <div className="text-center text-slate-500">暂无评论，快来抢沙发</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function Bar({ label, value, color }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-300">
        <span>{label}</span>
      </div>
      <div className="h-2 w-full rounded-full bg-pitch-800">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
