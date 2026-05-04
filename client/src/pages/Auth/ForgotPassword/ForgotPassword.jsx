import { useState } from 'react';
import api from '../../../api/axios';
import { Link } from 'react-router-dom';
import '../Auth.scss';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(res.data.message);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
      setMessage('');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Quên mật khẩu</h2>
          <p>Nhập email của bạn để nhận liên kết đặt lại mật khẩu</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {message && (
            <div className="success-message" style={{ background: '#ecfdf5', color: '#059669', padding: '12px', borderRadius: '12px', marginBottom: '24px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <i className="fas fa-check-circle"></i>
              {message}
            </div>
          )}
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Email đăng ký</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope"></i>
              <input 
                type="email" 
                placeholder="example@gmail.com"
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="auth-btn">
            Gửi yêu cầu
            <i className="fas fa-paper-plane"></i>
          </button>
          
          <p className="auth-footer">
            Nhớ mật khẩu? <Link to="/login">Quay lại Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
