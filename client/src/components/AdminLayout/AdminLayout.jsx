import { useState, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import './AdminLayout.scss';

const AdminLayout = ({ user, handleLogout }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Thêm class vào root để hỗ trợ full width cho Admin
    const root = document.getElementById('root');
    if (root) {
      root.classList.add('admin-layout-root');
    }
    return () => {
      if (root) {
        root.classList.remove('admin-layout-root');
      }
    };
  }, []);

  // Bảo vệ route ở cấp độ layout
  if (!user || user.role !== 'admin_system') {
    return <Navigate to="/" />;
  }

  return (
    <div className={`admin-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Nút toggle cho mobile */}
      <button 
        className="mobile-sidebar-toggle"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <ChevronLeft size={24} style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }} />
      </button>

      {/* Overlay cho mobile khi sidebar mở */}
      {!isCollapsed && <div className="sidebar-overlay" onClick={() => setIsCollapsed(true)} />}

      <AdminSidebar 
        isCollapsed={isCollapsed} 
        setIsCollapsed={setIsCollapsed} 
        user={user}
        handleLogout={handleLogout}
      />
      <main className={`admin-main ${isCollapsed ? 'expanded' : ''}`}>
        <div className="admin-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
