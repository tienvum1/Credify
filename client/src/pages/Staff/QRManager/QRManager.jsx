import { useState, useEffect } from 'react';
import api from '../../../api/axios';
import './QRManager.scss';

const StaffQRManager = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQr, setEditingQr] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  
  // Form states
  const [mainImageFile, setMainImageFile] = useState(null);
  const [qrImageFile, setQrImageFile] = useState(null);
  const [maxAmount, setMaxAmount] = useState('');
  const [feeRate, setFeeRate] = useState('');
  const [feeRateL1, setFeeRateL1] = useState('');
  const [feeRateL2, setFeeRateL2] = useState('');
  const [feeRateL3, setFeeRateL3] = useState('');
  const [note, setNote] = useState('');
  const [cardLines, setCardLines] = useState('');
  const [status, setStatus] = useState('ready');

  const refreshQRs = async () => {
    try {
      const res = await api.get('/qrs');
      setQrs(res.data);
    } catch {
      // toast.error sẽ được handle bởi axios interceptor
    }
  };

  useEffect(() => {
    const fetchQRs = async () => {
      try {
        const res = await api.get('/qrs');
        setQrs(res.data);
      } catch {
        // toast.error sẽ được handle bởi axios interceptor
      } finally {
        setLoading(false);
      }
    };
    fetchQRs();
  }, []);

  const resetForm = () => {
    setMainImageFile(null);
    setQrImageFile(null);
    setMaxAmount('');
    setFeeRate('');
    setFeeRateL1('');
    setFeeRateL2('');
    setFeeRateL3('');
    setNote('');
    setCardLines('');
    setStatus('ready');
    setEditingQr(null);
  };

  const handleEdit = (qr) => {
    setEditingQr(qr);
    setMaxAmount(qr.max_amount_per_trans);
    setFeeRate(qr.fee_rate);
    setFeeRateL1(qr.fee_rate_l1 || '');
    setFeeRateL2(qr.fee_rate_l2 || '');
    setFeeRateL3(qr.fee_rate_l3 || '');
    setNote(qr.note || '');
    setCardLines(Array.isArray(qr.card_lines) ? qr.card_lines.join(', ') : (qr.card_lines || ''));
    setStatus(qr.status || 'ready');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    if (mainImageFile) formData.append('main_image', mainImageFile);
    if (qrImageFile) formData.append('qr_image', qrImageFile);
    formData.append('max_amount_per_trans', maxAmount);
    formData.append('fee_rate', feeRate);
    formData.append('fee_rate_l1', feeRateL1);
    formData.append('fee_rate_l2', feeRateL2);
    formData.append('fee_rate_l3', feeRateL3);
    formData.append('note', note);
    formData.append('status', status);
    
    // Gửi card_lines dưới dạng chuỗi (backend đã có logic parse)
    formData.append('card_lines', cardLines);

    try {
      if (editingQr) {
        await api.put(`/qrs/${editingQr.id}`, formData);
      } else {
        await api.post('/qrs', formData);
      }
      setShowModal(false);
      resetForm();
      refreshQRs();
    } catch (err) {
      console.error('Lỗi chi tiết:', err.response?.data || err.message);
    }
  };

  if (loading) return <div className="loading">Đang tải...</div>;

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (Number.isNaN(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
  };

  const formatDateTime = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    // Cộng thêm 7 tiếng (UTC+7)
    d.setHours(d.getHours() + 7);
    return d.toLocaleString('vi-VN');
  };

  const handleToggleStatus = async (qr) => {
    const nextStatus = qr.status === 'ready' ? 'maintenance' : 'ready';
    setUpdatingId(qr.id);
    try {
      await api.patch(`/qrs/${qr.id}/status`, { status: nextStatus });
      await refreshQRs();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  const normalizeCardLines = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter(Boolean);
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) {
        void e;
      }
      return raw.split(',').map((s) => s.trim()).filter(Boolean);
    }
    return [];
  };

  const filteredQrs = qrs.filter((qr) => {
    return statusFilter === 'all' ? true : qr.status === statusFilter;
  });

  return (
    <div className="staff-qr-page">
      <div className="qr-toolbar">
        <div className="qr-title">
          <h1>Quản lý thẻ QR</h1>
          <p>{filteredQrs.length} / {qrs.length} thẻ</p>
        </div>

        <div className="qr-controls">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">Tất cả</option>
            <option value="ready">Sẵn sàng</option>
            <option value="maintenance">Bảo trì</option>
          </select>

          <button
            className="primary-btn"
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
          >
            + Thêm thẻ
          </button>
        </div>
      </div>

      <div className="table-shell">
        <table className="qr-table">
          <thead>
            <tr>
              <th className="th-stt">ID</th>
              <th className="th-img">Ảnh đại diện</th>
              <th className="th-img">Ảnh QR</th>
              <th className="th-money">Số tiền tối đa 1 lần chuyển</th>
              <th className="th-fee">Phí</th>
              <th className="th-lines">Thẻ hỗ trợ</th>
              <th className="th-date">Ngày tạo</th>
              <th className="th-date">Ngày cập nhật</th>
              <th className="th-status">Trạng thái QR</th>
              <th className="th-actions">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredQrs.length === 0 ? (
              <tr>
                <td colSpan={10} className="empty">
                  Không có dữ liệu phù hợp.
                </td>
              </tr>
            ) : (
              filteredQrs.map((qr) => {
                const statusText = qr.status === 'ready' ? 'Sẵn sàng' : 'Bảo trì';
                return (
                  <tr key={qr.id}>
                    <td data-label="ID" className="td-stt">
                      #{qr.id}
                    </td>
                    <td data-label="Ảnh đại diện" className="td-img">
                      <div className="qr-cell">
                        <button
                          type="button"
                          className="qr-thumb-btn"
                          onClick={() => setPreviewImageUrl(qr.main_image)}
                          title="Xem ảnh đại diện"
                        >
                          <img className="qr-thumb" src={qr.main_image} alt={`Main ${qr.id}`} />
                        </button>
                      </div>
                    </td>
                    <td data-label="Ảnh QR" className="td-img">
                      <div className="qr-cell">
                        <button
                          type="button"
                          className="qr-thumb-btn"
                          onClick={() => setPreviewImageUrl(qr.qr_image)}
                          title="Xem mã QR"
                        >
                          <img className="qr-thumb" src={qr.qr_image} alt={`QR ${qr.id}`} />
                        </button>
                      </div>
                    </td>
                    <td data-label="Số tiền tối đa 1 lần chuyển" className="td-money">
                      <span className="money-value">{formatMoney(qr.max_amount_per_trans)}</span>
                    </td>
                    <td data-label="Phí" className="td-fee">
                      <span className="fee-badge">{qr.fee_rate}%</span>
                    </td>
                    <td data-label="Thẻ hỗ trợ" className="td-lines">
                      <div className="card-lines-chips">
                        {normalizeCardLines(qr.card_lines).map((line, idx) => (
                          <span key={idx} className="card-line-chip">{line}</span>
                        ))}
                      </div>
                    </td>
                    <td data-label="Ngày tạo" className="td-date">{formatDateTime(qr.created_at)}</td>
                    <td data-label="Ngày cập nhật" className="td-date">{formatDateTime(qr.updated_at)}</td>
                    <td data-label="Trạng thái QR" className="td-status">
                      <button
                        type="button"
                        className="status-toggle-btn"
                        onClick={() => handleToggleStatus(qr)}
                        disabled={updatingId === qr.id}
                        title="Bấm để đổi trạng thái"
                      >
                        {statusText}
                      </button>
                    </td>
                    <td data-label="Thao tác" className="td-actions">
                      <div className="row-actions">
                        <button type="button" className="ghost-btn" onClick={() => handleEdit(qr)}>Sửa</button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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
            <img src={previewImageUrl} alt="QR preview" className="image-preview-img" />
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>{editingQr ? 'Chỉnh sửa QR' : 'Thêm QR mới'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ảnh đại diện (hiển thị ở Card ngoài):</label>
                <input type="file" onChange={(e) => setMainImageFile(e.target.files[0])} required={!editingQr} />
              </div>
              <div className="form-group">
                <label>Ảnh mã QR (khách quét):</label>
                <input type="file" onChange={(e) => setQrImageFile(e.target.files[0])} required={!editingQr} />
              </div>
              <div className="form-group">
                <label>Mức tiền tối đa (VNĐ):</label>
                <input type="number" value={maxAmount} onChange={(e) => setMaxAmount(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Tỷ lệ phí mặc định (%):</label>
                <input type="number" step="0.01" value={feeRate} onChange={(e) => setFeeRate(e.target.value)} required />
              </div>
              <div className="fee-levels-grid">
                <div className="form-group">
                  <label>Phí Cấp 1 (%):</label>
                  <input type="number" step="0.01" value={feeRateL1} onChange={(e) => setFeeRateL1(e.target.value)} placeholder="Mặc định" />
                </div>
                <div className="form-group">
                  <label>Phí Cấp 2 (%):</label>
                  <input type="number" step="0.01" value={feeRateL2} onChange={(e) => setFeeRateL2(e.target.value)} placeholder="Mặc định" />
                </div>
                <div className="form-group">
                  <label>Phí Cấp 3 (%):</label>
                  <input type="number" step="0.01" value={feeRateL3} onChange={(e) => setFeeRateL3(e.target.value)} placeholder="Mặc định" />
                </div>
              </div>
              <div className="form-group">
                <label>Dòng thẻ hỗ trợ (cách nhau bằng dấu phẩy):</label>
                <input type="text" value={cardLines} onChange={(e) => setCardLines(e.target.value)} placeholder="Ví dụ: Visa, Master, Napas" />
              </div>
              <div className="form-group">
                <label>Ghi chú:</label>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <div className="form-group">
                <label>Trạng thái:</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="ready">Sẵn sàng</option>
                  <option value="maintenance">Bảo trì</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="submit" className="save-btn">Lưu</button>
                <button type="button" className="cancel-btn" onClick={() => setShowModal(false)}>Hủy</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffQRManager;
