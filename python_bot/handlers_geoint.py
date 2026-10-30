"""
Обработчики GEOINT расследований и общих команд пользователя:
- Прием фото и документов
- Извлечение EXIF и анализ Gemini 3.8 Flash
- Команды /start, /help, /tools, /reverse, /profile
- Интерактивные колбэки раскрытия деталей и дорков
"""

from io import BytesIO
from typing import Dict, Any
from aiogram import Router, F, Bot
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery

from database import Database
from geoint_service import (
    analyze_geoint_image,
    extract_exif,
    build_reverse_search_links,
    generate_osint_dorks,
)
from keyboards import (
    get_main_keyboard,
    get_geoint_result_keyboard,
    get_back_to_report_keyboard,
    get_reverse_search_keyboard,
    get_osint_tools_keyboard,
)

router = Router(name="geoint_router")


# --- Команды навигации и справки ---

@router.message(CommandStart())
async def cmd_start(message: Message, db_user: Dict[str, Any], is_admin: bool):
    """Приветственное сообщение."""
    user_name = message.from_user.first_name or "Аналитик"
    text = (
        f"🛰 **Добро пожаловать в GEOINT & OSINT Ассистент, {user_name}!**\n\n"
        f"Я специализированный бот для визуальной геолокации, анализа фотографий и поиска первоисточников.\n\n"
        f"**Чем я могу помочь:**\n"
        f"• 📍 **Анализ геопозиции:** отправьте фото — я определю зацепки по архитектуре, типу флоры, "
        f"дорожным столбам, разметке, вывескам и углам теней.\n"
        f"• 🔍 **Поиск страниц с фото:** быстрые ссылки на Google Lens, Yandex, Bing, TinEye.\n"
        f"• 📋 **Краткие выводы:** структурированное резюме расследования с оценкой достоверности.\n"
        f"• 📷 **EXIF & GPS:** если файл содержит метаданные, извлеку точные аппаратные координаты.\n\n"
        f"👇 *Просто отправьте фото (как сжатое фото или как файл-документ) прямо в этот чат!*"
    )
    await message.answer(text, reply_markup=get_main_keyboard(is_admin=is_admin), parse_mode="Markdown")


@router.message(Command("help"))
@router.message(F.text == "ℹ️ Помощь & Гайд")
async def cmd_help(message: Message):
    """Руководство по эффективному GEOINT-анализу."""
    text = (
        "🧭 **Руководство по эффективному GEOINT-анализу:**\n\n"
        "1. **Отправка фото:**\n"
        "   • Если у вас оригинал фото с камеры/телефона, отправляйте его **как файл (без сжатия)**, "
        "чтобы сохранить метаданные GPS и EXIF.\n"
        "   • Если фото скачано из соцсетей, отправляйте обычным фото — нейросеть проведет визуальный анализ.\n\n"
        "2. **Ключевые маркеры:**\n"
        "   • Форма столбов электропередач и трансформаторов (уникальны для регионов).\n"
        "   • Сторона движения и цвет дорожной разметки (белая/желтая).\n"
        "   • Формат номерных знаков автомобилей (синяя полоса ЕС, желтые номера и т.д.).\n"
        "   • Язык вывесок, доменные суффиксы (.fr, .cz, .jp, .ru).\n"
        "   • Направление и длина теней (позволяет верифицировать азимут солнца)."
    )
    await message.answer(text, parse_mode="Markdown")


@router.message(Command("tools"))
@router.message(F.text == "🛠 OSINT Инструменты")
async def cmd_tools(message: Message):
    """Каталог инструментов верификации."""
    text = (
        "🛠 **Каталог верификационных инструментов OSINT / GEOINT:**\n\n"
        "• **SunCalc** — расчет положения солнца, азимута и длины теней.\n"
        "• **Overpass Turbo** — поиск объектов OpenStreetMap по тегам.\n"
        "• **Mapillary & KartaView** — уличные панорамы со всего мира.\n"
        "• **PeakFinder** — сопоставление горных хребтов и силуэтов.\n"
        "• **Sentinel Hub** — актуальные спутниковые снимки."
    )
    await message.answer(text, reply_markup=get_osint_tools_keyboard(), parse_mode="Markdown")


