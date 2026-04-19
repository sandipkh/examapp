from fastapi import APIRouter, Depends, HTTPException, status
from firebase_admin import auth as firebase_auth
from firebase_admin import credentials, initialize_app
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.deps import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    verify_refresh_token,
)
from app.db.database import get_db
from app.models.models import User
from app.schemas.schemas import (
    AuthResponse,
    FirebaseTokenRequest,
    ProfileUpdateRequest,
    RefreshTokenRequest,
    RefreshTokenResponse,
    UserOut,
)

router = APIRouter()

_firebase_initialized = False


def _ensure_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    if settings.FIREBASE_PROJECT_ID:
        cred = credentials.Certificate(
            {
                "type": "service_account",
                "project_id": settings.FIREBASE_PROJECT_ID,
                "private_key": settings.FIREBASE_PRIVATE_KEY.replace("\\n", "\n"),
                "client_email": settings.FIREBASE_CLIENT_EMAIL,
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        )
        initialize_app(cred)
    _firebase_initialized = True


@router.post("/verify-firebase-token", response_model=AuthResponse)
async def verify_firebase_token(
    body: FirebaseTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    _ensure_firebase()
    try:
        decoded = firebase_auth.verify_id_token(body.id_token)
    except Exception as e:
        print(f"[auth] Firebase token verification failed: {e}")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Firebase token")

    firebase_uid = decoded["uid"]
    email = decoded.get("email")
    name = decoded.get("name")
    avatar_url = decoded.get("picture")

    result = await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    user = result.scalar_one_or_none()
    is_new_user = user is None

    if is_new_user:
        user = User(
            firebase_uid=firebase_uid,
            email=email,
            name=name,
            avatar_url=avatar_url,
        )
        db.add(user)
        await db.flush()
    else:
        if email and not user.email:
            user.email = email
        if avatar_url:
            user.avatar_url = avatar_url

    access_token = create_access_token({"sub": str(user.id)})
    refresh_token = create_refresh_token({"sub": str(user.id)})

    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=access_token,
        refresh_token=refresh_token,
        is_new_user=is_new_user,
    )


@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    body: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    payload = verify_refresh_token(body.refresh_token)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    new_access = create_access_token({"sub": str(user.id)})
    new_refresh = create_refresh_token({"sub": str(user.id)})

    return RefreshTokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.put("/profile", response_model=UserOut)
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    current_user.name = body.name
    return UserOut.model_validate(current_user)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
