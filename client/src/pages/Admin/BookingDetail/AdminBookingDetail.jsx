import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import './AdminBookingDetail.scss';

const AdminBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [staffProofs, setStaffProofs] = useState([]);
  const [staffProofPreviews, setStaffProofPreviews] = useState([]);
  const [confirmValidityModal, setConfirmValidityModal] = useState({ isOpen: false, value: null });

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
    const labels = {
      created: 'Mới tạo',
      customer_paid: 'Đang xử lý',
      staff_confirmed: 'Hoàn thành',
      completed: 'Hoàn thành',
      rejected: 'Đã từ chối',
      cancelled: 'Đã hủy'
    };
    const label = labels[status] || status;
    return <span className={`status-text ${status}`}>{label}</span>;
  };

  const shortCode = (code) => {
    const raw = String(code || '');
    return raw.length <= 6 ? raw : raw.slice(-6);
  };

  const fetchDetail = async () => {
    const res = await api.get(`/bookings/staff/${id}`);
    setBooking(res.data);
  };

  useEffect(() => {
    let active = true;
    
    const loadData = async () => {
      try {
        const [bookingRes, userRes] = await Promise.all([
          api.get(`/bookings/staff/${id}`),
          api.get('/auth/me')
        ]);
        
        if (!active) return;
        setBooking(bookingRes.data);
        setCurrentUser(userRes.data.user);
      } catch {
        if (!active) return;
        navigate('/admin/bookings');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const handleStaffFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...staffProofs, ...newFiles].slice(0, 3);
    setStaffProofs(updatedFiles);
    
    const generatePreviews = async () => {
      const previews = await Promise.all(
        updatedFiles.map((file) => {
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(file);
          });
        })
      );
      setStaffProofPreviews(previews);
    };

    generatePreviews();
  };

  const removeStaffProof = (index) => {
    const newFiles = [...staffProofs];
    newFiles.splice(index, 1);
    setStaffProofs(newFiles);

    const newPreviews = [...staffProofPreviews];
    newPreviews.splice(index, 1);
    setStaffProofPreviews(newPreviews);
  };

  const handleConfirm = async () => {
    if (!booking) return;
    if (staffProofs.length === 0) {
      toast.error('Vui lòng tải ít nhất một ảnh bill chuyển tiền');
      return;
    }
    
    setUpdating(true);
    try {
      const formData = new FormData();
      staffProofs.forEach(file => {
        formData.append('proof', file);
      });

      await api.patch(`/bookings/${booking.id}/confirm`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Xác nhận đơn hàng thành công');
      setStaffProofs([]);
      setStaffProofPreviews([]);
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi xác nhận đơn');
    } finally {
      setUpdating(false);
    }
  };

  const handleReject = async () => {
    if (!booking) return;
    const note = window.prompt('Nhập lý do từ chối đơn:');
    if (note === null || !note.trim()) return;

    setUpdating(true);
    try {
      await api.patch(`/bookings/${booking.id}/reject`, { note: note.trim() });
      toast.success('Đã từ chối đơn hàng');
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối đơn');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateValidity = (isValid) => {
    if (!booking) return;
    setConfirmValidityModal({ isOpen: true, value: isValid });
  };

  const confirmUpdateValidity = async () => {
    const isValid = confirmValidityModal.value;
    setConfirmValidityModal({ isOpen: false, value: null });
    setUpdating(true);
    try {
      await api.patch(`/bookings/${booking.id}/validity`, { is_valid: isValid });
      toast.success(`Đã xác nhận: ${isValid === 'yes' ? 'CÓ' : 'KHÔNG'}`);
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật xác nhận');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="booking-detail-loading">Đang tải dữ liệu đơn hàng...</div>;
  if (!booking) return <div className="booking-detail-loading">Không tìm thấy đơn</div>;

  return (
    <div className="admin-booking-detail-page">
      <div className="booking-detail-top">
        <button type="button" className="back-btn" onClick={() => navigate('/admin/bookings')}>
          ← Quay lại danh sách
        </button>
        <h1>Chi tiết đơn hệ thống {shortCode(booking.code)}</h1>
      </div>

      <div className="admin-view-notice">
        ℹ️ Chế độ xem Admin: Bạn có quyền xem chi tiết toàn bộ thông tin và bill của mọi giao dịch trong hệ thống.
      </div>

      <table className="detail-table">
        <tbody>
          <tr><th>ID đơn</th><td data-label="ID đơn">{booking.id}</td></tr>
          <tr><th>Mã đơn</th><td data-label="Mã đơn" className="mono">{shortCode(booking.code)}</td></tr>
          <tr><th>ID QR</th><td data-label="ID QR">{booking.qr_id}</td></tr>
          <tr><th>ID khách hàng</th><td data-label="ID khách hàng">{booking.customer_id}</td></tr>
          <tr><th>ID nhân viên xử lý</th><td data-label="ID nhân viên xử lý">{booking.staff_id ?? 'Chưa có nhân viên nhận'}</td></tr>
          <tr><th>Tên khách</th><td data-label="Tên khách">{booking.customer_name || '—'}</td></tr>
          <tr><th>Email khách</th><td data-label="Email khách">{booking.customer_email || '—'}</td></tr>
          <tr><th>Số điện thoại</th><td data-label="Số điện thoại">{booking.customer_phone || 'Chưa cập nhật'}</td></tr>
          <tr><th>Tên ngân hàng</th><td data-label="Tên ngân hàng">{booking.customer_bank_name || '—'}</td></tr>
          <tr><th>Số tài khoản</th><td data-label="Số tài khoản" className="mono">{booking.customer_account_number || '—'}</td></tr>
          <tr><th>Tên chính chủ</th><td data-label="Tên chính chủ">{booking.customer_account_holder || '—'}</td></tr>
          <tr><th>Tiền khách chuyển</th><td data-label="Tiền khách chuyển">{formatMoney(booking.transfer_amount)}</td></tr>
          <tr><th>Phí</th><td data-label="Phí">{booking.fee_rate}% ({formatMoney(booking.fee_amount)})</td></tr>
          <tr><th>Thực nhận</th><td data-label="Thực nhận">{formatMoney(booking.net_amount)}</td></tr>
          <tr><th>Ghi chú khách</th><td data-label="Ghi chú khách">{booking.customer_paid_note || '—'}</td></tr>
          <tr><th>Lý do từ chối</th><td data-label="Lý do từ chối">{booking.reject_note || '—'}</td></tr>
          <tr><th>Tạo lúc</th><td data-label="Tạo lúc">{formatDateTime(booking.created_at)}</td></tr>
          <tr><th>Thanh toán lúc</th><td data-label="Thanh toán lúc">{formatDateTime(booking.paid_at)}</td></tr>
          <tr><th>Xác nhận lúc</th><td data-label="Xác nhận lúc">{formatDateTime(booking.confirmed_at)}</td></tr>
          <tr><th>Cập nhật lúc</th><td data-label="Cập nhật lúc">{formatDateTime(booking.updated_at)}</td></tr>
          <tr><th>Trạng thái</th><td data-label="Trạng thái">{statusLabel(booking.status)}</td></tr>
          
          {booking.staff_id && (
            <tr>
              <th>Xác nhận (Có/Không)</th>
              <td data-label="Xác nhận">
                <div className="validity-actions">
                  <button 
                    className={`valid-btn yes ${booking.is_valid === 'yes' ? 'active' : ''}`}
                    onClick={() => handleUpdateValidity('yes')}
                    disabled={updating || booking.is_valid !== null}
                    title={booking.is_valid !== null ? "Đã xác nhận, không thể thay đổi" : ""}
                  >
                    CÓ
                  </button>
                  <button 
                    className={`valid-btn no ${booking.is_valid === 'no' ? 'active' : ''}`}
                    onClick={() => handleUpdateValidity('no')}
                    disabled={updating || booking.is_valid !== null}
                    title={booking.is_valid !== null ? "Đã xác nhận, không thể thay đổi" : ""}
                  >
                    KHÔNG
                  </button>
                  {booking.is_valid === null && <span className="validity-hint">(Chưa xác nhận)</span>}
                  {booking.is_valid !== null && <span className="validity-hint confirmed">✓ Đã xác nhận: {booking.is_valid === 'yes' ? 'CÓ' : 'KHÔNG'}</span>}
                </div>
              </td>
            </tr>
          )}

          <tr>
            <th>Ảnh bill khách gửi</th>
            <td data-label="Ảnh bill khách gửi">
              <div className="proof-images-grid">
                {booking.proof_urls && booking.proof_urls.length > 0 ? (
                  booking.proof_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`Customer proof ${idx}`} className="proof-thumb" />
                      <span className="thumb-label">Bill khách {idx + 1}</span>
                    </div>
                  ))
                ) : (
                  '—'
                )}
              </div>
            </td>
          </tr>
          {booking.staff_proof_urls && booking.staff_proof_urls.length > 0 && (
            <tr>
              <th>Ảnh bill nhân viên chuyển</th>
              <td data-label="Ảnh bill nhân viên chuyển">
                <div className="proof-images-grid">
                  {booking.staff_proof_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper staff" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`Staff proof ${idx}`} className="proof-thumb" />
                      <span className="thumb-label">Bill nhân viên {idx + 1}</span>
                    </div>
                  ))
                }
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {(booking.status === 'customer_paid' || (booking.status === 'staff_confirmed' && currentUser?.role === 'admin_system')) && (
        <div className="staff-upload-section">
          <h3>{booking.status === 'staff_confirmed' ? 'Cập nhật lại bill chuyển tiền (Admin)' : 'Tải bill chuyển tiền cho khách (Tối đa 3 ảnh)'}</h3>
          
          <div className="staff-upload-grid">
            {staffProofPreviews.map((preview, idx) => (
              <div key={idx} className="staff-proof-preview-container">
                <img src={preview} alt={`Preview ${idx}`} className="staff-proof-preview-img" />
                <button 
                  type="button" 
                  className="remove-staff-proof-btn" 
                  onClick={() => removeStaffProof(idx)}
                  title="Xóa ảnh"
                >
                  ×
                </button>
              </div>
            ))}
            
            {staffProofPreviews.length < 3 && (
              <label className="staff-file-upload-box">
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleStaffFileChange}
                  hidden 
                />
                <div className="upload-placeholder">
                  <span className="plus">+</span>
                  <span>Thêm ảnh</span>
                </div>
              </label>
            )}
          </div>

          <div className="detail-actions">
            <button 
              className="confirm-btn" 
              onClick={handleConfirm}
              disabled={updating || staffProofs.length === 0}
            >
              {updating ? 'Đang xử lý...' : 'Xác nhận hoàn thành & Gửi bill'}
            </button>
            <button 
              className="reject-btn" 
              onClick={handleReject}
              disabled={updating}
            >
              Từ chối đơn
            </button>
          </div>
        </div>
      )}

      {previewImageUrl && (
        <div className="image-preview-overlay" onClick={() => setPreviewImageUrl(null)}>
          <div className="image-preview-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="image-preview-close"
              onClick={() => setPreviewImageUrl(null)}
              aria-label="Đóng"
            >
              ×
            </button>
            <img src={previewImageUrl} alt="Bill preview" className="image-preview-img" />
          </div>
        </div>
      )}

      {confirmValidityModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content">
            <h3>Xác nhận trạng thái</h3>
            <p>
              Bạn có chắc chắn muốn xác nhận đơn hàng này là{' '}
              <strong>{confirmValidityModal.value === 'yes' ? 'CÓ' : 'KHÔNG'}</strong>?
            </p>
            <p className="confirm-warning">
              ⚠️ Lưu ý: Sau khi xác nhận, bạn sẽ không thể thay đổi trạng thái này.
            </p>
            <div className="confirm-modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setConfirmValidityModal({ isOpen: false, value: null })}
                disabled={updating}
              >
                Hủy
              </button>
              <button 
                className={`confirm-btn-final ${confirmValidityModal.value}`} 
                onClick={confirmUpdateValidity}
                disabled={updating}
              >
                {updating ? 'Đang lưu...' : 'Xác nhận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingDetail;
