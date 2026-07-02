from fastapi import APIRouter, HTTPException, status
from core.database import get_db
from core.security import hash_password, verify_password, create_token
from models.schemas import UserRegister, UserLogin, TokenResponse
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=TokenResponse)
async def register(body: UserRegister):
    db = get_db()
    existing = await db["users"].find_one({"username": body.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    result = await db["users"].insert_one({
        "username": body.username,
        "password": hash_password(body.password),
        "created_at": datetime.utcnow(),
    })
    token = create_token({"sub": str(result.inserted_id)})
    return TokenResponse(access_token=token, username=body.username)

@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin):
    db = get_db()
    user = await db["users"].find_one({"username": body.username})
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token({"sub": str(user["_id"])})
    return TokenResponse(access_token=token, username=user["username"])
