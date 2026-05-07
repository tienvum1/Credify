import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { 
  Search, Eye, CheckCircle, Clock, 
  AlertCircle, ChevronLeft, ChevronRight
} from 'lucide-react';
import { toast } from 'react-toastify';
import './AccountantBookingManager.scss';

const AccountantBookingManager = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending_count: 0,
    completed_count: 0,
    total_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('all');
  
  // Phân trang
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);
  
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/bookings/accountant/list?search=${search}&status=${statusFilter}&dateRange=${dateRange}&page=${page}&limit=${limit}`);
      
      // Parse JSON proof urls for all bookings
      const processedData = res.data.data.map(b => {
        let urls = [];
        try {
          if (b.accountant_paid_proof_urls) {
            urls = typeof b.accountant_paid_proof_urls === 'string' 
              ? JSON.parse(b.accountant_paid_proof_urls) 
              : b.accountant_paid_proof_urls;
          } else if (b.accountant_paid_proof_url) {
            urls = [b.accountant_paid_proof_url];
          }
        } catch (error) {
          console.error('Lỗi parse proof urls:', error);
          urls = b.accountant_paid_proof_url ? [b.accountant_paid_proof_url] : [];
        }
        return { ...b, proof_urls: urls };
      });

      setBookings(processedData);
      setStats(res.data.stats);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateRange, page, limit]);

  useEffect(() => {
    const init = async () => {
      await fetchBookings();
    };
    init();
  }, [fetchBookings]);

  // Reset page khi filter thay đổi
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleDateRangeChange = (e) => {
    setDateRange(e.target.value);
    setPage(1);
  };

  const formatMoney = (amount) => {
    return Number(amount).toLocaleString('vi-VN') + 'đ';
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'staff_confirmed':
        return <span className="badge-warning"><Clock size={12} /> Chờ chuyển tiền</span>;
      case 'customer_paid':
        return <span className="badge-warning"><CheckCircle size={12} /> Chờ chuyển tiền</span>;
      case 'accountant_paid':
        return <span className="badge-success"><CheckCircle size={12} /> Đã chuyển tiền</span>;
      default:
        return <span className="badge-default">{status}</span>;
    }
  };

  return (
    <div className="accountant-manager-wrapper">
      <div className="dashboard-header">
        <div className="header-title">
          <h1>Quản lý Thanh toán (Kế toán)</h1>
          <p>Danh sách các đơn hàng cần kế toán chuyển tiền cho khách</p>
        </div>
        
        <div className="header-actions">
          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo mã đơn, tên admin..." 
              value={search}
              onChange={handleSearchChange}
            />
          </div>
          
          <select value={statusFilter} onChange={handleStatusChange}>
            <option value="">Tất cả trạng thái</option>
            <option value="staff_confirmed">Chờ thanh toán</option>
            <option value="accountant_paid">Đã hoàn thành</option>
          </select>

          <select value={dateRange} onChange={handleDateRangeChange}>
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày qua</option>
            <option value="30days">30 ngày qua</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon">📊</div>
          <div className="stat-info">
            <span className="label">Tổng đơn</span>
            <span className="value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <span className="label">Chờ thanh toán</span>
            <span className="value">{stats.pending_count}</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <span className="label">Đã thanh toán</span>
            <span className="value">{stats.completed_count}</span>
          </div>
        </div>
        <div className="stat-card amount">
          <div className="stat-icon">💰</div>
          <div className="stat-info">
            <span className="label">Tổng tiền đã chuyển</span>
            <span className="value">{formatMoney(stats.total_amount)}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <>
          <div className="bookings-content">
            {/* Desktop Table */}
            <div className="excel-table-container desktop-only">
              <table className="excel-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Số tiền gốc</th>
                    <th>Thông tin Admin (Nguồn tiền)</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th>Xác nhận</th>
                    <th className="actions-col">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-row">
                        <div className="empty-state">
                          <AlertCircle size={32} />
                          <p>Không có đơn hàng nào cần xử lý</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    bookings.map(b => (
                      <tr key={b.id}>
                        <td className="mono">#{b.code.slice(-8).toUpperCase()}</td>
                        <td className="amount-cell">{formatMoney(b.transfer_amount)}</td>
                        <td>
                          <div className="admin-info-cell">
                            <div className="holder">{b.admin_account_holder || 'Chưa có'}</div>
                            <div className="bank">{b.admin_bank_name} - {b.admin_account_number}</div>
                          </div>
                        </td>
                        <td>{new Date(b.created_at).toLocaleString('vi-VN')}</td>
                        <td>{getStatusBadge(b.status)}</td>
                        <td>
                          {b.is_valid === 'yes' ? (
                            <span className="valid-badge yes">✓ Hợp lệ</span>
                          ) : b.is_valid === 'no' ? (
                            <span className="valid-badge no">✗ Không hợp lệ</span>
                          ) : (
                            <span className="valid-badge none">—</span>
                          )}
                        </td>
                        <td className="actions-col">
                          <button className="detail-btn" onClick={() => navigate(`/accountant/bookings/${b.id}`)}>
                            <Eye size={16} /> Chi tiết
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="mobile-cards-view mobile-only">
              {bookings.length === 0 ? (
                <div className="empty-state">
                  <AlertCircle size={32} />
                  <p>Không có đơn hàng nào cần xử lý</p>
                </div>
              ) : (
                bookings.map(b => (
                  <div key={b.id} className="booking-mobile-card">
                    <div className="card-top">
                      <span className="code">#{b.code.slice(-8).toUpperCase()}</span>
                      {getStatusBadge(b.status)}
                    </div>
                    <div className="card-row">
                      <span className="label">Số tiền:</span>
                      <span className="value amount">{formatMoney(b.transfer_amount)}</span>
                    </div>
                    <div className="card-row admin-box">
                      <div className="label">Nguồn tiền Admin:</div>
                      <div className="admin-detail">
                        <div className="holder">{b.admin_account_holder}</div>
                        <div className="bank">{b.admin_bank_name} - {b.admin_account_number}</div>
                      </div>
                    </div>
                    <div className="card-row">
                      <span className="label">Thời gian:</span>
                      <span className="value">{new Date(b.created_at).toLocaleString('vi-VN')}</span>
                    </div>

                    <button className="mobile-detail-btn" onClick={() => navigate(`/accountant/bookings/${b.id}`)}>
                      <Eye size={18} /> Xem chi tiết đơn hàng
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="pagination-container">
              <button 
                disabled={page === 1} 
                onClick={() => setPage(p => p - 1)}
                className="pagination-btn"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="page-info">
                Trang <strong>{page}</strong> / {totalPages}
              </div>
              
              <button 
                disabled={page === totalPages} 
                onClick={() => setPage(p => p + 1)}
                className="pagination-btn"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AccountantBookingManager;
