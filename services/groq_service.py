import os
from groq import Groq
from config.settings import settings

class GroqService:
    def __init__(self):
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY is required")
        self.client = Groq(api_key=settings.GROQ_API_KEY)
    
    def chat_completion(self, messages: list, max_tokens: int = 500) -> str:
        """Generate chat completion"""
        try:
            system_message = {
                "role": "system",
                "content": "You are a helpful assistant. Respond appropriately based on the conversation context."
            }
            
            response = self.client.chat.completions.create(
                model=settings.GROQ_MODEL,
                messages=[system_message] + messages,
                max_tokens=max_tokens,
                temperature=0.5
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error: {str(e)}"
    
    def vision_completion(self, messages: list, max_tokens: int = 1024) -> str:
        """Generate vision completion for image analysis"""
        try:
            system_message = {
                "role": "system", 
                "content": "You are a helpful assistant. Respond appropriately based on the conversation context."
            }
            
            response = self.client.chat.completions.create(
                model=settings.GROQ_VISION_MODEL,
                messages=[system_message] + messages,
                max_tokens=max_tokens,
                temperature=0.5
            )
            return response.choices[0].message.content
            
        except Exception as e:
            return f"Error analyzing image: {str(e)}"