import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import api from '../../../api/axios';
import './RevenueReport.scss';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const RevenueReport = () => {
  const location = useLocation();
  const isAdminPath = location.pathname.startsWith('/admin');
  const [activeTab] = useState(isAdminPath ? 'global' : 'personal'); // 'personal' or 'global'
  const [reportType, setReportType] = useState('day'); // day, month, year
  const [data, setData] = useState({ 
    global: { summary: {}, total: [], byQr: [], byStaff: [] }, 
    personal: { summary: {}, total: [], byQr: [] } 
  });
  const [loading, setLoading] = useState(true);
  const chartContainerRef = useRef(null);
  const [chartKey, setChartKey] = useState(0);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    let timeoutId = null;
    const resizeObserver = new ResizeObserver(() => {
      // Debounce để tránh re-render quá nhiều trong lúc transition
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setChartKey(prev => prev + 1);
      }, 100);
    });

    resizeObserver.observe(chartContainerRef.current);
    return () => {
      resizeObserver.disconnect();
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/revenue?type=${reportType}`);
        if (isMounted) {
          setData(res.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải báo cáo:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, [reportType]);

  const formatCurrency = (amount) => {
    const n = Math.round(Number(amount));
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '—';
    if (reportType === 'year') return dateStr;
    if (reportType === 'month') {
      const [year, month] = dateStr.split('-');
      return `${month}/${year}`;
    }
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'bottom', 
        labels: { 
          usePointStyle: true, 
          padding: 20,
          boxWidth: 8,
          boxHeight: 8,
          font: { size: 12, family: "'Plus Jakarta Sans', sans-serif" } 
        } 
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9', drawBorder: false },
        ticks: { font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }, color: '#64748b' }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 11, family: "'Plus Jakarta Sans', sans-serif" }, color: '#64748b' }
      }
    }
  };

  const renderContent = () => {
    const sectionData = activeTab === 'global' ? data.global : data.personal;
    const isGlobal = activeTab === 'global';
    const summary = sectionData.summary || { total_amount: 0, total_fee: 0, completed_count: 0 };

    const totalRevenue = Number(summary.total_amount);
    const totalFee = Number(summary.total_fee);
    const totalOrders = Number(summary.completed_count);
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const topQr = sectionData.byQr.length > 0 ? sectionData.byQr[0] : null;

    const chartData = {
      labels: sectionData.total.map(item => item.label).reverse(),
      datasets: [
        {
          label: 'Doanh thu',
          data: sectionData.total.map(item => item.total_amount).reverse(),
          backgroundColor: isGlobal ? 'rgba(99, 102, 241, 0.8)' : 'rgba(16, 185, 129, 0.8)',
          borderRadius: 8,
          barThickness: 30,
        },
        {
          label: 'Phí thu',
          data: sectionData.total.map(item => item.total_fee).reverse(),
          backgroundColor: 'rgba(244, 63, 94, 0.8)',
          borderRadius: 8,
          barThickness: 30,
        }
      ],
    };

    const periodLabel = reportType === 'day' ? 'Hôm nay' : reportType === 'month' ? 'Tháng này' : 'Năm nay';
    const fullPeriodLabel = reportType === 'day' ? 'Tháng này' : reportType === 'month' ? 'Năm này' : 'Toàn thời gian';

    return (
      <div className="report-content-animate">
        <div className="filter-container-row">
          <div className="period-filter">
            <button className={reportType === 'day' ? 'active' : ''} onClick={() => setReportType('day')}>Ngày</button>
            <button className={reportType === 'month' ? 'active' : ''} onClick={() => setReportType('month')}>Tháng</button>
            <button className={reportType === 'year' ? 'active' : ''} onClick={() => setReportType('year')}>Năm</button>
          </div>
        </div>

        <div className="stats-summary">
          <div className="stat-card revenue">
            <div className="stat-info">
              <span className="label">Tổng doanh thu ({periodLabel})</span>
              <p className="value">{formatCurrency(totalRevenue)}</p>
            </div>

          </div>
          <div className="stat-card fee">
            <div className="stat-info">
              <span className="label">Tổng phí thu về ({periodLabel})</span>
              <p className="value">{formatCurrency(totalFee)}</p>
            </div>
          
          </div>
          <div className="stat-card orders">
            <div className="stat-info">
              <span className="label">Đơn hoàn thành ({periodLabel})</span>
              <p className="value">{totalOrders.toLocaleString()} <small>đơn</small></p>
            </div>

          </div>
          <div className="stat-card avg">
            <div className="stat-info">
              <span className="label">Doanh thu TB/đơn ({periodLabel})</span>
              <p className="value">{formatCurrency(avgOrder)}</p>
            </div>

          </div>
        </div>

        {/* Bảng thống kê chi tiết theo thời gian */}
        <div className="table-card period-stats-table">
          <div className="card-header">
            <div className="header-left">
              <h3>Thống kê hiệu suất chi tiết ({fullPeriodLabel})</h3>
              <p>Danh sách các đơn hàng và doanh thu theo {reportType === 'day' ? 'ngày trong tháng' : reportType === 'month' ? 'tháng trong năm' : 'năm'}</p>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tổng đơn</th>
                  <th>Thành công</th>
                  <th>Đang xử lý</th>
                  <th>Bị từ chối</th>
                  <th>Đã hủy</th>
                  <th>Doanh thu</th>
                  <th>Phí thu</th>
                </tr>
              </thead>
              <tbody>
                {sectionData.total.map((item, idx) => (
                  <tr key={idx}>
                    <td data-label="Thời gian"><strong>{formatDateDisplay(item.label)}</strong></td>
                    <td data-label="Tổng đơn">{item.total_count.toLocaleString()}</td>
                    <td data-label="Thành công" className="text-success">{item.completed_count.toLocaleString()}</td>
                    <td data-label="Đang xử lý" className="text-warning">{item.processing_count.toLocaleString()}</td>
                    <td data-label="Bị từ chối" className="text-danger">{item.rejected_count.toLocaleString()}</td>
                    <td data-label="Đã hủy" className="text-muted">{item.cancelled_count.toLocaleString()}</td>
                    <td data-label="Doanh thu" className="text-revenue font-bold">{formatCurrency(item.total_amount)}</td>
                    <td data-label="Phí thu" className="text-fee">{formatCurrency(item.total_fee)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="charts-grid full-width-chart">
          <div className="chart-card main-chart">
            <div className="card-header">
              <h3>Biểu đồ tăng trưởng doanh thu ({fullPeriodLabel})</h3>
              <p>Thống kê theo {reportType === 'day' ? 'ngày' : reportType === 'month' ? 'tháng' : 'năm'}</p>
            </div>
            <div className="chart-container" ref={chartContainerRef}>
              <Bar key={chartKey} options={options} data={chartData} />
            </div>
          </div>
        </div>

        {/* Bảng chi tiết theo từng Nhân viên được đưa lên trước bảng QR */}
        {isGlobal && sectionData.byStaff && sectionData.byStaff.length > 0 && (
          <div className="table-card staff-revenue-table">
            <div className="card-header">
              <div className="header-left">
                <h3>Bảng chi tiết theo từng Nhân viên ({fullPeriodLabel})</h3>
                <p>Danh sách tổng hợp hiệu suất của các nhân viên trong kỳ</p>
              </div>
            </div>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Thời gian</th>
                    <th>Nhân viên</th>
                    <th>Tổng đơn</th>
                    <th>Thành công</th>
                    <th>Hủy/Từ chối</th>
                    <th>Doanh thu</th>
                    <th>Phí thu</th>
                  </tr>
                </thead>
                <tbody>
                  {sectionData.byStaff.map((staff, idx) => (
                    <tr key={idx}>
                      <td data-label="Thời gian"><strong>{formatDateDisplay(staff.label)}</strong></td>
                      <td data-label="Nhân viên">
                        <div className="staff-info-cell">
                          <strong>{staff.staff_name}</strong>
                          <small>ID: #{staff.staff_id}</small>
                        </div>
                      </td>
                      <td data-label="Tổng đơn">{staff.total_count.toLocaleString()}</td>
                      <td data-label="Thành công" className="text-success">{staff.completed_count.toLocaleString()}</td>
                      <td data-label="Hủy/Từ chối" className="text-danger">{(staff.cancelled_count + staff.rejected_count).toLocaleString()}</td>
                      <td data-label="Doanh thu" className="text-revenue font-bold">
                        <div>{formatCurrency(staff.total_amount)}</div>
                      </td>
                      <td data-label="Phí thu" className="text-fee">
                        <div>{formatCurrency(staff.total_fee)}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="table-card">
          <div className="card-header">
            <div className="header-left">
              <h3>Bảng chi tiết theo từng QR ({fullPeriodLabel})</h3>
              <p>Danh sách tổng hợp hiệu suất của các thẻ QR trong kỳ</p>
            </div>
            {topQr && (
              <div className="top-performer">
                <span className="label">Hiệu quả nhất:</span>
                <span className="value">QR #{topQr.qr_id}</span>
              </div>
            )}
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Mã Thẻ QR</th>
                  <th>Tổng đơn</th>
                  <th>Thành công</th>
                  <th>Hủy/Từ chối</th>
                  <th>Doanh thu</th>
                  <th>Phí thu</th>
                </tr>
              </thead>
              <tbody>
                {sectionData.byQr.map((qr, idx) => (
                  <tr key={idx}>
                    <td data-label="Thời gian"><strong>{formatDateDisplay(qr.label)}</strong></td>
                    <td data-label="Mã Thẻ QR">
                      <div className="qr-id-cell">
                        <span className="dot"></span>
                        <strong>QR #{qr.qr_id}</strong>
                      </div>
                    </td>
                    <td data-label="Tổng đơn">{qr.total_count.toLocaleString()}</td>
                    <td data-label="Thành công" className="text-success">{qr.completed_count.toLocaleString()}</td>
                    <td data-label="Hủy/Từ chối" className="text-danger">{(qr.cancelled_count + qr.rejected_count).toLocaleString()}</td>
                    <td data-label="Doanh thu" className="text-revenue font-bold">
                      <div>{formatCurrency(qr.total_amount)}</div>
                    </td>
                    <td data-label="Phí thu" className="text-fee">
                      <div>{formatCurrency(qr.total_fee)}</div>
                    </td>
                  </tr>
                ))}
                {sectionData.byQr.length === 0 && (
                  <tr><td colSpan="7" className="empty-state">Chưa có dữ liệu giao dịch trong kỳ này</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="revenue-report-container full-width">
      <div className="report-header centered">
        <div className="header-top">
          <h1>{isAdminPath ? 'Thống kê hệ thống' : 'Báo cáo doanh thu'}</h1>
          <p className="subtitle">{isAdminPath ? 'Toàn cảnh hoạt động kinh doanh' : 'Theo dõi và phân tích hiệu suất kinh doanh'}</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loader-ring"></div>
          <p>Đang tổng hợp dữ liệu...</p>
        </div>
      ) : renderContent()}
    </div>
  );
};

export default RevenueReport;
