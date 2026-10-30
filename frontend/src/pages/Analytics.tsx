import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Info,
  Calendar,
} from 'lucide-react';
import {
  fetchAnalyticsSummary,
  fetchAnalyticsTimeline,
  listSessions,
  AnalyticsSummary,
  TimelinePoint,
  ExamSession,
} from '../api/client';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from 'recharts';

export const Analytics: React.FC = () => {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, timeRes, sess] = await Promise.all([
        fetchAnalyticsSummary().catch(() => null),
        fetchAnalyticsTimeline().catch(() => ({ timeline: [] })),
        listSessions().catch(() => []),
      ]);
      setSummary(sum);
      setTimeline(timeRes.timeline);
      setSessions(sess);
    } catch (err) {
      console.error('Error loading analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pieData = summary
    ? [
        { name: 'Cheating Class', value: summary.cheating_detections, color: '#ef4444' },
        { name: 'Non-Cheating Class', value: summary.non_cheating_detections, color: '#10b981' },
      ].filter((d) => d.value > 0)
    : [];

  // Session statuses breakdown
  const sessionStatusData = [
    { name: 'Scheduled', count: sessions.filter((s) => s.status === 'scheduled').length },
    { name: 'In Progress', count: sessions.filter((s) => s.status === 'in_progress').length },
    { name: 'Completed', count: sessions.filter((s) => s.status === 'completed').length },
    { name: 'Cancelled', count: sessions.filter((s) => s.status === 'cancelled').length },
  ];

  return (
    <div className="space-y-6">
      {/* Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            Behavioral Telemetry Analytics
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Model inference trends, prediction distribution metrics, and review queue monitoring
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white transition-colors self-start md:self-auto"
          title="Refresh Data"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Advisory Banner */}
      <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 text-xs text-blue-300/90 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-semibold text-blue-200">Statistical Governance Note: </span>
          All telemetry values are derived strictly from database-persisted model predictions. Predictions are indicators for human review rather than definitive determinations of academic dishonesty.
        </div>
      </div>

      {/* Primary Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timeline Chart (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Detection Frequency by Date
              </h3>
              <p className="text-xs text-slate-400">Class predictions recorded across all video jobs</p>
            </div>
          </div>

          <div className="h-72 w-full pt-4">
            {timeline.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                <BarChart3 className="w-8 h-8 opacity-40 mb-2" />
                No timeline data available yet. Process videos to see daily activity.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#1e293b',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="cheating" name="Cheating Flags" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="non_cheating" name="Non-Cheating" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Prediction Distribution Pie (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-blue-400" />
              Class Balance Ratio
            </h3>
            <p className="text-xs text-slate-400">Proportion of detections</p>

            <div className="h-52 w-full flex items-center justify-center relative mt-2">
              {pieData.length === 0 ? (
                <div className="text-xs text-slate-500 text-center">
                  No prediction data to calculate ratios.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
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
              )}
            </div>
          </div>

          <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                Cheating (Class 0)
              </span>
              <span className="font-bold text-white mono">{summary?.cheating_detections || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-slate-300">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Non-Cheating (Class 1)
              </span>
              <span className="font-bold text-white mono">{summary?.non_cheating_detections || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Review Queue Size */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Review Audit Queue</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400 mono">
            {summary?.pending_reviews ?? 0}
          </div>
          <p className="text-[11px] text-slate-500">
            Detections flagged by YOLO awaiting proctor confirmation
          </p>
        </div>

        {/* Video Jobs Performance */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Processing Success Rate</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mono">
            {summary?.videos_processed
              ? `${(
                  (summary.completed_jobs / (summary.completed_jobs + summary.failed_jobs || 1)) *
                  100
                ).toFixed(0)}%`
              : '100%'}
          </div>
          <p className="text-[11px] text-slate-500">
            {summary?.completed_jobs || 0} completed successfully / {summary?.failed_jobs || 0} failed
          </p>
        </div>

        {/* Exam Session Topology */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold">Active Exam Sessions</span>
            <Calendar className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-3xl font-extrabold text-blue-400 mono">
            {sessions.filter((s) => s.status === 'in_progress').length}
          </div>
          <p className="text-[11px] text-slate-500">
            Currently running in exam halls out of {sessions.length} total scheduled
          </p>
        </div>
      </div>
    </div>
  );
};
