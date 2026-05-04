import { useState, useEffect, useCallback } from 'react';
import axios from '../../../api/axios';
import { 
  Search, Plus, AlertCircle, 
  Trash2, Edit2, XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import './CardManager.scss';

const CardManager = () => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    bank_name: '',
    card_last_4: '',
    credit_limit: '',
    roll_amount: '',
    fee_percent: '',
    bank_fee_percent: '',
    statement_date: '',
    due_date: '',
    roll_date: '',
    status: 'An toàn'
  });

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/credit-cards/dashboard?search=${search}&filter=${filter}`);
      if (response.data.success) {
        setCards(response.data.data);
      }
    } catch (error) {
      console.error(error);
      toast.error('Không thể tải dữ liệu dashboard');
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const loadData = async () => {
      await fetchDashboard();
    };
    loadData();
  }, [fetchDashboard]);

  const handleOpenModal = (card = null) => {
    if (card) {
      setEditingCard(card);
      setFormData({
        customer_name: card.customer_name || '',
        bank_name: card.bank_name || '',
        card_last_4: card.card_last_4 || '',
        credit_limit: card.credit_limit || '',
        roll_amount: card.roll_amount || '',
        fee_percent: card.fee_percent || '',
        bank_fee_percent: card.bank_fee_percent || '',
        statement_date: card.statement_date ? new Date(card.statement_date).toISOString().split('T')[0] : '',
        due_date: card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : '',
        roll_date: card.roll_date ? new Date(card.roll_date).toISOString().split('T')[0] : '',
        status: card.status || 'An toàn'
      });
    } else {
      setEditingCard(null);
      setFormData({
        customer_name: '',
        bank_name: '',
        card_last_4: '',
        credit_limit: '',
        roll_amount: '',
        fee_percent: '',
        bank_fee_percent: '',
        statement_date: '',
        due_date: '',
        roll_date: '',
        status: 'An toàn'
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCard) {
        await axios.put(`/credit-cards/${editingCard.id}`, formData);
        toast.success('Cập nhật thẻ thành công');
      } else {
        await axios.post('/credit-cards/add', formData);
        toast.success('Thêm thẻ thành công');
      }
      setIsModalOpen(false);
      fetchDashboard();
    } catch (error) {
      console.error(error);
      toast.error('Lỗi khi lưu thông tin thẻ');
    }
  };

  const handleDeleteCard = async (cardId) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa thẻ này?')) {
      try {
        await axios.delete(`/credit-cards/${cardId}`);
        toast.success('Xóa thẻ thành công');
        fetchDashboard();
      } catch (error) {
        console.error(error);
        toast.error('Lỗi khi xóa thẻ');
      }
    }
  };

  const getStatusColor = (days) => {
    if (days < 0) return 'status-overdue';
    if (days <= 3) return 'status-danger';
    if (days <= 7) return 'status-warning';
    return 'status-safe';
  };

  return (
    <div className="card-manager-container">
      <div className="dashboard-header">
        <div className="header-title">
          <h1>Quản lý Tín dụng Hệ thống</h1>
          <p>Danh sách tất cả các thẻ tín dụng đang quản lý</p>
        </div>
        
        <div className="header-actions">
          <button className="add-new-btn" onClick={() => handleOpenModal()}>
            <Plus size={18} /> Tạo thẻ mới
          </button>

          <div className="search-box">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Tìm theo chủ thẻ, ngân hàng, số thẻ..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <button 
              className={`filter-btn ${filter === '' ? 'active' : ''}`}
              onClick={() => setFilter('')}
            >Tất cả</button>
            <button 
              className={`filter-btn ${filter === 'due_today' ? 'active' : ''}`}
              onClick={() => setFilter('due_today')}
            >Hôm nay</button>
            <button 
              className={`filter-btn ${filter === 'due_3_days' ? 'active' : ''}`}
              onClick={() => setFilter('due_3_days')}
            >Sắp hạn (3đ)</button>
            <button 
              className={`filter-btn ${filter === 'overdue' ? 'active' : ''}`}
              onClick={() => setFilter('overdue')}
            >Quá hạn</button>
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
                <th>STT</th>
                <th>Tên khách hàng</th>
                <th>Ngân hàng</th>
                <th>4 số cuối thẻ</th>
                <th>Hạn mức</th>
                <th>Số tiền đáo</th>
                <th>Phí %</th>
                <th>Phí Bank %</th>
                <th>Phí VNĐ</th>
                <th>Lợi nhuận</th>
                <th>Ngày sao kê</th>
                <th>Ngày đến hạn</th>
                <th>Ngày đáo</th>
                <th>Số ngày còn lại</th>
                <th>Trạng thái</th>
                <th className="actions-col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr>
                  <td colSpan="16" className="empty-row">
                    <div className="empty-state">
                      <AlertCircle size={32} />
                      <p>Không tìm thấy dữ liệu thẻ nào</p>
                    </div>
                  </td>
                </tr>
              ) : (
                cards.map((card, index) => (
                  <tr key={card.id} className={getStatusColor(card.days_left)}>
                    <td data-label="STT">{index + 1}</td>
                    <td data-label="Tên khách hàng" className="customer-name-cell">
                      {card.customer_name}
                    </td>
                    <td data-label="Ngân hàng">{card.bank_name}</td>
                    <td data-label="4 số cuối">{card.card_last_4}</td>
                    <td data-label="Hạn mức" className="amount-cell">{Number(card.credit_limit).toLocaleString()}đ</td>
                    <td data-label="Số tiền đáo" className="amount-cell roll">{Number(card.roll_amount).toLocaleString()}đ</td>
                    <td data-label="Phí %">{card.fee_percent}%</td>
                    <td data-label="Phí Bank %">{card.bank_fee_percent}%</td>
                    <td data-label="Phí VNĐ" className="amount-cell fee-vnd">{Number(card.fee_vnd).toLocaleString()}đ</td>
                    <td data-label="Lợi nhuận" className="amount-cell profit">{Number(card.profit).toLocaleString()}đ</td>
                    <td data-label="Ngày sao kê" className="date-cell">{card.statement_date ? new Date(card.statement_date).toLocaleDateString('vi-VN') : '—'}</td>
                    <td data-label="Ngày đến hạn" className="date-cell">{card.due_date ? new Date(card.due_date).toLocaleDateString('vi-VN') : '—'}</td>
                    <td data-label="Ngày đáo" className="date-cell">{card.roll_date ? new Date(card.roll_date).toLocaleDateString('vi-VN') : '—'}</td>
                    <td data-label="Số ngày còn lại" className="status-cell">
                      <div className={`days-left ${getStatusColor(card.days_left)}`}>
                        {card.days_left}
                      </div>
                    </td>
                    <td data-label="Trạng thái" className="status-cell">
                      <div className={`status-badge ${card.status === 'An toàn' ? 'status-safe' : 'status-danger'}`}>
                        {card.status}
                      </div>
                    </td>
                    <td data-label="Hành động" className="actions-col">
                      <div className="action-group">
                        <button 
                          className="action-btn edit"
                          onClick={() => handleOpenModal(card)}
                          title="Sửa"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="action-btn delete"
                          onClick={() => handleDeleteCard(card.id)}
                          title="Xóa"
                        >
                          <Trash2 size={14} />
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

      {/* Modal Add/Edit Card */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{editingCard ? 'Sửa thông tin thẻ' : 'Thêm thẻ mới'}</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}><XCircle size={24} /></button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="form-group full-width">
                  <label>Tên khách hàng</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.customer_name}
                    onChange={e => setFormData({...formData, customer_name: e.target.value})}
                    placeholder="VD: HA VAN PHAT"
                  />
                </div>
                <div className="form-group">
                  <label>Tên ngân hàng</label>
                  <input 
                    type="text" 
                    required 
                    value={formData.bank_name}
                    onChange={e => setFormData({...formData, bank_name: e.target.value})}
                    placeholder="VD: ACB"
                  />
                </div>
                <div className="form-group">
                  <label>4 số cuối thẻ</label>
                  <input 
                    type="text" 
                    required 
                    maxLength="4"
                    value={formData.card_last_4}
                    onChange={e => setFormData({...formData, card_last_4: e.target.value})}
                    placeholder="VD: 1234"
                  />
                </div>
                <div className="form-group">
                  <label>Hạn mức tín dụng</label>
                  <input 
                    type="number" 
                    required 
                    value={formData.credit_limit}
                    onChange={e => setFormData({...formData, credit_limit: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Số tiền đáo</label>
                  <input 
                    type="number" 
                    required
                    value={formData.roll_amount}
                    onChange={e => setFormData({...formData, roll_amount: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Phí thu khách (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    value={formData.fee_percent}
                    onChange={e => setFormData({...formData, fee_percent: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Phí Bank (%)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required 
                    value={formData.bank_fee_percent}
                    onChange={e => setFormData({...formData, bank_fee_percent: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Ngày sao kê</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.statement_date}
                    onChange={e => setFormData({...formData, statement_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Ngày đến hạn</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.due_date}
                    onChange={e => setFormData({...formData, due_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Ngày đáo</label>
                  <input 
                    type="date" 
                    required 
                    value={formData.roll_date}
                    onChange={e => setFormData({...formData, roll_date: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Trạng thái thẻ</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="An toàn">An toàn</option>
                    <option value="Cảnh báo">Cảnh báo</option>
                    <option value="Nguy hiểm">Nguy hiểm</option>
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
    </div>
  );
};

export default CardManager;
