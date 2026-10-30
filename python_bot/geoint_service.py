"""
Единый сервис анализа GEOINT:
- Gemini 3.8 Flash (нейросетевой визуальный анализ маркеров, теней, языка и архитектуры)
- Извлечение аппаратных GPS координат и метаданных из EXIF (Pillow)
- Генератор прямых ссылок обратного поиска (Google Lens, Yandex, Bing, TinEye)
- Генератор специализированных Google OSINT Dorks
"""

import json
import logging
import urllib.parse
from io import BytesIO
from typing import Dict, Any, List, Optional
from PIL import Image, ExifTags
from config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """
Ты — старший эксперт по GEOINT (геопространственной разведке) и визуальному OSINT анализу.
Твоя задача — провести детальный анализ присланного изображения и определить наиболее вероятное географическое положение.

Обращай особое внимание на:
1. Архитектуру и материалы (типы крыш, кладка кирпича, окна, балконы, стиль застройки).
2. Ландшафт и флору (типы деревьев, цвет почвы, рельеф, климатическая зона).
3. Инфраструктуру и транспорт (форма столбов ЛЭП, типы изоляторов, разметка дорог, сторона движения, стиль дорожных знаков, цвет фонарей, форма номерных знаков).
4. Текст и язык (алфавит, язык надписей, доменные зоны .de/.fr/.ru/.pl, коды городов на вывесках).
5. Солнечный свет и тени (направление теней, примерная ориентация сторон света, примерное время суток и сезон).

Ответь СТРОГО в формате валидного JSON со следующими полями:
{
  "country": "Наиболее вероятная страна",
  "region": "Область / Штат / Провинция",
  "city_or_district": "Город или район (если определимо, иначе 'Не определен точно')",
  "estimated_coordinates": "Широта, Долгота (например, 52.5200, 13.4050)",
  "confidence": "Высокая" | "Средняя" | "Низкая",
  "confidence_reason": "Краткое обоснование степени уверенности",
  "executive_summary": "Краткий вывод расследования (2-3 емких предложения)",
  "visual_cues": {
    "architecture": "Выводы по зданиям и материалам",
    "landscape_vegetation": "Выводы по природе, деревьям, почве и климату",
    "infrastructure_transit": "Выводы по дорогам, столбам, разметке и транспорту",
    "signage_language": "Язык, вывески, номера и шрифты",
    "celestial_sun_shadows": "Анализ солнца, теней и азимута"
  },
  "key_artifacts": ["Уникальный артефакт 1", "Уникальный артефакт 2"],
  "search_keywords": ["Ключевое слово 1 для поиска", "Ключевое слово 2"],
  "recommended_steps": [
    "Шаг 1 для верификации (например: проверить в Overpass Turbo теги)",
    "Шаг 2 (например: проверить в SunCalc положение солнца)"
  ]
}
"""


def _convert_to_degrees(value) -> float:
    """Конвертация GPS рациональных чисел (D, M, S) в десятичные градусы."""
    try:
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        return d + (m / 60.0) + (s / 3600.0)
    except Exception:
        return 0.0


def extract_exif(image_bytes: bytes) -> Dict[str, Any]:
    """Извлекает доступные EXIF данные и GPS координаты."""
    result: Dict[str, Any] = {
        "has_exif": False,
        "has_gps": False,
        "latitude": None,
        "longitude": None,
        "coordinates_str": None,
        "maps_url": None,
        "camera_make": None,
        "camera_model": None,
        "datetime_original": None,
    }

    try:
        img = Image.open(BytesIO(image_bytes))
        exif_raw = img._getexif()

        if not exif_raw:
            return result

        result["has_exif"] = True
        labeled_exif: Dict[str, Any] = {}

        for tag_id, value in exif_raw.items():
            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
            labeled_exif[tag_name] = value

        result["camera_make"] = str(labeled_exif.get("Make", "")).strip() or None
        result["camera_model"] = str(labeled_exif.get("Model", "")).strip() or None
        result["datetime_original"] = str(labeled_exif.get("DateTimeOriginal", "")).strip() or None

        gps_info = labeled_exif.get("GPSInfo")
        if gps_info:
            gps_tags = {}
            for key, val in gps_info.items():
                name = ExifTags.GPSTAGS.get(key, str(key))
                gps_tags[name] = val

            gps_lat = gps_tags.get("GPSLatitude")
            gps_lat_ref = gps_tags.get("GPSLatitudeRef")
            gps_lon = gps_tags.get("GPSLongitude")
            gps_lon_ref = gps_tags.get("GPSLongitudeRef")

            if gps_lat and gps_lat_ref and gps_lon and gps_lon_ref:
                lat = _convert_to_degrees(gps_lat)
                if gps_lat_ref != "N":
                    lat = -lat

                lon = _convert_to_degrees(gps_lon)
                if gps_lon_ref != "E":
                    lon = -lon

                lat = round(lat, 6)
                lon = round(lon, 6)

                result["has_gps"] = True
                result["latitude"] = lat
                result["longitude"] = lon
                result["coordinates_str"] = f"{lat:+.6f}, {lon:+.6f}"
                result["maps_url"] = f"https://www.google.com/maps/search/?api=1&query={lat},{lon}"

    except Exception as e:
        result["error"] = str(e)

    return result


