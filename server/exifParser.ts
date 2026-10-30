import exifr from 'exifr';

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
  rawTags?: Record<string, any>;
  warning?: string;
}

export async function parseImageExif(base64OrBuffer: string | Buffer): Promise<ExifReport> {
  try {
    let buffer: Buffer;
    if (typeof base64OrBuffer === 'string') {
      const cleanBase64 = base64OrBuffer.replace(/^data:image\/\w+;base64,/, '');
      buffer = Buffer.from(cleanBase64, 'base64');
    } else {
      buffer = base64OrBuffer;
    }

    // Parse all metadata blocks: tiff, exif, gps, iptc, xmp
    const raw = await exifr.parse(buffer, {
      tiff: true,
      xmp: true,
      icc: false,
      iptc: true,
      jfif: true,
      ihdr: true,
      mergeOutput: true,
    });

    if (!raw) {
      return {
        hasExif: false,
        hasGps: false,
        warning: 'Метаданные EXIF отсутствуют (возможно, удалены мессенджером или редактором).',
      };
    }

    const hasGps = typeof raw.latitude === 'number' && typeof raw.longitude === 'number';
    let formattedCoords: string | undefined;
    let mapsUrl: string | undefined;
    let osmUrl: string | undefined;

    if (hasGps) {
      const lat = Number(raw.latitude.toFixed(6));
      const lon = Number(raw.longitude.toFixed(6));
      formattedCoords = `${lat >= 0 ? '+' : ''}${lat}, ${lon >= 0 ? '+' : ''}${lon}`;
      mapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
      osmUrl = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    }

    // Filter serializable raw tags
    const sanitizedRaw: Record<string, any> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        sanitizedRaw[key] = val;
      } else if (val instanceof Date) {
        sanitizedRaw[key] = val.toISOString();
      }
    }

    return {
      hasExif: true,
      hasGps,
      latitude: hasGps ? raw.latitude : undefined,
      longitude: hasGps ? raw.longitude : undefined,
      altitude: raw.GPSAltitude ? Number(raw.GPSAltitude) : undefined,
      formattedCoordinates: formattedCoords,
      mapsUrl,
      openStreetMapUrl: osmUrl,
      dateTimeOriginal: raw.DateTimeOriginal ? new Date(raw.DateTimeOriginal).toISOString() : raw.CreateDate ? new Date(raw.CreateDate).toISOString() : undefined,
      cameraMake: raw.Make,
      cameraModel: raw.Model,
      lensModel: raw.LensModel,
      software: raw.Software,
      iso: raw.ISO,
      focalLength: raw.FocalLength,
      fNumber: raw.FNumber,
      exposureTime: raw.ExposureTime ? `1/${Math.round(1 / raw.ExposureTime)}s` : undefined,
      width: raw.ExifImageWidth || raw.ImageWidth,
      height: raw.ExifImageHeight || raw.ImageHeight,
      rawTags: sanitizedRaw,
    };
  } catch (err: any) {
    return {
      hasExif: false,
      hasGps: false,
      warning: `Ошибка при извлечении метаданных: ${err?.message || 'Неизвестная ошибка'}`,
    };
  }
}
