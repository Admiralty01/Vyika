import time
from collections import defaultdict
from fastapi import Request, HTTPException, status

class RateLimiter:
    def __init__(self, requests_per_minute: int = 60):
        self.requests_per_minute = requests_per_minute
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def check(self, request: Request, key_prefix: str = "global"):
        # Key based on client IP or user ID if authenticated
        client_ip = request.client.host if request.client else "127.0.0.1"
        user_id = getattr(request.state, "user_id", None)
        identifier = f"{key_prefix}:{user_id if user_id else client_ip}"

        now = time.time()
        window_start = now - 60.0

        # Clean old timestamps
        self.requests[identifier] = [t for t in self.requests[identifier] if t > window_start]

        if len(self.requests[identifier]) >= self.requests_per_minute:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later."
            )

        self.requests[identifier].append(now)

auth_rate_limiter = RateLimiter(requests_per_minute=10)
financial_rate_limiter = RateLimiter(requests_per_minute=20)
general_rate_limiter = RateLimiter(requests_per_minute=120)
