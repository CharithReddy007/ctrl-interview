from motor.motor_asyncio import AsyncIOMotorClient
from core.config import settings

client: AsyncIOMotorClient = None
db = None

async def connect_db():
    global client, db
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client["ctrl_interview"]
    print("✅ Connected to MongoDB Atlas")

async def close_db():
    global client
    if client:
        client.close()
        print("MongoDB connection closed")

def get_db():
    return db
