import pandas as pd
import requests
import os
import uuid
from services.groq_service import GroqService

class CSVAnalyzer:
    def __init__(self, chat_service=None):
        self.groq_service = GroqService()
        self.chat_service = chat_service
    
    def download_csv_from_url(self, url: str) -> str:
        """Download CSV from URL"""
        try:
            headers = {'User-Agent': 'Mozilla/5.0'}
            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()
            
            filename = f"remote_{uuid.uuid4()}.csv"
            file_path = os.path.join('uploads', filename)
            os.makedirs('uploads', exist_ok=True)
            
            with open(file_path, 'wb') as f:
                f.write(response.content)
            
            return file_path
            
        except Exception as e:
            raise Exception(f"Error downloading CSV: {str(e)}")
    
    def analyze_csv_file(self, file_path: str, question: str = "", user_id: str = "default") -> str:
        """Analyze CSV file"""
        try:
            df = pd.read_csv(file_path)
            
            if self.chat_service:
                history = self.chat_service.get_conversation_history(user_id)
            else:
                from services.chat_service import ChatService
                chat_service = ChatService()
                history = chat_service.get_conversation_history(user_id)
            
            if question.strip():
                prompt = question + "\n\n"
            else:
                prompt = "Please overview this CSV data and respond in the same language as the previous conversation:\n\n"
            
            prompt += f"Dataset: {len(df)} rows, {len(df.columns)} columns\n"
            prompt += f"Columns: {', '.join(df.columns)}\n"
            prompt += f"Sample data:\n{df.head(3).to_string()}"
            
            messages = self._build_context_messages(history, prompt)
            return self.groq_service.chat_completion(messages=messages)
                
        except Exception as e:
            return f"Error analyzing CSV: {str(e)}"
    
    def _build_context_messages(self, history: list, prompt: str) -> list:
        """Build context messages for conversation"""
        messages = []
        
        for msg in history[-4:]:
            messages.append({
                "role": msg['role'],
                "content": msg['content']
            })
        
        messages.append({"role": "user", "content": prompt})
        return messages