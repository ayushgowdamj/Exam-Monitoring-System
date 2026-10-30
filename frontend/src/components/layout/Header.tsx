import React from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Shield, Cpu, RefreshCw } from 'lucide-react';
import { HealthStatus } from '../../api/client';

interface HeaderProps {
  health: HealthStatus | null;
  onRefreshHealth?: () => void;
}

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Overview Operations',
    subtitle: 'Real-time telemetry, session metrics & incident stream',
  },
  '/live': {
    title: 'Live Camera Monitoring',
    subtitle: 'Active streams and real-time inference feeds',
  },
  '/video-analysis': {
    title: 'Video Analysis Workspace',
    subtitle: 'Upload footage or run deep AI verification on demo exams',
  },
  '/events': {
    title: 'Detection Event Log',
    subtitle: 'Audit trail of model predictions awaiting institutional review',
  },
  '/sessions': {
    title: 'Examination Sessions',
    subtitle: 'Manage proctored test schedules and assigned camera stations',
  },
  '/analytics': {
    title: 'Behavioral Analytics',
    subtitle: 'Prediction distributions and pattern tracking over time',
  },
  '/cameras': {
    title: 'Camera Device Stations',
    subtitle: 'ESP32-CAM and remote network camera topology configuration',
  },
  '/settings': {
    title: 'System Preferences',
    subtitle: 'Confidence thresholding, storage limits and AI operational parameters',
  },
};

export const Header: React.FC<HeaderProps> = ({ health, onRefreshHealth }) => {
  const location = useLocation();
  const current = pageTitles[location.pathname] || {
    title: 'AI ExamGuard',
    subtitle: 'Smarter Monitoring. Fairer Examinations.',
  };

  return (
    <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div>
        <h1 className="text-lg font-bold text-white flex items-center gap-2">
          {current.title}
        </h1>
        <p className="text-xs text-slate-400">{current.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Model status pill */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/60 text-xs">
          <Cpu className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-400">Model:</span>
          <span className="font-semibold text-slate-200">
            {health?.model_loaded ? 'best.pt (Active)' : 'Unloaded'}
          </span>
        </div>

        {/* Refresh health */}
        {onRefreshHealth && (
          <button
            onClick={onRefreshHealth}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors border border-slate-800/60"
            title="Refresh system status"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}

        {/* Notifications */}
        <button
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-colors border border-slate-800/60 relative"
          title="System notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500" />
        </button>

        {/* Security badge / User placeholder */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-900/30 border border-blue-500/30 flex items-center justify-center text-blue-400 font-semibold text-xs">
            <Shield className="w-4 h-4" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <span className="text-xs font-semibold text-slate-200 leading-tight">
              Proctor Ops
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">Local Node</span>
          </div>
        </div>
      </div>
    </header>
  );
};