@router.message(F.text == "🔍 Поиск страниц по фото")
@router.message(Command("reverse"))
async def cmd_reverse(message: Message):
    """Сервисы поиска страниц с фото."""
    text = (
        "🔍 **Сервисы обратного поиска (Reverse Image Search):**\n\n"
        "Чтобы найти страницы, блоги или статьи, где ранее публиковалось это фото:\n\n"
        "1. **Google Lens** — объекты, товары и достопримечательности.\n"
        "2. **Яндекс Картинки** — поиск по СНГ, лицам и точным дубликатам.\n"
        "3. **Bing Visual** — западные и азиатские порталы.\n"
        "4. **TinEye** — поиск самого раннего появления фото в сети.\n"
        "5. **PimEyes** — распознавание лиц."
    )
    await message.answer(text, reply_markup=get_reverse_search_keyboard(), parse_mode="Markdown")


@router.message(F.text == "📊 Мой профиль")
async def cmd_profile(message: Message, db_user: Dict[str, Any]):
    """Персональная карточка аналитика."""
    created = db_user.get("created_at", "")[:10]
    req_count = db_user.get("requests_count", 0)
    role = "👑 Администратор" if db_user.get("is_admin") else "🕵️ Аналитик"

    text = (
        f"👤 **Карточка аналитика:**\n\n"
        f"• **ID:** `{db_user.get('user_id')}`\n"
        f"• **Имя:** {db_user.get('first_name', '')} {db_user.get('last_name', '')}\n"
        f"• **Username:** @{db_user.get('username') or 'не указан'}\n"
        f"• **Статус:** {role}\n"
        f"• **Дата регистрации:** {created}\n"
        f"• **Выполнено расследований:** `{req_count}`"
    )
    await message.answer(text, parse_mode="Markdown")


@router.message(F.text == "📸 Отправить фото на анализ")
@router.message(Command("geoint"))
async def prompt_photo_upload(message: Message):
    """Подсказка перед отправкой фото."""
    await message.answer(
        "📷 **Прикрепите и отправьте фотографию:**\n\n"
        "Вы можете прикрепить фото с вопросом (например, *«Где сделано это фото?»* "
        "или *«Определи город и направление взгляда»*).\n\n"
        "💡 *Совет: отправка файлом без сжатия позволит проверить скрытые GPS координаты.*"
    )


# --- Обработка входящего фото ---

@router.message(F.photo | (F.document & F.document.mime_type.startswith("image/")))
async def handle_incoming_photo(message: Message, bot: Bot, db: Database, db_user: Dict[str, Any]):
    """Прием и анализ фотографии."""
    status_msg = await message.answer(
        "🛰 **Начат анализ изображения...**\n⏳ *Извлечение метаданных EXIF и сканирование маркеров через Gemini 3.8 Flash...*",
        parse_mode="Markdown"
    )

    try:
        file_io = BytesIO()
        if message.photo:
            photo_size = message.photo[-1]
            await bot.download(photo_size.file_id, destination=file_io)
        elif message.document:
            await bot.download(message.document.file_id, destination=file_io)

        image_bytes = file_io.getvalue()
        user_caption = message.caption or ""

        # 1. EXIF & GPS
        exif_data = extract_exif(image_bytes)

        # 2. Gemini 3.8 Flash
        geoint_data = await analyze_geoint_image(image_bytes, user_prompt=user_caption)

        country = geoint_data.get("country", "Не определена")
        region = geoint_data.get("region", "")
        city = geoint_data.get("city_or_district", "")
        confidence = geoint_data.get("confidence", "Средняя")
        confidence_reason = geoint_data.get("confidence_reason", "")
        summary = geoint_data.get("executive_summary", "Анализ завершен.")
        cues = geoint_data.get("visual_cues", {})
        key_artifacts = geoint_data.get("key_artifacts", [])
        keywords = geoint_data.get("search_keywords", [])

        if exif_data.get("has_gps"):
            coords_str = exif_data.get("coordinates_str", "")
            maps_url = exif_data.get("maps_url", "")
            confidence = "Высокая (EXIF GPS)"
            confidence_reason = "Точные аппаратные координаты извлечены из метаданных файла камеры."
        else:
            coords_str = geoint_data.get("estimated_coordinates", "0.0000, 0.0000")
            maps_url = f"https://www.google.com/maps/search/?api=1&query={coords_str.replace(' ', '')}"

        search_links = build_reverse_search_links()

        inv_id = await db.save_investigation(
            user_id=message.from_user.id,
            country=country,
            region=region,
            coordinates=coords_str,
            confidence=confidence,
            summary=summary,
            cues={
                "visual_cues": cues,
                "key_artifacts": key_artifacts,
                "keywords": keywords,
                "exif": exif_data,
                "steps": geoint_data.get("recommended_steps", []),
                "confidence_reason": confidence_reason,
                "city": city,
            },
            search_links=search_links
        )

        await db.increment_requests(message.from_user.id)

        conf_icon = "🟢" if "Высок" in confidence else "🟡" if "Средн" in confidence else "🔴"
        exif_badge = "\n📸 **EXIF:** обнаружены встроенные аппаратные геометки GPS!" if exif_data.get("has_gps") else ""

        report_text = (
            f"🎯 **Отчет расследования #{inv_id}**\n\n"
            f"🌍 **Локация:** {country}" + (f", {region}" if region else "") + (f" ({city})" if city and city != "Не определен точно" else "") + "\n"
            f"📍 **Координаты:** `{coords_str}`\n"
            f"{conf_icon} **Достоверность:** {confidence}\n"
            f"_{confidence_reason}_{exif_badge}\n\n"
            f"📋 **Краткий вывод:**\n{summary}\n\n"
            f"🧩 **Ключевые зацепки:**\n" +
            ("\n".join([f"• {a}" for a in key_artifacts[:3]]) if key_artifacts else "• Проанализированы дорожные и природные маркеры.") +
            "\n\n👇 *Используйте кнопки ниже для детальных улик или перехода к поиску страниц:*"
        )

        await status_msg.edit_text(
            report_text,
            reply_markup=get_geoint_result_keyboard(inv_id, coords_str, maps_url),
            parse_mode="Markdown"
        )

    except Exception as e:
        await status_msg.edit_text(
            f"❌ **Произошла ошибка при обработке:**\n`{str(e)}`",
            parse_mode="Markdown"
        )


