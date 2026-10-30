import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  Compass,
  ExternalLink,
  ChevronRight,
  Info,
  Trash2,
  Sparkles,
  MapPin,
  Search,
  CheckCheck
} from 'lucide-react';
import { TelegramMessageItem, GeointReport } from '../types';
import { api } from '../services/api';

interface TelegramSimulatorProps {
  onOpenReportDetails: (report: GeointReport) => void;
  onNavigateToAdmin: () => void;
  onNavigateToTools: () => void;
}

// Примеры заготовленных тестовых фото для быстрой проверки
const PRESET_PHOTOS = [
  {
    name: 'Эйфелева башня и улица Парижа',
    url: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=600&q=80',
    caption: 'Определи точный район и сторону съемки',
  },
  {
    name: 'Токио: квартал Сибуя с иероглифами',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80',
    caption: 'Какая страна и город? Проанализируй вывески',
  },
  {
    name: 'Швейцарские Альпы: серпантин',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    caption: 'Какая горная система и направление теней?',
  },
];

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({
  onOpenReportDetails,
  onNavigateToAdmin,
  onNavigateToTools,
}) => {
  const [messages, setMessages] = useState<TelegramMessageItem[]>([
    {
      id: 'msg-welcome',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text:
        '🛰 **Добро пожаловать в GEOINT & OSINT Ассистент!**\n\n' +
        'Я специализированный Telegram-бот на Python (`aiogram 3.x`) с поддержкой **Google Gemini 3.8 Flash**.\n\n' +
        '**Мои ключевые возможности:**\n' +
        '• 📍 Визуальная геолокация: поиск зацепок по архитектуре, столбам, разметке и теням\n' +
        '• 🔍 Поиск страниц с фото: Google Lens, Yandex, Bing, TinEye\n' +
        '• 📋 Краткие выводы и оценка достоверности гипотезы\n' +
        '• 📸 Извлечение встроенных аппаратных GPS координат из EXIF\n\n' +
        '👇 *Отправьте фотографию или выберите команду из меню ниже:*',
      buttons: [
        [
          { text: '📸 Инструкция по анализу', callback_data: 'cmd_geoint' },
          { text: '🛠 OSINT Инструменты', callback_data: 'cmd_tools' },
        ],
        [
          { text: '🔍 Поиск страниц по фото', callback_data: 'cmd_reverse' },
          { text: '👑 Панель управления', callback_data: 'cmd_admin' },
        ],
      ],
    },
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentReports, setCurrentReports] = useState<Record<string, GeointReport>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isProcessing]);

  // Обработка текстовых команд
  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputPrompt.trim();
    if (!text || isProcessing) return;

    const userMsgId = `msg-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: timeStr,
        text,
      },
    ]);

    if (!textToSend) setInputPrompt('');

    // Реакция на команды
    const lower = text.toLowerCase();
    if (lower === '/start') {
      setTimeout(() => {
        addBotMessage(
          '🛰 **GEOINT Бот готов к работе.**\n\nОтправьте любое фото местности для анализа архитектуры, биома, знаков и теней.',
          [
            [
              { text: '📸 Инструкция', callback_data: 'cmd_geoint' },
              { text: '🛠 Инструменты', callback_data: 'cmd_tools' },
            ],
          ]
        );
      }, 400);
      return;
    }

    if (lower === '/help' || lower.includes('помощь')) {
      setTimeout(() => {
        addBotMessage(
          '🧭 **Инструкция для аналитика:**\n\n' +
            '1. Прикрепляйте фото местности (улицы, здания, перекрестки, горы).\n' +
            '2. При отправке оригинала без сжатия извлекаются точные GPS координаты из метаданных EXIF.\n' +
            '3. Нейросеть Gemini 3.8 Flash выделит ключевые ориентиры и оценит сторону света.\n' +
            '4. Нажмите *"Искать в Google Lens"* или *"Яндекс"* для обнаружения сайтов и статей с этим фото.'
        );
      }, 400);
      return;
    }

    if (lower === '/tools' || lower.includes('инструменты')) {
      setTimeout(() => {
        addBotMessage(
          '🛠 **Каталог профессиональных инструментов GEOINT:**\n\n' +
            '• **SunCalc** — расчет положения солнца и азимута теней\n' +
            '• **Overpass Turbo** — фильтр тегов OpenStreetMap\n' +
            '• **Mapillary** — уличные панорамы со всего мира\n' +
            '• **Sentinel Hub** — актуальные мультиспектральные спутниковые снимки',
          [
            [
              { text: '☀️ SunCalc', url: 'https://www.suncalc.org/' },
              { text: '🛣 Overpass Turbo', url: 'https://overpass-turbo.eu/' },
            ],
            [
              { text: '📸 Mapillary', url: 'https://www.mapillary.com/' },
              { text: '🛰 Sentinel Hub', url: 'https://apps.sentinel-hub.com/eo-browser/' },
            ],
          ]
        );
      }, 400);
      return;
    }

    if (lower === '/reverse' || lower.includes('поиск страниц')) {
      setTimeout(() => {
        addBotMessage(
          '🔍 **Сервисы поиска первоисточников и страниц с фото:**\n\n' +
            'Выберите поисковую систему для загрузки фото:',
          [
            [
              { text: '🌐 Google Lens', url: 'https://lens.google.com/' },
              { text: '🇷🇺 Yandex Картинки', url: 'https://yandex.ru/images/search?rpt=imageview' },
            ],
            [
              { text: '🔎 Bing Visual', url: 'https://www.bing.com/visualsearch' },
              { text: '🤖 TinEye', url: 'https://tineye.com/' },
            ],
          ]
        );
      }, 400);
      return;
    }

    if (lower === '/profile' || lower.includes('профиль')) {
      setTimeout(() => {
        addBotMessage(
          '👤 **Профиль пользователя:**\n\n' +
            '• **ID:** `782910342`\n' +
            '• **Имя:** OSINT Аналитик\n' +
            '• **Статус:** 👑 Администратор\n' +
            '• **Выполнено расследований:** `18`\n' +
            '• **Модель по умолчанию:** `gemini-3.8-flash`'
        );
      }, 400);
      return;
    }

    if (lower === '/admin' || lower.includes('админ')) {
      setTimeout(() => {
        addBotMessage(
          '👑 **Панель администратора Telegram-бота:**\n\n' +
            'Доступ разрешен. Вы можете перейти в веб-панель управления или воспользоваться командами бота.',
          [
            [
              { text: '📊 Открыть Web Админку', callback_data: 'action_goto_admin' },
              { text: '🛠 Инструменты', callback_data: 'cmd_tools' },
            ],
          ]
        );
      }, 400);
      return;
    }

    // Если отправлен произвольный текст без фото
    setTimeout(() => {
      addBotMessage(
        '📷 Чтобы определить геолокацию или найти страницы с фото, пожалуйста, прикрепите изображение через иконку скрепки/фото или выберите пример из верхнего списка!'
      );
    }, 400);
  };

  const addBotMessage = (text: string, buttons?: { text: string; url?: string; callback_data?: string }[][]) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'bot',
        timestamp: timeStr,
        text,
        buttons,
      },
    ]);
  };

  // Обработка загрузки фото
  const handlePhotoUpload = async (imageBase64: string, captionText?: string) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Добавляем сообщение пользователя с превью
    const userMsgId = `msg-photo-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: userMsgId,
        sender: 'user',
        timestamp: timeStr,
        text: captionText || 'Проведи GEOINT анализ этого фото.',
        image: imageBase64,
      },
    ]);

    // Добавляем индикатор статуса
    const statusMsgId = `status-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: statusMsgId,
        sender: 'bot',
        timestamp: timeStr,
        text: '🛰 **Начат анализ изображения...**\n⏳ *Извлечение EXIF метаданных и сканирование маркеров через Gemini 3.8 Flash...*',
        isStatus: true,
      },
    ]);

    setIsProcessing(true);

    try {
      const report = await api.analyzeGeoint(imageBase64, captionText);
      setCurrentReports((prev) => ({ ...prev, [report.id]: report }));

      // Удаляем статус и отправляем полноценный отчет
      setMessages((prev) => prev.filter((m) => m.id !== statusMsgId));

      const confIcon = report.confidence === 'Высокая' ? '🟢' : report.confidence === 'Средняя' ? '🟡' : '🔴';
      const exifNote = report.exif.hasGps ? '\n📸 **EXIF:** обнаружены встроенные аппаратные GPS-метки!' : '';

      const reportText =
        `🎯 **Отчет расследования #${report.id.substring(5, 11)}**\n\n` +
        `🌍 **Локация:** ${report.country}` +
        (report.region ? `, ${report.region}` : '') +
        (report.cityOrDistrict && report.cityOrDistrict !== 'Не определен' ? ` (${report.cityOrDistrict})` : '') +
        '\n' +
        `📍 **Координаты:** \`${report.estimatedCoordinates}\`\n` +
        `${confIcon} **Достоверность:** ${report.confidence}\n` +
        `_${report.confidenceReason}_${exifNote}\n\n` +
        `📋 **Краткий вывод:**\n${report.executiveSummary}\n\n` +
        `🧩 **Ключевые зацепки:**\n` +
        (report.keyArtifacts.length > 0
          ? report.keyArtifacts.slice(0, 3).map((a) => `• ${a}`).join('\n')
          : '• Проанализированы архитектурные и природные индикаторы.') +
        '\n\n👇 *Нажмите кнопку ниже, чтобы найти страницы с этим фото или изучить зацепки:*';

      const buttons = [
        [
          { text: '🔍 Искать в Google Lens', url: 'https://lens.google.com/' },
          { text: '🇷🇺 Искать в Яндекс', url: 'https://yandex.ru/images/search?rpt=imageview' },
        ],
        [
          {
            text: '🗺 Показать на Google Картах',
            url: `https://www.google.com/maps/search/?api=1&query=${report.estimatedCoordinates.replace(' ', '')}`,
          },
          { text: '🧩 Визуальные улики', callback_data: `cues_${report.id}` },
        ],
        [
          { text: '📋 Полное досье кейса', callback_data: `details_${report.id}` },
          { text: '🔎 Поисковые дорки', callback_data: `dorks_${report.id}` },
        ],
      ];

      addBotMessage(reportText, buttons);
    } catch (err: any) {
      setMessages((prev) => prev.filter((m) => m.id !== statusMsgId));
      addBotMessage(
        `❌ **Ошибка анализа изображения:**\n\`${err?.message || 'Не удалось связаться с сервером'}\`\n\nПопробуйте повторить запрос.`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Обработка кликов по инлайн-кнопкам
  const handleCallbackClick = (callbackData: string) => {
    if (callbackData === 'cmd_geoint') {
      handleSendMessage('/geoint');
      return;
    }
    if (callbackData === 'cmd_tools') {
      handleSendMessage('/tools');
      return;
    }
    if (callbackData === 'cmd_reverse') {
      handleSendMessage('/reverse');
      return;
    }
    if (callbackData === 'cmd_admin' || callbackData === 'action_goto_admin') {
      onNavigateToAdmin();
      return;
    }

    if (callbackData.startsWith('details_')) {
      const reportId = callbackData.replace('details_', '');
      const rep = currentReports[reportId];
      if (rep) {
        onOpenReportDetails(rep);
      }
      return;
    }

    if (callbackData.startsWith('cues_')) {
      const reportId = callbackData.replace('cues_', '');
      const rep = currentReports[reportId];
      if (rep) {
        const vc = rep.visualCues;
        const cuesText =
          `🧩 **Детальный разбор визуальных улик (#${rep.id.substring(5, 11)}):**\n\n` +
          `🏛 **Архитектура:**\n${vc.architecture || 'Характерные элементы не выявлены'}\n\n` +
          `🌲 **Флора & Ландшафт:**\n${vc.landscapeVegetation || 'Характерные элементы не выявлены'}\n\n` +
          `🛣 **Инфраструктура:**\n${vc.infrastructureTransit || 'Характерные элементы не выявлены'}\n\n` +
          `🪧 **Вывески & Язык:**\n${vc.signageLanguage || 'Текст не обнаружен'}\n\n` +
          `☀️ **Тени & Солнце:**\n${vc.celestialSunShadows || 'Оценка азимута затруднена'}`;

        addBotMessage(cuesText, [
          [
            { text: '📋 Открыть полный кейс', callback_data: `details_${rep.id}` },
            { text: '🔍 Искать в Google Lens', url: 'https://lens.google.com/' },
          ],
        ]);
      }
      return;
    }

    if (callbackData.startsWith('dorks_')) {
      const reportId = callbackData.replace('dorks_', '');
      const rep = currentReports[reportId];
      if (rep && rep.dorks) {
        const dorkLines = rep.dorks
          .map((d) => `🔎 **${d.title}:**\n\`${d.query}\``)
          .join('\n\n');

        addBotMessage(`🔎 **Специализированные поисковые запросы (Google OSINT Dorks):**\n\n${dorkLines}`, [
          [{ text: '🔍 Поиск в Google Lens', url: 'https://lens.google.com/' }],
        ]);
      }
    }
  };

  // Выбор пресета
  const handleSelectPreset = async (preset: (typeof PRESET_PHOTOS)[0]) => {
    try {
      setIsProcessing(true);
      // Загружаем картинку и конвертируем в base64
      const res = await fetch(preset.url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result as string;
        handlePhotoUpload(base64data, preset.caption);
      };
      reader.readAsDataURL(blob);
    } catch (e: any) {
      setIsProcessing(false);
      addBotMessage(`Не удалось загрузить пример фото: ${e?.message}`);
    }
  };

  // Выбор файла через input
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      handlePhotoUpload(base64data, inputPrompt.trim() || undefined);
      setInputPrompt('');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="flex h-[calc(100vh-65px)] w-full overflow-hidden bg-slate-950">
      {/* Боковая панель быстрых пресетов */}
      <div className="hidden lg:flex w-80 flex-col border-r border-slate-800 bg-slate-900/60 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Тестовые GEOINT фото
            </h2>
          </div>
          <span className="text-xs text-slate-500">1 клик</span>
        </div>

        <p className="mb-4 text-xs text-slate-400 leading-relaxed">
          Нажмите на любой образец, чтобы запустить реальный анализ визуальных ориентиров и поиск дубликатов:
        </p>

        <div className="space-y-3 overflow-y-auto pr-1">
          {PRESET_PHOTOS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleSelectPreset(preset)}
              disabled={isProcessing}
              className="group flex w-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-900 text-left transition-all hover:border-emerald-500/50 hover:bg-slate-850"
            >
              <div className="relative h-28 w-full overflow-hidden bg-slate-950">
                <img
                  src={preset.url}
                  alt={preset.name}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 text-xs font-medium text-white drop-shadow-md">
                  {preset.name}
                </span>
              </div>
              <div className="p-2.5">
                <span className="text-[11px] text-slate-400 line-clamp-1">
                  «{preset.caption}»
                </span>
              </div>
            </button>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-800 pt-4">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-300 mb-1">
              <Info className="h-3.5 w-3.5 text-emerald-400" />
              <span>Архитектура бота</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              Исходный код на Python 3 (`aiogram 3.x`) доступен во вкладке «Python Код». Вы можете скопировать или скачать проект целиком.
            </p>
          </div>
        </div>
      </div>

      {/* Основной экран симулятора Telegram */}
      <div className="flex flex-1 flex-col bg-slate-950">
        {/* Шапка чата Telegram */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/90 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 font-bold text-white shadow-md">
              <Compass className="h-5 w-5" />
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">GeoSpy Intelligence Bot</span>
                <span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
                  @geoint_osint_bot
                </span>
              </div>
              <span className="text-xs text-slate-400">
                AI Vision · Gemini 3.8 Flash · aiogram 3.x
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setMessages([messages[0]]);
                setCurrentReports({});
              }}
              title="Очистить чат"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Область сообщений */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`relative max-w-2xl rounded-2xl p-4 shadow-sm ${
                  msg.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-tr-xs'
                    : msg.isStatus
                    ? 'bg-slate-900/80 border border-emerald-500/30 text-slate-200'
                    : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-xs'
                }`}
              >
                {/* Картинка, если есть */}
                {msg.image && (
                  <div className="mb-3 overflow-hidden rounded-xl border border-white/10 max-h-72">
                    <img
                      src={msg.image}
                      alt="Uploaded"
                      className="w-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                {/* Текст сообщения */}
                {msg.text && (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed font-sans">
                    {msg.text}
                  </div>
                )}

                {/* Время */}
                <div
                  className={`mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums ${
                    msg.sender === 'user' ? 'text-emerald-200' : 'text-slate-400'
                  }`}
                >
                  <span>{msg.timestamp}</span>
                  {msg.sender === 'user' && <CheckCheck className="h-3 w-3" />}
                </div>

                {/* Инлайн-кнопки (как в Telegram) */}
                {msg.buttons && msg.buttons.length > 0 && (
                  <div className="mt-3 space-y-1.5 border-t border-slate-800/80 pt-3">
                    {msg.buttons.map((row, rIdx) => (
                      <div key={rIdx} className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {row.map((btn, bIdx) => (
                          btn.url ? (
                            <a
                              key={bIdx}
                              href={btn.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-xs font-medium text-emerald-400 transition-colors hover:bg-slate-750 hover:text-emerald-300 text-center"
                            >
                              <span className="truncate">{btn.text}</span>
                              <ExternalLink className="h-3 w-3 shrink-0 opacity-60" />
                            </a>
                          ) : (
                            <button
                              key={bIdx}
                              onClick={() => btn.callback_data && handleCallbackClick(btn.callback_data)}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-700/60 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-slate-750 hover:text-white text-center"
                            >
                              <span className="truncate">{btn.text}</span>
                            </button>
                          )
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Бот печатает и проводит GEOINT расследование...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Быстрое постоянное меню бота (Reply Keyboard) */}
        <div className="border-t border-slate-800 bg-slate-900/60 px-4 py-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
            >
              📸 Отправить фото
            </button>
            <button
              onClick={() => handleSendMessage('/reverse')}
              className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
            >
              🔍 Поиск страниц с фото
            </button>
            <button
              onClick={() => handleSendMessage('/tools')}
              className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
            >
              🛠 OSINT Инструменты
            </button>
            <button
              onClick={() => handleSendMessage('/profile')}
              className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-slate-300 hover:border-emerald-500/40 hover:text-white transition-colors"
            >
              📊 Мой профиль
            </button>
            <button
              onClick={onNavigateToAdmin}
              className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs text-emerald-400 hover:border-emerald-500/40 hover:text-emerald-300 transition-colors ml-auto"
            >
              👑 Админ-панель
            </button>
          </div>
        </div>

        {/* Поле ввода сообщения */}
        <div className="border-t border-slate-800 bg-slate-900 p-3 sm:p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              title="Прикрепить изображение"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 text-slate-400 transition-colors hover:bg-slate-800 hover:text-emerald-400"
            >
              <ImageIcon className="h-5 w-5" />
            </button>

            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Напишите команду (/start, /geoint, /tools) или вопрос..."
              disabled={isProcessing}
              className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />

            <button
              type="submit"
              disabled={isProcessing || !inputPrompt.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white transition-colors hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
