import { GeointReport, AdminStats, WebUser, BotSettings, PythonFileItem, ExifReport } from '../types';

export const api = {
  async analyzeGeoint(imageBase64: string, prompt?: string): Promise<GeointReport> {
    const res = await fetch('/api/geoint/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  },

  async extractExif(imageBase64: string): Promise<ExifReport> {
    const res = await fetch('/api/geoint/exif', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64 }),
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res.json();
  },

  async getCases(): Promise<GeointReport[]> {
    const res = await fetch('/api/geoint/cases');
    if (!res.ok) throw new Error('Не удалось загрузить расследования');
    return res.json();
  },

  async getCase(id: string): Promise<GeointReport> {
    const res = await fetch(`/api/geoint/cases/${id}`);
    if (!res.ok) throw new Error('Расследование не найдено');
    return res.json();
  },

  async deleteCase(id: string): Promise<void> {
    const res = await fetch(`/api/geoint/cases/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Не удалось удалить кейс');
  },

  async getStats(): Promise<AdminStats> {
    const res = await fetch('/api/admin/stats');
    if (!res.ok) throw new Error('Не удалось загрузить статистику');
    return res.json();
  },

  async getUsers(): Promise<WebUser[]> {
    const res = await fetch('/api/admin/users');
    if (!res.ok) throw new Error('Не удалось загрузить пользователей');
    return res.json();
  },

  async toggleUserBan(userId: string): Promise<WebUser> {
    const res = await fetch('/api/admin/users/ban', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Ошибка изменения статуса блокировки');
    return res.json();
  },

  async toggleUserRole(userId: string): Promise<WebUser> {
    const res = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) throw new Error('Ошибка изменения роли');
    return res.json();
  },

  async getBotConfig(): Promise<BotSettings> {
    const res = await fetch('/api/bot/config');
    if (!res.ok) throw new Error('Не удалось загрузить конфигурацию');
    return res.json();
  },

  async updateBotConfig(partial: Partial<BotSettings>): Promise<BotSettings> {
    const res = await fetch('/api/bot/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(partial),
    });
    if (!res.ok) throw new Error('Не удалось обновить настройки');
    return res.json();
  },

  async testTelegramToken(token: string): Promise<{ success: boolean; bot?: any; message?: string; error?: string }> {
    const res = await fetch('/api/bot/test-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });
    return res.json();
  },

  async getPythonFiles(): Promise<PythonFileItem[]> {
    const res = await fetch('/api/python-files');
    if (!res.ok) throw new Error('Не удалось загрузить файлы бота');
    return res.json();
  },
};
