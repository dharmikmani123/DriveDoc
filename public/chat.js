document.addEventListener('DOMContentLoaded', function() {
    
    const socket = io('http://localhost:3000');
    const chatMessages = document.getElementById('chatMessages');
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');
    const endChatButton = document.getElementById('endChat');
    const attachButton = document.getElementById('attachFile');
    const emojiButton = document.getElementById('emojiPicker');
    const statusElement = document.querySelector('.status');

 
    const roomId = 'support-room-' + Math.random().toString(36).substr(2, 9);
    
   
    socket.emit('join', roomId);

   
    messageInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
   
        socket.emit('typing', {
            user: 'User',
            isTyping: true,
            room: roomId
        });
    });

     let typingTimeout;
    messageInput.addEventListener('keyup', function() {
        clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            socket.emit('typing', {
                user: 'User',
                isTyping: false,
                room: roomId
            });
        }, 1000);
    });

   
    function sendMessage() {
        const message = messageInput.value.trim();
        if (message) {
              const messageElement = document.createElement('div');
            messageElement.className = 'message user';
            messageElement.innerHTML = `<p>${message}</p>`;
            chatMessages.appendChild(messageElement);

            
            socket.emit('message', {
                room: roomId,
                user: 'User',
                content: message,
                type: 'text'
            });

            
            messageInput.value = '';
            messageInput.style.height = 'auto';

            
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

       sendButton.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

        endChatButton.addEventListener('click', function() {
        if (confirm('Are you sure you want to end this chat?')) {
            window.location.href = 'index.html';
        }
    });

        const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    attachButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        
        if (file.size > 5 * 1024 * 1024) {
            alert('File size exceeds 5MB limit');
            return;
        }

        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (data.success) {
               
                socket.emit('send_file', {
                    room: roomId,
                    user: 'User',
                    fileUrl: data.fileUrl,
                    filename: data.filename
                });
            } else {
                throw new Error(data.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file: ' + error.message);
        } finally {
            
            fileInput.value = '';
        }
    });

    
    socket.on('file_error', (data) => {
        console.error('File error:', data.error);
        alert('Failed to process file: ' + data.error);
    });

    
    emojiButton.addEventListener('click', function() {
       
        alert('Emoji picker will be implemented in the next version');
    });

   
    socket.on('connect', () => {
        console.log('Connected to chat server');
        statusElement.textContent = 'Online';
        statusElement.classList.add('online');
        statusElement.classList.remove('offline');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from chat server');
        statusElement.textContent = 'Offline';
        statusElement.classList.add('offline');
        statusElement.classList.remove('online');
    });

    
    socket.on('message', (data) => {
        console.log('Received message:', data); 
        const messageElement = document.createElement('div');
        messageElement.className = data.user === 'Jarvis' ? 'message admin' : 'message agent';
        messageElement.innerHTML = `
            <div class="message-header">
                <span class="sender">${data.user}</span>
                <span class="time">${new Date(data.timestamp).toLocaleTimeString()}</span>
            </div>
            <div class="message-content">
                <p>${data.content}</p>
            </div>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('receive_file', (data) => {
        const messageElement = document.createElement('div');
        messageElement.className = 'message agent';
        
        if (data.fileUrl.startsWith('data:image/')) {
            messageElement.innerHTML = `
                <p>File: ${data.filename}</p>
                <img src="${data.fileUrl}" alt="Attachment" style="max-width: 200px; margin-top: 10px;">
            `;
        } else {
            messageElement.innerHTML = `
                <p>File: ${data.filename}</p>
                <a href="${data.fileUrl}" download>Download File</a>
            `;
        }
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });

    socket.on('user_typing', (data) => {
        if (data.isTyping) {
            
            const typingElement = document.createElement('div');
            typingElement.className = 'message system';
            typingElement.innerHTML = `<p>${data.user} is typing...</p>`;
            chatMessages.appendChild(typingElement);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        } else {
         
            const typingElements = document.querySelectorAll('.message.system');
            typingElements.forEach(el => {
                if (el.textContent.includes('is typing...')) {
                    el.remove();
                }
            });
        }
    });
}); 