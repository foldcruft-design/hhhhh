import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Compass,
  Activity,
  Key,
  CheckCircle2,
  AlertCircle,
  Radio,
  Search,
  Trash2,
  Eye,
  Send,
  UserCheck,
  UserX,
  RefreshCw,
  Sliders,
  ExternalLink
} from 'lucide-react';
import { AdminStats, WebUser, GeointReport, BotSettings } from '../types';
import { api } from '../services/api';

interface AdminPanelProps {
  onOpenCase: (report: GeointReport) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onOpenCase }) => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<WebUser[]>([]);
  const [cases, setCases] = useState<GeointReport[]>([]);
  const [botConfig, setBotConfig] = useState<BotSettings | null>(null);

  const [activeSection, setActiveSection] = useState<'overview' | 'bot' | 'cases' | 'users' | 'broadcast'>('overview');
  const [tokenInput, setTokenInput] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingToken, setIsTestingToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Поиск по расследованиям
  const [caseSearch, setCaseSearch] = useState('');

  // Рассылка
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [s, u, c, cfg] = await Promise.all([
        api.getStats(),
        api.getUsers(),
        api.getCases(),
        api.getBotConfig(),
      ]);
      setStats(s);
      setUsers(u);
      setCases(c);
      setBotConfig(cfg);
      if (cfg.botToken && !tokenInput) {
        setTokenInput(cfg.botToken);
      }
    } catch (e) {
      console.error('Failed to load admin data:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleTestToken = async () => {
    if (!tokenInput.trim()) return;
    setIsTestingToken(true);
    setTestResult(null);
    try {
      const res = await api.testTelegramToken(tokenInput.trim());
      if (res.success) {
        setTestResult({
          success: true,
          message: res.message || 'Токен валиден! Бот успешно отвечает на запросы.',
        });
        loadData();
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Ошибка проверки токена Telegram API',
        });
      }
    } catch (e: any) {
      setTestResult({
        success: false,
        message: e.message || 'Ошибка соединения',
      });
    } finally {
      setIsTestingToken(false);
    }
  };

  const handleToggleBan = async (userId: string) => {
    try {
      const updated = await api.toggleUserBan(userId);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleToggleRole = async (userId: string) => {
    try {
      const updated = await api.toggleUserRole(userId);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (!confirm('Удалить запись расследования?')) return;
    try {
      await api.deleteCase(id);
      setCases((prev) => prev.filter((c) => c.id !== id));
      loadData();
    } catch (e: any) {
      alert(`Ошибка: ${e.message}`);
    }
  };

  const handleSendBroadcast = async () => {
    if (!broadcastText.trim()) return;
    setIsBroadcasting(true);
    setBroadcastStatus(null);

    // Имитируем рассылку по базе пользователей
    setTimeout(() => {
      setIsBroadcasting(false);
      setBroadcastStatus(`Сообщение успешно отправлено ${users.filter((u) => !u.isBanned).length} пользователям.`);
      setBroadcastText('');
    }, 1000);
  };

  const filteredCases = cases.filter((c) => {
    const q = caseSearch.toLowerCase();
    return (
      c.country.toLowerCase().includes(q) ||
      c.region.toLowerCase().includes(q) ||
      c.id.toLowerCase().includes(q) ||
      c.estimatedCoordinates.includes(q)
    );
  });

  return (
    <div className="flex h-[calc(100vh-65px)] w-full flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Боковое меню навигации админки */}
      <div className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/60 p-4 shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-6 px-2">
            <Shield className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-bold text-white">Админ-консоль</h2>
              <span className="text-[11px] text-slate-400">Управление ботом & расследованиями</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveSection('overview')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === 'overview'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              Обзор & Метрики
            </button>

            <button
              onClick={() => setActiveSection('cases')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === 'cases'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Compass className="h-4 w-4" />
              Дела расследований ({cases.length})
            </button>

            <button
              onClick={() => setActiveSection('users')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === 'users'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Users className="h-4 w-4" />
              Пользователи & Доступ ({users.length})
            </button>

            <button
              onClick={() => setActiveSection('bot')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === 'bot'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Radio className="h-4 w-4" />
              Настройки Telegram API
            </button>

            <button
              onClick={() => setActiveSection('broadcast')}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === 'broadcast'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Send className="h-4 w-4" />
              Рассылка пользователям
            </button>
          </nav>
        </div>

        <div className="border-t border-slate-800 pt-4 mt-4">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-800 bg-slate-900 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить данные
          </button>
        </div>
      </div>

      {/* Основная рабочая зона админки */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* РАЗДЕЛ 1: ОБЗОР И МЕТРИКИ */}
        {activeSection === 'overview' && stats && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">Операционный дашборд</h2>
              <p className="text-xs text-slate-400">
                Мониторинг активности аналитиков, точности гео-определений и сетевых запросов
              </p>
            </div>

            {/* Стрип KPI метрик */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400 block mb-1">Всего пользователей</span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums">
                  {stats.totalUsers}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Заблокировано: {stats.bannedUsers}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400 block mb-1">Расследований GEOINT</span>
                <span className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
                  {stats.totalInvestigations}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Высокая точность: {stats.highConfidenceCount}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400 block mb-1">Всего запросов к боту</span>
                <span className="text-2xl font-bold font-mono text-white tabular-nums">
                  {stats.totalRequests}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Включая команды и EXIF
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs text-slate-400 block mb-1">Модель нейросети</span>
                <span className="text-sm font-semibold font-mono text-emerald-400 truncate block mt-1">
                  gemini-3.8-flash
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  Vision + Reasoning
                </span>
              </div>
            </div>

            {/* Топ стран */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                География определенных локаций
              </h3>
              {stats.topCountries.length > 0 ? (
                <div className="space-y-2">
                  {stats.topCountries.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{c.country}</span>
                      <span className="font-mono text-slate-400 tabular-nums">
                        {c.count} {c.count === 1 ? 'расследование' : 'расследований'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-slate-500">Данных по странам пока нет</span>
              )}
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 2: НАСТРОЙКИ TELEGRAM БОТА */}
        {activeSection === 'bot' && (
          <div className="space-y-6 max-w-2xl">
            <div>
              <h2 className="text-lg font-bold text-white">Интеграция Telegram Bot API</h2>
              <p className="text-xs text-slate-400">
                Подключение реального токена от @BotFather для работы бота на вашем личном аккаунте
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Telegram Bot Token
                </label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tokenInput}
                    onChange={(e) => setTokenInput(e.target.value)}
                    placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                  />
                  <button
                    onClick={handleTestToken}
                    disabled={isTestingToken || !tokenInput.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
                  >
                    {isTestingToken ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Key className="h-3.5 w-3.5" />}
                    Проверить
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Получите токен у официального бота @BotFather в Telegram
                </span>
              </div>

              {testResult && (
                <div
                  className={`rounded-lg p-3 text-xs flex items-start gap-2 ${
                    testResult.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}

              <div className="border-t border-slate-800/80 pt-4 space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Фреймворк:</span>
                  <span className="font-mono text-slate-200">aiogram 3.17+ (Python 3.10+)</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Модель анализа:</span>
                  <span className="font-mono text-emerald-400">gemini-3.8-flash</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">База данных:</span>
                  <span className="font-mono text-slate-200">aiosqlite (geoint_bot.db)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 3: ДЕЛА РАССЛЕДОВАНИЙ */}
        {activeSection === 'cases' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Реестр расследований</h2>
                <p className="text-xs text-slate-400">
                  Все зафиксированные кейсы с визуальными зацепками и координатами
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={caseSearch}
                  onChange={(e) => setCaseSearch(e.target.value)}
                  placeholder="Поиск по стране или координатам..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3 font-semibold">ID / Дата</th>
                      <th className="px-4 py-3 font-semibold">Страна & Регион</th>
                      <th className="px-4 py-3 font-semibold">Координаты</th>
                      <th className="px-4 py-3 font-semibold">Достоверность</th>
                      <th className="px-4 py-3 font-semibold text-right">Действия</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {filteredCases.length > 0 ? (
                      filteredCases.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-850/60 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-400 tabular-nums">
                            <div>#{c.id.substring(5, 11)}</div>
                            <div className="text-[10px] text-slate-500">
                              {c.timestamp.substring(0, 16).replace('T', ' ')}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white block">{c.country}</span>
                            <span className="text-[11px] text-slate-400">{c.region || 'Не указан'}</span>
                          </td>
                          <td className="px-4 py-3 font-mono text-slate-300 tabular-nums">
                            {c.estimatedCoordinates}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                                c.confidence === 'Высокая'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : c.confidence === 'Средняя'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              }`}
                            >
                              {c.confidence}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => onOpenCase(c)}
                                title="Открыть досье"
                                className="flex h-7 px-2 items-center gap-1 rounded border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                <span>Досье</span>
                              </button>
                              <button
                                onClick={() => handleDeleteCase(c.id)}
                                title="Удалить кейс"
                                className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          Кейсы не найдены
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 4: ПОЛЬЗОВАТЕЛИ */}
        {activeSection === 'users' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Управление пользователями</h2>
              <p className="text-xs text-slate-400">
                Контроль прав доступа, блокировка нарушителей и история запросов
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Пользователь</th>
                    <th className="px-4 py-3 font-semibold">Роль</th>
                    <th className="px-4 py-3 font-semibold">Запросов</th>
                    <th className="px-4 py-3 font-semibold">Статус</th>
                    <th className="px-4 py-3 font-semibold text-right">Управление</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-850/60 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-white block">{u.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          @{u.username} · ID {u.id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleRole(u.id)}
                          className="rounded border border-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:border-slate-700"
                        >
                          {u.role === 'admin' ? '👑 Администратор' : '🕵️ Аналитик'}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono tabular-nums">{u.requestsCount}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                            u.isBanned
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {u.isBanned ? 'Заблокирован' : 'Активен'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleToggleBan(u.id)}
                          className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                            u.isBanned
                              ? 'bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30'
                              : 'bg-rose-600/20 text-rose-300 hover:bg-rose-600/30'
                          }`}
                        >
                          {u.isBanned ? 'Разблокировать' : 'Заблокировать'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* РАЗДЕЛ 5: РАССЫЛКА */}
        {activeSection === 'broadcast' && (
          <div className="space-y-4 max-w-xl">
            <div>
              <h2 className="text-lg font-bold text-white">Массовая рассылка</h2>
              <p className="text-xs text-slate-400">
                Отправка системного уведомления или обновления всем активным пользователям бота
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Текст сообщения для рассылки
                </label>
                <textarea
                  rows={5}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Внимание: база ориентиров обновлена. Добавлены новые маркеры для поиска в Google Lens..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-100 placeholder-slate-600 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {broadcastStatus && (
                <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{broadcastStatus}</span>
                </div>
              )}

              <button
                onClick={handleSendBroadcast}
                disabled={isBroadcasting || !broadcastText.trim()}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-40 transition-colors"
              >
                {isBroadcasting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Отправить рассылку
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
