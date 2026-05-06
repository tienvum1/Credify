import { useState, useEffect, useRef } from 'react';
import { Bell, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { getSocket } from '../../utils/socket';
import './NotificationDropdown.scss';

const NotificationDropdown = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    if (!user) return;
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
    if (!user) return;
    
    // Fetch ban đầu
    fetchNotifications();

    // Lắng nghe realtime qua Socket
    const socket = getSocket();
    if (socket) {
      // Thông báo cho user bình thường
      socket.on("new_notification", (newNotif) => {
        setNotifications(prev => [newNotif, ...prev].slice(0, 20));
        setUnreadCount(prev => prev + 1);
        // Có thể thêm tiếng chuông ở đây nếu muốn
      });

      // Thông báo cho Staff (đơn mới, khách thanh toán)
      if (user.role === 'staff' || user.role === 'admin_system') {
        socket.on("new_booking_notification", (newNotif) => {
          setNotifications(prev => [newNotif, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
        });
      }
    }
    
    // Interval dự phòng (giảm tần suất xuống 1 phút vì đã có socket)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);
    
    return () => {
      if (socket) {
        socket.off("new_notification");
        socket.off("new_booking_notification");
      }
      clearInterval(interval);
    };
  }, [user]);

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
      day: '2-digit',
      month: '2-digit'
    });
  };

  const getLink = (notif) => {
    if (!notif.booking_id) return '#';
    
    // Nếu là staff/admin/accountant thì dẫn tới trang quản lý của staff
    if (user && ['staff', 'admin_system', 'accountant'].includes(user.role)) {
      return `/staff/bookings/${notif.booking_id}`;
    }
    
    // Ngược lại dẫn tới trang của khách
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
