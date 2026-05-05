import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Clock, CheckCircle, Info, AlertCircle, ShoppingBag } from 'lucide-react';
import api from '../../api/axios';
import './Notifications.scss';

const Notifications = ({ user }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30;

  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const res = await api.get('/notifications');
        if (active) {
          setNotifications(res.data);
          setLoading(false);
        }
      } catch (err) {
        console.error('Lỗi khi tải thông báo:', err);
        if (active) setLoading(false);
      }
    };
    loadData();
    return () => { active = false; };
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    let d = new Date(dateStr);
    
    // Nếu dateStr là string và không có thông tin múi giờ, ta coi nó là UTC (do backend config)
    if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
      const utcDate = new Date(dateStr.replace(' ', 'T') + 'Z');
      if (!isNaN(utcDate.getTime())) d = utcDate;
    }

    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleString('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getIcon = (type) => {
    switch (type) {
      case 'booking_created': return <ShoppingBag className="icon-blue" size={20} />;
      case 'staff_confirmed': return <CheckCircle className="icon-green" size={20} />;
      case 'rejected': return <AlertCircle className="icon-red" size={20} />;
      default: return <Info className="icon-gray" size={20} />;
    }
  };

  const getLink = (notif) => {
    if (!notif.booking_id) return '#';
    
    // Nếu là staff/admin/accountant thì dẫn tới trang quản lý của staff
    if (user && ['staff', 'admin_system', 'accountant'].includes(user.role)) {
      return `/staff/bookings/${notif.booking_id}`;
    }
    
    return `/my-bookings/${notif.booking_id}`;
  };

  const totalPages = Math.ceil(notifications.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = notifications.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    return (
      <div className="pagination">
        <button
          type="button"
          className="page-btn"
          disabled={currentPage === 1}
          onClick={() => handlePageChange(currentPage - 1)}
        >
          Trước
        </button>

        {start > 1 && (
          <>
            <button type="button" className="page-btn" onClick={() => handlePageChange(1)}>1</button>
            {start > 2 && <span className="page-ellipsis">...</span>}
          </>
        )}

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`page-btn ${currentPage === p ? 'active' : ''}`}
            onClick={() => handlePageChange(p)}
          >
            {p}
          </button>
        ))}

        {end < totalPages && (
          <>
            {end < totalPages - 1 && <span className="page-ellipsis">...</span>}
            <button type="button" className="page-btn" onClick={() => handlePageChange(totalPages)}>{totalPages}</button>
          </>
        )}

        <button
          type="button"
          className="page-btn"
          disabled={currentPage === totalPages}
          onClick={() => handlePageChange(currentPage + 1)}
        >
          Sau
        </button>
      </div>
    );
  };

  if (loading) return <div className="notifications-loading">Đang tải thông báo...</div>;

  return (
    <div className="notifications-page">
      <div className="notifications-header">
        <div className="header-title">
          <h1>Thông báo của tôi</h1>
          <p>Cập nhật những thông tin mới nhất về đơn hàng của bạn</p>
        </div>
        {notifications.some(n => !n.is_read) && (
          <button className="mark-all-btn" onClick={markAllAsRead}>
            Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="notifications-container">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <Bell size={48} />
            <p>Bạn chưa có thông báo nào</p>
            <Link to="/" className="back-home-btn">Quay về trang chủ</Link>
          </div>
        ) : (
          <>
            <div className="notifications-list">
              {currentItems.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notification-card ${notif.is_read ? 'read' : 'unread'}`}
                  onClick={() => !notif.is_read && markAsRead(notif.id)}
                >
                  <div className="card-icon">
                    {getIcon(notif.type)}
                  </div>
                  <div className="card-content">
                    <Link to={getLink(notif)} className="card-link">
                      <h3 className="card-title">{notif.title}</h3>
                      <p className="card-message">{notif.message}</p>
                      <span className="card-time">
                        <Clock size={14} /> {formatDateTime(notif.created_at)}
                      </span>
                    </Link>
                  </div>
                  {!notif.is_read && <div className="unread-indicator" />}
                </div>
              ))}
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default Notifications;
