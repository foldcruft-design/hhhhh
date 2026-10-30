"""
Панель администратора Telegram-бота GEOINT:
- Статистика использования и география
- Управление пользователями и блокировки (Бан/Разбан)
- Просмотр журнала расследований
- Массовая рассылка сообщений (FSM)
- Системный статус и модель
"""

import sys
import aiogram
from typing import Dict, Any
from aiogram import Router, F, Bot
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

from config import settings
from database import Database
from keyboards import (
    get_admin_main_keyboard,
    get_admin_user_control_keyboard,
    get_broadcast_confirm_keyboard,
)

router = Router(name="admin_router")


class BroadcastState(StatesGroup):
    waiting_for_text = State()
    confirm = State()


def _is_admin(user_id: int, is_admin_flag: bool) -> bool:
    return is_admin_flag or settings.is_admin(user_id)


@router.message(Command("admin"))
@router.message(F.text == "👑 Админ-панель")
async def cmd_admin_panel(message: Message, db_user: Dict[str, Any], is_admin: bool):
    """Открытие панели администратора."""
    if not _is_admin(message.from_user.id, is_admin):
        await message.answer("⛔️ У вас нет прав доступа к панели администратора.")
        return

    text = (
        "👑 **Центр управления GEOINT ботом**\n\n"
        "Добро пожаловать в панель администратора.\n"
        "Выберите раздел для мониторинга и управления:"
    )
    await message.answer(text, reply_markup=get_admin_main_keyboard(), parse_mode="Markdown")


@router.callback_query(F.data == "admin:stats")
async def cb_admin_stats(callback: CallbackQuery, db: Database, is_admin: bool):
    """Просмотр статистики."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    stats = await db.get_statistics()
    top_c = [f"  • {c['country']}: `{c['count']}` расследований" for c in stats.get("top_countries", [])]
    top_str = "\n".join(top_c) if top_c else "  • Данных пока нет"

    text = (
        "📊 **Операционная статистика бота:**\n\n"
        f"👥 **Всего пользователей:** `{stats['total_users']}`\n"
        f"🚫 **Заблокированных:** `{stats['banned_users']}`\n"
        f"🛰 **Проведено расследований:** `{stats['total_investigations']}`\n"
        f"⚡️ **Всего запросов:** `{stats['total_requests']}`\n\n"
        f"🌍 **Топ идентифицированных стран:**\n{top_str}"
    )
    await callback.message.edit_text(text, reply_markup=get_admin_main_keyboard(), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data == "admin:users")
async def cb_admin_users(callback: CallbackQuery, db: Database, is_admin: bool):
    """Список пользователей."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    users = await db.get_all_users(limit=15)
    lines = ["👥 **Последние активные пользователи:**\n"]
    for u in users:
        ban_mark = "🔴 [BAN] " if u.get("is_banned") else "🟢 "
        admin_mark = "👑 " if u.get("is_admin") else ""
        name = u.get("first_name", "User")
        uname = f"@{u['username']}" if u.get("username") else f"ID: {u['user_id']}"
        reqs = u.get("requests_count", 0)
        lines.append(f"{ban_mark}{admin_mark}{name} ({uname}) — `{reqs}` запр. `/user_{u['user_id']}`")

    lines.append("\n💡 *Для управления пользователем отправьте команду:* `/user_ID`")
    await callback.message.edit_text("\n".join(lines), reply_markup=get_admin_main_keyboard(), parse_mode="Markdown")
    await callback.answer()


@router.message(F.text.startswith("/user_"))
async def cmd_manage_user(message: Message, db: Database, is_admin: bool):
    """Карточка пользователя по команде /user_ID."""
    if not _is_admin(message.from_user.id, is_admin):
        return

    try:
        target_id = int(message.text.replace("/user_", "").strip())
        users = await db.get_all_users(limit=1000)
        target = next((u for u in users if u["user_id"] == target_id), None)

        if not target:
            await message.answer("Пользователь с таким ID не найден в базе данных.")
            return

        is_banned = bool(target.get("is_banned"))
        text = (
            f"👤 **Профиль пользователя:**\n\n"
            f"• **ID:** `{target['user_id']}`\n"
            f"• **Имя:** {target.get('first_name', '')} {target.get('last_name', '')}\n"
            f"• **Username:** @{target.get('username') or 'нет'}\n"
            f"• **Статус:** {'🔴 Заблокирован' if is_banned else '🟢 Активен'}\n"
            f"• **Запросов:** `{target.get('requests_count', 0)}`\n"
            f"• **Регистрация:** {target.get('created_at', '')[:19]}"
        )
        await message.answer(text, reply_markup=get_admin_user_control_keyboard(target_id, is_banned), parse_mode="Markdown")
    except Exception as e:
        await message.answer(f"Ошибка: {e}")


@router.callback_query(F.data.startswith("admin:ban:"))
async def cb_ban_user(callback: CallbackQuery, db: Database, is_admin: bool):
    """Блокировка пользователя."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    target_id = int(callback.data.split(":")[2])
    await db.set_ban_status(target_id, True)
    await callback.message.edit_text(
        f"🔴 Пользователь `{target_id}` заблокирован.",
        reply_markup=get_admin_user_control_keyboard(target_id, True),
        parse_mode="Markdown"
    )
    await callback.answer("Заблокирован.")


@router.callback_query(F.data.startswith("admin:unban:"))
async def cb_unban_user(callback: CallbackQuery, db: Database, is_admin: bool):
    """Разблокировка пользователя."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    target_id = int(callback.data.split(":")[2])
    await db.set_ban_status(target_id, False)
    await callback.message.edit_text(
        f"🟢 Пользователь `{target_id}` разблокирован.",
        reply_markup=get_admin_user_control_keyboard(target_id, False),
        parse_mode="Markdown"
    )
    await callback.answer("Разблокирован.")


