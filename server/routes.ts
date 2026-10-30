import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { performGeointAnalysis } from './geointAnalyzer.js';
import { parseImageExif } from './exifParser.js';
import { store } from './db.js';

export const apiRouter = express.Router();

// 1. Анализ изображения GEOINT
apiRouter.post('/geoint/analyze', async (req: Request, res: Response) => {
  try {
    const { imageBase64, prompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Параметр imageBase64 обязателен.' });
    }

    const report = await performGeointAnalysis(imageBase64, prompt);
    store.addCase(report);

    return res.json(report);
  } catch (err: any) {
    console.error('Error in /api/geoint/analyze:', err);
    return res.status(500).json({ error: err?.message || 'Внутренняя ошибка сервера' });
  }
});

// 2. Только извлечение EXIF и GPS
apiRouter.post('/geoint/exif', async (req: Request, res: Response) => {
  try {
    const { imageBase64 } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Параметр imageBase64 обязателен.' });
    }

    const exifReport = await parseImageExif(imageBase64);
    return res.json(exifReport);
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Ошибка извлечения EXIF' });
  }
});

// 3. Список расследований
apiRouter.get('/geoint/cases', (req: Request, res: Response) => {
  return res.json(store.getCases());
});

apiRouter.get('/geoint/cases/:id', (req: Request, res: Response) => {
  const caseItem = store.getCaseById(req.params.id);
  if (!caseItem) {
    return res.status(404).json({ error: 'Расследование не найдено' });
  }
  return res.json(caseItem);
});

apiRouter.delete('/geoint/cases/:id', (req: Request, res: Response) => {
  const success = store.deleteCase(req.params.id);
  return res.json({ success });
});

// 4. Панель администратора: статистика
apiRouter.get('/admin/stats', (req: Request, res: Response) => {
  const cases = store.getCases();
  const users = store.getUsers();

  const totalInvestigations = cases.length;
  const highConfidenceCount = cases.filter((c) => c.confidence === 'Высокая').length;
  const mediumConfidenceCount = cases.filter((c) => c.confidence === 'Средняя').length;
  const lowConfidenceCount = cases.filter((c) => c.confidence === 'Низкая').length;

  const countryCounts: Record<string, number> = {};
  for (const c of cases) {
    if (c.country && c.country !== 'Не определена') {
      countryCounts[c.country] = (countryCounts[c.country] || 0) + 1;
    }
  }

  const topCountries = Object.entries(countryCounts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const totalRequests = users.reduce((acc, u) => acc + u.requestsCount, 0) + totalInvestigations;

  return res.json({
    totalUsers: users.length,
    bannedUsers: users.filter((u) => u.isBanned).length,
    totalInvestigations,
    totalRequests,
    highConfidenceCount,
    mediumConfidenceCount,
    lowConfidenceCount,
    topCountries,
  });
});

// 5. Панель администратора: пользователи
apiRouter.get('/admin/users', (req: Request, res: Response) => {
  return res.json(store.getUsers());
});

apiRouter.post('/admin/users/ban', (req: Request, res: Response) => {
  const { userId } = req.body;
  const updated = store.toggleBan(userId);
  if (!updated) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  return res.json(updated);
});

apiRouter.post('/admin/users/role', (req: Request, res: Response) => {
  const { userId } = req.body;
  const updated = store.toggleRole(userId);
  if (!updated) {
    return res.status(404).json({ error: 'Пользователь не найден' });
  }
  return res.json(updated);
});

// 6. Настройки бота
apiRouter.get('/bot/config', (req: Request, res: Response) => {
  const current = store.getSettings();
  const maskedToken = current.botToken
    ? `${current.botToken.substring(0, 8)}...${current.botToken.substring(current.botToken.length - 4)}`
    : '';

  return res.json({
    ...current,
    maskedToken,
  });
});

apiRouter.post('/bot/config', (req: Request, res: Response) => {
  const updated = store.updateSettings(req.body);
  return res.json(updated);
});

// 7. Проверка Telegram Bot Token
apiRouter.post('/bot/test-token', async (req: Request, res: Response) => {
  const { token } = req.body;
  if (!token) {
    return res.status(400).json({ error: 'Токен не указан' });
  }

  try {
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = await telegramRes.json();
    if (data.ok) {
      store.updateSettings({ botToken: token, status: 'online' });
      return res.json({
        success: true,
        bot: data.result,
        message: `Подключение успешно! Бот @${data.result.username} готов к приему сообщений.`,
      });
    } else {
      store.updateSettings({ status: 'error' });
      return res.status(400).json({
        success: false,
        error: data.description || 'Неверный токен бота Telegram',
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Ошибка соединения с Telegram API: ${err?.message}`,
    });
  }
});

// 8. Чтение файлов Python-бота для инспектора и скачивания в веб-интерфейсе
apiRouter.get('/python-files', (req: Request, res: Response) => {
  const baseDir = path.resolve(process.cwd(), 'python_bot');
  const filesList: Array<{ path: string; name: string; content: string; category: string }> = [];

  function readRecursive(dir: string, relativeDir: string = '') {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name === '__pycache__' || entry.name.endsWith('.pyc') || entry.name.endsWith('.db')) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relativeDir, entry.name);

      if (entry.isDirectory()) {
        readRecursive(fullPath, relPath);
      } else if (entry.isFile()) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          let category = 'Конфигурация & Сборка';
          if (entry.name === 'main.py') category = '1. Точка входа (main.py)';
          else if (entry.name === 'config.py') category = '2. Настройки (.env & config)';
          else if (entry.name === 'database.py') category = '3. База данных (SQLite)';
          else if (entry.name === 'geoint_service.py') category = '4. Сервис GEOINT & Vision';
          else if (entry.name === 'keyboards.py') category = '5. Клавиатуры & Меню';
          else if (entry.name === 'handlers_geoint.py') category = '6. Обработчики фото & команд';
          else if (entry.name === 'handlers_admin.py') category = '7. Панель администратора';
          else if (entry.name.endsWith('.md') || entry.name.endsWith('.txt') || entry.name.startsWith('.')) category = 'Документация & Окружение';
          else if (entry.name.includes('Docker') || entry.name.includes('compose')) category = 'Docker & Деплой';

          filesList.push({
            path: relPath,
            name: entry.name,
            content,
            category,
          });
        } catch (e) {
          console.error(`Failed to read file ${fullPath}:`, e);
        }
      }
    }
  }

  readRecursive(baseDir);
  return res.json(filesList);
});
