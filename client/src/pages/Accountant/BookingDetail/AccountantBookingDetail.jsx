import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import {
  ChevronLeft,
  Upload, Shield, FileText, QrCode, ZoomIn
} from 'lucide-react';
import { toast } from 'react-toastify';
import './AccountantBookingDetail.scss';

const AccountantBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [updating, setUpdating] = useState(false);
  const [lightbox, setLightbox] = useState(null); // URL đang xem phóng to

  useEffect(() => {
    const fetchDetail = async () => {
      try {
        const res = await api.get(`/bookings/accountant/${id}`);
        const data = res.data;

        // Parse JSON proof urls
        if (data.accountant_paid_proof_urls) {
          try {
            data.proof_urls = typeof data.accountant_paid_proof_urls === 'string'
              ? JSON.parse(data.accountant_paid_proof_urls)
              : data.accountant_paid_proof_urls;
          } catch {
            data.proof_urls = data.accountant_paid_proof_url ? [data.accountant_paid_proof_url] : [];
          }
        } else {
          data.proof_urls = data.accountant_paid_proof_url ? [data.accountant_paid_proof_url] : [];
        }

        setBooking(data);
      } catch (error) {
        console.error('Lỗi fetch accountant detail:', error);
        toast.error('Không tìm thấy đơn hàng hoặc đơn không hợp lệ');
        navigate('/accountant/bookings');
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id, navigate]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const newFiles = [...proofFiles, ...files].slice(0, 3);
    setProofFiles(newFiles);
    setProofPreviews(newFiles.map(file => URL.createObjectURL(file)));
  };

  const removeFile = (index) => {
    const newFiles = proofFiles.filter((_, i) => i !== index);
    setProofFiles(newFiles);
    setProofPreviews(newFiles.map(file => URL.createObjectURL(file)));
  };

  const handleConfirmPaid = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (proofFiles.length === 0) return toast.warn('Vui lòng chọn ít nhất một ảnh bill chuyển tiền');

    const formData = new FormData();
    proofFiles.forEach(file => formData.append('proof', file));

    setUpdating(true);
    try {
      await api.post(`/bookings/accountant/${id}/confirm`, formData);
      toast.success('Xác nhận đã chuyển tiền thành công');
      window.location.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi xác nhận chuyển tiền');
    } finally {
      setUpdating(false);
    }
  };

  const formatMoney = (amount) =>
    Number(amount || 0).toLocaleString('vi-VN') + 'đ';

  if (loading) return (
    <div className="acc-loading">
      <div className="acc-spinner" />
    </div>
  );
  if (!booking) return null;

  const isPending = booking.status === 'staff_confirmed';

  return (
    <div className="acc-detail">
      {/* ── Header ── */}
      <div className="acc-header">
        <button className="acc-back-btn" onClick={() => navigate('/accountant/bookings')}>
          <ChevronLeft size={18} /> Quay lại
        </button>
        <div className="acc-title-row">
          <h1>Đơn #{booking.code.slice(-8).toUpperCase()}</h1>
          <span className={`acc-status-badge ${booking.status}`}>
            {isPending ? 'Chờ thanh toán' : 'Đã hoàn tất'}
          </span>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="acc-layout">

        {/* ── LEFT COLUMN ── */}
        <div className="acc-left">

          {/* Admin bank info + QR */}
          <div className="acc-card">
            <div className="acc-card-header">
              <Shield size={18} />
              <span>Tài khoản Admin — Chuyển tiền đến đây</span>
            </div>
            <div className="acc-card-body admin-bank-body">
              {/* QR image */}
              {booking.admin_bank_qr_image ? (
                <div className="admin-qr-block">
                  <div
                    className="admin-qr-img-wrap"
                    onClick={() => setLightbox(booking.admin_bank_qr_image)}
                    title="Nhấn để phóng to"
                  >
                    <img src={booking.admin_bank_qr_image} alt="QR ngân hàng Admin" />
                    <div className="admin-qr-zoom-hint">
                      <ZoomIn size={16} />
                    </div>
                  </div>
                  <p className="admin-qr-caption">Quét QR để chuyển tiền</p>
                </div>
              ) : (
                <div className="admin-qr-block no-qr">
                  <QrCode size={48} />
                  <p>Chưa có ảnh QR</p>
                </div>
              )}

              {/* Bank details */}
              <div className="admin-bank-details">
                <div className="bank-detail-row">
                  <span className="bdl">Ngân hàng</span>
                  <span className="bdv">{booking.admin_bank_name || '—'}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bdl">Số tài khoản</span>
                  <span className="bdv mono">{booking.admin_account_number || '—'}</span>
                </div>
                <div className="bank-detail-row">
                  <span className="bdl">Chủ tài khoản</span>
                  <span className="bdv">{booking.admin_account_holder || '—'}</span>
                </div>
                <div className="bank-detail-row total-row">
                  <span className="bdl">Số tiền cần chuyển</span>
                  <span className="bdv amount">{formatMoney(booking.net_amount)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Customer bill */}
          <div className="acc-card">
            <div className="acc-card-header">
              <FileText size={18} />
              <span>Hóa đơn khách đã chuyển</span>
            </div>
            <div className="acc-card-body">
              {booking.customer_paid_proof_url ? (
                <div
                  className="customer-proof-wrap"
                  onClick={() => setLightbox(booking.customer_paid_proof_url)}
                  title="Nhấn để phóng to"
                >
                  <img
                    src={booking.customer_paid_proof_url}
                    alt="Bill của khách"
                    className="customer-proof-img"
                  />
                  <div className="proof-zoom-hint"><ZoomIn size={16} /></div>
                </div>
              ) : (
                <p className="no-proof-text">Chưa có hóa đơn</p>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="acc-right">
          {isPending ? (
            <div className="acc-card confirm-card">
              <div className="acc-card-header">
                <Upload size={18} />
                <span>Xác nhận chuyển tiền</span>
              </div>
              <div className="acc-card-body">
                <p className="confirm-hint">
                  Sau khi chuyển tiền thành công, tải ảnh biên lai để xác nhận (tối đa 3 ảnh).
                </p>

                <div className="upload-grid">
                  {proofPreviews.map((preview, idx) => (
                    <div key={idx} className="upload-preview">
                      <img src={preview} alt={`Preview ${idx + 1}`} />
                      <button
                        type="button"
                        className="upload-remove"
                        onClick={() => removeFile(idx)}
                      >×</button>
                    </div>
                  ))}

                  {proofFiles.length < 3 && (
                    <label className="upload-add">
                      <input
                        type="file"
                        hidden
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <Upload size={22} />
                      <span>Thêm ảnh</span>
                    </label>
                  )}
                </div>

                <button
                  className="confirm-btn"
                  onClick={handleConfirmPaid}
                  disabled={updating || proofFiles.length === 0}
                >
                  {updating ? 'Đang lưu...' : '✓ Xác nhận đã chuyển tiền'}
                </button>
              </div>
            </div>
          ) : (
            <div className="acc-card completed-card">
              <div className="acc-card-header success">
                <span>✓</span>
                <span>Đơn hàng đã hoàn tất</span>
              </div>
              <div className="acc-card-body">
                <p className="completed-time">
                  Chuyển tiền lúc:{' '}
                  <strong>{new Date(booking.accountant_paid_at).toLocaleString('vi-VN')}</strong>
                </p>

                {booking.proof_urls && booking.proof_urls.length > 0 && (
                  <div className="completed-proofs">
                    <p className="proofs-label">Biên lai đã tải:</p>
                    <div className="proofs-grid">
                      {booking.proof_urls.map((url, idx) => (
                        <div
                          key={idx}
                          className="proof-thumb"
                          onClick={() => setLightbox(url)}
                        >
                          <img src={url} alt={`Biên lai ${idx + 1}`} />
                          <div className="proof-zoom"><ZoomIn size={14} /></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="acc-lightbox" onClick={() => setLightbox(null)}>
          <div className="acc-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="acc-lightbox-close" onClick={() => setLightbox(null)}>×</button>
            <img src={lightbox} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantBookingDetail;
