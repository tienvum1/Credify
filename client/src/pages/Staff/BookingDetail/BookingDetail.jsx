import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import api from '../../../api/axios';
import './BookingDetail.scss';

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [staffProofs, setStaffProofs] = useState([]);
  const [staffProofPreviews, setStaffProofPreviews] = useState([]);

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
    return <span className={`status-badge ${status}`}>{label}</span>;
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
        console.log('booking data:', bookingRes.data);
        setBooking(bookingRes.data);
        setCurrentUser(userRes.data.user);
      } catch {
        if (!active) return;
        // toast.error('Không thể tải thông tin đơn hàng');
        navigate('/staff/bookings');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [id, navigate]);

  const isAssignedStaff = booking && currentUser && Number(booking.staff_id) === Number(currentUser.id);

  const handleStaffFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...staffProofs, ...newFiles].slice(0, 3);
    setStaffProofs(updatedFiles);
    
    // Tạo previews cho tất cả các file sau khi đã gộp
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
      alert('Vui lòng tải ít nhất một ảnh bill chuyển tiền');
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
      setStaffProofs([]);
      await fetchDetail();
    } catch {
      // Toast handled by interceptor.
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
      await fetchDetail();
    } catch {
      // Toast handled by interceptor.
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <div className="booking-detail-loading">Đang tải...</div>;
  if (!booking) return <div className="booking-detail-loading">Không tìm thấy đơn</div>;

  return (
    <div className="booking-detail-page">
      <div className="booking-detail-top">
        <button type="button" className="back-btn" onClick={() => navigate('/staff/bookings')}>
          ← Quay lại danh sách
        </button>
        <h1>Chi tiết đơn {shortCode(booking.code)}</h1>
      </div>

      <table className="detail-table">
        <tbody>
          <tr><th>ID đơn</th><td>{booking.id}</td></tr>
          <tr><th>Mã đơn</th><td className="mono">{shortCode(booking.code)}</td></tr>
          <tr><th>ID QR</th><td>{booking.qr_id}</td></tr>
          <tr><th>Tên QR</th><td>{booking.qr_name || '—'}</td></tr>
          <tr><th>ID khách hàng</th><td>{booking.customer_id}</td></tr>
          <tr><th>ID staff</th><td>{booking.staff_id ?? '—'}</td></tr>
          <tr><th>Nhân viên xử lý</th><td>{booking.staff_name || (booking.staff_id ? `ID: ${booking.staff_id}` : '—')}</td></tr>
          <tr><th>Tên khách</th><td>{booking.customer_name || '—'}</td></tr>
          <tr><th>Email khách</th><td>{booking.customer_email || '—'}</td></tr>
          <tr><th>Số điện thoại</th><td>{booking.customer_phone || 'Chưa cập nhật'}</td></tr>
          <tr><th>Tên ngân hàng</th><td>{booking.customer_bank_name || '—'}</td></tr>
          <tr><th>Số tài khoản</th><td className="mono">{booking.customer_account_number || '—'}</td></tr>
          <tr><th>Tên chính chủ</th><td>{booking.customer_account_holder || '—'}</td></tr>
          {booking.customer_bank_qr_image && (
            <tr>
              <th>QR ngân hàng</th>
              <td>
                <div className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(booking.customer_bank_qr_image)}>
                  <img src={booking.customer_bank_qr_image} alt="QR ngân hàng" className="proof-thumb" />
                  <span className="thumb-label">QR ngân hàng</span>
                </div>
              </td>
            </tr>
          )}
          <tr><th>Tiền khách chuyển</th><td>{formatMoney(booking.transfer_amount)}</td></tr>
          <tr><th>Phí</th><td>{booking.fee_rate}% ({formatMoney(booking.fee_amount)})</td></tr>
          <tr><th>Thực nhận</th><td>{formatMoney(booking.net_amount)}</td></tr>
          <tr><th>Ghi chú khách</th><td>{booking.customer_paid_note || '—'}</td></tr>
          <tr><th>Lý do từ chối</th><td>{booking.reject_note || '—'}</td></tr>
          <tr><th>Tạo lúc</th><td>{formatDateTime(booking.created_at)}</td></tr>
          <tr><th>Thanh toán lúc</th><td>{formatDateTime(booking.paid_at)}</td></tr>
          <tr><th>Xác nhận lúc</th><td>{formatDateTime(booking.confirmed_at)}</td></tr>
          <tr><th>Cập nhật lúc</th><td>{formatDateTime(booking.updated_at)}</td></tr>
          <tr><th>Trạng thái</th><td><div className={`status-text ${booking.status}`}>{statusLabel(booking.status)}</div></td></tr>
          


          <tr>
            <th>Ảnh bill khách gửi</th>
            <td>
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
          {booking.id_card_urls && booking.id_card_urls.length > 0 && (
            <tr>
              <th>Ảnh CCCD khách</th>
              <td>
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
          {booking.staff_proof_urls && booking.staff_proof_urls.length > 0 && (
            <tr>
              <th>Hệ thống gửi lại cho khách</th>
              <td>
                {booking.confirmed_at && (
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>
                    Thời gian: <strong style={{ color: '#0f172a' }}>{new Date(booking.confirmed_at).toLocaleString('vi-VN')}</strong>
                  </div>
                )}
                <div className="proof-images-grid">
                  {booking.staff_proof_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper staff" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`Bill hệ thống ${idx + 1}`} className="proof-thumb" />
                      <span className="thumb-label">Bill {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}
          {booking.accountant_proof_urls && booking.accountant_proof_urls.length > 0 && (
            <tr>
              <th>Bill kế toán gửi lại cho admin</th>
              <td>
                {booking.accountant_paid_at && (
                  <div style={{ marginBottom: '8px', fontSize: '13px', color: '#64748b' }}>
                    Thời gian: <strong style={{ color: '#0f172a' }}>{new Date(booking.accountant_paid_at).toLocaleString('vi-VN')}</strong>
                  </div>
                )}
                <div className="proof-images-grid">
                  {booking.accountant_proof_urls.map((url, idx) => (
                    <div key={idx} className="proof-thumb-wrapper staff" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`Biên lai ${idx + 1}`} className="proof-thumb" />
                      <span className="thumb-label">Biên lai {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <div className="detail-actions">
        {booking.status === 'customer_paid' && (
          <div className="staff-upload-section">
            <h3>Tải bill chuyển tiền cho khách (Tối đa 3 ảnh)</h3>
            
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
                    accept="image/*, .heic, .heif, .jpg, .jpeg, .png, .webp"
                    onChange={handleStaffFileChange}
                    disabled={updating || !isAssignedStaff}
                  />
                  <div className="staff-upload-placeholder">
                    <span className="plus">+</span>
                    <span>Thêm ảnh bill</span>
                  </div>
                </label>
              )}
            </div>
          </div>
        )}

        {booking.status === 'customer_paid' && (
          <div className="action-buttons">
            <button
              className="confirm-btn"
              onClick={handleConfirm}
              disabled={updating || !isAssignedStaff}
              title={!isAssignedStaff ? "Chỉ nhân viên đang xử lý mới được xác nhận" : ""}
            >
              {updating ? 'Đang xử lý...' : 'Xác nhận đã chuyển tiền'}
            </button>
            <button
              className="reject-btn"
              onClick={handleReject}
              disabled={updating || !isAssignedStaff}
              title={!isAssignedStaff ? "Chỉ nhân viên đang xử lý mới được từ chối" : ""}
            >
              {updating ? 'Đang xử lý...' : 'Từ chối đơn'}
            </button>
          </div>
        )}
        
        {booking.status === 'customer_paid' && !isAssignedStaff && (
          <div className="staff-warning-notice">
            ⚠️ {booking.staff_id 
              ? `Bạn không phải là người xử lý đơn hàng này. Chỉ nhân viên ID: ${booking.staff_id} mới có quyền Xác nhận hoặc Từ chối.` 
              : 'Đơn hàng này chưa có nhân viên nhận xử lý. Bạn cần nhận đơn trước khi thực hiện Xác nhận hoặc Từ chối.'}
          </div>
        )}
      </div>

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

    </div>
  );
};

export default BookingDetail;
