"""
Асинхронная база данных SQLite (aiosqlite) для GEOINT бота.
Хранение пользователей, журнала расследований, блокировок и логов рассылки.
"""

import aiosqlite
import json
import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)


class Database:
    def __init__(self, db_path: str):
        self.db_path = db_path

    async def init(self):
        """Инициализация схемы таблиц."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id INTEGER PRIMARY KEY,
                    username TEXT,
                    first_name TEXT,
                    last_name TEXT,
                    is_admin INTEGER DEFAULT 0,
                    is_banned INTEGER DEFAULT 0,
                    requests_count INTEGER DEFAULT 0,
                    created_at TEXT,
                    last_active TEXT
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS investigations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    timestamp TEXT,
                    country TEXT,
                    region TEXT,
                    coordinates TEXT,
                    confidence TEXT,
                    summary TEXT,
                    cues_json TEXT,
                    search_links_json TEXT,
                    FOREIGN KEY (user_id) REFERENCES users (user_id)
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS broadcasts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    admin_id INTEGER,
                    text TEXT,
                    sent_count INTEGER,
                    failed_count INTEGER,
                    timestamp TEXT
                )
            """)

            await db.commit()
            logger.info("База данных успешно инициализирована.")

    async def get_or_create_user(self, user_id: int, username: Optional[str], first_name: Optional[str], last_name: Optional[str], is_admin: bool = False) -> Dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,))
            row = await cursor.fetchone()
            now = datetime.utcnow().isoformat()

            if row:
                await db.execute(
                    "UPDATE users SET last_active = ?, username = ?, first_name = ?, last_name = ? WHERE user_id = ?",
                    (now, username, first_name, last_name, user_id)
                )
                await db.commit()
                return dict(row)
            else:
                await db.execute(
                    """INSERT INTO users (user_id, username, first_name, last_name, is_admin, is_banned, requests_count, created_at, last_active)
                       VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?)""",
                    (user_id, username, first_name, last_name, 1 if is_admin else 0, now, now)
                )
                await db.commit()
                return {
                    "user_id": user_id,
                    "username": username,
                    "first_name": first_name,
                    "last_name": last_name,
                    "is_admin": 1 if is_admin else 0,
                    "is_banned": 0,
                    "requests_count": 0,
                    "created_at": now,
                    "last_active": now,
                }

    async def increment_requests(self, user_id: int):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE users SET requests_count = requests_count + 1 WHERE user_id = ?", (user_id,))
            await db.commit()

    async def is_banned(self, user_id: int) -> bool:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("SELECT is_banned FROM users WHERE user_id = ?", (user_id,))
            row = await cursor.fetchone()
            return bool(row[0]) if row else False

    async def set_ban_status(self, user_id: int, is_banned: bool):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE users SET is_banned = ? WHERE user_id = ?", (1 if is_banned else 0, user_id))
            await db.commit()

    async def set_admin_status(self, user_id: int, is_admin: bool):
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("UPDATE users SET is_admin = ? WHERE user_id = ?", (1 if is_admin else 0, user_id))
            await db.commit()

    async def save_investigation(
        self,
        user_id: int,
        country: str,
        region: str,
        coordinates: str,
        confidence: str,
        summary: str,
        cues: Dict[str, Any],
        search_links: Dict[str, str],
    ) -> int:
        now = datetime.utcnow().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute(
                """INSERT INTO investigations (user_id, timestamp, country, region, coordinates, confidence, summary, cues_json, search_links_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    user_id,
                    now,
                    country,
                    region,
                    coordinates,
                    confidence,
                    summary,
                    json.dumps(cues, ensure_ascii=False),
                    json.dumps(search_links, ensure_ascii=False),
                )
            )
            await db.commit()
            return cursor.lastrowid

    async def get_investigation(self, inv_id: int) -> Optional[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,))
            row = await cursor.fetchone()
            if not row:
                return None
            data = dict(row)
            data["cues"] = json.loads(data["cues_json"]) if data["cues_json"] else {}
            data["search_links"] = json.loads(data["search_links_json"]) if data["search_links_json"] else {}
            return data

    async def get_latest_investigations(self, limit: int = 10) -> List[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute(
                """SELECT i.*, u.username, u.first_name 
                   FROM investigations i 
                   LEFT JOIN users u ON i.user_id = u.user_id 
                   ORDER BY i.id DESC LIMIT ?""",
                (limit,)
            )
            rows = await cursor.fetchall()
            result = []
            for r in rows:
                item = dict(r)
                item["cues"] = json.loads(item["cues_json"]) if item["cues_json"] else {}
                item["search_links"] = json.loads(item["search_links_json"]) if item["search_links_json"] else {}
                result.append(item)
            return result

    async def get_statistics(self) -> Dict[str, Any]:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("SELECT COUNT(*) FROM users")
            total_users = (await cursor.fetchone())[0]

            cursor = await db.execute("SELECT COUNT(*) FROM users WHERE is_banned = 1")
            banned_users = (await cursor.fetchone())[0]

            cursor = await db.execute("SELECT COUNT(*) FROM investigations")
            total_investigations = (await cursor.fetchone())[0]

            cursor = await db.execute("SELECT SUM(requests_count) FROM users")
            sum_requests = (await cursor.fetchone())[0] or 0

            cursor = await db.execute(
                """SELECT country, COUNT(*) as cnt 
                   FROM investigations 
                   WHERE country IS NOT NULL AND country != '' 
                   GROUP BY country ORDER BY cnt DESC LIMIT 5"""
            )
            top_countries = [dict(country=r[0], count=r[1]) for r in await cursor.fetchall()]

            return {
                "total_users": total_users,
                "banned_users": banned_users,
                "total_investigations": total_investigations,
                "total_requests": sum_requests,
                "top_countries": top_countries,
            }

    async def get_all_users(self, limit: int = 50) -> List[Dict[str, Any]]:
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            cursor = await db.execute("SELECT * FROM users ORDER BY requests_count DESC LIMIT ?", (limit,))
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]

    async def get_all_user_ids(self) -> List[int]:
        async with aiosqlite.connect(self.db_path) as db:
            cursor = await db.execute("SELECT user_id FROM users WHERE is_banned = 0")
            rows = await cursor.fetchall()
            return [r[0] for r in rows]

    async def save_broadcast(self, admin_id: int, text: str, sent_count: int, failed_count: int):
        now = datetime.utcnow().isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO broadcasts (admin_id, text, sent_count, failed_count, timestamp) VALUES (?, ?, ?, ?, ?)",
                (admin_id, text, sent_count, failed_count, now)
            )
            await db.commit()
