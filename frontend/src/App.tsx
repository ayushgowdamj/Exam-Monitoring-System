import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Overview } from './pages/Overview';
import { VideoAnalysis } from './pages/VideoAnalysis';
import { DetectionEvents } from './pages/DetectionEvents';
import { ExamSessions } from './pages/ExamSessions';
import { Analytics } from './pages/Analytics';
import { CameraDevices } from './pages/CameraDevices';
import { LiveMonitoring } from './pages/LiveMonitoring';
import { Settings } from './pages/Settings';
import { fetchHealth, HealthStatus } from './api/client';

export const App: React.FC = () => {
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const refreshHealth = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (err) {
      console.error('Health check failed:', err);
    }
  };

  // Poll backend health on mount and every 15 seconds
  useEffect(() => {
    refreshHealth();
    const interval = setInterval(refreshHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Layout health={health} onRefreshHealth={refreshHealth}>
      <Routes>
        <Route path="/" element={<Overview health={health} />} />
        <Route path="/video-analysis" element={<VideoAnalysis />} />
        <Route path="/events" element={<DetectionEvents />} />
        <Route path="/sessions" element={<ExamSessions />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/cameras" element={<CameraDevices />} />
        <Route path="/live" element={<LiveMonitoring />} />
        <Route path="/settings" element={<Settings health={health} />} />
      </Routes>
    </Layout>
  );
};

export default App;