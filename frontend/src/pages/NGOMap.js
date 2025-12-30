import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './NGOMap.css';
import { useNavigate } from 'react-router-dom';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons
const ngoIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <circle cx="12" cy="12" r="10" fill="#51CF66" stroke="white" stroke-width="2"/>
      <path d="M12 6 L12 18 M6 12 L18 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="white" stroke-width="1.5"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
});

const restaurantIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#FF6B6B" stroke="white" stroke-width="2"/>
      <path d="M8 8 L8 16 M10 8 L10 16 M16 8 L16 12 C16 13 15 14 14 14 L14 16" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="12" cy="16" r="1" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const NGOMap = () => {
  const navigate = useNavigate();
  const [ngoLocation, setNgoLocation] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDistance, setSelectedDistance] = useState(5);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    getNgoLocation();
  }, []);

  useEffect(() => {
    if (ngoLocation) {
      fetchNearbyRestaurants();
    }
  }, [ngoLocation, selectedDistance]);

  const getNgoLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setNgoLocation(location);
          setMapCenter([location.lat, location.lng]);
          setError(null);
        },
        (err) => {
          console.error('Geolocation error:', err);
          const defaultLocation = { lat: 23.8103, lng: 90.4125 };
          setNgoLocation(defaultLocation);
          setMapCenter([defaultLocation.lat, defaultLocation.lng]);
          setError('Location access denied. Using default location (Dhaka).');
          setLoading(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    } else {
      const defaultLocation = { lat: 23.8103, lng: 90.4125 };
      setNgoLocation(defaultLocation);
      setMapCenter([defaultLocation.lat, defaultLocation.lng]);
      setError('Geolocation not supported. Using default location (Dhaka).');
      setLoading(false);
    }
  };

  const fetchNearbyRestaurants = async () => {
    if (!ngoLocation) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch restaurants from OpenStreetMap using Overpass API
      const radius = selectedDistance * 1000; // Convert km to meters
      
      const query = `[out:json][timeout:25];(node["amenity"="restaurant"](around:${radius},${ngoLocation.lat},${ngoLocation.lng});way["amenity"="restaurant"](around:${radius},${ngoLocation.lat},${ngoLocation.lng}););out center;`;

      console.log('Fetching restaurants from OpenStreetMap...');
      console.log('Query:', query);
      
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
      
      const response = await fetch(overpassUrl, {
        method: 'GET'
      });

      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers.get('content-type'));
      
      const text = await response.text();
      console.log('Response text (first 200 chars):', text.substring(0, 200));
      
      const data = JSON.parse(text);
      console.log('OpenStreetMap response:', data);

      if (data.elements && data.elements.length > 0) {
        const restaurantList = data.elements.map(element => {
          const lat = element.lat || element.center?.lat;
          const lng = element.lon || element.center?.lon;
          
          // Calculate distance
          const distance = calculateDistance(ngoLocation.lat, ngoLocation.lng, lat, lng);
          
          return {
            _id: element.id.toString(),
            name: element.tags?.name || 'Restaurant',
            location: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            address: {
              street: element.tags?.['addr:street'] || '',
              city: element.tags?.['addr:city'] || '',
              postcode: element.tags?.['addr:postcode'] || ''
            },
            cuisine: element.tags?.cuisine ? element.tags.cuisine.split(';') : [],
            contactPhone: element.tags?.phone || element.tags?.['contact:phone'] || 'N/A',
            website: element.tags?.website || element.tags?.['contact:website'] || null,
            operatingHours: element.tags?.opening_hours || 'Contact restaurant for hours',
            type: 'restaurant',
            rating: 'N/A',
            distance: parseFloat(distance.toFixed(2))
          };
        });
        
        // Sort by distance
        restaurantList.sort((a, b) => a.distance - b.distance);
        
        console.log('Found restaurants:', restaurantList.length);
        setRestaurants(restaurantList);
      } else {
        console.log('No restaurants found in this area');
        setRestaurants([]);
        setError('No restaurants found in this area');
      }
      setLoading(false);
    } catch (err) {
      console.error('Error fetching nearby restaurants:', err);
      setError(`Failed to load nearby restaurants: ${err.message}`);
      setRestaurants([]);
      setLoading(false);
    }
  };

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleDistanceChange = (distance) => {
    setSelectedDistance(distance);
    const zoomLevels = { 1: 15, 2: 14, 5: 13, 10: 12 };
    setMapZoom(zoomLevels[distance] || 13);
  };

  return (
    <div className="restaurant-ngo-map-container">
      <div className="restaurant-ngo-map-header">
        <h1>🗺️ Nearby Verified Restaurants</h1>
        <p>Find authentic restaurants near your location</p>
      </div>

      {error && (
        <div className="alert alert-warning">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="map-controls">
        <div className="distance-selector">
          <label>📍 Search Within:</label>
          <div className="distance-buttons">
            {[1, 2, 5, 10].map(distance => (
              <button
                key={distance}
                className={`distance-btn ${selectedDistance === distance ? 'active' : ''}`}
                onClick={() => handleDistanceChange(distance)}
              >
                {distance} km
              </button>
            ))}
          </div>
        </div>

        <div className="stats-box">
          <div className="stat-item">
            <span className="stat-number">{restaurants.length}</span>
            <span className="stat-label">Restaurants Found</span>
          </div>
        </div>

        <button className="refresh-btn" onClick={getNgoLocation} disabled={loading}>
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="map-wrapper">
        {ngoLocation ? (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '600px', width: '100%', borderRadius: '12px' }}
          >
            <ChangeMapView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* NGO location marker */}
            <Marker position={[ngoLocation.lat, ngoLocation.lng]} icon={ngoIcon}>
              <Popup>
                <div className="popup-content">
                  <h3>📍 Your Location</h3>
                  <p>Lat: {ngoLocation.lat.toFixed(6)}</p>
                  <p>Lng: {ngoLocation.lng.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>

            {/* Distance circle */}
            <Circle
              center={[ngoLocation.lat, ngoLocation.lng]}
              radius={selectedDistance * 1000}
              pathOptions={{
                color: '#FF6B6B',
                fillColor: '#FF6B6B',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '10, 10'
              }}
            />

            {/* Restaurant markers */}
            {restaurants.map((restaurant) => {
              const [lng, lat] = restaurant.location.coordinates;
              return (
                <Marker key={restaurant._id} position={[lat, lng]} icon={restaurantIcon}>
                  <Popup>
                    <div className="popup-content restaurant-popup">
                      <h3>🍽️ {restaurant.name}</h3>
                      <p><strong>Type:</strong> {restaurant.type}</p>
                      {restaurant.cuisine && restaurant.cuisine.length > 0 && (
                        <p><strong>Cuisine:</strong> {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}</p>
                      )}
                      {restaurant.contactPhone && restaurant.contactPhone !== 'N/A' && (
                        <p><strong>Phone:</strong> <a href={`tel:${restaurant.contactPhone}`}>{restaurant.contactPhone}</a></p>
                      )}
                      {restaurant.operatingHours && restaurant.operatingHours !== 'Hours not available' && (
                        <p><strong>Hours:</strong> {restaurant.operatingHours}</p>
                      )}
                      {restaurant.address?.fullAddress && restaurant.address.fullAddress !== 'Address not available' && (
                        <p><strong>Address:</strong> {restaurant.address.fullAddress}</p>
                      )}
                      {restaurant.address?.street && (
                        <p><strong>Area:</strong> {restaurant.address.street}, {restaurant.address.city || ''}</p>
                      )}
                      {restaurant.website && (
                        <p>
                          <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="popup-link">
                            🌐 Visit Website
                          </a>
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        ) : (
          <div className="map-loading">
            <div className="spinner"></div>
            <p>Loading map...</p>
          </div>
        )}
      </div>

      <div className="ngo-list">
        <h3>📋 Restaurant List ({restaurants.length} found)</h3>
        {restaurants.length === 0 ? (
          <p className="no-results">No restaurants found within {selectedDistance}km. Try increasing the search radius.</p>
        ) : (
          <div className="ngo-cards">
            {restaurants.map((restaurant) => (
              <div key={restaurant._id} className="ngo-card">
                <div className="ngo-card-header">
                  <h4>{restaurant.name}</h4>
                  <span className="verified-badge-small">✅ OSM</span>
                </div>
                <div className="ngo-card-body">
                  <p className="type-badge">🍽️ {restaurant.type}</p>
                  {restaurant.cuisine && restaurant.cuisine.length > 0 && (
                    <p><strong>Cuisine:</strong> {Array.isArray(restaurant.cuisine) ? restaurant.cuisine.join(', ') : restaurant.cuisine}</p>
                  )}
                  {restaurant.address?.street && (
                    <p><strong>Area:</strong> {restaurant.address.street}, {restaurant.address.city || ''}</p>
                  )}
                  {restaurant.address?.fullAddress && (
                    <p><strong>Address:</strong> {restaurant.address.fullAddress}</p>
                  )}
                  {restaurant.contactPhone && restaurant.contactPhone !== 'N/A' && (
                    <a href={`tel:${restaurant.contactPhone}`} className="call-btn">📞 {restaurant.contactPhone}</a>
                  )}
                  {restaurant.operatingHours && restaurant.operatingHours !== 'Hours not available' && (
                    <p><strong>Hours:</strong> {restaurant.operatingHours}</p>
                  )}
                  {restaurant.website && (
                    <a href={restaurant.website} target="_blank" rel="noopener noreferrer" className="website-btn">
                      🌐 Website
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NGOMap;
