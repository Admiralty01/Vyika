from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.rate_limiter import auth_rate_limiter
from app.core.audit import log_audit_event
from app.models.models import User, Wallet, UserRole, UserStatus, CurrencyRate
from app.schemas.schemas import (
    UserRegister, UserLogin, UserResponse, Token,
    PasswordResetRequest, PasswordResetConfirm, PasswordChange
)
from app.modules.auth.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(
    user_in: UserRegister,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    await auth_rate_limiter.check(request, key_prefix="register")
    
    # Normalize email
    normalized_email = user_in.email.strip().lower()

    # Check duplicate
    stmt = select(User).where(User.email == normalized_email)
    existing = (await db.execute(stmt)).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Password hashing with Argon2id/Bcrypt
    hashed_pwd = get_password_hash(user_in.password)

    user = User(
        email=normalized_email,
        full_name=user_in.full_name.strip(),
        password_hash=hashed_pwd,
        country=user_in.country.strip(),
        role=UserRole.USER,
        status=UserStatus.ACTIVE,
        email_verified=True
    )
    db.add(user)
    await db.flush()

    # Initialize empty Wallet for new user
    wallet = Wallet(user_id=user.id)
    db.add(wallet)

    # Audit event
    await log_audit_event(
        db=db,
        action="USER_REGISTERED",
        resource="User",
        actor_id=user.id,
        actor_email=user.email,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None
    )

    await db.commit()
    await db.refresh(user)

    # Access Token
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    
    # Secure HttpOnly Cookie
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax",
        secure=False  # Allow HTTP in local development
    )

    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/login", response_model=Token)
async def login(
    credentials: UserLogin,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    await auth_rate_limiter.check(request, key_prefix="login")
    
    normalized_email = credentials.email.strip().lower()
    stmt = select(User).where(User.email == normalized_email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.password_hash):
        await log_audit_event(
            db=db,
            action="LOGIN_FAILED",
            resource="Auth",
            actor_email=normalized_email,
            ip_address=request.client.host if request.client else None
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password."
        )

    if user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account suspended. Please contact support."
        )

    await log_audit_event(
        db=db,
        action="LOGIN_SUCCESS",
        resource="User",
        actor_id=user.id,
        actor_email=user.email,
        resource_id=user.id,
        ip_address=request.client.host if request.client else None
    )
    await db.commit()

    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    
    response.set_cookie(
        key="access_token",
        value=f"Bearer {access_token}",
        httponly=True,
        samesite="lax",
        secure=False
    )

    return Token(access_token=access_token, token_type="bearer", user=UserResponse.model_validate(user))

@router.post("/logout")
async def logout(response: Response, current_user: User = Depends(get_current_user)):
    response.delete_cookie("access_token")
    return {"message": "Successfully logged out."}

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.post("/password-reset/request")
async def request_password_reset(
    req: PasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    await auth_rate_limiter.check(request, key_prefix="pw_reset_req")
    # Always return success message to prevent user enumeration
    normalized_email = req.email.strip().lower()
    stmt = select(User).where(User.email == normalized_email)
    user = (await db.execute(stmt)).scalar_one_or_none()
    
    if user:
        await log_audit_event(
            db=db,
            action="PASSWORD_RESET_REQUESTED",
            resource="User",
            actor_id=user.id,
            actor_email=user.email,
            resource_id=user.id,
            ip_address=request.client.host if request.client else None
        )
        await db.commit()

    return {"message": "If that email is registered, password reset instructions have been sent."}

@router.post("/password-change")
async def change_password(
    pwd_in: PasswordChange,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not verify_password(pwd_in.old_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password."
        )

    current_user.password_hash = get_password_hash(pwd_in.new_password)
    current_user.updated_at = datetime.now(timezone.utc)

    await log_audit_event(
        db=db,
        action="PASSWORD_CHANGED",
        resource="User",
        actor_id=current_user.id,
        actor_email=current_user.email,
        resource_id=current_user.id,
        ip_address=request.client.host if request.client else None
    )
    await db.commit()

    return {"message": "Password updated successfully."}
