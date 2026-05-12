import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { toast } from 'react-toastify';
import './AccountantQRManager.scss';

const AccountantQRManager = () => {
  const navigate = useNavigate();
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingQr, setEditingQr] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Form states
  const [mainImageFile, setMainImageFile] = useState(null);
  const [qrImageFile, setQrImageFile] = useState(null);
  const [qrName, setQrName] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [feeRate, setFeeRate] = useState('');
  const [feeRateL1, setFeeRateL1] = useState('');
  const [feeRateL2, setFeeRateL2] = useState('');
  const [feeRateL3, setFeeRateL3] = useState('');
  const [note, setNote] = useState('');

  const refreshQRs = async () => {
    try {
      const res = await api.get('/qrs');
      setQrs(res.data);
    } catch { /* handled by interceptor */ }
  };

  useEffect(() => {
    api.get('/qrs')
      .then(res => setQrs(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
  };

  const handleMaxAmountChange = (e) => {
    const raw = e.target.value.replace(/\./g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      setMaxAmount(raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
    }
  };

  const handleEdit = (qr) => {
    setEditingQr(qr);
    setQrName(qr.name || '');
    setMaxAmount(
      qr.max_amount_per_trans
        ? Math.round(qr.max_amount_per_trans).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        : ''
    );
    setFeeRate(qr.fee_rate ?? '');
    setFeeRateL1(qr.fee_rate_l1 ?? '');
    setFeeRateL2(qr.fee_rate_l2 ?? '');
    setFeeRateL3(qr.fee_rate_l3 ?? '');
    setNote(qr.note || '');
    setMainImageFile(null);
    setQrImageFile(null);
  };

  const resetForm = () => {
    setEditingQr(null);
    setQrName(''); setMaxAmount(''); setFeeRate('');
    setFeeRateL1(''); setFeeRateL2(''); setFeeRateL3('');
    setNote(''); setMainImageFile(null); setQrImageFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || !editingQr) return;
    setSubmitting(true);

    const formData = new FormData();
    if (mainImageFile) formData.append('main_image', mainImageFile);
    if (qrImageFile) formData.append('qr_image', qrImageFile);
    formData.append('max_amount_per_trans', maxAmount.replace(/\./g, ''));

    try {
      await api.put(`/qrs/${editingQr.id}/accountant`, formData);
      toast.success('Cập nhật QR thành công');
      resetForm();
      refreshQRs();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi cập nhật QR');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  const editableQrs = qrs.filter(qr => qr.accountant_editable);

  return (
    <div className="acc-qr-page">
      {/* ── Header ── */}
      <div className="acc-qr-header">
        <button className="back-btn" onClick={() => { resetForm(); navigate('/accountant/bookings'); }}>
          ← Quay lại
        </button>
        <div className="acc-qr-title">
          <h1>Quản lý QR</h1>
          <p>{qrs.length} thẻ — {editableQrs.length} được phép chỉnh sửa</p>
        </div>
        <div className="acc-qr-header-spacer" />
      </div>

      {/* ── Edit form ── */}
      {editingQr ? (
        <div className="acc-qr-form-wrap">
          <div className="form-header">
            <h2>Chỉnh sửa QR</h2>
            <p>{editingQr.name}</p>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Ảnh mã QR (để trống nếu không đổi)</label>
              <input type="file" accept="image/*" onChange={(e) => setQrImageFile(e.target.files[0])} />
            </div>
            <div className="form-group">
              <label>Hạn mức tối đa (VNĐ)</label>
              <input type="text" value={maxAmount} onChange={handleMaxAmountChange} required placeholder="Ví dụ: 4.000.000" />
            </div>
            <div className="form-actions">
              <button type="submit" className="save-btn" disabled={submitting}>
                {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
              <button type="button" className="cancel-btn" onClick={resetForm} disabled={submitting}>
                Hủy
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="acc-qr-grid">
          {qrs.map((qr) => (
            <div key={qr.id} className="acc-qr-card">
              {/* Images */}
              <div className="card-images">
                <div className="card-img-wrap" onClick={() => setLightboxUrl(qr.main_image)}>
                  <img src={qr.main_image} alt={`Ảnh đại diện ${qr.name}`} />
                  <span className="img-label">Ảnh đại diện</span>
                </div>
                <div className="card-img-wrap" onClick={() => setLightboxUrl(qr.qr_image)}>
                  <img src={qr.qr_image} alt={`Mã QR ${qr.name}`} />
                  <span className="img-label">Mã QR</span>
                </div>
              </div>

              {/* Body */}
              <div className="card-body">
                <div className="card-name">#{qr.id} — {qr.name || '—'}</div>

                <div className="card-rows">
                  <div className="card-row">
                    <span className="row-label">Hạn mức</span>
                    <span className="row-value money">{formatMoney(qr.max_amount_per_trans)}</span>
                  </div>
                  {qr.note && (
                    <div className="card-row">
                      <span className="row-label">Ghi chú</span>
                      <span className="row-value">{qr.note}</span>
                    </div>
                  )}
                </div>

                <div className="fee-grid">
                  <div className="fee-row">
                    <span className="fee-label">Phí mặc định</span>
                    <span className="fee-val def">{qr.fee_rate}%</span>
                  </div>
                  <div className="fee-row">
                    <span className="fee-label">Phí Cấp 1</span>
                    <span className="fee-val l1">{qr.fee_rate_l1}%</span>
                  </div>
                  <div className="fee-row">
                    <span className="fee-label">Phí Cấp 2</span>
                    <span className="fee-val l2">{qr.fee_rate_l2}%</span>
                  </div>
                  <div className="fee-row">
                    <span className="fee-label">Phí Cấp 3</span>
                    <span className="fee-val l3">{qr.fee_rate_l3}%</span>
                  </div>
                </div>

                <div className={`card-status ${qr.status}`}>
                  {qr.status === 'ready' ? '● Sẵn sàng' : '● Bảo trì'}
                </div>
              </div>

              {/* Footer */}
              <div className="card-footer">
                {qr.accountant_editable ? (
                  <button type="button" className="edit-btn" onClick={() => handleEdit(qr)}>
                    ✏️ Chỉnh sửa
                  </button>
                ) : (
                  <span className="edit-locked">🔒 Không có quyền sửa</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightboxUrl && (
        <div className="acc-qr-lightbox" onClick={() => setLightboxUrl(null)}>
          <div className="lightbox-inner" onClick={(e) => e.stopPropagation()}>
            <button className="lightbox-close" onClick={() => setLightboxUrl(null)}>×</button>
            <img src={lightboxUrl} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountantQRManager;
