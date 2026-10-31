import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  Filter,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Search,
  MessageSquare,
  AlertTriangle,
  FileVideo,
} from 'lucide-react';
import {
  listEvents,
  updateEventReview,
  listSessions,
  DetectionEvent,
  ExamSession,
} from '../api/client';

export const DetectionEvents: React.FC = () => {
  const [events, setEvents] = useState<DetectionEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(false);

  // Filters
  const [classNameFilter, setClassNameFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [sessions, setSessions] = useState<ExamSession[]>([]);

  // Notes Modal state
  const [selectedEvent, setSelectedEvent] = useState<DetectionEvent | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewAction, setReviewAction] = useState<'reviewed' | 'dismissed'>('reviewed');
  const [savingReview, setSavingReview] = useState(false);

  const fetchEventData = async () => {
    setLoading(true);
    try {
      const res = await listEvents({
        page,
        page_size: pageSize,
        class_name: classNameFilter || undefined,
        review_status: statusFilter || undefined,
        session_id: selectedSession || undefined,
        min_confidence: minConfidence > 0 ? minConfidence : undefined,
      });
      setEvents(Array.isArray(res?.events) ? res.events : []);
      setTotal(typeof res?.total === 'number' ? res.total : 0);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    listSessions().then(setSessions).catch(console.error);
  }, []);

  useEffect(() => {
    fetchEventData();
  }, [page, classNameFilter, statusFilter, minConfidence, selectedSession]);

  const handleQuickReview = async (id: string, status: 'reviewed' | 'dismissed', notes?: string) => {
    try {
      await updateEventReview(id, status, notes);
      fetchEventData();
    } catch (err) {
      console.error('Failed to update review:', err);
    }
  };

  const handleOpenReviewModal = (event: DetectionEvent, action: 'reviewed' | 'dismissed') => {
    setSelectedEvent(event);
    setReviewAction(action);
    setReviewNotes(event.review_notes || '');
  };

  const handleSaveModalReview = async () => {
    if (!selectedEvent) return;
    setSavingReview(true);
    try {
      await updateEventReview(selectedEvent.id, reviewAction, reviewNotes);
      setSelectedEvent(null);
      fetchEventData();
    } catch (err) {
      console.error('Failed to save review:', err);
    } finally {
      setSavingReview(false);
    }
  };

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (classNameFilter) params.append('class_name', classNameFilter);
    if (statusFilter) params.append('review_status', statusFilter);
    window.open(`/api/events/export?${params.toString()}`, '_blank');
  };

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Title & Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            Detection Event Audit Log
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Recorded model predictions awaiting human institutional review and verification
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Download className="w-4 h-4 text-blue-400" />
            Export CSV
          </button>
          <button
            onClick={fetchEventData}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white transition-colors"
            title="Refresh Events"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/50 flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-2 text-slate-400 font-medium">
          <Filter className="w-4 h-4 text-blue-400" />
          <span>Filters:</span>
        </div>

        {/* Prediction Class */}
        <select
          value={classNameFilter}
          onChange={(e) => {
            setClassNameFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Prediction Classes</option>
          <option value="cheating">Cheating (Class 0)</option>
          <option value="non-cheating">Non-Cheating (Class 1)</option>
        </select>

        {/* Review Status */}
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500"
        >
          <option value="">All Review Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="reviewed">Reviewed & Confirmed</option>
          <option value="dismissed">Dismissed (False Positive)</option>
        </select>

        {/* Session Filter */}
        <select
          value={selectedSession}
          onChange={(e) => {
            setSelectedSession(e.target.value);
            setPage(1);
          }}
          className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 max-w-[200px] truncate"
        >
          <option value="">All Exam Sessions</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.session_name}
            </option>
          ))}
        </select>

        {/* Confidence Slider */}
        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1 text-slate-300">
          <span>Min Conf:</span>
          <input
            type="range"
            min="0"
            max="0.9"
            step="0.05"
            value={minConfidence}
            onChange={(e) => {
              setMinConfidence(parseFloat(e.target.value));
              setPage(1);
            }}
            className="w-16 accent-blue-500 cursor-pointer"
          />
          <span className="mono font-semibold text-blue-400">{(minConfidence * 100).toFixed(0)}%</span>
        </div>

        <div className="ml-auto text-slate-400">
          Total: <span className="font-semibold text-white mono">{total}</span> events
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800/80 bg-slate-950/60 text-slate-400">
                <th className="py-3 px-4 font-semibold">Frame / Time</th>
                <th className="py-3 px-4 font-semibold">Source Media</th>
                <th className="py-3 px-4 font-semibold">Predicted Class</th>
                <th className="py-3 px-4 font-semibold">Confidence</th>
                <th className="py-3 px-4 font-semibold">Bounding Box</th>
                <th className="py-3 px-4 font-semibold">Review Status</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    No detection events match the current criteria
                  </td>
                </tr>
              ) : (
                events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 mono text-slate-300">
                      <div className="font-semibold">Frame #{evt.frame_number}</div>
                      <div className="text-[11px] text-slate-500">
                        {evt.timestamp_sec != null ? `${evt.timestamp_sec}s` : 'N/A'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                        <FileVideo className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{evt.source_video || 'Direct Input'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
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
                    <td className="py-3 px-4 mono text-slate-200 font-semibold">
                      {(evt.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 px-4 mono text-[11px] text-slate-400">
                      {evt.bbox_x1 != null ? (
                        <span>
                          [{evt.bbox_x1.toFixed(0)}, {evt.bbox_y1?.toFixed(0)}, {evt.bbox_x2?.toFixed(0)}, {evt.bbox_y2?.toFixed(0)}]
                        </span>
                      ) : (
                        <span className="text-slate-600">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded border ${
                          evt.review_status === 'reviewed'
                            ? 'bg-emerald-950/60 text-emerald-400 border-emerald-700/60'
                            : evt.review_status === 'dismissed'
                            ? 'bg-slate-800/80 text-slate-400 border-slate-700/60'
                            : 'bg-amber-950/60 text-amber-400 border-amber-700/60'
                        }`}
                      >
                        {evt.review_status}
                      </span>
                      {evt.review_notes && (
                        <p className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5 italic">
                          "{evt.review_notes}"
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenReviewModal(evt, 'reviewed')}
                          className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 border border-emerald-700/40 transition-colors"
                          title="Confirm & Review"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenReviewModal(evt, 'dismissed')}
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                          title="Dismiss / False Positive"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <div>
            Page <span className="font-semibold text-white">{page}</span> of{' '}
            <span className="font-semibold text-white">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Review Notes Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-400" />
                Audit Assessment: Frame #{selectedEvent.frame_number}
              </h3>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Detected Class:</span>
                <span className="font-semibold text-white uppercase">{selectedEvent.class_name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Model Confidence:</span>
                <span className="font-bold text-blue-400 mono">
                  {(selectedEvent.confidence * 100).toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Action:</span>
                <span
                  className={`font-bold uppercase ${
                    reviewAction === 'reviewed' ? 'text-emerald-400' : 'text-slate-400'
                  }`}
                >
                  {reviewAction}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Proctor Audit Notes / Observation:
              </label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g., Examinee looking sideways towards neighboring workstation."
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalReview}
                disabled={savingReview}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-lg shadow-blue-600/30"
              >
                {savingReview ? 'Saving...' : 'Submit Audit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