# --- Интерактивные колбэки ---

@router.callback_query(F.data.startswith("show_cues:"))
async def cb_show_cues(callback: CallbackQuery, db: Database):
    """Показ детального разбора визуальных улик."""
    inv_id = int(callback.data.split(":")[1])
    inv = await db.get_investigation(inv_id)
    if not inv:
        await callback.answer("Расследование не найдено.", show_alert=True)
        return

    cues_data = inv.get("cues", {})
    vc = cues_data.get("visual_cues", {})

    text = (
        f"🧩 **Детальный разбор визуальных улик (Кейс #{inv_id}):**\n\n"
        f"🏛 **Архитектура & Постройки:**\n{vc.get('architecture', 'Нет выраженных маркеров.')}\n\n"
        f"🌲 **Флора & Ландшафт:**\n{vc.get('landscape_vegetation', 'Нет выраженных маркеров.')}\n\n"
        f"🛣 **Инфраструктура, дороги & столбы:**\n{vc.get('infrastructure_transit', 'Нет выраженных маркеров.')}\n\n"
        f"🪧 **Вывески, текст & знаки:**\n{vc.get('signage_language', 'Текст не обнаружен.')}\n\n"
        f"☀️ **Анализ солнца и теней:**\n{vc.get('celestial_sun_shadows', 'Тени не дают точного азимута.')}"
    )

    await callback.message.edit_text(text, reply_markup=get_back_to_report_keyboard(inv_id), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data.startswith("show_summary:"))
async def cb_show_summary(callback: CallbackQuery, db: Database):
    """Показ краткого вывода и аргументации."""
    inv_id = int(callback.data.split(":")[1])
    inv = await db.get_investigation(inv_id)
    if not inv:
        await callback.answer("Расследование не найдено.", show_alert=True)
        return

    cues_data = inv.get("cues", {})
    exif = cues_data.get("exif", {})

    exif_details = ""
    if exif.get("has_exif"):
        cam = f"{exif.get('camera_make', '')} {exif.get('camera_model', '')}".strip()
        dt = exif.get("datetime_original", "")
        exif_details = f"\n\n📷 **Данные устройства съемки:**\n• Камера: {cam or 'Не указана'}\n• Время кадра: {dt or 'Не указано'}"

    text = (
        f"📋 **Резюме и заключение расследования #{inv_id}:**\n\n"
        f"🌍 **Итоговая гео-гипотеза:** {inv.get('country')}, {inv.get('region')}\n"
        f"🎯 **Степень достоверности:** {inv.get('confidence')}\n"
        f"💡 **Обоснование:** {cues_data.get('confidence_reason', 'Основано на комплексе визуальных совпадений.')}\n\n"
        f"📝 **Краткий вывод аналитика:**\n{inv.get('summary')}"
        f"{exif_details}"
    )

    await callback.message.edit_text(text, reply_markup=get_back_to_report_keyboard(inv_id), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data.startswith("show_steps:"))
