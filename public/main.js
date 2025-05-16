// Mobile menu functionality
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenuBtn = document.querySelector('.mobile-menu');
    const header = document.querySelector('header');

    // Create mobile nav if it doesn't exist
    if (!document.querySelector('.mobile-nav')) {
        const mobileNav = document.createElement('div');
        mobileNav.className = 'mobile-nav';
        const navContent = document.querySelector('nav ul').cloneNode(true);
        mobileNav.appendChild(navContent);
        header.appendChild(mobileNav);
    }

    const mobileNav = document.querySelector('.mobile-nav');

    mobileMenuBtn.addEventListener('click', function() {
        mobileNav.classList.toggle('active');
        mobileMenuBtn.classList.toggle('active');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.mobile-menu') && !event.target.closest('.mobile-nav')) {
            mobileNav.classList.remove('active');
            mobileMenuBtn.classList.remove('active');
        }
    });
});

// Handle API URLs based on environment
const API_BASE_URL = window.APP_CONFIG?.API_URL || 'http://localhost:3000';

// Function to fetch charging stations
async function fetchChargingStations() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/charging-stations`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching charging stations:', error);
        return [];
    }
}

// Initialize charging stations if on the charging stations page
if (window.location.pathname.includes('trafics.html')) {
    document.addEventListener('DOMContentLoaded', async function() {
        try {
            const stations = await fetchChargingStations();
            displayChargingStations(stations);
        } catch (error) {
            console.error('Error initializing charging stations:', error);
            showError('Unable to load charging stations. Please try again later.');
        }
    });
}

// Function to display charging stations
function displayChargingStations(stations) {
    const container = document.querySelector('.charging-stations-container');
    if (!container) return;

    if (!stations || stations.length === 0) {
        container.innerHTML = '<p class="error-message">No charging stations found.</p>';
        return;
    }

    const stationsHTML = stations.map(station => `
        <div class="station-card">
            <h3>${station.name}</h3>
            <p><i class="fas fa-map-marker-alt"></i> ${station.location}</p>
            <p><i class="fas fa-charging-station"></i> ${station.availablePoints} points available</p>
            <p><i class="fas fa-clock"></i> ${station.status}</p>
            <button onclick="navigateToStation('${station.location}')" class="btn-primary">
                Navigate
            </button>
        </div>
    `).join('');

    container.innerHTML = stationsHTML;
}

// Function to show error messages
function showError(message) {
    const container = document.querySelector('.charging-stations-container');
    if (container) {
        container.innerHTML = `<p class="error-message">${message}</p>`;
    }
}

// Function to navigate to a charging station
function navigateToStation(location) {
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`, '_blank');
} 