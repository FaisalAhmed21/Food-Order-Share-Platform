// Location Service for background IP-based location tracking

class LocationService {
  constructor() {
    this.currentLocation = null;
    this.lastCheckedTime = null;
    this.checkInterval = 5 * 60 * 1000; // Check every 5 minutes
    this.intervalId = null;
    this.onLocationChange = null;
  }

  // Get location from IP address using ipapi.co
  async getLocationFromIP() {
    try {
      const response = await fetch('https://ipapi.co/json/');
      const data = await response.json();
      
      return {
        lat: data.latitude,
        lng: data.longitude,
        city: data.city,
        region: data.region,
        country: data.country_name,
        ip: data.ip
      };
    } catch (error) {
      console.error('Error fetching location from IP:', error);
      // Fallback to default Dhaka location
      return {
        lat: 23.8103,
        lng: 90.4125,
        city: 'Dhaka',
        region: 'Dhaka Division',
        country: 'Bangladesh',
        ip: 'unknown'
      };
    }
  }

  // Check if location has changed significantly (more than 0.5 km)
  hasLocationChanged(oldLocation, newLocation) {
    if (!oldLocation || !newLocation) return true;

    const R = 6371; // Earth's radius in km
    const dLat = (newLocation.lat - oldLocation.lat) * Math.PI / 180;
    const dLng = (newLocation.lng - oldLocation.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(oldLocation.lat * Math.PI / 180) * Math.cos(newLocation.lat * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Return true if distance is more than 0.5 km
    return distance > 0.5;
  }

  // Update location in backend
  async updateLocationInBackend(location) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/volunteers/update-location', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          location: {
            lat: location.lat,
            lng: location.lng
          },
          city: location.city,
          region: location.region,
          country: location.country
        })
      });

      const data = await response.json();
      return data.success;
    } catch (error) {
      console.error('Error updating location in backend:', error);
      return false;
    }
  }

  // Check and update location
  async checkAndUpdateLocation() {
    try {
      console.log('🔍 Checking location...');
      const newLocation = await this.getLocationFromIP();
      
      if (this.hasLocationChanged(this.currentLocation, newLocation)) {
        console.log('📍 Location changed:', newLocation);
        
        // Update backend
        const updated = await this.updateLocationInBackend(newLocation);
        
        if (updated) {
          const oldLocation = this.currentLocation;
          this.currentLocation = newLocation;
          this.lastCheckedTime = new Date();
          
          // Notify callback if set
          if (this.onLocationChange) {
            this.onLocationChange(newLocation, oldLocation);
          }
          
          return { changed: true, location: newLocation };
        }
      } else {
        console.log('✓ Location unchanged');
        this.lastCheckedTime = new Date();
      }
      
      return { changed: false, location: this.currentLocation };
    } catch (error) {
      console.error('Error checking location:', error);
      return { changed: false, error: error.message };
    }
  }

  // Start background location tracking
  startTracking(onLocationChange) {
    if (this.intervalId) {
      console.log('Location tracking already started');
      return;
    }

    this.onLocationChange = onLocationChange;
    
    // Check immediately
    this.checkAndUpdateLocation();
    
    // Then check periodically
    this.intervalId = setInterval(() => {
      this.checkAndUpdateLocation();
    }, this.checkInterval);
    
    console.log(`✅ Location tracking started (checking every ${this.checkInterval / 1000 / 60} minutes)`);
  }

  // Stop background location tracking
  stopTracking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('⏹️ Location tracking stopped');
    }
  }

  // Get current location (cached)
  getCurrentLocation() {
    return this.currentLocation;
  }

  // Force immediate location check
  async forceLocationCheck() {
    return await this.checkAndUpdateLocation();
  }
}

// Export singleton instance
const locationService = new LocationService();
export default locationService;

