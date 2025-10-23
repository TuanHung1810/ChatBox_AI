import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    """Application settings configuration"""
    
    # Groq Configuration
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
    GROQ_VISION_MODEL = os.getenv("GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")
    
    # Application Settings
    MAX_RESPONSE_TOKENS = int(os.getenv("MAX_RESPONSE_TOKENS", "500"))
    MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))
    UPLOAD_FOLDER = os.getenv("UPLOAD_FOLDER", "uploads")
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")

settings = Settings()