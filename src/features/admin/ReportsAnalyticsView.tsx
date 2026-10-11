import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Download,
  Filter,
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Users,
  Coins,
  Tag,
  FileSpreadsheet,
  AlertCircle,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { adminService } from '../../services/adminService';
import { Pagination } from '../../components/ui/Pagination';

type ReportType = 'sales' | 'orders' | 'products' | 'customers' | 'coupons' | 'reward_coins';
type DatePreset = '7days' | '30days' | '3months' | '1year' | 'custom';

interface KPICard {
  title: string;
  value: string;
  growth_percentage?: number;
  subtext?: string;
}

interface ChartPoint {
  label: string;
  value: number;
  secondary_value?: number;
}

interface ReportData {
  report_type: string;
  start_date: string;
  end_date: string;
  kpi_summary: KPICard[];
  chart_data: ChartPoint[];
  table_headers: string[];
  table_rows: any[][];
  totals_footer?: any[];
  total_records: number;
  page: number;
  total_pages: number;
}

export const ReportsAnalyticsView: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('sales');
  const [preset, setPreset] = useState<DatePreset>('7days');

  // Dates (Default to last 7 days)
  const getInitialDates = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6);
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const initial = getInitialDates();
  const [startDate, setStartDate] = useState<string>(initial.start);
  const [endDate, setEndDate] = useState<string>(initial.end);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Loading & State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [isExportingCsv, setIsExportingCsv] = useState<boolean>(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Handle Preset Changes
  const handlePresetChange = (newPreset: DatePreset) => {
    setPreset(newPreset);
    const end = new Date();
    const start = new Date();

    if (newPreset === '7days') {
      start.setDate(end.getDate() - 6);
    } else if (newPreset === '30days') {
      start.setDate(end.getDate() - 29);
    } else if (newPreset === '3months') {
      start.setMonth(end.getMonth() - 3);
    } else if (newPreset === '1year') {
      start.setFullYear(end.getFullYear() - 1);
    }

    if (newPreset !== 'custom') {
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(end.toISOString().split('T')[0]);
      setCurrentPage(1);
    }
  };

  // Fetch Report Data
  const fetchReport = async (page = 1) => {
    setErrorMsg(null);

    if (!startDate || !endDate) {
      setErrorMsg('Both Start Date and End Date are required.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start Date cannot be after End Date.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await adminService.getReport({
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
        page,
        limit: 20,
      });
      setReportData(res);
      setCurrentPage(page);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch report data.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch on mount or when reportType/dates change
  useEffect(() => {
    fetchReport(1);
  }, [reportType, startDate, endDate]);

  // Handle Excel Export
  const handleExportExcel = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!startDate || !endDate) {
      setErrorMsg('Both Start Date and End Date are required for export.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start Date cannot be after End Date.');
      return;
    }

    setIsExportingExcel(true);
    try {
      await adminService.downloadExcelReport({
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
      });
      setSuccessMsg('Excel report downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download report Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Handle PDF Export
  const handleExportPdf = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!startDate || !endDate) {
      setErrorMsg('Both Start Date and End Date are required for export.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start Date cannot be after End Date.');
      return;
    }

    setIsExportingPdf(true);
    try {
      await adminService.downloadPdfReport({
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
      });
      setSuccessMsg('PDF report downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download report PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle CSV Export
  const handleExportCsv = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (!startDate || !endDate) {
      setErrorMsg('Both Start Date and End Date are required for export.');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      setErrorMsg('Start Date cannot be after End Date.');
      return;
    }

    setIsExportingCsv(true);
    try {
      await adminService.downloadCsvReport({
        report_type: reportType,
        start_date: startDate,
        end_date: endDate,
      });
      setSuccessMsg('CSV report downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to download report CSV.');
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Max value calculation for chart bars
  const maxChartVal = reportData?.chart_data?.reduce((max, p) => Math.max(max, p.value), 0) || 1;

  const reportTabs: { id: ReportType; label: string; icon: any }[] = [
    { id: 'sales', label: 'Sales Report', icon: TrendingUp },
    { id: 'orders', label: 'Order Report', icon: BarChart3 },
    { id: 'products', label: 'Product Report', icon: ShoppingBag },
    { id: 'customers', label: 'Customer Report', icon: Users },
    { id: 'coupons', label: 'Coupon Report', icon: Tag },
    { id: 'reward_coins', label: 'Reward Coin Report', icon: Coins },
  ];

  return (
    <div style={{ width: '100%', maxWidth: '1280px', margin: '0 auto', paddingBottom: '48px', color: 'var(--cream)', boxSizing: 'border-box', overflowX: 'hidden' }}>
      {/* Header & Date Presets Header Row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', marginBottom: '28px' }}>
        <div>
          <span style={{ color: 'var(--gold)', fontSize: '0.78rem', letterSpacing: '2px', textTransform: 'uppercase', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
            — BUSINESS REPORTS
          </span>
          <h1 style={{ fontFamily: 'var(--font-display, serif)', fontSize: '2.4rem', color: 'var(--cream)', fontWeight: 700, margin: 0 }}>
            Reports & Analytics
          </h1>
        </div>

        {/* Date Quick Presets */}
        <div className="reports-presets-strip" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface-color)', border: '1px solid rgba(var(--gold-rgb), 0.25)', borderRadius: '8px', padding: '4px' }}>
          {(['7days', '30days', '3months', '1year', 'custom'] as DatePreset[]).map((p) => {
            const labels: Record<DatePreset, string> = {
              '7days': '7 Days',
              '30days': '30 Days',
              '3months': '3 Months',
              '1year': '1 Year',
              custom: 'Custom',
            };
            const isActive = preset === p;
            return (
              <button
                key={p}
                onClick={() => handlePresetChange(p)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  background: isActive ? 'var(--gradient-gold)' : 'transparent',
                  color: isActive ? 'var(--black)' : 'var(--cream)',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {labels[p]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Pickers & Actions Bar */}
      <div className="reports-toolbar-card glass-panel" style={{ background: 'var(--surface-color)', border: '1px solid rgba(var(--gold-rgb), 0.25)', borderRadius: '12px', padding: '20px 24px', marginBottom: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div className="reports-date-pickers">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--gold)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600 }}>Start Date:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPreset('custom');
              }}
              style={{
                padding: '8px 12px',
                background: 'var(--black)',
                border: '1px solid rgba(var(--gold-rgb), 0.3)',
                borderRadius: '6px',
                color: 'var(--cream)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={16} color="var(--gold)" />
            <span style={{ fontSize: '0.82rem', color: 'var(--gold)', fontWeight: 600 }}>End Date:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPreset('custom');
              }}
              style={{
                padding: '8px 12px',
                background: 'var(--black)',
                border: '1px solid rgba(var(--gold-rgb), 0.3)',
                borderRadius: '6px',
                color: 'var(--cream)',
                fontSize: '0.85rem',
                outline: 'none',
              }}
              required
            />
          </div>
        </div>

        <div className="reports-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--beige)', marginRight: '8px' }}>
            Selected Period: <strong>{startDate}</strong> to <strong>{endDate}</strong>
          </span>

          <div className="reports-action-buttons">
            <button
              onClick={() => fetchReport(1)}
              disabled={isLoading}
              style={{
                padding: '10px 18px',
                background: 'rgba(var(--gold-rgb), 0.15)',
                border: '1px solid rgba(var(--gold-rgb), 0.4)',
                borderRadius: '8px',
                color: 'var(--gold)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              VIEW REPORT
            </button>

            {/* Download Excel - Primary */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || isExportingPdf || isExportingCsv}
              style={{
                padding: '10px 18px',
                background: 'var(--gradient-gold)',
                border: 'none',
                borderRadius: '8px',
                color: 'var(--black)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 4px 14px rgba(var(--gold-rgb), 0.25)',
                opacity: isExportingExcel ? 0.6 : 1,
              }}
            >
              {isExportingExcel ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download Excel
            </button>

            {/* Download PDF */}
            <button
              onClick={handleExportPdf}
              disabled={isExportingExcel || isExportingPdf || isExportingCsv}
              style={{
                padding: '10px 18px',
                background: 'var(--surface-color)',
                border: '1px solid rgba(var(--gold-rgb), 0.5)',
                borderRadius: '8px',
                color: 'var(--gold)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isExportingPdf ? 0.6 : 1,
              }}
            >
              {isExportingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download PDF
            </button>

            {/* Download CSV */}
            <button
              onClick={handleExportCsv}
              disabled={isExportingExcel || isExportingPdf || isExportingCsv}
              style={{
                padding: '10px 18px',
                background: 'var(--surface-color)',
                border: '1px solid rgba(var(--gold-rgb), 0.5)',
                borderRadius: '8px',
                color: 'var(--gold)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: isExportingCsv ? 0.6 : 1,
              }}
            >
              {isExportingCsv ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Download CSV
            </button>
          </div>
        </div>
      </div>

      {/* Error / Validation Notification */}
      {errorMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            background: 'rgba(231, 76, 60, 0.1)',
            color: '#e74c3c',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Success Notification */}
      {successMsg && (
        <div
          style={{
            marginBottom: '24px',
            padding: '14px 20px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            border: '1px solid rgba(46, 204, 113, 0.3)',
            background: 'rgba(46, 204, 113, 0.1)',
            color: '#2ecc71',
            fontSize: '0.9rem',
            fontWeight: 500,
          }}
        >
          <Check size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Report Type Selector Tabs Card */}
      <div className="reports-tabs-card">
        <div className="reports-tabs-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BarChart3 size={15} color="var(--gold)" />
            <span className="reports-tabs-title">REPORT CATEGORY</span>
          </div>
          <span className="reports-tabs-active-badge">
            {reportTabs.find((t) => t.id === reportType)?.label}
          </span>
        </div>

        <div className="reports-tabs-grid">
          {reportTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`reports-tab-btn ${isActive ? 'active' : ''}`}
                title={tab.label}
              >
                <Icon size={16} className="reports-tab-icon" />
                <span className="reports-tab-label">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {isLoading ? (
        <div style={{ padding: '60px', textAlign: 'center', background: 'var(--surface-color)', border: '1px solid rgba(var(--gold-rgb), 0.25)', borderRadius: '12px' }}>
          <Loader2 size={36} color="var(--gold)" style={{ animation: 'spin 1s linear infinite', margin: '0 auto 16px auto' }} />
          <p style={{ color: 'var(--cream)', opacity: 0.7, fontSize: '0.95rem' }}>Generating {reportType.replace('_', ' ')} analytics report...</p>
        </div>
      ) : reportData ? (
        <>
          {/* KPI Summary Cards Grid */}
          <div className="reports-kpi-grid">
            {reportData.kpi_summary.map((kpi, idx) => (
              <div
                key={idx}
                style={{
                  background: 'var(--surface-color)',
                  border: '1px solid rgba(var(--gold-rgb), 0.25)',
                  borderRadius: '12px',
                  padding: '22px 24px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(12px)',
                }}
              >
                <div style={{ fontSize: '0.82rem', color: 'var(--beige)', fontWeight: 500, marginBottom: '8px' }}>
                  {kpi.title}
                </div>
                <div style={{ fontSize: '1.9rem', fontFamily: 'var(--font-number), var(--font-display, serif)', fontWeight: 700, color: 'var(--cream)', marginBottom: '6px' }}>
                  {kpi.value}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem' }}>
                  {kpi.growth_percentage !== undefined && kpi.growth_percentage !== null && (
                    <span style={{ color: kpi.growth_percentage >= 0 ? '#2ecc71' : '#e74c3c', fontWeight: 700 }}>
                      {kpi.growth_percentage >= 0 ? `+${kpi.growth_percentage}%` : `${kpi.growth_percentage}%`}
                    </span>
                  )}
                  {kpi.subtext && <span style={{ color: 'rgba(255,255,255,0.45)' }}>{kpi.subtext}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Chart & Top Breakdown Grid */}
          <div className="reports-charts-grid">
            {/* Sales / Performance Trend Chart */}
            <div className="reports-chart-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '1.1rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0 }}>
                  Trend Analysis
                </h3>
                {reportData.chart_data && reportData.chart_data.length > 5 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--gold)', opacity: 0.8, whiteSpace: 'nowrap' }}>
                    ⇄ Scroll chart
                  </span>
                )}
              </div>

              {reportData.chart_data && reportData.chart_data.length > 0 ? (
                <div className="reports-chart-scroll-wrap">
                  <div
                    style={{
                      height: '210px',
                      display: 'flex',
                      alignItems: 'flex-end',
                      gap: '12px',
                      paddingTop: '20px',
                      borderBottom: '1px solid rgba(255,255,255,0.1)',
                      minWidth: reportData.chart_data.length > 5 ? `${reportData.chart_data.length * 64}px` : '100%',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    {reportData.chart_data.map((pt, i) => {
                      const pct = Math.max(8, Math.round((pt.value / maxChartVal) * 100));
                      return (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            minWidth: '52px',
                            maxWidth: reportData.chart_data.length <= 5 ? '80px' : undefined,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            height: '100%',
                            justifyContent: 'flex-end',
                            boxSizing: 'border-box',
                          }}
                        >
                          <div style={{ fontSize: '0.68rem', color: 'var(--gold)', fontWeight: 600, marginBottom: '6px', whiteSpace: 'nowrap', fontFamily: 'var(--font-number)' }}>
                            {pt.value >= 1000 ? `${(pt.value / 1000).toFixed(1)}K` : pt.value}
                          </div>
                          <div
                            style={{
                              width: '100%',
                              maxWidth: '36px',
                              height: `${pct}%`,
                              background: 'var(--gradient-gold)',
                              borderRadius: '4px 4px 0 0',
                              transition: 'height 0.4s ease',
                            }}
                          />
                          <span
                            title={pt.label}
                            style={{
                              fontSize: '0.68rem',
                              color: 'var(--cream)',
                              opacity: 0.65,
                              marginTop: '8px',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: '56px',
                              textAlign: 'center',
                              display: 'block',
                            }}
                          >
                            {pt.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                  No trend data available for this range.
                </div>
              )}
            </div>

            {/* Top Items List */}
            <div className="reports-summary-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '8px' }}>
                <h3 style={{ color: 'var(--gold)', fontSize: '1.1rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0 }}>
                  Top Report Summary
                </h3>
                {reportData.table_rows && reportData.table_rows.length > 5 && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--gold)', opacity: 0.8, whiteSpace: 'nowrap' }}>
                    Top {Math.min(10, reportData.table_rows.length)}
                  </span>
                )}
              </div>

              {reportData.table_rows && reportData.table_rows.length > 0 ? (
                <div className="reports-summary-scroll-list">
                  {reportData.table_rows.slice(0, 10).map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '10px 14px',
                        background: 'var(--black)',
                        border: '1px solid rgba(var(--gold-rgb), 0.15)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        minWidth: 0,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          title={String(row[0])}
                          style={{
                            fontSize: '0.88rem',
                            fontWeight: 600,
                            color: 'var(--cream)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {row[0]}
                        </div>
                        <div
                          title={String(row[1])}
                          style={{
                            fontSize: '0.78rem',
                            color: 'var(--beige)',
                            opacity: 0.7,
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {row[1]}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold)', whiteSpace: 'nowrap', fontFamily: 'var(--font-number)' }}>
                          {row[row.length - 1]}
                        </div>
                        {row.length > 3 && (
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', whiteSpace: 'nowrap' }}>
                            {row[row.length - 2]}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ height: '210px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem' }}>
                  No items found.
                </div>
              )}
            </div>
          </div>

          {/* Detailed Data Table */}
          <div className="reports-details-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ color: 'var(--gold)', fontSize: '1.2rem', fontFamily: 'var(--font-display, serif)', fontWeight: 600, margin: 0 }}>
                  Detailed Report Dataset
                </h3>
                <span style={{ fontSize: '0.8rem', color: 'var(--beige)', opacity: 0.7 }}>
                  Showing {reportData.table_rows.length} of {reportData.total_records} records
                </span>
              </div>
              <button
                onClick={handleExportCsv}
                disabled={isExportingCsv}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(var(--gold-rgb), 0.1)',
                  border: '1px solid rgba(var(--gold-rgb), 0.4)',
                  color: 'var(--gold)',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: isExportingCsv ? 'not-allowed' : 'pointer',
                  opacity: isExportingCsv ? 0.7 : 1,
                }}
              >
                <Download size={14} />
                {isExportingCsv ? 'Exporting...' : 'Export CSV'}
              </button>
            </div>

            {reportData.table_rows.length > 0 ? (
              <>
                <div className="reports-table-wrap" style={{ marginBottom: '20px' }}>
                  <table className="reports-data-table" style={{ borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(var(--gold-rgb), 0.3)', color: 'var(--gold)', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {reportData.table_headers.map((h, i) => (
                          <th key={i} style={{ padding: '12px 16px' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.table_rows.map((row, rIdx) => (
                        <tr key={rIdx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--cream)', fontSize: '0.88rem' }}>
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} style={{ padding: '14px 16px' }}>{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                    {reportData.totals_footer && (
                      <tfoot>
                        <tr style={{ borderTop: '2px solid rgba(var(--gold-rgb), 0.4)', background: 'rgba(var(--gold-rgb), 0.08)', color: 'var(--gold)', fontWeight: 700, fontSize: '0.9rem', fontFamily: 'var(--font-number)' }}>
                          {reportData.totals_footer.map((fCell, fIdx) => (
                            <td key={fIdx} style={{ padding: '14px 16px' }}>{fCell}</td>
                          ))}
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Pagination Controls */}
                <div style={{ marginTop: '20px' }}>
                  <Pagination
                    currentPage={reportData.page}
                    totalPages={reportData.total_pages || 1}
                    totalItems={reportData.total_records}
                    itemsPerPage={20}
                    onPageChange={(p) => fetchReport(p)}
                  />
                </div>
              </>
            ) : (
              /* Empty State */
              <div style={{ padding: '48px', textAlign: 'center' }}>
                <FileSpreadsheet size={42} color="var(--gold)" style={{ opacity: 0.4, margin: '0 auto 12px auto' }} />
                <h4 style={{ color: 'var(--cream)', fontSize: '1rem', margin: '0 0 6px 0' }}>No Records Found</h4>
                <p style={{ color: 'var(--beige)', opacity: 0.6, fontSize: '0.85rem', margin: 0 }}>
                  There are no {reportType.replace('_', ' ')} transactions logged for the selected date range ({startDate} to {endDate}).
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};
