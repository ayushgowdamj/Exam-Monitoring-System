import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { HealthStatus } from '../../api/client';

interface LayoutProps {
  health: HealthStatus | null;
  onRefreshHealth: () => void;
  children?: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ health, onRefreshHealth, children }) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 flex flex-row antialiased overflow-x-hidden">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} health={health} />
      
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#020617]">
        <Header health={health} onRefreshHealth={onRefreshHealth} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};
