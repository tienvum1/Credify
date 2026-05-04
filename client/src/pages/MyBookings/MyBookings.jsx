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
  const itemsPerPage = 10;

  const dateOptions = [
    { label: 'Tất cả thời gian', value: 'all' },
    { label: 'Hôm nay', value: 'today' },
    { label: '7 ngày qua', value: '7days' },
    { label: '30 ngày qua', value: '30days' },
  ];

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((meRes) => {
        const userId = meRes?.data?.user?.id;
        return api.get('/bookings/my', { params: { customer_id: userId } });
      })
      .then((res) => {
        if (!active) return;
        setBookings(res.data.bookings || []);
        setStats(res.data.stats || null);
      })
      .catch(() => {})
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

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
    if (status === 'created') return <span className="status-tag created">Mới tạo</span>;
    if (status === 'customer_paid') return <span className="status-tag paid">Khách đã thanh toán</span>;
    if (status === 'staff_confirmed' || status === 'completed') return <span className="status-tag completed">Hoàn thành</span>;
    if (status === 'rejected') return <span className="status-tag rejected">Đã từ chối</span>;
    if (status === 'cancelled') return <span className="status-tag cancelled">Đã hủy</span>;
    return <span className="status-tag">{status}</span>;
  };

  const shortCode = (code) => {
    const raw = String(code || '');
    return raw.length <= 6 ? raw : raw.slice(-6);
  };

  const filtered = bookings
    .filter((b) => {
      const matchesSearch = `${b.code} ${b.customer_account_holder || ''}`.toLowerCase().includes(searchTerm.trim().toLowerCase());
      const matchesStatus = statusFilter === 'all' || b.status === statusFilter;
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const bDate = new Date(b.created_at);
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (dateFilter === 'today') {
          matchesDate = bDate >= startOfToday;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
          matchesDate = bDate >= sevenDaysAgo;
        } else if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
          matchesDate = bDate >= thirtyDaysAgo;
        }
      }

      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filtered.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  if (loading) return (
    <div className="my-bookings-loading-container">
      <div className="spinner"></div>
      <p>Đang tải danh sách đơn...</p>
    </div>
  );

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          Trước
        </button>

        {start > 1 && (
          <>
            <button type="button" className="page-btn" onClick={() => handlePageChange(1)}>1</button>
            {start > 2 && <span className="page-ellipsis">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`page-btn ${currentPage === p ? 'active' : ''}`}
            onClick={() => handlePageChange(p)}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="page-ellipsis">...</span>}
            <button type="button" className="page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
          </>
        )}

        <button
          type="button"
          className="page-btn"
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Sau
        </button>
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
              <option value="customer_paid">Đã thanh toán</option>
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
              <span className="value">{formatMoney(stats.total_amount || 0)}</span>
            </div>
          </div>
          <div className="stat-card fee">
            <div className="stat-icon">🏷️</div>
            <div className="stat-info">
              <span className="label">Tổng phí</span>
              <span className="value">{formatMoney(stats.total_fee || 0)}</span>
            </div>
          </div>
          <div className="stat-card completed">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <span className="label">Đã hoàn thành</span>
              <span className="value">{stats.completed_count}</span>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-info">
              <span className="label">Đang xử lý</span>
              <span className="value">{stats.pending_count}</span>
            </div>
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="my-bookings-empty-state">
          <div className="empty-icon">📂</div>
          <p>Bạn chưa có đơn hàng nào.</p>
          <button onClick={() => navigate('/')}>Tạo đơn ngay</button>
        </div>
      ) : (
        <div className="table-container">
          <table className="booking-table">
            <thead>
              <tr>
                <th>Mã đơn</th>
                <th>Thông tin nhận tiền</th>
                <th>Số tiền</th>
                <th>Thời gian</th>
                <th>Trạng thái</th>
                <th className="text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {currentItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">Không tìm thấy đơn nào phù hợp.</td>
                </tr>
              ) : (
                currentItems.map((booking) => (
                  <tr key={booking.id}>
                    <td data-label="Mã đơn">
                      <div className="code-cell">
                        <span className="code-id">#{booking.id}</span>
                        <span className="code-hash">{shortCode(booking.code)}</span>
                      </div>
                    </td>
                    <td data-label="Thông tin nhận tiền">
                      <div className="bank-cell">
                        <span className="bank-name">{booking.customer_bank_name}</span>
                        <span className="account-number">{booking.customer_account_number}</span>
                        <span className="account-holder">{booking.customer_account_holder}</span>
                      </div>
                    </td>
                    <td data-label="Số tiền">
                      <div className="amount-cell">
                        <span className="transfer-amount">{formatMoney(booking.transfer_amount)}</span>
                        <span className="net-amount">Thực nhận: {formatMoney(booking.net_amount)}</span>
                      </div>
                    </td>
                    <td data-label="Thời gian">
                      <div className="time-cell">
                        <span className="time-label">Tạo: {formatDateTime(booking.created_at)}</span>
                        {booking.paid_at && <span className="time-label">Thanh toán: {formatDateTime(booking.paid_at)}</span>}
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      {statusLabel(booking.status)}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="detail-btn"
                        onClick={() => navigate(`/my-bookings/${booking.id}`)}
                      >
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {renderPagination()}
    </div>
  );
};

export default MyBookings;