async def cb_show_steps(callback: CallbackQuery, db: Database):
    """Показ рекомендуемых шагов OSINT."""
    inv_id = int(callback.data.split(":")[1])
    inv = await db.get_investigation(inv_id)
    if not inv:
        await callback.answer("Расследование не найдено.", show_alert=True)
        return

    cues_data = inv.get("cues", {})
    steps = cues_data.get("steps", [])
    steps_text = "\n".join([f"{i+1}. {s}" for i, s in enumerate(steps)]) if steps else (
        "1. Проверьте совпадения через Yandex Images и Google Lens.\n"
        "2. Сопоставьте угол теней в калькуляторе SunCalc."
    )

    text = f"💡 **Рекомендуемые следующие шаги OSINT верификации (#{inv_id}):**\n\n{steps_text}"
    await callback.message.edit_text(text, reply_markup=get_back_to_report_keyboard(inv_id), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data.startswith("show_dorks:"))
async def cb_show_dorks(callback: CallbackQuery, db: Database):
    """Генерация целевых поисковых дорков."""
    inv_id = int(callback.data.split(":")[1])
    inv = await db.get_investigation(inv_id)
    if not inv:
        await callback.answer("Расследование не найдено.", show_alert=True)
        return

    cues_data = inv.get("cues", {})
    keywords = cues_data.get("keywords", [])
    dorks = generate_osint_dorks(keywords, inv.get("country"))

    dork_lines = [f"🔎 **{d['title']}:**\n`{d['query']}`\n[Открыть в Google]({d['url']})\n" for d in dorks]
    text = f"🔎 **Поисковые дорки для обнаружения страниц с фото (#{inv_id}):**\n\n" + "\n".join(dork_lines)

    await callback.message.edit_text(text, reply_markup=get_back_to_report_keyboard(inv_id), parse_mode="Markdown", disable_web_page_preview=True)
    await callback.answer()


@router.callback_query(F.data.startswith("back_report:"))
async def cb_back_report(callback: CallbackQuery, db: Database):
    """Возврат к исходной карточке расследования."""
    inv_id = int(callback.data.split(":")[1])
    inv = await db.get_investigation(inv_id)
    if not inv:
        await callback.answer("Отчет не найден.", show_alert=True)
        return

    cues_data = inv.get("cues", {})
    confidence = inv.get("confidence", "Средняя")
    conf_icon = "🟢" if "Высок" in confidence else "🟡" if "Средн" in confidence else "🔴"
    coords_str = inv.get("coordinates", "0.0000, 0.0000")
    key_artifacts = cues_data.get("key_artifacts", [])
    maps_url = f"https://www.google.com/maps/search/?api=1&query={coords_str.replace(' ', '')}"

    report_text = (
        f"🎯 **Отчет расследования #{inv_id}**\n\n"
        f"🌍 **Локация:** {inv.get('country')}" + (f", {inv.get('region')}" if inv.get('region') else "") + "\n"
        f"📍 **Координаты:** `{coords_str}`\n"
        f"{conf_icon} **Достоверность:** {confidence}\n"
        f"_{cues_data.get('confidence_reason', '')}_\n\n"
        f"📋 **Краткий вывод:**\n{inv.get('summary')}\n\n"
        f"🧩 **Ключевые зацепки:**\n" +
        ("\n".join([f"• {a}" for a in key_artifacts[:3]]) if key_artifacts else "• Проанализированы визуальные маркеры.") +
        "\n\n👇 *Используйте кнопки ниже для перехода:*"
    )

    await callback.message.edit_text(report_text, reply_markup=get_geoint_result_keyboard(inv_id, coords_str, maps_url), parse_mode="Markdown")
    await callback.answer()
