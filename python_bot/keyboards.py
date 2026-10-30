"""
Все клавиатуры Telegram-бота:
- Постоянное Reply-меню
- Инлайн-кнопки результатов GEOINT и поиска страниц
- Инлайн-меню панели администратора и подтверждения рассылок
"""

from typing import Optional
from aiogram.types import (
    ReplyKeyboardMarkup,
    KeyboardButton,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
)


def get_main_keyboard(is_admin: bool = False) -> ReplyKeyboardMarkup:
    """Главное постоянное меню бота."""
    keyboard = [
        [
            KeyboardButton(text="📸 Отправить фото на анализ"),
            KeyboardButton(text="🔍 Поиск страниц по фото"),
        ],
        [
            KeyboardButton(text="🛠 OSINT Инструменты"),
            KeyboardButton(text="📊 Мой профиль"),
        ],
        [
            KeyboardButton(text="ℹ️ Помощь & Гайд"),
        ],
    ]

    if is_admin:
        keyboard.append([KeyboardButton(text="👑 Админ-панель")])

    return ReplyKeyboardMarkup(
        keyboard=keyboard,
        resize_keyboard=True,
        input_field_placeholder="Отправьте фото местности или выберите команду..."
    )


def get_geoint_result_keyboard(inv_id: int, coordinates_str: Optional[str] = None, maps_url: Optional[str] = None) -> InlineKeyboardMarkup:
    """Инлайн-кнопки под отчетом расследования."""
    rows = []

    # 1. Поиск страниц с фото
    rows.append([
        InlineKeyboardButton(text="🔍 Искать в Google Lens", url="https://lens.google.com/"),
        InlineKeyboardButton(text="🇷🇺 Искать в Яндекс", url="https://yandex.ru/images/search?rpt=imageview"),
    ])

    # 2. Карты
    if maps_url:
        rows.append([InlineKeyboardButton(text="🗺 Открыть точку на карте", url=maps_url)])
    elif coordinates_str and coordinates_str != "0.0000, 0.0000":
        clean_coords = coordinates_str.replace(" ", "")
        rows.append([
            InlineKeyboardButton(text="🗺 Google Maps", url=f"https://www.google.com/maps/search/?api=1&query={clean_coords}"),
            InlineKeyboardButton(text="🌍 OpenStreetMap", url=f"https://www.openstreetmap.org/search?query={clean_coords}"),
        ])

    # 3. Детализация
    rows.append([
        InlineKeyboardButton(text="🧩 Визуальные улики", callback_data=f"show_cues:{inv_id}"),
        InlineKeyboardButton(text="📋 Краткий вывод", callback_data=f"show_summary:{inv_id}"),
    ])

    rows.append([
        InlineKeyboardButton(text="💡 Следующие шаги OSINT", callback_data=f"show_steps:{inv_id}"),
        InlineKeyboardButton(text="🔎 Поисковые дорки", callback_data=f"show_dorks:{inv_id}"),
    ])

    return InlineKeyboardMarkup(inline_keyboard=rows)


def get_back_to_report_keyboard(inv_id: int) -> InlineKeyboardMarkup:
    """Кнопка возврата к исходной карточке отчета."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅️ Назад к общему отчету", callback_data=f"back_report:{inv_id}")]
    ])


def get_reverse_search_keyboard() -> InlineKeyboardMarkup:
    """Прямые ссылки на сервисы поиска по изображениям."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="🌐 Google Lens", url="https://lens.google.com/"),
            InlineKeyboardButton(text="🇷🇺 Yandex Картинки", url="https://yandex.ru/images/search?rpt=imageview"),
        ],
        [
            InlineKeyboardButton(text="🔎 Bing Visual Search", url="https://www.bing.com/visualsearch"),
            InlineKeyboardButton(text="🤖 TinEye Reverse", url="https://tineye.com/"),
        ],
        [
            InlineKeyboardButton(text="👤 PimEyes (Поиск лиц)", url="https://pimeyes.com/"),
            InlineKeyboardButton(text="🇨🇳 Baidu Image Search", url="https://graph.baidu.com/"),
        ],
    ])


def get_osint_tools_keyboard() -> InlineKeyboardMarkup:
    """Ссылки на внешние инструменты верификации геоданных."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="☀️ SunCalc (Тени и солнце)", url="https://www.suncalc.org/"),
            InlineKeyboardButton(text="🛣 Overpass Turbo (Теги OSM)", url="https://overpass-turbo.eu/"),
        ],
        [
            InlineKeyboardButton(text="📸 Mapillary (Уличные фото)", url="https://www.mapillary.com/"),
            InlineKeyboardButton(text="⛰ PeakFinder (Силуэты гор)", url="https://www.peakfinder.org/"),
        ],
        [
            InlineKeyboardButton(text="🛰 Sentinel Hub (Спутники)", url="https://apps.sentinel-hub.com/eo-browser/"),
            InlineKeyboardButton(text="✈️ Flightradar24", url="https://www.flightradar24.com/"),
        ],
    ])


def get_admin_main_keyboard() -> InlineKeyboardMarkup:
    """Главное меню панели управления администратора."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="📊 Статистика бота", callback_data="admin:stats"),
            InlineKeyboardButton(text="👥 Пользователи", callback_data="admin:users"),
        ],
        [
            InlineKeyboardButton(text="📂 Последние расследования", callback_data="admin:investigations"),
            InlineKeyboardButton(text="📢 Сделать рассылку", callback_data="admin:broadcast"),
        ],
        [
            InlineKeyboardButton(text="⚙️ Статус и модель Gemini", callback_data="admin:status"),
            InlineKeyboardButton(text="🔄 Обновить меню", callback_data="admin:refresh"),
        ],
    ])


def get_admin_user_control_keyboard(user_id: int, is_banned: bool) -> InlineKeyboardMarkup:
    """Управление конкретным пользователем."""
    ban_text = "🟢 Разблокировать" if is_banned else "🔴 Заблокировать"
    ban_action = f"admin:unban:{user_id}" if is_banned else f"admin:ban:{user_id}"

    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=ban_text, callback_data=ban_action)],
        [InlineKeyboardButton(text="⬅️ Назад к списку", callback_data="admin:users")],
    ])


def get_broadcast_confirm_keyboard() -> InlineKeyboardMarkup:
    """Подтверждение рассылки."""
    return InlineKeyboardMarkup(inline_keyboard=[
        [
            InlineKeyboardButton(text="✅ Отправить всем", callback_data="broadcast:confirm"),
            InlineKeyboardButton(text="❌ Отмена", callback_data="broadcast:cancel"),
        ]
    ])
