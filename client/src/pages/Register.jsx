import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api';
import { useAuthStore } from '../store';

export default function Register() {
  const [form, setForm] = useState({ email: '', username: '', code: '', password: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    if (!form.code || form.code.length < 4) {
      setError('请输入验证码');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', {
        email: form.email,
        username: form.username,
        password: form.password,
      });
      setAuth(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <div className="rounded-2xl bg-white p-8 shadow-xl">
        <h1 className="mb-1 text-center text-2xl font-bold text-slate-900">注册</h1>
        <p className="mb-6 text-center text-sm text-slate-500">足球实时比分预测、赛事数据分析与讨论平台</p>
        {error && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">用户名：</label>
            <input type="text" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">邮箱：</label>
            <input type="email" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">请输入验证码：</label>
            <div className="flex gap-2">
              <input type="text" inputMode="numeric" className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="请输入验证码" required />
              <button type="button" className="whitespace-nowrap rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700" onClick={() => alert('演示环境：请输入任意 4 位以上数字')}>
                获取验证码
              </button>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">密码：</label>
            <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-slate-700">确认密码：</label>
            <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500" value={form.confirmPassword} onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} required minLength={8} />
          </div>
          <button type="submit" className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          已有账号？<Link to="/login" className="font-bold text-brand-600 hover:underline">登录</Link>
        </p>
      </div>
    </div>
  );
}
