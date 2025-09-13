"""
Slack API client for fetching channel messages within a timeframe.
Mirrors the style of LinearClient for consistency.
"""

from typing import List, Dict, Any, Optional
import aiohttp
from datetime import datetime, timezone


class SlackClient:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://slack.com/api"

    async def _get(self, path: str, params: Dict[str, Any]) -> Dict[str, Any]:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/{path}", headers=headers, params=params) as response:
                if response.status != 200:
                    raise Exception(f"Slack API request failed: {response.status}")
                data = await response.json()
                if not data.get("ok", False):
                    error = data.get("error", "unknown_error")
                    raise Exception(f"Slack API error: {error}")
                return data

    @staticmethod
    def _to_unix_ts(dt: Optional[datetime]) -> Optional[float]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.timestamp()

    async def fetch_channel_messages(
        self,
        channel_id: str,
        oldest: Optional[datetime] = None,
        latest: Optional[datetime] = None,
        limit: int = 200,
    ) -> List[Dict[str, Any]]:
        """Fetch channel messages in a timeframe using conversations.history.

        Slack returns in reverse chronological order; we will accumulate with pagination.
        """
        messages: List[Dict[str, Any]] = []
        has_more = True
        cursor: Optional[str] = None

        params: Dict[str, Any] = {
            "channel": channel_id,
            "limit": limit,
        }
        if oldest is not None:
            params["oldest"] = f"{self._to_unix_ts(oldest):.6f}"
        if latest is not None:
            params["latest"] = f"{self._to_unix_ts(latest):.6f}"

        while has_more:
            if cursor:
                params["cursor"] = cursor
            data = await self._get("conversations.history", params)
            messages.extend(data.get("messages", []))
            has_more = data.get("has_more", False)
            cursor = data.get("response_metadata", {}).get("next_cursor")
            if not cursor:
                has_more = False

        return messages

    async def fetch_user_map(self, user_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """Fetch user info for a set of user IDs and return a map id->user.

        Calls users.info for each unique id. Slack also has users.list but that can be heavy.
        """
        result: Dict[str, Dict[str, Any]] = {}
        unique_ids = [uid for uid in dict.fromkeys(user_ids) if uid]
        for uid in unique_ids:
            try:
                data = await self._get("users.info", {"user": uid})
                if data.get("user"):
                    result[uid] = data["user"]
            except Exception:
                # Skip failures for individual users
                continue
        return result

    def process_message(self, message: Dict[str, Any], user_map: Dict[str, Dict[str, Any]], channel_id: str) -> tuple[str, Dict[str, Any]]:
        """Process a Slack message into content and metadata for indexing."""
        user_id = message.get("user") or message.get("bot_id") or "unknown"
        user_info = user_map.get(user_id, {})
        username = user_info.get("real_name") or user_info.get("name") or user_id
        text = message.get("text", "")
        ts = message.get("ts", "0")

        # Slack ts is like "1700000000.123456"; keep as string but also keep float
        created_at = float(ts) if isinstance(ts, str) and ts.replace(".", "", 1).isdigit() else None

        metadata: Dict[str, Any] = {
            "data_type": "slack_message",
            "channel_id": channel_id,
            "user_id": user_id,
            "username": username,
            "ts": ts,
            "created_at": created_at,
            "source": "slack",
        }

        # Include thread and subtype info if present
        if message.get("thread_ts"):
            metadata["thread_ts"] = message["thread_ts"]
        if message.get("subtype"):
            metadata["subtype"] = message["subtype"]

        content_lines: List[str] = [
            f"Slack Message in Channel {channel_id}",
            f"From: {username} ({user_id})",
            f"Timestamp: {ts}",
        ]

        if text:
            content_lines.append("\n" + text)

        return "\n".join(content_lines), metadata


# No default singleton since Slack requires a per-user API key on construction

