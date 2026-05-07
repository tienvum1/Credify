import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Clock, CheckCircle2,
  XCircle, UserPlus, Users, Search,
  Check, X
} from 'lucide-react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import './BookingManager.scss';

const BookingManager = () => {
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
  const [qrNameFilter, setQrNameFilter] = useState('');
  const [qrList, setQrList] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingFilter, setProcessingFilter] = useState('all');
  const [validFilter, setValidFilter] = useState('all');
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
  
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    bookingId: null,
    shortCode: ''
  });

  useEffect(() => {
    api.get('/qrs').then(res => {
      const names = [...new Set((res.data || []).map(q => q.name).filter(Boolean))].sort();
      setQrList(names);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      try {
        const res = await api.get('/bookings/staff/stats', {
          params: {
            dateRange: dateFilter,
            search: searchTerm.trim() || undefined
          }
        });
        if (active) setStats(res.data);
      } catch (err) {
        console.error('Lỗi lấy thống kê:', err);
      }
    };

    const loadData = async () => {
      fetchStats(); 
      setLoading(true);
      try {
        const res = await api.get('/bookings/staff', { 
          params: { 
            status: statusFilter === 'all' ? undefined : statusFilter,
            processing_status: processingFilter === 'all' ? undefined : processingFilter,
            is_valid: validFilter === 'all' ? undefined : validFilter,
            page: currentPage,
            limit: itemsPerPage,
            search: searchTerm.trim() || undefined,
            qrName: qrNameFilter.trim() || undefined,
            dateRange: dateFilter === 'all' ? undefined : dateFilter
          } 
        });
        if (active) {
          // Đảm bảo bookings luôn là mảng để tránh lỗi .filter hoặc .map
          setBookings(Array.isArray(res.data.data) ? res.data.data : []);
          setTotalPages(res.data.totalPages || 0);
        }
      } catch (err) {
        console.error('Lỗi lấy danh sách đơn:', err);
      } finally {
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, [statusFilter, processingFilter, validFilter, currentPage, searchTerm, qrNameFilter, dateFilter]);

  const handleClaim = async (id) => {
    try {
      await api.patch(`/bookings/${id}/claim`);
      toast.success('Đã nhận xử lý đơn hàng');
      setConfirmModal({ isOpen: false, bookingId: null, shortCode: '' });
      navigate(`/staff/bookings/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi nhận đơn');
    }
  };

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

  // Phân trang
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
    <div className="staff-booking-page">
      <div className="stats-grid">
        <div className="stat-card total">
          <div className="stat-icon"><BarChart3 size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng đơn</span>
            <span className="stat-value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card pending">
          <div className="stat-icon"><UserPlus size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Mới tạo</span>
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
        <div className="stat-card cancelled">
          <div className="stat-icon"><XCircle size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Đã hủy</span>
            <span className="stat-value">{stats.cancelled ?? 0}</span>
          </div>
        </div>
        <div className="stat-card amount">
          <div className="stat-icon"><BarChart3 size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng tiền</span>
            <span className="stat-value">{formatMoney(stats.total_amount)}</span>
          </div>
        </div>
        <div className="stat-card fee">
          <div className="stat-icon"><BarChart3 size={24} /></div>
          <div className="stat-info">
            <span className="stat-label">Tổng phí dịch vụ</span>
            <span className="stat-value">{formatMoney(stats.total_fee)}</span>
          </div>
        </div>
      </div>

      <div className="booking-toolbar">
        <div className="booking-title">
          <h1>Quản lý đơn hàng</h1>
          <p>Trang {currentPage} / {totalPages}</p>
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
            value={qrNameFilter}
            onChange={(e) => {
              setQrNameFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="">Tất cả tên QR</option>
            {qrList.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            value={processingFilter}
            onChange={(e) => {
              setProcessingFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả đơn</option>
            <option value="unclaimed">Chưa xử lý </option>
            <option value="processing">Đang xử lý </option>
            <option value="processed">Đã xử lý </option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
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
            value={validFilter}
            onChange={(e) => {
              setValidFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">Tất cả xác nhận</option>
            <option value="yes">Hợp lệ</option>
            <option value="no">Không hợp lệ</option>
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
              <th>Tên QR</th>
              <th>Khách hàng</th>
              <th className="th-money">Tiền chuyển</th>
              <th>Nhân viên xử lý</th>
              <th className="th-status">Trạng thái</th>
              <th className="th-date">Thời gian</th>
              <th className="th-actions">Thao tác</th>
              <th className="th-valid">Xác nhận</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10}>
                  {renderSkeleton()}
                </td>
              </tr>
            ) : bookings.length === 0 ? (
              <tr>
                <td colSpan={10}>
                  <div className="empty-state">
                    <Search size={48} />
                    <p>Không có dữ liệu phù hợp.</p>
                  </div>
                </td>
              </tr>
            ) : (
              bookings.map((b) => (
                <tr key={b.id}>
                  <td data-label="ID"><span>#{b.id}</span></td>
                  <td data-label="Mã đơn" className="th-code"><span className="mono">{shortCode(b.code)}</span></td>
                  <td data-label="Tên QR">{b.qr_name || '—'}</td>
                  <td data-label="Khách hàng">
                    <div className="customer-cell">
                      <span className="name">{b.customer_name}</span>
                      <span className="email">{b.customer_email}</span>
                    </div>
                  </td>
                  <td data-label="Tiền chuyển" className="td-money">
                    <span className="money-value">{formatMoney(b.transfer_amount)}</span>
                  </td>
                  <td data-label="Nhân viên">
                    {b.staff_id ? (
                      <div className="staff-cell">
                        <Users size={14} />
                        <span>{b.staff_name || `ID: ${b.staff_id}`}</span>
                      </div>
                    ) : (
                      <span className="no-staff">Chưa có</span>
                    )}
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
                      <button className="detail-view-btn" onClick={() => navigate(`/staff/bookings/${b.id}`)}>
                        <span>Chi tiết</span>
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
    </div>
  );
};

export default BookingManager;
