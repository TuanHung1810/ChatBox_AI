from flask import Flask, render_template, request, jsonify, send_file
import os
import uuid
from werkzeug.utils import secure_filename

from config.settings import settings
from services.chat_service import ChatService
from services.vision_service import VisionService
from services.csv_analyzer import CSVAnalyzer

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = settings.UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = settings.MAX_FILE_SIZE

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

chat_service = ChatService()
vision_service = VisionService(chat_service)
csv_analyzer = CSVAnalyzer(chat_service)   

def allowed_file(filename, allowed_extensions):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in allowed_extensions

@app.route('/')
def index():
    """Main route"""
    return render_template('index.html')

@app.route('/api/chat', methods=['POST'])
def chat():
    """API endpoint for chat"""
    try:
        data = request.get_json()
        user_message = data.get('message', '').strip()
        user_id = data.get('user_id', 'default')
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        response = chat_service.process_message(user_message, user_id)
        
        return jsonify({
            'success': True,
            'response': response,
            'user_message': user_message
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload/image', methods=['POST'])
def upload_image():
    """API for image upload and processing"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        user_id = request.form.get('user_id', 'default')
        user_message = request.form.get('message', '').strip()
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename, {'png', 'jpg', 'jpeg', 'gif'}):
            filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(file_path)
            
            display_message = user_message if user_message else f"[{file.filename}]"
            chat_service.add_message(user_id, 'user', display_message, 'image', filename)
            
            analysis_result = vision_service.analyze_image(file_path, user_message, user_id)
            
            chat_service.add_message(user_id, 'assistant', analysis_result)
            
            return jsonify({
                'success': True,
                'response': analysis_result,
                'filename': filename
            })
        
        return jsonify({'error': 'Invalid file type'}), 400
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/upload/csv', methods=['POST'])
def upload_csv():
    """API for CSV upload and processing"""
    try:
        user_id = request.form.get('user_id', 'default')
        user_message = request.form.get('message', '').strip()
        
        file_path = None
        filename = None
        
        if 'file' in request.files and request.files['file'].filename:
            file = request.files['file']
            if file and allowed_file(file.filename, {'csv'}):
                filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                
        elif 'url' in request.form and request.form['url']:
            url = request.form['url'].strip()
            
            if not url:
                return jsonify({'error': 'URL cannot be empty'}), 400
            
            if not url.startswith(('http://', 'https://')):
                return jsonify({'error': 'URL must start with http:// or https://'}), 400
            
            try:
                file_path = csv_analyzer.download_csv_from_url(url)
                filename = f"remote_{uuid.uuid4()}.csv"
            except Exception as e:
                error_message = f"Cannot download CSV from URL: {str(e)}"
                return jsonify({'error': error_message}), 400
        else:
            return jsonify({'error': 'Please provide CSV file or URL'}), 400
        
        if user_message:
            display_message = user_message
        else:
            if filename:
                display_message = f"[{filename}]"
            else:
                display_message = "[CSV Data]"
        
        chat_service.add_message(user_id, 'user', display_message, 'csv', filename)
        
        analysis_result = csv_analyzer.analyze_csv_file(file_path, user_message, user_id)
        
        chat_service.add_message(user_id, 'assistant', analysis_result)
        
        return jsonify({
            'success': True,
            'response': analysis_result,
            'filename': filename
        })
        
    except Exception as e:
        error_msg = f"Error processing CSV: {str(e)}"
        return jsonify({
            'success': False,
            'error': error_msg
        }), 500

@app.route('/api/history/<user_id>')
def get_history(user_id):
    """API to get conversation history"""
    try:
        history = chat_service.get_conversation_history(user_id)
        return jsonify({'success': True, 'history': history})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/clear/<user_id>', methods=['POST'])
def clear_history(user_id):
    """API to clear conversation history"""
    try:
        chat_service.clear_session(user_id)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/uploads/<filename>')
def serve_upload(filename):
    """Serve uploaded files"""
    return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))

if __name__ == '__main__':
    app.run(debug=False, host='0.0.0.0', port=5000)