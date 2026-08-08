import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function Layout({ children }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    clearAuth();
    navigate('/matches');
  }

  const navItems = [
    { to: '/matches', label: '赛程' },
    { to: '/teams', label: '球队' },
    { to: '/leaderboard', label: '积分榜' },
    { to: '/faqs', label: '常见问题' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-pitch-950">
      <header className="sticky top-0 z-50 border-b border-pitch-800 bg-pitch-900/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/matches" className="flex items-center gap-2.5 font-black text-white">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-lg">
              苏
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-base tracking-wide">苏超 2026</span>
              <span className="text-[10px] font-normal text-slate-400">江苏省城市足球联赛</span>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-lg px-3 py-1.5 transition ${
                  location.pathname.startsWith(item.to)
                    ? 'bg-pitch-800 text-white'
                    : 'text-slate-400 hover:bg-pitch-800/50 hover:text-white'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-sm text-slate-300 sm:inline">{user.username}</span>
                <button onClick={handleLogout} className="btn-secondary text-xs">退出</button>
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-xs">登录</Link>
                <Link to="/register" className="btn-primary text-xs">注册</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-pitch-800 bg-pitch-900 py-5 text-center text-xs text-slate-500">
        2026 江苏省城市足球联赛 · 赛事浏览 · 比分预测 · 赛后讨论 · 个人作业演示
      </footer>
    </div>
  );
}
