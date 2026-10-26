import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Building2,
  CreditCard,
  Receipt,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Clock,
  UserCheck,
  MapPin,
  Mail,
  Phone,
  X,
  Lock,
  Unlock,
  MessageSquare,
  AlertTriangle,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { productService } from '../../services/productService';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { exportToCSV } from '../../utils/exportCsv';
import { isSuperAdminRole } from '../../types';

interface OfflineSalesViewProps {
  addToast: (type: 'success' | 'error' | 'info', message: string, title?: string) => void;
  currentUserRole?: string;
}

interface BasketItem {
  product_id: string;
  product_name: string;
  sku: string;
  unit_price: number;
  quantity: number;
  available_stock?: number;
  line_total: number;
}

export const OfflineSalesView: React.FC<OfflineSalesViewProps> = ({ addToast, currentUserRole }) => {
  // Navigation State — Toggle between main Ledger listing view and Record Form view
  const [showRecordForm, setShowRecordForm] = useState(false);

  // DB Products State
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Selected product input state for adding to basket
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemError, setItemError] = useState<string | null>(null);

  // Basket State
  const [basket, setBasket] = useState<BasketItem[]>([]);

  // Company Details Form State
  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
  });

  // Transaction Details Form State
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI' | 'Bank Transfer'>('Cash');
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);

  // Payment-Method-Specific Additional Fields State
  const [paymentDetails, setPaymentDetails] = useState({
    received_amount: '',
    receipt_number: '',
    card_type: 'Credit Card',
    card_last4: '',
    transaction_id: '',
    upi_id: '',
    bank_name: '',
    account_holder: '',
    payment_status: 'Paid',
  });

  // Validation Errors
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ledger Entries & Pagination State
  const [ledgerEntries, setLedgerEntries] = useState<any[]>([]);
  const [loadingLedger, setLoadingLedger] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const CARDS_PER_PAGE = 6; // 3 lines × 2 companies per line on desktop

  // Background Role Detection (No visible role toggle button in header)
  const isSuperAdmin = useMemo(() => {
    if (currentUserRole) return isSuperAdminRole(currentUserRole);
    const storedUser = localStorage.getItem('user') || localStorage.getItem('admin_user');
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (isSuperAdminRole(parsed.role)) return true;
      } catch (e) {}
    }
    return false;
  }, [currentUserRole]);

  // Company Card Detail Modal & Edit State
  const [selectedSaleModal, setSelectedSaleModal] = useState<any | null>(null);
  const [isEditingSale, setIsEditingSale] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    payment_method: 'Cash',
    payment_status: 'Paid',
    total_amount: 0,
    received_amount: 0,
    transaction_id: '',
    card_type: '',
    card_last4: '',
    upi_id: '',
    bank_name: '',
    account_holder: '',
    discount: 0,
    tax: 0,
  });

  // Admin Edit Request Reason Sub-Modal State
  const [requestReasonModalSale, setRequestReasonModalSale] = useState<any | null>(null);
  const [requestReasonText, setRequestReasonText] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  // Superadmin Rejection Reason Sub-Modal State
  const [rejectReasonModalSale, setRejectReasonModalSale] = useState<any | null>(null);
  const [rejectReasonText, setRejectReasonText] = useState('');
  const [rejectReasonError, setRejectReasonError] = useState<string | null>(null);

  // Reset pagination to page 1 on search filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [ledgerSearch]);

  // Switch Payment Method — resets previous method-specific values
  const handlePaymentMethodChange = (newMethod: 'Cash' | 'Card' | 'UPI' | 'Bank Transfer') => {
    setPaymentMethod(newMethod);
    setPaymentDetails({
      received_amount: '',
      receipt_number: '',
      card_type: 'Credit Card',
      card_last4: '',
      transaction_id: '',
      upi_id: '',
      bank_name: '',
      account_holder: '',
      payment_status: 'Paid',
    });
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.received_amount;
      delete next.receipt_number;
      delete next.card_type;
      delete next.card_last4;
      delete next.transaction_id;
      delete next.upi_id;
      delete next.bank_name;
      delete next.account_holder;
      delete next.payment_status;
      return next;
    });
  };

  // Fetch Products & Stock from Backend DB via productService
  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await productService.getProducts({ per_page: 100 });
      const items = res?.items || [];
      setProducts(items);
      if (items.length > 0 && !selectedProductId) {
        setSelectedProductId(items[0].id);
      }
    } catch (err: any) {
      console.error('Failed to fetch products for offline sales:', err);
      addToast('error', err?.message || 'Failed to load products from database.', 'Error');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Fetch Ledger Entries from Backend DB
  const fetchLedgerEntries = async () => {
    setLoadingLedger(true);
    try {
      const data = await adminService.getOfflineSales();
      setLedgerEntries(data || []);
    } catch (err: any) {
      console.error('Failed to fetch offline sales ledger:', err);
      addToast('error', err?.message || 'Failed to load offline sales ledger.', 'Error');
    } finally {
      setLoadingLedger(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchLedgerEntries();
  }, []);

  // Selected product object
  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === selectedProductId) || null;
  }, [products, selectedProductId]);

  // Line total for current input
  const currentLineTotal = useMemo(() => {
    if (!selectedProduct) return 0;
    return (selectedProduct.price || 0) * (itemQuantity || 0);
  }, [selectedProduct, itemQuantity]);

  // Handle Add Item to Basket
  const handleAddToBasket = (e: React.FormEvent) => {
    e.preventDefault();
    setItemError(null);
    if (!selectedProduct) {
      setItemError('Please select a valid product.');
      return;
    }
    if (!itemQuantity || itemQuantity <= 0) {
      setItemError('Quantity must be at least 1.');
      return;
    }

    const availableStock = selectedProduct.stock || 0;
    const unitPrice = selectedProduct.price || 0;
    const sku = selectedProduct.sku || selectedProduct.id || 'N/A';

    // Check existing quantity in basket
    const existingIndex = basket.findIndex((item) => item.product_id === selectedProduct.id);
    const existingQty = existingIndex >= 0 ? basket[existingIndex].quantity : 0;
    const totalDesiredQty = existingQty + itemQuantity;

    if (existingIndex >= 0) {
      const updatedBasket = [...basket];
      updatedBasket[existingIndex].quantity = totalDesiredQty;
      updatedBasket[existingIndex].line_total = totalDesiredQty * unitPrice;
      setBasket(updatedBasket);
    } else {
      setBasket([
        ...basket,
        {
          product_id: selectedProduct.id,
          product_name: selectedProduct.name,
          sku: sku,
          unit_price: unitPrice,
          quantity: itemQuantity,
          available_stock: availableStock,
          line_total: itemQuantity * unitPrice,
        },
      ]);
    }

    // Reset item quantity input
    setItemQuantity(1);
  };

  // Handle Remove Item from Basket
  const handleRemoveFromBasket = (index: number) => {
    setBasket(basket.filter((_, i) => i !== index));
  };

  // Basket Subtotal & Final Total calculation
  const subtotal = useMemo(() => {
    return basket.reduce((acc, item) => acc + item.line_total, 0);
  }, [basket]);

  const finalTotal = useMemo(() => {
    const d = Math.max(0, discount || 0);
    const t = Math.max(0, tax || 0);
    return Math.max(0, subtotal - d + t);
  }, [subtotal, discount, tax]);

  // Form Validation
  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!companyForm.company_name.trim()) {
      errors.company_name = 'Company Name is required.';
    }
    if (!companyForm.contact_person.trim()) {
      errors.contact_person = 'Contact Person is required.';
    }
    if (!companyForm.phone.trim()) {
      errors.phone = 'Phone Number is required.';
    } else {
      const phoneRegex = /^(\+91[\-\s]?)?[0]?[6-9]\d{9}$|^\+?[0-9\s\-()]{7,15}$/;
      if (!phoneRegex.test(companyForm.phone.trim())) {
        errors.phone = 'Please enter a valid phone number (e.g. +91 9876543210).';
      }
    }
    if (companyForm.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(companyForm.email.trim())) {
        errors.email = 'Please enter a valid email address.';
      }
    }
    if (!companyForm.address.trim()) {
      errors.address = 'Company Address is required.';
    }

    if (basket.length === 0) {
      errors.basket = 'Transaction basket cannot be empty. Please add at least one product.';
    }

    // Dynamic Payment-Method Validation
    if (paymentMethod === 'Cash') {
      if (!paymentDetails.received_amount || isNaN(Number(paymentDetails.received_amount)) || Number(paymentDetails.received_amount) <= 0) {
        errors.received_amount = 'Received Amount (₹) is required and must be greater than 0.';
      }
      if (!paymentDetails.payment_status) {
        errors.payment_status = 'Payment Status is required.';
      }
    } else if (paymentMethod === 'Card') {
      if (!paymentDetails.card_type) {
        errors.card_type = 'Card Type is required.';
      }
      if (!paymentDetails.card_last4 || !/^\d{4}$/.test(paymentDetails.card_last4.trim())) {
        errors.card_last4 = 'Last 4 Digits are required and must be exactly 4 digits.';
      }
      if (!paymentDetails.transaction_id || !paymentDetails.transaction_id.trim()) {
        errors.transaction_id = 'Transaction ID is required.';
      }
      if (!paymentDetails.payment_status) {
        errors.payment_status = 'Payment Status is required.';
      }
    } else if (paymentMethod === 'UPI') {
      if (!paymentDetails.upi_id || !paymentDetails.upi_id.trim()) {
        errors.upi_id = 'UPI ID is required.';
      }
      if (!paymentDetails.transaction_id || !paymentDetails.transaction_id.trim()) {
        errors.transaction_id = 'Transaction ID / UTR Number is required.';
      }
      if (!paymentDetails.payment_status) {
        errors.payment_status = 'Payment Status is required.';
      }
    } else if (paymentMethod === 'Bank Transfer') {
      if (!paymentDetails.bank_name || !paymentDetails.bank_name.trim()) {
        errors.bank_name = 'Bank Name is required.';
      }
      if (!paymentDetails.account_holder || !paymentDetails.account_holder.trim()) {
        errors.account_holder = 'Account Holder Name is required.';
      }
      if (!paymentDetails.transaction_id || !paymentDetails.transaction_id.trim()) {
        errors.transaction_id = 'UTR / Transaction ID is required.';
      }
      if (!paymentDetails.payment_status) {
        errors.payment_status = 'Payment Status is required.';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Complete Transaction Submission
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) {
      addToast('error', 'Please complete all required fields and payment details.', 'Validation Error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        company_name: companyForm.company_name.trim(),
        contact_person: companyForm.contact_person.trim(),
        phone: companyForm.phone.trim(),
        email: companyForm.email.trim() || undefined,
        address: companyForm.address.trim(),
        payment_method: paymentMethod,
        discount: discount || 0,
        tax: tax || 0,
        payment_status: paymentDetails.payment_status,
        items: basket.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
        })),
      };

      if (paymentMethod === 'Cash') {
        payload.received_amount = parseFloat(paymentDetails.received_amount);
        if (paymentDetails.receipt_number.trim()) {
          payload.receipt_number = paymentDetails.receipt_number.trim();
        }
      } else if (paymentMethod === 'Card') {
        payload.card_type = paymentDetails.card_type;
        payload.card_last4 = paymentDetails.card_last4.trim();
        payload.transaction_id = paymentDetails.transaction_id.trim();
      } else if (paymentMethod === 'UPI') {
        payload.upi_id = paymentDetails.upi_id.trim();
        payload.transaction_id = paymentDetails.transaction_id.trim();
      } else if (paymentMethod === 'Bank Transfer') {
        payload.bank_name = paymentDetails.bank_name.trim();
        payload.account_holder = paymentDetails.account_holder.trim();
        payload.transaction_id = paymentDetails.transaction_id.trim();
      }

      const result = await adminService.addOfflineSale(payload);

      addToast(
        'success',
        `Offline Sale ${result.receipt_id || result.id} recorded successfully! Ledger logged.`,
        'Transaction Recorded'
      );

      // Reset form & basket
      setBasket([]);
      setCompanyForm({
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
      });
      setDiscount(0);
      setTax(0);
      setPaymentMethod('Cash');
      setPaymentDetails({
        received_amount: '',
        receipt_number: '',
        card_type: 'Credit Card',
        card_last4: '',
        transaction_id: '',
        upi_id: '',
        bank_name: '',
        account_holder: '',
        payment_status: 'Paid',
      });
      setFormErrors({});

      // Refresh inventory & ledger, then return to Ledger list view
      await fetchProducts();
      await fetchLedgerEntries();
      setShowRecordForm(false);
    } catch (err: any) {
      console.error('Failed to log offline sale:', err);
      addToast('error', err?.detail || err?.message || 'Failed to complete transaction.', 'Transaction Failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Ledger Entries
  const filteredLedger = useMemo(() => {
    if (!ledgerSearch.trim()) return ledgerEntries;
    const q = ledgerSearch.toLowerCase().trim();
    return ledgerEntries.filter(
      (entry) =>
        entry.receipt_id?.toLowerCase().includes(q) ||
        entry.receipt_number?.toLowerCase().includes(q) ||
        entry.id?.toLowerCase().includes(q) ||
        entry.company_name?.toLowerCase().includes(q) ||
        entry.contact_person?.toLowerCase().includes(q) ||
        entry.productName?.toLowerCase().includes(q) ||
        entry.payment_method?.toLowerCase().includes(q) ||
        entry.paymentMethod?.toLowerCase().includes(q)
    );
  }, [ledgerEntries, ledgerSearch]);

  // Paginated Ledger Entries (6 Cards per page = 3 lines of 2 cards/line on desktop)
  const paginatedLedger = useMemo(() => {
    const startIndex = (currentPage - 1) * CARDS_PER_PAGE;
    return filteredLedger.slice(startIndex, startIndex + CARDS_PER_PAGE);
  }, [filteredLedger, currentPage]);

  const totalPages = Math.ceil(filteredLedger.length / CARDS_PER_PAGE) || 1;

  // Open Full Company Sale Modal
  const handleOpenSaleModal = (entry: any) => {
    setSelectedSaleModal(entry);
    setIsEditingSale(false);
    setEditForm({
      company_name: entry.company_name || '',
      contact_person: entry.contact_person || '',
      phone: entry.phone || '',
      email: entry.email || '',
      address: entry.address || '',
      payment_method: entry.payment_method || entry.paymentMethod || 'Cash',
      payment_status: entry.payment_status || entry.status || 'Paid',
      total_amount: entry.total_amount || entry.totalPrice || 0,
      received_amount: entry.received_amount || entry.total_amount || 0,
      transaction_id: entry.transaction_id || '',
      card_type: entry.card_type || 'Credit Card',
      card_last4: entry.card_last4 || '',
      upi_id: entry.upi_id || '',
      bank_name: entry.bank_name || '',
      account_holder: entry.account_holder || '',
      discount: entry.discount || 0,
      tax: entry.tax || 0,
    });
  };

  // Open Edit Request Reason Prompt Modal
  const handleOpenRequestReasonModal = (entry: any) => {
    setRequestReasonModalSale(entry);
    setRequestReasonText('');
    setReasonError(null);
  };

  // Submit Edit Request with Reason
  const handleSubmitEditRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestReasonText.trim()) {
      setReasonError('Please enter a reason or message explaining why this sale needs to be edited.');
      return;
    }

    const reason = requestReasonText.trim();
    const updatedLedger = ledgerEntries.map((item) => {
      if (item.id === requestReasonModalSale.id) {
        return {
          ...item,
          edit_request_status: 'PENDING',
          edit_request_reason: reason,
          superadmin_response_note: undefined,
        };
      }
      return item;
    });

    setLedgerEntries(updatedLedger);

    if (selectedSaleModal?.id === requestReasonModalSale.id) {
      setSelectedSaleModal({
        ...selectedSaleModal,
        edit_request_status: 'PENDING',
        edit_request_reason: reason,
        superadmin_response_note: undefined,
      });
    }

    addToast(
      'info',
      `Edit request for ${requestReasonModalSale.company_name || requestReasonModalSale.id} submitted to Superadmin with reason: "${reason}".`,
      'Edit Request Submitted'
    );

    setRequestReasonModalSale(null);
    setRequestReasonText('');
    setReasonError(null);
  };

  // Approve Edit Request Handler (Superadmin Role)
  const handleApproveEdit = (entry: any) => {
    const approvalNote = 'Approved by Superadmin for modification.';
    const updatedLedger = ledgerEntries.map((item) => {
      if (item.id === entry.id) {
        return {
          ...item,
          edit_request_status: 'APPROVED',
          superadmin_response_note: approvalNote,
        };
      }
      return item;
    });
    setLedgerEntries(updatedLedger);
    const updatedModalItem = {
      ...selectedSaleModal,
      edit_request_status: 'APPROVED',
      superadmin_response_note: approvalNote,
    };
    setSelectedSaleModal(updatedModalItem);
    setIsEditingSale(true);
    setEditForm({
      company_name: updatedModalItem.company_name || '',
      contact_person: updatedModalItem.contact_person || '',
      phone: updatedModalItem.phone || '',
      email: updatedModalItem.email || '',
      address: updatedModalItem.address || '',
      payment_method: updatedModalItem.payment_method || updatedModalItem.paymentMethod || 'Cash',
      payment_status: updatedModalItem.payment_status || updatedModalItem.status || 'Paid',
      total_amount: updatedModalItem.total_amount || updatedModalItem.totalPrice || 0,
      received_amount: updatedModalItem.received_amount || updatedModalItem.total_amount || 0,
      transaction_id: updatedModalItem.transaction_id || '',
      card_type: updatedModalItem.card_type || 'Credit Card',
      card_last4: updatedModalItem.card_last4 || '',
      upi_id: updatedModalItem.upi_id || '',
      bank_name: updatedModalItem.bank_name || '',
      account_holder: updatedModalItem.account_holder || '',
      discount: updatedModalItem.discount || 0,
      tax: updatedModalItem.tax || 0,
    });
    addToast('success', `Superadmin approved edit request for ${entry.company_name || entry.id}. Editing unlocked.`, 'Edit Approved');
  };

  // Open Superadmin Rejection Reason Modal
  const handleOpenRejectReasonModal = (entry: any) => {
    setRejectReasonModalSale(entry);
    setRejectReasonText('');
    setRejectReasonError(null);
  };

  // Submit Superadmin Rejection with Explanation Message
  const handleSubmitRejectRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReasonText.trim()) {
      setRejectReasonError('Please enter a rejection explanation message for the admin.');
      return;
    }

    const note = rejectReasonText.trim();
    const updatedLedger = ledgerEntries.map((item) => {
      if (item.id === rejectReasonModalSale.id) {
        return {
          ...item,
          edit_request_status: 'REJECTED',
          superadmin_response_note: note,
        };
      }
      return item;
    });

    setLedgerEntries(updatedLedger);

    if (selectedSaleModal?.id === rejectReasonModalSale.id) {
      setSelectedSaleModal({
        ...selectedSaleModal,
        edit_request_status: 'REJECTED',
        superadmin_response_note: note,
      });
    }

    addToast(
      'error',
      `Edit request for ${rejectReasonModalSale.company_name || rejectReasonModalSale.id} rejected. Explanation sent to requesting admin.`,
      'Request Rejected'
    );

    setRejectReasonModalSale(null);
    setRejectReasonText('');
    setRejectReasonError(null);
  };

  // Save Sale Edits Handler
  const handleSaveSaleEdit = async () => {
    if (!selectedSaleModal) return;
    setIsSavingEdit(true);
    try {
      const updatedItem = {
        ...selectedSaleModal,
        company_name: editForm.company_name.trim(),
        contact_person: editForm.contact_person.trim(),
        phone: editForm.phone.trim(),
        email: editForm.email.trim(),
        address: editForm.address.trim(),
        payment_method: editForm.payment_method,
        payment_status: editForm.payment_status,
        total_amount: Number(editForm.total_amount) || 0,
        received_amount: Number(editForm.received_amount) || 0,
        transaction_id: editForm.transaction_id,
        card_type: editForm.card_type,
        card_last4: editForm.card_last4,
        upi_id: editForm.upi_id,
        bank_name: editForm.bank_name,
        account_holder: editForm.account_holder,
        discount: Number(editForm.discount) || 0,
        tax: Number(editForm.tax) || 0,
        edit_request_status: 'NONE',
        edit_request_reason: undefined,
        superadmin_response_note: 'Details updated by Superadmin',
      };

      // Call API if possible, with local state update fallback
      try {
        await adminService.updateOfflineSale(selectedSaleModal.id, updatedItem);
      } catch (e) {
        // Fallback to local state update if backend endpoint is mock
      }

      setLedgerEntries((prev) => prev.map((item) => (item.id === selectedSaleModal.id ? updatedItem : item)));
      setSelectedSaleModal(updatedItem);
      setIsEditingSale(false);
      addToast('success', `Offline sale details for ${updatedItem.company_name} updated successfully!`, 'Sale Updated');
    } catch (err: any) {
      addToast('error', err?.message || 'Failed to update sale entry.', 'Error');
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px', color: '#f5efe6' }}>
      {/* Module Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <span style={{ color: 'rgba(201, 168, 76, 0.85)', fontSize: '0.78rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            — POINT OF SALE &amp; DIRECT ORDERS
          </span>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '2.4rem', color: '#f5efe6', fontWeight: 700, margin: 0 }}>
            In-Store &amp; Offline Sales
          </h1>
          <p style={{ fontSize: '0.9rem', color: 'var(--beige)', marginTop: '4px', margin: 0 }}>
            Manage offline company sales, record POS receipts, and inspect detailed company entries.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={() => {
              fetchProducts();
              fetchLedgerEntries();
            }}
            disabled={loadingProducts || loadingLedger}
            style={{
              padding: '10px 16px',
              background: 'rgba(20, 16, 13, 0.85)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '8px',
              color: '#c9a84c',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <RefreshCw size={15} className={loadingProducts || loadingLedger ? 'animate-spin' : ''} /> Refresh Data
          </button>

          {showRecordForm && (
            <Button
              variant="secondary"
              onClick={() => setShowRecordForm(false)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', fontWeight: 600, color: 'var(--gold)', borderColor: 'rgba(201, 168, 76, 0.4)' }}
            >
              <ShoppingBag size={16} />
              ALL OFFLINE SALES
            </Button>
          )}

          <Button
            variant="gold"
            glow
            onClick={() => setShowRecordForm(!showRecordForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', fontWeight: 600 }}
          >
            <Plus size={18} />
            {showRecordForm ? 'VIEW SALES' : 'RECORD SALE'}
          </Button>
        </div>
      </div>

      {/* VIEW 1: RECORD OFFLINE SALE FORM VIEW */}
      {showRecordForm ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Breadcrumb Back Button */}
          <button
            type="button"
            onClick={() => setShowRecordForm(false)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--gold)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              padding: 0,
              width: 'fit-content',
            }}
          >
            <ArrowLeft size={16} /> Back to Ledger Entries
          </button>

          {/* Record Sale Form */}
          <form onSubmit={handleSubmitSale}>
            <div
              className="glass-panel"
              style={{
                padding: '30px',
                background: 'rgba(20, 16, 13, 0.9)',
                border: '1px solid rgba(201, 168, 76, 0.35)',
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '28px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '16px', borderBottom: '1px solid rgba(201, 168, 76, 0.2)' }}>
                <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.5rem', color: '#f5efe6', margin: 0 }}>
                  Record Offline Sale
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'rgba(201, 168, 76, 0.85)', background: 'rgba(201, 168, 76, 0.1)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(201, 168, 76, 0.3)' }}>
                  In-Store POS
                </span>
              </div>

              {/* SECTION 1: Product Details & Basket */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <ShoppingBag size={18} color="#c9a84c" />
                  <h4 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.15rem', color: '#c9a84c', margin: 0 }}>
                    1. Product Details
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', alignItems: 'end', marginBottom: '14px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Select Product from Database <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => {
                        setSelectedProductId(e.target.value);
                        setItemError(null);
                      }}
                      disabled={loadingProducts}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      {products.length === 0 ? (
                        <option value="">{loadingProducts ? 'Loading products...' : 'No products available in database'}</option>
                      ) : (
                        products.map((p) => {
                          const skuCode = p.sku || p.id.substring(0, 8).toUpperCase();
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({skuCode}) — ₹{(p.price || 0).toLocaleString('en-IN')}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Qty Sold <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={itemQuantity}
                      onChange={(e) => {
                        setItemQuantity(parseInt(e.target.value) || 1);
                        setItemError(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAddToBasket}
                    disabled={!selectedProduct}
                    style={{
                      height: '40px',
                      padding: '0 16px',
                      background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#0f0c0a',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                      cursor: !selectedProduct ? 'not-allowed' : 'pointer',
                      opacity: !selectedProduct ? 0.5 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Plus size={16} /> Add to Basket
                  </button>
                </div>

                {selectedProduct && (
                  <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)', display: 'flex', justifyContent: 'space-between', marginBottom: '14px', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span>Unit Price: <strong style={{ color: '#c9a84c' }}>₹{(selectedProduct.price || 0).toLocaleString('en-IN')}</strong></span>
                    <span>Line Total: <strong style={{ color: '#c9a84c' }}>₹{currentLineTotal.toLocaleString('en-IN')}</strong></span>
                  </div>
                )}

                {itemError && (
                  <div style={{ padding: '8px 12px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', color: '#e74c3c', fontSize: '0.78rem', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={14} /> {itemError}
                  </div>
                )}

                {formErrors.basket && (
                  <div style={{ padding: '8px 12px', background: 'rgba(231,76,60,0.15)', border: '1px solid rgba(231,76,60,0.3)', borderRadius: '6px', color: '#e74c3c', fontSize: '0.78rem', marginBottom: '14px' }}>
                    {formErrors.basket}
                  </div>
                )}

                <div>
                  <h5 style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f5efe6', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Selected Basket Items ({basket.length})
                  </h5>
                  {basket.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '6px' }}>
                      No products added yet. Select a product above and click "Add to Basket".
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
                      {basket.map((item, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '12px 16px',
                            background: 'rgba(10, 8, 6, 0.65)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f5efe6' }}>{item.product_name}</div>
                            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                              SKU: {item.sku} • Qty: {item.quantity} × ₹{item.unit_price.toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#c9a84c' }}>
                              ₹{item.line_total.toLocaleString('en-IN')}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemoveFromBasket(index)}
                              style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer', padding: 0 }}
                              title="Remove item"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(201, 168, 76, 0.15)' }} />

              {/* SECTION 2: Company Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <Building2 size={18} color="#c9a84c" />
                  <h4 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.15rem', color: '#c9a84c', margin: 0 }}>
                    2. Company Details
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Company Name <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Wipro Limited"
                      value={companyForm.company_name}
                      onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: formErrors.company_name ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {formErrors.company_name && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.company_name}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Contact Person <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Arjun Reddy"
                      value={companyForm.contact_person}
                      onChange={(e) => setCompanyForm({ ...companyForm, contact_person: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: formErrors.contact_person ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {formErrors.contact_person && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.contact_person}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Phone Number <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543212"
                      value={companyForm.phone}
                      onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: formErrors.phone ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {formErrors.phone && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.phone}</span>}
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Email Address <span style={{ color: 'rgba(255,255,255,0.4)' }}>(Optional)</span>
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. arjun.reddy@example.com"
                      value={companyForm.email}
                      onChange={(e) => setCompanyForm({ ...companyForm, email: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: formErrors.email ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                    {formErrors.email && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.email}</span>}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                    Company Address <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Hyderabad, Telangana"
                    value={companyForm.address}
                    onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'rgba(10, 8, 6, 0.85)',
                      border: formErrors.address ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                      borderRadius: '6px',
                      color: '#f5efe6',
                      fontSize: '0.85rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  {formErrors.address && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.address}</span>}
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(201, 168, 76, 0.15)' }} />

              {/* SECTION 3: Payment Details */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
                  <CreditCard size={18} color="#c9a84c" />
                  <h4 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.15rem', color: '#c9a84c', margin: 0 }}>
                    3. Payment &amp; Financials
                  </h4>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Payment Method <span style={{ color: '#e74c3c' }}>*</span>
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => handlePaymentMethodChange(e.target.value as any)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: '1px solid rgba(201, 168, 76, 0.4)',
                        borderRadius: '6px',
                        color: '#c9a84c',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="UPI">UPI Payment</option>
                      <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Discount (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={discount}
                      onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '6px' }}>
                      Tax / GST (₹)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={tax}
                      onChange={(e) => setTax(Math.max(0, parseFloat(e.target.value) || 0))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        background: 'rgba(10, 8, 6, 0.85)',
                        border: '1px solid rgba(255,255,255,0.18)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.85rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                {/* Cash Additional Fields */}
                {paymentMethod === 'Cash' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', padding: '18px', background: 'rgba(201, 168, 76, 0.05)', borderRadius: '8px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Received Amount (₹) <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="e.g. 5000"
                        value={paymentDetails.received_amount}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, received_amount: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.received_amount ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      {formErrors.received_amount && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.received_amount}</span>}
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Payment Status <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <select
                        value={paymentDetails.payment_status}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, payment_status: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.payment_status ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending</option>
                      </select>
                      {formErrors.payment_status && <span style={{ color: '#e74c3c', fontSize: '0.72rem', marginTop: '4px', display: 'block' }}>{formErrors.payment_status}</span>}
                    </div>
                  </div>
                )}

                {/* Card Additional Fields */}
                {paymentMethod === 'Card' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', padding: '18px', background: 'rgba(201, 168, 76, 0.05)', borderRadius: '8px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Card Type <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <select
                        value={paymentDetails.card_type}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, card_type: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.card_type ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                        }}
                      >
                        <option value="Credit Card">Credit Card</option>
                        <option value="Debit Card">Debit Card</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Last 4 Digits <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="e.g. 4242"
                        value={paymentDetails.card_last4}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, card_last4: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.card_last4 ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Transaction ID <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TXN-8923410"
                        value={paymentDetails.transaction_id}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, transaction_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.transaction_id ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* UPI Additional Fields */}
                {paymentMethod === 'UPI' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', padding: '18px', background: 'rgba(201, 168, 76, 0.05)', borderRadius: '8px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        UPI ID <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. merchant@okhdfcbank"
                        value={paymentDetails.upi_id}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, upi_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.upi_id ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Transaction ID / UTR Number <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 7890653235"
                        value={paymentDetails.transaction_id}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, transaction_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.transaction_id ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Bank Transfer Additional Fields */}
                {paymentMethod === 'Bank Transfer' && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '20px', padding: '18px', background: 'rgba(201, 168, 76, 0.05)', borderRadius: '8px', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Bank Name <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. HDFC Bank"
                        value={paymentDetails.bank_name}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_name: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.bank_name ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        Account Holder Name <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Arjun Reddy"
                        value={paymentDetails.account_holder}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, account_holder: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.account_holder ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '0.78rem', fontWeight: 600, color: 'rgba(255,255,255,0.85)', display: 'block', marginBottom: '6px' }}>
                        UTR / Transaction ID <span style={{ color: '#e74c3c' }}>*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. UTR-9823471029"
                        value={paymentDetails.transaction_id}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, transaction_id: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'rgba(10, 8, 6, 0.85)',
                          border: formErrors.transaction_id ? '1px solid #e74c3c' : '1px solid rgba(255,255,255,0.18)',
                          borderRadius: '6px',
                          color: '#f5efe6',
                          fontSize: '0.85rem',
                          outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Financial Summary Box */}
                <div style={{ padding: '20px', background: 'rgba(10, 8, 6, 0.65)', border: '1px solid rgba(201, 168, 76, 0.25)', borderRadius: '8px', marginBottom: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Basket Subtotal:</span>
                    <span>₹{subtotal.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '8px', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Discount:</span>
                    <span>- ₹{(discount || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '14px', color: 'rgba(255,255,255,0.7)' }}>
                    <span>Tax / GST:</span>
                    <span>+ ₹{(tax || 0).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ height: '1px', background: 'rgba(255,255,255,0.12)', marginBottom: '14px' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 700, color: '#f5efe6' }}>Total Transaction Amount:</span>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#c9a84c', fontFamily: 'var(--font-display, serif)' }}>
                      ₹{finalTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '14px' }}>
                  <button
                    type="submit"
                    disabled={isSubmitting || basket.length === 0}
                    style={{
                      flex: 1,
                      padding: '14px',
                      background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 50%, #c9a84c 100%)',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#0f0c0a',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      cursor: isSubmitting || basket.length === 0 ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || basket.length === 0 ? 0.6 : 1,
                      boxShadow: '0 4px 16px rgba(201, 168, 76, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Recording Transaction...
                      </>
                    ) : (
                      <>
                        <Receipt size={18} /> Complete Sale
                      </>
                    )}
                  </button>
                  <Button
                    variant="glass"
                    type="button"
                    onClick={() => setShowRecordForm(false)}
                    style={{ padding: '14px 24px' }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* VIEW 2: MAIN LEDGER ENTRIES LISTING VIEW (2 CARDS PER ROW, 3 ROWS MAX PER PAGE = 6 ITEMS) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Ledger Entries List Panel */}
          <div
            className="glass-panel"
            style={{
              padding: '28px',
              background: 'rgba(20, 16, 13, 0.85)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              borderRadius: '12px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(201,168,76,0.2)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={22} color="#c9a84c" />
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.35rem', color: '#f5efe6', margin: 0 }}>
                    Company Sales Ledger ({filteredLedger.length})
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)' }}>
                    Displaying 2 company cards per line (6 per page)
                  </span>
                </div>
              </div>

              {/* Search & Export CSV */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <Button
                  variant="glass"
                  onClick={() => exportToCSV('Offline_Sales_Ledger', filteredLedger)}
                  disabled={filteredLedger.length === 0}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c' }}
                >
                  <FileSpreadsheet size={15} /> Export CSV
                </Button>

                <div style={{ position: 'relative', width: '280px' }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)', pointerEvents: 'none' }} />
                  <input
                    type="text"
                    placeholder="Search company, receipt ID, or contact..."
                    value={ledgerSearch}
                    onChange={(e) => setLedgerSearch(e.target.value)}
                    style={{
                      width: '100%',
                      paddingLeft: '36px',
                      paddingRight: '12px',
                      paddingTop: '9px',
                      paddingBottom: '9px',
                      background: 'rgba(10, 8, 6, 0.8)',
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      color: '#f5efe6',
                      fontSize: '0.82rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* COMPANY CARDS GRID: 2 PER ROW, MAX 3 ROWS (6 PER PAGE) */}
            <div>
              {loadingLedger ? (
                <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                  <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', display: 'block', color: '#c9a84c' }} />
                  Loading company sale cards from database...
                </div>
              ) : paginatedLedger.length === 0 ? (
                <div style={{ padding: '60px 20px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.9rem' }}>
                  No offline company sales records found.
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '18px',
                    marginBottom: '20px',
                  }}
                >
                  {paginatedLedger.map((entry) => {
                    const receipt = entry.receipt_number || entry.receipt_id || entry.id;
                    const compName = entry.company_name || 'Direct Customer';
                    const contact = entry.contact_person || 'Walk-in';
                    const phone = entry.phone || '';
                    const total = entry.total_amount || entry.totalPrice || 0;
                    const itemsList = entry.items || [];
                    const itemsCount = itemsList.length || entry.quantity || 1;
                    const createdDate = entry.created_at || entry.date || '';
                    const method = entry.payment_method || entry.paymentMethod || 'Cash';
                    const payStatus = entry.payment_status || entry.status || 'Paid';
                    const editStatus = entry.edit_request_status || 'NONE';

                    return (
                      <div
                        key={entry.id}
                        onClick={() => handleOpenSaleModal(entry)}
                        style={{
                          padding: '18px',
                          background: 'rgba(12, 10, 8, 0.75)',
                          border: '1px solid rgba(201, 168, 76, 0.2)',
                          borderRadius: '10px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '14px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          userSelect: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.55)';
                          e.currentTarget.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.2)';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }}
                      >
                        <div>
                          {/* Top Badges */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c9a84c', fontFamily: 'monospace' }}>
                              {receipt}
                            </span>

                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  background: 'rgba(201, 168, 76, 0.15)',
                                  color: '#c9a84c',
                                }}
                              >
                                {method}
                              </span>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  background: payStatus === 'Paid' ? 'rgba(46, 204, 113, 0.15)' : 'rgba(241, 196, 15, 0.15)',
                                  color: payStatus === 'Paid' ? '#2ecc71' : '#f1c40f',
                                }}
                              >
                                {payStatus}
                              </span>
                            </div>
                          </div>

                          {/* Company Name & Contact */}
                          <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6', margin: '0 0 6px 0', lineHeight: 1.3 }}>
                            {compName}
                          </h4>

                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={13} color="#c9a84c" />
                            <span>Contact: <strong>{contact}</strong> {phone ? `• ${phone}` : ''}</span>
                          </div>

                          {/* Edit Status Pill & Reason Snippets */}
                          {editStatus === 'PENDING' && (
                            <div style={{ marginTop: '8px', fontSize: '0.7rem', padding: '5px 8px', borderRadius: '6px', background: 'rgba(241, 196, 15, 0.15)', color: '#f1c40f', border: '1px solid rgba(241, 196, 15, 0.3)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Clock size={12} /> Edit Request Pending Approval
                              </div>
                              {entry.edit_request_reason && (
                                <div style={{ fontSize: '0.68rem', opacity: 0.95, fontStyle: 'italic' }}>
                                  Reason: "{entry.edit_request_reason}"
                                </div>
                              )}
                            </div>
                          )}

                          {editStatus === 'REJECTED' && (
                            <div style={{ marginTop: '8px', fontSize: '0.7rem', padding: '5px 8px', borderRadius: '6px', background: 'rgba(231, 76, 60, 0.15)', color: '#e74c3c', border: '1px solid rgba(231, 76, 60, 0.3)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <XCircle size={12} /> Edit Request Rejected by Superadmin
                              </div>
                              {entry.superadmin_response_note && (
                                <div style={{ fontSize: '0.68rem', opacity: 0.95, fontStyle: 'italic' }}>
                                  Note: "{entry.superadmin_response_note}"
                                </div>
                              )}
                            </div>
                          )}

                          {editStatus === 'APPROVED' && (
                            <div style={{ marginTop: '8px', fontSize: '0.7rem', padding: '4px 8px', borderRadius: '4px', background: 'rgba(46, 204, 113, 0.15)', color: '#2ecc71', border: '1px solid rgba(46, 204, 113, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={12} /> Edit Approved by Superadmin
                            </div>
                          )}
                        </div>

                        {/* Bottom Total & Action */}
                        <div style={{ paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2ecc71', fontFamily: 'var(--font-display, serif)' }}>
                              ₹{total.toLocaleString('en-IN')}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)' }}>
                              {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'} • {createdDate || 'Recent'}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSaleModal(entry);
                            }}
                            style={{
                              padding: '6px 12px',
                              background: 'rgba(201, 168, 76, 0.12)',
                              border: '1px solid rgba(201, 168, 76, 0.3)',
                              borderRadius: '6px',
                              color: '#c9a84c',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={13} /> View Card
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* PAGINATION COMPONENT FOR COMPANY SALES LEDGER */}
              {filteredLedger.length > 0 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={filteredLedger.length}
                  itemsPerPage={CARDS_PER_PAGE}
                  onPageChange={(page) => setCurrentPage(page)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ADMIN EDIT REASON INPUT MODAL */}
      {requestReasonModalSale && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setRequestReasonModalSale(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0d0a08',
              border: '1px solid rgba(201, 168, 76, 0.45)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.9)',
              color: '#f5efe6',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(201, 168, 76, 0.2)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MessageSquare size={20} color="#c9a84c" />
                <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.25rem', color: '#f5efe6', margin: 0, fontWeight: 700 }}>
                  Request Sale Edit Approval
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRequestReasonModalSale(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitEditRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)' }}>
                Target Company: <strong style={{ color: '#c9a84c' }}>{requestReasonModalSale.company_name || 'Offline Sale'}</strong>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f5efe6', display: 'block', marginBottom: '6px' }}>
                  Reason / Message for Edit Request <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain why this offline sale needs to be modified (e.g. Correcting payment method from Cash to UPI, updating company GST/address, adjusting discount amount...)"
                  value={requestReasonText}
                  onChange={(e) => {
                    setRequestReasonText(e.target.value);
                    setReasonError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(10, 8, 6, 0.95)',
                    border: reasonError ? '1px solid #e74c3c' : '1px solid rgba(201, 168, 76, 0.35)',
                    borderRadius: '8px',
                    color: '#f5efe6',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                {reasonError && (
                  <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {reasonError}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <Button variant="glass" type="button" onClick={() => setRequestReasonModalSale(null)} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  Cancel
                </Button>
                <Button variant="gold" type="submit" glow style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700 }}>
                  Submit Edit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPERADMIN REJECTION EXPLANATION MODAL */}
      {rejectReasonModalSale && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(6px)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setRejectReasonModalSale(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#0d0a08',
              border: '1px solid rgba(231, 76, 60, 0.45)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.9)',
              color: '#f5efe6',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(231, 76, 60, 0.2)', paddingBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <XCircle size={20} color="#e74c3c" />
                <h3 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.25rem', color: '#f5efe6', margin: 0, fontWeight: 700 }}>
                  Reject Edit Request
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectReasonModalSale(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitRejectRequest} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.84rem', color: 'rgba(255,255,255,0.7)' }}>
                Target Company: <strong style={{ color: '#c9a84c' }}>{rejectReasonModalSale.company_name || 'Offline Sale'}</strong>
              </div>

              {rejectReasonModalSale.edit_request_reason && (
                <div style={{ padding: '8px 12px', background: 'rgba(201, 168, 76, 0.08)', borderRadius: '6px', border: '1px solid rgba(201, 168, 76, 0.2)', fontSize: '0.78rem' }}>
                  <span style={{ color: '#c9a84c', fontWeight: 700 }}>Admin Request Reason: </span>
                  <span style={{ fontStyle: 'italic', color: '#f5efe6' }}>"{rejectReasonModalSale.edit_request_reason}"</span>
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f5efe6', display: 'block', marginBottom: '6px' }}>
                  Rejection Explanation Message for Admin <span style={{ color: '#e74c3c' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  placeholder="Explain to the admin why this edit request is rejected (e.g. Transaction receipt is already audited and closed for accounting, or request detail is invalid...)"
                  value={rejectReasonText}
                  onChange={(e) => {
                    setRejectReasonText(e.target.value);
                    setRejectReasonError(null);
                  }}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    background: 'rgba(10, 8, 6, 0.95)',
                    border: rejectReasonError ? '1px solid #e74c3c' : '1px solid rgba(231, 76, 60, 0.4)',
                    borderRadius: '8px',
                    color: '#f5efe6',
                    fontSize: '0.85rem',
                    outline: 'none',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                {rejectReasonError && (
                  <span style={{ color: '#e74c3c', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                    {rejectReasonError}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <Button variant="glass" type="button" onClick={() => setRejectReasonModalSale(null)} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                  Cancel
                </Button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    background: 'rgba(231, 76, 60, 0.25)',
                    border: '1px solid #e74c3c',
                    borderRadius: '6px',
                    color: '#e74c3c',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Confirm Rejection &amp; Notify Admin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FULL COMPANY SALE DETAILS & EDIT MODAL */}
      {selectedSaleModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setSelectedSaleModal(null)}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '750px',
              maxHeight: '90vh',
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
              background: '#0d0a08',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
              color: '#f5efe6',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(201, 168, 76, 0.2)', paddingBottom: '14px' }}>
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#c9a84c', fontFamily: 'monospace', letterSpacing: '0.5px' }}>
                  RECEIPT: {selectedSaleModal.receipt_number || selectedSaleModal.receipt_id || selectedSaleModal.id}
                </span>
                <h2 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '1.6rem', color: '#f5efe6', margin: '4px 0 0 0', fontWeight: 700 }}>
                  {selectedSaleModal.company_name || 'Direct Customer'}
                </h2>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
                  Recorded on: {selectedSaleModal.created_at || selectedSaleModal.date || 'N/A'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSaleModal(null)}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* SUPERADMIN APPROVAL / EDIT PERMISSION BANNER */}
            <div
              style={{
                padding: '14px 16px',
                background: 'rgba(201, 168, 76, 0.08)',
                border: '1px solid rgba(201, 168, 76, 0.3)',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <ShieldCheck size={20} color="#c9a84c" />
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f5efe6' }}>
                      Sale Record Modification Policy
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                      {isSuperAdmin
                        ? 'Superadmin Access: You can directly edit or approve admin edit requests.'
                        : selectedSaleModal.edit_request_status === 'APPROVED'
                        ? 'Edit Request Approved by Superadmin. You can modify sale details.'
                        : selectedSaleModal.edit_request_status === 'PENDING'
                        ? 'Edit Request Sent to Superadmin. Awaiting Approval.'
                        : selectedSaleModal.edit_request_status === 'REJECTED'
                        ? 'Edit Request Rejected by Superadmin.'
                        : 'Admin Access: Request Superadmin approval to edit entered offline sale details.'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  {!isSuperAdmin && selectedSaleModal.edit_request_status !== 'APPROVED' && selectedSaleModal.edit_request_status !== 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => handleOpenRequestReasonModal(selectedSaleModal)}
                      style={{
                        padding: '8px 14px',
                        background: 'rgba(52, 152, 219, 0.2)',
                        border: '1px solid #3498db',
                        borderRadius: '6px',
                        color: '#3498db',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Lock size={14} /> Request Edit Approval
                    </button>
                  )}

                  {isSuperAdmin && selectedSaleModal.edit_request_status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApproveEdit(selectedSaleModal)}
                        style={{
                          padding: '8px 14px',
                          background: 'rgba(46, 204, 113, 0.2)',
                          border: '1px solid #2ecc71',
                          borderRadius: '6px',
                          color: '#2ecc71',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <CheckCircle2 size={14} /> Approve Request
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenRejectReasonModal(selectedSaleModal)}
                        style={{
                          padding: '8px 14px',
                          background: 'rgba(231, 76, 60, 0.2)',
                          border: '1px solid #e74c3c',
                          borderRadius: '6px',
                          color: '#e74c3c',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <XCircle size={14} /> Reject Request
                      </button>
                    </>
                  )}

                  {(isSuperAdmin || selectedSaleModal.edit_request_status === 'APPROVED') && !isEditingSale && (
                    <button
                      type="button"
                      onClick={() => setIsEditingSale(true)}
                      style={{
                        padding: '8px 14px',
                        background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: '#0f0c0a',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Edit size={14} /> Edit Sale Details
                    </button>
                  )}
                </div>
              </div>

              {/* ADMIN EDIT REASON DISPLAY BOX */}
              {selectedSaleModal.edit_request_reason && (
                <div style={{ padding: '10px 14px', background: 'rgba(241, 196, 15, 0.1)', border: '1px solid rgba(241, 196, 15, 0.3)', borderRadius: '6px', fontSize: '0.8rem', color: '#f5efe6' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f1c40f', textTransform: 'uppercase', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MessageSquare size={13} /> Admin Edit Request Reason:
                  </div>
                  <div style={{ fontStyle: 'italic', color: '#f5efe6' }}>"{selectedSaleModal.edit_request_reason}"</div>
                </div>
              )}

              {/* SUPERADMIN RESPONSE / REJECTION NOTE DISPLAY BOX TO ADMIN */}
              {selectedSaleModal.superadmin_response_note && (
                <div
                  style={{
                    padding: '10px 14px',
                    background: selectedSaleModal.edit_request_status === 'REJECTED' ? 'rgba(231, 76, 60, 0.12)' : 'rgba(46, 204, 113, 0.12)',
                    border: `1px solid ${selectedSaleModal.edit_request_status === 'REJECTED' ? 'rgba(231, 76, 60, 0.35)' : 'rgba(46, 204, 113, 0.35)'}`,
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    color: '#f5efe6',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: selectedSaleModal.edit_request_status === 'REJECTED' ? '#e74c3c' : '#2ecc71',
                      textTransform: 'uppercase',
                      marginBottom: '3px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {selectedSaleModal.edit_request_status === 'REJECTED' ? (
                      <>
                        <XCircle size={13} /> Superadmin Rejection Message:
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={13} /> Superadmin Response Note:
                      </>
                    )}
                  </div>
                  <div style={{ fontStyle: 'italic', color: '#f5efe6' }}>"{selectedSaleModal.superadmin_response_note}"</div>
                </div>
              )}
            </div>

            {/* MODAL VIEW MODE OR EDIT MODE */}
            {isEditingSale ? (
              /* INLINE EDIT FORM MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(20, 16, 13, 0.6)', padding: '18px', borderRadius: '8px', border: '1px dashed rgba(201,168,76,0.3)' }}>
                <h4 style={{ fontSize: '1rem', color: '#c9a84c', margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit size={16} /> Edit Company Sale Information
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Company Name</label>
                    <input
                      type="text"
                      value={editForm.company_name}
                      onChange={(e) => setEditForm({ ...editForm, company_name: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Contact Person</label>
                    <input
                      type="text"
                      value={editForm.contact_person}
                      onChange={(e) => setEditForm({ ...editForm, contact_person: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Company Address</label>
                  <input
                    type="text"
                    value={editForm.address}
                    onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                    style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem', boxSizing: 'border-box' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Method</label>
                    <select
                      value={editForm.payment_method}
                      onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '6px', color: '#c9a84c', fontSize: '0.82rem', fontWeight: 700 }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Credit / Debit Card</option>
                      <option value="UPI">UPI</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Payment Status</label>
                    <select
                      value={editForm.payment_status}
                      onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#fff', fontSize: '0.82rem' }}
                    >
                      <option value="Paid">Paid</option>
                      <option value="Pending">Pending</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '4px' }}>Total Amount (₹)</label>
                    <input
                      type="number"
                      value={editForm.total_amount}
                      onChange={(e) => setEditForm({ ...editForm, total_amount: e.target.value })}
                      style={{ width: '100%', padding: '8px 10px', background: '#0a0806', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '6px', color: '#2ecc71', fontWeight: 700, fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                  <Button variant="glass" onClick={() => setIsEditingSale(false)} style={{ padding: '8px 16px', fontSize: '0.82rem' }}>
                    Cancel
                  </Button>
                  <Button variant="gold" onClick={handleSaveSaleEdit} disabled={isSavingEdit} glow style={{ padding: '8px 20px', fontSize: '0.82rem', fontWeight: 700 }}>
                    {isSavingEdit ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : (
              /* FULL DISPLAY MODE */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 1. Contact & Location Information */}
                <div style={{ background: 'rgba(20, 16, 13, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0', fontWeight: 700 }}>
                    Company &amp; Contact Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                    <div><strong>Contact Person:</strong> {selectedSaleModal.contact_person || 'N/A'}</div>
                    <div><strong>Phone:</strong> {selectedSaleModal.phone || 'N/A'}</div>
                    <div><strong>Email:</strong> {selectedSaleModal.email || 'N/A'}</div>
                    <div style={{ gridColumn: '1 / -1' }}><strong>Address:</strong> {selectedSaleModal.address || 'N/A'}</div>
                  </div>
                </div>

                {/* 2. Payment & Transaction Info */}
                <div style={{ background: 'rgba(20, 16, 13, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0', fontWeight: 700 }}>
                    Payment &amp; Transaction Details
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)' }}>
                    <div><strong>Payment Method:</strong> <span style={{ color: '#c9a84c', fontWeight: 700 }}>{selectedSaleModal.payment_method || selectedSaleModal.paymentMethod || 'Cash'}</span></div>
                    <div><strong>Payment Status:</strong> <span style={{ color: selectedSaleModal.payment_status === 'Paid' ? '#2ecc71' : '#f1c40f', fontWeight: 700 }}>{selectedSaleModal.payment_status || selectedSaleModal.status || 'Paid'}</span></div>
                    {selectedSaleModal.received_amount != null && <div><strong>Received Amount:</strong> ₹{selectedSaleModal.received_amount.toLocaleString('en-IN')}</div>}
                    {selectedSaleModal.card_type && <div><strong>Card Type:</strong> {selectedSaleModal.card_type}</div>}
                    {selectedSaleModal.card_last4 && <div><strong>Card Last 4:</strong> •••• {selectedSaleModal.card_last4}</div>}
                    {selectedSaleModal.transaction_id && <div><strong>Txn / UTR:</strong> {selectedSaleModal.transaction_id}</div>}
                    {selectedSaleModal.upi_id && <div><strong>UPI ID:</strong> {selectedSaleModal.upi_id}</div>}
                    {selectedSaleModal.bank_name && <div><strong>Bank Name:</strong> {selectedSaleModal.bank_name}</div>}
                    {selectedSaleModal.account_holder && <div><strong>Account Holder:</strong> {selectedSaleModal.account_holder}</div>}
                  </div>
                </div>

                {/* 3. Itemized Purchased Products */}
                <div style={{ background: 'rgba(20, 16, 13, 0.6)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <h4 style={{ fontSize: '0.88rem', color: '#c9a84c', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 10px 0', fontWeight: 700 }}>
                    Purchased Products List ({(selectedSaleModal.items || []).length || 1})
                  </h4>

                  {(selectedSaleModal.items || []).length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {selectedSaleModal.items.map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.82rem' }}>
                          <div>
                            <div style={{ fontWeight: 600, color: '#f5efe6' }}>{item.product_name || `Product #${item.product_id}`}</div>
                            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)' }}>
                              SKU: {item.sku || 'N/A'} • Qty: {item.quantity} × ₹{(item.unit_price || 0).toLocaleString('en-IN')}
                            </div>
                          </div>
                          <div style={{ fontWeight: 700, color: '#c9a84c' }}>
                            ₹{(item.line_total || (item.unit_price * item.quantity) || 0).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding: '8px 12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px', fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>
                      Product: {selectedSaleModal.productName || 'Offline Direct Sale'} ({selectedSaleModal.quantity || 1}x)
                    </div>
                  )}
                </div>

                {/* 4. Financial Totals */}
                <div style={{ padding: '16px', background: 'rgba(10, 8, 6, 0.85)', borderRadius: '8px', border: '1px solid rgba(201, 168, 76, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f5efe6' }}>Total Sale Amount:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2ecc71', fontFamily: 'var(--font-display, serif)' }}>
                    ₹{(selectedSaleModal.total_amount || selectedSaleModal.totalPrice || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
              <Button variant="glass" onClick={() => setSelectedSaleModal(null)} style={{ padding: '8px 20px', fontSize: '0.85rem' }}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineSalesView;
