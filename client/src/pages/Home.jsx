import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import TeamLogo from '../components/TeamLogo';

export default function Home() {
  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/matches', { params: { status: 'SCHEDULED', limit: 10 } }),
      api.get('/matches/teams'),
      api.get('/matches/faqs'),
    ]).then(([m, t, f]) => {
      setMatches(m.data?.matches || []);
      setTeams(t.data?.teams || []);
      setFaqs(f.data?.faqs || []);
    });
  }, []);

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  }

  function formatTime(dateStr) {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-pitch-900 to-pitch-800 p-8 text-center">
        <div className="relative z-10">
          <h1 className="mb-3 text-3xl font-black text-white md:text-4xl">2026 江苏省城市足球联赛</h1>
          <p className="mx-auto max-w-2xl text-sm leading-relaxed text-slate-300 md:text-base">
            城市荣耀，绿茵争锋。十三座设区市代表队延续「一城一队」的主客场较量格局，把职业级办赛标准与全民参与、城市荣誉结合。
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">近期赛程</h2>
          <Link to="/matches" className="text-sm text-brand-500 hover:underline">查看全部 →</Link>
        </div>
        <div className="card overflow-hidden">
          <table className="table-dark">
            <thead>
              <tr>
                <th className="w-24">日期</th>
                <th className="w-20">时间</th>
                <th>对阵</th>
                <th>场地</th>
                <th className="w-24">操作</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.id}>
                  <td>{formatDate(match.utcDate)}</td>
                  <td>{formatTime(match.utcDate)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <TeamLogo team={match.homeTeam} size={24} />
                      <span className="text-white">{match.homeTeam.name}</span>
                      <span className="text-xs text-slate-500">vs</span>
                      <TeamLogo team={match.awayTeam} size={24} />
                      <span className="text-white">{match.awayTeam.name}</span>
                    </div>
                  </td>
                  <td className="text-slate-400">{match.venue || '-'}</td>
                  <td>
                    <Link to={`/matches/${match.id}`} className="text-xs font-medium text-brand-500 hover:underline">分析</Link>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">暂无近期赛程</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">赛事介绍</h2>
        </div>
        <div className="card p-6 text-sm leading-relaxed text-slate-300">
          <p className="mb-4">
            2026 江苏省城市足球联赛（俗称苏超，英文简称多写作 JSCL）进入第二个赛季周期：常规赛阶段紧随官方赛历推进，2026 年 4 月 11 日前后揭幕、赛历延续至秋季，十三座设区市代表队延续「一城一队」的主客场较量格局。
          </p>
          <p className="mb-4">
            联赛主题聚焦「城市荣耀，绿茵争锋」：主场票价亲民、票务统一平台与「体育 + 城市」推介模式，让观众在主场为城市助威的同时，也能触达江苏文旅与本土企业品牌。
          </p>
          <p>
            依据公开资料，联赛延续 13 支代表队对应江苏 13 个设区市的设置。常规赛阶段通常采用主客场单循环；常规赛前八名进入淘汰赛，以单场决胜等方式直至产生冠军。
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">十三设区市代表队</h2>
          <Link to="/teams" className="text-sm text-brand-500 hover:underline">查看全部 →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {teams.slice(0, 8).map((t) => (
            <div key={t.id} className="card flex items-center gap-3 p-4">
              <TeamLogo team={t} size={40} />
              <div>
                <div className="font-bold text-white">{t.name}</div>
                <div className="text-xs text-slate-400">{t.alias}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">常见问题</h2>
          <Link to="/faqs" className="text-sm text-brand-500 hover:underline">查看全部 →</Link>
        </div>
        <div className="space-y-3">
          {faqs.slice(0, 4).map((faq) => (
            <div key={faq.id} className="card p-4">
              <div className="mb-1 font-bold text-white">{faq.question}</div>
              <div className="text-sm text-slate-400 line-clamp-2">{faq.answer}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
