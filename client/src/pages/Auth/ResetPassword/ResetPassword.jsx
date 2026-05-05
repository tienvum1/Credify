import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../../api/axios';
import '../Auth.scss';

const ResetPassword = () => {
  const { token } = useParams();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword
      });
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Đặt lại mật khẩu</h2>
          <p>Nhập mật khẩu mới cho tài khoản của bạn</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}

          <div className="form-group">
            <label>Mật khẩu mới</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="password-input"
                value={newPassword} 
                onChange={(e) => setNewPassword(e.target.value)} 
                required 
              />
              <i 
                className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>
          </div>

          <div className="form-group">
            <label>Xác nhận mật khẩu mới</label>
            <div className="input-wrapper">
              <i className="fas fa-shield-alt"></i>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                placeholder="••••••••"
                className="password-input"
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                required 
              />
              <i 
                className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              ></i>
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            {!loading && <i className="fas fa-key"></i>}
          </button>

          <p className="auth-footer">
            <Link to="/login">Quay lại Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
