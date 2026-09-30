import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Search,
  CheckCircle2,
  AlertCircle,
  Truck,
  Sparkles,
  Home,
  Briefcase,
  Building,
  Phone,
  Check,
  Edit2,
  Plus,
  Loader2,
  ChevronRight,
  ShieldCheck,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  loadGoogleMapsApi,
  getBrowserCoordinates,
  reverseGeocodeCoordinates,
  parseGoogleAddressComponents,
  getGoogleMapsApiKey,
} from '../../lib/googleMaps';
import { userService } from '../../services/userService';
import type { CustomerAddress, ShippingCalculateResponse } from '../../types';

export interface AddressFormData {
  name: string;
  phone: string;
  house_number: string;
  street: string;
  area: string;
  landmark: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
  location_source: 'GOOGLE_PLACE' | 'CURRENT_LOCATION' | 'MANUAL' | 'SAVED_ADDRESS' | string;
  location_verified: boolean;
  address_type?: string;
  save_to_book?: boolean;
}

export interface DeliveryLocationPickerProps {
  value: AddressFormData;
  onChange: (data: AddressFormData) => void;
  shippingQuote?: ShippingCalculateResponse | null;
  isCalculatingQuote?: boolean;
  errors?: Partial<Record<keyof AddressFormData, string>>;
  onClearError?: (field: keyof AddressFormData) => void;
  onProceedToReview?: () => void;
}

// LocalStorage cache keys for permanent address retention (Amazon/Zepto behavior)
const LOCAL_STORAGE_SAVED_ADDRESSES = 'chovique_saved_addresses_cache';
const LOCAL_STORAGE_DEFAULT_ADDRESS = 'chovique_default_address';
const LOCAL_STORAGE_LAST_SAVED = 'chovique_last_saved_address';

// Dark luxury styling for Google Map
const luxuryMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#1a120b' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a120b' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c9a84c' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#e8d48b' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#8b7332' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#261b12' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2c1e13' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#3b2819' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9395a1' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#5c3d24' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f160e' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#e8d48b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0805' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#595d66' }] },
];

