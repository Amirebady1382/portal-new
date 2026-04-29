import axios, { AxiosInstance, AxiosError } from 'axios';

// ایجاد axios instance با تنظیمات امن
const apiClient: AxiosInstance = axios.create({
  baseURL: '',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor برای اضافه کردن token به header
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor برای مدیریت errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle token expiration
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // اگر در صفحه لاگین نیستیم، کاربر را به لاگین هدایت کن
      if (!currentPath.includes('/login')) {
        localStorage.removeItem('auth_token');
        window.location.href = '/login';
      }
    }
    
    // استخراج پیام خطای مناسب
    let errorMessage = 'خطای غیرمنتظره رخ داده است';
    
    if (error.response?.data) {
      const responseData = error.response.data as any;
      errorMessage = responseData.message || responseData.error || errorMessage;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;

// Helper function برای API calls
export const apiRequest = async <T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  data?: any
): Promise<T> => {
  try {
    const response = await apiClient.request<T>({
      method,
      url,
      data,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};
