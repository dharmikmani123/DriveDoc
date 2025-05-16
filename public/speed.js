// Initialize map
let map;
let marker;
let watchId;
let departurePoint = null;
let destinationPoint = null;
let tripStartTime = null;
let routeControl = null;
let departureMarker = null;
let destinationMarker = null;
let lastSpeed = 0;
let notificationSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');

function initMap() {    

    map = L.map('map').setView([0, 0], 15);


    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);


    const customIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });


    const departureIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });

    const destinationIcon = L.icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        shadowSize: [41, 41]
    });


    marker = L.marker([0, 0], {icon: customIcon}).addTo(map);

    const departureInput = document.getElementById('departure-point');
    const destinationInput = document.getElementById('destination-point');

    departureInput.addEventListener('change', () => {
        geocodeLocation(departureInput.value, 'departure');
    });

    destinationInput.addEventListener('change', () => {
        geocodeLocation(destinationInput.value, 'destination');
    });
}


async function geocodeLocation(address, type) {
    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
        const data = await response.json();
        
        if (data && data[0]) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            
            if (type === 'departure') {
                departurePoint = [lat, lon];
                document.getElementById('departure-coords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                
            
                if (departureMarker) {
                    departureMarker.setLatLng([lat, lon]);
                } else {
                    departureMarker = L.marker([lat, lon], {
                        icon: L.icon({
                            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41]
                        })
                    }).addTo(map);
                }
            } else {
                destinationPoint = [lat, lon];
                document.getElementById('destination-coords').textContent = `${lat.toFixed(6)}, ${lon.toFixed(6)}`;
                
                
                if (destinationMarker) {
                    destinationMarker.setLatLng([lat, lon]);
                } else {
                    destinationMarker = L.marker([lat, lon], {
                        icon: L.icon({
                            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                            iconSize: [25, 41],
                            iconAnchor: [12, 41]
                        })
                    }).addTo(map);
                }
            }

           
            if (departurePoint && destinationPoint) {
                calculateRoute();
            }
        }
    } catch (error) {
        console.error('Geocoding error:', error);
    }
}


function calculateRoute() {
   
    if (routeControl) {
        map.removeControl(routeControl);
    }

    
    routeControl = L.Routing.control({
        waypoints: [
            L.latLng(departurePoint[0], departurePoint[1]),
            L.latLng(destinationPoint[0], destinationPoint[1])
        ],
        routeWhileDragging: true,
        show: true,
        addWaypoints: false,
        draggableWaypoints: false,
        fitSelectedRoutes: true,
        showAlternatives: false,
        lineOptions: {
            styles: [{color: '#3388ff', opacity: 0.7, weight: 5}]
        }
    }).addTo(map);

    
    routeControl.on('routesfound', function(e) {
        const routes = e.routes;
        const summary = routes[0].summary;
        
        
        document.getElementById('trip-distance').textContent = (summary.totalDistance / 1000).toFixed(1);
        document.getElementById('eta').textContent = formatDuration(summary.totalTime);
        
        
        if (!tripStartTime) {
            tripStartTime = Date.now();
        }
    });
}

function formatDuration(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}


function updateGPSStatus(connected) {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.querySelector('.status-text');
    
    if (connected) {
        statusDot.classList.add('connected');
        statusText.textContent = 'GPS Status: Connected';
    } else {
        statusDot.classList.remove('connected');
        statusText.textContent = 'GPS Status: Disconnected';
    }
}


function updateSignalStrength(strength) {
    const bars = document.querySelectorAll('.bar');
    const signalText = document.querySelector('.signal-text');
    
    
    bars.forEach(bar => bar.classList.remove('active'));
    
    
    for (let i = 0; i < strength; i++) {
        bars[i].classList.add('active');
    }
    
    
    const strengthTexts = ['No Signal', 'Weak', 'Fair', 'Good', 'Excellent'];
    signalText.textContent = strengthTexts[strength];
}


function getMobileSignalStrength() {
    
    return Math.floor(Math.random() * 5);
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                console.log('Notification permission granted');
            }
        });
    }
}

function playNotificationSound() {
    notificationSound.play().catch(error => {
        console.error('Error playing sound:', error);
    });
}

function showSpeedNotification(speed) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Speed Alert', {
            body: `Vehicle speed has increased to ${speed} km/h`,
            icon: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
        });
        playNotificationSound();
    }
}

function updateLocation(position) {
    const { latitude, longitude, speed } = position.coords;
    const currentSpeed = Math.round(speed * 3.6); // Convert m/s to km/h
    
    if (currentSpeed >= 1 && lastSpeed < 1) {
        showSpeedNotification(currentSpeed);
    }
    
  
    lastSpeed = currentSpeed;
    
    
    const newPosition = [latitude, longitude];
    map.setView(newPosition, 15);
    marker.setLatLng(newPosition);
    
   
    const speedValue = document.querySelector('.speed-value');
    speedValue.textContent = currentSpeed;
    
   
    const locationText = document.getElementById('location');
    locationText.textContent = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
    
     const lastUpdate = document.getElementById('last-update');
    lastUpdate.textContent = new Date().toLocaleTimeString();

       if (tripStartTime) {
        const elapsed = Math.floor((Date.now() - tripStartTime) / 1000);
        document.getElementById('time-elapsed').textContent = formatDuration(elapsed);
    }
}


function handleError(error) {
    console.error('Error:', error);
    updateGPSStatus(false);
}

function startTracking() {
    if (navigator.geolocation) {
        updateGPSStatus(true);
        

        watchId = navigator.geolocation.watchPosition(
            (position) => {
                updateLocation(position);
                updateSignalStrength(getMobileSignalStrength());
            },
            handleError,
            {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    startTracking();
    requestNotificationPermission();
}); 