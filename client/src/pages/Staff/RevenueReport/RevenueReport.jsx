import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../../api/axios';
import './RevenueReport.scss';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const RevenueReport = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [reportType, setReportType] = useState('day');
  const [data, setData] = useState({
    global:   { summary: {}, total: [], byQr: [], byStaff: [] },
    personal: { summary: {}, total: [], byQr: [] }
  });
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    let tid = null;
    const ro = new ResizeObserver(() => {
      if (tid) clearTimeout(tid);
      tid = setTimeout(() => setChartKey(k => k + 1), 100);
    });
    ro.observe(chartContainerRef.current);
    return () => { ro.disconnect(); if (tid) clearTimeout(tid); };
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/revenue?type=${reportType}`);
        if (active) setData(res.data);
      } catch (err) {
        console.error('Lỗi khi tải báo cáo:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [reportType]);

  const fmt = (amount) => {
    const n = Math.round(Number(amount) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') ;
  };

  const fmtShort = (amount) => {
    const n = Math.round(Number(amount) || 0);
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '—';
    if (reportType === 'year') return dateStr;
    if (reportType === 'month') {
      const [year, month] = dateStr.split('-');
      return `T${month}/${year}`;
    }
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const sectionData = isAdminPath ? data.global : data.personal;
  const summary = sectionData.summary || {};

  const totalRevenue   = Number(summary.total_amount   || 0);
  const totalFee       = Number(summary.total_fee      || 0);
  const totalBaseFee   = Number(summary.total_base_fee || 0);
  const totalProfit    = Number(summary.total_profit   || 0);
  const totalOrders    = Number(summary.completed_count|| 0);
  const periodLabel     = reportType === 'day' ? 'Hôm nay' : reportType === 'month' ? 'Tháng này' : 'Năm nay';
  const fullPeriodLabel = reportType === 'day' ? 'Tháng này' : reportType === 'month' ? 'Năm này' : 'Toàn thời gian';
  const groupLabel      = reportType === 'day' ? 'ngày' : reportType === 'month' ? 'tháng' : 'năm';

  // Tổng cộng cho bảng thời gian
  const totalRow = sectionData.total.reduce((acc, r) => ({
    total_count:      acc.total_count      + Number(r.total_count      || 0),
    completed_count:  acc.completed_count  + Number(r.completed_count  || 0),
    processing_count: acc.processing_count + Number(r.processing_count || 0),
    rejected_count:   acc.rejected_count   + Number(r.rejected_count   || 0),
    cancelled_count:  acc.cancelled_count  + Number(r.cancelled_count  || 0),
    total_amount:     acc.total_amount     + Number(r.total_amount     || 0),
    total_fee:        acc.total_fee        + Number(r.total_fee        || 0),
  }), { total_count:0, completed_count:0, processing_count:0, rejected_count:0, cancelled_count:0, total_amount:0, total_fee:0 });

  const reversedTotal = [...sectionData.total].reverse();

  const chartData = {
    labels: reversedTotal.map(r => fmtDate(r.label)),
    datasets: [
      {
        label: 'Doanh thu (đ)',
        data: reversedTotal.map(r => Number(r.total_amount || 0)),
        backgroundColor: isAdminPath ? 'rgba(99,102,241,0.8)' : 'rgba(16,185,129,0.8)',
        borderRadius: 6,
        barThickness: isAdminPath ? 18 : 28,
      },
      {
        label: 'Phí khách chịu (đ)',
        data: reversedTotal.map(r => Number(r.total_fee || 0)),
        backgroundColor: 'rgba(244,63,94,0.8)',
        borderRadius: 6,
        barThickness: isAdminPath ? 18 : 28,
      },
      ...(isAdminPath ? [
        {
          label: 'Phí gốc (đ)',
          data: reversedTotal.map(r => Number(r.total_base_fee || 0)),
          backgroundColor: 'rgba(234,88,12,0.8)',
          borderRadius: 6,
          barThickness: 18,
        },
        {
          label: 'Lợi nhuận (đ)',
          data: reversedTotal.map(r => Number(r.total_profit || 0)),
          backgroundColor: 'rgba(22,163,74,0.85)',
          borderRadius: 6,
          barThickness: 18,
        },
      ] : []),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 20, font: { size: 12 } },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
            return ` ${ctx.dataset.label}: ${val} đ`;
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: {
          font: { size: 11 },
          color: '#64748b',
          callback: (val) => {
            if (val >= 1_000_000) return (val / 1_000_000).toLocaleString('vi') + 'tr';
            if (val >= 1_000) return (val / 1_000).toLocaleString('vi') + 'k';
            return val;
          },
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 }, color: '#64748b' } },
    },
  };

  return (
    <div className="revenue-report-container full-width">
      {/* Header */}
      <div className="report-header centered">
        <div className="header-top">
          <h1>{isAdminPath ? 'Thống kê hệ thống' : 'Báo cáo doanh thu cá nhân'}</h1>
          <p className="subtitle">{isAdminPath ? 'Toàn cảnh hoạt động kinh doanh' : 'Theo dõi và phân tích hiệu suất'}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loader-ring" />
          <p>Đang tổng hợp dữ liệu...</p>
        </div>
      ) : (
        <div className="report-content-animate">

          {/* Period filter */}
          <div className="filter-container-row">
            <div className="period-filter">
              {['day','month','year'].map(t => (
                <button key={t} className={reportType === t ? 'active' : ''} onClick={() => setReportType(t)}>
                  {t === 'day' ? 'Ngày' : t === 'month' ? 'Tháng' : 'Năm'}
                </button>
              ))}
            </div>
          </div>

          {/* Summary cards */}
          <div className="stats-summary">
            <div className="stat-card revenue">
              <div className="stat-info">
                <span className="label">Tổng doanh thu ({periodLabel})</span>
                <p className="value">{fmtShort(totalRevenue)} <small>đ</small></p>
              </div>
            </div>
            <div className="stat-card fee">
              <div className="stat-info">
                <span className="label">Tổng phí khách chịu ({periodLabel})</span>
                <p className="value">{fmtShort(totalFee)} <small>đ</small></p>
              </div>
            </div>
            {isAdminPath && (
              <div className="stat-card base-fee">
                <div className="stat-info">
                  <span className="label">Tổng phí gốc ({periodLabel})</span>
                  <p className="value">{fmtShort(totalBaseFee)} <small>đ</small></p>
                </div>
              </div>
            )}
            {isAdminPath && (
              <div className="stat-card profit">
                <div className="stat-info">
                  <span className="label">Lợi nhuận ({periodLabel})</span>
                  <p className="value">{fmtShort(totalProfit)} <small>đ</small></p>
                </div>
              </div>
            )}
            <div className="stat-card orders">
              <div className="stat-info">
                <span className="label">Đơn hoàn thành ({periodLabel})</span>
                <p className="value">{totalOrders.toLocaleString()} <small>đơn</small></p>
              </div>
            </div>
          </div>

          {/* Bảng thống kê theo thời gian */}
          <div className="table-card period-stats-table">
            <div className="card-header">
              <div className="header-left">
                <h3>Thống kê theo {groupLabel} ({fullPeriodLabel})</h3>
                <p>Chi tiết đơn hàng và doanh thu từng {groupLabel}</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th className="text-center">Tổng đơn</th>
                    <th className="text-center text-success">Hoàn thành</th>
                    <th className="text-center text-warning">Đang xử lý</th>
                    <th className="text-center text-danger">Từ chối</th>
                    <th className="text-center text-muted">Đã hủy</th>
                    <th className="text-right text-revenue">Doanh thu</th>
                    <th className="text-right text-fee">Phí khách</th>
                    {isAdminPath && <th className="text-right" style={{color:'#ea580c'}}>Phí gốc</th>}
                    {isAdminPath && <th className="text-right" style={{color:'#16a34a'}}>Lợi nhuận</th>}
                  </tr>
                </thead>
                <tbody>
                  {sectionData.total.length === 0 ? (
                    <tr><td colSpan={8} className="empty-state">Chưa có dữ liệu trong kỳ này</td></tr>
                  ) : sectionData.total.map((item, idx) => (
                    <tr key={idx}>
                      <td><strong>{fmtDate(item.label)}</strong></td>
                      <td className="text-center">{Number(item.total_count).toLocaleString()}</td>
                      <td className="text-center text-success">{Number(item.completed_count).toLocaleString()}</td>
                      <td className="text-center text-warning">{Number(item.processing_count).toLocaleString()}</td>
                      <td className="text-center text-danger">{Number(item.rejected_count).toLocaleString()}</td>
                      <td className="text-center text-muted">{Number(item.cancelled_count).toLocaleString()}</td>
                      <td className="text-right text-revenue font-bold">{fmt(item.total_amount)}</td>
                      <td className="text-right text-fee">{fmt(item.total_fee)}</td>
                      {isAdminPath && <td className="text-right" style={{color:'#ea580c'}}>{fmt(item.total_base_fee)}</td>}
                      {isAdminPath && <td className="text-right" style={{color:'#16a34a', fontWeight:700}}>{fmt(item.total_profit)}</td>}
                    </tr>
                  ))}
                </tbody>
                {sectionData.total.length > 0 && (
                  <tfoot>
                    <tr className="total-row">
                      <td><strong>Tổng cộng</strong></td>
                      <td className="text-center"><strong>{totalRow.total_count.toLocaleString()}</strong></td>
                      <td className="text-center text-success"><strong>{totalRow.completed_count.toLocaleString()}</strong></td>
                      <td className="text-center text-warning"><strong>{totalRow.processing_count.toLocaleString()}</strong></td>
                      <td className="text-center text-danger"><strong>{totalRow.rejected_count.toLocaleString()}</strong></td>
                      <td className="text-center text-muted"><strong>{totalRow.cancelled_count.toLocaleString()}</strong></td>
                      <td className="text-right text-revenue"><strong>{fmt(totalRow.total_amount)}</strong></td>
                      <td className="text-right text-fee"><strong>{fmt(totalRow.total_fee)}</strong></td>
                      {isAdminPath && <td className="text-right" style={{color:'#ea580c'}}><strong>{fmt(sectionData.total.reduce((a,r)=>a+Number(r.total_base_fee||0),0))}</strong></td>}
                      {isAdminPath && <td className="text-right" style={{color:'#16a34a'}}><strong>{fmt(sectionData.total.reduce((a,r)=>a+Number(r.total_profit||0),0))}</strong></td>}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Biểu đồ */}
          <div className="charts-grid full-width-chart">
            <div className="chart-card main-chart">
              <div className="card-header">
                <h3>Biểu đồ doanh thu ({fullPeriodLabel})</h3>
                <p>Thống kê theo {groupLabel}</p>
              </div>
              <div className="chart-container" ref={chartContainerRef}>
                <Bar key={chartKey} options={chartOptions} data={chartData} />
              </div>
            </div>
          </div>

          {/* Bảng theo nhân viên (chỉ admin) */}
          {isAdminPath && sectionData.byStaff && sectionData.byStaff.length > 0 && (
            <div className="table-card staff-revenue-table">
              <div className="card-header">
                <div className="header-left">
                  <h3>Chi tiết theo nhân viên ({fullPeriodLabel})</h3>
                  <p>Hiệu suất từng nhân viên trong kỳ</p>
                </div>
              </div>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Nhân viên</th>
                      <th className="text-center">Tổng đơn</th>
                      <th className="text-center text-success">Hoàn thành</th>
                      <th className="text-center text-danger">Hủy/Từ chối</th>
                      <th className="text-right text-revenue">Doanh thu</th>
                      <th className="text-right text-fee">Phí khách</th>
                      <th className="text-right" style={{color:'#ea580c'}}>Phí gốc</th>
                      <th className="text-right" style={{color:'#16a34a'}}>Lợi nhuận</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sectionData.byStaff.map((s, idx) => (
                      <tr key={idx}>
                        <td><strong>{fmtDate(s.label)}</strong></td>
                        <td>
                          <div className="staff-info-cell">
                            <strong>{s.staff_name}</strong>
                            <small>ID: #{s.staff_id}</small>
                          </div>
                        </td>
                        <td className="text-center">{Number(s.total_count).toLocaleString()}</td>
                        <td className="text-center text-success">{Number(s.completed_count).toLocaleString()}</td>
                        <td className="text-center text-danger">{(Number(s.cancelled_count) + Number(s.rejected_count)).toLocaleString()}</td>
                        <td className="text-right text-revenue font-bold">{fmt(s.total_amount)}</td>
                        <td className="text-right text-fee">{fmt(s.total_fee)}</td>
                        <td className="text-right" style={{color:'#ea580c'}}>{fmt(s.total_base_fee)}</td>
                        <td className="text-right" style={{color:'#16a34a', fontWeight:700}}>{fmt(s.total_profit)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Bảng theo QR */}
          <div className="table-card">
            <div className="card-header">
              <div className="header-left">
                <h3>Chi tiết theo QR ({fullPeriodLabel})</h3>
                <p>Hiệu suất từng thẻ QR trong kỳ</p>
              </div>
              {sectionData.byQr.length > 0 && (
                <div className="top-performer">
                  <span className="label">Hiệu quả nhất:</span>
                  <span className="value">{sectionData.byQr[0].qr_name || `QR #${sectionData.byQr[0].qr_id}`}</span>
                </div>
              )}
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Thẻ QR</th>
                    <th className="text-center">Tổng đơn</th>
                    <th className="text-center text-success">Hoàn thành</th>
                    <th className="text-center text-danger">Hủy/Từ chối</th>
                    <th className="text-right text-revenue">Doanh thu</th>
                    <th className="text-right text-fee">Phí khách</th>
                    {isAdminPath && <th className="text-right" style={{color:'#ea580c'}}>Phí gốc</th>}
                    {isAdminPath && <th className="text-right" style={{color:'#16a34a'}}>Lợi nhuận</th>}
                  </tr>
                </thead>
                <tbody>
                  {sectionData.byQr.length === 0 ? (
                    <tr><td colSpan={isAdminPath ? 9 : 7} className="empty-state">Chưa có dữ liệu giao dịch trong kỳ này</td></tr>
                  ) : sectionData.byQr.map((qr, idx) => (
                    <tr key={idx}>
                      <td><strong>{fmtDate(qr.label)}</strong></td>
                      <td>
                        <div className="qr-id-cell">
                          <span className="dot" />
                          <div>
                            <strong>{qr.qr_name || `QR #${qr.qr_id}`}</strong>
                            <small>ID: #{qr.qr_id}</small>
                          </div>
                        </div>
                      </td>
                      <td className="text-center">{Number(qr.total_count).toLocaleString()}</td>
                      <td className="text-center text-success">{Number(qr.completed_count).toLocaleString()}</td>
                      <td className="text-center text-danger">{(Number(qr.cancelled_count) + Number(qr.rejected_count)).toLocaleString()}</td>
                      <td className="text-right text-revenue font-bold">{fmt(qr.total_amount)}</td>
                      <td className="text-right text-fee">{fmt(qr.total_fee)}</td>
                      {isAdminPath && <td className="text-right" style={{color:'#ea580c'}}>{fmt(qr.total_base_fee)}</td>}
                      {isAdminPath && <td className="text-right" style={{color:'#16a34a', fontWeight:700}}>{fmt(qr.total_profit)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default RevenueReport;
