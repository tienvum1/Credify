import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { toast } from 'react-toastify';
import { 
  User, Edit3, 
  Check, X, Shield, Star,
  LogOut, Lock, ChevronLeft,
  Plus, Trash2, CreditCard as BankIcon
} from 'lucide-react';
import './Profile.scss';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState(null); // 'full_name' hoặc 'phone'
  const [formData, setFormData] = useState({
    full_name: '',
    phone: ''
  });
  const [updating, setUpdating] = useState(false);
  
  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [editingBank, setEditingBank] = useState(null);
  const [bankFormData, setBankFormData] = useState({
    account_holder: '',
    bank_name: '',
    account_number: '',
    is_default: false
  });
  const [bankQrFile, setBankQrFile] = useState(null);
  const [bankQrPreview, setBankQrPreview] = useState(null);
  const [qrLightbox, setQrLightbox] = useState(null);

  const navigate = useNavigate();

  const fetchBankAccounts = async () => {
    try {
      const res = await api.get('/bank-accounts');
      setBankAccounts(res.data.data);
    } catch (err) {
      console.error('Lỗi khi lấy danh sách ngân hàng:', err);
    }
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
        setFormData({
          full_name: res.data.user.full_name || '',
          phone: res.data.user.phone || ''
        });
        // Sau khi có profile thì lấy danh sách ngân hàng
        await fetchBankAccounts();
      } catch (err) {
        console.error('Lỗi khi lấy thông tin profile:', err);
        toast.error('Không thể tải thông tin cá nhân');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleOpenBankModal = (bank = null) => {
    if (bank) {
      setEditingBank(bank);
      setBankFormData({
        account_holder: bank.account_holder,
        bank_name: bank.bank_name,
        account_number: bank.account_number,
        is_default: !!bank.is_default
      });
      setBankQrFile(null);
      setBankQrPreview(bank.qr_image || null);
    } else {
      setEditingBank(null);
      setBankFormData({
        account_holder: user?.full_name || '',
        bank_name: '',
        account_number: '',
        is_default: bankAccounts.length === 0
      });
      setBankQrFile(null);
      setBankQrPreview(null);
    }
    setShowBankModal(true);
  };

  const handleSaveBank = async (e, customBank = null, extraData = null) => {
    if (e && e.preventDefault) e.preventDefault();
    try {
      const targetBank = customBank || editingBank;
      
      // Dùng FormData để hỗ trợ upload ảnh
      const formData = new FormData();
      
      if (extraData) {
        // Trường hợp chỉ cập nhật is_default (không qua modal)
        formData.append('account_holder', targetBank.account_holder);
        formData.append('bank_name', targetBank.bank_name);
        formData.append('account_number', targetBank.account_number);
        Object.entries(extraData).forEach(([k, v]) => formData.append(k, v));
      } else {
        formData.append('account_holder', bankFormData.account_holder);
        formData.append('bank_name', bankFormData.bank_name);
        formData.append('account_number', bankFormData.account_number);
        formData.append('is_default', bankFormData.is_default ? '1' : '0');
        if (bankQrFile) {
          formData.append('qr_image', bankQrFile);
        }
      }

      if (targetBank && targetBank.id) {
        await api.put(`/bank-accounts/${targetBank.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/bank-accounts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      setShowBankModal(false);
      setBankQrFile(null);
      setBankQrPreview(null);
      fetchBankAccounts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi khi lưu thông tin');
    }
  };

  const handleDeleteBank = async (id) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản ngân hàng này?')) return;
    try {
      await api.delete(`/bank-accounts/${id}`);
      toast.success('Xóa tài khoản thành công');
      fetchBankAccounts();
    } catch (err) {
      void err;
      toast.error('Lỗi khi xóa tài khoản');
    }
  };

  const handleUpdateField = async (field) => {
    const value = formData[field];
    if (field === 'full_name' && !value.trim()) {
      return toast.warn('Họ và tên không được để trống');
    }

    setUpdating(true);
    try {
      const res = await api.put('/auth/profile', { 
        ...formData,
        [field]: value 
      });
      setUser(res.data.user);
      setEditingField(null);
      toast.dismiss();
      toast.success('Cập nhật thông tin thành công!');
    } catch (err) {
      console.error('Lỗi khi cập nhật profile:', err);
      toast.error(err.response?.data?.message || 'Cập nhật thất bại');
    } finally {
      setUpdating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.get('/auth/logout');
      toast.success('Đã đăng xuất');
      window.location.href = '/login';
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
      toast.error('Lỗi khi đăng xuất');
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Đang tải thông tin cá nhân...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <i className="fas fa-exclamation-triangle"></i>
        <p>Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.</p>
        <button className="back-home-btn" onClick={() => navigate('/login')}>Đăng nhập</button>
      </div>
    );
  }

  const getRoleLabel = (role) => {
    const roles = {
      'admin_system': 'Quản trị hệ thống',
      'staff': 'Nhân viên',
      'accountant': 'Kế toán',
      'user': 'Khách hàng'
    };
    return roles[role] || role;
  };

  return (
    <div className="profile-container">
      <div className="profile-background-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      <div className="profile-wrapper">
        <div className="profile-header-card">
          <button className="back-nav-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ChevronLeft size={20} />
          </button>
          
          <div className="profile-hero">
            <div className="avatar-container">
              <div className="avatar-main">
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
              </div>
              <div className="status-indicator online"></div>
            </div>
            
            <div className="hero-content">
              <h1>{user.full_name || 'Người dùng'}</h1>
              <div className="hero-badges">
                <span className={`badge-role ${user.role}`}>
                  <Shield size={12} style={{marginRight: '4px'}} />
                  {getRoleLabel(user.role)}
                </span>
                <span className="badge-level">
                  <Star size={12} style={{marginRight: '4px'}} />
                  {user.level === 0 ? 'Cấp mặc định' : `Cấp ${user.level || 0}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-grid-layout">
          <div className="profile-main-content">
            <div className="content-card">
              <div className="card-header">
                <div className="header-title">
                  <User size={18} />
                  <span>Thông tin cá nhân</span>
                </div>
              </div>

              <div className="card-body">
                <div className="profile-fields-list">
                  {/* Trường Họ và tên */}
                  <div className="profile-field-item">
                    <div className="field-label">Họ và tên</div>
                    <div className="field-control">
                      {editingField === 'full_name' ? (
                        <div className="field-edit-group">
                          <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                            autoFocus
                          />
                          <div className="action-btns">
                            <button className="confirm-btn" onClick={() => handleUpdateField('full_name')} disabled={updating}>
                              <Check size={18} />
                            </button>
                            <button className="cancel-btn" onClick={() => setEditingField(null)}>
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="field-display-group">
                          <span className="display-value">{user.full_name || 'Chưa thiết lập'}</span>
                          <button className="edit-btn" onClick={() => setEditingField('full_name')}>
                            <Edit3 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trường Số điện thoại */}
                  <div className="profile-field-item">
                    <div className="field-label">Số điện thoại</div>
                    <div className="field-control">
                      {editingField === 'phone' ? (
                        <div className="field-edit-group">
                          <input
                            type="tel"
                            value={formData.phone}
                            onChange={(e) => setFormData({...formData, phone: e.target.value})}
                            placeholder="Nhập số điện thoại"
                            autoFocus
                          />
                          <div className="action-btns">
                            <button className="confirm-btn" onClick={() => handleUpdateField('phone')} disabled={updating}>
                              <Check size={18} />
                            </button>
                            <button className="cancel-btn" onClick={() => setEditingField(null)}>
                              <X size={18} />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="field-display-group">
                          <span className={`display-value ${!user.phone ? 'null-value' : ''}`}>
                            {user.phone || 'Chưa cập nhật'}
                          </span>
                          <button className="edit-btn" onClick={() => setEditingField('phone')}>
                            <Edit3 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Trường Email (Không cho sửa) */}
                  <div className="profile-field-item readonly">
                    <div className="field-label">Địa chỉ Email</div>
                    <div className="field-control">
                      <div className="field-display-group">
                        <span className="display-value">{user.email}</span>
                        <div className="readonly-badge">Cố định</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="profile-side-content">
            <div className="content-card settings-card">
              <div className="card-header">
                <div className="header-title">
                  <Shield size={18} />
                  <span>Bảo mật & Tài khoản</span>
                </div>
              </div>
              <div className="card-body">
                <div className="settings-menu">
                  <button className="menu-item" onClick={() => toast.info('Tính năng đang phát triển')}>
                    <div className="menu-icon"><Lock size={18} /></div>
                    <div className="menu-text">
                      <span className="menu-label">Đổi mật khẩu</span>
                      <span className="menu-desc">Cập nhật mật khẩu định kỳ</span>
                    </div>
                  </button>
                  <button className="menu-item logout" onClick={handleLogout}>
                    <div className="menu-icon"><LogOut size={18} /></div>
                    <div className="menu-text">
                      <span className="menu-label">Đăng xuất</span>
                      <span className="menu-desc">Thoát khỏi phiên làm việc</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Quản lý tài khoản ngân hàng ── */}
        <div className="bank-section">
          <div className="bank-section-header">
            <div className="bank-section-title">
              <BankIcon size={20} />
              <h2>Quản lý tài khoản ngân hàng</h2>
              {bankAccounts.length > 0 && (
                <span className="bank-count">{bankAccounts.length}</span>
              )}
            </div>
            <button className="add-bank-btn" onClick={() => handleOpenBankModal()}>
              <Plus size={15} />
              Thêm tài khoản
            </button>
          </div>

          <div className="bank-table-wrap content-card">
            {bankAccounts.length === 0 ? (
              <div className="bank-empty">
                <BankIcon size={40} />
                <p>Chưa có tài khoản ngân hàng nào</p>
                <span>Thêm tài khoản để thanh toán nhanh hơn</span>
                <button className="add-bank-btn-empty" onClick={() => handleOpenBankModal()}>
                  <Plus size={15} /> Thêm ngay
                </button>
              </div>
            ) : (
              <div className="bank-table-shell">
                <table className="bank-table">
                  <thead>
                    <tr>
                      <th>Chủ tài khoản</th>
                      <th>Ngân hàng</th>
                      <th>Số tài khoản</th>
                      <th className="th-qr">Ảnh QR</th>
                      <th className="th-actions">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...bankAccounts].sort((a, b) => b.is_default - a.is_default).map((bank) => (
                      <tr key={bank.id} className={bank.is_default ? 'row-default' : ''}>
                        <td data-label="Chủ tài khoản">
                          <div className="holder-cell">
                            <span className="holder-name">{bank.account_holder}</span>
                            {bank.is_default && (
                              <span className="default-pill">
                                <Star size={10} fill="currentColor" /> Mặc định
                              </span>
                            )}
                          </div>
                        </td>
                        <td data-label="Ngân hàng">
                          <span className="bank-name-cell">{bank.bank_name}</span>
                        </td>
                        <td data-label="Số tài khoản">
                          <span className="account-number-cell">{bank.account_number}</span>
                        </td>
                        <td data-label="Ảnh QR" className="td-qr">
                          {bank.qr_image ? (
                            <button
                              type="button"
                              className="qr-thumb-btn"
                              onClick={() => setQrLightbox(bank.qr_image)}
                              title="Xem QR"
                            >
                              <img src={bank.qr_image} alt={`QR ${bank.bank_name}`} className="qr-thumb-img" />
                            </button>
                          ) : (
                            <span className="no-qr">—</span>
                          )}
                        </td>
                        <td data-label="Hành động" className="td-actions">
                          <div className="bank-row-actions">
                            <button
                              className={`action-btn default-btn ${bank.is_default ? 'is-default' : ''}`}
                              title={bank.is_default ? 'Đang là mặc định' : 'Đặt làm mặc định'}
                              onClick={() => !bank.is_default && handleSaveBank({ preventDefault: () => {} }, bank, { is_default: true })}
                              disabled={bank.is_default}
                            >
                              <Star size={13} fill={bank.is_default ? 'currentColor' : 'none'} />
                              <span>{bank.is_default ? 'Mặc định' : 'Mặc định'}</span>
                            </button>
                            <button
                              className="action-btn edit-btn"
                              title="Chỉnh sửa"
                              onClick={() => handleOpenBankModal(bank)}
                            >
                              <Edit3 size={13} />
                              <span>Sửa</span>
                            </button>
                            <button
                              className="action-btn delete-btn"
                              title="Xóa"
                              onClick={() => handleDeleteBank(bank.id)}
                            >
                              <Trash2 size={13} />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {qrLightbox && (
        <div className="bank-modal-overlay" onClick={() => setQrLightbox(null)}>
          <div className="qr-lightbox-inner" onClick={e => e.stopPropagation()}>
            <button className="qr-lightbox-close" onClick={() => setQrLightbox(null)}>
              <X size={18} />
            </button>
            <img src={qrLightbox} alt="QR preview" />
          </div>
        </div>
      )}

      {showBankModal && (
        <div className="bank-modal-overlay">
          <div className="bank-modal">
            <div className="modal-header">
              <h3>{editingBank ? 'Sửa tài khoản' : 'Thêm tài khoản mới'}</h3>
              <button onClick={() => setShowBankModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveBank}>
              <div className="form-group">
                <label>Tên ngân hàng</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Vietcombank, Techcombank..."
                  value={bankFormData.bank_name}
                  onChange={(e) => setBankFormData({...bankFormData, bank_name: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Số tài khoản</label>
                <input 
                  type="text" 
                  placeholder="Nhập số tài khoản"
                  value={bankFormData.account_number}
                  onChange={(e) => setBankFormData({...bankFormData, account_number: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Tên chủ tài khoản</label>
                <input 
                  type="text" 
                  placeholder="Họ và tên viết hoa không dấu"
                  value={bankFormData.account_holder}
                  onChange={(e) => setBankFormData({...bankFormData, account_holder: e.target.value})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Ảnh QR ngân hàng (tuỳ chọn)</label>
                <div className="bank-qr-upload">
                  {bankQrPreview ? (
                    <div className="bank-qr-preview-wrap">
                      <img src={bankQrPreview} alt="QR preview" className="bank-qr-preview-img" />
                      <button
                        type="button"
                        className="remove-qr-btn"
                        onClick={() => { setBankQrFile(null); setBankQrPreview(null); }}
                      >
                        <X size={14} /> Xóa ảnh
                      </button>
                    </div>
                  ) : (
                    <label className="qr-upload-box">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setBankQrFile(file);
                            const reader = new FileReader();
                            reader.onloadend = () => setBankQrPreview(reader.result);
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                      <Plus size={24} />
                      <span>Tải ảnh QR</span>
                    </label>
                  )}
                </div>
              </div>
              <div className="form-group-checkbox">
                <input 
                  type="checkbox" 
                  id="is_default"
                  checked={bankFormData.is_default}
                  onChange={(e) => setBankFormData({...bankFormData, is_default: e.target.checked})}
                />
                <label htmlFor="is_default">Đặt làm mặc định</label>
              </div>
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={() => setShowBankModal(false)}>Hủy</button>
                <button type="submit" className="save-btn">Lưu thông tin</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
