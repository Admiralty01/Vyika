import asyncio
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    User, Wallet, Product, CurrencyRate, UserRole, UserStatus,
    ProductStatus, CommissionType, PaymentDetail
)

async def seed_database():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 1. Seed Currencies
        currencies = [
            ("PG", "Papua New Guinea", "PGK", "K", Decimal("3.8")),
            ("AU", "Australia", "AUD", "A$", Decimal("1.5")),
            ("VU", "Vanuatu", "VUV", "VT", Decimal("120.0")),
            ("FJ", "Fiji", "FJD", "FJ$", Decimal("2.25")),
            ("WS", "Samoa", "WST", "ST$", Decimal("2.7")),
            ("ZA", "South Africa", "ZAR", "R", Decimal("18.0")),
            ("US", "United States", "USD", "$", Decimal("1.0")),
            ("GB", "United Kingdom", "GBP", "£", Decimal("0.79")),
            ("NG", "Nigeria", "NGN", "₦", Decimal("1500.0")),
            ("EU", "European Union", "EUR", "€", Decimal("0.92")),
            ("KE", "Kenya", "KES", "KSh", Decimal("130.0")),
            ("CA", "Canada", "CAD", "CA$", Decimal("1.36")),
        ]
        for c_code, c_name, curr_code, curr_sym, ex_rate in currencies:
            stmt = select(CurrencyRate).where(CurrencyRate.country_name == c_name)
            existing = (await db.execute(stmt)).scalar_one_or_none()
            if not existing:
                db.add(CurrencyRate(
                    country_code=c_code,
                    country_name=c_name,
                    currency_code=curr_code,
                    currency_symbol=curr_sym,
                    exchange_rate_to_usd=ex_rate
                ))

        # 2. Seed Admin User
        admin_email = "admin@platform.com"
        stmt_admin = select(User).where(User.email == admin_email)
        admin_user = (await db.execute(stmt_admin)).scalar_one_or_none()
        if not admin_user:
            admin_user = User(
                email=admin_email,
                full_name="Platform Chief Administrator",
                password_hash=get_password_hash("AdminPassword123!"),
                country="United States",
                role=UserRole.ADMIN,
                status=UserStatus.ACTIVE,
                email_verified=True
            )
            db.add(admin_user)
            await db.flush()
            db.add(Wallet(user_id=admin_user.id))

        # 3. Seed Demo Regular User
        demo_email = "user@example.com"
        stmt_user = select(User).where(User.email == demo_email)
        demo_user = (await db.execute(stmt_user)).scalar_one_or_none()
        if not demo_user:
            demo_user = User(
                email=demo_email,
                full_name="Sarah Jenkins (Affiliate)",
                password_hash=get_password_hash("UserPassword123!"),
                country="Nigeria",
                role=UserRole.USER,
                status=UserStatus.ACTIVE,
                email_verified=True
            )
            db.add(demo_user)
            await db.flush()
            db.add(Wallet(
                user_id=demo_user.id,
                available_balance_usd=Decimal("150.0000"),
                total_earned_usd=Decimal("150.0000"),
                pending_withdrawal_usd=Decimal("0.0000")
            ))
            db.add(PaymentDetail(
                user_id=demo_user.id,
                payment_method="Direct Bank Transfer",
                account_name="Sarah Jenkins",
                account_number="0123456789",
                bank_name="Access Bank Nigeria",
                bank_code="044",
                country="Nigeria",
                additional_details="Savings Account"
            ))

        # 4. Seed Products
        products_data = [
            {
                "name": "Social Media Ads Masterclass 2026",
                "description": "Comprehensive blueprint covering Meta Ads, TikTok campaigns, pixel tracking, scale strategies, and high-ROI ad copy formulas.",
                "image_url": "https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop",
                "price_usd": Decimal("99.00"),
                "commission_type": CommissionType.PERCENTAGE,
                "commission_value": Decimal("25.00"),
                "status": ProductStatus.ACTIVE
            },
            {
                "name": "SEO Mastery & Link Building Vault",
                "description": "Advanced technical SEO site audit toolkits, backlink prospecting outreach scripts, and topical authority mapping guides.",
                "image_url": "https://images.unsplash.com/photo-1571721795195-a2ca2d3370a9?q=80&w=800&auto=format&fit=crop",
                "price_usd": Decimal("149.00"),
                "commission_type": CommissionType.PERCENTAGE,
                "commission_value": Decimal("30.00"),
                "status": ProductStatus.ACTIVE
            },
            {
                "name": "High-Ticket Email Marketing Funnels",
                "description": "Plug-and-play email sequences, lead magnet templates, and automation workflows engineered for maximum conversion rates.",
                "image_url": "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=800&auto=format&fit=crop",
                "price_usd": Decimal("199.00"),
                "commission_type": CommissionType.FIXED,
                "commission_value": Decimal("50.00"),
                "status": ProductStatus.ACTIVE
            },
            {
                "name": "TikTok & Shorts Viral Video Accelerator",
                "description": "Hooks, storyboards, caption generator prompts, and algorithm hacking framework for short-form organic brand viral reach.",
                "image_url": "https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=800&auto=format&fit=crop",
                "price_usd": Decimal("79.00"),
                "commission_type": CommissionType.PERCENTAGE,
                "commission_value": Decimal("20.00"),
                "status": ProductStatus.ACTIVE
            },
            {
                "name": "AI Content Marketing & Prompt Engine",
                "description": "Over 500+ curated prompts for ChatGPT, Claude, and Midjourney to produce high-ranking blogs, landing pages, and ad creatives.",
                "image_url": "https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=800&auto=format&fit=crop",
                "price_usd": Decimal("129.00"),
                "commission_type": CommissionType.PERCENTAGE,
                "commission_value": Decimal("35.00"),
                "status": ProductStatus.ACTIVE
            }
        ]

        for p_item in products_data:
            stmt_p = select(Product).where(Product.name == p_item["name"])
            existing_p = (await db.execute(stmt_p)).scalar_one_or_none()
            if not existing_p:
                db.add(Product(**p_item))

        await db.commit()
        print("Database seed successfully initialized!")

if __name__ == "__main__":
    asyncio.run(seed_database())
