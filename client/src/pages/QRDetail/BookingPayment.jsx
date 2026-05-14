import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import api from '../../api/axios';
import './BookingPayment.scss';

const BookingPayment = () => {
  const { bookingId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [idCardFiles, setIdCardFiles] = useState([]);
  const [idCardPreviews, setIdCardPreviews] = useState([]);
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPaid, setSubmittingPaid] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
  };

  const shortCode = (code) => {
    const raw = String(code || '');
    return raw.length <= 6 ? raw : raw.slice(-6);
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const bookingRes = await api.get(`/bookings/my/${bookingId}`);
        if (active) {
          const bData = bookingRes.data;
          setBooking(bData);

          const qrRes = await api.get(`/qrs/ready/${bData.qr_id}`);
          if (active) {
            setQr(qrRes.data);
          }
        }
      } catch (err) {
        if (active) {
          setError(err.response?.data?.message || 'Không thể tải thông tin thanh toán');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [bookingId]);

  useEffect(() => {
    if (!booking || booking.status !== 'created' || !booking.server_time || !booking.expires_at) {
      return;
    }

    // Tính toán độ lệch thời gian giữa client và server một lần duy nhất
    const serverTime = new Date(booking.server_time).getTime();
    const localTimeAtFetch = Date.now();
    const timeOffset = localTimeAtFetch - serverTime;

    const calculateTimeLeft = () => {
      const expiryTimeServer = new Date(booking.expires_at).getTime();
      const nowLocal = Date.now();
      
      // Thời điểm hết hạn quy đổi ra giờ local của máy khách
      const expiryTimeLocal = expiryTimeServer + timeOffset;
      const difference = expiryTimeLocal - nowLocal;

      if (difference <= 0) {
        setTimeLeft(0);
        return;
      }

      const totalSeconds = Math.floor(difference / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [booking]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Giới hạn tối đa 10 hình
    const newFiles = [...proofFiles, ...files].slice(0, 10);
    setProofFiles(newFiles);

    const newPreviews = [];
    let processed = 0;

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        processed++;
        if (processed === newFiles.length) {
          setProofPreviews(newPreviews);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeProof = (index) => {
    const newFiles = proofFiles.filter((_, i) => i !== index);
    const newPreviews = proofPreviews.filter((_, i) => i !== index);
    setProofFiles(newFiles);
    setProofPreviews(newPreviews);
  };

  const handleIdCardChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const newFiles = [...idCardFiles, ...files].slice(0, 2);
    setIdCardFiles(newFiles);
    const newPreviews = [];
    let processed = 0;
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        newPreviews.push(reader.result);
        processed++;
        if (processed === newFiles.length) setIdCardPreviews([...newPreviews]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeIdCard = (index) => {
    setIdCardFiles(idCardFiles.filter((_, i) => i !== index));
    setIdCardPreviews(idCardPreviews.filter((_, i) => i !== index));
  };

  const handleCustomerPaid = () => {
    if (!booking) return;
    if (booking.status !== 'created') return;
    if (timeLeft === 0) {
      setError('Đơn hàng đã hết hạn thanh toán (30 phút). Vui lòng tạo đơn mới.');
      return;
    }
    if (proofFiles.length === 0) {
      setError('Vui lòng tải ít nhất một ảnh bill/chứng từ');
      return;
    }

    setError('');
    setSubmittingPaid(true);
    const form = new FormData();
    proofFiles.forEach((file) => {
      form.append('proof', file);
    });
    idCardFiles.forEach((file) => {
      form.append('id_card', file);
    });
    if (paymentNote.trim()) form.append('note', paymentNote.trim());

    api.post(`/bookings/${booking.id}/customer-paid`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(() => {
        navigate(`/my-bookings/${booking.id}`);
      })
      .catch((err) => {
        const errMsg = err.response?.data?.message || 'Lỗi khi upload bill';
        setError(errMsg);
      })
      .finally(() => setSubmittingPaid(false));
  };

  if (loading) return <div className="payment-loading">Đang tải thông tin thanh toán...</div>;

  if (error && !booking) {
    return (
      <div className="payment-error">
        <h1>Lỗi</h1>
        <p>{error}</p>
        <Link to="/" className="back-link">Quay về Trang chủ</Link>
      </div>
    );
  }

  if (!booking || !qr) return <div className="payment-loading">Không tìm thấy đơn hàng</div>;

  return (
    <div className="booking-payment-page">
      <div className="payment-top">
        <Link to="/" className="back-link">← Quay về</Link>
        <div className="payment-title-group">
          <h1>Thanh toán đơn {shortCode(booking.code)}</h1>
        </div>
      </div>

      <div className="payment-grid">
        <section className="qr-panel">
          <div style={{ width: '100%', lineHeight: 0, overflow: 'hidden' }}>
            <img
              src={qr.qr_image}
              alt={`QR ${qr.id}`}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
              }}
            />
          </div>
          <div className="qr-meta">
            <div className="qr-meta-row">
              <span className="label">Số tiền cần chuyển</span>
              <span className="value">{formatMoney(booking.transfer_amount)}</span>
            </div>
            <div className="qr-meta-row">
              <span className="label">Phí ({booking.fee_rate}%)</span>
              <span className="value">{formatMoney(booking.fee_amount)}</span>
            </div>
            <div className="qr-meta-row">
              <span className="label">Thực nhận</span>
              <span className="value">{formatMoney(booking.net_amount)}</span>
            </div>
            <div className="qr-meta-row">
              <span className="label">Thời gian tạo</span>
              <span className="value">{formatDateTime(booking.created_at)}</span>
            </div>
            {qr.note && (
              <div className="qr-note">
                <strong>Lưu ý:</strong> {qr.note}
              </div>
            )}
          </div>
        </section>

        <section className="upload-panel">
          <div className="panel-header-flex">
            <h2>Xác nhận đã chuyển tiền</h2>
          </div>
          
          {timeLeft !== null && (
            <div className={`payment-countdown ${timeLeft === 0 ? 'expired' : ''}`}>
              {timeLeft === 0 ? (
                <span>Đơn hàng đã hết hạn thanh toán (30 phút). Vui lòng tạo đơn mới.</span>
              ) : (
                <span>Thời gian còn lại để thanh toán: <strong>{timeLeft}</strong></span>
              )}
            </div>
          )}

          <p className="hint">Vui lòng quét mã QR bên trái để chuyển tiền, sau đó tải ảnh bill và ghi chú (nếu có) để chúng tôi xác nhận.</p>
          
          <div className="upload-form">
            <div className="field">
              <span>Ảnh bill/chứng từ (tối đa 10 ảnh)</span>
              <div className="proof-previews-grid">
                {proofPreviews.map((preview, index) => (
                  <div key={index} className="proof-preview-container">
                    <img src={preview} alt={`Proof preview ${index + 1}`} className="proof-preview-img" />
                    <button 
                      type="button" 
                      className="remove-proof-btn" 
                      onClick={() => removeProof(index)}
                      title="Xóa ảnh"
                    >
                      ×
                    </button>
                  </div>
                ))}
                
                {proofFiles.length < 3 && (
                  <label className="file-upload-box">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileChange}
                      disabled={booking.status !== 'created' || submittingPaid || timeLeft === 0}
                    />
                    <div className="upload-placeholder">
                      <div className="plus-icon">+</div>
                      <span>Thêm ảnh</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <div className="field">
              <span>Ảnh CCCD/Căn cước (tối đa 2 ảnh, tuỳ chọn)</span>
              <div className="proof-previews-grid">
                {idCardPreviews.map((preview, index) => (
                  <div key={index} className="proof-preview-container">
                    <img src={preview} alt={`CCCD ${index + 1}`} className="proof-preview-img" />
                    <button
                      type="button"
                      className="remove-proof-btn"
                      onClick={() => removeIdCard(index)}
                      title="Xóa ảnh"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {idCardFiles.length < 2 && (
                  <label className="file-upload-box">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleIdCardChange}
                      disabled={booking.status !== 'created' || submittingPaid || timeLeft === 0}
                    />
                    <div className="upload-placeholder">
                      <div className="plus-icon">+</div>
                      <span>Thêm ảnh CCCD</span>
                    </div>
                  </label>
                )}
              </div>
            </div>

            <label className="field">
              <span>Ghi chú (tuỳ chọn)</span>
              <textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Nhập ghi chú cho nhân viên..."
                rows={4}
                disabled={booking.status !== 'created' || submittingPaid || timeLeft === 0}
              />
            </label>

            {error && <div className="order-error">{error}</div>}

            <div className="amount-warning">
              <div className="warning-title">⚠️ Lưu ý quan trọng:</div>
              <ul className="warning-list">
                <li>Chỉ thanh toán trong hạn mức của thẻ. Nếu quẹt vượt hạn mức, giao dịch có thể bị <strong>hold (giữ tiền)</strong>.</li>
                <li>Nên chuyển số tiền lẻ (ví dụ: 1.250.000 VNĐ – số tiền có hàng nghìn) để dễ xử lý.</li>
                <li>Sử dụng thẻ thuộc ngân hàng được hỗ trợ.</li>
                <li>Sau khi thanh toán, chụp lại màn hình giao dịch thành công để làm bằng chứng.</li>
                <li>Hãy chuyển <strong>đúng chính xác</strong> số tiền để đơn hàng được duyệt bởi chúng tôi.</li>
              </ul>
            </div>

            <button
              className="create-btn"
              onClick={handleCustomerPaid}
              disabled={submittingPaid || booking.status !== 'created' || timeLeft === 0}
            >
              {submittingPaid ? 'Đang xử lý...' : 'Xác nhận đã chuyển tiền'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default BookingPayment;
