export interface ExifReport {
  hasExif: boolean;
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  altitude?: number;
  formattedCoordinates?: string;
  mapsUrl?: string;
  openStreetMapUrl?: string;
  dateTimeOriginal?: string;
  cameraMake?: string;
  cameraModel?: string;
  lensModel?: string;
  software?: string;
  iso?: number;
  focalLength?: number;
  fNumber?: number;
  exposureTime?: string;
  width?: number;
  height?: number;
  warning?: string;
}

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

export interface WebUser {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'analyst';
  isBanned: boolean;
  requestsCount: number;
  lastActive: string;
}

export interface AdminStats {
  totalUsers: number;
  bannedUsers: number;
  totalInvestigations: number;
  totalRequests: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
  topCountries: Array<{ country: string; count: number }>;
}

export interface BotSettings {
  botToken: string;
  maskedToken?: string;
  geminiModel: string;
  adminIds: string;
  pollingEnabled: boolean;
  webhookUrl: string;
  autoExifCheck: boolean;
  status: 'online' | 'standby' | 'error';
  lastPing: string;
}

export interface PythonFileItem {
  path: string;
  name: string;
  content: string;
  category: string;
}

export interface TelegramButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export interface TelegramMessageItem {
  id: string;
  sender: 'user' | 'bot';
  timestamp: string;
  text?: string;
  image?: string;
  buttons?: TelegramButton[][];
  reportId?: string;
  isStatus?: boolean;
}
