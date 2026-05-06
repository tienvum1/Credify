import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './MyBookings.scss';

const MyBookings = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 10;

  const dateOptions = [
    { label: 'Tất cả thời gian', value: 'all' },
    { label: 'Hôm nay', value: 'today' },
    { label: '7 ngày qua', value: '7days' },
    { label: '30 ngày qua', value: '30days' },
  ];

  useEffect(() => {
    let active = true;

    const loadData = async () => {
      setLoading(true);
      try {
        const res = await api.get('/bookings/my', {
          params: {
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm.trim() || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
            dateRange: dateFilter === 'all' ? undefined : dateFilter
          }
        });

        if (active) {
          setBookings(res.data.bookings || []);
          setStats(res.data.stats || null);
          setTotalPages(res.data.totalPages || 0);
        }
      } catch (err) {
        console.error('Lỗi khi tải đơn hàng của tôi:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [currentPage, searchTerm, statusFilter, dateFilter]);

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  };
 
  const statusLabel = (status) => {
    if (status === 'created') return <span className="status-text created">Mới tạo</span>;
    if (status === 'customer_paid') return <span className="status-text paid">Đang xử lý</span>;
    if (status === 'staff_confirmed' || status === 'completed') return <span className="status-text completed">Hoàn thành</span>;
    if (status === 'rejected') return <span className="status-text rejected">Đã từ chối</span>;
    if (status === 'cancelled') return <span className="status-text cancelled">Đã hủy</span>;
    return <span className="status-text">{status}</span>;
  };

  const shortCode = (code) => {
    const raw = String(code || '');
    return raw.length <= 6 ? raw : raw.slice(-6);
  };

  const handlePageChange = (pageNumber) => {
    if (pageNumber === currentPage) return;
    setLoading(true);
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  const renderSkeleton = () => (
    <div className="loading-skeleton">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="skeleton-item"></div>
      ))}
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);

    return (
      <div className="pagination">
        <button type="button" className="page-btn" disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)}>Trước</button>
        {start > 1 && (
          <>
            <button type="button" className="page-btn" onClick={() => handlePageChange(1)}>1</button>
            {start > 2 && <span className="page-ellipsis">...</span>}
          </>
        )}
        {pages.map((p) => (
          <button key={p} type="button" className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>
        ))}
        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="page-ellipsis">...</span>}
            <button type="button" className="page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
          </>
        )}
        <button type="button" className="page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
      </div>
    );
  };

  return (
    <div className="my-bookings-page full-width">
      <div className="my-bookings-header">
        <div className="header-title">
          <h1>Đơn của tôi</h1>
          <p>Quản lý và theo dõi lịch sử giao dịch của bạn</p>
        </div>

        <div className="header-controls">
          <div className="search">
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo mã đơn..."
            />
          </div>

          <div className="filters-group">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="created">Tạo đơn</option>
              <option value="customer_paid">Đang xử lý</option>
              <option value="staff_confirmed">Đã hoàn thành</option>
              <option value="rejected">Từ chối</option>
              <option value="cancelled">Đã hủy</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
            >
              {dateOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {stats && (
        <div className="stats-grid">
          <div className="stat-card total">
            <div className="stat-icon">📊</div>
            <div className="stat-info">
              <span className="label">Tổng số đơn</span>
              <span className="value">{stats.total}</span>
            </div>
          </div>
          <div className="stat-card amount">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <span className="label">Tổng tiền giao dịch</span>
              <span className="value">{formatMoney(stats.total_amount)}</span>
            </div>
          </div>
          <div className="stat-card fee">
            <div className="stat-icon">📉</div>
            <div className="stat-info">
              <span className="label">Tổng phí dịch vụ</span>
              <span className="value">{formatMoney(stats.total_fee)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="table-container">
        <table className="booking-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã đơn</th>
              <th>Thời gian</th>
              <th>Số tiền</th>
              <th>Phí</th>
              <th>Thực nhận</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8}>
                  {renderSkeleton()}
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={8} className="empty">Không tìm thấy đơn hàng nào.</td></tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td data-label="ID">#{b.id}</td>
                  <td data-label="Mã đơn"><strong>{shortCode(b.code)}</strong></td>
                  <td data-label="Thời gian">{formatDateTime(b.created_at)}</td>
                  <td data-label="Số tiền">{formatMoney(b.transfer_amount)}</td>
                  <td data-label="Phí">{formatMoney(b.fee_amount)}</td>
                  <td data-label="Thực nhận"><strong style={{ color: '#10b981' }}>{formatMoney(b.net_amount)}</strong></td>
                  <td data-label="Trạng thái">{statusLabel(b.status)}</td>
                  <td data-label="Thao tác">
                    <button className="detail-btn" onClick={() => navigate(`/my-bookings/${b.id}`)}>
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </div>
  );
};

export default MyBookings;
