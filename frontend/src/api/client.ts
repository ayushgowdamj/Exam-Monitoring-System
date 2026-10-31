import axios from 'axios';

export const API_BASE = import.meta.env.VITE_API_BASE || '';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface HealthStatus {
  status: string;
  backend: string;
  database: string;
  model_loaded: boolean;
  model_file: string;
  demo_video_available: boolean;
  version: string;
}

export interface ModelInfo {
  filename: string;
  loaded: boolean;
  class_names: Record<string, string>;
  task?: string;
}

export interface DemoVideoInfo {
  available: boolean;
  filename?: string;
  size_bytes?: number;
  url?: string;
}

export interface VideoJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  total_frames: number | null;
  processed_frames: number;
  total_detections: number;
  cheating_count: number;
  non_cheating_count: number;
  processing_time: number | null;
  error_message: string | null;
  input_filename: string;
  output_filename: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  output_url?: string;
}

export interface DetectionEvent {
  id: string;
  job_id: string;
  session_id: string | null;
  frame_number: number;
  timestamp_sec: number | null;
  class_id: number;
  class_name: 'cheating' | 'non-cheating' | string;
  confidence: number;
  bbox_x1: number | null;
  bbox_y1: number | null;
  bbox_x2: number | null;
  bbox_y2: number | null;
  source_video: string | null;
  review_status: 'pending' | 'reviewed' | 'dismissed';
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface EventListResponse {
  events: DetectionEvent[];
  total: number;
  page: number;
  page_size: number;
}

export interface ExamSession {
  id: string;
  session_name: string;
  exam_name: string;
  exam_date?: string;
  start_time?: string;
  end_time?: string;
  room?: string;
  camera_id?: string;
  notes?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSummary {
  total_sessions: number;
  videos_processed: number;
  total_detections: number;
  cheating_detections: number;
  non_cheating_detections: number;
  pending_reviews: number;
  completed_jobs: number;
  failed_jobs: number;
}

export interface TimelinePoint {
  date: string;
  cheating: number;
  non_cheating: number;
}

export interface CameraDevice {
  id: string;
  name: string;
  camera_type: string;
  stream_url?: string;
  location?: string;
  is_enabled: boolean;
  is_connected: boolean;
  last_seen?: string;
  created_at: string;
}

// ─── API Methods ────────────────────────────────────────────────────────────

export const fetchHealth = async (): Promise<HealthStatus> => {
  const { data } = await api.get<HealthStatus>('/api/health');
  return data;
};

export const fetchModelInfo = async (): Promise<ModelInfo> => {
  const { data } = await api.get<ModelInfo>('/api/model/info');
  return data;
};

export const fetchDemoVideo = async (): Promise<DemoVideoInfo> => {
  const { data } = await api.get<DemoVideoInfo>('/api/videos/demo');
  return data;
};

export const uploadVideo = async (file: File, onProgress?: (percent: number) => void) => {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await api.post('/api/videos/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (progressEvent) => {
      if (progressEvent.total && onProgress) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return data;
};

export const startAnalysis = async (params: {
  video_filename: string;
  session_id?: string;
  confidence_threshold?: number;
}): Promise<VideoJob> => {
  const { data } = await api.post<VideoJob>('/api/videos/analyze', params);
  return data;
};

export const getJobStatus = async (jobId: string): Promise<VideoJob> => {
  const { data } = await api.get<VideoJob>(`/api/videos/jobs/${jobId}`);
  return data;
};

export const getJobResult = async (jobId: string): Promise<VideoJob> => {
  const { data } = await api.get<VideoJob>(`/api/videos/jobs/${jobId}/result`);
  return data;
};

export const cancelJob = async (jobId: string): Promise<void> => {
  await api.post(`/api/videos/jobs/${jobId}/cancel`);
};

export const listJobs = async (): Promise<VideoJob[]> => {
  const { data } = await api.get<VideoJob[]>('/api/videos/jobs');
  return data;
};

export const listEvents = async (params?: {
  page?: number;
  page_size?: number;
  class_name?: string;
  review_status?: string;
  job_id?: string;
  session_id?: string;
  min_confidence?: number;
}): Promise<EventListResponse> => {
  const { data } = await api.get<EventListResponse>('/api/events', { params });
  return data;
};

export const updateEventReview = async (
  eventId: string,
  review_status: 'pending' | 'reviewed' | 'dismissed',
  review_notes?: string
): Promise<DetectionEvent> => {
  const { data } = await api.patch<DetectionEvent>(`/api/events/${eventId}/review`, {
    review_status,
    review_notes,
  });
  return data;
};

export const listSessions = async (): Promise<ExamSession[]> => {
  const { data } = await api.get<ExamSession[]>('/api/sessions');
  return data;
};

export const createSession = async (payload: Partial<ExamSession>): Promise<ExamSession> => {
  const { data } = await api.post<ExamSession>('/api/sessions', payload);
  return data;
};

export const updateSession = async (
  id: string,
  payload: Partial<ExamSession>
): Promise<ExamSession> => {
  const { data } = await api.patch<ExamSession>(`/api/sessions/${id}`, payload);
  return data;
};

export const fetchAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const { data } = await api.get<AnalyticsSummary>('/api/analytics/summary');
  return data;
};

export const fetchAnalyticsTimeline = async (): Promise<{ timeline: TimelinePoint[] }> => {
  const { data } = await api.get<{ timeline: TimelinePoint[] }>('/api/analytics/timeline');
  return data;
};

export const listCameras = async (): Promise<CameraDevice[]> => {
  const { data } = await api.get<CameraDevice[]>('/api/cameras');
  return data;
};

export const createCamera = async (payload: {
  name: string;
  camera_type?: string;
  stream_url?: string;
  location?: string;
}): Promise<CameraDevice> => {
  const { data } = await api.post<CameraDevice>('/api/cameras', payload);
  return data;
};

export const deleteCamera = async (id: string): Promise<void> => {
  await api.delete(`/api/cameras/${id}`);
};

export interface LiveDetection {
  class_id: number;
  class_name: string;
  confidence: number;
}

export interface LiveStatus {
  running: boolean;
  camera_ip: string | null;
  connected: boolean;
  last_frame_time: string | null;
  last_inference_time: string | null;
  latest_detections: LiveDetection[];
  frames_processed: number;
  total_cheating: number;
  total_non_cheating: number;
  error: string | null;
  fps: number;
}

export const startLiveMonitoring = async (camera_ip?: string, interval?: number): Promise<{ ok: boolean; message?: string }> => {
  const { data } = await api.post('/api/live/start', { camera_ip, capture_interval: interval });
  return data;
};

export const stopLiveMonitoring = async (): Promise<{ ok: boolean }> => {
  const { data } = await api.post('/api/live/stop');
  return data;
};

export const fetchLiveStatus = async (): Promise<LiveStatus> => {
  const { data } = await api.get<LiveStatus>('/api/live/status');
  return data;
};

export default api;
