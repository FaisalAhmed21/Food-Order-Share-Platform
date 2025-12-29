import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MapPicker.css';

const MapPicker = ({ initialLat = 23.8103, initialLng = 90.4125, onLocationSelect, onClose }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerRef = useRef(null);
  const [selectedLocation, setSelectedLocation] = useState({ lat: initialLat, lng: initialLng });
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([initialLat, initialLng], 13);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    // Add marker
    const customIcon = L.divIcon({
      className: 'custom-marker-icon',
      html: '<div style="background: red; width: 30px; height: 30px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"><div style="width: 10px; height: 10px; background: white; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(45deg);"></div></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    });

    markerRef.current = L.marker([initialLat, initialLng], { 
      icon: customIcon,
      draggable: true 
    }).addTo(mapInstance.current);

    // Handle marker drag
    markerRef.current.on('dragend', (e) => {
      const position = e.target.getLatLng();
      setSelectedLocation({ lat: position.lat, lng: position.lng });
      reverseGeocode(position.lat, position.lng);
    });

    // Handle map click
    mapInstance.current.on('click', (e) => {
      const { lat, lng } = e.latlng;
      markerRef.current.setLatLng([lat, lng]);
      setSelectedLocation({ lat, lng });
      reverseGeocode(lat, lng);
    });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      if (data.display_name) {
        setSearchQuery(data.display_name);
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();
      
      if (data.length > 0) {
        const { lat, lon } = data[0];
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lon);
        
        mapInstance.current.setView([latitude, longitude], 15);
        markerRef.current.setLatLng([latitude, longitude]);
        setSelectedLocation({ lat: latitude, lng: longitude });
      } else {
        alert('Location not found. Please try a different search term.');
      }
    } catch (error) {
      console.error('Geocoding error:', error);
      alert('Failed to search location. Please try again.');
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation);
    onClose();
  };

  return (
    <div className="map-picker-modal">
      <div className="map-picker-container">
        <div className="map-picker-header">
          <h2>📍 Select Delivery Location</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="map-search">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location (e.g., Gulshan 1, Dhaka)"
            onKeyPress={(e) => e.key === 'Enter' && searchLocation()}
          />
          <button onClick={searchLocation}>Search</button>
        </div>

        <div ref={mapRef} className="map-picker-map"></div>

        <div className="map-picker-info">
          <p>📌 Drag the marker or click on the map to select your delivery location</p>
          <p className="coordinates">
            <strong>Selected Location:</strong> {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
          </p>
        </div>

        <div className="map-picker-actions">
          <button className="cancel-btn" onClick={onClose}>Cancel</button>
          <button className="confirm-btn" onClick={handleConfirm}>Confirm Location</button>
        </div>
      </div>
    </div>
  );
};

export default MapPicker;
