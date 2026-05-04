import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../../api/axios';
import '../Auth.scss';

const VerifyEmail = () => {
  const { token } = useParams();
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const navigate = useNavigate();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const verify = async () => {
      try {
        const res = await api.get(`/auth/verify-email/${token}`);
        setStatus('success');
        setMessage(res.data.message);
      } catch (err) {
        // Nếu server báo lỗi nhưng thực tế tài khoản có thể đã được xác nhận (ví dụ click 2 lần)
        // Chúng ta có thể kiểm tra message từ server để đưa ra UI phù hợp
        setStatus('error');
        setMessage(err.response?.data?.message || 'Mã xác nhận không hợp lệ hoặc đã hết hạn.');
      }
    };
    verify();
  }, [token]);

  return (
    <div className="auth-container">
      <div className={`auth-card verify-card ${status}`}>
        {status === 'verifying' && (
          <div className="verify-content">
            <div className="verify-icon loading">
              <div className="spinner-ring"></div>
              <i className="fas fa-envelope-open-text"></i>
            </div>
            <h2>Đang xác thực email</h2>
            <p>Vui lòng đợi trong giây lát, chúng tôi đang kiểm tra mã xác nhận của bạn...</p>
          </div>
        )}

        {status === 'success' && (
          <div className="verify-content scale-in">
            <div className="verify-icon success">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2>Xác thực thành công!</h2>
            <p className="success-msg">{message}</p>
            <div className="verify-details">
              <p>Bây giờ bạn có thể sử dụng đầy đủ các tính năng của hệ thống.</p>
            </div>
            <button className="auth-btn" onClick={() => navigate('/login')}>
              <span>Đăng nhập ngay</span>
              <i className="fas fa-arrow-right"></i>
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="verify-content scale-in">
            <div className="verify-icon error">
              <i className="fas fa-exclamation-triangle"></i>
            </div>
            <h2>Xác thực không thành công</h2>
            <p className="error-msg">{message}</p>
            
            <div className="error-actions">
              <button className="auth-btn primary" onClick={() => navigate('/login')}>
                <span>Thử Đăng nhập</span>
                <i className="fas fa-sign-in-alt"></i>
              </button>
              
              <div className="divider">
                <span>Hoặc</span>
              </div>

              <Link to="/register" className="auth-btn secondary">
                <i className="fas fa-user-plus"></i>
                <span>Đăng ký tài khoản mới</span>
              </Link>
            </div>

            <p className="auth-footer">
              Bạn gặp sự cố? <a href="mailto:support@example.com">Gửi yêu cầu hỗ trợ</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
