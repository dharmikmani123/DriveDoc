let map;
let trafficLayer;
let markers = [];
let infoWindow;

function handleMapError(error) {
    console.error('Error loading map:', error);
    const mapDiv = document.getElementById('map');
    mapDiv.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <h3>Error Loading Map</h3>
            <p>${error.message || 'Could not load Google Maps. Please try again.'}</p>
            <button onclick="window.location.reload()">Retry</button>
        </div>
    `;
}

function initMap() {
    try {
        if (!google || !google.maps) {
            throw new Error('Google Maps API not loaded');
        }

        // Default to a central location (e.g., New York City)
        const defaultLocation = { lat: 40.7128, lng: -74.0060 };
        
        map = new google.maps.Map(document.getElementById('map'), {
            zoom: 12,
            center: defaultLocation,
            mapTypeControl: true,
            mapTypeControlOptions: {
                style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
                position: google.maps.ControlPosition.TOP_RIGHT
            }
        });

        // Add traffic layer
        trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(map);

        // Initialize info window
        infoWindow = new google.maps.InfoWindow();

        // Try to get user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    map.setCenter(userLocation);
                    updateTrafficData(userLocation);
                },
                () => {
                    // If geolocation fails, use default location
                    updateTrafficData(defaultLocation);
                }
            );
        } else {
            // Browser doesn't support geolocation
            updateTrafficData(defaultLocation);
        }

        // Initialize search box
        const searchBox = new google.maps.places.SearchBox(document.getElementById('location-search'));
        
        // Listen for the event fired when the user selects a prediction
        searchBox.addListener('places_changed', () => {
            const places = searchBox.getPlaces();
            if (places.length === 0) return;

            // Clear existing markers
            markers.forEach(marker => marker.setMap(null));
            markers = [];

            // For each place, get the icon, name and location
            const bounds = new google.maps.LatLngBounds();
            places.forEach(place => {
                if (!place.geometry) return;

                // Create a marker for each place
                markers.push(new google.maps.Marker({
                    map: map,
                    title: place.name,
                    position: place.geometry.location
                }));

                if (place.geometry.viewport) {
                    bounds.union(place.geometry.viewport);
                } else {
                    bounds.extend(place.geometry.location);
                }
            });
            map.fitBounds(bounds);
        });

        // Add event listeners for map controls
        document.getElementById('toggle-traffic').addEventListener('click', () => {
            const button = document.getElementById('toggle-traffic');
            if (trafficLayer.getMap()) {
                trafficLayer.setMap(null);
                button.classList.remove('active');
            } else {
                trafficLayer.setMap(map);
                button.classList.add('active');
            }
        });

        document.getElementById('toggle-satellite').addEventListener('click', () => {
            const button = document.getElementById('toggle-satellite');
            if (map.getMapTypeId() === 'satellite') {
                map.setMapTypeId('roadmap');
                button.classList.remove('active');
            } else {
                map.setMapTypeId('satellite');
                button.classList.add('active');
            }
        });

        // Add event listener for "Use My Location" button
        document.getElementById('use-location').addEventListener('click', () => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const userLocation = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude
                        };
                        map.setCenter(userLocation);
                        updateTrafficData(userLocation);
                    },
                    (error) => {
                        console.error('Error getting location:', error);
                        alert('Unable to retrieve your location. Please check your browser settings.');
                    }
                );
            } else {
                alert('Geolocation is not supported by your browser.');
            }
        });
    } catch (error) {
        handleMapError(error);
    }
}

function updateTrafficData(location) {
    console.log('Updating traffic data for location:', location);
    
    // Show loading state
    const alertsContainer = document.getElementById('traffic-alerts');
    const flowStatus = document.getElementById('flow-status');
    const flowDetails = document.getElementById('flow-details');
    
    alertsContainer.innerHTML = '<div class="alert loading">Loading traffic data...</div>';
    flowStatus.textContent = 'LOADING...';
    flowStatus.className = 'status loading';
    flowDetails.innerHTML = '';

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    markers = [];

    // Fetch traffic data from our API
    fetch(`/api/traffic/${location.lat},${location.lng}`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Received traffic data:', data);
            
            // Update traffic alerts
            alertsContainer.innerHTML = '';

            if (data.conditions && data.conditions.length > 0) {
                data.conditions.forEach(condition => {
                    console.log('Processing condition:', condition);
                    
                    const alertElement = document.createElement('div');
                    alertElement.className = `alert ${condition.severity}`;
                    alertElement.innerHTML = `
                        <h4>${condition.type.toUpperCase()}</h4>
                        <p>${condition.description}</p>
                        <small>${new Date(condition.timestamp).toLocaleString()}</small>
                    `;
                    alertsContainer.appendChild(alertElement);

                    // Add marker for the condition
                    const marker = new google.maps.Marker({
                        position: condition.location,
                        map: map,
                        title: condition.description,
                        icon: getMarkerIcon(condition.type)
                    });

                    // Add click listener to show info window
                    marker.addListener('click', () => {
                        infoWindow.setContent(`
                            <div class="info-window">
                                <h3>${condition.type.toUpperCase()}</h3>
                                <p>${condition.description}</p>
                                <p>Severity: ${condition.severity}</p>
                                <small>${new Date(condition.timestamp).toLocaleString()}</small>
                            </div>
                        `);
                        infoWindow.open(map, marker);
                    });

                    markers.push(marker);
                });
            } else {
                alertsContainer.innerHTML = '<div class="alert">No traffic incidents reported in this area.</div>';
            }

            // Update traffic flow status
            if (data.trafficFlow) {
                flowStatus.textContent = data.trafficFlow.status.toUpperCase();
                flowStatus.className = `status ${data.trafficFlow.status}`;
                flowDetails.innerHTML = `
                    <p>Average Speed: ${data.trafficFlow.speed} km/h</p>
                    <p>Delay: ${data.trafficFlow.delay} minutes</p>
                `;
            } else {
                flowStatus.textContent = 'NO DATA';
                flowStatus.className = 'status unknown';
                flowDetails.innerHTML = '<p>Traffic flow data not available</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching traffic data:', error);
            alertsContainer.innerHTML = '<div class="alert error">Failed to load traffic data. Please try again later.</div>';
            flowStatus.textContent = 'ERROR';
            flowStatus.className = 'status error';
            flowDetails.innerHTML = '<p>Unable to load traffic information</p>';
        });
}

function getMarkerIcon(type) {
    const icons = {
        accident: '🚨',
        construction: '🚧',
        congestion: '🚗',
        default: '📍'
    };
    return {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#FF0000',
        fillOpacity: 0.7,
        strokeWeight: 2,
        strokeColor: '#FFFFFF',
        label: {
            text: icons[type] || icons.default,
            color: '#FFFFFF',
            fontSize: '12px'
        }
    };
}

// Function to update traffic flow status
function updateTrafficFlow() {
    const flowStatus = document.querySelector('.flow-status-container');
    flowStatus.innerHTML = '<div class="status loading">Loading traffic data...</div>';

    // Simulate API call to get traffic data
    setTimeout(() => {
        const status = Math.random() > 0.5 ? 'Heavy' : 'Light';
        const color = status === 'Heavy' ? '#e74c3c' : '#2ecc71';
        
        flowStatus.innerHTML = `
            <div class="status" style="background-color: ${color}; color: white;">
                Current Traffic: ${status}
            </div>
        `;
    }, 1000);
}

// Function to update traffic alerts
function updateTrafficAlerts() {
    const alertsContainer = document.getElementById('traffic-alerts');
    alertsContainer.innerHTML = '<div class="alert loading">Loading alerts...</div>';

    // Simulate API call to get traffic alerts
    setTimeout(() => {
        const alerts = [
            { type: 'Accident', location: 'Main Street', time: '5 minutes ago' },
            { type: 'Construction', location: 'Highway 101', time: '10 minutes ago' },
            { type: 'Road Closure', location: 'Bridge Road', time: '15 minutes ago' }
        ];

        alertsContainer.innerHTML = alerts.map(alert => `
            <div class="alert">
                <strong>${alert.type}</strong> at ${alert.location}<br>
                <small>${alert.time}</small>
            </div>
        `).join('');
    }, 1000);
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY&libraries=places`;
    script.defer = true;
    script.async = true;
    document.head.appendChild(script);

    // Update traffic data every 5 minutes
    updateTrafficFlow();
    updateTrafficAlerts();
    setInterval(updateTrafficFlow, 300000);
    setInterval(updateTrafficAlerts, 300000);
}); 