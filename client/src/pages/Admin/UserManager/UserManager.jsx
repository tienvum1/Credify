import { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';
import { 
  Search, Plus, User, AlertCircle, 
  Edit2, XCircle, Shield, 
  Unlock, Lock, Users, UserCheck, UserPlus, ShieldCheck,
  Eye, EyeOff
} from 'lucide-react';
import { toast } from 'react-toastify';
import './UserManager.scss';

const UserManager = () => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    users: 0,
    staff: 0,
    accountants: 0,
    admins: 0
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // State cho Custom Confirm Modal
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    type: 'danger' // 'danger' hoặc 'success'
  });
  
  // Form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'user',
    level: 0,
    status: 'active'
  });

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/admin/users?search=${search}&role=${roleFilter}&status=${statusFilter}`);
      if (response.data.success) {
        setUsers(response.data.data);
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const init = async () => {
      await fetchUsers();
    };
    init();
  }, [fetchUsers]);

  const handleOpenModal = (user = null) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        password: '', 
        full_name: user.full_name,
        phone: user.phone || '',
        role: user.role,
        level: user.level !== undefined ? user.level : 0,
        status: user.status
      });
    } else {
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'user',
        level: 0,
        status: 'active'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, formData);
        toast.dismiss();
        toast.success('Cập nhật người dùng thành công');
      } else {
        if (!formData.password) {
          toast.dismiss();
          return toast.error('Vui lòng nhập mật khẩu cho người dùng mới');
        }
        await api.post('/admin/users', formData);
        toast.dismiss();
        toast.success('Tạo người dùng thành công');
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.dismiss();
      toast.error(error.response?.data?.message || 'Lỗi khi lưu thông tin người dùng');
    }
  };

  const handleToggleStatus = (user) => {
    const isLocking = user.status === 'active';
    const newStatus = isLocking ? 'locked' : 'active';
    
    setConfirmModal({
      isOpen: true,
      title: isLocking ? 'Xác nhận khóa tài khoản' : 'Xác nhận mở khóa',
      message: isLocking 
        ? `Bạn có chắc chắn muốn khóa tài khoản ${user.email} không? Người dùng này sẽ không thể đăng nhập vào hệ thống.` 
        : `Bạn có muốn mở khóa cho tài khoản ${user.email} không?`,
      type: isLocking ? 'danger' : 'success',
      onConfirm: async () => {
        try {
          await api.patch(`/admin/users/${user.id}/status`, { status: newStatus });
          toast.dismiss();
          toast.success(isLocking ? 'Đã khóa tài khoản thành công' : 'Đã mở khóa tài khoản thành công');
          fetchUsers();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (error) {
          console.error(error);
          toast.dismiss();
          toast.error('Lỗi khi thay đổi trạng thái tài khoản');
        }
      }
    });
  };

  const getRoleLabel = (role) => {
    const roles = {
      admin_system: 'Admin',
      staff: 'Nhân viên',
      accountant: 'Kế toán',
      user: 'Khách hàng'
    };
    return roles[role] || role;
  };

  const getRoleBadgeClass = (role) => {
    switch (role) {
      case 'admin_system': return 'badge-admin';
      case 'staff': return 'badge-staff';
      case 'accountant': return 'badge-accountant';
      default: return 'badge-user';
    }
  };

  const getLevelBadgeClass = (level) => {
    switch (Number(level)) {
      case 3: return 'level-3';
      case 2: return 'level-2';
      case 1: return 'level-1';
      default: return 'level-0';
    }
  };

  return (
    <div className="user-manager-wrapper">
      <div className="dashboard-header">
        <div className="header-title">
          <h1>Quản lý Người dùng</h1>
          <p>Danh sách tài khoản và phân quyền hệ thống</p>
        </div>
        
        <div className="header-actions">
          <button className="add-new-btn" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Thêm người dùng
          </button>

          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo tên, email..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Tất cả vai trò</option>
              <option value="admin_system">Admin</option>
              <option value="staff">Nhân viên</option>
              <option value="accountant">Kế toán</option>
              <option value="user">Khách hàng</option>
            </select>

            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="locked">Đã khóa</option>
            </select>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon total"><Users size={24} /></div>
          <div className="stat-info">
            <span className="label">Tổng người dùng</span>
            <span className="value">{stats.total}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon user"><UserCheck size={24} /></div>
          <div className="stat-info">
            <span className="label">Khách hàng</span>
            <span className="value">{stats.users}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon staff"><UserPlus size={24} /></div>
          <div className="stat-info">
            <span className="label">Nhân viên</span>
            <span className="value">{stats.staff}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon accountant"><UserCheck size={24} /></div>
          <div className="stat-info">
            <span className="label">Kế toán</span>
            <span className="value">{stats.accountants}</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon admin"><ShieldCheck size={24} /></div>
          <div className="stat-info">
            <span className="label">Quản trị viên</span>
            <span className="value">{stats.admins}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu...</p>
        </div>
      ) : (
        <div className="excel-table-container">
          <table className="excel-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Vai trò / Cấp độ</th>
                <th>Thông tin tài khoản</th>
                <th>Ngày tham gia</th>
                <th>Trạng thái</th>
                <th className="actions-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan="6" className="empty-row">
                    <div className="empty-state">
                      <AlertCircle size={32} />
                      <p>Không tìm thấy người dùng nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map(user => (
                  <tr key={user.id}>
                    <td data-label="Người dùng">
                      <div className="user-info-cell">
                        <div className="avatar">
                          {user.full_name?.charAt(0).toUpperCase() || <User size={16} />}
                        </div>
                        <div className="details">
                          <div className="name">{user.full_name}</div>
                          <div className="role-small">{getRoleLabel(user.role)}</div>
                        </div>
                      </div>
                    </td>
                    <td data-label="Vai trò / Cấp độ">
                      <div className="role-level-cell">
                        <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                          <Shield size={12} style={{marginRight: '4px'}} />
                          {getRoleLabel(user.role)}
                        </span>
                        {user.role === 'user' && (
                          <span className={`level-badge ${getLevelBadgeClass(user.level)}`}>
                            {user.level === 0 ? 'Mặc định' : `Cấp ${user.level}`}
                          </span>
                        )}
                      </div>
                    </td>
                    <td data-label="Thông tin tài khoản">
                      <div className="contact-cell">
                        <div className="email">{user.email}</div>
                        {user.phone && <div className="phone">{user.phone}</div>}
                      </div>
                    </td>
                    <td data-label="Ngày tham gia">
                      <div className="date-cell">
                        {new Date(user.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td data-label="Trạng thái">
                      <span className={`status-badge ${user.status}`}>
                        {user.status === 'active' ? 'Hoạt động' : 'Bị khóa'}
                      </span>
                    </td>
                    <td data-label="Hành động" className="actions-col">
                      <div className="action-btns">
                        <button className="icon-btn edit" onClick={() => handleOpenModal(user)} title="Sửa">
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className={`icon-btn toggle ${user.status === 'active' ? 'lock' : 'unlock'}`}
                          onClick={() => handleToggleStatus(user)}
                          title={user.status === 'active' ? 'Khóa' : 'Mở khóa'}
                        >
                          {user.status === 'active' ? <Lock size={16} /> : <Unlock size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Add/Edit User */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Email (Tài khoản)</label>
                  <input 
                    type="email" 
                    required 
                    disabled={!!editingUser}
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    placeholder="example@gmail.com"
                  />
                </div>
                <div className="form-group">
                  <label>Mật khẩu {editingUser && '(Để trống nếu không đổi)'}</label>
                  <div className="password-input-wrapper">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required={!editingUser}
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                      placeholder="Nhập mật khẩu"
                    />
                    <button 
                      type="button" 
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Họ và tên</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.full_name}
                    onChange={e => setFormData({...formData, full_name: e.target.value})}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    placeholder="09xx xxx xxx"
                  />
                </div>
                <div className="form-group">
                  <label>Vai trò</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value})}
                  >
                    <option value="user">Khách hàng</option>
                    <option value="staff">Nhân viên</option>
                    <option value="accountant">Kế toán</option>
                    <option value="admin_system">Admin Hệ thống</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Cấp độ người dùng</label>
                  <select 
                    value={formData.level}
                    onChange={e => setFormData({...formData, level: Number(e.target.value)})}
                  >
                    <option value={0}>Cấp 0 (Mặc định)</option>
                    <option value={1}>Cấp 1</option>
                    <option value={2}>Cấp 2</option>
                    <option value={3}>Cấp 3</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Trạng thái</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="active">Đang hoạt động</option>
                    <option value="locked">Đã khóa</option>
                  </select>
                </div>
              </div>
              
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => setIsModalOpen(false)}>Hủy</button>
                <button type="submit" className="submit-btn">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal.isOpen && (
        <div className="modal-overlay">
          <div className="confirm-modal-content">
            <div className={`confirm-icon-wrapper ${confirmModal.type}`}>
              {confirmModal.type === 'danger' ? <Lock size={32} /> : <Unlock size={32} />}
            </div>
            <h3>{confirmModal.title}</h3>
            <p>{confirmModal.message}</p>
            <div className="confirm-actions">
              <button 
                className="cancel-btn" 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
              >
                Hủy bỏ
              </button>
              <button 
                className={`confirm-btn ${confirmModal.type}`} 
                onClick={confirmModal.onConfirm}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManager;
