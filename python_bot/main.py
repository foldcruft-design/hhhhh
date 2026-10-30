"""
Главный файл запуска Telegram-бота GEOINT (aiogram 3.x).
Инициализация базы данных, middleware, маршрутизаторов и запуск long polling.
"""

import asyncio
import logging
import sys
from typing import Callable, Dict, Any, Awaitable

from aiogram import Bot, Dispatcher, BaseMiddleware
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import TelegramObject, Message, CallbackQuery

from config import settings
from database import Database
from handlers_admin import router as admin_router
from handlers_geoint import router as geoint_router

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    stream=sys.stdout
)
logger = logging.getLogger("geoint_bot")


class AuthMiddleware(BaseMiddleware):
    """Middleware для автоматической регистрации пользователя в БД и проверки банов."""
    def __init__(self, db: Database):
        self.db = db
        super().__init__()

    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any]
    ) -> Any:
        user = None
        if isinstance(event, Message):
            user = event.from_user
        elif isinstance(event, CallbackQuery):
            user = event.from_user

        if not user:
            return await handler(event, data)

        is_admin = settings.is_admin(user.id)
        db_user = await self.db.get_or_create_user(
            user_id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            is_admin=is_admin
        )

        if db_user.get("is_banned"):
            if isinstance(event, Message):
                await event.answer("🚫 Доступ к боту заблокирован администратором.")
            elif isinstance(event, CallbackQuery):
                await event.answer("🚫 Доступ заблокирован.", show_alert=True)
            return

        data["db"] = self.db
        data["db_user"] = db_user
        data["is_admin"] = is_admin or bool(db_user.get("is_admin"))

        return await handler(event, data)


async def main():
    logger.info("Запуск GEOINT Telegram Бота...")

    if not settings.bot_token or settings.bot_token == "YOUR_BOT_TOKEN_HERE":
        logger.warning(
            "⚠️ ВНИМАНИЕ: BOT_TOKEN не задан в .env файле!\n"
            "Бот не сможет подключиться к Telegram API без корректного токена.\n"
            "Получите токен в @BotFather и укажите его в .env файле."
        )

    # 1. Инициализация базы данных SQLite
    db = Database(settings.database_path)
    await db.init()

    # 2. Инициализация экземпляров Bot и Dispatcher
    bot = Bot(
        token=settings.bot_token,
        default=DefaultBotProperties(parse_mode=ParseMode.MARKDOWN)
    )
    dp = Dispatcher(storage=MemoryStorage())

    # 3. Регистрация Middleware аутентификации
    auth_middleware = AuthMiddleware(db)
    dp.message.middleware(auth_middleware)
    dp.callback_query.middleware(auth_middleware)

    # 4. Регистрация роутеров (Admin перед GEOINT для приоритета команд)
    dp.include_router(admin_router)
    dp.include_router(geoint_router)

    # 5. Запуск получения обновлений
    try:
        if settings.bot_token and settings.bot_token != "YOUR_BOT_TOKEN_HERE":
            me = await bot.get_me()
            logger.info(f"Успешное подключение к Telegram! Бот: @{me.username} (ID: {me.id})")
            await bot.delete_webhook(drop_pending_updates=True)
            await dp.start_polling(bot, db=db)
        else:
            logger.info("Для запуска бота укажите BOT_TOKEN в файле .env и запустите: python main.py")
    except Exception as e:
        logger.error(f"Ошибка при работе бота: {e}")
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен пользователем.")
