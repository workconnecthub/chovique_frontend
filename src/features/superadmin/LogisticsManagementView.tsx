import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Store,
  Compass,
  Navigation,
  ExternalLink,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { shippingService } from '../../services/shippingService';
import type { StoreLocation, DeliveryServiceArea } from '../../types';

interface LogisticsManagementViewProps {
  addToast?: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
}

export const LogisticsManagementView: React.FC<LogisticsManagementViewProps> = ({ addToast }) => {
  const [activeTab, setActiveTab] = useState<'stores' | 'service-areas'>('stores');
  const [stores, setStores] = useState<StoreLocation[]>([]);
  const [serviceAreas, setServiceAreas] = useState<DeliveryServiceArea[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Store Modal State
  const [showStoreModal, setShowStoreModal] = useState(false);
  const [editingStore, setEditingStore] = useState<StoreLocation | null>(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    house_number: '',
    street: '',
    area: '',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    pincode: '',
    phone: '',
    latitude: '' as string | number,
    longitude: '' as string | number,
    is_primary: false,
    active: true,
  });

  // Service Area Modal State
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<DeliveryServiceArea | null>(null);
  const [areaForm, setAreaForm] = useState({
    store_location_id: '',
    pincode: '',
    city: 'Visakhapatnam',
    district: 'Visakhapatnam',
    state: 'Andhra Pradesh',
    delivery_mode: 'LOCAL',
    delivery_charge: 40,
    free_delivery_threshold: 500 as number | string | null,
    same_day_available: true,
    estimated_delivery: 'Within 3-5 hours',
    active: true,
  });

  // Confirmation modal
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'store' | 'area';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const notify = (type: 'success' | 'error' | 'info', message: string, title?: string) => {
    if (addToast) {
      addToast(type, message, title);
    } else {
      alert(`${title ? `[${title}] ` : ''}${message}`);
    }
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [fetchedStores, fetchedAreas] = await Promise.all([
        shippingService.getStoreLocations(false),
        shippingService.getServiceAreas(false),
      ]);
      setStores(fetchedStores || []);
      setServiceAreas(fetchedAreas || []);
    } catch (err: any) {
      notify('error', err.message || 'Failed to load logistics configuration', 'Error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Store Modal
  const openCreateStore = () => {
    setEditingStore(null);
    setStoreForm({
      name: '',
      house_number: '',
      street: '',
      area: '',
      city: 'Visakhapatnam',
      district: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      pincode: '',
      phone: '',
      latitude: '',
      longitude: '',
      is_primary: stores.length === 0,
      active: true,
    });
    setShowStoreModal(true);
  };

  const openEditStore = (st: StoreLocation) => {
    setEditingStore(st);
    setStoreForm({
      name: st.name,
      house_number: st.house_number || '',
      street: st.street || '',
      area: st.area || '',
      city: st.city,
      district: st.district || '',
      state: st.state,
      pincode: st.pincode,
      phone: st.phone || '',
      latitude: st.latitude ?? '',
      longitude: st.longitude ?? '',
      is_primary: st.is_primary,
      active: st.active,
    });
    setShowStoreModal(true);
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeForm.name.trim() || !storeForm.street.trim() || !storeForm.pincode.trim()) {
      notify('error', 'Please fill in store name, street, and PIN code.', 'Validation');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: storeForm.name.trim(),
        house_number: storeForm.house_number.trim() || null,
        street: storeForm.street.trim(),
        area: storeForm.area.trim() || null,
        city: storeForm.city.trim(),
        district: storeForm.district.trim() || null,
        state: storeForm.state.trim(),
        pincode: storeForm.pincode.trim(),
        phone: storeForm.phone.trim() || null,
        latitude: storeForm.latitude !== '' ? Number(storeForm.latitude) : null,
        longitude: storeForm.longitude !== '' ? Number(storeForm.longitude) : null,
        is_primary: storeForm.is_primary,
        active: storeForm.active,
      };

      if (editingStore) {
        await shippingService.updateStoreLocation(editingStore.id, payload);
        notify('success', 'Store location updated successfully!', 'Updated');
      } else {
        await shippingService.createStoreLocation(payload);
        notify('success', 'New store location registered successfully!', 'Created');
      }
      setShowStoreModal(false);
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to save store location', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPrimary = async (storeId: string) => {
    try {
      await shippingService.setPrimaryStore(storeId);
      notify('success', 'Primary origin store updated successfully!', 'Updated');
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to update primary store', 'Error');
    }
  };

  // Open Service Area Modal
  const openCreateArea = () => {
    setEditingArea(null);
    const primary = stores.find((s) => s.is_primary) || stores[0];
    setAreaForm({
      store_location_id: primary?.id || '',
      pincode: '',
      city: 'Visakhapatnam',
      district: 'Visakhapatnam',
      state: 'Andhra Pradesh',
      delivery_mode: 'LOCAL',
      delivery_charge: 40,
      free_delivery_threshold: 500,
      same_day_available: true,
      estimated_delivery: 'Within 3-5 hours',
      active: true,
    });
    setShowAreaModal(true);
  };

  const openEditArea = (area: DeliveryServiceArea) => {
    setEditingArea(area);
    setAreaForm({
      store_location_id: area.store_location_id || '',
      pincode: area.pincode,
      city: area.city,
      district: area.district || '',
      state: area.state,
      delivery_mode: area.delivery_mode,
      delivery_charge: area.delivery_charge,
      free_delivery_threshold: area.free_delivery_threshold ?? 500,
      same_day_available: area.same_day_available,
      estimated_delivery: area.estimated_delivery,
      active: area.active,
    });
    setShowAreaModal(true);
  };

  const handleSaveArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(areaForm.pincode.trim())) {
      notify('error', 'PIN code must be exactly 6 numeric digits.', 'Validation');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        store_location_id: areaForm.store_location_id || null,
        pincode: areaForm.pincode.trim(),
        city: areaForm.city.trim(),
        district: areaForm.district.trim() || null,
        state: areaForm.state.trim(),
        delivery_mode: areaForm.delivery_mode,
        delivery_charge: Number(areaForm.delivery_charge),
        free_delivery_threshold:
          areaForm.free_delivery_threshold !== '' && areaForm.free_delivery_threshold != null
            ? Number(areaForm.free_delivery_threshold)
            : null,
        same_day_available: areaForm.same_day_available,
        estimated_delivery: areaForm.estimated_delivery.trim(),
        active: areaForm.active,
      };

      if (editingArea) {
        await shippingService.updateServiceArea(editingArea.id, payload);
        notify('success', `PIN code ${payload.pincode} rule updated!`, 'Updated');
      } else {
        await shippingService.createServiceArea(payload);
        notify('success', `PIN code ${payload.pincode} registered as local service area!`, 'Created');
      }
      setShowAreaModal(false);
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Failed to save service area', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm delete handler
  const handleExecuteDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'store') {
        await shippingService.deleteStoreLocation(deleteConfirm.id);
        notify('success', 'Store location deactivated.', 'Deleted');
      } else {
        await shippingService.deleteServiceArea(deleteConfirm.id);
        notify('success', 'Service area rule removed.', 'Deleted');
      }
      setDeleteConfirm(null);
      await loadData();
    } catch (err: any) {
      notify('error', err.message || 'Deletion failed', 'Error');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header with Title and Mode Switcher */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: '1.6rem',
              fontFamily: 'var(--font-display)',
              color: 'var(--cream)',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <Store style={{ color: 'var(--gold)' }} />
            Dual-Mode Logistics & Fulfillment Hubs
          </h2>
          <p style={{ color: 'var(--grey-light)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
            Configure origin stores, internal delivery boy service areas, and third-party courier dispatch rules.
          </p>
        </div>

        {/* Action Button */}
        <div>
          {activeTab === 'stores' ? (
            <Button variant="gold" size="sm" onClick={openCreateStore} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add Store / Hub
            </Button>
          ) : (
            <Button variant="gold" size="sm" onClick={openCreateArea} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Add Local PIN Code
            </Button>
          )}
        </div>
      </div>

      {/* Dual Logistics Overview Card */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
        }}
      >
        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.12), rgba(26,13,0,0.6))',
            border: '1px solid rgba(201,168,76,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'var(--gold)',
                color: 'var(--dark-chocolate)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              ⚡
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.95rem' }}>
                Mode 1: Local Express Delivery
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gold)' }}>
                Internal Delivery Boys · Same-Day · 3-5 Hours
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--beige)', margin: 0, lineHeight: 1.4 }}>
            Applies to configured PIN codes matching active store delivery zones. Orders can be directly assigned to internal delivery personnel.
          </p>
        </div>

        <div
          style={{
            padding: '16px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(26,13,0,0.6))',
            border: '1px solid rgba(59,130,246,0.3)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: '#3b82f6',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--cream)', fontSize: '0.95rem' }}>
                Mode 2: Courier Delivery (Pan-India)
              </div>
              <div style={{ fontSize: '0.75rem', color: '#93c5fd' }}>
                iThink Logistics Express · 2-4 Business Days
              </div>
            </div>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--beige)', margin: 0, lineHeight: 1.4 }}>
            Automatically handles all serviceable PIN codes outside local delivery zones with automated courier routing and tracking.
          </p>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: '8px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('stores')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: activeTab === 'stores' ? 'var(--gold)' : 'var(--grey-light)',
            borderBottom: activeTab === 'stores' ? '2px solid var(--gold)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Store size={16} /> Origin Stores & Hubs ({stores.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('service-areas')}
          style={{
            background: 'none',
            border: 'none',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: activeTab === 'service-areas' ? 'var(--gold)' : 'var(--grey-light)',
            borderBottom: activeTab === 'service-areas' ? '2px solid var(--gold)' : '2px solid transparent',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <MapPin size={16} /> Local Service Area PINs ({serviceAreas.length})
        </button>
      </div>

      {isLoading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--gold)' }}>
          <Loader2 size={32} className="spin" style={{ margin: '0 auto 12px' }} />
          <span>Loading logistics data...</span>
        </div>
      ) : activeTab === 'stores' ? (
        /* STORES & HUBS TABLE */
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px' }}>
          {stores.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--grey-light)' }}>
              No origin store locations configured. Click "+ Add Store / Hub" to register your flagship store.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
              {stores.map((st) => (
                <div
                  key={st.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.025)',
                    border: st.is_primary ? '1.5px solid var(--gold)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          background: st.is_primary ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.08)',
                          color: st.is_primary ? 'var(--gold)' : 'var(--grey-light)',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                        }}
                      >
                        {st.is_primary ? '⭐ Primary Origin' : 'Secondary Hub'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: st.active ? '#4ade80' : '#ef4444', fontWeight: 600 }}>
                        {st.active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>

                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--cream)', marginBottom: '4px' }}>
                      {st.name}
                    </div>

                    <div style={{ fontSize: '0.84rem', color: 'var(--beige)', lineHeight: 1.4 }}>
                      {st.house_number ? `${st.house_number}, ` : ''}
                      {st.street}
                      {st.area ? `, ${st.area}` : ''}
                      <br />
                      {st.city}, {st.state} — <strong>{st.pincode}</strong>
                    </div>

                    {st.phone && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--grey-light)', marginTop: '6px' }}>
                        📞 {st.phone}
                      </div>
                    )}

                    {st.latitude && st.longitude && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--gold)', marginTop: '4px' }}>
                        📍 {st.latitude.toFixed(4)}, {st.longitude.toFixed(4)}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      borderTop: '1px solid rgba(255,255,255,0.06)',
                      paddingTop: '10px',
                      justifyContent: 'flex-end',
                      alignItems: 'center',
                    }}
                  >
                    {!st.is_primary && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleSetPrimary(st.id)}
                        style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                      >
                        Set Primary
                      </Button>
                    )}
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openEditStore(st)}
                      style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                    >
                      <Edit2 size={13} /> Edit
                    </Button>
                    {!st.is_primary && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          setDeleteConfirm({
                            type: 'store',
                            id: st.id,
                            title: 'Deactivate Store Location',
                            message: `Are you sure you want to deactivate ${st.name}?`,
                          })
                        }
                        style={{ fontSize: '0.75rem', padding: '4px 8px', color: '#ef4444' }}
                      >
                        <Trash2 size={13} />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SERVICE AREAS TABLE */
        <div className="glass-panel" style={{ padding: '20px', borderRadius: '8px' }}>
          {serviceAreas.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: 'var(--grey-light)' }}>
              No local delivery service PIN codes defined. Click "+ Add Local PIN Code" to add PIN codes for local fast delivery.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(201,168,76,0.3)', textAlign: 'left', color: 'var(--gold)' }}>
                    <th style={{ padding: '10px 12px' }}>PIN Code</th>
                    <th style={{ padding: '10px 12px' }}>City / Area</th>
                    <th style={{ padding: '10px 12px' }}>Fulfillment Mode</th>
                    <th style={{ padding: '10px 12px' }}>Delivery Charge</th>
                    <th style={{ padding: '10px 12px' }}>Free Over</th>
                    <th style={{ padding: '10px 12px' }}>Estimated Time</th>
                    <th style={{ padding: '10px 12px' }}>Status</th>
                    <th style={{ padding: '10px 12px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceAreas.map((area) => (
                    <tr
                      key={area.id}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--cream)' }}
                    >
                      <td style={{ padding: '12px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--gold)' }}>
                        {area.pincode}
                      </td>
                      <td style={{ padding: '12px' }}>
                        {area.city}
                        {area.district ? `, ${area.district}` : ''}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background:
                              area.delivery_mode === 'LOCAL'
                                ? 'rgba(201,168,76,0.2)'
                                : 'rgba(59,130,246,0.2)',
                            color: area.delivery_mode === 'LOCAL' ? 'var(--gold)' : '#93c5fd',
                            fontWeight: 700,
                          }}
                        >
                          {area.delivery_mode === 'LOCAL' ? '⚡ LOCAL EXPRESS' : '📦 iThink Logistics'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontWeight: 600 }}>₹{area.delivery_charge}</td>
                      <td style={{ padding: '12px', color: '#4ade80' }}>
                        {area.free_delivery_threshold ? `₹${area.free_delivery_threshold}` : '—'}
                      </td>
                      <td style={{ padding: '12px', color: 'var(--beige)' }}>{area.estimated_delivery}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ fontSize: '0.75rem', color: area.active ? '#4ade80' : '#ef4444' }}>
                          {area.active ? '● Active' : '○ Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => openEditArea(area)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--gold)',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Edit2 size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteConfirm({
                                type: 'area',
                                id: area.id,
                                title: 'Remove Service Area PIN',
                                message: `Are you sure you want to remove PIN code ${area.pincode} from local service areas? It will default to Courier Delivery.`,
                              })
                            }
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: '4px',
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* STORE CREATE / EDIT MODAL */}
      {showStoreModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '560px',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid var(--gold)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 16px', color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>
              {editingStore ? 'Edit Store / Warehouse Location' : 'Add New Store / Warehouse'}
            </h3>

            <form onSubmit={handleSaveStore} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input
                label="Store / Hub Name"
                placeholder="e.g. Chovique Flagship Store"
                value={storeForm.name}
                onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                required
              />

              <div className="checkout-grid-two">
                <Input
                  label="House / Plot / Building No."
                  placeholder="Plot 42, Ground Floor"
                  value={storeForm.house_number}
                  onChange={(e) => setStoreForm({ ...storeForm, house_number: e.target.value })}
                />
                <Input
                  label="Street / Road"
                  placeholder="Sector 1, MVP Double Road"
                  value={storeForm.street}
                  onChange={(e) => setStoreForm({ ...storeForm, street: e.target.value })}
                  required
                />
              </div>

              <div className="checkout-grid-two">
                <Input
                  label="Area / Locality"
                  placeholder="MVP Colony"
                  value={storeForm.area}
                  onChange={(e) => setStoreForm({ ...storeForm, area: e.target.value })}
                />
                <Input
                  label="City"
                  value={storeForm.city}
                  onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                  required
                />
              </div>

              <div className="checkout-grid-two">
                <Input
                  label="State"
                  value={storeForm.state}
                  onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                  required
                />
                <Input
                  label="6-Digit PIN Code"
                  placeholder="530017"
                  maxLength={6}
                  value={storeForm.pincode}
                  onChange={(e) => setStoreForm({ ...storeForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  required
                />
              </div>

              <div className="checkout-grid-two">
                <Input
                  label="Contact Phone"
                  placeholder="+91 9876543210"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <Input
                    label="Latitude"
                    placeholder="17.7291"
                    type="number"
                    step="any"
                    value={storeForm.latitude}
                    onChange={(e) => setStoreForm({ ...storeForm, latitude: e.target.value })}
                  />
                  <Input
                    label="Longitude"
                    placeholder="83.3320"
                    type="number"
                    step="any"
                    value={storeForm.longitude}
                    onChange={(e) => setStoreForm({ ...storeForm, longitude: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={storeForm.is_primary}
                    onChange={(e) => setStoreForm({ ...storeForm, is_primary: e.target.checked })}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--cream)' }}>Primary Origin Warehouse</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={storeForm.active}
                    onChange={(e) => setStoreForm({ ...storeForm, active: e.target.checked })}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--cream)' }}>Active</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowStoreModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gold" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingStore ? 'Update Store' : 'Create Store'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE AREA CREATE / EDIT MODAL */}
      {showAreaModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.8)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            className="glass-panel"
            style={{
              width: '100%',
              maxWidth: '520px',
              borderRadius: '8px',
              padding: '24px',
              border: '1px solid var(--gold)',
            }}
          >
            <h3 style={{ margin: '0 0 16px', color: 'var(--cream)', fontFamily: 'var(--font-display)' }}>
              {editingArea ? `Edit PIN Code Rule (${editingArea.pincode})` : 'Add Local Service Area PIN'}
            </h3>

            <form onSubmit={handleSaveArea} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="checkout-grid-two">
                <Input
                  label="6-Digit PIN Code"
                  placeholder="530017"
                  maxLength={6}
                  value={areaForm.pincode}
                  onChange={(e) => setAreaForm({ ...areaForm, pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  required
                  disabled={Boolean(editingArea)}
                />

                <Select
                  label="Fulfillment Mode"
                  value={areaForm.delivery_mode}
                  onChange={(e) => setAreaForm({ ...areaForm, delivery_mode: e.target.value })}
                  options={[
                    { value: 'LOCAL', label: '⚡ LOCAL (Local Express)' },
                    { value: 'COURIER', label: '📦 COURIER (iThink Logistics)' },
                  ]}
                />
              </div>

              <div className="checkout-grid-two">
                <Input
                  label="Delivery Charge (₹)"
                  type="number"
                  min={0}
                  value={areaForm.delivery_charge}
                  onChange={(e) => setAreaForm({ ...areaForm, delivery_charge: Number(e.target.value) })}
                  required
                />

                <Input
                  label="Free Delivery Above (₹)"
                  type="number"
                  min={0}
                  placeholder="500"
                  value={areaForm.free_delivery_threshold ?? ''}
                  onChange={(e) => setAreaForm({ ...areaForm, free_delivery_threshold: e.target.value === '' ? null : Number(e.target.value) })}
                />
              </div>

              <div className="checkout-grid-two">
                <Input
                  label="City"
                  value={areaForm.city}
                  onChange={(e) => setAreaForm({ ...areaForm, city: e.target.value })}
                  required
                />
                <Input
                  label="State"
                  value={areaForm.state}
                  onChange={(e) => setAreaForm({ ...areaForm, state: e.target.value })}
                  required
                />
              </div>

              <Input
                label="Estimated Delivery SLA"
                placeholder="Within 3-5 hours"
                value={areaForm.estimated_delivery}
                onChange={(e) => setAreaForm({ ...areaForm, estimated_delivery: e.target.value })}
                required
              />

              <div style={{ display: 'flex', gap: '20px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={areaForm.same_day_available}
                    onChange={(e) => setAreaForm({ ...areaForm, same_day_available: e.target.checked })}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--cream)' }}>Same Day Delivery Available</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={areaForm.active}
                    onChange={(e) => setAreaForm({ ...areaForm, active: e.target.checked })}
                    style={{ accentColor: 'var(--gold)' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: 'var(--cream)' }}>Active Rule</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
                <Button type="button" variant="secondary" onClick={() => setShowAreaModal(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="gold" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : editingArea ? 'Update Rule' : 'Add PIN Rule'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {deleteConfirm && (
        <ConfirmationModal
          isOpen={true}
          title={deleteConfirm.title}
          message={deleteConfirm.message}
          confirmText="Delete / Deactivate"
          onConfirm={handleExecuteDelete}
          onCancel={() => setDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
};
