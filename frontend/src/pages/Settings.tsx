import React, { useState } from 'react';
import {
  Settings as SettingsIcon,
  ShieldCheck,
  Server,
  Database,
  Sliders,
  HardDrive,
  FileVideo,
  Cpu,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Terminal,
} from 'lucide-react';
import { HealthStatus, fetchHealth, getApiBase, setApiBase } from '../api/client';

interface SettingsProps {
  health: HealthStatus | null;
}

export const Settings: React.FC<SettingsProps> = ({ health }) => {
  const [currentHealth, setCurrentHealth] = useState<HealthStatus | null>(health);
  const [refreshing, setRefreshing] = useState(false);
  const [confidence, setConfidence] = useState<number>(0.25);
  const [savedNotice, setSavedNotice] = useState(false);
  const [backendUrl, setBackendUrl] = useState<string>(getApiBase());
  const [apiSavedNotice, setApiSavedNotice] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const data = await fetchHealth();
      setCurrentHealth(data);
    } catch (err) {
      console.error('Failed to refresh health:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSaveThreshold = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const activeHealth = currentHealth || health;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <SettingsIcon className="w-7 h-7 text-blue-500" />
            System Settings & Diagnostics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure inference thresholds, inspect backend runtime status, and check storage pathways.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-2 self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-400' : ''}`} />
          Run Health Diagnostics
        </button>
      </div>

      {/* Backend & Environment Health Card */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm shadow-md">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
          <Server className="w-5 h-5 text-blue-400" />
          Runtime Environment & Services
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Backend Status */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>FastAPI Backend</span>
              {activeHealth?.backend === 'running' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {activeHealth?.backend || 'Offline'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">Port 8000 / ASGI Server</div>
          </div>

          {/* Database Status */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Database Engine</span>
              {activeHealth?.database === 'connected' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white capitalize">
              {activeHealth?.database || 'Disconnected'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">SQLite via SQLAlchemy</div>
          </div>

          {/* Model Status */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>YOLO Neural Weights</span>
              {activeHealth?.model_loaded ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {activeHealth?.model_loaded ? 'Loaded' : 'Not Loaded'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono truncate">
              {activeHealth?.model_file || 'best.pt'}
            </div>
          </div>

          {/* Demo Video */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/80">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
              <span>Demo Footage</span>
              {activeHealth?.demo_video_available ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <Info className="w-4 h-4 text-slate-500" />
              )}
            </div>
            <div className="text-lg font-bold text-white">
              {activeHealth?.demo_video_available ? 'Ready' : 'Not Found'}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">demo.mp4 in root</div>
          </div>
        </div>
      </div>

      {/* Model & Inference Configurations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inference Tuning */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm shadow-md flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
              <Sliders className="w-5 h-5 text-blue-400" />
              Inference Parameter Controls
            </h2>

            <form onSubmit={handleSaveThreshold} className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Default Detection Confidence Threshold
                  </label>
                  <span className="text-xs font-mono font-bold text-blue-400">
                    {(confidence * 100).toFixed(0)}% ({confidence.toFixed(2)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.10"
                  max="0.90"
                  step="0.05"
                  value={confidence}
                  onChange={(e) => setConfidence(parseFloat(e.target.value))}
                  className="w-full accent-blue-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Adjust bounding box confidence sensitivity. Lower values capture subtle cheating behaviors; higher values eliminate false positives.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-md shadow-blue-500/20"
                >
                  Save Default Threshold
                </button>
                {savedNotice && (
                  <span className="ml-3 text-xs text-emerald-400 animate-in fade-in">
                    ✓ Setting applied for new runs!
                  </span>
                )}
              </div>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-xs space-y-2">
            <span className="text-slate-400 font-medium">Model Classification Classes:</span>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[11px]">
                Class 0: cheating
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-[11px]">
                Class 1: non-cheating
              </span>
            </div>
          </div>
        </div>

        {/* Storage & Path Architecture */}
        <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm shadow-md">
          <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-4">
            <HardDrive className="w-5 h-5 text-blue-400" />
            File Storage & System Paths
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block font-medium mb-1">Model Weights Path</span>
              <code className="text-blue-300 text-[11px] break-all">
                Detecting-Cheating-...-Real-Time-Exam-Hall-Monitoring/best.pt
              </code>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block font-medium mb-1">Processed Video Outputs</span>
              <code className="text-emerald-300 text-[11px] break-all">
                AI-Exam-Monitor/outputs/
              </code>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block font-medium mb-1">Uploaded Exam Videos</span>
              <code className="text-purple-300 text-[11px] break-all">
                AI-Exam-Monitor/uploads/ (Max 500 MB)
              </code>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
              <span className="text-slate-400 block font-medium mb-1">Relational Database File</span>
              <code className="text-amber-300 text-[11px] break-all">
                AI-Exam-Monitor/examguard.db (SQLite)
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Backend API Connection Settings */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm shadow-md">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-2">
          <Server className="w-5 h-5 text-blue-400" />
          Backend API Host & Deployment URL
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          When deployed to Vercel, specify the remote backend endpoint running the YOLO model (e.g. Render, Railway, or local tunnel). Leave blank for default local proxy.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            setApiBase(backendUrl);
            setApiSavedNotice(true);
            setTimeout(() => setApiSavedNotice(false), 3000);
            handleRefresh();
          }}
          className="space-y-4 max-w-xl"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              API Base URL:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                placeholder="http://127.0.0.1:8000 or https://your-backend.up.railway.app"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md shadow-blue-600/30"
              >
                Save URL
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Current: <code className="text-blue-400 font-mono">{backendUrl || '(Direct Relative Proxy / Same Origin)'}</code>
            </p>
          </div>

          {apiSavedNotice && (
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Backend API URL updated successfully! Testing connection...
            </div>
          )}
        </form>
      </div>

      {/* Developer & System Information */}
      <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-sm shadow-md">
        <h2 className="text-base font-semibold text-white flex items-center gap-2 mb-3">
          <Terminal className="w-5 h-5 text-blue-400" />
          System Information
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Version</span>
            <span className="text-white font-medium">{activeHealth?.version || '1.0.0'}</span>
          </div>
          <div>
            <span className="text-slate-500 block">Framework</span>
            <span className="text-white font-medium">FastAPI + PyTorch + Vite</span>
          </div>
          <div>
            <span className="text-slate-500 block">Inference Engine</span>
            <span className="text-white font-medium">Ultralytics YOLOv8</span>
          </div>
          <div>
            <span className="text-slate-500 block">Hardware Acceleration</span>
            <span className="text-white font-medium">CPU / CUDA Auto-detect</span>
          </div>
        </div>
      </div>
    </div>
  );
};

