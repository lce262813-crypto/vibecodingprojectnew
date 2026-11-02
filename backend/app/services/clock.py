from datetime import date, datetime
from zoneinfo import ZoneInfo

SEOUL_TIMEZONE = ZoneInfo("Asia/Seoul")


def today_in_seoul() -> date:
    return datetime.now(SEOUL_TIMEZONE).date()
