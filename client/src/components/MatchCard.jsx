import { Link } from 'react-router-dom';

function statusLabel(status) {
  const map = { SCHEDULED: '未开始', LIVE: '进行中', FINISHED: '已结束', POSTPONED: '延期' };
  return map[status] || status;
}

function statusColor(status) {
  const map = { SCHEDULED: 'bg-slate-100 text-slate-700', LIVE: 'bg-red-100 text-red-700', FINISHED: 'bg-brand-100 text-brand-700' };
  return map[status] || 'bg-slate-100 text-slate-700';
}

export default function MatchCard({ match }) {
  const date = new Date(match.utcDate);
  const score = match.status === 'FINISHED'
    ? `${match.homeScore ?? 0} : ${match.awayScore ?? 0}`
    : 'vs';

  return (
    <Link to={`/matches/${match.id}`} className="card p-4 hover:shadow-md transition block">
      <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
        <span>{match.competition} · 第 {match.matchday ?? '-'} 轮</span>
        <span className={`rounded px-2 py-0.5 ${statusColor(match.status)}`}>{statusLabel(match.status)}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-slate-800">{match.homeTeam.name}</div>
          <div className="text-xs text-slate-500">Elo {match.homeTeam.eloRating}</div>
        </div>
        <div className="px-4 text-2xl font-bold text-brand-700">{score}</div>
        <div className="flex-1 text-center">
          <div className="text-lg font-semibold text-slate-800">{match.awayTeam.name}</div>
          <div className="text-xs text-slate-500">Elo {match.awayTeam.eloRating}</div>
        </div>
      </div>
      <div className="mt-2 text-center text-xs text-slate-400">
        {date.toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
      </div>
    </Link>
  );
}
