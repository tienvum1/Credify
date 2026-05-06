import { useState, useEffect } from 'react'
import { useLocation, BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import api from './api/axios';
import { initSocket, disconnectSocket } from './utils/socket';
import Login from './pages/Auth/Login/Login';
import Register from './pages/Auth/Register/Register';
import VerifyEmail from './pages/Auth/VerifyEmail/VerifyEmail';
import ForgotPassword from './pages/Auth/ForgotPassword/ForgotPassword';
import ResetPassword from './pages/Auth/ResetPassword/ResetPassword';
import StaffQRManager from './pages/Staff/QRManager/QRManager';
import StaffBookingManager from './pages/Staff/BookingManager/BookingManager';
import StaffBookingDetail from './pages/Staff/BookingDetail/BookingDetail';
import StaffRevenueReport from './pages/Staff/RevenueReport/RevenueReport';
import StaffCardManager from './pages/Staff/CardManager/CardManager';
import AdminUserManager from './pages/Admin/UserManager/UserManager';
import AdminBookingManager from './pages/Admin/BookingManager/AdminBookingManager';
import AdminBookingDetail from './pages/Admin/BookingDetail/AdminBookingDetail';
import AccountantBookingManager from './pages/Accountant/BookingManager/AccountantBookingManager';
import AccountantBookingDetail from './pages/Accountant/BookingDetail/AccountantBookingDetail';
import AdminLayout from './components/AdminLayout/AdminLayout';
import MyBookings from './pages/MyBookings/MyBookings';
import MyBookingDetail from './pages/MyBookings/MyBookingDetail';
import BookingPayment from './pages/QRDetail/BookingPayment';
import Home from './pages/Home/Home';
import QRDetail from './pages/QRDetail/QRDetail';
import Notifications from './pages/Notifications/Notifications';
import Profile from './pages/Profile/Profile';
import Header from './components/Header/Header';
import './App.scss'

// Component để ẩn Header ở một số Route nhất định
const LayoutWrapper = ({ user, handleLogout, children }) => {
  const location = useLocation();
  const isExcludedPath = location.pathname.startsWith('/admin');
  return (
    <>
      {!isExcludedPath && <Header user={user} handleLogout={handleLogout} />}
      {children}
    </>
  );
};

// Component bảo vệ Route dựa trên Role
const ProtectedRoute = ({ user, allowedRoles, children }) => {
  if (!user) return <Navigate to="/login" />;
  if (!allowedRoles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const AuthRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/login" />;
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Kiểm tra phiên đăng nhập qua Cookie
    api.get('/auth/me')
      .then(res => {
        const userData = res.data.user;
        setUser(userData);
        setLoading(false);
        // Khởi tạo Socket khi có user
        if (userData) {
          initSocket(userData);
        }
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });

    return () => {
      disconnectSocket();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await api.get('/auth/logout');
      disconnectSocket();
      setUser(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Lỗi đăng xuất:', err);
    }
  };

  if (loading) return <div className="loading-screen">Đang tải...</div>;

  return (
    <Router>
      <LayoutWrapper user={user} handleLogout={handleLogout}>
        <Routes>
        <Route
          path="/"
          element={
            user?.role === 'accountant' 
              ? <Navigate to="/accountant/bookings" replace /> 
              : <Home />
          }
        />
        <Route path="/qrs/:id" element={<QRDetail />} />
        <Route
          path="/payment/:bookingId"
          element={
            <AuthRoute user={user}>
              <BookingPayment />
            </AuthRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email/:token" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />
        <Route
          path="/my-bookings"
          element={
            <AuthRoute user={user}>
              <MyBookings />
            </AuthRoute>
          }
        />
        <Route
          path="/my-bookings/:id"
          element={
            <AuthRoute user={user}>
              <MyBookingDetail />
            </AuthRoute>
          }
        />
        <Route
          path="/notifications"
          element={
            <AuthRoute user={user}>
              <Notifications user={user} />
            </AuthRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <AuthRoute user={user}>
              <Profile />
            </AuthRoute>
          }
        />


        <Route 
          path="/staff/bookings" 
          element={
            <ProtectedRoute user={user} allowedRoles={['staff']}>
              <StaffBookingManager />
            </ProtectedRoute>
          } 
        />
        <Route
          path="/staff/bookings/:id"
          element={
            <ProtectedRoute user={user} allowedRoles={['staff']}>
              <StaffBookingDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/revenue"
          element={
            <ProtectedRoute user={user} allowedRoles={['staff']}>
              <StaffRevenueReport />
            </ProtectedRoute>
          }
        />
        <Route
          path="/staff/notifications"
          element={
            <ProtectedRoute user={user} allowedRoles={['staff']}>
              <Notifications user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accountant/bookings"
          element={
            <ProtectedRoute user={user} allowedRoles={['accountant', 'admin_system']}>
              <AccountantBookingManager />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accountant/bookings/:id"
          element={
            <ProtectedRoute user={user} allowedRoles={['accountant', 'admin_system']}>
              <AccountantBookingDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={<AdminLayout user={user} handleLogout={handleLogout} />}
        >
          <Route path="users" element={<AdminUserManager />} />
          <Route path="bookings" element={<AdminBookingManager />} />
          <Route path="bookings/:id" element={<AdminBookingDetail />} />
          <Route path="notifications" element={<Notifications user={user} />} />
          <Route path="qrs" element={<StaffQRManager />} />
          <Route path="cards" element={<StaffCardManager />} />
          <Route path="revenue" element={<StaffRevenueReport />} />
        </Route>
      </Routes>
      </LayoutWrapper>
    </Router>
  )
}

export default App
