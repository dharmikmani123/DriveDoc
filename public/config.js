// Configuration for API endpoints
const config = {
    API_URL: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : 'https://your-backend-app.railway.app', // Replace with your Railway URL
    SOCKET_URL: window.location.hostname === 'localhost'
        ? 'http://localhost:3000'
        : 'https://your-backend-app.railway.app' // Replace with your Railway URL
};

window.APP_CONFIG = config; 