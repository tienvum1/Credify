import { useState } from 'react';
import { Link } from 'react-router-dom';
import { User, LogOut, Settings, HelpCircle, Menu, X, BarChart2, ShoppingCart,  LayoutDashboard } from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';
import './Header.scss';

const Header = ({ user, handleLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Left: Hamburger (Mobile Only) & Logo */}
        <div className="header-left">
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <Link to="/" className="logo-container" onClick={() => setIsMenuOpen(false)}>
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVW7rlSPHTehp-w35Km0QF380L2eZC-RuZmw&s" alt="Credify.vn Logo" className="logo-img" />
            <span className="brand-name">Credify</span>
          </Link>
          
          <nav className={`header-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
            {user?.role === 'accountant' ? (
              <>
                <Link to="/accountant/bookings" className="nav-item" onClick={() => setIsMenuOpen(false)}>
                  Quản lý thanh toán
                </Link>
                <Link to="/accountant/qrs" className="nav-item" onClick={() => setIsMenuOpen(false)}>
                  Quản lý QR
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="nav-item" onClick={() => setIsMenuOpen(false)}>Trang chủ</Link>
              </>
            )}
          </nav>
        </div>

        {/* Right: Actions */}
        <div className="header-right">
          {user ? (
            <div className="user-actions">
              <NotificationDropdown user={user} />

              {/* User Avatar & Dropdown - ALWAYS VISIBLE */}
              <div className="user-profile">
                <div className="avatar-wrapper">
                  {user.picture ? (
                    <img src={user.picture} alt="Avatar" className="user-avatar" />
                  ) : (
                    <div className="avatar-placeholder">
                      {user.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                </div>
                
                <div className="user-dropdown">
                  <div className="dropdown-header">
                    <p className="user-name">{user.full_name}</p>
                    <p className="user-email">{user.email}</p>
                    <span className="role-badge">{user.role}</span>
                  </div>
                  <hr />
                  <Link to="/profile" className="dropdown-item">
                    <User size={16} /> Hồ sơ cá nhân
                  </Link>
                  {user?.role === 'user' && (
                    <Link to="/my-bookings" className="dropdown-item">
                      <ShoppingCart size={16} /> Đơn của tôi
                    </Link>
                  )}
                  {user?.role === 'admin_system' && (
                    <Link to="/admin/users" className="dropdown-item admin-portal-btn">
                      <LayoutDashboard size={16} /> Quản lý hệ thống
                    </Link>
                  )}
                  {user?.role === 'staff' && (
                    <>
                      <Link to="/staff/bookings" className="dropdown-item">
                        <ShoppingCart size={16} /> Quản lý đơn
                      </Link>
                       <Link to="/staff/revenue" className="dropdown-item">
                        <BarChart2 size={16} /> Báo cáo doanh thu
                      </Link>
                    </>
                  )}

                  {/* <Link to="/settings" className="dropdown-item">
                    <Settings size={16} /> Cài đặt
                  </Link>
                  <Link to="/help" className="dropdown-item">
                    <HelpCircle size={16} /> Hỗ trợ
                  </Link> */}
                  <hr />
                  <button onClick={handleLogout} className="dropdown-item logout-item">
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="login-link">Đăng nhập</Link>
              <Link to="/register" className="register-btn">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>
      
      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div className="mobile-overlay" onClick={() => setIsMenuOpen(false)}></div>
      )}
    </header>
  );
};

export default Header;
