/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { TelegramSimulator } from './components/TelegramSimulator';
import { GeointAnalyzerView } from './components/GeointAnalyzerView';
import { AdminPanel } from './components/AdminPanel';
import { PythonCodeExplorer } from './components/PythonCodeExplorer';
import { OsintToolboxModal } from './components/OsintToolboxModal';
import { GeointReport, BotSettings } from './types';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState<'bot' | 'analyzer' | 'admin' | 'code' | 'tools'>('bot');
  const [currentReport, setCurrentReport] = useState<GeointReport | null>(null);
  const [botConfig, setBotConfig] = useState<BotSettings | null>(null);

  useEffect(() => {
    // Загружаем первый кейс по умолчанию
    api
      .getCases()
      .then((cases) => {
        if (cases.length > 0) {
          setCurrentReport(cases[0]);
        }
      })
      .catch((e) => console.error('Failed to load initial cases:', e));

    api
      .getBotConfig()
      .then((cfg) => setBotConfig(cfg))
      .catch((e) => console.error('Failed to load bot config:', e));
  }, []);

  const handleOpenReport = (report: GeointReport) => {
    setCurrentReport(report);
    setActiveTab('analyzer');
  };

  const handleNewInvestigation = () => {
    setActiveTab('bot');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      <Navigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onNewInvestigationClick={handleNewInvestigation}
        botStatus={botConfig?.status || 'standby'}
      />

      <main className="flex-1 w-full overflow-hidden">
        {activeTab === 'bot' && (
          <TelegramSimulator
            onOpenReportDetails={handleOpenReport}
            onNavigateToAdmin={() => setActiveTab('admin')}
            onNavigateToTools={() => setActiveTab('tools')}
          />
        )}

        {activeTab === 'analyzer' && (
          <GeointAnalyzerView
            currentReport={currentReport}
            onSelectAnotherCase={() => setActiveTab('admin')}
          />
        )}

        {activeTab === 'admin' && (
          <AdminPanel onOpenCase={handleOpenReport} />
        )}

        {activeTab === 'code' && (
          <PythonCodeExplorer />
        )}

        {activeTab === 'tools' && (
          <OsintToolboxModal />
        )}
      </main>
    </div>
  );
}
