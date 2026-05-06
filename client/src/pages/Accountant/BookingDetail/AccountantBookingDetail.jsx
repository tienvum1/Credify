import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import { 
  ChevronLeft,
  Upload, Shield, FileText
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
          } catch (error) {
            console.error('Lỗi parse accountant_paid_proof_urls:', error);
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
    
    const previews = newFiles.map(file => URL.createObjectURL(file));
    setProofPreviews(previews);
  };

  const removeFile = (index) => {
    const newFiles = [...proofFiles];
    newFiles.splice(index, 1);
    setProofFiles(newFiles);

    const newPreviews = [...proofPreviews];
    newPreviews.splice(index, 1);
    setProofPreviews(newPreviews);
  };

  const handleConfirmPaid = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (proofFiles.length === 0) return toast.warn('Vui lòng chọn ít nhất một ảnh bill chuyển tiền');

    const formData = new FormData();
    proofFiles.forEach(file => {
      formData.append('proof', file);
    });

    setUpdating(true);
    try {
      await api.post(`/bookings/accountant/${id}/confirm`, formData);
      toast.success('Xác nhận đã chuyển tiền thành công');
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || 'Lỗi khi xác nhận chuyển tiền');
    } finally {
      setUpdating(false);
    }
  };

  const formatMoney = (amount) => {
    return Number(amount || 0).toLocaleString('vi-VN') + 'đ';
  };

  if (loading) return <div className="loading-container"><div className="spinner"></div></div>;
  if (!booking) return null;

  return (
    <div className="accountant-detail-container">
      <div className="detail-header">
        <button className="back-btn" onClick={() => navigate('/accountant/bookings')}>
          <ChevronLeft size={20} /> Quay lại danh sách
        </button>
        <div className="booking-title">
          <h1>Chi tiết đơn hàng #{booking.code.slice(-8).toUpperCase()}</h1>
          <span className={`status-badge ${booking.status}`}>
            {booking.status === 'staff_confirmed' ? 'Chờ thanh toán' : 'Đã hoàn tất'}
          </span>
        </div>
      </div>

      <div className="detail-grid">
        <div className="main-info">
          {/* Bill của khách chuyển */}
          <div className="info-card customer-bill-card">
            <div className="card-header">
              <FileText size={20} />
              <h2>Hóa đơn khách đã chuyển</h2>
            </div>
            <div className="card-body">
              <div className="customer-proof-container">
                <img src={booking.customer_paid_proof_url} alt="Bill của khách" className="customer-proof-img" />
              </div>
            </div>
          </div>

          {/* Thông tin nguồn tiền của Admin */}
          <div className="info-card">
            <div className="card-header">
              <Shield size={20} />
              <h2>Nguồn tiền chuyển đi (Admin)</h2>
            </div>
            <div className="card-body">
              <div className="info-item">
                <span className="label">Tên Admin:</span>
                <span className="value">{booking.admin_account_holder}</span>
              </div>
              <div className="info-item">
                <span className="label">Số tài khoản Admin:</span>
                <span className="value mono">{booking.admin_account_number}</span>
              </div>
              <div className="info-item">
                <span className="label">Ngân hàng Admin:</span>
                <span className="value">{booking.admin_bank_name}</span>
              </div>
              <div className="info-item total">
                <span className="label">Số tiền cần chuyển:</span>
                <span className="value amount">{formatMoney(booking.transfer_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="action-sidebar">
          {booking.status === 'staff_confirmed' ? (
            <div className="confirm-card">
              <h3>Xác nhận chuyển tiền</h3>
              <p className="hint">Vui lòng tải ảnh màn hình biên lai chuyển tiền thành công (Tối đa 3 ảnh).</p>
              
              <form onSubmit={handleConfirmPaid}>
                <div className="upload-grid-multi">
                  {proofPreviews.map((preview, idx) => (
                    <div key={idx} className="preview-item">
                      <img src={preview} alt="Preview" />
                      <button type="button" className="remove-btn" onClick={() => removeFile(idx)}>×</button>
                    </div>
                  ))}
                  
                  {proofFiles.length < 3 && (
                    <div className="upload-box-mini" onClick={() => document.getElementById('proof-input').click()}>
                      <Upload size={24} />
                      <p>Thêm ảnh</p>
                    </div>
                  )}
                  <input 
                    id="proof-input" 
                    type="file" 
                    hidden 
                    multiple
                    accept="image/*" 
                    onChange={handleFileChange} 
                  />
                </div>
                
                <button type="submit" className="submit-confirm-btn" disabled={updating || proofFiles.length === 0}>
                  {updating ? 'Đang lưu...' : 'Xác nhận Đã chuyển tiền'}
                </button>
              </form>
            </div>
          ) : (
            <div className="completed-card">
              <h3>Đơn hàng đã hoàn tất</h3>
              <p>Kế toán đã chuyển tiền vào lúc:</p>
              <div className="time">{new Date(booking.accountant_paid_at).toLocaleString('vi-VN')}</div>
              
              <div className="proof-display-multi">
                <h4>Hóa đơn chuyển tiền:</h4>
                <div className="proof-grid">
                  {booking.proof_urls && booking.proof_urls.map((url, idx) => (
                    <img key={idx} src={url} alt={`Bill chuyển tiền ${idx + 1}`} onClick={() => window.open(url, '_blank')} />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountantBookingDetail;
