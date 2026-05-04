import { useState, useEffect, useRef } from 'react';
import { Bell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import './NotificationDropdown.scss';

const NotificationDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const [notifRes, countRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/unread-count')
      ]);
      setNotifications(notifRes.data);
      setUnreadCount(countRes.data.unread_count);
    } catch (err) {
      // Nếu là lỗi 401 hoặc lỗi mạng, ta không log console.error để tránh spam devtools
      if (err.response?.status !== 401 && err.code !== 'ERR_NETWORK') {
        console.error('Lỗi khi tải thông báo:', err);
      }
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotifications();
    }, 0);
    
    const interval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Lỗi khi đánh dấu đã đọc:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Lỗi khi đánh dấu tất cả đã đọc:', err);
    }
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      hour: '2-digit', 
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getLink = (notif) => {
    if (!notif.booking_id) return '#';
    // Nếu là user hoặc staff thì dẫn tới đúng trang chi tiết
    // (Thực tế link này có thể cần check role nhưng /my-bookings/:id dùng chung cho user được)
    return `/my-bookings/${notif.booking_id}`;
  };

  return (
    <div className="notification-dropdown-container" ref={dropdownRef}>
      <button 
        className="notification-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo"
      >
        <Bell size={20} />
        {unreadCount > 0 && <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-dropdown">
          <div className="notif-header">
            <h3>Thông báo</h3>
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="mark-all-read">
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">Không có thông báo nào</div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`notif-item ${notif.is_read ? 'read' : 'unread'}`}
                  onClick={() => {
                    if (!notif.is_read) markAsRead(notif.id);
                    setIsOpen(false);
                  }}
                >
                  <Link to={getLink(notif)} className="notif-link">
                    <div className="notif-content">
                      <p className="notif-title">{notif.title}</p>
                      <p className="notif-message">{notif.message}</p>
                      <span className="notif-time">
                        <Clock size={12} /> {formatTime(notif.created_at)}
                      </span>
                    </div>
                  </Link>
                  {!notif.is_read && <div className="unread-dot" />}
                </div>
              ))
            )}
          </div>
          
          <div className="notif-footer">
            <Link to="/notifications" onClick={() => setIsOpen(false)}>Xem tất cả</Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