async def analyze_geoint_image(image_bytes: bytes, mime_type: str = "image/jpeg", user_prompt: Optional[str] = None) -> Dict[str, Any]:
    """Выполняет вызов Gemini 3.8 Flash для анализа GEOINT."""
    if not settings.gemini_api_key:
        return _mock_geoint_response("API ключ Gemini не задан в .env файле.")

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(
            api_key=settings.gemini_api_key,
            http_options={'headers': {'User-Agent': 'aistudio-build'}}
        )

        user_text = "Проведи полное GEOINT расследование этого изображения. Определи страну, регион, вероятные координаты, найди зацепки и сделай краткий вывод."
        if user_prompt:
            user_text += f"\nДополнительный контекст от аналитика: {user_prompt}"

        response = client.models.generate_content(
            model=settings.gemini_model,
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                user_text,
            ],
            config=types.GenerateContentConfig(
                system_instruction=SYSTEM_PROMPT,
                response_mime_type="application/json",
            )
        )

        response_text = response.text or "{}"
        try:
            return json.loads(response_text)
        except json.JSONDecodeError:
            clean = response_text.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            return json.loads(clean)

    except Exception as e:
        logger.error(f"Ошибка вызова Gemini API: {e}")
        return _mock_geoint_response(f"Ошибка модели: {str(e)}")


def _mock_geoint_response(error_or_note: str) -> Dict[str, Any]:
    return {
        "country": "Определение невозможно",
        "region": "Требуется проверка",
        "city_or_district": "Не определен",
        "estimated_coordinates": "0.0000, 0.0000",
        "confidence": "Низкая",
        "confidence_reason": error_or_note,
        "executive_summary": f"Анализ завершен с предупреждением: {error_or_note}",
        "visual_cues": {
            "architecture": "Информация недоступна",
            "landscape_vegetation": "Информация недоступна",
            "infrastructure_transit": "Информация недоступна",
            "signage_language": "Информация недоступна",
            "celestial_sun_shadows": "Информация недоступна",
        },
        "key_artifacts": ["Проверьте доступность Gemini API Key"],
        "search_keywords": ["reverse image search"],
        "recommended_steps": [
            "Используйте поиск по фото в Google Lens и Яндекс",
            "Проверьте метаданные EXIF в оригинале файла",
        ],
    }


def build_reverse_search_links(image_url: Optional[str] = None) -> Dict[str, str]:
    """Генерирует ссылки на сервисы обратного поиска."""
    if image_url:
        encoded_url = urllib.parse.quote_plus(image_url)
        return {
            "google_lens": f"https://lens.google.com/uploadbyurl?url={encoded_url}",
            "yandex": f"https://yandex.ru/images/search?rpt=imageview&url={encoded_url}",
            "bing": f"https://www.bing.com/images/search?view=detailv2&iss=sbi&form=SBIVSP&sbisrc=UrlPaste&q=imgurl:{encoded_url}",
            "tineye": f"https://tineye.com/search?url={encoded_url}",
        }
    return {
        "google_lens": "https://lens.google.com/",
        "yandex": "https://yandex.ru/images/search?rpt=imageview",
        "bing": "https://www.bing.com/visualsearch",
        "tineye": "https://tineye.com/",
        "pimeyes": "https://pimeyes.com/",
    }


def generate_osint_dorks(keywords: List[str], country_hint: Optional[str] = None) -> List[Dict[str, str]]:
    """Генерирует целевые Google Dorks для поиска страниц и фотобанков."""
    dorks = []
    clean_kw = [k.strip() for k in keywords if k and k.strip()]
    if not clean_kw:
        clean_kw = ["geoint", "landmark"]

    main_query = " ".join([f'"{k}"' for k in clean_kw[:3]])
    if country_hint:
        main_query += f" {country_hint}"

    dorks.append({
        "title": "Поиск страниц и блогов",
        "query": main_query,
        "url": f"https://www.google.com/search?q={urllib.parse.quote_plus(main_query)}",
    })

    social_query = f'{main_query} (site:instagram.com OR site:vk.com OR site:facebook.com)'
    dorks.append({
        "title": "Поиск в социальных сетях",
        "query": social_query,
        "url": f"https://www.google.com/search?q={urllib.parse.quote_plus(social_query)}",
    })

    photo_query = f'{main_query} (site:flickr.com OR site:commons.wikimedia.org OR site:mapillary.com)'
    dorks.append({
        "title": "Фотоархивы (Wikimedia, Flickr, Mapillary)",
        "query": photo_query,
        "url": f"https://www.google.com/search?q={urllib.parse.quote_plus(photo_query)}",
    })

    return dorks
