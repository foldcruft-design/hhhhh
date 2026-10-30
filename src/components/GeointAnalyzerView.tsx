import React, { useState } from 'react';
import {
  Compass,
  MapPin,
  ExternalLink,
  Copy,
  Check,
  Search,
  Camera,
  Layers,
  Sun,
  Shield,
  Download,
  Share2,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { GeointReport } from '../types';

interface GeointAnalyzerViewProps {
  currentReport: GeointReport | null;
  onSelectAnotherCase?: () => void;
}

export const GeointAnalyzerView: React.FC<GeointAnalyzerViewProps> = ({ currentReport }) => {
  const [activeTab, setActiveTab] = useState<'cues' | 'reverse' | 'exif' | 'dorks'>('cues');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  if (!currentReport) {
    return (
      <div className="flex h-[calc(100vh-65px)] items-center justify-center bg-slate-950 p-6 text-center">
        <div className="max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Compass className="h-7 w-7" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Нет активного расследования</h2>
          <p className="text-sm text-slate-400 mb-6 leading-relaxed">
            Отправьте фото в Telegram-боте или выберите один из образцов, чтобы провести полный визуальный анализ местности.
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md =
      `# Отчет GEOINT расследования #${currentReport.id}\n\n` +
      `**Дата:** ${currentReport.timestamp}\n` +
      `**Страна:** ${currentReport.country}\n` +
      `**Регион:** ${currentReport.region}\n` +
      `**Координаты:** ${currentReport.estimatedCoordinates}\n` +
      `**Достоверность:** ${currentReport.confidence} (${currentReport.confidenceReason})\n\n` +
      `## Краткий вывод\n${currentReport.executiveSummary}\n\n` +
      `## Визуальные улики\n` +
      `- **Архитектура:** ${currentReport.visualCues.architecture}\n` +
      `- **Флора и ландшафт:** ${currentReport.visualCues.landscapeVegetation}\n` +
      `- **Инфраструктура:** ${currentReport.visualCues.infrastructureTransit}\n` +
      `- **Вывески и язык:** ${currentReport.visualCues.signageLanguage}\n` +
      `- **Солнце и тени:** ${currentReport.visualCues.celestialSunShadows}\n\n` +
      `## Ключевые артефакты\n` +
      currentReport.keyArtifacts.map((a) => `- ${a}`).join('\n') +
      `\n\n## Следующие шаги OSINT\n` +
      currentReport.recommendedSteps.map((s) => `- ${s}`).join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `geoint_dossier_${currentReport.id}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const confBg =
    currentReport.confidence === 'Высокая'
      ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
      : currentReport.confidence === 'Средняя'
      ? 'text-amber-400 border-amber-500/20 bg-amber-500/10'
      : 'text-rose-400 border-rose-500/20 bg-rose-500/10';

  const cleanCoords = currentReport.estimatedCoordinates.replace(' ', '');

  return (
    <div className="flex h-[calc(100vh-65px)] w-full flex-col lg:flex-row overflow-hidden bg-slate-950">
      {/* Левая колонка: Просмотрщик изображения */}
      <div className="flex flex-1 flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-900/40">
        {/* Панель управления зумом */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-300">Инспектор снимка</span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {Math.round(zoomLevel * 100)}%
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="flex h-7 px-2 items-center justify-center rounded-md border border-slate-800 text-xs text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              100%
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Область отображения фото с зумом */}
        <div className="relative flex flex-1 items-center justify-center overflow-auto p-4 bg-slate-950/80">
          {currentReport.imageBase64 ? (
            <div
              style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
              className="transition-transform duration-150 max-w-full max-h-[70vh]"
            >
              <img
                src={currentReport.imageBase64}
                alt="Investigated Target"
                className="rounded-lg shadow-2xl border border-slate-800 object-contain max-h-[65vh]"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-500">
              <Camera className="h-10 w-10 mb-2 opacity-40" />
              <span className="text-xs">Изображение загружено по URL</span>
            </div>
          )}
        </div>

        {/* Быстрые действия под фото */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/90 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Кейс #{currentReport.id.substring(5, 11)}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-400 tabular-nums">{currentReport.timestamp.substring(0, 16).replace('T', ' ')}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 hover:border-slate-700 hover:text-white transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Экспорт Markdown
            </button>
          </div>
        </div>
      </div>

      {/* Правая колонка: Аналитические выводы и поиск страниц */}
      <div className="flex w-full lg:w-[480px] xl:w-[540px] flex-col overflow-y-auto border-l border-slate-800 bg-slate-950">
        {/* Карточка ключевой гео-гипотезы */}
        <div className="border-b border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400">
                Итоговая гео-гипотеза
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight mt-0.5">
                {currentReport.country}
                {currentReport.region ? `, ${currentReport.region}` : ''}
              </h1>
              {currentReport.cityOrDistrict && currentReport.cityOrDistrict !== 'Не определен' && (
                <span className="text-xs text-slate-400">{currentReport.cityOrDistrict}</span>
              )}
            </div>

            <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${confBg}`}>
              {currentReport.confidence} достоверность
            </span>
          </div>

          {/* Координаты */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 mb-3">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-mono font-medium text-slate-200 tabular-nums">
                {currentReport.estimatedCoordinates}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCopy(currentReport.estimatedCoordinates, 'coords')}
                title="Скопировать координаты"
                className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                {copiedKey === 'coords' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${cleanCoords}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Открыть в Google Maps"
                className="flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Резюме */}
          <div className="rounded-lg border border-slate-800/80 bg-slate-900/40 p-3">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
              Краткий аналитический вывод:
            </span>
            <p className="text-xs text-slate-200 leading-relaxed font-sans">
              {currentReport.executiveSummary}
            </p>
          </div>
        </div>

        {/* Переключатель вкладок */}
        <div className="flex border-b border-slate-800 bg-slate-900/90 px-4">
          <button
            onClick={() => setActiveTab('cues')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'cues'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Визуальные улики
          </button>

          <button
            onClick={() => setActiveTab('reverse')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'reverse'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            Поиск страниц с фото
          </button>

          <button
            onClick={() => setActiveTab('dorks')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'dorks'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="h-3.5 w-3.5" />
            OSINT Дорки
          </button>

          <button
            onClick={() => setActiveTab('exif')}
            className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'exif'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            EXIF & GPS
          </button>
        </div>

        {/* Контент активной вкладки */}
        <div className="flex-1 p-5 space-y-4">
          {/* 1. Вкладка визуальных улик */}
          {activeTab === 'cues' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  🏛 Архитектура & Строительные материалы
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentReport.visualCues.architecture || 'Специфические архитектурные особенности не выделены.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  🌲 Флора, Ландшафт & Климатическая зона
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentReport.visualCues.landscapeVegetation || 'Особенности растительности не дают точной привязки.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  🛣 Инфраструктура, Дороги & Столбы ЛЭП
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentReport.visualCues.infrastructureTransit || 'Дорожные маркеры не распознаны.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  🪧 Вывески, Текст, Шрифты & Номера
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentReport.visualCues.signageLanguage || 'Текст на снимке не обнаружен.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <Sun className="h-3.5 w-3.5" />
                  Солнце, Азимут & Направление теней
                </span>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentReport.visualCues.celestialSunShadows || 'Тени не позволяют точно рассчитать азимут.'}
                </p>
              </div>

              {currentReport.keyArtifacts.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-xs font-semibold text-slate-200 block mb-2">
                    Уникальные зацепки и артефакты:
                  </span>
                  <ul className="space-y-1">
                    {currentReport.keyArtifacts.map((art, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span>{art}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* 2. Вкладка поиска страниц с фото */}
          {activeTab === 'reverse' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <h3 className="text-sm font-semibold text-white mb-2">
                  Поисковые системы по изображениям
                </h3>
                <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                  Загрузите анализируемое фото в специализированные поисковики, чтобы найти страницы новостей, блоги и социальные сети, где это фото публиковалось ранее:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <a
                    href="https://lens.google.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <span className="font-semibold block text-emerald-400">Google Lens</span>
                      <span className="text-[10px] text-slate-500">Мировой охват & достопримечательности</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </a>

                  <a
                    href="https://yandex.ru/images/search?rpt=imageview"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <span className="font-semibold block text-emerald-400">Яндекс Картинки</span>
                      <span className="text-[10px] text-slate-500">Точные дубликаты & поиск по СНГ</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </a>

                  <a
                    href="https://www.bing.com/visualsearch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <span className="font-semibold block text-slate-200">Bing Visual Search</span>
                      <span className="text-[10px] text-slate-500">Западные порталы & товары</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </a>

                  <a
                    href="https://tineye.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <span className="font-semibold block text-slate-200">TinEye</span>
                      <span className="text-[10px] text-slate-500">Хронологический первоисточник</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </a>

                  <a
                    href="https://pimeyes.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <span className="font-semibold block text-slate-200">PimEyes</span>
                      <span className="text-[10px] text-slate-500">Поиск совпадений по лицам</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </a>

                  <a
                    href="https://graph.baidu.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs font-medium text-slate-200 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors"
                  >
                    <div>
                      <span className="font-semibold block text-slate-200">Baidu Image</span>
                      <span className="text-[10px] text-slate-500">Азиатские сегменты интернета</span>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500" />
                  </a>
                </div>
              </div>

              {/* Следующие шаги OSINT */}
              {currentReport.recommendedSteps.length > 0 && (
                <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <span className="text-xs font-semibold text-slate-200 block mb-2">
                    Рекомендуемый протокол верификации:
                  </span>
                  <div className="space-y-2">
                    {currentReport.recommendedSteps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-800 text-[10px] font-bold text-emerald-400">
                          {idx + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. Вкладка OSINT Дорков */}
          {activeTab === 'dorks' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Специальные операторы поиска Google для нахождения страниц, форумов и фотобанков с ключевыми визуальными объектами:
              </p>

              {currentReport.dorks.map((dork, idx) => (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-slate-200">{dork.title}</span>
                    <a
                      href={dork.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 hover:text-emerald-300"
                    >
                      Искать
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950 px-3 py-2">
                    <code className="text-xs font-mono text-slate-300 truncate max-w-[340px]">
                      {dork.query}
                    </code>
                    <button
                      onClick={() => handleCopy(dork.query, `dork-${idx}`)}
                      title="Скопировать запрос"
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedKey === `dork-${idx}` ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4. Вкладка EXIF & GPS */}
          {activeTab === 'exif' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-200">Аппаратные метаданные</span>
                  {currentReport.exif.hasGps ? (
                    <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                      GPS Зафиксирован
                    </span>
                  ) : (
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] font-medium text-slate-400">
                      GPS отсутствует
                    </span>
                  )}
                </div>

                <div className="space-y-2 text-xs divide-y divide-slate-800/60">
                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Модель камеры:</span>
                    <span className="text-slate-200 font-medium">
                      {currentReport.exif.cameraMake || currentReport.exif.cameraModel
                        ? `${currentReport.exif.cameraMake || ''} ${currentReport.exif.cameraModel || ''}`.trim()
                        : 'Не обнаружена'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Дата и время съемки:</span>
                    <span className="text-slate-200 font-mono tabular-nums">
                      {currentReport.exif.dateTimeOriginal || 'Не указаны'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">GPS Координаты:</span>
                    <span className="text-slate-200 font-mono tabular-nums">
                      {currentReport.exif.hasGps
                        ? `${currentReport.exif.latitude?.toFixed(6)}, ${currentReport.exif.longitude?.toFixed(6)}`
                        : 'Отсутствуют'}
                    </span>
                  </div>

                  <div className="flex justify-between py-1.5">
                    <span className="text-slate-400">Разрешение:</span>
                    <span className="text-slate-200 font-mono tabular-nums">
                      {currentReport.exif.width && currentReport.exif.height
                        ? `${currentReport.exif.width} × ${currentReport.exif.height} px`
                        : 'Определяется размером файла'}
                    </span>
                  </div>
                </div>

                {currentReport.exif.warning && (
                  <p className="mt-3 text-[11px] text-amber-400/80 leading-normal">
                    ⚠️ {currentReport.exif.warning}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
