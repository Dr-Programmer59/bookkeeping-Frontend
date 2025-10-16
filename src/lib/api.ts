import axios, { AxiosResponse } from 'axios';

// API Base URL - now from .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

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
  // Add Authorization header if token exists
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Print cookies before request
  console.debug('[API] Request:', config.method?.toUpperCase(), config.url);
  console.debug('[API] Document.cookie:', document.cookie);
  console.debug('[API] Authorization header:', config.headers.Authorization ? 'Present' : 'Missing');
  return config;
});
api.interceptors.response.use(
  (response) => {
    console.debug('[API] Response:', response.config.url, response.status, response.data);
    // Print cookies after response
    console.debug('[API] Document.cookie (after response):', document.cookie);
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response) {
      // Don't log expected 404 for unified dashboard API (uses fallback)
      const isDashboard404 = error.response.config.url === '/dashboard' && error.response.status === 404;
      if (!isDashboard404) {
        console.error('[API] Error response:', error.response.config.url, error.response.status, error.response.data);
      }
      
      // Handle 401 unauthorized - attempt token refresh
      if (error.response.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshResponse = await api.post('/auth/refresh', { refresh_token: refreshToken });
            const newToken = refreshResponse.data.access_token;
            
            // Update stored token
            localStorage.setItem('access_token', newToken);
            document.cookie = `access_token=${newToken}; path=/; max-age=3600`;
            
            // Retry original request with new token
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return api(originalRequest);
          } catch (refreshError) {
            // Refresh failed, redirect to login
            console.error('[API] Token refresh failed:', refreshError);
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }
      }
    } else {
      console.error('[API] Error:', error.message);
    }
    
    // Print cookies on error
    console.debug('[API] Document.cookie (on error):', document.cookie);
    return Promise.reject(error);
  }
);

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

export interface COAUploadResponse {
  message: string;
  coa_id: string;
  version: number;
  accounts_count: number;
}

// QuickBooks API
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

// Export API
export const exportAPI = {
  // QuickBooks Online Export (per API guide)
  exportToQBO: (data: {
    client_id: string;
    upload_id: string;
    transaction_ids: string[];
  }): Promise<AxiosResponse<{
    message: string;
    exported_count: number;
    failed_count: number;
    qbo_responses: Array<{
      transaction_id: string;
      qbo_id: string;
      status: string;
    }>;
  }>> =>
    api.post('/export/qbo', data),

  // QuickBooks Desktop Export (per API guide)  
  exportToQBD: (data: {
    client_id: string;
    upload_id: string;
    transaction_ids: string[];
    export_format: 'journal_entries' | 'bank_transactions';
  }): Promise<AxiosResponse<{
    message: string;
    file_url: string;
    file_name: string;
    transactions_count: number;
  }>> =>
    api.post('/export/qbd', data),

  // Direct IIF file download for QuickBooks Desktop
  exportIIFDirect: (clientId: string, data: {
    transaction_ids: string[];
    register_account_name: string;
  }): Promise<AxiosResponse<Blob>> =>
    api.post(`/export/qbd/${clientId}/iif`, data, {
      responseType: 'blob',
    }),

  // Legacy endpoints (keep for backward compatibility)
  getExportOptions: (clientId: string): Promise<AxiosResponse<any>> =>
    api.get(`/export/${clientId}/options`),

  exportQBDIIF: (clientId: string, data: {
    transactionIds?: string[];
    pushAllApproved?: boolean;
    registerAccountName: string;
  }): Promise<AxiosResponse<Blob>> =>
    api.post(`/export/qbd/${clientId}/iif`, data, {
      responseType: 'blob',
    }),

  previewQBDExport: (clientId: string, data: {
    transactionIds: string[];
    registerAccountName: string;
  }): Promise<AxiosResponse<any>> =>
    api.post(`/export/qbd/${clientId}/preview`, data),

  pushToQBO: (clientId: string, data: {
    transactionIds?: string[];
    pushAllApproved?: boolean;
  }): Promise<AxiosResponse<any>> =>
    api.post(`/export/qbo/${clientId}/push`, data),
};

