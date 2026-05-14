import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import './QRDetail.scss';

const QRDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [qr, setQr] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [amount, setAmount] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [savedBankAccounts, setSavedBankAccounts] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState(null);
  const [selectedBankQrImage, setSelectedBankQrImage] = useState(null);
  const [showManualInput, setShowManualInput] = useState(false);
  const [lightbox, setLightbox] = useState(null);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setLoading(true);
      setError('');
      setQr(null);
      setBankName('');
      setBankAccountNumber('');
      setAccountHolderName('');
      setAmount('');
      setAmountDisplay('');
      setSelectedBankQrImage(null);
    });

    api.get(`/qrs/ready/${id}`)
      .then((res) => {
        if (!active) return;
        setQr(res.data);
      })
      .catch((err) => {
        if (!active) return;
        setError(err.response?.data?.message || 'Không thể tải chi tiết QR');
      });

    api.get('/auth/me')
      .then((res) => {
        if (!active) return;
        setUser(res.data.user);
      })
      .catch(() => {
        if (!active) return;
        setUser(null);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    api.get('/bank-accounts')
      .then((res) => {
        if (!active) return;
        setSavedBankAccounts(res.data.data);
        const defaultBank = res.data.data.find(b => b.is_default);
        if (defaultBank) {
          setSelectedBankId(defaultBank.id);
          setBankName(defaultBank.bank_name);
          setBankAccountNumber(defaultBank.account_number);
          setAccountHolderName(defaultBank.account_holder);
          setSelectedBankQrImage(defaultBank.qr_image || null);
        } else if (res.data.data.length === 0) {
          setShowManualInput(true);
        }
      })
      .catch(() => {
        setShowManualInput(true);
      });

    return () => { active = false; };
  }, [id]);

  const computed = useMemo(() => {
    const amountNumber = Number(amount);
    let feeRateNumber = Number(qr?.fee_rate);
    const level = user?.level || 0;
    if (level === 1) feeRateNumber = Number(qr?.fee_rate_l1);
    else if (level === 2) feeRateNumber = Number(qr?.fee_rate_l2);
    else if (level === 3) feeRateNumber = Number(qr?.fee_rate_l3);
    const maxAmountNumber = Number(qr?.max_amount_per_trans);
    const isAmountValid = Number.isFinite(amountNumber) && amountNumber > 0;
    const overLimit = isAmountValid && Number.isFinite(maxAmountNumber) && amountNumber > maxAmountNumber;
    const fee = isAmountValid && Number.isFinite(feeRateNumber) ? (amountNumber * feeRateNumber) / 100 : 0;
    const net = isAmountValid ? amountNumber - fee : 0;
    return { amountNumber, feeRateNumber, maxAmountNumber, isAmountValid, overLimit, fee, net };
  }, [amount, qr, user]);

  const formatMoney = (value) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return '—';
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' VNĐ';
  };

  const handleCreateOrder = () => {
    if (!qr) return;
    if (!bankName.trim()) { setError('Vui lòng nhập tên ngân hàng'); return; }
    if (!bankAccountNumber.trim()) { setError('Vui lòng nhập số tài khoản'); return; }
    if (!accountHolderName.trim()) { setError('Vui lòng nhập tên chính chủ'); return; }
    if (!computed.isAmountValid) { setError('Vui lòng nhập số tiền khách chuyển hợp lệ'); return; }
    if (computed.overLimit) { setError('Số tiền vượt quá hạn mức của thẻ QR'); return; }

    setError('');
    setSubmittingCreate(true);
    api.post('/bookings', {
      qr_id: qr.id,
      customer_bank_name: bankName.trim(),
      customer_account_number: bankAccountNumber.trim(),
      customer_account_holder: accountHolderName.trim(),
      customer_bank_qr_image: selectedBankQrImage || null,
      transfer_amount: computed.amountNumber
    })
      .then((res) => { navigate(`/payment/${res.data.booking.id}`); })
      .catch((err) => { setError(err.response?.data?.message || 'Không thể tạo đơn hàng'); })
      .finally(() => setSubmittingCreate(false));
  };

  if (loading) return <div className="qr-detail-loading">Đang tải...</div>;

  if (!qr) {
    return (
      <div className="qr-detail-error">
        <h1>Không tìm thấy thẻ QR</h1>
        <p>{error || 'Thẻ QR không tồn tại hoặc đang bảo trì.'}</p>
        <Link to="/" className="back-link">Quay về Trang chủ</Link>
      </div>
    );
  }

  // Phí áp dụng cho user hiện tại
  const level = user?.level || 0;
  let myFeeRate = Number(qr.fee_rate);
  if (level === 1) myFeeRate = Number(qr.fee_rate_l1);
  else if (level === 2) myFeeRate = Number(qr.fee_rate_l2);
  else if (level === 3) myFeeRate = Number(qr.fee_rate_l3);

  return (
    <div className="qr-detail-page">
      <div className="qr-detail-top">
        <Link to="/" className="back-link">← Trang chủ</Link>
        <div className={`qr-status ${qr.status}`}>
          {qr.status === 'ready' ? 'Sẵn sàng' : 'Bảo trì'}
        </div>
      </div>

      {/* ── Layout 50/50: QR info bên trái, form tạo đơn bên phải ── */}
      <div className="qr-main-layout">

        {/* ── Thông tin QR ── */}
        <div className="qr-info-card">
          <div className="qr-info-images">
            {qr.main_image && (
              <div className="qr-info-img-wrap" onClick={() => setLightbox(qr.main_image)}>
                <img src={qr.main_image} alt="QR đại diện" />
                <span className="img-label">Thông tin thẻ QR</span>
              </div>
            )}
          </div>

          <div className="qr-info-details">
            <h2 className="qr-info-name">{qr.name || `QR #${qr.id}`}</h2>
            
            <div className="qr-info-rows">
              <div className="qr-info-row">
                <span className="qr-info-label">Hạn mức / lần</span>
                <span className="qr-info-value highlight">{formatMoney(qr.max_amount_per_trans)}</span>
              </div>
              <div className="qr-info-row">
                <span className="qr-info-label">Phí áp dụng</span>
                <span className="qr-info-value fee">{myFeeRate}%</span>
              </div>
              {qr.note && (
                <div className="qr-info-row note-row">
                  <span className="qr-info-label">Ghi chú</span>
                  <span className="qr-info-value note">{qr.note}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Form tạo đơn ── */}
        <div className="qr-detail-grid">
        <section className="order-panel">
          <h1>Tạo đơn</h1>
          <div className="order-form">
            {savedBankAccounts.length > 0 && (
              <div className="bank-selection-container">
                <span className="section-label">Chọn tài khoản nhận tiền</span>
                <div className="bank-cards-list">
                  {savedBankAccounts.map((bank) => (
                    <div
                      key={bank.id}
                      className={`bank-card-item ${selectedBankId === bank.id ? 'active' : ''}`}
                      onClick={() => {
                        setSelectedBankId(bank.id);
                        setBankName(bank.bank_name);
                        setBankAccountNumber(bank.account_number);
                        setAccountHolderName(bank.account_holder);
                        setSelectedBankQrImage(bank.qr_image || null);
                        setShowManualInput(false);
                      }}
                    >
                      <div className="bank-card-info">
                        <span className="bank-name">{bank.bank_name}</span>
                        <span className="account-number">{bank.account_number}</span>
                        <span className="account-holder">{bank.account_holder}</span>
                      </div>
                      {selectedBankId === bank.id && (
                        <div className="selected-badge">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      )}
                    </div>
                  ))}
                  <div
                    className={`bank-card-item manual-card ${showManualInput ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedBankId(null);
                      setShowManualInput(true);
                      setBankName('');
                      setBankAccountNumber('');
                      setAccountHolderName('');
                      setSelectedBankQrImage(null);
                    }}
                  >
                    <div className="manual-content">
                      <div className="plus-icon">+</div>
                      <span>Sử dụng tài khoản khác</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showManualInput && (
              <div className="manual-fields-group">
                <label className="field">
                  <span>Ngân hàng</span>
                  <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Ví dụ: Vietcombank" />
                </label>
                <label className="field">
                  <span>Số tài khoản</span>
                  <input type="text" inputMode="numeric" value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Nhập số tài khoản" />
                </label>
                <label className="field">
                  <span>Tên chính chủ</span>
                  <input type="text" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} placeholder="Nhập tên chính chủ" />
                </label>
              </div>
            )}

            <label className="field">
              <span>Tiền khách chuyển</span>
              <input
                type="text"
                inputMode="numeric"
                value={amountDisplay}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setAmount(val);
                  setAmountDisplay(val.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
                }}
                placeholder="Nhập số tiền (VNĐ)"
              />
            </label>

            {Number.isFinite(computed.maxAmountNumber) && (
              <div className="order-hint">
                Giới hạn chuyển 1 lần: {Math.round(computed.maxAmountNumber).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} VNĐ
              </div>
            )}



            <div className="order-summary">
              <div className="row">
                <span>Phí ({computed.feeRateNumber}%)</span>
                <span>{formatMoney(computed.fee)}</span>
              </div>
              <div className="row total">
                <span>Nhận được</span>
                <span>{formatMoney(computed.net)}</span>
              </div>
            </div>

            {error && <div className="order-error">{error}</div>}

            <div className="amount-warning">
              <div className="warning-title">⚠️ Lưu ý quan trọng:</div>
              <ul className="warning-list">
                <li>Chỉ thanh toán trong hạn mức của thẻ. Nếu quẹt vượt hạn mức, giao dịch có thể bị <strong>hold (giữ tiền)</strong>.</li>
                <li>Nên chuyển số tiền lẻ (ví dụ: 1.250.000 VNĐ) để dễ xử lý.</li>
                <li>Sau khi thanh toán, chụp lại màn hình giao dịch thành công để làm bằng chứng.</li>
                <li>Hãy chuyển <strong>đúng chính xác</strong> số tiền để đơn hàng được duyệt nhanh chóng.</li>
              </ul>
            </div>

            <button type="button" className="create-btn" onClick={handleCreateOrder} disabled={submittingCreate}>
              {submittingCreate ? 'Đang tạo...' : 'Tạo đơn'}
            </button>
          </div>
        </section>
      </div>

      </div>{/* end qr-main-layout */}

      {/* Lightbox */}
      {lightbox && (
        <div className="qr-lightbox" onClick={() => setLightbox(null)}>
          <div className="qr-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="qr-lightbox-close" onClick={() => setLightbox(null)}>×</button>
            <img src={lightbox} alt="Preview" />
          </div>
        </div>
      )}
    </div>
  );
};

export default QRDetail;
