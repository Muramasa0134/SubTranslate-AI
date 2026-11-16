import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ApiKeyModal from './components/ApiKeyModal';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TranslatePage from './pages/TranslatePage';
import HistoryPage from './pages/HistoryPage';
import HistoryDetailPage from './pages/HistoryDetailPage';
import { getConfig } from './services/api';

export default function App() {
  const [config, setConfig] = useState(null);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const data = await getConfig();
      setConfig(data);
    } catch (err) {
      console.error('Failed to load server configuration:', err);
    }
  };

  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-dark-950 text-slate-100">
        <Navbar
          config={config}
          onOpenKeyModal={() => setIsKeyModalOpen(true)}
        />

        <main className="flex-1">
          <Routes>
            <Route
              path="/"
              element={
                <Home
                  config={config}
                  onOpenKeyModal={() => setIsKeyModalOpen(true)}
                />
              }
            />
            <Route
              path="/dashboard"
              element={
                <Dashboard
                  config={config}
                  onOpenKeyModal={() => setIsKeyModalOpen(true)}
                />
              }
            />
            <Route
              path="/translate"
              element={
                <TranslatePage
                  config={config}
                  onOpenKeyModal={() => setIsKeyModalOpen(true)}
                />
              }
            />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/history/:jobId" element={<HistoryDetailPage />} />
          </Routes>
        </main>

        <Footer />

        <ApiKeyModal
          isOpen={isKeyModalOpen}
          onClose={() => setIsKeyModalOpen(false)}
          onKeyUpdated={fetchConfig}
          currentConfig={config}
        />
      </div>
    </Router>
  );
}
