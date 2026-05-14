import { Link, useLocation } from 'react-router-dom';
import { 
  Shield, Home, 
  ChevronLeft,
  LogOut, Bell, QrCode, CreditCard,
  TrendingUp, ReceiptEuro
} from 'lucide-react';
import './AdminSidebar.scss';

const AdminSidebar = ({ isCollapsed, setIsCollapsed, user, handleLogout }) => {
  const location = useLocation();

  const menuItems = [
    { 
      path: '/admin/users', 
      icon: <Shield size={20} />, 
      label: 'Vai trò & Quyền' 
    },
    { 
      path: '/admin/bookings', 
      icon: <ReceiptEuro size={20} />, 
      label: 'Quản lý đơn hàng' 
    },
    { 
      path: '/admin/qrs', 
      icon: <QrCode size={20} />, 
      label: 'Quản lý QR' 
    },
    { 
      path: '/admin/cards', 
      icon: <CreditCard size={20} />, 
      label: 'Quản lý thẻ' 
    },
    { 
      path: '/admin/revenue', 
      icon: <TrendingUp size={20} />, 
      label: 'Báo cáo doanh thu' 
    },
    { 
      path: '/admin/notifications', 
      icon: <Bell size={20} />, 
      label: 'Thông báo' 
     },
    // { 
    //   path: '/admin/roles', 
    //   icon: <Shield size={20} />, 
    //   label: 'Vai trò & Quyền' 
    // },
    // { 
    //   path: '/admin/settings', 
    //   icon: <Settings size={20} />, 
    //   label: 'Cấu hình hệ thống' 
    // }
  ];

  return (
    <aside className={`admin-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="logo-section">
          <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQVW7rlSPHTehp-w35Km0QF380L2eZC-RuZmw&s" alt="Logo" className="logo-img-small" />
          {!isCollapsed && <span className="logo-text">Credify</span>}
        </div>
        <button 
          className="collapse-btn" 
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          <ChevronLeft size={18} />
        </button>
      </div>

      <div className="user-section">
        <div className="avatar">
          {user?.full_name?.charAt(0).toUpperCase()}
        </div>
        {!isCollapsed && (
          <div className="user-info">
            <p className="name">{user?.full_name}</p>
            <p className="role">Hệ thống</p>
          </div>
        )}
      </div>

      <nav className="sidebar-nav">
        <div className="nav-group">
          {!isCollapsed && <span className="group-label">QUẢN TRỊ</span>}
          {menuItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
            >
              <span className="icon">{item.icon}</span>
              {!isCollapsed && <span className="label">{item.label}</span>}
              {location.pathname === item.path && <div className="active-indicator" />}
            </Link>
          ))}
        </div>

        <div className="nav-group">
          {!isCollapsed && <span className="group-label">ỨNG DỤNG</span>}
          <Link to="/" className="nav-link">
            <Home size={20} />
            {!isCollapsed && <span className="label">Về trang chủ</span>}
          </Link>
          <Link to="/notifications" className="nav-link">
            <Bell size={20} />
            {!isCollapsed && <span className="label">Thông báo</span>}
          </Link>
        </div>
      </nav>

      <div className="sidebar-footer">
        <button onClick={handleLogout} className="logout-btn">
          <LogOut size={20} />
          {!isCollapsed && <span>Đăng xuất</span>}
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
