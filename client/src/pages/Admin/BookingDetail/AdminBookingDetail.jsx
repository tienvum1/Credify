import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../../api/axios';
import './AdminBookingDetail.scss';

const AdminBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);

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
      customer_paid: 'Khách đã thanh toán',
      staff_confirmed: 'Hoàn thành',
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

  useEffect(() => {
    let active = true;
    
    const loadData = async () => {
      try {
        const res = await api.get(`/bookings/staff/${id}`);
        if (active) {
          setBooking(res.data);
        }
      } catch {
        if (active) {
          navigate('/admin/bookings');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadData();
    return () => {
      active = false;
    };
  }, [id, navigate]);

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

export default AdminBookingDetail;
