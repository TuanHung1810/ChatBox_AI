from services.groq_service import GroqService

class ChatService:
    def __init__(self):
        self.groq_service = GroqService()
        self.user_sessions = {}
    
    def get_user_session(self, user_id: str):
        """Get or create user session"""
        if user_id not in self.user_sessions:
            self.user_sessions[user_id] = {
                'conversation_history': [],
                'current_csv': None
            }
        return self.user_sessions[user_id]
    
    def add_message(self, user_id: str, role: str, content: str, file_type: str = None, filename: str = None):
        """Add message to conversation history"""
        session = self.get_user_session(user_id)
        message = {
            'role': role, 
            'content': content,
            'file_type': file_type,
            'filename': filename
        }
        session['conversation_history'].append(message)
        return message
    
    def get_conversation_history(self, user_id: str):
        """Get conversation history for user"""
        session = self.get_user_session(user_id)
        return session['conversation_history']
    
    def clear_session(self, user_id: str):
        """Clear user session"""
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]
    
    def process_message(self, message: str, user_id: str = "default") -> str:
        """Process user message and generate response"""
        self.add_message(user_id, 'user', message)
        
        history = self.get_conversation_history(user_id)
        context_messages = []
        
        for msg in history[-6:]:
            context_messages.append({
                "role": "user" if msg['role'] == 'user' else "assistant", 
                "content": msg['content']
            })
        
        try:
            response = self.groq_service.chat_completion(
                messages=context_messages,
                max_tokens=500
            )
            
            self.add_message(user_id, 'assistant', response)
            return response
            
        except Exception as e:
            error_msg = f"Sorry, I encountered an error: {str(e)}"
            self.add_message(user_id, 'assistant', error_msg)
            return error_msg