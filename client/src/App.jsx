import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store';
import { connectSocket, disconnectSocket } from './socket';
import Layout from './components/Layout';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Leaderboard from './pages/Leaderboard';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const { token, user, clearAuth } = useAuthStore();

  useEffect(() => {
    if (token) {
      connectSocket(token);
    } else {
      disconnectSocket();
    }
    return () => disconnectSocket();
  }, [token]);

  // token 存在但页面刷新后 store 未恢复 user(仅持久化 user 会失效)则清除
  useEffect(() => {
    if (token && !user) {
      clearAuth();
    }
  }, [token, user, clearAuth]);

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/matches" replace />} />
        <Route path="/matches" element={<Matches />} />
        <Route path="/matches/:id" element={<MatchDetail />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </Layout>
  );
}

export default App;
