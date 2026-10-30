import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Radio,
  FileVideo,
  ShieldAlert,
  Calendar,
  BarChart3,
  Camera,
  Settings,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { HealthStatus } from '../../api/client';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (val: boolean) => void;
  health: HealthStatus | null;
}

const navItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/live', label: 'Live Monitoring', icon: Radio },
  { path: '/video-analysis', label: 'Video Analysis', icon: FileVideo, highlight: true },
  { path: '/events', label: 'Detection Events', icon: ShieldAlert },
  { path: '/sessions', label: 'Exam Sessions', icon: Calendar },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/cameras', label: 'Camera Devices', icon: Camera },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed, health }) => {
  return (
    <aside
      className={`fixed top-0 left-0 z-30 h-screen transition-all duration-300 ease-in-out border-r border-slate-800/80 bg-slate-950/95 backdrop-blur-md flex flex-col ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-wide bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                AI ExamGuard
              </span>
              <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Monitoring Ops
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/60'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  {!collapsed && (
                    <span className="truncate flex-1">{item.label}</span>
                  )}
                  {item.highlight && !collapsed && (
                    <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  )}
                  {collapsed && (
                    <div className="absolute left-full ml-3 px-2 py-1 bg-slate-900 text-xs text-white rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-slate-800 shadow-xl z-50">
                      {item.label}
                    </div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* System Status footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-900/40">
        <div
          className={`flex items-center gap-2.5 p-2 rounded-xl border border-slate-800/60 bg-slate-950/60 ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <div className="relative shrink-0">
            <span
              className={`block w-2.5 h-2.5 rounded-full ${
                health?.status === 'ok' ? 'bg-emerald-500' : 'bg-rose-500'
              }`}
            />
            {health?.status === 'ok' && (
              <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500/40 animate-ping" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 truncate">
                  {health?.status === 'ok' ? 'Engine Active' : 'Offline'}
                </span>
                <span className="text-[10px] text-slate-500 mono">v{health?.version || '1.0'}</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                <Activity className="w-3 h-3 text-emerald-400" />
                {health?.model_loaded ? 'YOLO Ready' : 'Model Loading'}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
