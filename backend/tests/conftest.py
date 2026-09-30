import os
import sys
from pathlib import Path

# Add backend directory to sys.path
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db

from app.core.security import get_password_hash, create_access_token
from app.models.models import User, Wallet, CurrencyRate, UserRole, UserStatus
from app.main import app

# In-Memory SQLite Engine for Testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

engine_test = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=engine_test,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with TestingSessionLocal() as session:
        # Seed test currency
        session.add(CurrencyRate(
            country_code="NG",
            country_name="Nigeria",
            currency_code="NGN",
            currency_symbol="₦",
            exchange_rate_to_usd=1500.0
        ))
        await session.commit()
        yield session

    async with engine_test.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()

@pytest_asyncio.fixture
async def test_user(db_session: AsyncSession) -> User:
    user = User(
        email="testuser@example.com",
        full_name="Test User",
        password_hash=get_password_hash("Password123!"),
        country="Nigeria",
        role=UserRole.USER,
        status=UserStatus.ACTIVE
    )
    db_session.add(user)
    await db_session.flush()
    db_session.add(Wallet(user_id=user.id))
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest_asyncio.fixture
async def user_headers(test_user: User) -> dict[str, str]:
    token = create_access_token(data={"sub": test_user.id, "role": test_user.role.value})
    return {"Authorization": f"Bearer {token}"}

@pytest_asyncio.fixture
async def test_admin(db_session: AsyncSession) -> User:
    admin = User(
        email="testadmin@example.com",
        full_name="Test Admin",
        password_hash=get_password_hash("AdminPass123!"),
        country="United States",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE
    )
    db_session.add(admin)
    await db_session.flush()
    db_session.add(Wallet(user_id=admin.id))
    await db_session.commit()
    await db_session.refresh(admin)
    return admin

@pytest_asyncio.fixture
async def admin_headers(test_admin: User) -> dict[str, str]:
    token = create_access_token(data={"sub": test_admin.id, "role": test_admin.role.value})
    return {"Authorization": f"Bearer {token}"}
