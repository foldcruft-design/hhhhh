import { ai, GEOINT_MODEL } from './gemini.js';
import { parseImageExif, ExifReport } from './exifParser.js';

export interface VisualCues {
  architecture: string;
  landscapeVegetation: string;
  infrastructureTransit: string;
  signageLanguage: string;
  celestialSunShadows: string;
}

export interface GeointReport {
  id: string;
  timestamp: string;
  country: string;
  region: string;
  cityOrDistrict: string;
  estimatedCoordinates: string;
  confidence: 'Высокая' | 'Средняя' | 'Низкая';
  confidenceReason: string;
  executiveSummary: string;
  visualCues: VisualCues;
  keyArtifacts: string[];
  searchKeywords: string[];
  recommendedSteps: string[];
  exif: ExifReport;
  reverseSearchLinks: {
    googleLens: string;
    yandex: string;
    bing: string;
    tineye: string;
    pimeyes: string;
  };
  dorks: Array<{ title: string; query: string; url: string }>;
  imageBase64?: string;
}

const GEOINT_SYSTEM_PROMPT = `
Ты — старший аналитик по визуальной геолокации (GEOINT) и OSINT.
Твоя цель: провести тщательное расследование предоставленного изображения и определить наиболее вероятную геолокацию.

Проанализируй следующие критические аспекты:
1. Архитектурные паттерны: тип кирпичной кладки, кровля, форма оконных рам, балконы, водосточные трубы, кондиционеры.
2. Биом и флора: породы деревьев, тип травяного покрова, цвет и текстура почвы, климатические индикаторы.
3. Дорожная и коммуникационная инфраструктура: столбы электропередач (деревянные, железобетонные с отверстиями, решетчатые опоры), изоляторы, дорожные знаки, бордюрная окраска, сторона движения (левосторонняя/правосторонняя), цвет фонарей.
4. Лингвистические и графические подсказки: язык вывесок, доменные зоны (.de, .fr, .ru, .pl, .jp), телефонные префиксы, формат регистрационных знаков авто.
5. Астрономические и метеорологические маркеры: направление и длина теней, угол солнца, примерный азимут и время суток.

Ответь СТРОГО в формате валидного JSON со следующей структурой:
{
  "country": "Наиболее вероятная страна",
  "region": "Регион / Область / Провинция",
  "cityOrDistrict": "Город или район (если определимо, иначе 'Не определен точно')",
  "estimatedCoordinates": "Широта, Долгота (например '52.5200, 13.4050')",
  "confidence": "Высокая" | "Средняя" | "Низкая",
  "confidenceReason": "Краткое обоснование оценки достоверности",
  "executiveSummary": "Краткий вывод расследования (2-3 емких аналитических предложения)",
  "visualCues": {
    "architecture": "Выводы по строениям и материалам",
    "landscapeVegetation": "Выводы по флоре, рельефу и климату",
    "infrastructureTransit": "Выводы по дорогам, столбам, разметке и знакам",
    "signageLanguage": "Язык, текст, вывески и шрифты",
    "celestialSunShadows": "Анализ солнца, азимута и теней"
  },
  "keyArtifacts": ["Артефакт 1", "Артефакт 2"],
  "searchKeywords": ["Ключевое слово 1 для поиска", "Ключевое слово 2"],
  "recommendedSteps": ["Шаг 1 для верификации", "Шаг 2"]
}
`;

