import React, { useState, useEffect } from 'react';
import {
  Check,
  AlertCircle,
  Edit2,
  ShieldCheck,
  Coins,
  Award,
  Percent,
  Clock,
  UserCheck,
  Search,
  Filter,
  RefreshCw,
  Gift,
  FileSpreadsheet,
  Trash2,
  CheckSquare,
  Square,
  X,
  Info,
} from 'lucide-react';
import {
  walletService,
  RewardSettings,
  AdminCustomerRewardStat,
  AdminCoinTransactionItem,
} from '../../services/walletService';
import { Button } from '../../components/ui/Button';
import { Pagination } from '../../components/ui/Pagination';
import { exportToCSV } from '../../utils/exportCsv';

const DEFAULT_SETTINGS: RewardSettings = {
  reward_system_enabled: true,
  spend_per_coin: 10,
  coins_per_rupee: 10,
  max_redemption_percentage: 20,
  welcome_coins: 100,
  first_order_coins: 200,
  credit_delay_hours: 24,
};

export const RewardCoinsView: React.FC = () => {
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  // Tab State: default is 'rules'
  const [activeTab, setActiveTab] = useState<'rules' | 'history'>('rules');

  // Settings State
  const [settings, setSettings] = useState<RewardSettings>(DEFAULT_SETTINGS);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [showRuleForm, setShowRuleForm] = useState(false);

  // Credit Delay 3-Input Fields State (Days, Hours, Minutes)
  const [delayDays, setDelayDays] = useState<number>(1);
  const [delayHours, setDelayHours] = useState<number>(0);
  const [delayMinutes, setDelayMinutes] = useState<number>(0);

  // Customer Reward Stats & Transactions State
  const [customerStats, setCustomerStats] = useState<AdminCustomerRewardStat[]>([]);
  const [transactions, setTransactions] = useState<AdminCoinTransactionItem[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');

  // Bulk Selection State for Customer Rewards
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [isDeletingCustomers, setIsDeletingCustomers] = useState(false);

  // Pagination States
  const [custPage, setCustPage] = useState(1);
  const custLimit = 10;
  const [txPage, setTxPage] = useState(1);
  const txLimit = 10;

  // Fetch Data
  useEffect(() => {
    loadRewardSettings();
    loadAdminData();
  }, []);

  const parseDelayToParts = (totalHours: number) => {
    const total = Math.max(0, totalHours || 0);
    const d = Math.floor(total / 24);
    const remH = total - d * 24;
    const h = Math.floor(remH);
    const m = Math.round((remH - h) * 60);
    return { d, h, m };
  };

  const loadRewardSettings = async () => {
    try {
      const res = await walletService.getRewardSettings();
      if (res) {
        const totalH = res.credit_delay_hours ?? 24;
        setSettings({
          reward_system_enabled: res.reward_system_enabled ?? true,
          spend_per_coin: res.spend_per_coin ?? 10,
          coins_per_rupee: res.coins_per_rupee ?? 10,
          max_redemption_percentage: res.max_redemption_percentage ?? 20,
          welcome_coins: res.welcome_coins ?? 100,
          first_order_coins: res.first_order_coins ?? 200,
          credit_delay_hours: totalH,
        });

        const { d, h, m } = parseDelayToParts(totalH);
        setDelayDays(d);
        setDelayHours(h);
        setDelayMinutes(m);
      }
    } catch (err) {
      console.warn('Using default reward settings:', err);
    }
  };

  const loadAdminData = async () => {
    setIsLoadingData(true);
    try {
      const [custRes, txRes] = await Promise.all([
        walletService.adminGetCustomerRewards().catch(() => []),
        walletService.adminGetCoinTransactions(txTypeFilter).catch(() => []),
      ]);
      setCustomerStats(custRes || []);
      setTransactions(txRes || []);
    } catch (err) {
      console.error('Error loading admin reward data:', err);
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    loadTxData();
  }, [txTypeFilter]);

  const loadTxData = async () => {
    try {
      const txRes = await walletService.adminGetCoinTransactions(txTypeFilter);
      setTransactions(txRes || []);
      setTxPage(1);
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };

  // Helper to sync Days, Hours, Minutes with settings.credit_delay_hours
  const handleDelayChange = (d: number, h: number, m: number) => {
    const validD = Math.max(0, d || 0);
    const validH = Math.max(0, h || 0);
    const validM = Math.max(0, m || 0);
    setDelayDays(validD);
    setDelayHours(validH);
    setDelayMinutes(validM);

    const computedHours = validD * 24 + validH + validM / 60;
    setSettings((prev) => ({
      ...prev,
      credit_delay_hours: parseFloat(computedHours.toFixed(4)),
      credit_delay_days: validD,
      credit_delay_minutes: validM,
    }));
  };

  // Save Settings Handler
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await walletService.updateRewardSettings(settings);
      showNotification('success', 'Reward System rules saved successfully!');
      setShowRuleForm(false);
      loadRewardSettings();
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save reward settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Bulk Selection Handlers
  const filteredCustomerStats = customerStats.filter(
    (c) =>
      c.customer_name.toLowerCase().includes(customerSearch.toLowerCase()) ||
      c.customer_email.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const totalCustPages = Math.ceil(filteredCustomerStats.length / custLimit) || 1;
  const paginatedCustStats = filteredCustomerStats.slice((custPage - 1) * custLimit, custPage * custLimit);

  const totalTxPages = Math.ceil(transactions.length / txLimit) || 1;
  const paginatedTransactions = transactions.slice((txPage - 1) * txLimit, txPage * txLimit);

  const isAllPageSelected =
    paginatedCustStats.length > 0 &&
    paginatedCustStats.every((c) => selectedCustomerIds.has(c.user_id));

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        paginatedCustStats.forEach((c) => next.delete(c.user_id));
        return next;
      });
    } else {
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        paginatedCustStats.forEach((c) => next.add(c.user_id));
        return next;
      });
    }
  };

  const handleToggleSelectCustomer = (userId: string) => {
    setSelectedCustomerIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleDeleteSelectedCustomers = async () => {
    if (selectedCustomerIds.size === 0) return;
    const count = selectedCustomerIds.size;
    if (
      !window.confirm(
        `Are you sure you want to delete and reset the reward coins & coin transactions for ${count} selected customer(s)? This will set their available balances to 0.`
      )
    ) {
      return;
    }

    setIsDeletingCustomers(true);
    try {
      const res = await walletService.adminDeleteCustomerRewards(Array.from(selectedCustomerIds));
      showNotification(
        'success',
        res.message || `Successfully reset rewards for ${count} customer(s).`
      );
      setSelectedCustomerIds(new Set());
      await loadAdminData();
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete selected customer rewards.');
    } finally {
      setIsDeletingCustomers(false);
    }
  };

  const handleDeleteSingleCustomer = async (userId: string, name: string) => {
    if (
      !window.confirm(
        `Are you sure you want to delete and reset the reward coin balance and history for "${name}"?`
      )
    ) {
      return;
    }
    try {
      const res = await walletService.adminDeleteCustomerRewards([userId]);
      showNotification(
        'success',
        res.message || `Successfully reset rewards for ${name}.`
      );
      setSelectedCustomerIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
      await loadAdminData();
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to delete customer rewards.');
    }
  };

  const formatDelayDisplay = (totalHours?: number) => {
    const { d, h, m } = parseDelayToParts(totalHours ?? 24);
    const parts: string[] = [];
    if (d > 0) parts.push(`${d} ${d === 1 ? 'day' : 'days'}`);
    if (h > 0) parts.push(`${h} ${h === 1 ? 'hr' : 'hrs'}`);
    if (m > 0) parts.push(`${m} mins`);
    return parts.length > 0 ? parts.join(', ') : 'Immediate (0m)';
  };

  return (
    <div style={{ width: '100%', maxWidth: '1380px', margin: '0 auto', paddingBottom: '32px', color: '#f5efe6' }}>
      {/* Header section (Always on the same page) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <span style={{ color: 'rgba(201, 168, 76, 0.85)', fontSize: '0.75rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
            — LOYALTY PROGRAM
          </span>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '2.1rem', color: '#f5efe6', fontWeight: 700, margin: 0 }}>
            Reward Coins System
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              fontWeight: 600,
              background: settings.reward_system_enabled ? 'rgba(46, 204, 113, 0.12)' : 'rgba(231, 76, 60, 0.12)',
              color: settings.reward_system_enabled ? '#2ecc71' : '#e74c3c',
              border: settings.reward_system_enabled ? '1px solid rgba(46, 204, 113, 0.3)' : '1px solid rgba(231, 76, 60, 0.3)',
            }}
          >
            <ShieldCheck size={14} />
            {settings.reward_system_enabled ? 'Active & Enabled' : 'Disabled'}
          </span>
          <Button
            variant="glass"
            onClick={loadAdminData}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '8px 14px' }}
          >
            <RefreshCw size={15} className={isLoadingData ? 'spin' : ''} /> Refresh Data
          </Button>
        </div>
      </div>

      {/* Notification Banner */}
      {notification && (
        <div
          style={{
            marginBottom: '20px',
            padding: '12px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: notification.type === 'success' ? '1px solid rgba(46, 204, 113, 0.3)' : '1px solid rgba(231, 76, 60, 0.3)',
            background: notification.type === 'success' ? 'rgba(46, 204, 113, 0.1)' : 'rgba(231, 76, 60, 0.1)',
            color: notification.type === 'success' ? '#2ecc71' : '#e74c3c',
            fontSize: '0.88rem',
            fontWeight: 500,
          }}
        >
          {notification.type === 'success' ? <Check size={18} /> : <AlertCircle size={18} />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main View Mode on the Same Page */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Tab Navigation Buttons */}
        <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
          <button
            type="button"
            onClick={() => setActiveTab('rules')}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'rules' ? 'linear-gradient(135deg, #c9a84c 0%, #a68434 100%)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'rules' ? '#0f0c0a' : 'rgba(255,255,255,0.75)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'rules' ? '0 4px 14px rgba(201,168,76,0.3)' : 'none',
            }}
          >
            Active Reward Rules
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'history' ? 'linear-gradient(135deg, #c9a84c 0%, #a68434 100%)' : 'rgba(255,255,255,0.06)',
              color: activeTab === 'history' ? '#0f0c0a' : 'rgba(255,255,255,0.75)',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: activeTab === 'history' ? '0 4px 14px rgba(201,168,76,0.3)' : 'none',
            }}
          >
            Coin Transaction History
          </button>
        </div>

        {/* INLINE RULES EDITING CARD (Opens on the same page without redirect) */}
        {showRuleForm && (
          <div
            className="glass-panel"
            style={{
              background: 'rgba(14, 10, 7, 0.42)',
              border: '1px solid rgba(var(--gold-rgb), 0.35)',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 12px 36px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              animation: 'fadeIn 0.25s ease-in-out',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px' }}>
              <div>
                <h2 style={{ color: '#c9a84c', fontSize: '1.25rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0 }}>
                  Edit Reward System Rules (Inline)
                </h2>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.8rem', margin: '3px 0 0 0' }}>
                  Adjust loyalty rules, exchange ratios, bonus coins, and credit delay on this page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRuleForm(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Enable Reward System Switch */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(10, 8, 6, 0.45)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '8px',
                }}
              >
                <div>
                  <span style={{ color: '#f5efe6', fontSize: '0.88rem', fontWeight: 600, display: 'block' }}>Enable Reward System</span>
                  <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.76rem' }}>Master toggle for coin generation &amp; checkout redemptions</span>
                </div>
                <div
                  onClick={() => setSettings({ ...settings, reward_system_enabled: !settings.reward_system_enabled })}
                  style={{
                    width: '46px',
                    height: '24px',
                    borderRadius: '12px',
                    background: settings.reward_system_enabled ? '#c9a84c' : 'rgba(255,255,255,0.15)',
                    position: 'relative',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: '#0f0c0a',
                      position: 'absolute',
                      top: '3px',
                      left: settings.reward_system_enabled ? '25px' : '3px',
                      transition: 'all 0.2s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                {/* Input 1: Account Creation Coins */}
                <div>
                  <label style={{ color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Account Creation Reward (Coins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.welcome_coins ?? 100}
                    onChange={(e) => setSettings({ ...settings, welcome_coins: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(10, 8, 6, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', margin: '4px 0 0 0' }}>
                    Awarded once when customer registers (Default: 100 Coins).
                  </p>
                </div>

                {/* Input 2: First Order Bonus Coins */}
                <div>
                  <label style={{ color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    First Order Bonus (Coins)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={settings.first_order_coins ?? 200}
                    onChange={(e) => setSettings({ ...settings, first_order_coins: parseInt(e.target.value) || 0 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(10, 8, 6, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', margin: '4px 0 0 0' }}>
                    Bonus awarded on customer's first purchase (Default: 200 Coins).
                  </p>
                </div>

                {/* Input 3: Order Earning Rate */}
                <div>
                  <label style={{ color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Order Value per 1 Coin Earned (₹)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.spend_per_coin}
                    onChange={(e) => setSettings({ ...settings, spend_per_coin: parseFloat(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(10, 8, 6, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', margin: '4px 0 0 0' }}>
                    ₹10 spent = 1 Coin earned (₹100 order = 10 Coins).
                  </p>
                </div>

                {/* Input 4: Coins per Rupee Discount */}
                <div>
                  <label style={{ color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Coins Needed for ₹1 Discount
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.coins_per_rupee}
                    onChange={(e) => setSettings({ ...settings, coins_per_rupee: parseFloat(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(10, 8, 6, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', margin: '4px 0 0 0' }}>
                    10 Coins = ₹1 discount value (100 Coins = ₹10).
                  </p>
                </div>

                {/* Input 5: Max redemption limit % */}
                <div>
                  <label style={{ color: '#c9a84c', fontSize: '0.82rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                    Maximum Order Redemption Limit (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={settings.max_redemption_percentage}
                    onChange={(e) => setSettings({ ...settings, max_redemption_percentage: parseFloat(e.target.value) || 1 })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      background: 'rgba(10, 8, 6, 0.55)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f5efe6',
                      fontSize: '0.88rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                    required
                  />
                  <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.74rem', margin: '4px 0 0 0' }}>
                    Max % of order subtotal paid with coins (Default: 20%).
                  </p>
                </div>
              </div>

              {/* Input 6: Credit Delay 3-Input Fields (Days, Hours, Minutes) */}
              <div
                style={{
                  background: 'rgba(10, 8, 6, 0.45)',
                  border: '1px solid rgba(201, 168, 76, 0.25)',
                  borderRadius: '10px',
                  padding: '16px 18px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                  <label style={{ color: '#c9a84c', fontSize: '0.88rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} /> Order Coin Credit Delay Duration
                  </label>
                  <span
                    style={{
                      background: 'rgba(201, 168, 76, 0.15)',
                      border: '1px solid rgba(201, 168, 76, 0.35)',
                      color: '#c9a84c',
                      fontSize: '0.76rem',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '12px',
                    }}
                  >
                    Effective Delay: {formatDelayDisplay(settings.credit_delay_hours)} ({(settings.credit_delay_hours ?? 24).toFixed(2)}h)
                  </span>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.76rem', margin: '0 0 12px 0' }}>
                  Specify duration before earned coins unlock for redemption. You can configure Days, Hours, and Minutes (e.g. 1 day, 1 hour, 30 minutes, or just 10 minutes).
                </p>

                {/* 3 Responsive Input Fields */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Days
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={delayDays}
                      onChange={(e) => handleDelayChange(parseInt(e.target.value) || 0, delayHours, delayMinutes)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Hours
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={delayHours}
                      onChange={(e) => handleDelayChange(delayDays, parseInt(e.target.value) || 0, delayMinutes)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <span style={{ fontSize: '0.74rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                      Minutes
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={delayMinutes}
                      onChange={(e) => handleDelayChange(delayDays, delayHours, parseInt(e.target.value) || 0)}
                      placeholder="0"
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: 'rgba(0, 0, 0, 0.4)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '6px',
                        color: '#f5efe6',
                        fontSize: '0.88rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Form Action Buttons */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowRuleForm(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#f5efe6',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  style={{
                    padding: '10px 26px',
                    background: 'linear-gradient(135deg, #c9a84c 0%, #e5c875 50%, #c9a84c 100%)',
                    color: '#0f0c0a',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: 'none',
                    cursor: isSavingSettings ? 'not-allowed' : 'pointer',
                    letterSpacing: '0.5px',
                    fontSize: '0.82rem',
                    boxShadow: '0 4px 16px rgba(201,168,76,0.3)',
                    opacity: isSavingSettings ? 0.6 : 1,
                  }}
                >
                  {isSavingSettings ? 'Saving...' : 'Save Rule Changes'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 1: Active Reward Rules */}
        {activeTab === 'rules' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Active Rules Summary Panel — Glass Panel with Brand Transparency */}
            <div
              className="glass-panel"
              style={{
                background: 'rgba(14, 10, 7, 0.32)',
                border: '1px solid rgba(var(--gold-rgb), 0.22)',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ color: '#c9a84c', fontSize: '1.15rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0 }}>
                    Active Reward System Rules
                  </h2>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>
                    Current automated reward generation, redemption conversion, and credit delay settings
                  </p>
                </div>
                <Button
                  variant="glass"
                  onClick={() => setShowRuleForm(true)}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', padding: '7px 14px' }}
                >
                  <Edit2 size={14} /> Edit Rules
                </Button>
              </div>

              {/* Compact 3 Columns x 2 Rows Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                {/* Rule 1: Account Creation */}
                <div style={{ background: 'rgba(14, 10, 7, 0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <UserCheck size={16} color="#c9a84c" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Account Creation</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6' }}>
                    {settings.welcome_coins ?? 100} Coins
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'block' }}>
                    Awarded once on registration
                  </span>
                </div>

                {/* Rule 2: First Order Bonus */}
                <div style={{ background: 'rgba(14, 10, 7, 0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Gift size={16} color="#c9a84c" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>First Order Bonus</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6' }}>
                    {settings.first_order_coins ?? 200} Bonus Coins
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'block' }}>
                    Awarded once on 1st eligible order
                  </span>
                </div>

                {/* Rule 3: Order Reward Rate */}
                <div style={{ background: 'rgba(14, 10, 7, 0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Coins size={16} color="#c9a84c" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Order Reward Rate</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6' }}>
                    10 Coins per ₹100
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'block' }}>
                    Earned on eligible purchases
                  </span>
                </div>

                {/* Rule 4: Coin Value */}
                <div style={{ background: 'rgba(14, 10, 7, 0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Award size={16} color="#c9a84c" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Coin Value</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6' }}>
                    {settings.coins_per_rupee} Coins = ₹1
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'block' }}>
                    Redemption conversion at checkout
                  </span>
                </div>

                {/* Rule 5: Max Redemption Cap */}
                <div style={{ background: 'rgba(14, 10, 7, 0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Percent size={16} color="#c9a84c" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Max Redemption</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6' }}>
                    {settings.max_redemption_percentage}%
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'block' }}>
                    Max % of order subtotal
                  </span>
                </div>

                {/* Rule 6: Credit Delay (Formatted Days / Hours / Mins) */}
                <div style={{ background: 'rgba(14, 10, 7, 0.25)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <Clock size={16} color="#c9a84c" />
                    <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Credit Delay</span>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f5efe6' }}>
                    {formatDelayDisplay(settings.credit_delay_hours)}
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)', marginTop: '2px', display: 'block' }}>
                    Pending lock before coins unlock
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Reward Information Overview Table — Glass Panel with Brand Transparency */}
            <div
              className="glass-panel"
              style={{
                background: 'rgba(14, 10, 7, 0.32)',
                border: '1px solid rgba(var(--gold-rgb), 0.22)',
                borderRadius: '12px',
                padding: '20px 24px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h3 style={{ color: '#c9a84c', fontSize: '1.15rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Coins size={18} /> Customer Reward Information
                  </h3>
                  <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: '3px 0 0 0' }}>
                    Real-time balances, pending hold, lifetime earned/redeemed totals, and bonus status.
                  </p>
                </div>

                {/* Actions: Search, Bulk Delete, Export CSV */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {/* Search Customer Bar */}
                  <div style={{ position: 'relative', width: '220px' }}>
                    <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.4)' }} />
                    <input
                      type="text"
                      placeholder="Search customer..."
                      value={customerSearch}
                      onChange={(e) => {
                        setCustomerSearch(e.target.value);
                        setCustPage(1);
                      }}
                      style={{
                        width: '100%',
                        padding: '7px 12px 7px 34px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.15)',
                        background: 'rgba(0,0,0,0.4)',
                        color: '#fff',
                        fontSize: '0.8rem',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  {/* Export CSV */}
                  <Button
                    variant="glass"
                    onClick={() => exportToCSV('Customer_Reward_Information', filteredCustomerStats)}
                    disabled={filteredCustomerStats.length === 0}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px', border: '1px solid rgba(201,168,76,0.35)', color: '#c9a84c' }}
                  >
                    <FileSpreadsheet size={14} /> Export CSV
                  </Button>
                </div>
              </div>

              {/* Bulk Action Toolbar if rows are selected */}
              {selectedCustomerIds.size > 0 && (
                <div
                  style={{
                    marginBottom: '14px',
                    padding: '10px 16px',
                    background: 'rgba(231, 76, 60, 0.12)',
                    border: '1px solid rgba(231, 76, 60, 0.4)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff7675', fontSize: '0.82rem', fontWeight: 600 }}>
                    <Info size={16} />
                    <span>{selectedCustomerIds.size} customer reward account(s) selected</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerIds(new Set())}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '6px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: '#f5efe6',
                        fontSize: '0.78rem',
                        cursor: 'pointer',
                      }}
                    >
                      Clear Selection
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSelectedCustomers}
                      disabled={isDeletingCustomers}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: 'rgba(231, 76, 60, 0.85)',
                        border: 'none',
                        color: '#fff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isDeletingCustomers ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(231, 76, 60, 0.4)',
                      }}
                    >
                      <Trash2 size={14} />
                      {isDeletingCustomers ? 'Deleting...' : `Delete / Reset Selected (${selectedCustomerIds.size})`}
                    </button>
                  </div>
                </div>
              )}

              {/* Table Info Clarification Banner */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  background: 'rgba(201, 168, 76, 0.08)',
                  border: '1px solid rgba(201, 168, 76, 0.15)',
                  marginBottom: '12px',
                  fontSize: '0.74rem',
                  color: 'rgba(255,255,255,0.7)',
                }}
              >
                <Info size={14} color="#c9a84c" style={{ flexShrink: 0 }} />
                <span>
                  <strong>Data Guide:</strong> <span style={{ color: '#2ecc71' }}>Available</span> = ready for immediate cart redemption. <span style={{ color: '#f39c12' }}>Pending Hold</span> = coins held during credit delay period before unlock. You can select multiple items to bulk delete / reset rewards.
                </span>
              </div>

              {/* Compact Customer Table */}
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.81rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: 'rgba(201,168,76,0.95)' }}>
                      <th style={{ padding: '10px 10px', width: '36px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={handleToggleSelectAll}
                          title={isAllPageSelected ? 'Deselect all' : 'Select all on page'}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: isAllPageSelected ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isAllPageSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </th>
                      <th style={{ padding: '10px 12px' }}>Customer</th>
                      <th style={{ padding: '10px 12px' }}>Available Balance</th>
                      <th style={{ padding: '10px 12px' }}>Pending Hold</th>
                      <th style={{ padding: '10px 12px' }}>Total Earned</th>
                      <th style={{ padding: '10px 12px' }}>Redeemed</th>
                      <th style={{ padding: '10px 12px' }}>Returned</th>
                      <th style={{ padding: '10px 12px' }}>Reversed</th>
                      <th style={{ padding: '10px 12px' }}>1st Order Bonus</th>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingData ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                          <RefreshCw size={16} className="spin" style={{ display: 'inline', marginRight: '6px' }} />
                          Loading customer reward information...
                        </td>
                      </tr>
                    ) : paginatedCustStats.length === 0 ? (
                      <tr>
                        <td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                          No customer reward records found matching criteria.
                        </td>
                      </tr>
                    ) : (
                      paginatedCustStats.map((cust) => {
                        const isSelected = selectedCustomerIds.has(cust.user_id);
                        return (
                          <tr
                            key={cust.user_id}
                            style={{
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              background: isSelected ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleToggleSelectCustomer(cust.user_id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: isSelected ? '#c9a84c' : 'rgba(255,255,255,0.4)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto',
                                }}
                              >
                                {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                              </button>
                            </td>
                            <td style={{ padding: '10px 12px', color: '#f5efe6' }}>
                              <div style={{ fontWeight: 600 }}>{cust.customer_name}</div>
                              <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)' }}>{cust.customer_email}</div>
                            </td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2ecc71' }}>
                              {cust.available_coins} Coins
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              {cust.pending_coins > 0 ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(243,156,18,0.15)', color: '#f39c12', padding: '2px 8px', borderRadius: '4px', fontWeight: 600, fontSize: '0.74rem' }}>
                                  <Clock size={11} /> {cust.pending_coins} Coins
                                </span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.3)' }}>0</span>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#c9a84c' }}>{cust.total_coins_earned}</td>
                            <td style={{ padding: '10px 12px', color: '#e74c3c' }}>{cust.total_coins_redeemed}</td>
                            <td style={{ padding: '10px 12px', color: '#3498db' }}>{cust.total_coins_returned}</td>
                            <td style={{ padding: '10px 12px', color: '#9b59b6' }}>{cust.total_coins_reversed}</td>
                            <td style={{ padding: '10px 12px' }}>
                              <span
                                style={{
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontSize: '0.72rem',
                                  fontWeight: 600,
                                  background:
                                    cust.first_order_bonus_status === 'Awarded'
                                      ? 'rgba(46,204,113,0.15)'
                                      : cust.first_order_bonus_status === 'Eligible'
                                      ? 'rgba(201,168,76,0.15)'
                                      : cust.first_order_bonus_status === 'Pending'
                                      ? 'rgba(243,156,18,0.15)'
                                      : 'rgba(255,255,255,0.08)',
                                  color:
                                    cust.first_order_bonus_status === 'Awarded'
                                      ? '#2ecc71'
                                      : cust.first_order_bonus_status === 'Eligible'
                                      ? '#c9a84c'
                                      : cust.first_order_bonus_status === 'Pending'
                                      ? '#f39c12'
                                      : 'rgba(255,255,255,0.4)',
                                }}
                              >
                                {cust.first_order_bonus_status}
                              </span>
                            </td>
                            <td style={{ padding: '10px 10px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => handleDeleteSingleCustomer(cust.user_id, cust.customer_name)}
                                title={`Delete / Reset rewards for ${cust.customer_name}`}
                                style={{
                                  background: 'rgba(231, 76, 60, 0.1)',
                                  border: '1px solid rgba(231, 76, 60, 0.3)',
                                  color: '#ff6b6b',
                                  borderRadius: '6px',
                                  padding: '4px 7px',
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Customer Table Pagination */}
              {filteredCustomerStats.length > custLimit && (
                <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                  <Pagination
                    currentPage={custPage}
                    totalPages={totalCustPages}
                    totalItems={filteredCustomerStats.length}
                    itemsPerPage={custLimit}
                    onPageChange={(p) => setCustPage(p)}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Coin Transaction History */}
        {activeTab === 'history' && (
          <div
            className="glass-panel"
            style={{
              background: 'rgba(14, 10, 7, 0.32)',
              border: '1px solid rgba(var(--gold-rgb), 0.22)',
              borderRadius: '12px',
              padding: '20px 24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(2px)',
              WebkitBackdropFilter: 'blur(2px)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ color: '#c9a84c', fontSize: '1.15rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0 }}>
                  Coin Transaction History
                </h3>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.78rem', margin: '2px 0 0 0' }}>
                  Audited log of every reward movement, redemption, return, reversal, and credit delay status.
                </p>
              </div>

              {/* Type Filter Dropdown */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={15} color="#c9a84c" />
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(10,8,6,0.95)',
                    color: '#fff',
                    fontSize: '0.8rem',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="ALL">All Transaction Types</option>
                  <option value="ACCOUNT_CREATION">Account Creation Reward</option>
                  <option value="FIRST_ORDER_BONUS">First Order Bonus</option>
                  <option value="ORDER_REWARD">Order Reward</option>
                  <option value="REDEEM">Coin Redemption</option>
                  <option value="REFUND">Coin Return</option>
                  <option value="ADJUSTMENT">Coin Reversal</option>
                </select>
              </div>
            </div>

            {/* Compact Transaction Log Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.81rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.12)', color: 'rgba(201,168,76,0.95)' }}>
                    <th style={{ padding: '10px 12px' }}>Date &amp; Time</th>
                    <th style={{ padding: '10px 12px' }}>Customer</th>
                    <th style={{ padding: '10px 12px' }}>Transaction Type</th>
                    <th style={{ padding: '10px 12px' }}>Coins Delta</th>
                    <th style={{ padding: '10px 12px' }}>Description / Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingData ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                        <RefreshCw size={16} className="spin" style={{ display: 'inline', marginRight: '6px' }} />
                        Loading transaction log...
                      </td>
                    </tr>
                  ) : paginatedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                        No transactions recorded for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    paginatedTransactions.map((tx) => {
                      const isPositive = tx.coins > 0;
                      return (
                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.65)' }}>{tx.created_at}</td>
                          <td style={{ padding: '10px 12px', color: '#f5efe6' }}>
                            <div style={{ fontWeight: 600 }}>{tx.customer_name}</div>
                            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.45)' }}>{tx.customer_email}</div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            {(() => {
                              const txType = tx.transaction_type || (tx as any).type || 'TRANSACTION';
                              return (
                                <span
                                  style={{
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.73rem',
                                    fontWeight: 600,
                                    background:
                                      txType === 'ACCOUNT_CREATION' || txType === 'FIRST_ORDER_BONUS'
                                        ? 'rgba(46,204,113,0.15)'
                                        : txType === 'ORDER_REWARD'
                                        ? 'rgba(201,168,76,0.15)'
                                        : txType === 'REDEEM'
                                        ? 'rgba(231,76,60,0.15)'
                                        : txType === 'REFUND'
                                        ? 'rgba(52,152,219,0.15)'
                                        : 'rgba(155,89,182,0.15)',
                                    color:
                                      txType === 'ACCOUNT_CREATION' || txType === 'FIRST_ORDER_BONUS'
                                        ? '#2ecc71'
                                        : txType === 'ORDER_REWARD'
                                        ? '#c9a84c'
                                        : txType === 'REDEEM'
                                        ? '#e74c3c'
                                        : txType === 'REFUND'
                                        ? '#3498db'
                                        : '#9b59b6',
                                  }}
                                >
                                  {txType}
                                </span>
                              );
                            })()}
                          </td>
                          <td style={{ padding: '10px 12px', fontWeight: 700, color: isPositive ? '#2ecc71' : '#e74c3c' }}>
                            {isPositive ? `+${tx.coins}` : tx.coins} Coins
                          </td>
                          <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.75)' }}>
                            <div>{tx.reason}</div>
                            <div style={{ display: 'flex', gap: '10px', fontSize: '0.73rem', marginTop: '2px' }}>
                              {tx.order_id && (
                                <span style={{ color: '#c9a84c', fontFamily: 'monospace' }}>Order: #{tx.order_id}</span>
                              )}
                              {tx.available_at ? (
                                <span style={{ color: '#f39c12' }}>Hold (Avail {tx.available_at})</span>
                              ) : (
                                <span style={{ color: 'rgba(255,255,255,0.4)' }}>Immediate</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Transactions */}
            {transactions.length > txLimit && (
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                <Pagination
                  currentPage={txPage}
                  totalPages={totalTxPages}
                  totalItems={transactions.length}
                  itemsPerPage={txLimit}
                  onPageChange={(p) => setTxPage(p)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
