import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  FileVideo,
  Calendar,
  AlertTriangle,
  Play,
  ArrowRight,
  RefreshCw,
  Cpu,
  Layers,
} from 'lucide-react';
import {
  fetchAnalyticsSummary,
  fetchDemoVideo,
  listEvents,
  listSessions,
  AnalyticsSummary,
  DetectionEvent,
  ExamSession,
  HealthStatus,
} from '../api/client';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';

interface OverviewProps {
  health: HealthStatus | null;
}

export const Overview: React.FC<OverviewProps> = ({ health }) => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [recentEvents, setRecentEvents] = useState<DetectionEvent[]>([]);
  const [recentSessions, setRecentSessions] = useState<ExamSession[]>([]);
  const [demoAvailable, setDemoAvailable] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, evts, sess, demo] = await Promise.all([
        fetchAnalyticsSummary().catch(() => null),
        listEvents({ page: 1, page_size: 5 }).catch(() => ({ events: [], total: 0, page: 1, page_size: 5 })),
        listSessions().catch(() => []),
        fetchDemoVideo().catch(() => ({ available: false })),
      ]);
      setSummary(sum);
      setRecentEvents(evts?.events || []);
      setRecentSessions(sess || []);
      setDemoAvailable(demo.available);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pieData = summary
    ? [
        { name: 'Cheating', value: summary.cheating_detections, color: '#ef4444' },
        { name: 'Non-Cheating', value: summary.non_cheating_detections, color: '#10b981' },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Action */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-900/30 via-slate-900/80 to-slate-900/40 border border-blue-500/20 p-6 backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs text-blue-400 font-medium mb-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>YOLO Examination Intelligence Ready</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Exam Monitoring Command Center
            </h2>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Real-time deep visual telemetry analyzing examinee behavior, anomalous movements, and review-flagged incidents.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {demoAvailable && (
              <button
                onClick={() => navigate('/video-analysis')}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 active:scale-95"
              >
                <Play className="w-4 h-4 fill-white" />
                Analyze Demo Video
              </button>
            )}
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white transition-colors"
              title="Refresh Dashboard"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Sessions */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Exam Sessions</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-white mono">
            {summary?.total_sessions ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Configured exam rooms</p>
        </div>

        {/* Videos Processed */}
        <div className="p-4 rounded-xl border border-slate-800/80 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Videos Processed</span>
            <FileVideo className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mono">
            {summary?.videos_processed ?? 0}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {summary?.completed_jobs ?? 0} completed / {summary?.failed_jobs ?? 0} failed
          </p>
        </div>

        {/* Cheating Predictions */}
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-medium">Cheating Flags</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-rose-400 mono">
            {summary?.cheating_detections ?? 0}
          </div>
          <p className="text-[11px] text-rose-400/70 mt-1">Model class 0 detections</p>
        </div>

        {/* Non-Cheating Predictions */}
        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium">Non-Cheating</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mono">
            {summary?.non_cheating_detections ?? 0}
          </div>
          <p className="text-[11px] text-emerald-400/70 mt-1">Model class 1 detections</p>
        </div>

        {/* Awaiting Review */}
        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-950/10 backdrop-blur-sm">
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium">Awaiting Review</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400 mono">
            {summary?.pending_reviews ?? 0}
          </div>
          <p className="text-[11px] text-amber-400/70 mt-1">Pending human audit</p>
        </div>
      </div>

      {/* Main Grid: Detection Stream & Analytics Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Detection Events */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Recent Model Predictions</h3>
              <p className="text-xs text-slate-400">Chronological feed of detections from processed videos</p>
            </div>
            <button
              onClick={() => navigate('/events')}
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
            >
              View all <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800/80 rounded-xl">
              <Layers className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-sm font-medium text-slate-300">No predictions recorded yet</p>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Run an analysis on demo.mp4 or upload an examination video to see real model outputs.
              </p>
              <button
                onClick={() => navigate('/video-analysis')}
                className="mt-4 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-medium hover:bg-blue-600/30"
              >
                Go to Video Analysis
              </button>
            </div>
          ) : (
            <div className="space-y-2 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-2 font-medium">Time / Frame</th>
                    <th className="pb-2 font-medium">Source</th>
                    <th className="pb-2 font-medium">Prediction</th>
                    <th className="pb-2 font-medium">Confidence</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentEvents.map((evt) => (
                    <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 mono text-slate-300">
                        {evt.timestamp_sec != null ? `${evt.timestamp_sec}s` : `Frame #${evt.frame_number}`}
                      </td>
                      <td className="py-2.5 text-slate-400 truncate max-w-[120px]">
                        {evt.source_video || 'Direct'}
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                            evt.class_name === 'cheating'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              evt.class_name === 'cheating' ? 'bg-rose-400' : 'bg-emerald-400'
                            }`}
                          />
                          {evt.class_name}
                        </span>
                      </td>
                      <td className="py-2.5 mono text-slate-200">
                        {(evt.confidence * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5">
                        <span
                          className={`text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded ${
                            evt.review_status === 'reviewed'
                              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/60'
                              : evt.review_status === 'dismissed'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-950/60 text-amber-400 border border-amber-800/60'
                          }`}
                        >
                          {evt.review_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Prediction Ratio & System Health */}
        <div className="space-y-6">
          {/* Prediction Ratio Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-1">Class Ratio</h3>
            <p className="text-xs text-slate-400 mb-4">Cheating vs Non-Cheating balance</p>

            {pieData.length === 0 ? (
              <div className="h-44 flex items-center justify-center text-xs text-slate-500 text-center">
                No detection data recorded yet
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={65}
                      paddingAngle={4}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0f172a',
                        borderColor: '#1e293b',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Quick System Info */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Telemetry Health</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Backend Server</span>
                <span className="text-emerald-400 font-medium">FastAPI Local Node</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">Database Engine</span>
                <span className="text-slate-200 mono">SQLite (examguard.db)</span>
              </div>
              <div className="flex items-center justify-between py-1.5 border-b border-slate-800/60">
                <span className="text-slate-400">YOLO Model</span>
                <span className="text-slate-200 mono">{health?.model_file || 'best.pt'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5">
                <span className="text-slate-400">Demo Video Source</span>
                <span className={demoAvailable ? 'text-emerald-400' : 'text-amber-400'}>
                  {demoAvailable ? 'demo.mp4 (Ready)' : 'Not detected'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
