class MultiChatApp {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.imageUpload = document.getElementById('imageUpload');
        this.csvUpload = document.getElementById('csvUpload');
        this.clearChatBtn = document.getElementById('clearChat');
        this.themeToggle = document.getElementById('themeToggle');
        this.activeFile = document.getElementById('activeFile');
        this.activeFileName = document.getElementById('activeFileName');
        this.removeFileBtn = document.getElementById('removeFile');
        
        this.csvUrlModal = document.getElementById('csvUrlModal');
        this.loadCsvUrlBtn = document.getElementById('loadCsvUrlBtn');
        this.csvUrlInput = document.getElementById('csvUrlInput');
        this.closeModal = document.getElementById('closeModal');
        this.cancelModal = document.getElementById('cancelModal');
        this.confirmLoadUrl = document.getElementById('confirmLoadUrl');
        
        this.userId = this.generateUserId();
        this.currentFile = null;
        this.currentFileType = null;
        this.isProcessing = false;
        
        this.initEventListeners();
        this.setupAutoResize();
        this.loadTheme();
        this.loadChatHistory();
    }

    initEventListeners() {
        this.sendButton.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        this.imageUpload.addEventListener('change', (e) => this.handleImageUpload(e));
        this.csvUpload.addEventListener('change', (e) => this.handleCsvUpload(e));
        this.clearChatBtn.addEventListener('click', () => this.clearChat());
        this.removeFileBtn.addEventListener('click', () => this.clearCurrentFile());

        this.loadCsvUrlBtn.addEventListener('click', () => this.openCsvUrlModal());
        this.closeModal.addEventListener('click', () => this.closeCsvUrlModal());
        this.cancelModal.addEventListener('click', () => this.closeCsvUrlModal());
        this.confirmLoadUrl.addEventListener('click', () => this.loadCsvFromUrl());
        
        this.csvUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.loadCsvFromUrl();
            }
        });
        
        this.csvUrlModal.addEventListener('click', (e) => {
            if (e.target === this.csvUrlModal) {
                this.closeCsvUrlModal();
            }
        });
        this.csvUrlInput.addEventListener('input', () => {
            const url = this.csvUrlInput.value.trim();
            this.confirmLoadUrl.disabled = !this.isValidUrl(url);
        });

        this.themeToggle.addEventListener('click', () => this.toggleTheme());

        document.addEventListener('paste', (e) => {
            this.handlePasteEvent(e);
        });

        this.setupDragAndDrop();

        document.addEventListener('click', (e) => {
            if (e.target.closest('.suggestion-card')) {
                const type = e.target.closest('.suggestion-card').getAttribute('data-suggestion');
                this.handleSuggestionClick(type);
            }
        });

        window.addEventListener('online', () => this.showStatus('Online', 'success'));
        window.addEventListener('offline', () => this.showStatus('Offline', 'error'));
    }

    handleSuggestionClick(type) {
        switch(type) {
            case 'chat':
                this.messageInput.value = 'Hello! Tell me about yourself.';
                this.messageInput.focus();
                break;
            case 'image':
                this.imageUpload.click();
                break;
            case 'csv':
                this.openCsvUrlModal();
                break;
        }
    }

    generateUserId() {
        let userId = localStorage.getItem('chatUserId');
        if (!userId) {
            userId = 'user_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('chatUserId', userId);
        }
        return userId;
    }

    setupAutoResize() {
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    setupDragAndDrop() {
        const dropArea = document.querySelector('.main-content');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, preventDefaults, false);
        });

        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        ['dragenter', 'dragover'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            dropArea.addEventListener(eventName, () => {
                dropArea.classList.remove('drag-over');
            }, false);
        });

        dropArea.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    this.setCurrentFile(file, 'image');
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    this.setCurrentFile(file, 'csv');
                } else {
                    this.showStatus('Unsupported file type', 'error');
                }
            }
        });
    }

    async sendMessage() {
        if (this.isProcessing) return;
        
        const message = this.messageInput.value.trim();
        if (!message && !this.currentFile) {
            this.showStatus('Please enter a message or select a file', 'warning');
            return;
        }

        this.isProcessing = true;
        this.sendButton.disabled = true;

        try {
            if (this.currentFile) {
                await this.sendFileMessage(message);
            } else {
                await this.sendTextMessage(message);
            }

            this.messageInput.value = '';
            this.messageInput.style.height = 'auto';
        } catch (error) {
            console.error('Send message error:', error);
            this.showStatus('Failed to send message', 'error');
        } finally {
            this.isProcessing = false;
            this.sendButton.disabled = false;
        }
    }

    async sendTextMessage(message) {
        this.hideWelcomeMessage();
        this.addMessage(message, 'user');
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    user_id: this.userId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.removeTypingIndicator();

            if (data.success) {
                this.addMessage(data.response, 'bot');
                this.saveChatHistory();
            } else {
                this.addMessage(`Error: ${data.error}`, 'bot');
            }
        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Sorry, I encountered a technical issue. Please try again.', 'bot');
            console.error('Chat error:', error);
        }
    }

    async sendFileMessage(message) {
        this.hideWelcomeMessage();
        
        let userMessageContent = message.trim();
        
        if (this.currentFile) {
            if (this.currentFileType === 'image') {
                const imageUrl = URL.createObjectURL(this.currentFile);
                const finalMessage = userMessageContent ? `${userMessageContent}\n[${this.currentFile.name}]` : `[${this.currentFile.name}]`;
                this.addMessageWithFile(finalMessage, 'user', 'image', imageUrl);
            } else {
                const finalMessage = userMessageContent ? `${userMessageContent}\n[${this.currentFile.name}]` : `[${this.currentFile.name}]`;
                this.addMessage(finalMessage, 'user');
            }
        }
        
        this.showTypingIndicator();

        try {
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('message', userMessageContent);
            formData.append('user_id', this.userId);

            let endpoint = '';
            if (this.currentFileType === 'image') {
                endpoint = '/api/upload/image';
            } else if (this.currentFileType === 'csv') {
                endpoint = '/api/upload/csv';
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.removeTypingIndicator();

            if (data.success) {
                this.addMessage(data.response, 'bot');
                this.saveChatHistory();
            } else {
                this.addMessage(`Error: ${data.error}`, 'bot');
            }

            this.clearCurrentFile();

        } catch (error) {
            this.removeTypingIndicator();
            this.addMessage('Sorry, I encountered an error while processing your file. Please try again.', 'bot');
            console.error('File upload error:', error);
        }
    }

    openCsvUrlModal() {
        this.csvUrlModal.style.display = 'block';
        this.csvUrlInput.value = '';
        this.csvUrlInput.focus();
        this.confirmLoadUrl.disabled = true;
    }

    closeCsvUrlModal() {
        this.csvUrlModal.style.display = 'none';
        this.csvUrlInput.value = '';
    }

    async loadCsvFromUrl() {
        let url = this.csvUrlInput.value.trim();
        
        if (!url) {
            this.showStatus('Please enter a CSV URL', 'warning');
            return;
        }

        url = this.convertToRawGithubUrl(url);

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        if (!this.isValidUrl(url)) {
            this.showStatus('Please enter a valid URL', 'error');
            return;
        }

        this.confirmLoadUrl.disabled = true;
        this.confirmLoadUrl.textContent = 'Loading...';

        try {
            this.closeCsvUrlModal();
            this.hideWelcomeMessage();
            
            const userMessage = `[${url}]`;
            this.addMessage(userMessage, 'user');
            
            this.showTypingIndicator();

            const formData = new FormData();
            formData.append('url', url);
            formData.append('user_id', this.userId);
            formData.append('message', '');
            const response = await fetch('/api/upload/csv', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            this.removeTypingIndicator();

            if (data.success) {
                this.addMessage(data.response, 'bot');
                this.saveChatHistory();
                this.showStatus('CSV loaded successfully from URL', 'success');
            } else {
                this.addMessage(`Error: ${data.error}`, 'bot');
                this.showStatus('Failed to load CSV', 'error');
            }

        } catch (error) {
            this.removeTypingIndicator();
            console.error('CSV URL loading error:', error);
            
            let errorMessage = 'Sorry, I encountered an error while loading the CSV from URL. ';
            
            if (error.message.includes('404') || error.message.includes('Not Found')) {
                errorMessage += 'The URL might be invalid or the file was not found.';
            } else if (error.message.includes('network') || error.message.includes('Network')) {
                errorMessage += 'There seems to be a network issue. Please check your connection.';
            } else if (error.message.includes('CSV') || error.message.includes('parse')) {
                errorMessage += 'The URL might not point to a valid CSV file.';
            } else if (error.message.includes('tokenizing')) {
                errorMessage += 'The CSV file format is invalid. Please check if it\'s a properly formatted CSV.';
            } else {
                errorMessage += 'Please check the URL and try again.';
            }
            
            this.addMessage(errorMessage, 'bot');
            this.showStatus('Error loading CSV', 'error');
        } finally {
            this.confirmLoadUrl.disabled = false;
            this.confirmLoadUrl.textContent = 'Load CSV';
        }
    }

    isValidUrl(string) {
        try {
            const url = new URL(string);
            return url.protocol === 'http:' || url.protocol === 'https:';
        } catch (_) {
            return false;
        }
    }
    convertToRawGithubUrl(url) {

        if (url.includes('github.com') && !url.includes('raw.githubusercontent.com')) {
            url = url.replace('github.com', 'raw.githubusercontent.com');
            url = url.replace('/blob/', '/');
        }
        return url;
    }

    addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (typeof content === 'string') {
            const lines = content.split('\n');
            let inCodeBlock = false;
            let codeContent = '';
            
            lines.forEach(line => {
                if (line.trim().startsWith('![') && line.includes('](data:image')) {
                    const altText = line.match(/\!\[(.*?)\]/)?.[1] || 'Chart';
                    const src = line.match(/\]\((.*?)\)/)?.[1];
                    if (src) {
                        const imgContainer = document.createElement('div');
                        imgContainer.className = 'chart-container';
                        imgContainer.style.textAlign = 'center';
                        imgContainer.style.margin = '15px 0';
                        
                        const img = document.createElement('img');
                        img.src = src;
                        img.alt = altText;
                        img.style.maxWidth = '100%';
                        img.style.maxHeight = '400px';
                        img.style.borderRadius = '8px';
                        img.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                        img.style.border = '1px solid #e5e7eb';
                        
                        imgContainer.appendChild(img);
                        messageContent.appendChild(imgContainer);
                    }
                    return;
                }
                
                if (line.trim().startsWith('```')) {
                    if (!inCodeBlock) {
                        inCodeBlock = true;
                        codeContent = '';
                    } else {
                        inCodeBlock = false;
                        const pre = document.createElement('pre');
                        const code = document.createElement('code');
                        code.textContent = codeContent;
                        pre.appendChild(code);
                        messageContent.appendChild(pre);
                        codeContent = '';
                    }
                    return;
                }
                
                if (inCodeBlock) {
                    codeContent += line + '\n';
                    return;
                }
                
                if (line.trim()) {
                    const p = document.createElement('p');
                    let formattedLine = line
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/`(.*?)`/g, '<code>$1</code>')
                        .replace(/^- (.*$)/gim, '<li>$1</li>')
                        .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
                    
                    if (formattedLine.startsWith('<li>')) {
                        if (!messageContent.querySelector('ul, ol')) {
                            const list = document.createElement('ul');
                            list.style.marginLeft = '20px';
                            messageContent.appendChild(list);
                        }
                        const list = messageContent.querySelector('ul, ol');
                        const li = document.createElement('li');
                        li.innerHTML = formattedLine.replace(/<\/?li>/g, '');
                        list.appendChild(li);
                    } else {
                        p.innerHTML = formattedLine;
                        messageContent.appendChild(p);
                    }
                }
            });
        }
        
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        messageContent.appendChild(timestamp);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        this.scrollToBottom();
        this.saveChatHistory();
    }

    addMessageWithFile(content, type, fileType, fileUrl) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = type === 'user' ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        if (content && content.trim()) {
            const lines = content.split('\n');
            lines.forEach(line => {
                if (line.trim()) {
                    const p = document.createElement('p');
                    let formattedLine = line
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/^- (.*$)/gim, '<li>$1</li>')
                        .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
                    
                    if (formattedLine.startsWith('<li>')) {
                        if (!messageContent.querySelector('ul, ol')) {
                            const list = document.createElement('ul');
                            list.style.marginLeft = '20px';
                            messageContent.appendChild(list);
                        }
                        const list = messageContent.querySelector('ul, ol');
                        const li = document.createElement('li');
                        li.innerHTML = formattedLine.replace(/<\/?li>/g, '');
                        list.appendChild(li);
                    } else {
                        const p = document.createElement('p');
                        p.innerHTML = formattedLine;
                        messageContent.appendChild(p);
                    }
                }
            });
        }
        
        if (fileType === 'image' && fileUrl) {
            const imgContainer = document.createElement('div');
            imgContainer.className = 'file-preview-container';
            
            const img = document.createElement('img');
            img.src = fileUrl;
            img.className = 'file-preview';
            img.alt = 'Uploaded image';
            img.onload = () => URL.revokeObjectURL(fileUrl);
            
            imgContainer.appendChild(img);
            messageContent.appendChild(imgContainer);
        }
        
        const timestamp = document.createElement('div');
        timestamp.className = 'timestamp';
        timestamp.textContent = new Date().toLocaleTimeString();
        messageContent.appendChild(timestamp);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(messageContent);
        this.chatMessages.appendChild(messageDiv);
        
        this.scrollToBottom();
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message';
        typingDiv.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content typing-indicator';
        
        const typingText = document.createElement('span');
        typingText.textContent = 'AI is typing';
        typingText.style.marginRight = '10px';
        typingText.style.color = '#6b7280';
        messageContent.appendChild(typingText);
        
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'typing-dot';
            messageContent.appendChild(dot);
        }
        
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(messageContent);
        this.chatMessages.appendChild(typingDiv);
        
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    hideWelcomeMessage() {
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'none';
        }
    }

    showWelcomeMessage() {
        const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.style.display = 'block';
        } else {
            this.createWelcomeMessage();
        }
    }

    createWelcomeMessage() {
        const welcomeMessage = document.createElement('div');
        welcomeMessage.className = 'welcome-message';
        welcomeMessage.innerHTML = `
            <div class="welcome-icon">
                <i class="fas fa-robot"></i>
            </div>
            <h2>How can I help you today?</h2>
            <p>I'm your AI assistant capable of text chat, image analysis, and CSV data processing.</p>
            
            <div class="quick-suggestions">
                <div class="suggestion-card" data-suggestion="chat">
                    <i class="fas fa-comment"></i>
                    <h3>Chat & Conversation</h3>
                    <p>Have normal conversations and get information</p>
                </div>
                <div class="suggestion-card" data-suggestion="image">
                    <i class="fas fa-image"></i>
                    <h3>Image Analysis</h3>
                    <p>Upload and discuss images with AI vision</p>
                </div>
                <div class="suggestion-card" data-suggestion="csv">
                    <i class="fas fa-file-csv"></i>
                    <h3>CSV Analysis</h3>
                    <p>Analyze data from CSV file or URL</p>
                </div>
            </div>
        `;
        
        this.chatMessages.appendChild(welcomeMessage);
        
        welcomeMessage.querySelectorAll('.suggestion-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const type = e.currentTarget.getAttribute('data-suggestion');
                this.handleSuggestionClick(type);
            });
        });
    }

    async clearChat() {
        if (!confirm('Are you sure you want to clear the chat history?')) {
            return;
        }

        try {
            const response = await fetch(`/api/clear/${this.userId}`, {
                method: 'POST'
            });
            
            if (response.ok) {
                while (this.chatMessages.firstChild) {
                    this.chatMessages.removeChild(this.chatMessages.firstChild);
                }
                
                this.createWelcomeMessage();
                this.clearCurrentFile();
                localStorage.removeItem(`chatHistory_${this.userId}`);
                
                this.showStatus('Chat cleared successfully', 'success');
            } else {
                throw new Error('Failed to clear chat on server');
            }
        } catch (error) {
            console.error('Error clearing chat:', error);
            this.showStatus('Error clearing chat', 'error');
            
            this.createWelcomeMessage();
        }
    }

    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.toggle('dark-mode');
        const icon = this.themeToggle.querySelector('i');
        
        if (isDark) {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
        
        localStorage.setItem('chatTheme', isDark ? 'dark' : 'light');
    }

    loadTheme() {
        const savedTheme = localStorage.getItem('chatTheme') || 'light';
        const body = document.body;
        const icon = this.themeToggle.querySelector('i');
        
        if (savedTheme === 'dark') {
            body.classList.add('dark-mode');
            icon.className = 'fas fa-sun';
        } else {
            body.classList.remove('dark-mode');
            icon.className = 'fas fa-moon';
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                this.showStatus('Image size must be less than 10MB', 'error');
                return;
            }
            this.setCurrentFile(file, 'image');
            this.showStatus('Image ready to send', 'success');
        }
    }

    handleCsvUpload(event) {
        const file = event.target.files[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                this.showStatus('CSV file size must be less than 5MB', 'error');
                return;
            }
            this.setCurrentFile(file, 'csv');
            this.showStatus('CSV file ready to analyze', 'success');
        }
    }

    setCurrentFile(file, type) {
        this.currentFile = file;
        this.currentFileType = type;
        this.activeFileName.textContent = file.name;
        this.activeFile.style.display = 'flex';
        
        this.messageInput.focus();
    }

    clearCurrentFile() {
        this.currentFile = null;
        this.currentFileType = null;
        this.activeFile.style.display = 'none';
        this.imageUpload.value = '';
        this.csvUpload.value = '';
    }

    handlePasteEvent(event) {
        const items = event.clipboardData?.items;
        if (items) {
            for (let item of items) {
                if (item.type.indexOf('image') !== -1) {
                    event.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                        this.setCurrentFile(file, 'image');
                        this.showStatus('Image pasted and ready to send', 'success');
                        break;
                    }
                }
            }
        }
    }

    showStatus(message, type = 'info') {
        const existingStatus = document.getElementById('statusMessage');
        if (existingStatus) {
            existingStatus.remove();
        }

        const statusDiv = document.createElement('div');
        statusDiv.id = 'statusMessage';
        statusDiv.className = `status-message status-${type}`;
        statusDiv.textContent = message;

        document.body.appendChild(statusDiv);

        setTimeout(() => {
            if (statusDiv.parentNode) {
                statusDiv.remove();
            }
        }, 3000);
    }

    saveChatHistory() {
        const messages = this.chatMessages.innerHTML;
        localStorage.setItem(`chatHistory_${this.userId}`, messages);
    }

    loadChatHistory() {
        const savedHistory = localStorage.getItem(`chatHistory_${this.userId}`);
        if (savedHistory && savedHistory.length > 0) {
            this.chatMessages.innerHTML = savedHistory;
            this.scrollToBottom();
            this.hideWelcomeMessage();
            
            const welcomeMessage = this.chatMessages.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.querySelectorAll('.suggestion-card').forEach(card => {
                    card.addEventListener('click', (e) => {
                        const type = e.currentTarget.getAttribute('data-suggestion');
                        this.handleSuggestionClick(type);
                    });
                });
            }
        }
    }

    exportChat() {
        const messages = [];
        this.chatMessages.querySelectorAll('.message').forEach(msg => {
            const type = msg.classList.contains('user-message') ? 'User' : 'AI';
            const content = msg.querySelector('.message-content').textContent;
            const timestamp = msg.querySelector('.timestamp')?.textContent || '';
            messages.push(`[${timestamp}] ${type}: ${content}`);
        });
        
        const blob = new Blob([messages.join('\n\n')], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new MultiChatApp();
});

const additionalStyles = `
.drag-over {
    background: rgba(102, 126, 234, 0.1) !important;
    border: 2px dashed #667eea !important;
}

.status-message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    z-index: 1000;
    animation: slideInRight 0.3s ease;
}

.status-success {
    background: #10b981;
}

.status-error {
    background: #ef4444;
}

.status-warning {
    background: #f59e0b;
}

.status-info {
    background: #3b82f6;
}

.file-preview-container {
    margin: 10px 0;
}

.file-preview {
    max-width: 300px;
    max-height: 200px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
}

.typing-indicator {
    display: flex;
    align-items: center;
    padding: 12px 16px;
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

body.dark-mode .file-preview {
    border-color: #333;
}

body.dark-mode .drag-over {
    background: rgba(102, 126, 234, 0.2) !important;
    border-color: #667eea !important;
}
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);