# AI Chat Assistant

A AI chatbot application with text conversation, image analysis, and CSV data processing capabilities.

## ✨ Features

- **💬 Smart Chat**: AI-powered conversations using Groq API
- **🖼️ Image Analysis**: Upload and analyze images with AI vision
- **📊 CSV Processing**: Data analysis and visualization from CSV files/URLs
- **🌙 Dark/Light Mode**: Customizable UI themes
- **📱 Responsive Design**: Works on all devices
- **🔗 CSV from URL**: Analyze data directly from GitHub, Google Sheets, etc.

## 🛠️ Technologies

- **Backend**: Flask, Python
- **AI API**: Groq (Llama models)
- **Frontend**: HTML5, CSS3, JavaScript
- **Data Processing**: Pandas, Matplotlib, Seaborn
- **File Handling**: Pillow, Request

## 📁 Project Structure

ChatBox_AI/
├── app.py                 # Main Flask application
├── requirements.txt       # Python dependencies
├── config/
│   └── settings.py       # Configuration settings
├── services/
│   ├── chat_service.py   # Chat functionality
│   ├── groq_service.py   # Groq API integration
│   ├── vision_service.py # Image analysis
│   └── csv_analyzer.py   # CSV data processing
├── static/
│   ├── css/
│   │   └── style.css     # Styling
│   └── js/
│       └── script.js     # Frontend logic
├── templates/
│   └── index.html        # Main template
└── uploads/              # File upload directory

## ⚡ Quick Start

### 1. Clone repository
`git clone https://github.com/your-username/ai-chat-assistant.git`
`cd ChatBox_AI`
### 2. Install dependencies
`pip install -r requirements.txt`
### 3.Setup environment variables
Create .env file and add your Groq API key
  `GROQ_API_KEY=your_groq_api_key_here
  GROQ_MODEL=llama-3.1-8b-instant
  GROQ_VISION_MODEL=meta-llama/llama-4-scout-17b-16e-instruct
  MAX_RESPONSE_TOKENS=500
  MAX_FILE_SIZE=10485760
  UPLOAD_FOLDER=uploads`
### 4. Run the application
`python app.py`
### 5. Open your browser
Navigate to: `http://localhost:5000` or click on link in terminal.

## 🔑 Getting Groq API Key

1. Sign up at Groq Console
2. Create a new API key
3. Add it to your .env file

## 🎯 Usage Examples

### Text Chat
- Have normal conversations with AI
- Get information and answers to questions

### Image
- Upload images via drag & drop or file selection
- Ask questions about the image content

### CSV Data Analysis

- Upload CSV files or provide URLs
- Automatic data visualization (charts, graphs)
- Ask questions about your data
- Generate insights and statistics
### Link demo
https://drive.google.com/file/d/12Sv-3PXk5I3lgDxT1gokj6ZX3XVIPmo3/view?usp=sharing

## 👨‍💻 Author
Tuan Hung
