import { useState, useEffect, useCallback } from 'react';
import axios from '../../../api/axios';
import { Search, Plus, Trash2, Edit2, XCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-toastify';
import './CardManager.scss';

const CARD_TYPES = ['QR', 'Máy POS', 'Tôi'];

const EMPTY_FORM = {
  card_type: 'QR',
  customer_name: '',
  bank_name: '',
  card_last_4: '',
  credit_limit: '',
  roll_amount: '',
  fee_percent: '',
  bank_fee_percent: '',
  statement_day: '',
  due_day: '',
  roll_date: '',
  note: '',
  is_done: false,
};

const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('vi-VN');
const fmtPct = (n) => (Number(n) * 100).toFixed(2).replace(/\.?0+$/, '') + '%';

const statusClass = (label) => {
  if (!label || label === '—') return 'status-none';
  if (label.includes('🔴')) return 'status-danger';
  if (label.includes('🟡')) return 'status-warning';
  return 'status-safe';
};

export default function CardManager() {
  const [cards, setCards] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('');
  const [activeType, setActiveType] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/credit-cards/dashboard', {
        params: { search, filter, card_type: activeType },
      });
      if (res.data.success) {
        setCards(res.data.data);
        setSummary(res.data.summary || {});
      }
    } catch {
      toast.error('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [search, filter, activeType]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ ...EMPTY_FORM, card_type: activeType || 'QR' });
    setModal(true);
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({
      card_type: card.card_type || 'QR',
      customer_name: card.customer_name || '',
      bank_name: card.bank_name || '',
      card_last_4: card.card_last_4 || '',
      credit_limit: card.credit_limit || '',
      roll_amount: card.roll_amount || '',
      fee_percent: card.fee_percent != null ? (Number(card.fee_percent) * 100).toFixed(4).replace(/\.?0+$/, '') : '',
      bank_fee_percent: card.bank_fee_percent != null ? (Number(card.bank_fee_percent) * 100).toFixed(4).replace(/\.?0+$/, '') : '',
      statement_day: card.statement_day || '',
      due_day: card.due_day || '',
      roll_date: card.roll_date ? card.roll_date.split('T')[0] : '',
      note: card.note || '',
      is_done: !!card.is_done,
    });
    setModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      fee_percent: form.fee_percent ? Number(form.fee_percent) / 100 : 0,
      bank_fee_percent: form.bank_fee_percent ? Number(form.bank_fee_percent) / 100 : 0,
      credit_limit: Number(form.credit_limit) || 0,
      roll_amount: Number(form.roll_amount) || 0,
      statement_day: form.statement_day ? Number(form.statement_day) : null,
      due_day: form.due_day ? Number(form.due_day) : null,
      roll_date: form.roll_date || null,
      is_done: form.is_done ? 1 : 0,
    };
    try {
      if (editing) {
        await axios.put(`/credit-cards/${editing.id}`, payload);
        toast.success('Cập nhật thành công');
      } else {
        await axios.post('/credit-cards/add', payload);
        toast.success('Thêm thẻ thành công');
      }
      setModal(false);
      load();
    } catch {
      toast.error('Lỗi khi lưu thông tin thẻ');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Xóa thẻ này?')) return;
    try {
      await axios.delete(`/credit-cards/${id}`);
      toast.success('Đã xóa');
      load();
    } catch {
      toast.error('Lỗi khi xóa');
    }
  };

  const handleToggleDone = async (id) => {
    try {
      await axios.patch(`/credit-cards/${id}/toggle-done`);
      load();
    } catch {
      toast.error('Lỗi cập nhật');
    }
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="cm-page">
      {/* ── Header ── */}
      <div className="cm-header">
        <div>
          <h1>Quản lý thẻ tín dụng</h1>
          <p>Theo dõi đáo hạn, phí và lợi nhuận từng thẻ</p>
        </div>
        <button className="cm-add-btn" onClick={openAdd}>
          <Plus size={16} /> Thêm thẻ
        </button>
      </div>

      {/* ── Summary ── */}
      <div className="cm-summary">
        <div className="cm-sum-card">
          <span className="lbl">Tổng thẻ</span>
          <span className="val">{summary.total ?? 0}</span>
        </div>
        <div className="cm-sum-card">
          <span className="lbl">Tổng tiền đáo</span>
          <span className="val blue">{fmt(summary.total_roll)}</span>
        </div>
        <div className="cm-sum-card">
          <span className="lbl">Tổng phí VNĐ</span>
          <span className="val red">{fmt(summary.total_fee_vnd)}</span>
        </div>
        <div className="cm-sum-card">
          <span className="lbl">Lợi nhuận</span>
          <span className="val green">{fmt(summary.total_profit)}</span>
        </div>
        <div className="cm-sum-card">
          <span className="lbl">Sắp đến hạn</span>
          <span className="val orange">{summary.danger_count ?? 0}</span>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="cm-toolbar">
        {/* Tab loại thẻ */}
        <div className="cm-tabs">
          <button className={activeType === '' ? 'active' : ''} onClick={() => { setActiveType(''); }}>Tất cả</button>
          {CARD_TYPES.map(t => (
            <button key={t} className={activeType === t ? 'active' : ''} onClick={() => setActiveType(t)}>{t}</button>
          ))}
        </div>

        <div className="cm-controls">
          <div className="cm-search">
            <Search size={15} />
            <input
              placeholder="Tìm tên, ngân hàng, số thẻ..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select value={filter} onChange={e => setFilter(e.target.value)}>
            <option value="">Tất cả trạng thái</option>
            <option value="due_today">Đến hạn hôm nay</option>
            <option value="due_3_days">Sắp hạn (≤3 ngày)</option>
            <option value="overdue">Quá hạn</option>
            <option value="done">Đã xong</option>
            <option value="pending">Chưa xong</option>
          </select>
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <div className="cm-loading"><div className="cm-spinner" /><p>Đang tải...</p></div>
      ) : (
        <div className="cm-table-wrap">
          <table className="cm-table">
            <thead>
              <tr>
                <th>STT</th>
                <th>Loại</th>
                <th>Tên khách</th>
                <th>Ngân hàng</th>
                <th>4 số cuối</th>
                <th className="num">Hạn mức</th>
                <th className="num">Số tiền đáo</th>
                <th className="num">Phí %</th>
                <th className="num">Phí Bank %</th>
                <th className="num">Phí VNĐ</th>
                <th className="num">Lợi nhuận</th>
                <th>Ngày sao kê</th>
                <th>Ngày đến hạn</th>
                <th>Ngày đáo</th>
                <th className="num">Còn lại</th>
                <th>Trạng thái</th>
                <th>Ghi chú</th>
                <th>Xong</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {cards.length === 0 ? (
                <tr><td colSpan={19} className="cm-empty">Không có dữ liệu</td></tr>
              ) : cards.map((c, i) => (
                <tr key={c.id} className={c.is_done ? 'row-done' : ''}>
                  <td>{i + 1}</td>
                  <td><span className={`type-badge type-${c.card_type?.replace(' ', '-')}`}>{c.card_type}</span></td>
                  <td className="name-cell">{c.customer_name}</td>
                  <td>{c.bank_name}</td>
                  <td className="mono">{c.card_last_4 || '—'}</td>
                  <td className="num">{fmt(c.credit_limit)}</td>
                  <td className="num bold">{fmt(c.roll_amount)}</td>
                  <td className="num">{fmtPct(c.fee_percent)}</td>
                  <td className="num">{fmtPct(c.bank_fee_percent)}</td>
                  <td className="num fee">{fmt(c.fee_vnd)}</td>
                  <td className="num profit">{fmt(c.profit)}</td>
                  <td className="center">{c.statement_day ? `Ngày ${c.statement_day}` : '—'}</td>
                  <td className="center">{c.due_day ? `Ngày ${c.due_day}` : '—'}</td>
                  <td className="center">{c.roll_date ? new Date(c.roll_date).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="num">
                    {c.days_left !== null ? (
                      <span className={`days-badge ${c.days_left <= 3 ? 'danger' : c.days_left <= 7 ? 'warn' : 'safe'}`}>
                        {c.days_left}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className={`status-badge ${statusClass(c.status_label)}`}>{c.status_label}</span></td>
                  <td className="note-cell">{c.note || '—'}</td>
                  <td className="center">
                    <button
                      className={`done-btn ${c.is_done ? 'done' : ''}`}
                      onClick={() => handleToggleDone(c.id)}
                      title={c.is_done ? 'Đánh dấu chưa xong' : 'Đánh dấu xong'}
                    >
                      <CheckCircle2 size={18} />
                    </button>
                  </td>
                  <td>
                    <div className="cm-actions">
                      <button className="cm-btn edit" onClick={() => openEdit(c)} title="Sửa"><Edit2 size={14} /></button>
                      <button className="cm-btn del" onClick={() => handleDelete(c.id)} title="Xóa"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Tổng cộng */}
            {cards.length > 0 && (
              <tfoot>
                <tr className="total-row">
                  <td colSpan={5}><strong>Tổng cộng</strong></td>
                  <td className="num"><strong>{fmt(cards.reduce((s, c) => s + Number(c.credit_limit || 0), 0))}</strong></td>
                  <td className="num"><strong>{fmt(cards.reduce((s, c) => s + Number(c.roll_amount || 0), 0))}</strong></td>
                  <td colSpan={2}></td>
                  <td className="num fee"><strong>{fmt(cards.reduce((s, c) => s + Number(c.fee_vnd || 0), 0))}</strong></td>
                  <td className="num profit"><strong>{fmt(cards.reduce((s, c) => s + Number(c.profit || 0), 0))}</strong></td>
                  <td colSpan={8}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div className="cm-overlay" onClick={() => setModal(false)}>
          <div className="cm-modal" onClick={e => e.stopPropagation()}>
            <div className="cm-modal-header">
              <h2>{editing ? 'Sửa thẻ' : 'Thêm thẻ mới'}</h2>
              <button onClick={() => setModal(false)}><XCircle size={22} /></button>
            </div>
            <form onSubmit={handleSubmit} className="cm-form">
              {/* Loại thẻ */}
              <div className="fg full">
                <label>Loại thẻ</label>
                <div className="type-radio">
                  {CARD_TYPES.map(t => (
                    <label key={t} className={`type-opt ${form.card_type === t ? 'active' : ''}`}>
                      <input type="radio" name="card_type" value={t} checked={form.card_type === t} onChange={() => set('card_type', t)} />
                      {t}
                    </label>
                  ))}
                </div>
              </div>

              <div className="fg full">
                <label>Tên khách hàng *</label>
                <input required value={form.customer_name} onChange={e => set('customer_name', e.target.value)} placeholder="VD: NGUYEN VAN A" />
              </div>

              <div className="fg">
                <label>Ngân hàng *</label>
                <input required value={form.bank_name} onChange={e => set('bank_name', e.target.value)} placeholder="VD: ACB" />
              </div>
              <div className="fg">
                <label>4 số cuối thẻ</label>
                <input maxLength={4} value={form.card_last_4} onChange={e => set('card_last_4', e.target.value)} placeholder="VD: 1234" />
              </div>

              <div className="fg">
                <label>Hạn mức (VNĐ)</label>
                <input type="number" value={form.credit_limit} onChange={e => set('credit_limit', e.target.value)} placeholder="0" />
              </div>
              <div className="fg">
                <label>Số tiền đáo (VNĐ)</label>
                <input type="number" value={form.roll_amount} onChange={e => set('roll_amount', e.target.value)} placeholder="0" />
              </div>

              <div className="fg">
                <label>Phí thu khách (%)</label>
                <input type="number" step="0.001" value={form.fee_percent} onChange={e => set('fee_percent', e.target.value)} placeholder="VD: 2 (= 2%)" />
              </div>
              <div className="fg">
                <label>Phí Bank (%)</label>
                <input type="number" step="0.001" value={form.bank_fee_percent} onChange={e => set('bank_fee_percent', e.target.value)} placeholder="VD: 0.7 (= 0.7%)" />
              </div>

              <div className="fg">
                <label>Ngày sao kê (1-31)</label>
                <input type="number" min={1} max={31} value={form.statement_day} onChange={e => set('statement_day', e.target.value)} placeholder="VD: 20" />
              </div>
              <div className="fg">
                <label>Ngày đến hạn (1-31)</label>
                <input type="number" min={1} max={31} value={form.due_day} onChange={e => set('due_day', e.target.value)} placeholder="VD: 5" />
              </div>

              <div className="fg">
                <label>Ngày đáo</label>
                <input type="date" value={form.roll_date} onChange={e => set('roll_date', e.target.value)} />
              </div>
              <div className="fg">
                <label>Đã xong</label>
                <label className="toggle">
                  <input type="checkbox" checked={form.is_done} onChange={e => set('is_done', e.target.checked)} />
                  <span>{form.is_done ? 'Xong' : 'Chưa xong'}</span>
                </label>
              </div>

              <div className="fg full">
                <label>Ghi chú</label>
                <textarea rows={2} value={form.note} onChange={e => set('note', e.target.value)} placeholder="Ghi chú thêm..." />
              </div>

              <div className="cm-form-actions">
                <button type="button" className="cancel" onClick={() => setModal(false)}>Hủy</button>
                <button type="submit" className="save">Lưu</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
