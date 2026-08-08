import { Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store';
import { connectSocket, disconnectSocket } from './socket';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Matches from './pages/Matches';
import MatchDetail from './pages/MatchDetail';
import Teams from './pages/Teams';
import Leaderboard from './pages/Leaderboard';
import Faqs from './pages/Faqs';
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

  useEffect(() => {
    if (token && !user) {
      clearAuth();
    }
  }, [token, user, clearAuth]);

  return (
    <Layout>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/matches/:id" element={<MatchDetail />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/faqs" element={<Faqs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </ErrorBoundary>
    </Layout>
  );
}

export default App;
