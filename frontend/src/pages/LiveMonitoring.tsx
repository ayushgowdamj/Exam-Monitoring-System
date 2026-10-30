import React, { useState, useEffect } from 'react';
import {
  Radio,
  Camera,
  Play,
  Pause,
  Maximize2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Layers,
  Settings,
  Grid,
} from 'lucide-react';
import { listCameras, CameraDevice } from '../api/client';
import { Link } from 'react-router-dom';

export const LiveMonitoring: React.FC = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<string | null>(null);
  const [gridSize, setGridSize] = useState<'1x1' | '2x2' | '3x3'>('2x2');
  const [isSimulatingStream, setIsSimulatingStream] = useState(true);

  useEffect(() => {
    const fetchCams = async () => {
      setLoading(true);
      try {
        const cams = await listCameras();
        setCameras(cams);
        if (cams.length > 0) {
          setSelectedCamera(cams[0].id);
        }
      } catch (err) {
        console.error('Failed to fetch cameras:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchCams();
  }, []);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Radio className="w-7 h-7 text-rose-500 animate-pulse" />
              Live Exam Monitoring
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Live Surveillance
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Real-time optical feed grid for active examination halls and invigilation stations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Grid Layout Switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs">
            {(['1x1', '2x2', '3x3'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setGridSize(mode)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  gridSize === mode
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <Link
            to="/video-analysis"
            className="px-4 py-2 rounded-xl text-sm font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-2 border border-slate-700 shadow-sm"
          >
            Recorded Analysis
          </Link>
        </div>
      </div>

      {/* Main Monitoring Deck */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Stream View Area (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <div
            className={`grid gap-4 ${
              gridSize === '1x1'
                ? 'grid-cols-1'
                : gridSize === '2x2'
                ? 'grid-cols-1 md:grid-cols-2'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}
          >
            {/* Feed Cards (simulated streams based on registered cameras or default fallback cards) */}
            {(cameras.length > 0 ? cameras : [null, null]).slice(0, gridSize === '1x1' ? 1 : gridSize === '2x2' ? 4 : 6).map((cam, idx) => (
              <div
                key={cam ? cam.id : `mock-${idx}`}
                className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden group shadow-lg flex flex-col aspect-video"
              >
                {/* Video Feed Simulation Background */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-900/80 via-slate-950/90 to-black flex items-center justify-center">
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="text-center z-10 px-4">
                    <Camera className="w-10 h-10 text-slate-700 mx-auto mb-2 group-hover:scale-110 transition-transform" />
                    <div className="text-xs font-semibold text-slate-400">
                      {cam ? cam.name : `Exam Hall Cam #${idx + 1}`}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5 font-mono">
                      {cam?.stream_url ? cam.stream_url : 'Awaiting RTSP/MJPEG handshake...'}
                    </div>
                  </div>
                </div>

                {/* Stream Header Overlay */}
                <div className="relative z-20 p-3 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wide uppercase border border-rose-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      LIVE
                    </span>
                    <span className="text-xs font-medium text-white truncate max-w-[120px]">
                      {cam ? cam.name : `CAM-0${idx + 1}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800">
                      25 FPS
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800">
                      1080p
                    </span>
                  </div>
                </div>

                {/* Center Inference Mock Bounding Box */}
                {isSimulatingStream && idx === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-15">
                    <div className="w-40 h-28 border-2 border-emerald-500/80 rounded-lg relative bg-emerald-500/5 animate-pulse">
                      <span className="absolute -top-3 left-2 px-1.5 py-0.5 rounded bg-emerald-600 text-white font-mono text-[9px] font-bold">
                        non-cheating 94%
                      </span>
                    </div>
                  </div>
                )}

                {/* Bottom Overlay Controls */}
                <div className="relative z-20 mt-auto p-3 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[11px] text-slate-300">
                    {cam?.location || 'General Seating Area'}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsSimulatingStream(!isSimulatingStream)}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                      title="Toggle Model Overlay"
                    >
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                    <button
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors"
                      title="Fullscreen"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Monitoring Controls & Notice */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Continuous Inference Engine</h4>
                <p className="text-[11px] text-slate-400">
                  Real-time frames are sampled at interval rates to maintain low latency and server load.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/cameras"
                className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors border border-slate-700"
              >
                Manage Camera Devices
              </Link>
            </div>
          </div>
        </div>

        {/* Sidebar Controls & Alerts Feed (1 col) */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
            <h3 className="font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Real-Time Feed Stats
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Active Cameras</span>
                <span className="font-semibold text-white">{cameras.length} registered</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Inference Delay</span>
                <span className="font-mono text-emerald-400">~42ms</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-800">
                <span className="text-slate-400">AI Confidence</span>
                <span className="font-mono text-blue-400">0.25 (Default)</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400">Resolution Mode</span>
                <span className="text-slate-300">Auto Adaptive</span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm space-y-3">
            <h3 className="font-semibold text-white text-sm mb-2">Live Session Actions</h3>
            <Link
              to="/video-analysis"
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
            >
              Analyze Prerecorded Video
            </Link>
            <Link
              to="/events"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all border border-slate-700"
            >
              View Detection Log
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

