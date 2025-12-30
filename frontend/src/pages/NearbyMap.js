import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './NearbyMap.css';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons (using simple SVG shapes instead of emojis to avoid btoa encoding issues)
const userIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="2"/>
      <circle cx="12" cy="10" r="3" fill="white"/>
      <path d="M12 14 C 8 14, 6 16, 6 18 L 18 18 C 18 16, 16 14, 12 14" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
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

const ngoIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#51CF66" stroke="white" stroke-width="2"/>
      <path d="M12 6 L12 18 M6 12 L18 12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
      <circle cx="12" cy="12" r="3" fill="none" stroke="white" stroke-width="1.5"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32]
});

// Component to update map view when center changes
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const NearbyMap = () => {
  const navigate = useNavigate();
  const [userLocation, setUserLocation] = useState(null);
  const [userAddress, setUserAddress] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDistance, setSelectedDistance] = useState(5); // Default 5km
  const [showRestaurants, setShowRestaurants] = useState(true);
  const [showNGOs, setShowNGOs] = useState(true);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]); // Dhaka default
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    getUserLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      fetchNearbyData();
      getAddressFromCoordinates(userLocation.lat, userLocation.lng);
    }
  }, [userLocation, selectedDistance]);

  const getAddressFromCoordinates = async (lat, lng) => {
    try {
      // Using Nominatim (OpenStreetMap) reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      const data = await response.json();
      
      if (data && data.address) {
        // Build a readable address
        const parts = [];
        if (data.address.road) parts.push(data.address.road);
        if (data.address.suburb) parts.push(data.address.suburb);
        if (data.address.city) parts.push(data.address.city);
        else if (data.address.town) parts.push(data.address.town);
        else if (data.address.village) parts.push(data.address.village);
        if (data.address.state) parts.push(data.address.state);
        if (data.address.country) parts.push(data.address.country);
        
        const address = parts.join(', ');
        setUserAddress(address || 'Location detected');
        console.log('📍 Current location:', address);
      } else {
        setUserAddress('Location detected');
      }
    } catch (error) {
      console.error('Error getting address:', error);
      setUserAddress('Location detected');
    }
  };

  const getUserLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(location);
          setMapCenter([location.lat, location.lng]);
          setError(null);
        },
        (err) => {
          console.error('Geolocation error:', err);
          // Use default Dhaka location
          const defaultLocation = { lat: 23.8103, lng: 90.4125 };
          setUserLocation(defaultLocation);
          setMapCenter([defaultLocation.lat, defaultLocation.lng]);
          setUserAddress('Dhaka, Bangladesh'); // Set default address
          // Only show error if permission was explicitly denied (error code 1)
          if (err.code === 1) {
            setError('⚠️ Location access denied. Using default location (Dhaka). Please enable location access for better results.');
          }
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
      setUserLocation(defaultLocation);
      setMapCenter([defaultLocation.lat, defaultLocation.lng]);
      setError('Geolocation not supported. Using default location (Dhaka).');
      setLoading(false);
    }
  };

  const fetchNearbyData = async () => {
    if (!userLocation) return;

    setLoading(true);

    try {
      const promises = [];

      // Fetch real restaurants from OpenStreetMap
      if (showRestaurants) {
        promises.push(fetchRestaurantsFromOSM());
      } else {
        promises.push(Promise.resolve([]));
      }

      // Fetch real NGOs/charities from OpenStreetMap
      if (showNGOs) {
        promises.push(fetchNGOsFromOSM());
      } else {
        promises.push(Promise.resolve([]));
      }

      const [restaurantData, ngoData] = await Promise.all(promises);

      setRestaurants(restaurantData);
      setNgos(ngoData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching nearby data:', err);
      setError('Failed to load nearby locations. Please try again.');
      setLoading(false);
    }
  };

  const fetchRestaurantsFromOSM = async () => {
    const { lat, lng } = userLocation;
    const radius = selectedDistance * 1000; // Convert km to meters

    // Overpass API query for restaurants, cafes, fast food, and food courts
    const query = `
      [out:json][timeout:25];
      (
        node["amenity"="restaurant"](around:${radius},${lat},${lng});
        way["amenity"="restaurant"](around:${radius},${lat},${lng});
        node["amenity"="cafe"](around:${radius},${lat},${lng});
        way["amenity"="cafe"](around:${radius},${lat},${lng});
        node["amenity"="fast_food"](around:${radius},${lat},${lng});
        way["amenity"="fast_food"](around:${radius},${lat},${lng});
        node["amenity"="food_court"](around:${radius},${lat},${lng});
        way["amenity"="food_court"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });

      const data = await response.json();

      // Transform OSM data to our format
      return data.elements
        .filter(element => {
          // Only include named places with valid coordinates
          if (!element.tags || !element.tags.name) return false;
          
          // Check if coordinates exist (either lat/lon or center)
          const hasCoords = (element.lat && element.lon) || (element.center?.lat && element.center?.lon);
          return hasCoords;
        })
        .map(element => {
          // Extract coordinates safely
          const lon = element.lon || element.center?.lon;
          const lat = element.lat || element.center?.lat;
          
          return {
            _id: element.id,
            name: element.tags.name,
            location: {
              coordinates: [lon, lat]
            },
            address: {
              area: element.tags['addr:suburb'] || element.tags['addr:neighbourhood'] || 'N/A',
              city: element.tags['addr:city'] || 'N/A',
              fullAddress: element.tags['addr:full'] || 
                           `${element.tags['addr:street'] || ''} ${element.tags['addr:housenumber'] || ''}`.trim() ||
                           'Address not available'
            },
            cuisine: element.tags.cuisine || 'N/A',
            phone: element.tags.phone || element.tags['contact:phone'] || 'N/A',
            website: element.tags.website || element.tags['contact:website'] || null,
            openingHours: element.tags.opening_hours || 'Hours not available',
            type: element.tags.amenity || 'restaurant',
            rating: element.tags['stars'] || 'N/A'
          };
        });
    } catch (error) {
      console.error('Error fetching restaurants from OSM:', error);
      return [];
    }
  };

  const fetchNGOsFromOSM = async () => {
    const { lat, lng } = userLocation;
    const radius = selectedDistance * 1000; // Convert km to meters

    // Overpass API query for NGOs, charities, and social facilities (excluding community centers)
    const query = `
      [out:json][timeout:25];
      (
        node["office"="ngo"](around:${radius},${lat},${lng});
        way["office"="ngo"](around:${radius},${lat},${lng});
        node["office"="charity"](around:${radius},${lat},${lng});
        way["office"="charity"](around:${radius},${lat},${lng});
        node["amenity"="social_facility"](around:${radius},${lat},${lng});
        way["amenity"="social_facility"](around:${radius},${lat},${lng});
        node["office"="association"](around:${radius},${lat},${lng});
        way["office"="association"](around:${radius},${lat},${lng});
      );
      out body;
      >;
      out skel qt;
    `;

    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: query
      });

      const data = await response.json();

      // Transform OSM data to our format
      return data.elements
        .filter(element => {
          // Only include named places with valid coordinates
          if (!element.tags || !element.tags.name) return false;
          
          // Check if coordinates exist (either lat/lon or center)
          const hasCoords = (element.lat && element.lon) || (element.center?.lat && element.center?.lon);
          return hasCoords;
        })
        .map(element => {
          // Extract coordinates safely
          const lon = element.lon || element.center?.lon;
          const lat = element.lat || element.center?.lat;
          
          return {
            _id: element.id,
            ngoName: element.tags.name,
            location: {
              coordinates: [lon, lat]
            },
            address: {
              area: element.tags['addr:suburb'] || element.tags['addr:neighbourhood'] || 'N/A',
              city: element.tags['addr:city'] || 'N/A',
              fullAddress: element.tags['addr:full'] || 
                           `${element.tags['addr:street'] || ''} ${element.tags['addr:housenumber'] || ''}`.trim() ||
                           'Address not available'
            },
            description: element.tags.description || element.tags['social_facility:for'] || 'Community service organization',
            contactPhone: element.tags.phone || element.tags['contact:phone'] || 'N/A',
            contactEmail: element.tags.email || element.tags['contact:email'] || 'N/A',
            website: element.tags.website || element.tags['contact:website'] || null,
            openingHours: element.tags.opening_hours || 'Hours not available',
            type: element.tags.office || element.tags.amenity || 'ngo',
            isVerified: true, // OSM data is considered verified
            isAcceptingItems: true
          };
        });
    } catch (error) {
      console.error('Error fetching NGOs from OSM:', error);
      return [];
    }
  };

  const handleDistanceChange = (distance) => {
    setSelectedDistance(distance);
    // Adjust zoom based on distance
    const zoomLevels = { 1: 15, 2: 14, 5: 13, 10: 12 };
    setMapZoom(zoomLevels[distance] || 13);
  };

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Get sorted restaurants by distance
  const getSortedRestaurants = () => {
    if (!userLocation) return [];
    
    return restaurants
      .map(restaurant => {
        const [lng, lat] = restaurant.location.coordinates;
        const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        return { ...restaurant, distance: distance.toFixed(2) };
      })
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  };

  // Get sorted NGOs by distance
  const getSortedNGOs = () => {
    if (!userLocation) return [];
    
    return ngos
      .map(ngo => {
        const [lng, lat] = ngo.location.coordinates;
        const distance = calculateDistance(userLocation.lat, userLocation.lng, lat, lng);
        return { ...ngo, distance: distance.toFixed(2) };
      })
      .sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
  };

  return (
    <div className="nearby-map-container">
      <div className="nearby-map-header">
        <button className="back-to-home-btn" onClick={() => navigate('/home')}>
          ← Back to Home
        </button>
        <h1>🗺️ Nearby Restaurants & NGOs</h1>
        <p>Discover restaurants and NGO collection points near you</p>
        {userAddress && (
          <div className="current-location-display">
            <span className="location-icon">📍</span>
            <span className="location-text">Your current location: <strong>{userAddress}</strong></span>
          </div>
        )}
      </div>

      {error && (
        <div className="alert alert-warning">
          <span>⚠️ {error}</span>
        </div>
      )}

      <div className="map-controls">
        <div className="distance-selector">
          <label>📍 Distance Range:</label>
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

        <div className="type-selector">
          <label>🔍 Show on Map:</label>
          <div className="type-checkboxes">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showRestaurants}
                onChange={(e) => setShowRestaurants(e.target.checked)}
              />
              <span className="checkbox-text">
                <span className="marker-preview" style={{ backgroundColor: '#FF6B6B' }}>R</span>
                Restaurants ({restaurants.length})
              </span>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={showNGOs}
                onChange={(e) => setShowNGOs(e.target.checked)}
              />
              <span className="checkbox-text">
                <span className="marker-preview" style={{ backgroundColor: '#51CF66' }}>N</span>
                NGOs ({ngos.length})
              </span>
            </label>
          </div>
        </div>

        <button className="refresh-btn" onClick={getUserLocation} disabled={loading}>
          {loading ? '🔄 Loading...' : '🔄 Refresh Location'}
        </button>
      </div>

      <div className="map-and-list-container">
        <div className="map-section">
          <div className="map-wrapper">
        {userLocation ? (
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            style={{ height: '630px', width: '100%', borderRadius: '12px' }}
          >
            <ChangeMapView center={mapCenter} zoom={mapZoom} />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* User location marker */}
            <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
              <Popup>
                <div className="popup-content">
                  <h3>📍 Your Location</h3>
                  <p>Lat: {userLocation.lat.toFixed(6)}</p>
                  <p>Lng: {userLocation.lng.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>

            {/* Distance circle */}
            <Circle
              center={[userLocation.lat, userLocation.lng]}
              radius={selectedDistance * 1000}
              pathOptions={{
                color: '#4285F4',
                fillColor: '#4285F4',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '10, 10'
              }}
            />

            {/* Restaurant markers */}
            {showRestaurants && restaurants.map((restaurant) => {
              const [lng, lat] = restaurant.location.coordinates;
              return (
                <Marker key={restaurant._id} position={[lat, lng]} icon={restaurantIcon}>
                  <Popup>
                    <div className="popup-content restaurant-popup">
                      <h3>🍽️ {restaurant.name}</h3>
                      <p><strong>Type:</strong> {restaurant.type}</p>
                      {restaurant.cuisine && restaurant.cuisine !== 'N/A' && (
                        <p><strong>Cuisine:</strong> {restaurant.cuisine}</p>
                      )}
                      {restaurant.phone && restaurant.phone !== 'N/A' && (
                        <p><strong>Phone:</strong> {restaurant.phone}</p>
                      )}
                      {restaurant.openingHours && (
                        <p><strong>Hours:</strong> {restaurant.openingHours}</p>
                      )}
                      {restaurant.address?.fullAddress && restaurant.address.fullAddress !== 'Address not available' && (
                        <p><strong>Address:</strong> {restaurant.address.fullAddress}</p>
                      )}
                      {restaurant.address?.area && restaurant.address.area !== 'N/A' && (
                        <p><strong>Area:</strong> {restaurant.address.area}</p>
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

            {/* NGO markers */}
            {showNGOs && ngos.map((ngo) => {
              const [lng, lat] = ngo.location.coordinates;
              return (
                <Marker key={ngo._id} position={[lat, lng]} icon={ngoIcon}>
                  <Popup>
                    <div className="popup-content ngo-popup">
                      <h3>🏥 {ngo.ngoName}</h3>
                      {ngo.isVerified && <span className="verified-badge">✅ Verified (OSM)</span>}
                      <p><strong>Type:</strong> {ngo.type}</p>
                      {ngo.description && (
                        <p><strong>About:</strong> {ngo.description}</p>
                      )}
                      {ngo.contactPhone && ngo.contactPhone !== 'N/A' && (
                        <p><strong>Phone:</strong> {ngo.contactPhone}</p>
                      )}
                      {ngo.contactEmail && ngo.contactEmail !== 'N/A' && (
                        <p><strong>Email:</strong> {ngo.contactEmail}</p>
                      )}
                      {ngo.openingHours && (
                        <p><strong>Hours:</strong> {ngo.openingHours}</p>
                      )}
                      {ngo.address?.fullAddress && ngo.address.fullAddress !== 'Address not available' && (
                        <p><strong>Address:</strong> {ngo.address.fullAddress}</p>
                      )}
                      {ngo.address?.area && ngo.address.area !== 'N/A' && (
                        <p><strong>Area:</strong> {ngo.address.area}</p>
                      )}
                      {ngo.website && (
                        <p>
                          <a href={ngo.website} target="_blank" rel="noopener noreferrer" className="popup-link">
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
        </div>

        {/* Right sidebar with sorted lists */}
        <div className="places-list-sidebar">
          <h3>📍 Nearby Places ({getSortedRestaurants().length + getSortedNGOs().length})</h3>
          
          {showRestaurants && getSortedRestaurants().length > 0 && (
            <div className="list-section">
              <h4 className="list-section-title">🍽️ Restaurants ({getSortedRestaurants().length})</h4>
              <div className="places-list">
                {getSortedRestaurants().map((restaurant, index) => (
                  <div key={restaurant._id} className="place-card">
                    <div className="place-number">{index + 1}</div>
                    <div className="place-info">
                      <h5>
                        {restaurant.name}
                        {restaurant.verificationMark && (
                          <span className="verified-badge" style={{marginLeft: '8px', fontSize: '14px'}} title="Verified Restaurant">✅</span>
                        )}
                      </h5>
                      <p className="place-type">{restaurant.type}</p>
                      {restaurant.cuisine && restaurant.cuisine !== 'N/A' && (
                        <p className="place-cuisine">🍴 {restaurant.cuisine}</p>
                      )}
                      {restaurant.address?.area && restaurant.address.area !== 'N/A' && (
                        <p className="place-area">📍 {restaurant.address.area}</p>
                      )}
                      <p className="place-distance">
                        <strong>{restaurant.distance} km</strong> away
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {showNGOs && getSortedNGOs().length > 0 && (
            <div className="list-section">
              <h4 className="list-section-title">🏥 NGOs ({getSortedNGOs().length})</h4>
              <div className="places-list">
                {getSortedNGOs().map((ngo, index) => (
                  <div key={ngo._id} className="place-card ngo-card-item">
                    <div className="place-number">{index + 1}</div>
                    <div className="place-info">
                      <h5>{ngo.ngoName}</h5>
                      <p className="place-type">{ngo.type}</p>
                      {ngo.description && (
                        <p className="place-description">{ngo.description}</p>
                      )}
                      {ngo.address?.area && ngo.address.area !== 'N/A' && (
                        <p className="place-area">📍 {ngo.address.area}</p>
                      )}
                      <p className="place-distance">
                        <strong>{ngo.distance} km</strong> away
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && getSortedRestaurants().length === 0 && getSortedNGOs().length === 0 && (
            <div className="no-results">
              <p>No places found within {selectedDistance}km</p>
              <p>Try increasing the search radius</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NearbyMap;
