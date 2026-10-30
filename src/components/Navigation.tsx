import React from 'react';
import { Compass, ShieldCheck } from 'lucide-react';

interface NavigationProps {
  activeTab: 'bot' | 'analyzer' | 'admin' | 'code' | 'tools';
  setActiveTab: (tab: 'bot' | 'analyzer' | 'admin' | 'code' | 'tools') => void;
  onNewInvestigationClick: () => void;
  botStatus?: 'online' | 'standby' | 'error';
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  setActiveTab,
  onNewInvestigationClick,
  botStatus = 'standby',
}) => {
  return (
    <header className="sticky top-0 z-50 flex items-center justify-between gap-8 border-b border-slate-800 bg-slate-950/90 px-6 py-3.5 backdrop-blur-md">
      {/* Zone 1: Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Compass className="h-5 w-5" />
        </div>
        <button
          onClick={() => setActiveTab('bot')}
          className="text-lg font-bold tracking-tight text-white whitespace-nowrap text-left"
        >
          GeoSpy OSINT
        </button>
      </div>

      {/* Zone 2: 4-5 single-line nav links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
        <button
          onClick={() => setActiveTab('bot')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'bot'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Telegram Бот
        </button>

        <button
          onClick={() => setActiveTab('analyzer')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'analyzer'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Анализатор
        </button>

        <button
          onClick={() => setActiveTab('admin')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'admin'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Админ-панель
        </button>

        <button
          onClick={() => setActiveTab('code')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'code'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Python Код (aiogram)
        </button>

        <button
          onClick={() => setActiveTab('tools')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 ${
            activeTab === 'tools'
              ? 'text-emerald-400 border-b-2 border-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Инструменты
        </button>
      </nav>

      {/* Zone 3: 1 primary action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onNewInvestigationClick}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-500 active:scale-95 whitespace-nowrap shrink-0"
        >
          <ShieldCheck className="h-4 w-4" />
          Новое расследование
        </button>
      </div>
    </header>
  );
};
