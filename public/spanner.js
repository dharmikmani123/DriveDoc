const YOUTUBE_API_KEY = 'AIzaSyBpg1HrjjFt_T0TjMzAenbetSeIG1qIBqE';
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

const COHERE_API_KEY = 'qthIuJD0remGaEl8bc5VXdV23zXSgBQ4QCHIGkDJ';
const COHERE_API_URL = 'https://api.cohere.ai/v1/chat';

const keywords = {
    'engine': {
        searchTerms: ['engine repair', 'engine fix', 'engine problems', 'engine maintenance'],
        keywords: ['engine', 'motor', 'overheating', 'check engine light', 'oil', 'spark plug', 'knocking', 'misfire']
    },
    'brake': {
        searchTerms: ['brake repair', 'brake system', 'brake maintenance', 'brake problems'],
        keywords: ['brake', 'braking', 'pedal', 'squeaking', 'grinding', 'stopping', 'pads', 'rotors']
    },
    'transmission': {
        searchTerms: ['transmission repair', 'transmission problems', 'transmission maintenance', 'transmission fix'],
        keywords: ['transmission', 'gear', 'shifting', 'clutch', 'automatic', 'manual', 'slipping', 'fluid']
    },
    'battery': {
        searchTerms: ['car battery', 'battery replacement', 'battery problems', 'battery maintenance'],
        keywords: ['battery', 'starting', 'jump start', 'dead battery', 'alternator', 'charge', 'power']
    },
    'tire': {
        searchTerms: ['tire repair', 'tire maintenance', 'tire problems', 'tire fix'],
        keywords: ['tire', 'wheel', 'alignment', 'balancing', 'flat', 'pressure', 'puncture', 'tread']
    }
};


const chatMessages = document.getElementById('chat-messages');
const userInput = document.getElementById('user-input');
const sendButton = document.getElementById('send-button');
const videoRecommendations = document.getElementById('video-recommendations');


function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user' : 'bot'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    
    contentDiv.appendChild(paragraph);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


async function getCohereResponse(message, context = '') {
    try {
        const response = await fetch(COHERE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${COHERE_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                context: context,
                model: 'command',
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            throw new Error('Failed to get response from Cohere API');
        }

        const data = await response.json();
        return data.text;
    } catch (error) {
        console.error('Error getting Cohere response:', error);
        return 'I apologize, but I\'m having trouble processing your request right now. Please try again later.';
    }
}

async function fetchVideos(issueType) {
    try {
        const searchTerms = keywords[issueType].searchTerms;
        const randomSearchTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
        
        const response = await fetch(
            `${YOUTUBE_API_URL}?part=snippet&q=${encodeURIComponent(randomSearchTerm + ' car repair')}&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
        );
        
        if (!response.ok) {
            throw new Error('Failed to fetch videos');
        }
        
        const data = await response.json();
        return data.items.map(item => ({
            title: item.snippet.title,
            description: item.snippet.description,
            videoId: item.id.videoId,
            thumbnail: item.snippet.thumbnails.high.url
        }));
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
}


async function displayVideos(issueType) {
    videoRecommendations.innerHTML = '';
    addMessage('Searching for relevant repair videos...');
    
    try {
        const videos = await fetchVideos(issueType);
        
        if (videos.length === 0) {
            addMessage('Sorry, I couldn\'t find any videos at the moment. Please try again later.');
            return;
        }
        
        videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            
            videoCard.innerHTML = `
                <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail">
                <div class="video-info">
                    <h3 class="video-title">${video.title}</h3>
                    <p class="video-description">${video.description.substring(0, 150)}...</p>
                    <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" class="video-link">
                        Watch Video <i class="fas fa-external-link-alt"></i>
                    </a>
                </div>
            `;
            
            videoRecommendations.appendChild(videoCard);
        });
    } catch (error) {
        addMessage('Sorry, there was an error fetching videos. Please try again later.');
    }
}

function analyzeIssue(userInput) {
    const input = userInput.toLowerCase();
    let detectedIssue = null;
    
    
    for (const [issue, data] of Object.entries(keywords)) {
        if (data.keywords.some(word => input.includes(word))) {
            detectedIssue = issue;
            break;
        }
    }
    
    return detectedIssue;
}

async function handleUserInput() {
    const message = userInput.value.trim();
    if (!message) return;
    
    addMessage(message, true);
    
    userInput.value = '';
    
    
    const issueType = analyzeIssue(message);
    
    if (issueType) {
       
        const context = `You are a vehicle repair expert. The user is having ${issueType} issues with their vehicle. Provide detailed repair instructions and advice. Be specific about the steps they should take to diagnose and fix the issue.`;
        
       
        const cohereResponse = await getCohereResponse(message, context);
        addMessage(cohereResponse);
        
       
        await displayVideos(issueType);
    } else {
        
        const context = 'You are a vehicle repair expert. Provide helpful advice about vehicle maintenance and repair.';
        const cohereResponse = await getCohereResponse(message, context);
        addMessage(cohereResponse);
        
        addMessage('You can mention issues related to: engine, brakes, transmission, battery, or tires.');
    }
}

sendButton.addEventListener('click', handleUserInput);
userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleUserInput();
    }
});

