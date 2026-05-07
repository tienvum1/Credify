import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Clock, CheckCircle2,
  XCircle, UserPlus, Search, Trash2,
  Check, X, Ban
} from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import './AdminBookingManager.scss';

const AdminBookingManager = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({
    total: 0, pending_claim: 0, processing: 0,
    completed: 0, rejected: 0, cancelled: 0,
    total_amount: 0, total_fee: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [validFilter, setValidFilter] = useState('all');
  const [processingFilter, setProcessingFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [qrNameFilter, setQrNameFilter] = useState('');
  const [qrList, setQrList] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 10;

  const [confirmModal, setConfirmModal] = useState({ isOpen: false, bookingId: null, shortCode: '' });
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, bookingId: null, shortCode: '' });

  const dateOptions = [
    { label: 'Tất cả thời gian', value: 'all' },
    { label: 'Hôm nay', value: 'today' },
    { label: '7 ngày qua', value: '7days' },
    { label: '30 ngày qua', value: '30days' },
  ];

  const filterParams = useCallback(() => ({
    status: statusFilter === 'all' ? undefined : statusFilter,
    processing_status: processingFilter === 'all' ? undefined : processingFilter,
    is_valid: validFilter === 'all' ? undefined : validFilter,
    search: searchTerm.trim() || undefined,
    qrName: qrNameFilter.trim() || undefined,
    dateRange: dateFilter === 'all' ? undefined : dateFilter,
  }), [statusFilter, processingFilter, validFilter, searchTerm, qrNameFilter, dateFilter]);

  useEffect(() => {
    api.get('/qrs').then(res => {
      const names = [...new Set((res.data || []).map(q => q.name).filter(Boolean))].sort();
      setQrList(names);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      const params = filterParams();
      try {
        const [bookingsRes, statsRes] = await Promise.all([
          api.get('/bookings/staff', { params: { ...params, page: currentPage, limit: itemsPerPage } }),
          api.get('/bookings/staff/stats', { params })
        ]);
        if (!active) return;
        setBookings(Array.isArray(bookingsRes.data.data) ? bookingsRes.data.data : []);
        setTotalPages(bookingsRes.data.totalPages || 0);
        setStats(statsRes.data);
      } catch (err) {
        console.error('Lỗi tải dữ liệu:', err);
        if (active) { setBookings([]); }
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [currentPage, statusFilter, processingFilter, validFilter, searchTerm, qrNameFilter, dateFilter]);

  // Reset page khi filter thay đổi
  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1);
  };

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') ;
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
      setCurrentPage(1);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xóa đơn hàng');
    }
  };

  const handlePageChange = (p) => { setCurrentPage(p); window.scrollTo(0, 0); };

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
        {start > 1 && (<><button type="button" className="page-btn" onClick={() => handlePageChange(1)}>1</button>{start > 2 && <span className="page-ellipsis">...</span>}</>)}
        {pages.map(p => <button key={p} type="button" className={`page-btn ${currentPage === p ? 'active' : ''}`} onClick={() => handlePageChange(p)}>{p}</button>)}
        {end < totalPages && (<>{end < totalPages - 1 && <span className="page-ellipsis">...</span>}<button type="button" className="page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button></>)}
        <button type="button" className="page-btn" disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)}>Sau</button>
      </div>
    );
  };

  return (
    <div className="admin-booking-page">

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon"><BarChart3 size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng đơn</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><UserPlus size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Chưa nhận</span>
            <span className="stat-value">{stats.pending_claim}</span>
          </div>
        </div>
        <div className="stat-card processing">
          <div className="stat-icon"><Clock size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Đang xử lý</span>
            <span className="stat-value">{stats.processing}</span>
          </div>
        </div>
        <div className="stat-card completed">
          <div className="stat-icon"><CheckCircle2 size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Hoàn thành</span>
            <span className="stat-value">{stats.completed}</span>
          </div>
        </div>
        <div className="stat-card rejected">
          <div className="stat-icon"><XCircle size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Từ chối</span>
            <span className="stat-value">{stats.rejected}</span>
          </div>
        </div>
        <div className="stat-card cancelled">
          <div className="stat-icon"><Ban size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Đã hủy</span>
            <span className="stat-value">{stats.cancelled ?? 0}</span>
          </div>
        </div>
        <div className="stat-card amount">
          <div className="stat-icon"><BarChart3 size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng tiền</span>
            <span className="stat-value">{formatMoney(stats.total_amount)}</span>
          </div>
        </div>
        <div className="stat-card fee">
          <div className="stat-icon"><BarChart3 size={20} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng phí</span>
            <span className="stat-value">{formatMoney(stats.total_fee)}</span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="booking-toolbar">
        <div className="booking-title">
          <h1>Quản lý đơn hàng toàn hệ thống</h1>
          <p>Trang {currentPage} / {totalPages || 1}</p>
        </div>
        <div className="booking-controls">
          <div className="search-box">
            <Search size={16} />
            <input
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Mã đơn, tên khách..."
            />
          </div>
          <select value={qrNameFilter} onChange={handleFilterChange(setQrNameFilter)}>
            <option value="">Tất cả tên QR</option>
            {qrList.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)}>
            <option value="all">Tất cả trạng thái</option>
            <option value="created">Mới tạo</option>
            <option value="customer_paid">Đang xử lý</option>
            <option value="staff_confirmed">Hoàn thành</option>
            <option value="rejected">Đã từ chối</option>
            <option value="cancelled">Đã hủy</option>
          </select>
          <select value={processingFilter} onChange={handleFilterChange(setProcessingFilter)}>
            <option value="all">Tất cả xử lý</option>
            <option value="unclaimed">Chưa có ai nhận</option>
            <option value="processing">Đang xử lý</option>
            <option value="processed">Đã xử lý xong</option>
          </select>
          <select value={validFilter} onChange={handleFilterChange(setValidFilter)}>
            <option value="all">Tất cả xác nhận</option>
            <option value="yes">Hợp lệ</option>
            <option value="no">Không hợp lệ</option>
            <option value="null">Chưa xác nhận</option>
          </select>
          <select value={dateFilter} onChange={handleFilterChange(setDateFilter)}>
            {dateOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-shell">
        <table className="booking-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Mã đơn</th>
              <th>Tên QR</th>
              <th>Khách hàng</th>
              <th>Tiền chuyển</th>
              <th>Nhân viên</th>
              <th>Kế toán</th>
              <th>Trạng thái</th>
              <th>Thời gian</th>
              <th>Thao tác</th>
              <th className="th-valid">Xác nhận</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={11} className="empty">
                <div className="loading-skeleton">
                  {[...Array(5)].map((_, i) => <div key={i} className="skeleton-item" />)}
                </div>
              </td></tr>
            ) : bookings.length === 0 ? (
              <tr><td colSpan={11} className="empty">Không có dữ liệu đơn hàng.</td></tr>
            ) : bookings.map((b) => (
              <tr key={b.id}>
                <td data-label="ID">#{b.id}</td>
                <td data-label="Mã đơn"><span className="mono">{shortCode(b.code)}</span></td>
                <td data-label="Tên QR">{b.qr_name || '—'}</td>
                <td data-label="Khách hàng">
                  <div className="customer-cell">
                    <span className="name">{b.customer_name}</span>
                    <span className="email">{b.customer_email}</span>
                    <span className="phone">{b.customer_phone || 'Chưa cập nhật'}</span>
                  </div>
                </td>
                <td data-label="Tiền chuyển">
                  <span className="money-value">{formatMoney(b.transfer_amount)}</span>
                </td>
                <td data-label="Nhân viên">
                  {b.staff_id
                    ? <div className="staff-cell"><span>{b.staff_name || `ID: ${b.staff_id}`}</span></div>
                    : <span className="no-staff">Chưa có</span>}
                </td>
                <td data-label="Kế toán">
                  {(b.status === 'accountant_paid' || b.status === 'staff_confirmed' || b.status === 'customer_paid') && b.is_valid === 'yes'
                    ? b.status === 'accountant_paid'
                      ? <span className="acc-status paid">Đã thanh toán</span>
                      : <span className="acc-status pending">Chưa thanh toán</span>
                    : <span className="no-accountant">—</span>}
                </td>
                <td data-label="Trạng thái">
                  <span className={`status-text ${b.status}`}>{statusLabel(b.status)}</span>
                </td>
                <td data-label="Thời gian">
                  <span>{formatDateTime(b.created_at)}</span>
                </td>
                <td>
                  <div className="row-actions">
                    {b.status === 'customer_paid' && !b.staff_id && (
                      <button className="claim-btn" onClick={() => setConfirmModal({ isOpen: true, bookingId: b.id, shortCode: shortCode(b.code) })}>
                        Xử lý
                      </button>
                    )}
                    <button className="detail-view-btn" onClick={() => navigate(`/admin/bookings/${b.id}`)}>
                      Chi tiết
                    </button>
                    <button className="delete-booking-btn" onClick={() => setDeleteModal({ isOpen: true, bookingId: b.id, shortCode: shortCode(b.code) })} title="Xóa đơn">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
                <td data-label="Xác nhận" className="td-valid">
                  {b.is_valid === 'yes'
                    ? <div className="valid-icon yes" title="Hợp lệ"><Check size={16} /></div>
                    : b.is_valid === 'no'
                      ? <div className="valid-icon no" title="Không hợp lệ"><X size={16} /></div>
                      : <span className="valid-none">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination()}

      {/* Confirm claim modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content">
            <h3>Xác nhận xử lý đơn</h3>
            <p>Bạn có chắc chắn muốn nhận xử lý đơn hàng <strong>{confirmModal.shortCode}</strong> không?</p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setConfirmModal({ isOpen: false, bookingId: null, shortCode: '' })}>Hủy bỏ</button>
              <button className="confirm-btn" onClick={() => handleClaim(confirmModal.bookingId)}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete modal */}
      {deleteModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content delete-modal">
            <div className="modal-icon-warning"><Trash2 size={48} color="#ef4444" /></div>
            <h3>Xác nhận xóa đơn hàng</h3>
            <p>
              Bạn có chắc chắn muốn xóa đơn hàng <strong>#{deleteModal.shortCode}</strong>?
              <br /><span className="danger-text">Hành động này không thể hoàn tác.</span>
            </p>
            <div className="confirm-actions">
              <button className="cancel-btn" onClick={() => setDeleteModal({ isOpen: false, bookingId: null, shortCode: '' })}>Hủy bỏ</button>
              <button className="confirm-btn delete-btn" onClick={handleDeleteBooking}>Xóa đơn ngay</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingManager;
