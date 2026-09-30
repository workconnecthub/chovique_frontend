/**
 * Google Maps & Geolocation Utilities for Chovique
 * Handles script loading, Places autocomplete, Reverse Geocoding, and Geolocation.
 */

declare global {
  interface Window {
    google?: any;
    initGoogleMapsCallback?: () => void;
  }
}

export interface ParsedAddressDetails {
  house_number: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  formatted_address: string;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
}

let mapsLoadingPromise: Promise<boolean> | null = null;

export const isGoogleMapsLoaded = (): boolean => {
  return typeof window !== 'undefined' && !!window.google?.maps;
};

export const getGoogleMapsApiKey = (): string => {
  return (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || '';
};

/**
 * Dynamically loads the Google Maps JavaScript API with Places library.
 * Resolves to true if successfully loaded, false if API key is missing or load failed.
 */
export const loadGoogleMapsApi = async (): Promise<boolean> => {
  if (isGoogleMapsLoaded()) return true;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return false;
  }

  if (mapsLoadingPromise) {
    return mapsLoadingPromise;
  }

  mapsLoadingPromise = new Promise<boolean>((resolve) => {
    // Check if script tag is already in DOM
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      if (isGoogleMapsLoaded()) {
        resolve(true);
        return;
      }
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      resolve(true);
    };

    script.onerror = (err) => {
      console.warn('Failed to load Google Maps script:', err);
      resolve(false);
    };

    document.head.appendChild(script);
  });

  return mapsLoadingPromise;
};

/**
 * Helper to parse Google Geocoder or Places address_components into Chovique address fields.
 */
export const parseGoogleAddressComponents = (
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  formattedAddress = '',
  placeId: string | null = null,
  lat: number | null = null,
  lng: number | null = null
): ParsedAddressDetails => {
  let houseNumber = '';
  let street = '';
  let area = '';
  let landmark = '';
  let city = '';
  let district = '';
  let state = '';
  let pincode = '';

  for (const c of components) {
    const types = c.types;
    if (types.includes('premise') || types.includes('subpremise') || types.includes('street_number')) {
      houseNumber = houseNumber ? `${houseNumber}, ${c.long_name}` : c.long_name;
    } else if (types.includes('route')) {
      street = c.long_name;
    } else if (
      types.includes('sublocality_level_1') ||
      types.includes('sublocality') ||
      types.includes('neighborhood')
    ) {
      if (!area) area = c.long_name;
    } else if (types.includes('sublocality_level_2')) {
      landmark = landmark ? `${landmark}, ${c.long_name}` : c.long_name;
    } else if (types.includes('point_of_interest')) {
      landmark = landmark ? `${c.long_name}, ${landmark}` : c.long_name;
    } else if (types.includes('locality')) {
      city = c.long_name;
    } else if (types.includes('administrative_area_level_2')) {
      district = c.long_name;
      if (!city) city = c.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = c.long_name;
    } else if (types.includes('postal_code')) {
      pincode = c.long_name;
    }
  }

  return {
    house_number: houseNumber,
    street: street || area || formattedAddress.split(',')[0] || '',
    area: area || street || '',
    landmark: landmark || '',
    city: city || 'Visakhapatnam',
    district: district || city || '',
    state: state || 'Andhra Pradesh',
    pincode: pincode ? pincode.replace(/\D/g, '').slice(0, 6) : '',
    formatted_address: formattedAddress,
    google_place_id: placeId,
    latitude: lat,
    longitude: lng,
  };
};

/**
 * Reverse geocode coordinates using Google Maps Geocoder if available,
 * or free OpenStreetMap/Nominatim as fallback.
 */
export const reverseGeocodeCoordinates = async (
  lat: number,
  lng: number
): Promise<ParsedAddressDetails> => {
  const isLoaded = await loadGoogleMapsApi();

  if (isLoaded && window.google?.maps?.Geocoder) {
    try {
      const geocoder = new window.google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat, lng } });
      if (response.results && response.results.length > 0) {
        const topResult = response.results[0];
        return parseGoogleAddressComponents(
          topResult.address_components,
          topResult.formatted_address,
          topResult.place_id,
          lat,
          lng
        );
      }
    } catch (e) {
      console.warn('Google reverse geocoding failed, trying Nominatim fallback:', e);
    }
  }

  // Fallback: OpenStreetMap Nominatim reverse geocode
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { 'Accept-Language': 'en' } }
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const houseNumber = addr.house_number || addr.building || '';
      const street = addr.road || addr.residential || '';
      const area = addr.suburb || addr.neighbourhood || addr.city_district || '';
      const city = addr.city || addr.town || addr.municipality || 'Visakhapatnam';
      const district = addr.county || addr.district || city;
      const state = addr.state || 'Andhra Pradesh';
      const pincode = (addr.postcode || '').replace(/\D/g, '').slice(0, 6);

      return {
        house_number: houseNumber,
        street: street || area || 'Location Pin',
        area: area || street || '',
        landmark: '',
        city,
        district,
        state,
        pincode,
        formatted_address: data.display_name || `${street}, ${area}, ${city}`,
        google_place_id: null,
        latitude: lat,
        longitude: lng,
      };
    }
  } catch (err) {
    console.warn('Reverse geocoding fallback failed:', err);
  }

  // Minimal coordinates fallback if offline
  return {
    house_number: '',
    street: 'Current Location Pin',
    area: '',
    landmark: '',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '',
    formatted_address: `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
    google_place_id: null,
    latitude: lat,
    longitude: lng,
  };
};

/**
 * Get device GPS coordinates via standard browser Geolocation API.
 */
export const getBrowserCoordinates = (): Promise<{ latitude: number; longitude: number }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        let msg = 'Unable to retrieve your location.';
        if (error.code === error.PERMISSION_DENIED) {
          msg = 'Location permission was denied. Please allow location access or type your address manually.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          msg = 'Location information is unavailable. Please enter your address manually.';
        } else if (error.code === error.TIMEOUT) {
          msg = 'The request to get your location timed out. Please try again or enter manually.';
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
};
