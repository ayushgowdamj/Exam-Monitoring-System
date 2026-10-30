import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  Clock,
  MapPin,
  Camera,
  CheckCircle2,
  PlayCircle,
  XCircle,
  FileText,
  RefreshCw,
} from 'lucide-react';
import {
  listSessions,
  createSession,
  updateSession,
  listCameras,
  ExamSession,
  CameraDevice,
} from '../api/client';

export const ExamSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    session_name: '',
    exam_name: '',
    exam_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '12:00',
    room: '',
    camera_id: '',
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sess, cams] = await Promise.all([
        listSessions(),
        listCameras().catch(() => []),
      ]);
      setSessions(sess);
      setCameras(cams);
    } catch (err) {
      console.error('Error loading sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.session_name || !formData.exam_name) return;
    setSubmitting(true);
    try {
      await createSession({
        ...formData,
        status: 'scheduled',
      });
      setShowModal(false);
      setFormData({
        session_name: '',
        exam_name: '',
        exam_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '12:00',
        room: '',
        camera_id: '',
        notes: '',
      });
      loadData();
    } catch (err) {
      console.error('Failed to create session:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      await updateSession(id, { status });
      loadData();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3 text-slate-400" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-400" />
            Scheduled
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Examination Sessions
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Organize proctored examination time slots, exam halls, and monitoring allocations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-all shadow-lg shadow-blue-600/30 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Schedule New Exam
          </button>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Sessions Grid */}
      {sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 p-12 text-center bg-slate-900/30">
          <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-white">No Exam Sessions Created</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Click 'Schedule New Exam' to configure exam halls, assign cameras, and link video analysis workflows.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30 text-xs font-semibold hover:bg-blue-600/30"
          >
            Create First Session
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sessions.map((sess) => (
            <div
              key={sess.id}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-sm text-white">{sess.session_name}</h3>
                  {getStatusBadge(sess.status)}
                </div>
                <div className="text-xs text-blue-400 font-semibold mb-3">
                  {sess.exam_name}
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{sess.exam_date || 'Date Unset'}</span>
                    <span className="text-slate-600">•</span>
                    <span>{sess.start_time} - {sess.end_time}</span>
                  </div>

                  {sess.room && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-500" />
                      <span>{sess.room}</span>
                    </div>
                  )}

                  {sess.camera_id && (
                    <div className="flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5 text-slate-500" />
                      <span className="truncate">Camera Station #{sess.camera_id.slice(0, 8)}</span>
                    </div>
                  )}

                  {sess.notes && (
                    <div className="flex items-start gap-2 pt-1 border-t border-slate-800/60 text-slate-500 italic">
                      <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">{sess.notes}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-500 mono">ID: {sess.id.slice(0, 8)}</span>
                <div className="flex items-center gap-1.5">
                  {sess.status === 'scheduled' && (
                    <button
                      onClick={() => handleStatusChange(sess.id, 'in_progress')}
                      className="px-2.5 py-1 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-medium text-[11px]"
                    >
                      Start
                    </button>
                  )}
                  {sess.status === 'in_progress' && (
                    <button
                      onClick={() => handleStatusChange(sess.id, 'completed')}
                      className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 font-medium text-[11px]"
                    >
                      Complete
                    </button>
                  )}
                  {sess.status !== 'completed' && sess.status !== 'cancelled' && (
                    <button
                      onClick={() => handleStatusChange(sess.id, 'cancelled')}
                      className="px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 text-[11px]"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Session Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                Schedule Examination Session
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Session Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midterms Slot A"
                    value={formData.session_name}
                    onChange={(e) => setFormData({ ...formData, session_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Course / Exam *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS101 Algorithms"
                    value={formData.exam_name}
                    onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Date</label>
                  <input
                    type="date"
                    value={formData.exam_date}
                    onChange={(e) => setFormData({ ...formData, exam_date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Hall / Room</label>
                  <input
                    type="text"
                    placeholder="e.g. Hall 4B"
                    value={formData.room}
                    onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium">Assign Camera Device</label>
                  <select
                    value={formData.camera_id}
                    onChange={(e) => setFormData({ ...formData, camera_id: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {cameras.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.camera_type})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-medium">Proctoring Notes</label>
                <textarea
                  rows={2}
                  placeholder="Special instructions or proctor guidelines..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-lg shadow-blue-600/30"
                >
                  {submitting ? 'Creating...' : 'Save Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
