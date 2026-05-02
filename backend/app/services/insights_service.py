"""Weekly narrative generation via the Claude API.

Pulls this-week + last-week summaries via the analytics service, sends them to
Claude with a short system prompt, and returns a 2-4 sentence narrative.

In-memory cache keyed by `week_start` keeps repeat hits within the same week
free; `refresh=True` bypasses.
"""
from datetime import date, datetime, timedelta, timezone
from threading import Lock

import anthropic
from sqlalchemy.orm import Session

from app.core.config import settings
from app.schemas.dashboard import DashboardSummary
from app.schemas.insights import WeeklyInsight
from app.services import analytics_service

MODEL = "claude-haiku-4-5"
MAX_TOKENS = 1024

SYSTEM_PROMPT = """You are a senior financial analyst writing a weekly briefing for a \
payment-operations dashboard. Given this week's metrics and last week's metrics, \
write a 2-4 sentence narrative for an operator.

Rules:
- Lead with the single most important shift week-over-week (revenue, refund rate, \
failure rate, AOV — pick the one that matters most).
- Quantify changes (percent or absolute), and reference the actual numbers.
- Plain English, confident, no hedging, no preamble ("Here is your summary..."), \
no emojis, no markdown.
- If the week looks normal, say so plainly.
- Do not invent data or speculate beyond what the numbers support."""


_cache: dict[date, WeeklyInsight] = {}
_cache_lock = Lock()
_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    return _client


def _most_recent_sunday(today: date) -> date:
    # Monday = 0, Sunday = 6. We want the last Sunday on or before `today`.
    return today - timedelta(days=(today.weekday() + 1) % 7)


def _week_range(week_ending: date) -> tuple[date, date]:
    week_start = week_ending - timedelta(days=6)
    return week_start, week_ending


def _format_summary(label: str, s: DashboardSummary) -> str:
    return (
        f"{label} ({s.range.start} to {s.range.end}):\n"
        f"  revenue: ${s.total_revenue}\n"
        f"  transactions: {s.transaction_count} ({s.successful_count} succeeded, "
        f"{s.failed_count} failed)\n"
        f"  refund total: ${s.refund_total}\n"
        f"  refund rate: {s.refund_rate * 100:.2f}%\n"
        f"  average order value: ${s.average_order_value}"
    )


def generate_weekly_insight(
    db: Session,
    week_ending: date | None = None,
    refresh: bool = False,
) -> WeeklyInsight:
    if not settings.anthropic_api_key:
        raise RuntimeError("ANTHROPIC_API_KEY is not configured")

    if week_ending is None:
        week_ending = _most_recent_sunday(date.today())
    week_start, week_end = _week_range(week_ending)

    if not refresh:
        with _cache_lock:
            cached = _cache.get(week_start)
        if cached is not None:
            return cached.model_copy(update={"cached": True})

    prev_start = week_start - timedelta(days=7)
    prev_end = week_start - timedelta(days=1)

    current = analytics_service.summary(db, week_start, week_end)
    previous = analytics_service.summary(db, prev_start, prev_end)

    user_message = (
        f"{_format_summary('This week', current)}\n\n"
        f"{_format_summary('Last week', previous)}"
    )

    client = _get_client()
    response = client.messages.create(
        model=MODEL,
        max_tokens=MAX_TOKENS,
        # Top-level cache marker auto-caches the system prompt. The current
        # prompt is well below Haiku's 4096-token cache minimum, so this is a
        # no-op today; it activates if/when the prompt grows.
        cache_control={"type": "ephemeral"},
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
    )

    narrative = next(
        (b.text for b in response.content if b.type == "text"),
        "",
    ).strip()

    insight = WeeklyInsight(
        week_start=week_start,
        week_end=week_end,
        narrative=narrative,
        summary=current,
        previous_summary=previous,
        model=response.model,
        generated_at=datetime.now(timezone.utc),
        cached=False,
    )

    with _cache_lock:
        _cache[week_start] = insight

    return insight
