import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import './Home.scss';

const Home = () => {
  const [qrs, setQrs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const getUserFee = (qr, userLevel) => {
    const level = userLevel || 0;
    if (level === 1) return qr.fee_rate_l1;
    if (level === 2) return qr.fee_rate_l2;
    if (level === 3) return qr.fee_rate_l3;
    return qr.fee_rate; // Vẫn giữ làm fallback nếu user không có cấp
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [qrsRes, userRes] = await Promise.all([
          api.get('/qrs/ready'),
          api.get('/auth/me').catch(() => ({ data: { user: null } }))
        ]);
        setQrs(qrsRes.data);
        setUser(userRes.data.user);
      } catch (err) {
        console.error('Lỗi khi tải dữ liệu:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div className="home-loading">Đang tải dữ liệu...</div>;

  return (
    <div className="home-container">
      <section className="hero-section">
        <div className="hero-content">
          <h1>Chào mừng đến với <span className="brand-accent">Credify</span></h1>
        
        </div>
      </section>

      <section className="qr-showcase" id="ready-qrs">
        <h2>Các thẻ QR đang sẵn sàng</h2>
        {!user ? (
          <div className="login-to-view">
            <div className="lock-icon">🔒</div>
            <h3>Vui lòng đăng nhập</h3>
            <p>Bạn cần đăng nhập tài khoản để xem danh sách thẻ QR và sử dụng dịch vụ.</p>
            <Link to="/login" className="login-btn">Đăng nhập ngay</Link>
          </div>
        ) : qrs.length === 0 ? (
          <div className="no-qrs">Hiện tại chưa có thẻ QR nào sẵn sàng.</div>
        ) : (
          <div className="qr-grid">
            {qrs.map(qr => {
              const userFee = getUserFee(qr, user?.level);
              return (
                <div key={qr.id} className="qr-card">
                  <div className="qr-image-wrapper">
                    <img src={qr.main_image} alt="QR Payment" />
                  </div>
                  <div className="qr-details">
                    <div className="qr-header">
                      {qr.name && <h3 className="qr-name">{qr.name}</h3>}
                      <span className="qr-fee">
                        Phí: {userFee}% 
                      </span>
                    </div>
                    <p className="qr-limit">
                    <strong>Số tiền tối đa 1 lần chuyển:</strong> {Math.round(Number(qr.max_amount_per_trans)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} VNĐ/gd
                    </p>
                    <Link to={`/qrs/${qr.id}`} className="use-now-btn">Tạo đơn</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default Home;