export async function performGeointAnalysis(imageBase64: string, promptText?: string): Promise<GeointReport> {
  const id = `case-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const timestamp = new Date().toISOString();

  // 1. Извлечение EXIF и GPS
  const exifReport = await parseImageExif(imageBase64);

  // 2. Подготовка вызова Gemini 3.8 Flash
  let geointAiData: any = {};
  try {
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const mimeMatch = imageBase64.match(/^data:(image\/\w+);base64,/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';

    const userPrompt = promptText
      ? `Проведи детальное GEOINT расследование фото. Дополнительный контекст: ${promptText}`
      : 'Проведи полное визуальное GEOINT расследование изображения. Найди страну, регион, вероятные координаты и сформируй краткие выводы.';

    const response = await ai.models.generateContent({
      model: GEOINT_MODEL,
      contents: [
        {
          inlineData: {
            mimeType,
            data: cleanBase64,
          },
        },
        { text: userPrompt },
      ],
      config: {
        systemInstruction: GEOINT_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const rawText = (response.text || '{}').trim();
    try {
      geointAiData = JSON.parse(rawText);
    } catch {
      let clean = rawText;
      if (clean.includes('```json')) {
        clean = clean.split('```json')[1].split('```')[0].trim();
      } else if (clean.includes('```')) {
        clean = clean.split('```')[1].split('```')[0].trim();
      }
      geointAiData = JSON.parse(clean);
    }
  } catch (err: any) {
    console.error('Gemini Analysis Error:', err?.message);
    geointAiData = {
      country: exifReport.hasGps ? 'Определено по GPS' : 'Требуется ручная верификация',
      region: '',
      cityOrDistrict: '',
      estimatedCoordinates: exifReport.hasGps ? `${exifReport.latitude}, ${exifReport.longitude}` : '0.0000, 0.0000',
      confidence: exifReport.hasGps ? 'Высокая' : 'Низкая',
      confidenceReason: exifReport.hasGps ? 'Точные координаты извлечены из EXIF.' : `Ошибка AI анализа: ${err?.message}`,
      executiveSummary: exifReport.hasGps
        ? 'Местоположение точно подтверждено аппаратным GPS датчиком из файла.'
        : 'Визуальный анализ не завершен. Рекомендуется использовать поиск по обратным изображениям.',
      visualCues: {
        architecture: 'Маркеры не распознаны',
        landscapeVegetation: 'Маркеры не распознаны',
        infrastructureTransit: 'Маркеры не распознаны',
        signageLanguage: 'Маркеры не распознаны',
        celestialSunShadows: 'Маркеры не распознаны',
      },
      keyArtifacts: [],
      searchKeywords: ['geoint', 'reverse search'],
      recommendedSteps: ['Проверьте фото в Google Lens и Yandex Images'],
    };
  }

  // Если в EXIF есть GPS, переопределяем координаты
  let finalCoords = geointAiData.estimatedCoordinates || '0.0000, 0.0000';
  let finalConfidence = geointAiData.confidence || 'Средняя';
  let finalConfidenceReason = geointAiData.confidenceReason || '';

  if (exifReport.hasGps) {
    finalCoords = `${exifReport.latitude?.toFixed(6)}, ${exifReport.longitude?.toFixed(6)}`;
    finalConfidence = 'Высокая';
    finalConfidenceReason = 'Точные аппаратные GPS координаты извлечены из EXIF заголовка камеры.';
  }

  // Генерация ссылок обратного поиска
  const reverseSearchLinks = {
    googleLens: 'https://lens.google.com/',
    yandex: 'https://yandex.ru/images/search?rpt=imageview',
    bing: 'https://www.bing.com/visualsearch',
    tineye: 'https://tineye.com/',
    pimeyes: 'https://pimeyes.com/',
  };

  // Поисковые дорки
  const keywords = geointAiData.searchKeywords || [];
  const kwStr = keywords.slice(0, 3).map((k: string) => `"${k}"`).join(' ');
  const countryHint = geointAiData.country || '';
  const baseDork = `${kwStr} ${countryHint}`.trim() || 'geoint location';

  const dorks = [
    {
      title: 'Поиск упоминаний в статьях и блогах',
      query: baseDork,
      url: `https://www.google.com/search?q=${encodeURIComponent(baseDork)}`,
    },
    {
      title: 'Поиск в социальных сетях с геотегами',
      query: `${baseDork} (site:instagram.com OR site:vk.com OR site:facebook.com)`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${baseDork} (site:instagram.com OR site:vk.com OR site:facebook.com)`)}`,
    },
    {
      title: 'Фотоархивы и уличные панорамы',
      query: `${baseDork} (site:mapillary.com OR site:commons.wikimedia.org OR site:flickr.com)`,
      url: `https://www.google.com/search?q=${encodeURIComponent(`${baseDork} (site:mapillary.com OR site:commons.wikimedia.org OR site:flickr.com)`)}`,
    },
  ];

  return {
    id,
    timestamp,
    country: geointAiData.country || 'Не определена',
    region: geointAiData.region || '',
    cityOrDistrict: geointAiData.cityOrDistrict || 'Не определен',
    estimatedCoordinates: finalCoords,
    confidence: finalConfidence,
    confidenceReason: finalConfidenceReason,
    executiveSummary: geointAiData.executiveSummary || 'Анализ завершен.',
    visualCues: geointAiData.visualCues || {
      architecture: '',
      landscapeVegetation: '',
      infrastructureTransit: '',
      signageLanguage: '',
      celestialSunShadows: '',
    },
    keyArtifacts: geointAiData.keyArtifacts || [],
    searchKeywords: keywords,
    recommendedSteps: geointAiData.recommendedSteps || [],
    exif: exifReport,
    reverseSearchLinks,
    dorks,
    imageBase64,
  };
}
