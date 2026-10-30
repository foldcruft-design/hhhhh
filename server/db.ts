import { GeointReport } from './geointAnalyzer.js';

export interface WebUser {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'analyst';
  isBanned: boolean;
  requestsCount: number;
  lastActive: string;
}

export interface BotSettings {
  botToken: string;
  geminiModel: string;
  adminIds: string;
  pollingEnabled: boolean;
  webhookUrl: string;
  autoExifCheck: boolean;
  status: 'online' | 'standby' | 'error';
  lastPing: string;
}

class MemoryStore {
  private cases: GeointReport[] = [];
  private users: WebUser[] = [
    {
      id: '123456789',
      name: 'Senior Analyst',
      username: 'osint_lead',
      role: 'admin',
      isBanned: false,
      requestsCount: 28,
      lastActive: new Date().toISOString(),
    },
    {
      id: '987654321',
      name: 'Field Investigator',
      username: 'geo_scout',
      role: 'analyst',
      isBanned: false,
      requestsCount: 14,
      lastActive: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: '554433221',
      name: 'Guest Probe',
      username: 'unknown_agent',
      role: 'analyst',
      isBanned: true,
      requestsCount: 3,
      lastActive: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  private settings: BotSettings = {
    botToken: process.env.BOT_TOKEN || '',
    geminiModel: 'gemini-3.8-flash',
    adminIds: '123456789',
    pollingEnabled: false,
    webhookUrl: '',
    autoExifCheck: true,
    status: 'standby',
    lastPing: new Date().toISOString(),
  };

  constructor() {
    this.seedInitialCase();
  }

  private seedInitialCase() {
    this.cases.push({
      id: 'case-demo-berlin',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      country: 'Германия',
      region: 'Берлин',
      cityOrDistrict: 'Митте / Унтер-ден-Линден',
      estimatedCoordinates: '52.5163, 13.3777',
      confidence: 'Высокая',
      confidenceReason: 'Характерная брусчатка, типичные берлинские фонари Schupmann, табличка со шрифтом DIN 1451 Mittelschrift.',
      executiveSummary: 'Локация уверенно локализована в центральном районе Берлина. Архитектурный стиль неоклассицизма и специфическая конструкция подвесных уличных светильников однозначно указывают на Германию.',
      visualCues: {
        architecture: 'Здания песчаника середины XIX века, симметричные оконные проемы, гранитный цоколь.',
        landscapeVegetation: 'Липовые аллеи (Tilia cordata), характерная для Центральной Европы крона, приствольные решетки.',
        infrastructureTransit: 'Стандартная разметка ФРГ, белые гранитные бордюры, брусчатое мощение в пешеходной зоне.',
        signageLanguage: 'Немецкий язык, характерная типографика уличных указателей с синим фоном и белым гротеском.',
        celestialSunShadows: 'Тени падают на север-северо-восток под углом ~45°, что соответствует полудню в весенне-летний период на широте 52°N.',
      },
      keyArtifacts: ['Фонарный столб берлинского типа', 'Липовая аллея', 'Брусчатка характерной кладки'],
      searchKeywords: ['Unter den Linden', 'Berlin Mitte', 'historic lantern'],
      recommendedSteps: [
        'Сверить панорамы в Google Street View вдоль Unter den Linden.',
        'Проверить угол солнечных теней на SunCalc на 52.5163°N в 13:00 CEST.',
      ],
      exif: {
        hasExif: true,
        hasGps: false,
        cameraMake: 'Sony',
        cameraModel: 'ILCE-7RM4',
        dateTimeOriginal: '2026-05-18T12:45:00.000Z',
      },
      reverseSearchLinks: {
        googleLens: 'https://lens.google.com/',
        yandex: 'https://yandex.ru/images/search?rpt=imageview',
        bing: 'https://www.bing.com/visualsearch',
        tineye: 'https://tineye.com/',
        pimeyes: 'https://pimeyes.com/',
      },
      dorks: [
        {
          title: 'Поиск упоминаний в статьях',
          query: '"Berlin Mitte" "Unter den Linden" historic lantern',
          url: 'https://www.google.com/search?q=%22Berlin+Mitte%22+%22Unter+den+Linden%22',
        },
      ],
    });
  }

  public getCases(): GeointReport[] {
    return this.cases;
  }

  public addCase(report: GeointReport) {
    this.cases.unshift(report);
    if (this.cases.length > 50) {
      this.cases.pop();
    }
  }

  public getCaseById(id: string): GeointReport | undefined {
    return this.cases.find((c) => c.id === id);
  }

  public deleteCase(id: string): boolean {
    const idx = this.cases.findIndex((c) => c.id === id);
    if (idx !== -1) {
      this.cases.splice(idx, 1);
      return true;
    }
    return false;
  }

  public getUsers(): WebUser[] {
    return this.users;
  }

  public toggleBan(userId: string): WebUser | null {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.isBanned = !user.isBanned;
      return user;
    }
    return null;
  }

  public toggleRole(userId: string): WebUser | null {
    const user = this.users.find((u) => u.id === userId);
    if (user) {
      user.role = user.role === 'admin' ? 'analyst' : 'admin';
      return user;
    }
    return null;
  }

  public getSettings(): BotSettings {
    return this.settings;
  }

  public updateSettings(partial: Partial<BotSettings>): BotSettings {
    this.settings = { ...this.settings, ...partial, lastPing: new Date().toISOString() };
    return this.settings;
  }
}

export const store = new MemoryStore();
