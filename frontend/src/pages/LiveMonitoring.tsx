import React, { useState, useEffect, useRef } from 'react';
import {
  Radio,
  Camera,
  Play,
  Square,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Maximize2,
  ExternalLink,
  Wifi,
  WifiOff,
  Clock,
  Sliders,
  CheckCircle2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  startLiveMonitoring,
  stopLiveMonitoring,
  fetchLiveStatus,
  LiveStatus,
  getApiBase,
} from '../api/client';

export const LiveMonitoring: React.FC = () => {
  const [cameraIp, setCameraIp] = useState<string>('10.134.243.228');
  const [status, setStatus] = useState<LiveStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [frameTimestamp, setFrameTimestamp] = useState<number>(Date.now());
  const [viewMode, setViewMode] = useState<'ai_stream' | 'direct_esp32'>('ai_stream');
  const [frameError, setFrameError] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const lastCheatingTimeRef = useRef<number>(0);

  // Check if running on Vercel host
  const isVercelHost = typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app');
  const hasCustomApiBase = Boolean(getApiBase());

  // Synthesize audible warning beep using Web Audio API in browser
  const playAlertBeep = () => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const ctx = new AudioCtxClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      // Audio autoplay policy may require user interaction first
    }
  };

  // Poll status regularly
  useEffect(() => {
    let isMounted = true;
    const checkStatus = async () => {
      try {
        const s = await fetchLiveStatus();
        if (isMounted) {
          setStatus(s);
          if (s.running) {
            setFrameTimestamp(Date.now());

            // Check if cheating was detected in the latest frame
            if (s.latest_detections && s.latest_detections.some((d) => d.class_name === 'cheating')) {
              const now = Date.now();
              if (now - lastCheatingTimeRef.current > 1200) {
                lastCheatingTimeRef.current = now;
                playAlertBeep();
              }
            }
          }
          if (s.error && s.running) {
            setErrorMessage(s.error);
          }
        }
      } catch (err) {
        // Backend might be warming up
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [soundEnabled]);

  const handleStart = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setFrameError(false);
    try {
      const res = await startLiveMonitoring(cameraIp);
      if (res.ok) {
        setFrameTimestamp(Date.now());
        const s = await fetchLiveStatus();
        setStatus(s);
      } else {
        setErrorMessage(res.message || 'Failed to start live stream');
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.detail || 'Unable to connect to camera or start live background worker'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await stopLiveMonitoring();
    } catch (err: any) {
      console.warn('Stop notice:', err);
    } finally {
      // Optimistically update running status to eliminate UI lag
      setStatus((prev) => (prev ? { ...prev, running: false, connected: false } : null));
      try {
        const s = await fetchLiveStatus();
        setStatus(s);
      } catch (e) {
        // ignore
      }
      setIsLoading(false);
    }
  };

  // Clean camera IP for direct link
  const cleanIp = cameraIp.replace(/^https?:\/\//, '').replace(/\/.*$/, '').trim();
  const directEsp32Url = `http://${cleanIp}/`;
  const directMjpegUrl = `http://${cleanIp}:81/stream`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
              ESP32-CAM Live AI Exam Monitor
            </h1>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                status?.running && status?.connected
                  ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                  : status?.running
                  ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  status?.running && status?.connected
                    ? 'bg-emerald-400 animate-ping'
                    : status?.running
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              {status?.running && status?.connected
                ? 'ONLINE & INFERENCING'
                : status?.running
                ? 'CONNECTING TO CAMERA...'
                : 'STANDBY'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time video feed from hardware station with live YOLO cheating & non-cheating classification
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              soundEnabled
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 hover:bg-rose-500/20 shadow-sm'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title={soundEnabled ? 'Click to mute sound alerts' : 'Click to enable sound alerts'}
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />
                <span>Beep Alarm: Active</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-slate-500" />
                <span>Beep Alarm: Muted</span>
              </>
            )}
          </button>

          <Link
            to="/video-analysis"
            className="px-3.5 py-2 rounded-xl text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors flex items-center gap-2 border border-slate-700 shadow-sm"
          >
            Recorded Video Workspace
          </Link>
        </div>
      </div>

      {/* Vercel cloud warning notice if API Base not configured */}
      {isVercelHost && !hasCustomApiBase && (
        <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/30 text-blue-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Radio className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              <strong>Vercel Cloud Deployment:</strong> The Python YOLO backend runs on your local machine or server. To connect live camera inference to Vercel, visit{' '}
              <Link to="/settings" className="underline font-semibold text-white hover:text-blue-200">
                Settings
              </Link>{' '}
              and set your Backend API URL (or open locally via <code className="text-blue-200">http://localhost:5173</code>).
            </span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-400 hover:text-white font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Stream & Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stream Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl flex flex-col aspect-video">
            {/* View Mode Switcher Header */}
            <div className="relative z-20 p-3.5 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/60 to-transparent">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] font-bold tracking-wide uppercase border border-rose-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  FEED
                </span>
                <span className="text-xs font-semibold text-white font-mono truncate">
                  {cameraIp}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-900/90 border border-slate-800 rounded-lg p-0.5 text-[11px]">
                  <button
                    onClick={() => setViewMode('ai_stream')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      viewMode === 'ai_stream'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    AI Annotated Feed
                  </button>
                  <button
                    onClick={() => setViewMode('direct_esp32')}
                    className={`px-2.5 py-1 rounded font-medium transition-colors ${
                      viewMode === 'direct_esp32'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Direct Camera Web
                  </button>
                </div>
              </div>
            </div>

            {/* Video Viewport */}
            <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[360px]">
              {viewMode === 'ai_stream' ? (
                status?.running ? (
                  <div className="relative w-full h-full flex items-center justify-center bg-black">
                    {frameError ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#020617] text-slate-400 p-6 text-center z-10">
                        <RefreshCw className="w-8 h-8 text-blue-400 animate-spin mb-3" />
                        <p className="text-sm font-semibold text-slate-200">
                          Handshaking with ESP32-CAM ({cameraIp})...
                        </p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm">
                          Acquiring optical frame and running YOLO inference. Standby graphic will appear shortly.
                        </p>
                        <button
                          onClick={() => {
                            setFrameError(false);
                            setFrameTimestamp(Date.now());
                          }}
                          className="mt-4 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-medium border border-slate-700 transition-colors"
                        >
                          Retry Frame Sync
                        </button>
                      </div>
                    ) : (
                      <img
                        src={`${getApiBase()}/api/live/frame?t=${frameTimestamp}`}
                        alt="ESP32 Live Feed"
                        className="w-full h-full object-contain select-none"
                        onError={() => setFrameError(true)}
                      />
                    )}
                    {!status.connected && !frameError && (
                      <div className="absolute top-4 right-4 px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs backdrop-blur-md flex items-center gap-2">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Handshaking with camera...
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <div className="w-16 h-16 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
                      <Camera className="w-8 h-8" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-300">
                        Live Stream Standby
                      </h4>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                        Click "Start Live Inference" to initiate optical tracking from your ESP32-CAM ({cameraIp}).
                      </p>
                    </div>
                    <button
                      onClick={handleStart}
                      disabled={isLoading}
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-blue-600/30 transition-all inline-flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-white" />
                      {isLoading ? 'Connecting...' : 'Start Live Inference'}
                    </button>
                  </div>
                )
              ) : (
                /* Direct ESP32 Web UI view or fallback iframe */
                <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-950 text-center">
                  <div className="max-w-md space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                      <ExternalLink className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-white">
                        Direct ESP32 Camera Web Server
                      </h4>
                      <p className="text-xs text-slate-400 mt-1">
                        The ESP32-CAM hosts its internal OV5640 configuration and raw MJPEG stream directly at{' '}
                        <code className="text-blue-400 font-mono">{directEsp32Url}</code>.
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                      <a
                        href={directEsp32Url}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        Open Camera Web Page
                      </a>
                      <a
                        href={directMjpegUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 flex items-center justify-center gap-2"
                      >
                        Direct MJPEG Stream (:81)
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Overlay Status Bar */}
            <div className="relative z-20 p-3 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-300">
                  {status?.connected ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                  )}
                  {status?.connected ? 'Link Active' : 'Offline'}
                </span>
                {status?.last_inference_time && (
                  <span className="text-slate-400">
                    Infer: <span className="text-blue-400">{status.last_inference_time}</span>
                  </span>
                )}
                {status?.fps !== undefined && (
                  <span className="text-slate-400">
                    Rate: <span className="text-slate-200">{status.fps} fps</span>
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Frames Processed:{' '}
                <span className="text-white font-semibold">{status?.frames_processed || 0}</span>
              </div>
            </div>
          </div>

          {/* Detections Strip */}
          <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">YOLO Model Live Inference</h4>
                <p className="text-[11px] text-slate-400">
                  Model analyzes frames and displays real cheating / non-cheating bounding boxes
                </p>
              </div>
            </div>

            {/* Current Frame Detections */}
            <div className="flex items-center gap-2">
              {status?.latest_detections && status.latest_detections.length > 0 ? (
                status.latest_detections.map((d, i) => (
                  <span
                    key={i}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      d.class_name === 'cheating'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
                    {d.class_name === 'cheating' ? (
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                    ) : (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    {d.class_name} {(d.confidence * 100).toFixed(0)}%
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No targets in frame</span>
              )}
            </div>
          </div>
        </div>

        {/* Control Sidebar (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Camera Configuration Card */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-400" />
              Camera Configuration
            </h3>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                ESP32-CAM IP / Endpoint:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={cameraIp}
                  onChange={(e) => setCameraIp(e.target.value)}
                  placeholder="10.134.243.228"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Default: <span className="font-mono text-slate-400">10.134.243.228</span> (Port 80 snapshot /capture API)
              </p>
            </div>

            {/* Action buttons */}
            <div className="pt-2">
              {status?.running ? (
                <button
                  onClick={handleStop}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <Square className="w-3.5 h-3.5" />
                  Stop Live Inference
                </button>
              ) : (
                <button
                  onClick={handleStart}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs uppercase tracking-wide transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {isLoading ? 'Connecting...' : 'Start Live Inference'}
                </button>
              )}
            </div>
          </div>

          {/* Real-time Session Analytics */}
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
            <h3 className="font-semibold text-white text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Live Detection Counters
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
                <span className="text-[10px] text-rose-400/80 block mb-1">Cheating Detections</span>
                <span className="font-bold text-rose-400 mono text-base flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  {status?.total_cheating || 0}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400/80 block mb-1">Non-Cheating</span>
                <span className="font-bold text-emerald-400 mono text-base flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  {status?.total_non_cheating || 0}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Hardware:</span>
                <span className="text-slate-200">ESP32-CAM OV5640</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Polling Protocol:</span>
                <span className="text-slate-200">HTTP Snapshot Poll</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Model:</span>
                <span className="text-blue-400 font-mono">best.pt (YOLOv8)</span>
              </div>
            </div>

            <Link
              to="/events"
              className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 hover:text-blue-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-800 transition-colors shadow-sm"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Open Detection Events Log ({status?.total_cheating || 0} incidents)
            </Link>
          </div>

          {/* Quick Hardware Diagnostics */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 leading-relaxed space-y-1.5">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              ESP32-CAM Operational Note
            </span>
            <p>
              The standard ESP32 CameraWebServer firmware processes snapshots via <code className="text-slate-300">/capture</code>. If you reboot or change networks, update the IP above and hit Start.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LiveMonitoring;
