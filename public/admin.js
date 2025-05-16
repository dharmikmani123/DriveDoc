// Socket connection
const socket = io();

// DOM Elements
const messagesTableBody = document.getElementById('messagesTableBody');
const roomFilter = document.getElementById('roomFilter');
const typeFilter = document.getElementById('typeFilter');
const dateFilter = document.getElementById('dateFilter');
const applyFilters = document.getElementById('applyFilters');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');
const pageInfo = document.getElementById('pageInfo');

// Stats Elements
const totalMessages = document.getElementById('totalMessages');
const activeRooms = document.getElementById('activeRooms');
const messagesToday = document.getElementById('messagesToday');

// Reply Modal Elements
const replyModal = document.getElementById('replyModal');
const replyRoom = document.getElementById('replyRoom');
const replyUser = document.getElementById('replyUser');
const replyMessage = document.getElementById('replyMessage');
const sendReply = document.getElementById('sendReply');
const cancelReply = document.getElementById('cancelReply');
const closeModal = document.querySelector('.close');

// State
let currentPage = 1;
let totalPages = 1;
let currentFilters = {
    room: '',
    type: '',
    date: ''
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set up event listeners first
    setupEventListeners();
    
    // Then load initial data
    loadInitialData();
});

function setupEventListeners() {
    applyFilters.addEventListener('click', () => {
        currentFilters = {
            room: roomFilter.value,
            type: typeFilter.value,
            date: dateFilter.value
        };
        currentPage = 1;
        loadMessages();
    });

    prevPage.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadMessages();
        }
    });

    nextPage.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            loadMessages();
        }
    });

    // Socket event listeners
    socket.on('connect', () => {
        console.log('Connected to server');
        socket.emit('join', 'admin-room');
    });

    socket.on('message', (message) => {
        console.log('New message received:', message);
        addMessageToTable(message);
        loadStats();
    });

    socket.on('admin:reply', (reply) => {
        console.log('Reply sent:', reply);
        if (reply.success) {
            addMessageToTable({
                room: reply.room,
                user: 'Jarvis',
                content: reply.message,
                type: 'text',
                timestamp: new Date(),
                _id: reply._id
            });
        }
    });
}

async function loadInitialData() {
    try {
        await Promise.all([
            loadRooms(),
            loadMessages(),
            loadStats()
        ]);
    } catch (error) {
        console.error('Error loading initial data:', error);
        showError('Failed to load initial data. Please refresh the page.');
    }
}

async function loadRooms() {
    try {
        const response = await fetch('/api/rooms');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const rooms = await response.json();
        console.log('Loaded rooms:', rooms);

        // Clear existing options except the first one
        while (roomFilter.options.length > 1) {
            roomFilter.remove(1);
        }

        // Add new room options
        rooms.forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = room;
            roomFilter.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading rooms:', error);
        showError('Failed to load rooms. Please try again.');
    }
}

async function loadMessages() {
    try {
        const queryParams = new URLSearchParams({
            page: currentPage,
            ...currentFilters
        });

        const response = await fetch(`/api/messages?${queryParams}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        console.log('Loaded messages:', data);

        messagesTableBody.innerHTML = '';
        totalPages = data.totalPages;
        pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;

        if (data.messages && data.messages.length > 0) {
            data.messages.forEach(message => {
                addMessageToTable(message);
            });
        } else {
            messagesTableBody.innerHTML = '<tr><td colspan="6">No messages found</td></tr>';
        }

        // Update pagination buttons
        prevPage.disabled = currentPage === 1;
        nextPage.disabled = currentPage === totalPages;
    } catch (error) {
        console.error('Error loading messages:', error);
        showError('Failed to load messages. Please try again.');
    }
}

function addMessageToTable(message) {
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${message.room || 'N/A'}</td>
        <td>${message.user || 'Anonymous'}</td>
        <td>${message.content || ''}</td>
        <td>${message.type || 'text'}</td>
        <td>${new Date(message.timestamp).toLocaleString()}</td>
        <td>
            <button class="reply-btn" data-room="${message.room}" data-user="${message.user}">
                <i class="fas fa-reply"></i>
            </button>
            <button class="delete-btn" data-id="${message._id}">
                <i class="fas fa-trash"></i>
            </button>
        </td>
    `;
    
    // Add to the top of the table
    messagesTableBody.insertBefore(row, messagesTableBody.firstChild);
    
    // Add event listeners to the new buttons
    const replyBtn = row.querySelector('.reply-btn');
    const deleteBtn = row.querySelector('.delete-btn');
    
    replyBtn.addEventListener('click', () => {
        openReplyModal(replyBtn.dataset.room, replyBtn.dataset.user);
    });
    
    deleteBtn.addEventListener('click', () => {
        deleteMessage(deleteBtn.dataset.id);
    });
}

async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();
        
        totalMessages.textContent = stats.totalMessages || 0;
        activeRooms.textContent = stats.activeRooms || 0;
        messagesToday.textContent = stats.messagesToday || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
        showError('Failed to load statistics. Please try again.');
    }
}

function showError(message) {
    // You can implement a proper error notification system here
    alert(message);
}

// Reply Modal Event Listeners
closeModal.addEventListener('click', () => {
    replyModal.style.display = 'none';
});

cancelReply.addEventListener('click', () => {
    replyModal.style.display = 'none';
});

sendReply.addEventListener('click', () => {
    const room = replyRoom.textContent;
    const user = replyUser.textContent;
    const message = replyMessage.value.trim();
    
    if (message) {
        socket.emit('admin:reply', {
            room,
            user,
            message,
            timestamp: new Date()
        });
        replyModal.style.display = 'none';
        replyMessage.value = '';
    }
});

// Functions
function openReplyModal(room, user) {
    replyRoom.textContent = room;
    replyUser.textContent = user;
    replyModal.style.display = 'block';
    replyMessage.focus();
}

async function deleteMessage(messageId) {
    if (confirm('Are you sure you want to delete this message?')) {
        try {
            const response = await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE'
            });
            if (response.ok) {
                loadMessages();
                loadStats();
            }
        } catch (error) {
            console.error('Error deleting message:', error);
        }
    }
} 