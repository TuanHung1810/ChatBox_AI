import base64
from services.groq_service import GroqService

class VisionService:
    def __init__(self, chat_service=None):
        self.groq_service = GroqService()
        self.chat_service = chat_service
    
    def analyze_image(self, image_path: str, question: str = "", user_id: str = "default") -> str:
        """Analyze image using vision model"""
        try:
            with open(image_path, "rb") as image_file:
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            if self.chat_service:
                history = self.chat_service.get_conversation_history(user_id)
            else:
                from services.chat_service import ChatService
                chat_service = ChatService()
                history = chat_service.get_conversation_history(user_id)
            
            if question.strip():
                prompt = question
            else:
                prompt = "Describe this image in detail and provide a comprehensive analysis of what you see and respond in the same language as the previous conversation"
            
            messages = self._build_vision_messages(history, prompt, base64_image)
            return self.groq_service.vision_completion(messages)
            
        except Exception as e:
            return f"Error analyzing image: {str(e)}"
    
    def _build_vision_messages(self, history: list, question: str, base64_image: str) -> list:
        """Build vision messages for image analysis"""
        messages = []
        
        for msg in history[-3:]:
            messages.append({"role": msg['role'], "content": msg['content']})
        
        vision_message = {
            "role": "user",
            "content": [
                {"type": "text", "text": question},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}}
            ]
        }
        messages.append(vision_message)
        
        return messages