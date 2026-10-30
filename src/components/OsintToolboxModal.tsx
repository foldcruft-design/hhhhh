import React from 'react';
import {
  Compass,
  Sun,
  Map,
  Eye,
  Mountain,
  Satellite,
  Plane,
  ExternalLink,
  Search,
  BookOpen
} from 'lucide-react';

const OSINT_TOOLS_CATALOG = [
  {
    category: 'Расчет солнца и теней (Sun & Shadow Analysis)',
    icon: Sun,
    tools: [
      {
        name: 'SunCalc',
        desc: 'Интерактивная карта положения солнца, солнечных фаз и длины теней в любой точке планеты в заданную минуту.',
        url: 'https://www.suncalc.org/',
      },
      {
        name: 'ShadowCalculator',
        desc: 'Калькулятор высоты зданий и ориентации теней по спутниковым снимкам.',
        url: 'http://shadowcalculator.eu/',
      },
      {
        name: 'DualMaps',
        desc: 'Одновременный синхронный просмотр Google Maps, Google Street View и аэрофотоснимков.',
        url: 'https://www.dualmaps.com/',
      },
    ],
  },
  {
    category: 'Геоданные и фильтрация OpenStreetMap',
    icon: Map,
    tools: [
      {
        name: 'Overpass Turbo',
        desc: 'Веб-майнинг данных OpenStreetMap по любым тегам (опоры ЛЭП, типы покрытия дорог, пожарные гидранты, церкви).',
        url: 'https://overpass-turbo.eu/',
      },
      {
        name: 'OpenStreetMap Nominatim',
        desc: 'Прямой и обратный геокодинг адресов и полигонов со всего мира.',
        url: 'https://nominatim.openstreetmap.org/',
      },
      {
        name: 'Mapillary',
        desc: 'Крупнейший краудсорсинговый фотокаталог уличных панорам с фильтром по дате и маркерам.',
        url: 'https://www.mapillary.com/',
      },
    ],
  },
  {
    category: 'Силуэты рельефа и гор',
    icon: Mountain,
    tools: [
      {
        name: 'PeakFinder',
        desc: 'Генерация 360° контуров горизонта и горных вершин для сопоставления с фотографиями горной местности.',
        url: 'https://www.peakfinder.org/',
      },
      {
        name: 'HeyWhatsThat',
        desc: 'Расчет зоны видимости и панорамных горизонтов с любой точки земли.',
        url: 'https://www.heywhatsthat.com/',
      },
    ],
  },
  {
    category: 'Спутниковые снимки высокого разрешения',
    icon: Satellite,
    tools: [
      {
        name: 'Sentinel Hub EO Browser',
        desc: 'Свежие спутниковые снимки Sentinel-2 и Landsat с мультиспектральными индексами (NDVI, влажность, пожары).',
        url: 'https://apps.sentinel-hub.com/eo-browser/',
      },
      {
        name: 'NASA FIRMS',
        desc: 'Тепловые аномалии и очаги пожаров в реальном времени со спутников MODIS и VIIRS.',
        url: 'https://firms.modaps.eosdis.nasa.gov/',
      },
      {
        name: 'Google Earth Web',
        desc: '3D-модели рельефа и исторические спутниковые снимки местности.',
        url: 'https://earth.google.com/web/',
      },
    ],
  },
  {
    category: 'Транспорт и трекинг (ADS-B & AIS)',
    icon: Plane,
    tools: [
      {
        name: 'Flightradar24',
        desc: 'Отслеживание гражданских и специальных воздушных судов в реальном времени.',
        url: 'https://www.flightradar24.com/',
      },
      {
        name: 'MarineTraffic',
        desc: 'Глобальный мониторинг местоположения морских и речных судов через приемники AIS.',
        url: 'https://www.marinetraffic.com/',
      },
    ],
  },
];

export const OsintToolboxModal: React.FC = () => {
  return (
    <div className="h-[calc(100vh-65px)] overflow-y-auto bg-slate-950 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Compass className="h-5 w-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Каталог верификационных инструментов GEOINT & OSINT
            </h1>
          </div>
          <p className="text-xs text-slate-400">
            Официальные и открытые сервисы для перекрестной проверки визуальных улик, угла теней, дорожной разметки и спутниковых снимков
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {OSINT_TOOLS_CATALOG.map((section, sIdx) => {
            const Icon = section.icon;
            return (
              <div
                key={sIdx}
                className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3"
              >
                <div className="flex items-center gap-2 text-emerald-400">
                  <Icon className="h-4 w-4" />
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-200">
                    {section.category}
                  </h2>
                </div>

                <div className="space-y-2">
                  {section.tools.map((tool, tIdx) => (
                    <a
                      key={tIdx}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col rounded-lg border border-slate-800/80 bg-slate-950 p-3 hover:border-emerald-500/50 hover:bg-slate-900 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors">
                          {tool.name}
                        </span>
                        <ExternalLink className="h-3.5 w-3.5 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        {tool.desc}
                      </p>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
