import React, { useState, useEffect } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  RefreshCw,
  Video,
  MapPin,
  Wifi,
  WifiOff,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { listCameras, createCamera, deleteCamera, CameraDevice } from '../api/client';

export const CameraDevices: React.FC = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [cameraType, setCameraType] = useState('esp32-cam');
  const [streamUrl, setStreamUrl] = useState('');
  const [location, setLocation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeviceList = async () => {
    setLoading(true);
    try {
      const data = await listCameras();
      setCameras(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load cameras:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeviceList();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      await createCamera({
        name: name.trim(),
        camera_type: cameraType,
        stream_url: streamUrl.trim() || undefined,
        location: location.trim() || undefined,
      });
      setName('');
      setStreamUrl('');
      setLocation('');
      setCameraType('esp32-cam');
      setShowModal(false);
      fetchDeviceList();
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Failed to register camera device');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this camera device?')) return;
    try {
      await deleteCamera(id);
      setCameras(cameras.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete camera:', err);
      alert('Could not delete camera device');
    }
  };

  const handleCopyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Camera className="w-7 h-7 text-blue-500" />
            Camera Devices
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure and manage ESP32-CAM nodes, IP streams, and exam hall monitoring endpoints.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchDeviceList}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl text-sm font-medium bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Add Camera
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Configured</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Camera className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">{cameras.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active registered devices</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">ESP32-CAM Nodes</span>
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {cameras.filter((c) => c.camera_type === 'esp32-cam').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Microcontroller units</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">IP / RTSP Streams</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {cameras.filter((c) => c.camera_type !== 'esp32-cam').length}
          </div>
          <div className="text-xs text-slate-500 mt-1">Network video streams</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Stream Status</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Wifi className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {cameras.filter((c) => c.stream_url).length}
          </div>
          <div className="text-xs text-slate-500 mt-1">URLs configured</div>
        </div>
      </div>

      {/* Camera Grid */}
      {loading && cameras.length === 0 ? (
        <div className="py-20 text-center text-slate-500 flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
          <p>Loading registered camera devices...</p>
        </div>
      ) : cameras.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-950/40">
          <Camera className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-300">No Cameras Registered</h3>
          <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Connect an ESP32-CAM device or RTSP network camera stream to monitor exams live.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add First Camera
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {cameras.map((cam) => (
            <div
              key={cam.id}
              className="rounded-2xl border border-slate-800/80 bg-slate-900/70 p-5 flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 group-hover:bg-blue-500/20 transition-colors">
                      {cam.camera_type === 'esp32-cam' ? (
                        <Cpu className="w-5 h-5" />
                      ) : (
                        <Video className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white tracking-tight">{cam.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] font-medium uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {cam.camera_type}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              cam.is_connected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          {cam.is_connected ? 'Connected' : 'Configured'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(cam.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete camera"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-2 text-xs">
                  {cam.location && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{cam.location}</span>
                    </div>
                  )}

                  {cam.stream_url ? (
                    <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-slate-300 font-mono text-[11px]">
                      <span className="truncate">{cam.stream_url}</span>
                      <button
                        onClick={() => handleCopyUrl(cam.stream_url!, cam.id)}
                        className="p-1 text-slate-400 hover:text-white shrink-0 transition-colors"
                        title="Copy stream URL"
                      >
                        {copiedId === cam.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="p-2 rounded-lg bg-slate-950/40 border border-slate-800/60 text-slate-500 italic">
                      No stream URL provided
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Added: {new Date(cam.created_at).toLocaleDateString()}</span>
                <span className="text-blue-400/80 font-medium">Ready for session bind</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ESP32-CAM Integration Info Card */}
      <div className="rounded-2xl border border-blue-900/40 bg-gradient-to-r from-blue-950/20 via-slate-900/40 to-indigo-950/20 p-5 backdrop-blur-sm">
        <div className="flex items-start gap-4">
          <div className="p-2.5 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20 shrink-0">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm">ESP32-CAM Setup Notice</h4>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              To stream frames directly from an ESP32-CAM module to AI ExamGuard, flash your board
              with the standard <code>CameraWebServer</code> sketch (OV2640). Set the resolution to
              SVGA or XGA for optimal frame rate, and point the registered stream URL above to{' '}
              <code className="text-blue-300">http://&lt;esp32_ip&gt;:81/stream</code>.
            </p>
          </div>
        </div>
      </div>

      {/* Add Camera Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-blue-500" />
                Register Camera Device
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                {error}
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Device Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hall A - ESP32 Node 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Camera Type
                </label>
                <select
                  value={cameraType}
                  onChange={(e) => setCameraType(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="esp32-cam">ESP32-CAM (Microcontroller)</option>
                  <option value="ip-camera">IP Camera (RTSP / HTTP)</option>
                  <option value="usb">USB Webcam</option>
                  <option value="other">Other Stream Source</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Stream URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="http://192.168.1.120:81/stream or rtsp://..."
                  value={streamUrl}
                  onChange={(e) => setStreamUrl(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Location / Room
                </label>
                <input
                  type="text"
                  placeholder="e.g. Main Hall 101, Row 3"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  {submitting ? 'Registering...' : 'Save Camera'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