@router.callback_query(F.data == "admin:investigations")
async def cb_admin_investigations(callback: CallbackQuery, db: Database, is_admin: bool):
    """Список последних расследований."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    invs = await db.get_latest_investigations(limit=8)
    if not invs:
        await callback.message.edit_text("📂 Расследований в базе пока нет.", reply_markup=get_admin_main_keyboard())
        await callback.answer()
        return

    lines = ["📂 **Последние проведенные расследования:**\n"]
    for inv in invs:
        author = f"@{inv['username']}" if inv.get("username") else f"ID {inv['user_id']}"
        conf = inv.get("confidence", "")
        dt = inv.get("timestamp", "")[:16].replace("T", " ")
        lines.append(
            f"• **Кейс #{inv['id']}** ({dt})\n"
            f"  🌍 {inv.get('country')}, {inv.get('region')} (`{inv.get('coordinates')}`)\n"
            f"  🎯 Достоверность: {conf} | Автор: {author}\n"
        )

    await callback.message.edit_text("\n".join(lines), reply_markup=get_admin_main_keyboard(), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data == "admin:status")
async def cb_admin_status(callback: CallbackQuery, is_admin: bool):
    """Системная информация о среде выполнения."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    text = (
        "⚙️ **Системный статус GEOINT сервера:**\n\n"
        f"• **Python версия:** `{sys.version.split()[0]}`\n"
        f"• **aiogram версия:** `{aiogram.__version__}`\n"
        f"• **Модель анализа:** `{settings.gemini_model}`\n"
        f"• **Gemini API Key:** {'✅ Сконфигурирован' if settings.gemini_api_key else '❌ Не задан'}\n"
        f"• **База данных:** `{settings.database_path}`\n"
        f"• **Количество админов:** `{len(settings.admin_ids)}`"
    )
    await callback.message.edit_text(text, reply_markup=get_admin_main_keyboard(), parse_mode="Markdown")
    await callback.answer()


@router.callback_query(F.data == "admin:refresh")
async def cb_admin_refresh(callback: CallbackQuery):
    """Обновление меню."""
    await callback.message.edit_text(
        "👑 **Центр управления GEOINT ботом**\n\nПанель обновлена. Выберите действие:",
        reply_markup=get_admin_main_keyboard(),
        parse_mode="Markdown"
    )
    await callback.answer("Обновлено")


# --- Рассылка (Broadcast) ---

@router.callback_query(F.data == "admin:broadcast")
async def cb_start_broadcast(callback: CallbackQuery, state: FSMContext, is_admin: bool):
    """Инициализация рассылки."""
    if not _is_admin(callback.from_user.id, is_admin):
        await callback.answer("Доступ запрещен", show_alert=True)
        return

    await state.set_state(BroadcastState.waiting_for_text)
    await callback.message.answer(
        "📢 **Создание рассылки:**\n\n"
        "Отправьте текст сообщения для рассылки всем активным пользователям бота.\n"
        "Для отмены отправьте /cancel."
    )
    await callback.answer()


@router.message(Command("cancel"))
async def cmd_cancel_broadcast(message: Message, state: FSMContext):
    """Отмена рассылки."""
    await state.clear()
    await message.answer("❌ Действие отменено.")


@router.message(BroadcastState.waiting_for_text)
async def process_broadcast_text(message: Message, state: FSMContext):
    """Подтверждение текста рассылки."""
    await state.update_data(text=message.text)
    await state.set_state(BroadcastState.confirm)

    preview_text = (
        f"📢 **Предпросмотр сообщения для рассылки:**\n\n"
        f"{message.text}\n\n"
        f"❓ Отправить это сообщение всем пользователям базы данных?"
    )
    await message.answer(preview_text, reply_markup=get_broadcast_confirm_keyboard(), parse_mode="Markdown")


@router.callback_query(BroadcastState.confirm, F.data == "broadcast:confirm")
async def execute_broadcast(callback: CallbackQuery, state: FSMContext, bot: Bot, db: Database):
    """Выполнение рассылки."""
    data = await state.get_data()
    text = data.get("text", "")
    await state.clear()

    user_ids = await db.get_all_user_ids()
    sent = 0
    failed = 0

    progress_msg = await callback.message.edit_text(f"🚀 Рассылка запущена... 0/{len(user_ids)}")

    for uid in user_ids:
        try:
            await bot.send_message(chat_id=uid, text=text, parse_mode="Markdown")
            sent += 1
        except Exception:
            failed += 1

    await db.save_broadcast(callback.from_user.id, text, sent, failed)

    await progress_msg.edit_text(
        f"✅ **Рассылка завершена!**\n\n"
        f"• Успешно доставлено: `{sent}`\n"
        f"• Ошибок доставки: `{failed}`\n"
        f"• Всего получателей: `{len(user_ids)}`",
        reply_markup=get_admin_main_keyboard(),
        parse_mode="Markdown"
    )
    await callback.answer("Рассылка завершена")


@router.callback_query(BroadcastState.confirm, F.data == "broadcast:cancel")
async def cancel_broadcast_cb(callback: CallbackQuery, state: FSMContext):
    """Отмена рассылки."""
    await state.clear()
    await callback.message.edit_text("❌ Рассылка отменена.", reply_markup=get_admin_main_keyboard())
    await callback.answer("Отменено")
