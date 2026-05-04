import axios from 'axios';
import { toast } from 'react-toastify';

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api',
  withCredentials: true,
});

instance.interceptors.response.use(
  (response) => {
    const message = response?.data?.message;
    const method = String(response?.config?.method || '').toLowerCase();

    if (message && method !== 'get') {
      toast.success(message, { position: 'top-right' });
    }

    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || '';
    let message = error?.response?.data?.message;

    if (status === 401) {
      // Nếu là lỗi 401 (Unauthorized)
      if (url.includes('/auth/me')) {
        // /auth/me có thể 401 khi chưa đăng nhập, không cần toast.
        return Promise.reject(error);
      }
      
      message = 'Vui lòng đăng nhập để tiếp tục.';
      // Có thể chuyển hướng về trang login nếu cần, 
      // nhưng ở đây ta chỉ toast thông báo theo yêu cầu.
    }

    toast.error(message || 'Có lỗi xảy ra, vui lòng thử lại.', { 
      position: 'top-right',
      toastId: status === 401 ? 'auth-error' : undefined // Tránh spam nhiều toast 401
    });

    return Promise.reject(error);
  }
);

export default instance;
