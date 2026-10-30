import React, { useState, useEffect, useRef } from 'react';
import {
  FileVideo,
  Upload,
  Play,
  Square,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Download,
  Sliders,
  Clock,
  Layers,
  ShieldAlert,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import {
  fetchDemoVideo,
  uploadVideo,
  startAnalysis,
  getJobStatus,
  cancelJob,
  listJobs,
  listSessions,
  DemoVideoInfo,
  VideoJob,
  ExamSession,
} from '../api/client';

export const VideoAnalysis: React.FC = () => {
  // Discovery & sessions
  const [demoVideo, setDemoVideo] = useState<DemoVideoInfo | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Selected input video
  const [selectedVideoType, setSelectedVideoType] = useState<'demo' | 'upload'>('demo');
  const [selectedFilename, setSelectedFilename] = useState<string>('demo.mp4');
  const [previewInputUrl, setPreviewInputUrl] = useState<string>('/api/videos/serve/demo.mp4');

  // Upload state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState<number>(0.25);

  // Analysis job state
  const [activeJob, setActiveJob] = useState<VideoJob | null>(null);
  const [recentJobs, setRecentJobs] = useState<VideoJob[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Poll active job status
  useEffect(() => {
    let interval: any = null;
    if (activeJob && (activeJob.status === 'processing' || activeJob.status === 'pending')) {
      interval = setInterval(async () => {
        try {
          const updated = await getJobStatus(activeJob.id);
          setActiveJob(updated);
          if (updated.status === 'completed' || updated.status === 'failed' || updated.status === 'cancelled') {
            loadJobsList();
          }
        } catch (err) {
          console.error('Error polling job status:', err);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeJob?.id, activeJob?.status]);

  // Load demo video & jobs
  const init = async () => {
    try {
      const demo = await fetchDemoVideo();
      setDemoVideo(demo);
      if (demo.available) {
        setSelectedVideoType('demo');
        setSelectedFilename('demo.mp4');
        setPreviewInputUrl('/api/videos/serve/demo.mp4');
      }
      const sess = await listSessions();
      setSessions(sess);
      loadJobsList();
    } catch (err) {
      console.error('Init error:', err);
    }
  };

  const loadJobsList = async () => {
    try {
      const jobs = await listJobs();
      setRecentJobs(jobs);
    } catch (err) {
      console.error('Failed to load jobs list:', err);
    }
  };

  useEffect(() => {
    init();
  }, []);

  // Handle file drop
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    const validExtensions = ['.mp4', '.avi', '.mov', '.mkv'];
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!validExtensions.includes(ext)) {
      setErrorMsg(`Invalid file type ${ext}. Supported: MP4, AVI, MOV, MKV`);
      return;
    }

    if (file.size > 500 * 1024 * 1024) {
      setErrorMsg('File exceeds 500 MB limit.');
      return;
    }

    setErrorMsg(null);
    setUploadedFile(file);
    setUploading(true);
    setUploadProgress(0);

    try {
      const res = await uploadVideo(file, (percent) => setUploadProgress(percent));
      setSelectedVideoType('upload');
      setSelectedFilename(res.filename);
      setPreviewInputUrl(res.url);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to upload video');
    } finally {
      setUploading(false);
    }
  };

  // Start analysis
  const handleStartAnalysis = async () => {
    if (!selectedFilename) {
      setErrorMsg('Please select or upload a video first.');
      return;
    }
    setErrorMsg(null);
    setIsStarting(true);

    try {
      const job = await startAnalysis({
        video_filename: selectedFilename,
        session_id: selectedSessionId || undefined,
        confidence_threshold: confidenceThreshold,
      });
      setActiveJob(job);
      loadJobsList();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.detail || 'Failed to start analysis job');
    } finally {
      setIsStarting(false);
    }
  };

  // Cancel analysis
  const handleCancel = async () => {
    if (!activeJob) return;
    try {
      await cancelJob(activeJob.id);
      const updated = await getJobStatus(activeJob.id);
      setActiveJob(updated);
    } catch (err: any) {
      setErrorMsg('Failed to cancel analysis job');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileVideo className="w-5 h-5 text-blue-400" />
            AI Video Inference Pipeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Powered by Ultralytics YOLO & Supervision — Detects cheating patterns & examinee behaviors frame-by-frame
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Confidence Slider */}
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs">
            <Sliders className="w-4 h-4 text-slate-400" />
            <span className="text-slate-400">Confidence Cutoff:</span>
            <input
              type="range"
              min="0.10"
              max="0.90"
              step="0.05"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
              className="w-20 accent-blue-500 cursor-pointer"
            />
            <span className="mono font-semibold text-blue-400">{(confidenceThreshold * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-semibold">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Analysis Layout: Two Columns (Setup & Player) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Source Selection & Controls (4 Cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Video Source Selection */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
            <h3 className="text-sm font-semibold text-white">1. Select Video Source</h3>

            {/* Option A: Demo Video */}
            <div
              onClick={() => {
                if (demoVideo?.available) {
                  setSelectedVideoType('demo');
                  setSelectedFilename('demo.mp4');
                  setPreviewInputUrl('/api/videos/serve/demo.mp4');
                }
              }}
              className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                selectedVideoType === 'demo'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-950/60 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Play className="w-4 h-4 fill-blue-400" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-white flex items-center gap-2">
                    demo.mp4
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Discovered
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pre-bundled exam hall recording ({demoVideo?.size_bytes ? `${(demoVideo.size_bytes / (1024 * 1024)).toFixed(2)} MB` : 'Available'})
                  </p>
                </div>
              </div>
              <input
                type="radio"
                name="videoSource"
                checked={selectedVideoType === 'demo'}
                onChange={() => {}}
                className="accent-blue-500"
              />
            </div>

            {/* Option B: Upload Video */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-500/10'
                  : selectedVideoType === 'upload'
                  ? 'border-blue-500/60 bg-blue-950/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".mp4,.avi,.mov,.mkv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-7 h-7 text-slate-400 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-200">
                {uploading
                  ? `Uploading... ${uploadProgress}%`
                  : uploadedFile
                  ? uploadedFile.name
                  : 'Click or Drag & Drop Video'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports MP4, AVI, MOV up to 500 MB
              </p>
              {uploading && (
                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Optional Exam Session Association */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <label className="text-xs font-medium text-slate-300">
                Associate with Exam Session (Optional):
              </label>
              <select
                value={selectedSessionId}
                onChange={(e) => setSelectedSessionId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="">None (Independent Analysis)</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.session_name} — {s.exam_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Start / Cancel Action Controls */}
            <div className="pt-2">
              {activeJob && (activeJob.status === 'processing' || activeJob.status === 'pending') ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-blue-400 flex items-center gap-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Inference Running...
                      </span>
                      <span className="mono font-bold text-white">
                        {activeJob.progress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-600 to-indigo-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${activeJob.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 mono">
                      <span>Frames: {activeJob.processed_frames} / {activeJob.total_frames || '...'}</span>
                      <span>Detections: {activeJob.total_detections}</span>
                    </div>
                  </div>

                  <button
                    onClick={handleCancel}
                    className="w-full py-2.5 rounded-xl border border-rose-500/40 text-rose-400 hover:bg-rose-950/20 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-3.5 h-3.5" />
                    Cancel Analysis Job
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartAnalysis}
                  disabled={isStarting || uploading || !selectedFilename}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs tracking-wide uppercase transition-all shadow-lg shadow-blue-600/30 active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  {isStarting ? 'Starting Inference...' : 'Run YOLO Video Analysis'}
                </button>
              )}
            </div>
          </div>

          {/* Institutional Audit Notice */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 text-[11px] text-slate-400 leading-relaxed space-y-1">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              Institutional Audit Protocol
            </span>
            <p>
              Frame-level classifications represent instant model indicators. A prediction does not constitute proof of cheating without subsequent proctor audit.
            </p>
          </div>
        </div>

        {/* Right Column: Dual Video Preview & Analysis Summary (7 Cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Video Players Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {activeJob?.status === 'completed' ? 'Annotated Output Video' : 'Input Footage Preview'}
              </h3>
              {activeJob?.status === 'completed' && activeJob.output_filename && (
                <a
                  href={`/api/videos/jobs/${activeJob.id}/output`}
                  download={activeJob.output_filename}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs transition-colors shadow-md shadow-emerald-600/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download Processed MP4
                </a>
              )}
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black/90 border border-slate-800 relative flex items-center justify-center">
              {activeJob?.status === 'completed' && activeJob.output_filename ? (
                <video
                  key={`out-${activeJob.id}`}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                  src={`/api/videos/jobs/${activeJob.id}/output`}
                />
              ) : previewInputUrl ? (
                <video
                  key={`in-${previewInputUrl}`}
                  controls
                  className="w-full h-full object-contain"
                  src={previewInputUrl}
                />
              ) : (
                <div className="text-center text-slate-500 text-xs">
                  <FileVideo className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  Select or upload a video to preview
                </div>
              )}
            </div>

            {/* Analysis Summary Card (when job exists) */}
            {activeJob && (
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    {activeJob.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : activeJob.status === 'failed' ? (
                      <AlertCircle className="w-4 h-4 text-rose-400" />
                    ) : (
                      <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    )}
                    <span className="text-xs font-semibold text-white uppercase tracking-wider">
                      Status: {activeJob.status}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400 mono">
                    Job ID: {activeJob.id.slice(0, 8)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Frames Evaluated</span>
                    <span className="font-bold text-white mono">
                      {activeJob.processed_frames} / {activeJob.total_frames || 'N/A'}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/20">
                    <span className="text-[10px] text-rose-400/80 block mb-0.5">Cheating Detections</span>
                    <span className="font-bold text-rose-400 mono flex items-center gap-1">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      {activeJob.cheating_count}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20">
                    <span className="text-[10px] text-emerald-400/80 block mb-0.5">Non-Cheating</span>
                    <span className="font-bold text-emerald-400 mono flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {activeJob.non_cheating_count}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block mb-0.5">Duration</span>
                    <span className="font-bold text-white mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {activeJob.processing_time ? `${activeJob.processing_time}s` : 'Processing...'}
                    </span>
                  </div>
                </div>

                {activeJob.error_message && (
                  <p className="text-xs text-rose-400 mt-2">Error: {activeJob.error_message}</p>
                )}
              </div>
            )}
          </div>

          {/* Past Analysis Jobs Log */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50">
            <h3 className="text-sm font-semibold text-white mb-3">Recent Video Jobs History</h3>
            {recentJobs.length === 0 ? (
              <p className="text-xs text-slate-500">No past jobs on record.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {recentJobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    onClick={() => setActiveJob(job)}
                    className="p-2.5 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-950/40 flex items-center justify-between text-xs cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2 h-2 rounded-full ${
                          job.status === 'completed'
                            ? 'bg-emerald-400'
                            : job.status === 'failed'
                            ? 'bg-rose-400'
                            : 'bg-blue-400'
                        }`}
                      />
                      <div>
                        <span className="font-medium text-slate-200">{job.input_filename}</span>
                        <span className="text-[10px] text-slate-500 ml-2 mono">{job.id.slice(0, 8)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-400 mono text-[11px]">
                      <span>{job.total_detections} flags</span>
                      <span>{job.processing_time ? `${job.processing_time}s` : ''}</span>
                      <span className="uppercase font-semibold text-[10px] text-slate-300">{job.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
