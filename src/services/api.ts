import axios from 'axios';
import CryptoJS from 'crypto-js';
import { toast } from 'react-hot-toast';

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (import.meta.env.DEV) {
    return '/api';
  }
  if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    if (!envUrl || envUrl.includes('localhost')) {
      return '/api';
    }
  }
  return envUrl || '/api';
};

const API_URL = getApiBaseUrl();
const AES_SECRET = import.meta.env.VITE_AES_SECRET || 'super_secret_aes_key';

const encrypt = (data: any) => {
  return CryptoJS.AES.encrypt(JSON.stringify(data), AES_SECRET).toString();
};

const decrypt = (ciphertext: string) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, AES_SECRET);
  return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
};

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Encrypt body if present
  if (config.data && import.meta.env.VITE_ENFORCE_ENCRYPTION === 'true') {
     config.data = encrypt(config.data);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    // Decrypt data if it's an object with a 'data' field containing a string
    if (response.data && response.data.data && typeof response.data.data === 'string') {
      response.data = decrypt(response.data.data);
    }
    return response;
  },
  (error) => {
    const status = error.response ? error.response.status : null;
    const requestUrl = error.config?.url || '';
    const responseMessage = String(error.response?.data?.message || '').toLowerCase();
    const skipGlobalErrorToast = Boolean(error.config?.skipGlobalErrorToast);
    const isAuthLogin = requestUrl.includes('/auth/login');
    const isAuthRegister = requestUrl.includes('/auth/register');
    const isTokenExpiredOrInvalid = responseMessage.includes('invalid or expired token');

    if (skipGlobalErrorToast) {
      return Promise.reject(error);
    }

    if ((status === 401 || (status === 403 && isTokenExpiredOrInvalid)) && !isAuthLogin && !isAuthRegister) {
      toast.error('Sesión expirada. Por favor, inicie sesión de nuevo.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (status === 401 && isAuthLogin) {
      toast.error('Credenciales inválidas');
    } else if (status === 403) {
      toast.error('No tiene permisos para realizar esta acción.');
    } else if (status >= 500) {
      toast.error('Error en el servidor. Estamos trabajando para solucionarlo.');
    } else if (!status) {
      toast.error('Error de conexión. Verifique su internet.');
    }

    return Promise.reject(error);
  }
);

export default api;
