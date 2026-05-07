import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Clock, CheckCircle2,
  XCircle, UserPlus,  Search, Trash2,
  Check, X
} from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import './AdminBookingManager.scss';

const AdminBookingManager = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending_claim: 0,
    processing: 0,
    completed: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [validFilter, setValidFilter] = useState('all');
  const [processingFilter, setProcessingFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    bookingId: null,
    shortCode: ''
  });

  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    bookingId: null,
    shortCode: ''
  });

  const dateOptions = [
    { label: 'Tất cả thời gian', value: 'all' },
    { label: 'Hôm nay', value: 'today' },
    { label: '7 ngày qua', value: '7days' },
    { label: '30 ngày qua', value: '30days' },
  ];

  const fetchStats = async () => {
    try {
      const res = await api.get('/bookings/staff/stats'); // Sử dụng chung API stats của staff
      setStats(res.data);
    } catch (err) {
      console.error('Lỗi lấy thống kê:', err);
    }
  };

  const fetchBookings = async () => {
    try {
      // Admin lấy toàn bộ đơn hàng (sử dụng API của staff nhưng với quyền admin)
      const res = await api.get('/bookings/staff', { 
        params: {
          status: statusFilter === 'all' ? undefined : statusFilter,
          limit: 1000 // Lấy số lượng lớn để filter client-side như logic cũ của Admin
        }
      });
      // API trả về { data: [], total: ... }
      setBookings(Array.isArray(res.data.data) ? res.data.data : []);
    } catch (err) {
      console.error('Lỗi lấy danh sách đơn:', err);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchBookings()]);
      setLoading(false);
    };
    loadData();
  }, [statusFilter]);

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
    if (status === 'created') return 'Mới tạo';
    if (status === 'customer_paid') return 'Đang xử lý';
    if (status === 'staff_confirmed' || status === 'completed' || status === 'accountant_paid') return 'Hoàn thành';
    if (status === 'rejected') return 'Đã từ chối';
    if (status === 'cancelled') return 'Đã hủy';
    return status;
  };

  const shortCode = (code) => {
    const raw = String(code || '');
    return raw.length <= 6 ? raw : raw.slice(-6);
  };

  const filtered = (Array.isArray(bookings) ? bookings : [])
    .filter((b) => {
      if (!b) return false;
      const key = `${b.code || ''} ${b.customer_name || ''} ${b.customer_email || ''}`.toLowerCase();
      const matchesSearch = key.includes((searchTerm || '').trim().toLowerCase());
      
      let matchesDate = true;
      if (dateFilter !== 'all') {
        const bDate = new Date(b.created_at);
        const now = new Date();
        
        // Chuyển đổi sang ngày theo múi giờ VN (YYYY-MM-DD)
        const toVNTS = (d) => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        const bDateStr = toVNTS(bDate);
        const todayStr = toVNTS(now);
        
        if (dateFilter === 'today') {
          matchesDate = bDateStr === todayStr;
        } else if (dateFilter === '7days') {
          const sevenDaysAgo = new Date(now);
          sevenDaysAgo.setDate(now.getDate() - 7);
          matchesDate = bDate >= sevenDaysAgo;
        } else if (dateFilter === '30days') {
          const thirtyDaysAgo = new Date(now);
          thirtyDaysAgo.setDate(now.getDate() - 30);
          matchesDate = bDate >= thirtyDaysAgo;
        }
      }

      let matchesValid = true;
      if (validFilter !== 'all') {
        if (validFilter === 'yes') matchesValid = b.is_valid === 'yes';
        else if (validFilter === 'no') matchesValid = b.is_valid === 'no';
        else if (validFilter === 'null') matchesValid = b.is_valid === null;
      }

      let matchesProcessing = true;
      if (processingFilter !== 'all') {
        if (processingFilter === 'unclaimed') {
          matchesProcessing = !b.staff_id;
        } else if (processingFilter === 'processing') {
          matchesProcessing = b.staff_id && b.status === 'customer_paid';
        } else if (processingFilter === 'processed') {
          matchesProcessing = b.staff_id && ['staff_confirmed', 'completed', 'rejected'].includes(b.status);
        }
      }

      return matchesSearch && matchesDate && matchesValid && matchesProcessing;
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

  const handleClaim = async (id) => {
    try {
      await api.patch(`/bookings/${id}/claim`);
      toast.success('Đã nhận xử lý đơn hàng');
      setConfirmModal({ isOpen: false, bookingId: null, shortCode: '' });
      navigate(`/admin/bookings/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi nhận đơn');
    }
  };

  const handleDeleteBooking = async () => {
    const id = deleteModal.bookingId;
    try {
      await api.delete(`/admin/bookings/${id}`);
      toast.success('Đã xóa đơn hàng thành công');
      setDeleteModal({ isOpen: false, bookingId: null, shortCode: '' });
      // Refresh data
      fetchStats();
      fetchBookings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa đơn hàng');
    }
  };

  if (loading) return <div className="loading">Đang tải dữ liệu hệ thống...</div>;

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
    <div className="admin-booking-page">
      {/* Dashboard Section */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon"><BarChart3 size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng đơn hệ thống</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><UserPlus size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Đơn chưa nhận</span>
            <span className="stat-value">{stats.pending_claim}</span>
          </div>
        </div>
        <div className="stat-card processing">
          <div className="stat-icon"><Clock size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Đang xử lý</span>
            <span className="stat-value">{stats.processing}</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon"><CheckCircle2 size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Đã hoàn thành</span>
            <span className="stat-value">{stats.completed}</span>
          </div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon"><XCircle size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Bị từ chối</span>
            <span className="stat-value">{stats.rejected}</span>
          </div>
        </div>
      </div>

      <div className="booking-toolbar">
        <div className="booking-title">
          <h1>Quản lý đơn hàng toàn hệ thống</h1>
          <p>Admin có quyền xem và theo dõi tất cả giao dịch</p>
        </div>

        <div className="booking-controls">
          <div className="search-box">
            <Search size={18} />
            <input
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Mã đơn, tên khách..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setLoading(true);
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="customer_paid">Đang xử lý</option>
            <option value="staff_confirmed">Hoàn thành</option>
            <option value="created">Mới tạo</option>
            <option value="rejected">Đã từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <select
            value={processingFilter}
            onChange={(e) => {
              setProcessingFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả xử lý</option>
            <option value="unclaimed">Chưa có ai nhận</option>
            <option value="processing">Đang xử lý (Đã nhận)</option>
            <option value="processed">Đã xử lý xong</option>
          </select>

          <select
            value={validFilter}
            onChange={(e) => {
              setValidFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả xác nhận</option>
            <option value="yes">Hợp lệ (CÓ)</option>
            <option value="no">Không hợp lệ (KHÔNG)</option>
            <option value="null">Chưa xác nhận</option>
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

      <div className="table-shell">
        <table className="booking-table">
          <thead>
            <tr>
              <th>ID</th>
              <th className="th-code">Mã đơn</th>
              <th>Khách hàng</th>
              <th className="th-money">Tiền chuyển</th>
              <th>Nhân viên xử lý</th>
              <th>Kế toán</th>
              <th className="th-status">Trạng thái</th>
              <th className="th-date">Thời gian</th>
              <th className="th-actions">Thao tác</th>
              <th className="th-valid">Xác nhận</th>
            </tr>
          </thead>
          <tbody>
            {currentItems.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty">Không có dữ liệu đơn hàng.</td>
              </tr>
            ) : (
              currentItems.map((b) => (
                <tr key={b.id}>
                  <td data-label="ID">#{b.id}</td>
                  <td data-label="Mã đơn" className="th-code"><span className="mono">{shortCode(b.code)}</span></td>
                  <td data-label="Khách hàng">
                    <div className="customer-cell">
                      <span className="name">{b.customer_name}</span>
                      <span className="email">{b.customer_email}</span>
                      <span className="phone">{b.customer_phone || 'Chưa cập nhật'}</span>
                    </div>
                  </td>
                  <td data-label="Tiền chuyển" className="td-money">
                    <span className="money-value">{formatMoney(b.transfer_amount)}</span>
                  </td>
                  <td data-label="Nhân viên">
                    {b.staff_id ? (
                      <div className="staff-cell">
                        <span>{b.staff_name || `ID: ${b.staff_id}`}</span>
                      </div>
                    ) : (
                      <span className="no-staff">Chưa có</span>
                    )}
                  </td>
                  <td data-label="Kế toán">
{ (b.status === 'accountant_paid'  || b.status === 'staff_confirmed' || b.status === 'customer_paid' ) && b.is_valid === 'yes'? (
  <>
                    {b.status === 'accountant_paid' ? (
                      <span className="acc-status paid">Đã thanh toán</span>
                    ) : (
                      <span className="acc-status pending">Chưa thanh toán</span>
                    )}
                    </>)
                    :(
                    <span className="no-accountant"></span>
                    )
                  }
                  </td>
                  <td data-label="Trạng thái" className="th-status">
                    <span className={`status-text ${b.status}`}>{statusLabel(b.status)}</span>
                  </td>
                  <td data-label="Thời gian" className="td-date">
                    <div className="date-cell">
                      <span>{formatDateTime(b.created_at)}</span>
                    </div>
                  </td>
                  <td className="td-actions">
                    <div className="row-actions">
                      {b.status === 'customer_paid' && !b.staff_id && (
                        <button 
                          className="claim-btn" 
                          onClick={() => {
                            setConfirmModal({
                              isOpen: true,
                              bookingId: b.id,
                              shortCode: shortCode(b.code)
                            });
                          }}
                        >
                          Xử lý
                        </button>
                      )}
                      <button className="detail-view-btn" onClick={() => navigate(`/admin/bookings/${b.id}`)}>
      
                        <span>Chi tiết</span>
                      </button>
                      <button 
                        className="delete-booking-btn" 
                        onClick={() => setDeleteModal({
                          isOpen: true,
                          bookingId: b.id,
                          shortCode: shortCode(b.code)
                        })}
                        title="Xóa đơn hàng"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                  <td data-label="Xác nhận" className="td-valid">
                    {b.is_valid === 'yes' ? (
                      <div className="valid-icon yes" title="Hợp lệ">
                        <Check size={18} />
                      </div>
                    ) : b.is_valid === 'no' ? (
                      <div className="valid-icon no" title="Không hợp lệ">
                        <X size={18} />
                      </div>
                    ) : (
                      <span className="valid-none">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {renderPagination()}

      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content">
            <h3>Xác nhận xử lý đơn</h3>
            <p>Bạn có chắc chắn muốn nhận xử lý đơn hàng <strong>{confirmModal.shortCode}</strong> không?</p>
            <div className="confirm-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setConfirmModal({ isOpen: false, bookingId: null, shortCode: '' })}
              >
                Hủy bỏ
              </button>
              <button 
                className="confirm-btn" 
                onClick={() => handleClaim(confirmModal.bookingId)}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content delete-modal">
            <div className="modal-icon-warning">
              <Trash2 size={48} color="#ef4444" />
            </div>
            <h3>Xác nhận xóa đơn hàng</h3>
            <p>
              Bạn có chắc chắn muốn xóa đơn hàng <strong>#{deleteModal.shortCode}</strong>? 
              <br />
              <span className="danger-text">Hành động này không thể hoàn tác và sẽ xóa toàn bộ dữ liệu liên quan.</span>
            </p>
            <div className="confirm-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setDeleteModal({ isOpen: false, bookingId: null, shortCode: '' })}
              >
                Hủy bỏ
              </button>
              <button 
                className="confirm-btn delete-btn" 
                onClick={handleDeleteBooking}
              >
                Xóa đơn ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingManager;
