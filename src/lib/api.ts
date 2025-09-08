// QuickBooks API
// API Base URL - now from .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

export const quickbooksAPI = {
  // Save client app keys (admin-only)
  saveKeys: (clientId: string, keys: { qb_client_id: string; qb_client_secret: string }) =>
    api.post(`/api/qbo/${clientId}/keys`, keys),

  // Start OAuth (opens Intuit consent flow)
  connect: (clientId: string) =>
    window.open(`${API_BASE_URL}/api/qbo/${clientId}/connect`, 'qbo', 'width=900,height=800'),

  // Poll connection status
  getStatus: (clientId: string) =>
    api.get(`/api/qbo/${clientId}/status`),

  // Disconnect (revoke)
  disconnect: (clientId: string, tokenType: 'refresh' | 'access' = 'refresh') =>
    api.post(`/api/qbo/${clientId}/disconnect`, { tokenType }),

  // Fetch Chart of Accounts (CoA)
  getAccounts: (clientId: string) =>
    api.get(`/api/qbo/${clientId}/accounts`),

  // List register accounts (Bank/CC)
  getRegisterAccounts: (clientId: string) =>
    api.get(`/api/qbo/${clientId}/register-accounts`),

  // Set register for an upload
  setRegister: (clientId: string, uploadId: string, reg: { qbo_register_account_id: string; qbo_register_account_type: string }) =>
    api.post(`/api/qbo/${clientId}/uploads/${uploadId}/register`, reg),

  // Push selected transactions
  pushSelected: (clientId: string, transactionIds: string[]) =>
    api.post(`/api/qbo/${clientId}/push`, { transactionIds }),

  // Push all approved for one upload
  pushAllApproved: (clientId: string, uploadId: string) =>
    api.post(`/api/qbo/${clientId}/push`, { uploadId, pushAllApproved: true }),
};
// Category API
export interface Category {
  _id: string;
  name: string;
  created_by: string;
}

export const categoriesAPI = {
  getCategories: (): Promise<AxiosResponse<Category[]>> =>
    api.get('/categories'),
  createCategory: (data: { name: string }): Promise<AxiosResponse<Category>> =>
    api.post('/categories', data),
  updateCategory: (id: string, data: { name: string }): Promise<AxiosResponse<Category>> =>
    api.put(`/categories/${id}`, data),
  deleteCategory: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/categories/${id}`),
};

// Clients API
export interface Client {
  _id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  created_by: string;
}

export const clientsAPI = {
  getClients: (): Promise<AxiosResponse<Client[]>> =>
    api.get('/clients'),
  createClient: (data: { name: string; email: string; phone: string }): Promise<AxiosResponse<Client>> =>
    api.post('/clients', data),
  updateClient: (id: string, data: { name: string; email: string; phone: string }): Promise<AxiosResponse<Client>> =>
    api.put(`/clients/${id}`, data),
  deleteClient: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/clients/${id}`),
};
import axios, { AxiosResponse } from 'axios';



// Create axios instance with credentials enabled
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Always send cookies
});

// Debug: Log all requests and responses
api.interceptors.request.use((config) => {
  // Print cookies before request
  console.debug('[API] Request:', config.method?.toUpperCase(), config.url);
  console.debug('[API] Document.cookie:', document.cookie);
  return config;
});
api.interceptors.response.use(
  (response) => {
    console.debug('[API] Response:', response.config.url, response.status, response.data);
    // Print cookies after response
    console.debug('[API] Document.cookie (after response):', document.cookie);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error('[API] Error response:', error.response.config.url, error.response.status, error.response.data);
    } else {
      console.error('[API] Error:', error.message);
    }
    // Print cookies on error
    console.debug('[API] Document.cookie (on error):', document.cookie);
    return Promise.reject(error);
  }
);

// Token management is now handled via HTTP-only cookies set by the backend.

// No request interceptor needed for Authorization header. Cookies will be sent automatically with withCredentials: true.

// No response interceptor needed for token refresh. The backend should handle refresh via cookies.

