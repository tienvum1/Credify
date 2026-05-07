import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api/axios';
import './MyBookingDetail.scss';

const MyBookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [qr, setQr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  
  const [proofFiles, setProofFiles] = useState([]);
  const [proofPreviews, setProofPreviews] = useState([]);
  const [idCardFiles, setIdCardFiles] = useState([]);
  const [idCardPreviews, setIdCardPreviews] = useState([]);
  const [paymentNote, setPaymentNote] = useState('');
  const [submittingPaid, setSubmittingPaid] = useState(false);
  const [error, setError] = useState('');

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
    return <span className={`status-tag ${status}`}>{label}</span>;
  };

  const shortCode = (code) => {
    const raw = String(code || '');
    return raw.length <= 6 ? raw : raw.slice(-6);
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const res = await api.get(`/bookings/my/${id}`);
        if (active) {
          setBooking(res.data);
          if (res.data.status === 'created') {
            const qrRes = await api.get(`/qrs/ready/${res.data.qr_id}`);
            if (active) setQr(qrRes.data);
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải chi tiết đơn hàng:', err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();

    return () => {
      active = false;
    };
  }, [id]);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...proofFiles, ...newFiles].slice(0, 3);
    setProofFiles(updatedFiles);
    
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
      setProofPreviews(previews);
    };

    generatePreviews();
  };

  const removeProof = (index) => {
    const newFiles = [...proofFiles];
    newFiles.splice(index, 1);
    setProofFiles(newFiles);

    const newPreviews = [...proofPreviews];
    newPreviews.splice(index, 1);
    setProofPreviews(newPreviews);
  };

  const handleIdCardChange = (e) => {
    const newFiles = Array.from(e.target.files);
    const updatedFiles = [...idCardFiles, ...newFiles].slice(0, 2);
    setIdCardFiles(updatedFiles);
    const generatePreviews = async () => {
      const previews = await Promise.all(
        updatedFiles.map((file) => new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(file);
        }))
      );
      setIdCardPreviews(previews);
    };
    generatePreviews();
  };

  const removeIdCard = (index) => {
    const newFiles = [...idCardFiles];
    newFiles.splice(index, 1);
    setIdCardFiles(newFiles);
    const newPreviews = [...idCardPreviews];
    newPreviews.splice(index, 1);
    setIdCardPreviews(newPreviews);
  };

  const handleCustomerPaid = () => {
    if (!booking) return;
    if (booking.status !== 'created') return;
    if (proofFiles.length === 0) {
      setError('Vui lòng tải ảnh bill/chứng từ');
      return;
    }

    setError('');
    setSubmittingPaid(true);
    const form = new FormData();
    proofFiles.forEach(file => {
      form.append('proof', file);
    });
    idCardFiles.forEach(file => {
      form.append('id_card', file);
    });
    if (paymentNote.trim()) form.append('note', paymentNote.trim());

    api.post(`/bookings/${booking.id}/customer-paid`, form, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
      .then(() => {
        window.location.reload();
      })
      .catch((err) => {
        const errMsg = err.response?.data?.message || 'Lỗi khi upload bill';
        setError(errMsg);
      })
      .finally(() => setSubmittingPaid(false));
  };

  if (loading) return <div className="booking-detail-loading">Đang tải...</div>;
  if (!booking) return <div className="booking-detail-loading">Không tìm thấy đơn</div>;

  return (
    <div className="booking-detail-page">
      <div className="booking-detail-top">
        <button type="button" className="back-btn" onClick={() => navigate('/my-bookings')}>
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
          <tr><th>Ghi chú của bạn</th><td>{booking.customer_paid_note || '—'}</td></tr>
          <tr><th>Lý do từ chối (nếu có)</th><td>{booking.reject_note || '—'}</td></tr>
          <tr><th>Tạo lúc</th><td>{formatDateTime(booking.created_at)}</td></tr>
          <tr><th>Thanh toán lúc</th><td>{formatDateTime(booking.paid_at)}</td></tr>
          <tr><th>Hoàn thành lúc</th><td>{formatDateTime(booking.confirmed_at)}</td></tr>
          <tr><th>Trạng thái</th><td>
            {statusLabel(booking.status)}
          </td></tr>
          <tr>
            <th>Ảnh bill đã tải</th>
            <td>
              <div className="proof-images-grid">
                {booking.proof_urls && booking.proof_urls.length > 0 ? (
                  booking.proof_urls.map((url, index) => (
                    <div key={index} className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(url)}>
                      <img 
                        src={url} 
                        alt={`Bill ${index + 1}`} 
                        className="proof-thumb" 
                      />
                      <span className="thumb-label">Bill của bạn {index + 1}</span>
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
              <th>Ảnh bill nhân viên gửi</th>
              <td>
                <div className="proof-images-grid">
                  {booking.staff_proof_urls.map((url, index) => (
                    <div key={index} className="proof-thumb-wrapper staff" onClick={() => setPreviewImageUrl(url)}>
                      <img 
                        src={url} 
                        alt={`Staff Bill ${index + 1}`} 
                        className="proof-thumb" 
                      />
                      <span className="thumb-label">Bill nhân viên {index + 1}</span>
                    </div>
                  ))}
                </div>
              </td>
            </tr>
          )}
          {booking.id_card_urls && booking.id_card_urls.length > 0 && (
            <tr>
              <th>Ảnh CCCD đã tải</th>
              <td>
                <div className="proof-images-grid">
                  {booking.id_card_urls.map((url, index) => (
                    <div key={index} className="proof-thumb-wrapper" onClick={() => setPreviewImageUrl(url)}>
                      <img src={url} alt={`CCCD ${index + 1}`} className="proof-thumb" />
                      <span className="thumb-label">CCCD {index + 1}</span>
                    </div>
                  ))}
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

      {booking.status === 'created' && qr && (
        <div className="payment-confirmation-section">
          <h2>Xác nhận đã chuyển tiền</h2>
          <div className="payment-grid">
            <section className="qr-panel">
              <div className="qr-image">
                <img src={qr.qr_image} alt={`QR ${qr.id}`} />
              </div>
              <div className="qr-meta">
                <div className="qr-meta-row">
                  <span className="label">Số tiền cần chuyển</span>
                  <span className="value">{formatMoney(booking.transfer_amount)}</span>
                </div>
                {qr.note && (
                  <div className="qr-note">
                    <strong>Lưu ý:</strong> {qr.note}
                  </div>
                )}
              </div>
            </section>

            <section className="upload-panel">
              <p className="hint">Vui lòng quét mã QR để chuyển tiền, sau đó tải ảnh bill và ghi chú để chúng tôi xác nhận.</p>
              
              <div className="upload-form">
                <div className="field">
                  <span>Ảnh bill/chứng từ (Tối đa 3 ảnh)</span>
                  <div className="proof-upload-grid">
                    {proofPreviews.map((preview, idx) => (
                      <div key={idx} className="proof-preview-container">
                        <img src={preview} alt={`Preview ${idx}`} className="proof-preview-img" />
                        <button 
                          type="button" 
                          className="remove-proof-btn" 
                          onClick={() => removeProof(idx)}
                          title="Xóa ảnh"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    
                    {proofPreviews.length < 3 && (
                      <label className="file-upload-box">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleFileChange}
                          disabled={submittingPaid}
                        />
                        <div className="upload-placeholder">
                          <span className="plus">+</span>
                          <span>Thêm ảnh bill</span>
                        </div>
                      </label>
                    )}
                  </div>
                </div>

                <div className="field">
                  <span>Ảnh CCCD/Căn cước (Tối đa 2 ảnh, tuỳ chọn)</span>
                  <div className="proof-upload-grid">
                    {idCardPreviews.map((preview, idx) => (
                      <div key={idx} className="proof-preview-container">
                        <img src={preview} alt={`CCCD ${idx}`} className="proof-preview-img" />
                        <button
                          type="button"
                          className="remove-proof-btn"
                          onClick={() => removeIdCard(idx)}
                          title="Xóa ảnh"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {idCardPreviews.length < 2 && (
                      <label className="file-upload-box">
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={handleIdCardChange}
                          disabled={submittingPaid}
                        />
                        <div className="upload-placeholder">
                          <span className="plus">+</span>
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
                    disabled={submittingPaid}
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
                    <li>Hãy chuyển <strong>đúng chính xác</strong> số tiền để đơn hàng được duyệt nhanh chóng.</li>
                  </ul>
                </div>

                <button 
                  type="button" 
                  className="confirm-paid-btn" 
                  onClick={handleCustomerPaid}
                  disabled={submittingPaid}
                >
                  {submittingPaid ? 'Đang xử lý...' : 'Xác nhận đã chuyển tiền'}
                </button>
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBookingDetail;
