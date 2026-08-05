import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';

export default function Layout({ children }) {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  function handleLogout() {
    clearAuth();
    navigate('/login');
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link to="/matches" className="flex items-center gap-2 font-bold text-brand-700">
            <svg className="h-6 w-6" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="48" fill="#16a34a" />
              <path d="M50 20 L55 45 L80 50 L55 55 L50 80 L45 55 L20 50 L45 45 Z" fill="white" />
            </svg>
            <span>Football Forecast</span>
          </Link>

          <nav className="flex items-center gap-4 text-sm">
            <Link to="/matches" className="text-slate-600 hover:text-brand-700">赛事</Link>
            <Link to="/leaderboard" className="text-slate-600 hover:text-brand-700">排行榜</Link>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-slate-600 sm:inline">{user.username}</span>
                <button onClick={handleLogout} className="btn-secondary text-xs">退出</button>
              </div>
            ) : !isAuthPage ? (
              <Link to="/login" className="btn-primary text-xs">登录</Link>
            ) : null}
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6">
        {children}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        AI4SE Final Project · 足球赛事浏览·比分预测·赛后讨论
      </footer>
    </div>
  );
}
