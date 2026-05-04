import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../../api/axios';
import { GoogleLogin } from '@react-oauth/google';
import '../Auth.scss';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', formData);
      // Lưu thông tin user vào localStorage (không lưu token vì đã dùng cookie)
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng nhập thất bại');
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const res = await api.post('/auth/google-login', {
        credential: credentialResponse.credential
      });
      localStorage.setItem('user', JSON.stringify(res.data.user));
      window.location.href = '/';
    } catch (err) {
      console.error('Google login error:', err);
      setError('Đăng nhập Google thất bại');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Chào mừng trở lại</h2>
          <p>Đăng nhập để tiếp tục quản lý thẻ của bạn</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label>Email</label>
            <div className="input-wrapper">
              <i className="fas fa-envelope"></i>
              <input 
                type="email" 
                name="email" 
                placeholder="example@gmail.com"
                value={formData.email} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mật khẩu</label>
            <div className="input-wrapper">
              <i className="fas fa-lock"></i>
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" 
                placeholder="••••••••"
                className="password-input"
                value={formData.password} 
                onChange={handleChange} 
                required 
              />
              <i 
                className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                onClick={() => setShowPassword(!showPassword)}
              ></i>
            </div>
          </div>

          <div className="form-options">
            <Link to="/forgot-password" id="forgot-password">Quên mật khẩu?</Link>
          </div>

          <button type="submit" className="auth-btn">
            Đăng Nhập
            <i className="fas fa-arrow-right"></i>
          </button>

          <div className="divider">
            <span>Hoặc đăng nhập với</span>
          </div>

          <div className="social-login">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setError('Đăng nhập Google thất bại')}
              theme="outline"
              size="large"
              width="100%"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          <p className="auth-footer">
            <span>Chưa có tài khoản?</span>
            <Link to="/register" className="register-link">
              Đăng ký tài khoản mới
              <i className="fas fa-user-plus"></i>
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
