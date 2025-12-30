import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './RestaurantNGOMap.css';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Custom icons (using simple SVG shapes instead of emojis to avoid btoa encoding issues)
const restaurantIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,' + btoa(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="36" height="36">
      <circle cx="12" cy="12" r="10" fill="#FF6B6B" stroke="white" stroke-width="2"/>
      <path d="M8 8 L8 16 M10 8 L10 16 M16 8 L16 12 C16 13 15 14 14 14 L14 16" stroke="white" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <circle cx="12" cy="16" r="1" fill="white"/>
    </svg>
  `),
  iconSize: [36, 36],
  iconAnchor: [18, 36],
  popupAnchor: [0, -36]
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

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

const RestaurantNGOMap = () => {
  const [restaurantLocation, setRestaurantLocation] = useState(null);
  const [ngos, setNgos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDistance, setSelectedDistance] = useState(5);
  const [mapCenter, setMapCenter] = useState([23.8103, 90.4125]);
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    getRestaurantLocation();
  }, []);

  useEffect(() => {
    if (restaurantLocation) {
      fetchNearbyNGOs();
    }
  }, [restaurantLocation, selectedDistance]);

  const getRestaurantLocation = () => {
    setLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setRestaurantLocation(location);
          setMapCenter([location.lat, location.lng]);
          setError(null);
        },
        (err) => {
          console.error('Geolocation error:', err);
          const defaultLocation = { lat: 23.8103, lng: 90.4125 };
          setRestaurantLocation(defaultLocation);
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
      setRestaurantLocation(defaultLocation);
      setMapCenter([defaultLocation.lat, defaultLocation.lng]);
      setError('Geolocation not supported. Using default location (Dhaka).');
      setLoading(false);
    }
  };

  const fetchNearbyNGOs = async () => {
    if (!restaurantLocation) return;

    setLoading(true);

    try {
      const ngoData = await fetchNGOsFromOSM();
      setNgos(ngoData);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching nearby NGOs:', err);
      setError('Failed to load nearby NGOs. Please try again.');
      setLoading(false);
    }
  };

  const fetchNGOsFromOSM = async () => {
    const { lat, lng } = restaurantLocation;
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
            operatingHours: element.tags.opening_hours || 'Hours not available',
            type: element.tags.office || element.tags.amenity || 'ngo',
            isVerified: true, // OSM data is considered verified
            isAcceptingItems: true,
            serviceRadius: 10 // Default service radius
          };
        });
    } catch (error) {
      console.error('Error fetching NGOs from OSM:', error);
      return [];
    }
  };

  const handleDistanceChange = (distance) => {
    setSelectedDistance(distance);
    const zoomLevels = { 1: 15, 2: 14, 5: 13, 10: 12 };
    setMapZoom(zoomLevels[distance] || 13);
  };

  return (
    <div className="restaurant-ngo-map-container">
      <div className="restaurant-ngo-map-header">
        <h1>🗺️ Nearby NGO Collection Points</h1>
        <p>Find NGOs near your restaurant for food donation pickups</p>
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
            <span className="stat-number">{ngos.length}</span>
            <span className="stat-label">NGOs Found</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{ngos.filter(n => n.isAcceptingItems).length}</span>
            <span className="stat-label">Currently Accepting</span>
          </div>
        </div>

        <button className="refresh-btn" onClick={getRestaurantLocation} disabled={loading}>
          {loading ? '🔄 Loading...' : '🔄 Refresh'}
        </button>
      </div>

      <div className="map-wrapper">
        {restaurantLocation ? (
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

            {/* Restaurant location marker */}
            <Marker position={[restaurantLocation.lat, restaurantLocation.lng]} icon={restaurantIcon}>
              <Popup>
                <div className="popup-content">
                  <h3>🍽️ Your Restaurant</h3>
                  <p>Lat: {restaurantLocation.lat.toFixed(6)}</p>
                  <p>Lng: {restaurantLocation.lng.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>

            {/* Distance circle */}
            <Circle
              center={[restaurantLocation.lat, restaurantLocation.lng]}
              radius={selectedDistance * 1000}
              pathOptions={{
                color: '#51CF66',
                fillColor: '#51CF66',
                fillOpacity: 0.1,
                weight: 2,
                dashArray: '10, 10'
              }}
            />

            {/* NGO markers */}
            {ngos.map((ngo) => {
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
                        <p><strong>Phone:</strong> <a href={`tel:${ngo.contactPhone}`}>{ngo.contactPhone}</a></p>
                      )}
                      {ngo.contactEmail && ngo.contactEmail !== 'N/A' && (
                        <p><strong>Email:</strong> {ngo.contactEmail}</p>
                      )}
                      {ngo.operatingHours && ngo.operatingHours !== 'Hours not available' && (
                        <p><strong>Hours:</strong> {ngo.operatingHours}</p>
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

      <div className="ngo-list">
        <h3>📋 NGO List ({ngos.length} found)</h3>
        {ngos.length === 0 ? (
          <p className="no-results">No NGOs found within {selectedDistance}km. Try increasing the search radius.</p>
        ) : (
          <div className="ngo-cards">
            {ngos.map((ngo) => (
              <div key={ngo._id} className="ngo-card">
                <div className="ngo-card-header">
                  <h4>{ngo.ngoName}</h4>
                  {ngo.isVerified && <span className="verified-badge-small">✅ OSM</span>}
                </div>
                <div className="ngo-card-body">
                  <p className="type-badge">🏢 {ngo.type}</p>
                  {ngo.description && (
                    <p className="description">{ngo.description}</p>
                  )}
                  {ngo.address?.area && ngo.address.area !== 'N/A' && (
                    <p><strong>Area:</strong> {ngo.address.area}</p>
                  )}
                  {ngo.contactPhone && ngo.contactPhone !== 'N/A' && (
                    <a href={`tel:${ngo.contactPhone}`} className="call-btn">📞 {ngo.contactPhone}</a>
                  )}
                  {ngo.contactEmail && ngo.contactEmail !== 'N/A' && (
                    <p><strong>Email:</strong> {ngo.contactEmail}</p>
                  )}
                  {ngo.website && (
                    <a href={ngo.website} target="_blank" rel="noopener noreferrer" className="website-btn">
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

export default RestaurantNGOMap;