// COA API
export const coaAPI = {
  uploadCOA: (clientId: string, file: File): Promise<AxiosResponse<COAUploadResponse>> => {
    const formData = new FormData();
    formData.append('coa_file', file);
    return api.post(`/coa/${clientId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getActiveCOA: (clientId: string): Promise<AxiosResponse<any>> =>
    api.get(`/coa/${clientId}`),

  getCOAAccounts: (clientId: string): Promise<AxiosResponse<any>> =>
    api.get(`/coa/${clientId}/accounts`),

  getCOAHistory: (clientId: string): Promise<AxiosResponse<any>> =>
    api.get(`/coa/${clientId}/history`),

  // Check COA upload status for desktop clients
  getCOAStatus: (clientId: string): Promise<AxiosResponse<{
    has_csv_uploaded: boolean;
    coa_details: {
      coa_id: string;
      filename: string;
      uploaded_at: string;
      version: number;
      file_exists: boolean;
    } | null;
  }>> =>
    api.get(`/coa/${clientId}/status`),

  // Get COA CSV data content as JSON
  getCOAData: (clientId: string): Promise<AxiosResponse<{
    coa_id: string;
    filename: string;
    uploaded_at: string;
    version: number;
    total_rows: number;
    headers: string[];
    data: Array<{
      "": string;
      "Accnt. #": string;
      "Account": string;
      "Type": string;
      "Detail Type": string;
      "Balance": string;
    }>;
  }>> =>
    api.get(`/coa/${clientId}/data`),
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
  client_number: number;
  account_type: 'online' | 'desktop';
  qb_client_id?: string;
  qb_client_secret?: string;
  qb_realm_id?: string;
  coa_active_version?: string;
  created_at: string;
  created_by: string;
}

export const clientsAPI = {
  getClients: (): Promise<AxiosResponse<Client[]>> =>
    api.get('/clients'),
  createClient: (data: { 
    name: string; 
    client_number: number; 
    account_type: 'online' | 'desktop';
    qb_client_id?: string;
    qb_client_secret?: string;
    qb_realm_id?: string;
  }): Promise<AxiosResponse<Client>> =>
    api.post('/clients', data),
  updateClient: (id: string, data: { 
    name: string; 
    client_number: number; 
    account_type: 'online' | 'desktop';
    qb_client_id?: string;
    qb_client_secret?: string;
    qb_realm_id?: string;
  }): Promise<AxiosResponse<Client>> =>
    api.put(`/clients/${id}`, data),
  deleteClient: (id: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/clients/${id}`),
};

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

  getTransactionsByClient: (clientId: string): Promise<AxiosResponse<Transaction[]>> =>
    api.get(`/transactions/client/${clientId}`),

  updateTransaction: (transactionId: string, data: { manual_category?: string; approved?: boolean }): Promise<AxiosResponse<any>> =>
    api.patch(`/transactions/${transactionId}`, data),


  rollback: (uploadId: string): Promise<AxiosResponse<{ message: string }>> =>
    api.post(`/rollback/${uploadId}`),

  getClientCOACategories: (clientId: string): Promise<AxiosResponse<any>> =>
    api.get(`/transactions/client/${clientId}/coa-categories`),

  bulkUpdateTransactions: (data: {
    transaction_ids: string[];
    updates: { manual_category?: string; approved?: boolean };
  }): Promise<AxiosResponse<any>> =>
    api.patch('/transactions/bulk/update', data),
};

// Dashboard API
export const dashboardAPI = {
  // Unified dashboard data (per API guide)
  getDashboard: (): Promise<AxiosResponse<{
    total_clients: number;
    total_uploads: number;
    total_transactions: number;
    categorized_transactions: number;
    uncategorized_transactions: number;
    recent_uploads: Array<{
      _id: string;
      original_filename: string;
      client_name: string;
      upload_date: string;
      status: string;
      transactions_count: number;
    }>;
  }>> =>
    api.get('/dashboard'),

  // Legacy endpoints (keep for backward compatibility)
  getUploads: (): Promise<AxiosResponse<Upload[]>> =>
    api.get('/uploads'),

  getPendingApprovals: (): Promise<AxiosResponse<any[]>> =>
    api.get('/dashboard/pending-approvals'),

  getSyncHistory: (): Promise<AxiosResponse<any[]>> =>
    api.get('/dashboard/sync-history'),
};

// Rules API
export const rulesAPI = {
  getRules: (clientId: string): Promise<AxiosResponse<any>> =>
    api.get(`/rules/${clientId}`),
  createRule: (data: {
    client_id: string;
    vendor_contains: string;
    map_to_account: string;
  }): Promise<AxiosResponse<any>> =>
    api.post('/rules', data),
  updateRule: (ruleId: string, data: {
    vendor_contains?: string;
    map_to_account?: string;
    active?: boolean;
  }): Promise<AxiosResponse<any>> =>
    api.put(`/rules/${ruleId}`, data),
  deleteRule: (ruleId: string): Promise<AxiosResponse<{ message: string }>> =>
    api.delete(`/rules/${ruleId}`),
};

// Utility functions for client workflow detection (per API guide)
export const getClientWorkflow = (client: Client) => {
  if (client.account_type === 'online') {
    return {
      needsCOA: false,
      exportMethod: 'qbo',
      categorySource: 'quickbooks_api'
    };
  } else {
    return {
      needsCOA: true,
      exportMethod: 'iif',
      categorySource: 'uploaded_coa'
    };
  }
};

// TokenManager removed; token is managed via cookies
export default api;