// API Types
export interface User {
  user_id: string;
  name: string;
  email: string;
  role: 'admin' | 'worker';
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Upload {
  upload_id: string;
  client_id: string;
  original_filename: string;
  uploaded_by: string;
  upload_timestamp: string;
  status: 'pending_parse' | 'processing' | 'completed' | 'failed';
}

export interface Transaction {
  transaction_id: string;
  upload_id: string;
  transaction_date: string;
  vendor_name: string;
  amount: number;
  payment_type: string;
  transaction_type: string;
  auto_category: string;
  manual_category: string | null;
  approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rule {
  rule_id: string;
  client_id: string;
  vendor_contains: string;
  map_to_account: string;
  created_by: string;
  created_at: string;
  active: boolean;
}

export interface LogEntry {
  log_id: string;
  user_id: {
    _id: string;
    name: string;
    email: string;
    role: string;
  };
  action_type: string;
  target_type: string;
  target_id: string;
  timestamp: string;
}

// Auth API
export const authAPI = {
  register: (userData: {
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'worker';
  }): Promise<AxiosResponse<User>> =>
    api.post('/auth/register', userData),

  login: (credentials: {
    email: string;
    password: string;
  }): Promise<AxiosResponse<LoginResponse>> => {
    return api.post('/auth/login', credentials)
      .then((res) => {
        // Save tokens in localStorage and cookie for debugging (not secure for prod)
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('refresh_token', res.data.refresh_token);
        document.cookie = `access_token=${res.data.access_token}; path=/; max-age=3600`;
        return res;
      });
  },

  refresh: (refreshToken: string): Promise<AxiosResponse<{ access_token: string; expires_in: number }>> =>
    api.post('/auth/refresh', { refresh_token: refreshToken }),

  getMe: (): Promise<AxiosResponse<User>> =>
    api.get('/auth/me'),

  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/logout', {}),
};

// Upload API
export const uploadAPI = {
  upload: (file: File, client_id?: string): Promise<AxiosResponse<any>> => {
    const formData = new FormData();
    formData.append('file', file);
    if (client_id) formData.append('client_id', client_id);
    return api.post('/uploads', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getUploads: (): Promise<AxiosResponse<Upload[]>> =>
    api.get('/uploads'),
};

// Transaction API
export const transactionAPI = {
  getTransactions: (uploadId: string): Promise<AxiosResponse<Transaction[]>> =>
    api.get(`/transactions/${uploadId}`),

  updateTransaction: (
    transactionId: string,
    updates: { manual_category?: string; approved?: boolean }
  ): Promise<AxiosResponse<Transaction>> =>
    api.patch(`/transactions/${transactionId}`, updates),

  getTransactionsByClient: (clientId: string): Promise<AxiosResponse<Transaction[]>> =>
    api.get(`/transactions/client/${clientId}`),
};

// Rules API
export const rulesAPI = {
  createRule: (rule: {
    client_id: string;
    vendor_contains: string;
    map_to_account: string;
  }): Promise<AxiosResponse<Rule>> =>
    api.post('/rules', rule),

  getRules: (clientId: string): Promise<AxiosResponse<Rule[]>> =>
    api.get(`/rules/${clientId}`),

  updateRule: (
    ruleId: string,
    updates: { vendor_contains?: string; map_to_account?: string; active?: boolean }
  ): Promise<AxiosResponse<Rule>> =>
    api.patch(`/rules/${ruleId}`, updates),

  deleteRule: (ruleId: string): Promise<AxiosResponse<void>> =>
    api.delete(`/rules/${ruleId}`),
};

// Dashboard API
export const dashboardAPI = {
  getUploads: (): Promise<AxiosResponse<any[]>> =>
    api.get('/dashboard/uploads'),

  getPendingApprovals: (): Promise<AxiosResponse<any[]>> =>
    api.get('/dashboard/pending-approvals'),

  getSyncHistory: (): Promise<AxiosResponse<any[]>> =>
    api.get('/dashboard/sync-history'),
};

// Logs API
export const logsAPI = {
  getLogs: (params?: {
    user?: string;
    date?: string;
    action?: string;
  }): Promise<AxiosResponse<LogEntry[]>> =>
    api.get('/logs', { params }),

  rollback: (uploadId: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/rollback/${uploadId}`),
};

// TokenManager removed; token is managed via cookies
export default api;