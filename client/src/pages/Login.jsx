import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuthStore } from '../store';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">登录</h1>
        <p className="mb-6 text-center text-sm text-slate-500">足球赛事浏览、比分预测与赛后讨论平台</p>
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">邮箱：</label>
            <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">密码：</label>
            <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </div>
          <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700" disabled={loading}>
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          还没有账号？<Link to="/register" className="font-bold text-brand-600 hover:underline">注册</Link>
        </p>
      </div>
    </div>
  );
}
