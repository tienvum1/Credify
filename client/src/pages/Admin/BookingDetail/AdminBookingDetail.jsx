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
  const [rejectModal, setRejectModal] = useState({ isOpen: false, note: '' });

  const isAssignedStaff = booking && currentUser && Number(booking.staff_id) === Number(currentUser.id);

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
      accountant_paid: 'Hoàn thành',
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
    const data = res.data;

    // Parse accountant proof urls
    if (data.accountant_paid_proof_urls) {
      try {
        data.accountant_proof_urls = typeof data.accountant_paid_proof_urls === 'string'
          ? JSON.parse(data.accountant_paid_proof_urls)
          : data.accountant_paid_proof_urls;
      } catch {
        data.accountant_proof_urls = data.accountant_paid_proof_url ? [data.accountant_paid_proof_url] : [];
      }
    } else {
      data.accountant_proof_urls = data.accountant_paid_proof_url ? [data.accountant_paid_proof_url] : [];
    }

    setBooking(data);
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

        const data = bookingRes.data;

        // Parse accountant proof urls
        if (data.accountant_paid_proof_urls) {
          try {
            data.accountant_proof_urls = typeof data.accountant_paid_proof_urls === 'string'
              ? JSON.parse(data.accountant_paid_proof_urls)
              : data.accountant_paid_proof_urls;
          } catch {
            data.accountant_proof_urls = data.accountant_paid_proof_url ? [data.accountant_paid_proof_url] : [];
          }
        } else {
          data.accountant_proof_urls = data.accountant_paid_proof_url ? [data.accountant_paid_proof_url] : [];
        }

        setBooking(data);
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
    setRejectModal({ isOpen: true, note: '' });
  };

  const confirmReject = async () => {
    if (!rejectModal.note.trim()) {
      toast.error('Vui lòng nhập lý do từ chối');
      return;
    }

    setUpdating(true);
    try {
      await api.patch(`/bookings/${booking.id}/reject`, { note: rejectModal.note.trim() });
      toast.success('Đã từ chối đơn hàng');
      setRejectModal({ isOpen: false, note: '' });
      await fetchDetail();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi từ chối đơn');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateValidity = (isValid) => {
    if (!booking) return;
    if (isValid === 'no') {
      // Bấm KHÔNG → hiện modal nhập lý do, sau đó reject đơn
      setRejectModal({ isOpen: true, note: '' });
    } else {
      setConfirmValidityModal({ isOpen: true, value: isValid });
    }
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
         Chế độ xem Admin: Bạn có quyền xem chi tiết toàn bộ thông tin và bill của mọi giao dịch trong hệ thống.
      </div>

      <table className="detail-table">
        <tbody>
          <tr><th>ID đơn</th><td data-label="ID đơn">{booking.id}</td></tr>
          <tr><th>Mã đơn</th><td data-label="Mã đơn" className="mono">{shortCode(booking.code)}</td></tr>
          <tr><th>ID QR</th><td data-label="ID QR">{booking.qr_id}</td></tr>
          <tr><th>Tên QR</th><td data-label="Tên QR">{booking.qr_name || '—'}</td></tr>
          <tr><th>ID khách hàng</th><td data-label="ID khách hàng">{booking.customer_id}</td></tr>
          <tr>
            <th>Nhân viên xử lý</th>
            <td data-label="Nhân viên xử lý">
              {booking.staff_name ? (
                <div className="staff-info-cell">
                  <span className="staff-name-text">{booking.staff_name}</span>
                  <span className="staff-id-tag">(ID: {booking.staff_id})</span>
                </div>
              ) : (
                <span className="no-staff-text">Chưa có nhân viên nhận</span>
              )}
            </td>
          </tr>
          <tr><th>Tên khách</th><td data-label="Tên khách">{booking.customer_name || '—'}</td></tr>
          <tr><th>Email khách</th><td data-label="Email khách">{booking.customer_email || '—'}</td></tr>
          <tr><th>Số điện thoại</th><td data-label="Số điện thoại">{booking.customer_phone || 'Chưa cập nhật'}</td></tr>
          <tr><th>Tên ngân hàng</th><td data-label="Tên ngân hàng">{booking.customer_bank_name || '—'}</td></tr>
          <tr><th>Số tài khoản</th><td data-label="Số tài khoản" className="mono">{booking.customer_account_number || '—'}</td></tr>
          <tr><th>Tên chính chủ</th><td data-label="Tên chính chủ">{booking.customer_account_holder || '—'}</td></tr>
          {booking.customer_bank_qr_image && (
            <tr>
              <th>QR ngân hàng</th>
              <td data-label="QR ngân hàng">
                <div className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(booking.customer_bank_qr_image)}>
                  <img src={booking.customer_bank_qr_image} alt="QR ngân hàng" className="proof-thumb" />
                  <span className="thumb-label">QR ngân hàng</span>
                </div>
              </td>
            </tr>
          )}
          <tr><th>Tiền khách chuyển</th><td data-label="Tiền khách chuyển">{formatMoney(booking.transfer_amount)}</td></tr>
          <tr><th>Phí gốc</th><td data-label="Phí gốc">{booking.base_fee_rate || 0}% ({formatMoney(booking.base_fee_amount || 0)})</td></tr>
          <tr>
            <th>Admin thực nhận</th>
            <td data-label="Admin thực nhận" style={{ color: '#7c3aed', fontWeight: 700 }}>
              {formatMoney((Number(booking.transfer_amount) || 0) - (Number(booking.base_fee_amount) || 0))}
            </td>
          </tr>
          <tr><th>Phí khách chịu</th><td data-label="Phí khách chịu">{booking.fee_rate}% ({formatMoney(booking.fee_amount)})</td></tr>
          <tr>
            <th>Khách thực nhận</th>
            <td data-label="Khách thực nhận" style={{ color: '#2563eb', fontWeight: 700 }}>
              {formatMoney((Number(booking.transfer_amount) || 0) - (Number(booking.fee_amount) || 0))}
            </td>
          </tr>
          <tr>
            <th>Lợi nhuận</th>
            <td data-label="Lợi nhuận" style={{ color: '#16a34a', fontWeight: 700 }}>
              {formatMoney((Number(booking.fee_amount) || 0) - (Number(booking.base_fee_amount) || 0))}
            </td>
          </tr>
          <tr><th>Ghi chú khách</th><td data-label="Ghi chú khách">{booking.customer_paid_note || '—'}</td></tr>
          <tr><th>Lý do từ chối</th><td data-label="Lý do từ chối">{booking.reject_note || '—'}</td></tr>
          <tr><th>Tạo lúc</th><td data-label="Tạo lúc">{formatDateTime(booking.created_at)}</td></tr>
          <tr><th>Thanh toán lúc</th><td data-label="Thanh toán lúc">{formatDateTime(booking.paid_at)}</td></tr>
          <tr><th>Xác nhận lúc</th><td data-label="Xác nhận lúc">{formatDateTime(booking.confirmed_at)}</td></tr>
          <tr><th>Cập nhật lúc</th><td data-label="Cập nhật lúc">{formatDateTime(booking.updated_at)}</td></tr>
          <tr><th>Trạng thái</th><td data-label="Trạng thái">{statusLabel(booking.status)}</td></tr>
          
          {['customer_paid', 'staff_confirmed', 'accountant_paid'].includes(booking.status) && (
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
          {booking.id_card_urls && booking.id_card_urls.length > 0 && (
            <tr>
              <th>Ảnh CCCD khách</th>
              <td data-label="Ảnh CCCD khách">
                <div className="proof-images-grid">
                  {booking.id_card_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`CCCD ${idx + 1}`} className="proof-thumb" />
                      <span className="thumb-label">CCCD {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}
          <tr>
            <th>Kế toán chuyển lúc</th>
            <td data-label="Kế toán chuyển lúc">
              {booking.accountant_paid_at ? (
                <span className="accountant-paid-time">{formatDateTime(booking.accountant_paid_at)}</span>
              ) : '—'}
            </td>
          </tr>
          {booking.accountant_proof_urls && booking.accountant_proof_urls.length > 0 && (
            <tr>
              <th>Ảnh bill kế toán chuyển</th>
              <td data-label="Ảnh bill kế toán chuyển">
                <div className="proof-images-grid">
                  {booking.accountant_proof_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper accountant" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`Accountant proof ${idx + 1}`} className="proof-thumb" />
                      <span className="thumb-label">Bill kế toán {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {booking.status === 'customer_paid' && (
        <div className="staff-upload-section">
          <h3>Tải bill chuyển tiền cho khách (Tối đa 3 ảnh)</h3>
          
          {!isAssignedStaff && (
            <p style={{ color: '#ef4444', fontWeight: '700', marginBottom: '16px' }}>
              ⚠️ Bạn không phải là người đang xử lý đơn hàng này. Với quyền Admin, bạn vẫn có thể xác nhận hoặc từ chối.
            </p>
          )}

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
            
            {(staffProofPreviews.length < 3) && (
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

      {rejectModal.isOpen && (
        <div className="confirm-modal-overlay">
          <div className="confirm-modal-content reject-modal">
            <h3>Từ chối đơn hàng</h3>
            <p>Vui lòng nhập lý do từ chối đơn hàng này:</p>
            <textarea
              className="reject-textarea"
              placeholder="Nhập lý do tại đây..."
              value={rejectModal.note}
              onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
              autoFocus
            />
            <div className="confirm-modal-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setRejectModal({ isOpen: false, note: '' })}
                disabled={updating}
              >
                Hủy
              </button>
              <button 
                className="confirm-btn-final no" 
                onClick={confirmReject}
                disabled={updating || !rejectModal.note.trim()}
              >
                {updating ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookingDetail;
