import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../../api/axios';
import '../Auth.scss';

const Register = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      return setError('Mật khẩu xác nhận không khớp');
    }

    try {
      await api.post('/auth/register', {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password
      });
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Đăng ký thất bại');
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card success-card">
          <div className="success-icon">
            <i className="fas fa-paper-plane"></i>
          </div>
          <h2>Kiểm tra Email của bạn</h2>
          <p>Chúng tôi đã gửi một liên kết xác nhận đến địa chỉ <strong>{formData.email}</strong>.</p>
          <p>Vui lòng nhấp vào liên kết trong email để kích hoạt tài khoản của bạn.</p>
          <button className="auth-btn" onClick={() => navigate('/login')}>
            <i className="fas fa-sign-in-alt"></i>
            Đăng nhập ngay
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h2>Tạo tài khoản mới</h2>
          <p>Tham gia với chúng tôi để bắt đầu quản lý thẻ của bạn</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle"></i>
              {error}
            </div>
          )}
          
          <div className="form-group">
            <label>Họ và tên</label>
            <div className="input-wrapper">
              <i className="fas fa-user"></i>
              <input 
                type="text" 
                name="full_name" 
                placeholder="Nguyễn Văn A"
                value={formData.full_name} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

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

          <div className="form-group">
            <label>Xác nhận mật khẩu</label>
            <div className="input-wrapper">
              <i className="fas fa-shield-alt"></i>
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmPassword" 
                placeholder="••••••••"
                className="password-input"
                value={formData.confirmPassword} 
                onChange={handleChange} 
                required 
              />
              <i 
                className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              ></i>
            </div>
          </div>

          <button type="submit" className="auth-btn">
            Đăng Ký
            <i className="fas fa-user-plus"></i>
          </button>

          <p className="auth-footer">
            <span>Đã có tài khoản?</span>
            <Link to="/login" className="back-link">
              <i className="fas fa-arrow-left"></i>
              Quay lại Đăng nhập
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Register;