export const DeliveryLocationPicker: React.FC<DeliveryLocationPickerProps> = ({
  value,
  onChange,
  shippingQuote,
  isCalculatingQuote = false,
  errors = {},
  onClearError,
  onProceedToReview,
}) => {
  // Amazon/Zepto View Modes:
  // 'selected': Active selected delivery address card (Fast 1-click proceed, no repeated inputs)
  // 'list': Choose from list of saved addresses (Home, Work, etc.)
  // 'form': Enter new address or edit existing address
  const [viewMode, setViewMode] = useState<'selected' | 'list' | 'form'>('selected');
  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);

  // Form draft state for editing / adding
  const [formDraft, setFormDraft] = useState<AddressFormData>(value);
  const [formValidationErrors, setFormValidationErrors] = useState<Record<string, string>>({});

  // Assisted location fill state (opt-in inside form mode)
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [placesLoaded, setPlacesLoaded] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState<boolean>(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstanceRef = useRef<any>(null);
  const mapMarkerRef = useRef<any>(null);
  const autocompleteServiceRef = useRef<any>(null);
  const placesServiceRef = useRef<any>(null);

  // ─── 1. Load Saved Addresses from localStorage & Backend ───────────────────
  useEffect(() => {
    let localAddrs: CustomerAddress[] = [];
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_SAVED_ADDRESSES);
      if (raw) {
        localAddrs = JSON.parse(raw);
      }
    } catch {}

    // Check if initial value already has complete address
    const hasExistingAddress = Boolean(value.street && value.pincode && value.house_number);

    userService
      .getAddresses()
      .then((backendAddrs) => {
        const merged: CustomerAddress[] = [...(backendAddrs || [])];
        // Merge in localAddrs not already in backend by matching phone + street
        localAddrs.forEach((la) => {
          if (!merged.some((ma) => ma.id === la.id || (ma.street === la.street && ma.phone === la.phone))) {
            merged.push(la);
          }
        });

        setSavedAddresses(merged);

        if (merged.length > 0) {
          const defaultAddr = merged.find((a) => a.isDefault) || merged[0];
          // If value is blank, apply the default saved address automatically
          if (!hasExistingAddress) {
            applySavedAddress(defaultAddr, false);
            setViewMode('selected');
          } else {
            // Find if current value matches one of the saved
            const matched = merged.find(
              (a) => a.street === value.street && a.house_number === value.house_number
            );
            if (matched) {
              setSelectedSavedId(matched.id);
            }
            setViewMode('selected');
          }
        } else if (!hasExistingAddress) {
          // If no address at all, show the form so user can enter it once
          setViewMode('form');
        } else {
          setViewMode('selected');
        }
      })
      .catch(() => {
        // Backend offline / unauthenticated: use local cache
        setSavedAddresses(localAddrs);
        if (localAddrs.length > 0 && !hasExistingAddress) {
          applySavedAddress(localAddrs[0], false);
          setViewMode('selected');
        } else if (!hasExistingAddress) {
          setViewMode('form');
        } else {
          setViewMode('selected');
        }
      });
  }, []);

  // Sync formDraft whenever value changes from parent
  useEffect(() => {
    setFormDraft(value);
  }, [value]);

  // ─── 2. Google Maps script initialization (opt-in for new address) ──────────
  useEffect(() => {
    if (viewMode === 'form') {
      loadGoogleMapsApi().then((success) => {
        if (success && window.google?.maps) {
          setPlacesLoaded(true);
          if (window.google.maps.places?.AutocompleteService) {
            autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
          }
        }
      });
    }
  }, [viewMode]);

  // ─── 3. Apply a saved address (Amazon/Zepto instant select) ────────────────
  const applySavedAddress = (addr: CustomerAddress, returnToSelected = true) => {
    setSelectedSavedId(addr.id);
    const newFormVal: AddressFormData = {
      name: addr.name || value.name,
      phone: addr.phone || value.phone,
      house_number: addr.house_number || (addr as any).houseNumber || '',
      street: addr.street || '',
      area: addr.area || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Visakhapatnam',
      district: addr.district || 'Visakhapatnam',
      state: addr.state || 'Andhra Pradesh',
      pincode: (addr.pincode || addr.zip || '').replace(/\D/g, '').slice(0, 6),
      latitude: addr.latitude ?? null,
      longitude: addr.longitude ?? null,
      formatted_address: addr.formatted_address || (addr as any).formattedAddress || null,
      google_place_id: addr.google_place_id || (addr as any).googlePlaceId || null,
      location_source: addr.location_source || (addr as any).locationSource || 'SAVED_ADDRESS',
      location_verified: Boolean(addr.location_verified || (addr as any).locationVerified),
      address_type: addr.type || 'HOME',
      save_to_book: false,
    };

    onChange(newFormVal);

    // Save as last-used in localStorage
    try {
      localStorage.setItem(LOCAL_STORAGE_LAST_SAVED, JSON.stringify(newFormVal));
    } catch {}

    if (returnToSelected) {
      setViewMode('selected');
    }
  };

  // ─── 4. Handlers for Transitioning Views ───────────────────────────────────
  const handleStartNewAddress = () => {
    setFormDraft({
      name: value.name || '',
      phone: value.phone || '',
      house_number: '',
      street: '',
      area: '',
      landmark: '',
      city: 'Visakhapatnam',
      district: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pincode: '',
      latitude: null,
      longitude: null,
      formatted_address: null,
      google_place_id: null,
      location_source: 'MANUAL',
      location_verified: false,
      address_type: 'HOME',
      save_to_book: true,
    });
    setFormValidationErrors({});
    setIsEditing(false);
    setViewMode('form');
  };

  const handleStartEditAddress = () => {
    setFormDraft(value);
    setFormValidationErrors({});
    setIsEditing(true);
    setViewMode('form');
  };

  const handleStartEditSpecificAddress = (addr: CustomerAddress) => {
    setFormDraft({
      name: addr.name || '',
      phone: addr.phone || '',
      house_number: addr.house_number || (addr as any).houseNumber || '',
      street: addr.street || '',
      area: addr.area || '',
      landmark: addr.landmark || '',
      city: addr.city || 'Visakhapatnam',
      district: addr.district || 'Visakhapatnam',
      state: addr.state || 'Andhra Pradesh',
      pincode: (addr.pincode || addr.zip || '').replace(/\D/g, '').slice(0, 6),
      latitude: addr.latitude ?? null,
      longitude: addr.longitude ?? null,
      formatted_address: addr.formatted_address || (addr as any).formattedAddress || null,
      google_place_id: addr.google_place_id || (addr as any).googlePlaceId || null,
      location_source: addr.location_source || 'SAVED_ADDRESS',
      location_verified: Boolean(addr.location_verified),
      address_type: addr.type || 'HOME',
      save_to_book: true,
    });
    setFormValidationErrors({});
    setIsEditing(true);
    setViewMode('form');
  };

  // ─── 5. Save & Confirm Address from Form ────────────────────────────────────
  const handleSaveAndUseAddress = async () => {
    const errs: Record<string, string> = {};
    if (!formDraft.name.trim()) errs.name = 'Full name is required.';
    if (!formDraft.phone.trim()) {
      errs.phone = 'Mobile number is required.';
    } else if (!/^\d{10}$/.test(formDraft.phone.replace(/\D/g, ''))) {
      errs.phone = 'Enter a valid 10-digit mobile number.';
    }
    if (!formDraft.house_number.trim()) errs.house_number = 'House / Flat number is required.';
    if (!formDraft.street.trim()) errs.street = 'Street name is required.';
    if (!formDraft.area.trim()) errs.area = 'Area / Locality is required.';
    if (!formDraft.city.trim()) errs.city = 'City is required.';
    if (!formDraft.state.trim()) errs.state = 'State is required.';
    if (!formDraft.pincode.trim()) {
      errs.pincode = 'PIN code is required.';
    } else if (!/^\d{6}$/.test(formDraft.pincode.replace(/\D/g, ''))) {
      errs.pincode = 'Enter a 6-digit PIN code.';
    }

    if (Object.keys(errs).length > 0) {
      setFormValidationErrors(errs);
      return;
    }

    setFormValidationErrors({});
    const cleanedDraft: AddressFormData = {
      ...formDraft,
      phone: formDraft.phone.replace(/\D/g, '').slice(0, 10),
      pincode: formDraft.pincode.replace(/\D/g, '').slice(0, 6),
    };

    // Propagate up to checkout parent
    onChange(cleanedDraft);

    // Save to localStorage cache permanently
    try {
      localStorage.setItem(LOCAL_STORAGE_LAST_SAVED, JSON.stringify(cleanedDraft));
      localStorage.setItem(LOCAL_STORAGE_DEFAULT_ADDRESS, JSON.stringify(cleanedDraft));

      const newSavedItem: CustomerAddress = {
        id: `addr_${Date.now()}`,
        title: cleanedDraft.address_type || 'Delivery Address',
        name: cleanedDraft.name,
        phone: cleanedDraft.phone,
        house_number: cleanedDraft.house_number,
        street: cleanedDraft.street,
        area: cleanedDraft.area,
        landmark: cleanedDraft.landmark,
        city: cleanedDraft.city,
        district: cleanedDraft.district,
        state: cleanedDraft.state,
        zip: cleanedDraft.pincode,
        pincode: cleanedDraft.pincode,
        latitude: cleanedDraft.latitude,
        longitude: cleanedDraft.longitude,
        formatted_address: cleanedDraft.formatted_address,
        google_place_id: cleanedDraft.google_place_id,
        location_source: cleanedDraft.location_source,
        location_verified: cleanedDraft.location_verified,
        type: cleanedDraft.address_type || 'HOME',
        isDefault: true,
      };

      const updatedList = [newSavedItem, ...savedAddresses.filter((a) => a.street !== cleanedDraft.street)];
      setSavedAddresses(updatedList);
      localStorage.setItem(LOCAL_STORAGE_SAVED_ADDRESSES, JSON.stringify(updatedList));

      // Also persist to backend if user is authenticated
      if (cleanedDraft.save_to_book) {
        userService.addAddress(newSavedItem).catch(() => {});
      }
    } catch {}

    // Switch to Amazon/Zepto selected card view
    setViewMode('selected');
  };

  // ─── 6. Optional Assisted Location (Use GPS or Google Places) ──────────────
  const handleUseCurrentLocation = async () => {
    setIsLocating(true);
    setLocationStatus('Getting GPS position...');
    try {
      const coords = await getBrowserCoordinates();
      setLocationStatus('Pinpointing address from coordinates...');
      const parsed = await reverseGeocodeCoordinates(coords.latitude, coords.longitude);

      setFormDraft((prev) => ({
        ...prev,
        ...parsed,
        latitude: coords.latitude,
        longitude: coords.longitude,
        location_source: 'CURRENT_LOCATION',
        location_verified: true,
      }));
      setLocationStatus('Address detected from live GPS coordinates.');
      setTimeout(() => setLocationStatus(null), 3500);
    } catch (err: any) {
      console.warn('Geolocation failed:', err);
      setLocationStatus(err.message || 'Could not fetch GPS location.');
      setTimeout(() => setLocationStatus(null), 4000);
    } finally {
      setIsLocating(false);
    }
  };

  const handlePlacesSearch = (q: string) => {
    setSearchQuery(q);
    if (!q.trim() || !autocompleteServiceRef.current) {
      setPredictions([]);
      return;
    }
    setIsSearchingPlaces(true);
    autocompleteServiceRef.current.getPlacePredictions(
      { input: q, componentRestrictions: { country: 'in' } },
      (preds: any[], status: any) => {
        setIsSearchingPlaces(false);
        if (status === window.google?.maps?.places?.PlacesServiceStatus?.OK && preds) {
          setPredictions(preds);
        } else {
          setPredictions([]);
        }
      }
    );
  };

  const handleSelectPrediction = (placeId: string, description: string) => {
    setSearchQuery(description);
    setPredictions([]);
    setLocationStatus('Fetching address components...');

    if (!placesServiceRef.current && mapContainerRef.current && window.google?.maps?.places) {
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapContainerRef.current);
    }

    if (placesServiceRef.current) {
      placesServiceRef.current.getDetails(
        { placeId, fields: ['address_components', 'geometry', 'formatted_address', 'place_id'] },
        (place: any, pStatus: any) => {
          if (pStatus === window.google.maps.places.PlacesServiceStatus.OK && place) {
            const lat = place.geometry?.location ? place.geometry.location.lat() : null;
            const lng = place.geometry?.location ? place.geometry.location.lng() : null;
            const parsed = parseGoogleAddressComponents(
              place.address_components || [],
              place.formatted_address || description,
              place.place_id,
              lat,
              lng
            );

            setFormDraft((prev) => ({
              ...prev,
              ...parsed,
              latitude: lat,
              longitude: lng,
              google_place_id: place.place_id,
              location_source: 'GOOGLE_PLACE',
              location_verified: true,
            }));
            setLocationStatus('Location loaded from Google Places.');
            setTimeout(() => setLocationStatus(null), 3000);
          }
        }
      );
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE 1: AMAZON / ZEPTO SELECTED ADDRESS CARD
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'selected') {
    const isComplete = Boolean(value.street && value.pincode && value.house_number);

    return (
      <div className="delivery-location-picker" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Selected Luxury Card */}
        <div
          className="selected-address-card"
          style={{
            background: 'linear-gradient(135deg, rgba(30, 20, 12, 0.95) 0%, rgba(16, 11, 8, 0.98) 100%)',
            border: '1.5px solid rgba(201, 168, 76, 0.45)',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.55)',
            position: 'relative',
          }}
        >
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(201, 168, 76, 0.2)',
                  border: '1px solid rgba(201, 168, 76, 0.5)',
                  color: '#f5d77f',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 12px',
                  borderRadius: '20px',
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                }}
              >
                <MapPin size={13} />
                Delivering to this Address
              </span>

              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: 'var(--cream)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '20px',
                  textTransform: 'uppercase',
                }}
              >
                {value.address_type || 'HOME'} · DEFAULT
              </span>
            </div>

            {/* Doorstep GPS Verified Status */}
            {value.latitude && value.longitude ? (
              <span
                style={{
                  fontSize: '0.74rem',
                  color: '#4ade80',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(74, 222, 128, 0.12)',
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                  padding: '3px 10px',
                  borderRadius: '16px',
                }}
              >
                <CheckCircle2 size={13} />
                Doorstep Coordinates Verified
              </span>
            ) : null}
          </div>

          {/* Recipient Details */}
          <div style={{ marginBottom: '12px' }}>
            <h3
              style={{
                fontSize: '1.25rem',
                color: '#f5efe6',
                margin: '0 0 4px',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
              }}
            >
              {value.name || 'Valued Chovique Guest'}
            </h3>
            <div style={{ fontSize: '0.88rem', color: '#c9a84c', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} />
              <strong>+91 {value.phone || '9876543210'}</strong>
            </div>
          </div>

          {/* Formatted Address Lines */}
          <div style={{ fontSize: '0.94rem', color: 'rgba(255, 255, 255, 0.88)', lineHeight: 1.6, marginBottom: '16px' }}>
            <div>{[value.house_number, value.street].filter(Boolean).join(', ')}</div>
            <div>
              {[value.area, value.city, value.state].filter(Boolean).join(', ')} —{' '}
              <strong style={{ color: '#f5d77f' }}>{value.pincode}</strong>
            </div>
            {value.landmark && (
              <div style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.65)', marginTop: '4px' }}>
                🏛️ Landmark: {value.landmark}
              </div>
            )}
          </div>

          {/* Shipping Serviceability Badge */}
          {shippingQuote && (
            <div
              style={{
                padding: '12px 16px',
                borderRadius: '10px',
                background:
                  shippingQuote.fulfillment_type === 'LOCAL'
                    ? 'linear-gradient(90deg, rgba(201, 168, 76, 0.16) 0%, rgba(20, 14, 10, 0.8) 100%)'
                    : 'linear-gradient(90deg, rgba(59, 130, 246, 0.14) 0%, rgba(20, 14, 10, 0.8) 100%)',
                border: `1px solid ${
                  shippingQuote.fulfillment_type === 'LOCAL' ? 'rgba(201, 168, 76, 0.4)' : 'rgba(59, 130, 246, 0.35)'
                }`,
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>{shippingQuote.fulfillment_type === 'LOCAL' ? '⚡' : '📦'}</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.88rem' }}>
                    {shippingQuote.fulfillment_type === 'LOCAL'
                      ? 'Local Express Fast Delivery (3-5 Hours)'
                      : 'Standard Express Courier Delivery'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.65)' }}>
                    {shippingQuote.message} · Est: {shippingQuote.estimated_delivery}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 800,
                    color: shippingQuote.delivery_charge === 0 ? '#4ade80' : 'var(--gold)',
                  }}
                >
                  {shippingQuote.delivery_charge === 0 ? 'FREE DELIVERY' : `₹${shippingQuote.delivery_charge.toFixed(2)} Fee`}
                </span>
              </div>
            </div>
          )}

          {/* Amazon / Zepto Actions Row */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
              alignItems: 'center',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '18px',
            }}
          >
            {/* Primary Action Button: Deliver to this address (Zero API calls, Zero GPS triggers) */}
            <Button
              variant="gold"
              size="lg"
              glow
              disabled={isCalculatingQuote || Boolean(shippingQuote && !shippingQuote.serviceable) || !isComplete}
              onClick={() => onProceedToReview?.()}
              style={{
                flex: 2,
                minWidth: '220px',
                padding: '14px 22px',
                fontSize: '0.98rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              {isCalculatingQuote ? (
                <>
                  <Loader2 size={16} className="spin" />
                  <span>Verifying Delivery...</span>
                </>
              ) : (
                <>
                  <Check size={18} />
                  <span>Deliver to this Address</span>
                </>
              )}
            </Button>

            {/* Change Delivery Address Button */}
            <button
              type="button"
              onClick={() => setViewMode('list')}
              style={{
                flex: 1,
                minWidth: '150px',
                padding: '13px 18px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#f5efe6',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Change Address ({savedAddresses.length})
            </button>

            {/* Add New Address Button */}
            <button
              type="button"
              onClick={handleStartNewAddress}
              style={{
                padding: '13px 18px',
                borderRadius: '8px',
                background: 'transparent',
                border: '1px dashed rgba(201, 168, 76, 0.45)',
                color: '#c9a84c',
                fontSize: '0.86rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={15} />
              <span>Add New</span>
            </button>

            {/* Edit details */}
            <button
              type="button"
              onClick={handleStartEditAddress}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.65)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                textDecoration: 'underline',
                padding: '6px 8px',
              }}
            >
              Edit details
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE 2: SAVED ADDRESSES SELECTOR LIST (AMAZON / ZEPTO STYLE)
  // ═══════════════════════════════════════════════════════════════════════════
  if (viewMode === 'list') {
    return (
      <div className="delivery-location-picker" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div>
            <h3
              style={{
                fontSize: '1.25rem',
                color: '#f5efe6',
                margin: '0 0 4px',
                fontWeight: 800,
                fontFamily: 'var(--font-display)',
              }}
            >
              Select Delivery Address
            </h3>
            <p style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.65)', margin: 0 }}>
              Choose from your saved addresses below or add a new delivery location.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <Button variant="gold" size="sm" onClick={handleStartNewAddress} style={{ display: 'flex', gap: '6px' }}>
              <Plus size={14} /> Add New Address
            </Button>
            {value.street && (
              <button
                type="button"
                onClick={() => setViewMode('selected')}
                style={{
                  padding: '7px 14px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#f5efe6',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Back to Selected
              </button>
            )}
          </div>
        </div>

        {/* Saved Addresses Radio Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
            gap: '14px',
          }}
        >
          {savedAddresses.map((addr) => {
            const isSelected =
              selectedSavedId === addr.id ||
              (value.street === addr.street && value.house_number === addr.house_number);

            return (
              <div
                key={addr.id}
                style={{
                  background: isSelected
                    ? 'linear-gradient(135deg, rgba(42, 28, 16, 0.95), rgba(22, 15, 10, 0.95))'
                    : 'rgba(24, 18, 14, 0.8)',
                  border: `1.5px solid ${isSelected ? '#c9a84c' : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '14px',
                  boxShadow: isSelected ? '0 6px 20px rgba(201, 168, 76, 0.18)' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#c9a84c',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {addr.type || 'HOME'} {addr.isDefault ? '· DEFAULT' : ''}
                    </span>
                    {addr.latitude && addr.longitude && (
                      <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>
                        ✓ GPS Verified
                      </span>
                    )}
                  </div>

                  <strong style={{ fontSize: '1rem', color: '#f5efe6' }}>{addr.name}</strong>

                  <div
                    style={{
                      fontSize: '0.84rem',
                      color: 'rgba(255, 255, 255, 0.75)',
                      marginTop: '4px',
                      lineHeight: 1.45,
                    }}
                  >
                    {[addr.house_number, addr.street, addr.area].filter(Boolean).join(', ')}
                    <br />
                    {addr.city}, {addr.state} — <strong>{addr.pincode || addr.zip}</strong>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#c9a84c', marginTop: '6px' }}>
                    📞 {addr.phone}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    gap: '8px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                    paddingTop: '12px',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => {
                      applySavedAddress(addr, true);
                    }}
                    style={{
                      flex: 2,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: isSelected ? 'linear-gradient(135deg, #c9a84c, #8a6d2b)' : 'rgba(201, 168, 76, 0.2)',
                      border: '1px solid #c9a84c',
                      color: isSelected ? '#0f0c0a' : '#f5d77f',
                      fontWeight: 800,
                      fontSize: '0.84rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Check size={14} />
                    <span>{isSelected ? 'Selected Address' : 'Deliver Here'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartEditSpecificAddress(addr)}
                    style={{
                      flex: 1,
                      padding: '10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: 'rgba(255, 255, 255, 0.8)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEW MODE 3: ADD / EDIT ADDRESS FORM (CLEAN, USER-DRIVEN)
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div className="delivery-location-picker" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Form Header with Back Action */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3
            style={{
              fontSize: '1.25rem',
              color: '#f5efe6',
              margin: '0 0 4px',
              fontWeight: 800,
              fontFamily: 'var(--font-display)',
            }}
          >
            {isEditing ? 'Edit Delivery Address' : 'Add New Delivery Address'}
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'rgba(255, 255, 255, 0.65)', margin: 0 }}>
            Enter your address details once. We will save it so you never need to re-enter it.
          </p>
        </div>

        {savedAddresses.length > 0 && (
          <button
            type="button"
            onClick={() => setViewMode(value.street ? 'selected' : 'list')}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#f5efe6',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Saved Addresses</span>
          </button>
        )}
      </div>

      {/* Optional Assisted Fill Box (Purely opt-in, only triggered when clicked) */}
      <div
        style={{
          background: 'rgba(201, 168, 76, 0.08)',
          border: '1px solid rgba(201, 168, 76, 0.25)',
          borderRadius: '12px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '10px' }}>
          <div>
            <div style={{ fontWeight: 700, color: '#f5efe6', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={15} color="#c9a84c" />
              Quick Assist (Optional)
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.65)' }}>
              Use your device GPS or search Google Places to auto-fill street and coordinates.
            </div>
          </div>

          <Button
            type="button"
            variant="gold"
            size="sm"
            onClick={handleUseCurrentLocation}
            disabled={isLocating}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', fontSize: '0.82rem' }}
          >
            {isLocating ? (
              <>
                <Loader2 size={14} className="spin" />
                <span>Locating...</span>
              </>
            ) : (
              <>
                <MapPin size={14} />
                <span>Use Current Location</span>
              </>
            )}
          </Button>
        </div>

        {/* Places Search Input */}
        {placesLoaded && (
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gold)',
                }}
              />
              <input
                type="text"
                placeholder="Search apartment, landmark, or street in Google Maps..."
                value={searchQuery}
                onChange={(e) => handlePlacesSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  borderRadius: '6px',
                  background: 'rgba(0, 0, 0, 0.4)',
                  border: '1px solid rgba(201, 168, 76, 0.3)',
                  color: 'var(--cream)',
                  fontSize: '0.84rem',
                  outline: 'none',
                }}
              />
              {isSearchingPlaces && (
                <Loader2
                  size={14}
                  className="spin"
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--gold)',
                  }}
                />
              )}
            </div>

            {/* Predictions Dropdown */}
            {predictions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: '#1a0d00',
                  border: '1px solid var(--gold)',
                  borderRadius: '6px',
                  marginTop: '4px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                }}
              >
                {predictions.map((p) => (
                  <div
                    key={p.place_id}
                    onClick={() => handleSelectPrediction(p.place_id, p.description)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.05)',
                      fontSize: '0.84rem',
                      color: 'var(--cream)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,168,76,0.15)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <MapPin size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.structured_formatting?.main_text || p.description}</div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--grey-light)' }}>
                        {p.structured_formatting?.secondary_text || ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {locationStatus && (
          <div
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              background: 'rgba(201, 168, 76, 0.15)',
              color: '#f5d77f',
              fontSize: '0.78rem',
              marginTop: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Sparkles size={12} />
            <span>{locationStatus}</span>
          </div>
        )}
      </div>

      {/* Structured Address Form Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Recipient Name and Phone */}
        <div className="checkout-grid-two">
          <Input
            label="Recipient Full Name"
            placeholder="e.g. Rahul Sharma"
            value={formDraft.name}
            onChange={(e) => {
              setFormDraft({ ...formDraft, name: e.target.value });
              setFormValidationErrors((prev) => ({ ...prev, name: '' }));
            }}
            error={formValidationErrors.name || errors.name}
            required
          />
          <Input
            label="10-Digit Mobile Number"
            placeholder="e.g. 9876543210"
            type="tel"
            maxLength={10}
            value={formDraft.phone}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
              setFormDraft({ ...formDraft, phone: cleaned });
              setFormValidationErrors((prev) => ({ ...prev, phone: '' }));
            }}
            error={formValidationErrors.phone || errors.phone}
            required
          />
        </div>

        {/* Flat / Door and Street */}
        <div className="checkout-grid-two">
          <Input
            label="Flat / House / Door / Floor No."
            placeholder="e.g. Flat 304, Royal Palms"
            value={formDraft.house_number}
            onChange={(e) => {
              setFormDraft({ ...formDraft, house_number: e.target.value });
              setFormValidationErrors((prev) => ({ ...prev, house_number: '' }));
            }}
            error={formValidationErrors.house_number || errors.house_number}
            required
          />
          <Input
            label="Street / Road"
            placeholder="e.g. Beach Road, Sector 3"
            value={formDraft.street}
            onChange={(e) => {
              setFormDraft({ ...formDraft, street: e.target.value });
              setFormValidationErrors((prev) => ({ ...prev, street: '' }));
            }}
            error={formValidationErrors.street || errors.street}
            required
          />
        </div>

        {/* Area and Landmark */}
        <div className="checkout-grid-two">
          <Input
            label="Area / Locality / Sector"
            placeholder="e.g. MVP Colony"
            value={formDraft.area}
            onChange={(e) => {
              setFormDraft({ ...formDraft, area: e.target.value });
              setFormValidationErrors((prev) => ({ ...prev, area: '' }));
            }}
            error={formValidationErrors.area || errors.area}
            required
          />
          <Input
            label="Landmark (Optional)"
            placeholder="e.g. Near Apollo Hospital"
            value={formDraft.landmark}
            onChange={(e) => {
              setFormDraft({ ...formDraft, landmark: e.target.value });
            }}
          />
        </div>

        {/* City, District, State, PIN */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
          <Input
            label="City"
            value={formDraft.city}
            onChange={(e) => {
              setFormDraft({ ...formDraft, city: e.target.value });
              setFormValidationErrors((prev) => ({ ...prev, city: '' }));
            }}
            error={formValidationErrors.city || errors.city}
            required
          />
          <Input
            label="District"
            value={formDraft.district}
            onChange={(e) => setFormDraft({ ...formDraft, district: e.target.value })}
          />
          <Input
            label="State"
            value={formDraft.state}
            onChange={(e) => {
              setFormDraft({ ...formDraft, state: e.target.value });
              setFormValidationErrors((prev) => ({ ...prev, state: '' }));
            }}
            error={formValidationErrors.state || errors.state}
            required
          />
          <Input
            label="6-Digit PIN Code"
            placeholder="530017"
            value={formDraft.pincode}
            maxLength={6}
            onChange={(e) => {
              const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
              setFormDraft({ ...formDraft, pincode: cleaned });
              setFormValidationErrors((prev) => ({ ...prev, pincode: '' }));
            }}
            error={formValidationErrors.pincode || errors.pincode}
            required
          />
        </div>

        {/* Address Type Tag & Save to Profile */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            marginTop: '6px',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--cream)', fontWeight: 600 }}>Address Type:</span>
            {['HOME', 'OFFICE', 'OTHER'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFormDraft({ ...formDraft, address_type: t })}
                style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border:
                    (formDraft.address_type || 'HOME') === t
                      ? '1px solid var(--gold)'
                      : '1px solid rgba(255, 255, 255, 0.15)',
                  background:
                    (formDraft.address_type || 'HOME') === t ? 'rgba(201, 168, 76, 0.2)' : 'transparent',
                  color: (formDraft.address_type || 'HOME') === t ? 'var(--gold)' : 'var(--cream)',
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={formDraft.save_to_book ?? true}
              onChange={(e) => setFormDraft({ ...formDraft, save_to_book: e.target.checked })}
              style={{ accentColor: 'var(--gold)' }}
            />
            <span style={{ fontSize: '0.82rem', color: 'var(--cream)' }}>
              Save address permanently for 1-click checkout
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '14px', flexWrap: 'wrap' }}>
          <Button
            variant="gold"
            size="lg"
            glow
            type="button"
            onClick={handleSaveAndUseAddress}
            style={{ flex: 2, minWidth: '220px', padding: '14px', fontWeight: 800 }}
          >
            <Check size={18} />
            <span>Save & Deliver to this Address</span>
          </Button>

          {savedAddresses.length > 0 && (
            <button
              type="button"
              onClick={() => setViewMode(value.street ? 'selected' : 'list')}
              style={{
                flex: 1,
                minWidth: '120px',
                padding: '14px',
                borderRadius: '8px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#f5efe6',
                fontWeight: 700,
                fontSize: '0.86rem',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeliveryLocationPicker;
