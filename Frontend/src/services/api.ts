// Service for API calls (v2)
import axios from 'axios';
import { toast } from 'sonner';

interface NewUserData {
  username: string;
  password: string;
  role: 'admin' | 'staff';
  full_name?: string;
  email?: string;
  permissions?: string[];
  branch_access?: number[];
}

interface Branch {
  id: number;
  name: string;
  code?: string | null;
}

interface Product {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  title: string;
  amount: number;
  date: string;
  remark: string | null;
  branchId?: number | null;
  branchName?: string | null;
}

interface Locker {
  id: number;
  lockerNumber: string;
  isAssigned: boolean;
  studentId?: number;
  studentName?: string;
  branchId?: number | null;
  branchName?: string | null;
}

interface LibraryProfile {
  id: number;
  libraryCode: string;
  libraryName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  createdAt: string;
  status: string;
}

export interface Vote {
  id: number;
  studentId: number;
  queryId: number;
  voteType: 'upvote' | 'downvote';
}

export interface Comment {
  id: number;
  commentText: string;
  commenterName: string;
  createdAt: string;
  replies?: Comment[];
  parentCommentId: number | null;
}

export interface Query {
  id: number;
  libraryId: number;
  studentId: number;
  title: string;
  description: string;
  status: 'Posted' | 'Approved' | 'Not Approved' | 'Done' | 'Not Done';
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  studentName: string;
  comments?: Comment[];
  userVote?: 'upvote' | 'downvote' | null;
}

export interface StudentProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  registrationNumber: string;
  address: string;
  membershipStart: string;
  membershipEnd: string;
  status: string;
}

export interface AttendanceHistoryRecord {
  id: number;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
}

interface Student {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  registrationNumber?: string | null;
  fatherName?: string | null;
  aadharNumber?: string | null;
  gender?: string | null;
  branchId: number;
  branchName?: string;
  membershipStart: string;
  membershipEnd: string;
  status: 'active' | 'expired';
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  cash: number;
  online: number;
  securityMoney: number;
  discount?: number | null;
  remark: string | null;
  profileImageUrl?: string | null;
  aadhaarFrontUrl?: string | null;
  aadhaarBackUrl?: string | null;
  lockerId?: number | null;
  lockerNumber?: string | null;
  createdAt: string;
  assignments?: Array<{
    seatId: number;
    shiftId: number;
    seatNumber: string;
    shiftTitle: string;
  }>;
}

interface Collection {
  historyId: number;
  studentId: number;
  name: string;
  shiftTitle: string | null;
  totalFee: number;
  amountPaid: number;
  dueAmount: number;
  cash: number;
  online: number;
  securityMoney: number;
  remark: string | null;
  createdAt: string | null;
  branchId?: number;
}

interface Seat {
  id: number;
  seatNumber: string;
  branchId?: number;
  shifts: Array<{
    shiftId: number;
    shiftTitle: string;
    description: string | null;
    isAssigned: boolean;
    studentName: string | null;
  }>;
}

export interface AttendanceRecord {
  studentId: number;
  studentName: string;
  registrationNumber: string;
  phone: string;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  totalScans: number;
}

interface Schedule {
  id: number;
  title: string;
  description?: string | null;
  time: string;
  eventDate: string;
  fee: number; // <-- Add this line
}

interface DashboardStats {
  totalCollection: number;
  totalDue: number;
  totalExpense: number;
  profitLoss: number;
}

interface CollectionStats {
    totalPaid: number;
    totalDue: number;
    totalCash: number;
    totalOnline: number;
}

interface OwnerProfileUpdateData {
  libraryName: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
}

// Import centralized API configuration
import { API_BASE_URL } from '../utils/apiConfig';

const API_URL = API_BASE_URL;
console.log('🔗 API_URL configured as:', API_URL); // Debug log to verify in mobile app
console.log('🌍 Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
console.log('🔧 User agent:', typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A');
console.log('📱 Is mobile app:', typeof navigator !== 'undefined' && 
           (navigator.userAgent.includes('Cordova') || 
            navigator.userAgent.includes('Capacitor') ||
            (typeof window !== 'undefined' && window.location.protocol === 'file:')));

const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

// Prevent spamming the user with repeated subscription toasts
let lastSubscriptionToastAt = 0;

// Debug interceptor to log all outgoing requests
apiClient.interceptors.request.use((config) => {
  console.log('🚀 API Request Details:', {
    url: config.url,
    baseURL: config.baseURL,
    fullURL: config.baseURL + config.url,
    method: config.method,
    headers: config.headers
  });
  return config;
});

const transformKeysToCamelCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToCamelCase(item));
  } else if (obj && typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      newObj[camelKey] = transformKeysToCamelCase(value);
    }
    return newObj;
  }
  return obj;
};

const transformKeysToSnakeCase = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map((item) => transformKeysToSnakeCase(item));
  } else if (obj && typeof obj === 'object' && obj !== null) {
    const newObj: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const newKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      newObj[newKey] = transformKeysToSnakeCase(value);
    }
    return newObj;
  }
  return obj;
};

// Add authentication interceptor for session-based auth
apiClient.interceptors.request.use((config) => {
  // For session-based auth, we don't need to add tokens to headers
  // The session cookie is automatically handled by withCredentials: true
  // But we can add user info to requests if needed
  const user = localStorage.getItem('user');
  if (user) {
    // Add user info to headers if needed by backend
    config.headers['X-User-Info'] = user;
  }
  return config;
});

// Add request interceptor to log outgoing requests
apiClient.interceptors.request.use((config) => {
  console.log('API Request:', {
    url: config.url,
    method: config.method,
    data: config.data,
    headers: config.headers
  });
  return config;
});

apiClient.interceptors.request.use((config) => {
  if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
    let dataForProcessing = { ...config.data };
    if (dataForProcessing.hasOwnProperty('branch_id') && dataForProcessing.hasOwnProperty('branchId')) {
      console.warn(
        '[API.TS INTERCEPTOR] Conflict: Found both "branch_id" (value:', dataForProcessing.branch_id,
        ') and "branchId" (value:', dataForProcessing.branchId,
        '). Removing "branchId" to prioritize the snake_case "branch_id".'
      );
      delete dataForProcessing.branchId;
    }
    config.data = transformKeysToSnakeCase(dataForProcessing);
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = transformKeysToCamelCase(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - Authentication required:', error.response?.data?.message);
      // Don't redirect in mobile app - let components handle auth state
      // Mobile apps should handle 401 errors through proper auth context
    } else if (error.response?.status === 403 && error.response?.data?.subscriptionExpired) {
      console.warn('403 Forbidden - Subscription inactive/expired');
      const now = Date.now();
      if (now - lastSubscriptionToastAt > 5000) {
        toast.error('Subscription inactive or trial expired. Viewing is allowed, but actions are disabled. Please renew on the Subscription page.');
        lastSubscriptionToastAt = now;
      }
    } else if (!error.response) {
      console.error('Network error - please check your connection:', error.message);
      // Don't show alert in mobile app - let components handle errors gracefully
      console.error('Connection failed - this may be a network connectivity issue');
    }
    const errorData = error.response?.data || { message: error.message };
    console.error('API Error (Axios Interceptor - Response Error):', JSON.stringify(errorData, null, 2));
    const errorMessage = errorData.message || 'An unexpected error occurred while processing your request';
    // Preserve original error object (including response/status) but add friendly message
    error.friendlyMessage = errorMessage;
    return Promise.reject(error);
  }
);

const api = {
  login: async ({ username, password, libraryCode }: { username: string; password: string; libraryCode: string }) => {
    try {
      const response = await apiClient.post('/auth/login', { username, password, libraryCode });
      const { message, user } = response.data;
      if (message === 'Login successful' && user) {
        console.log('Login successful, user:', user);
        // Store user info in localStorage for easy access
        localStorage.setItem('user', JSON.stringify(user));
        return user;
      } else {
        throw new Error(message || 'Login failed: Invalid response from server');
      }
    } catch (error: any) {
      console.error('Login error details:', error.response?.data || error.message);
      throw error instanceof Error ? error : new Error('Login failed due to server error');
    }
  },

  logout: async () => {
    try {
      const response = await apiClient.get('/auth/logout');
      console.log('Logout response:', response.data);
      // Clean up localStorage on logout
      localStorage.removeItem('user');
      return response.data;
    } catch (error: any) {
      console.error('Logout error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Query Management


  checkAuthStatus: async () => {
    try {
      const response = await apiClient.get('/auth/status');
      console.log('Auth status check:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Auth status check failed:', error.response?.data || error.message);
      if (error.response?.status === 401) {
        return { isAuthenticated: false, user: null };
      }
      throw error;
    }
  },

  getBranches: async (): Promise<Branch[]> => {
    try {
      const response = await apiClient.get('/branches');
      return response.data.branches;
    } catch (error: any) {
      console.error('[api.ts getBranches] Error:', error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to fetch branches');
    }
  },

  addBranch: async (branchData: { name: string; code?: string }): Promise<Branch> => {
    const response = await apiClient.post('/branches', branchData);
    return response.data;
  },

  updateBranch: async (id: number, branchData: { name: string; code?: string }): Promise<Branch> => {
    const response = await apiClient.put(`/branches/${id}`, branchData);
    return response.data;
  },

  deleteBranch: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/branches/${id}`);
    return response.data;
  },

  getProducts: async (): Promise<Product[]> => {
    const response = await apiClient.get('/products');
    return response.data.products;
  },

  addProduct: async (productData: { name: string }): Promise<Product> => {
    const response = await apiClient.post('/products', productData);
    return response.data;
  },

  updateProduct: async (id: number, productData: { name: string }): Promise<Product> => {
    const response = await apiClient.put(`/products/${id}`, productData);
    return response.data;
  },

  deleteProduct: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/products/${id}`);
    return response.data;
  },

  getHostelBranches: async () => {
    try {
      const response = await apiClient.get('/hostel/branches');
      return response.data.branches;
    } catch (error: any) {
      console.error('Error fetching hostel branches:', error.response?.data || error.message);
      throw error;
    }
  },

  addHostelBranch: async (branchData: { name: string }) => {
    try {
      const response = await apiClient.post('/hostel/branches', branchData);
      return response.data.branch;
    } catch (error: any) {
      throw error;
    }
  },

  updateHostelBranch: async (id: number, branchData: { name: string }) => {
    try {
      const response = await apiClient.put(`/hostel/branches/${id}`, branchData);
      return response.data.branch;
    } catch (error: any) {
      throw error;
    }
  },

  deleteHostelBranch: async (id: number) => {
    try {
      const response = await apiClient.delete(`/hostel/branches/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getHostelStudents: async (branchId?: number) => {
    try {
      const params: any = {};
      if (branchId) {
        params.branchId = branchId;
      }
      const response = await apiClient.get('/hostel/students', { params });
      return response.data.students;
    } catch (error: any) {
      throw error;
    }
  },

  getHostelStudent: async (id: number) => {
    try {
      const response = await apiClient.get(`/hostel/students/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  addHostelStudent: async (studentData: any) => {
    try {
      const response = await apiClient.post('/hostel/students', studentData);
      return response.data;
    } catch (error: any) {
      console.error('Error in api.ts addHostelStudent:', error.message, JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  },

  updateHostelStudent: async (id: number, studentData: any) => {
    try {
      const response = await apiClient.put(`/hostel/students/${id}`, studentData);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  deleteHostelStudent: async (id: number) => {
    try {
      const response = await apiClient.delete(`/hostel/students/${id}`);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  uploadImage: async (imageData: FormData) => {
    try {
      const response = await apiClient.post('/upload-image', imageData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getExpiredHostelStudents: async () => {
    try {
      const response = await apiClient.get('/hostel/students/meta/expired');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  renewHostelStudent: async (id: number, renewalData: any) => {
    try {
      const response = await apiClient.post(`/hostel/students/${id}/renew`, renewalData);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getHostelCollections: async (params?: { month?: string; branchId?: number }) => {
    try {
      const queryParams: any = {};
      if (params?.month) queryParams.month = params.month;
      if (params?.branchId) queryParams.branchId = params.branchId;

      const response = await apiClient.get('/hostel/collections', { params: queryParams });
      return response.data;
    } catch (error: any) {
      console.error('[api.ts getHostelCollections] Error:', error.message, JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  },

  updateHostelCollectionPayment: async (historyId: number, paymentData: { paymentAmount: number; paymentType: 'cash' | 'online' }) => {
    try {
      const response = await apiClient.put(`/hostel/collections/${historyId}`, paymentData);
      return response.data;
    } catch (error: any) {
      throw error;
    }
  },

  getQueries: async (): Promise<Query[]> => {
    try {
      const response = await apiClient.get('/queries');
      return response.data;
    } catch (error: any) {
      console.error(`[api.ts getQueries] Error:`, error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to fetch queries');
    }
  },

  getAllQueriesForAdmin: async (): Promise<Query[]> => {
    try {
      const response = await apiClient.get('/queries/admin');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching admin queries:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch admin queries');
    }
  },

  getQueryById: async (id: number): Promise<Query> => {
    try {
      const response = await apiClient.get(`/queries/${id}`);
      return response.data;
    } catch (error: any) {
      console.error(`[api.ts getQueryById] Error:`, error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to fetch query details');
    }
  },

  postQuery: async (data: { title: string; description: string }): Promise<Query> => {
    try {
      const response = await apiClient.post('/queries', data);
      return response.data;
    } catch (error: any) {
      console.error(`[api.ts postQuery] Error:`, error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to post query');
    }
  },

  voteOnQuery: async (queryId: number, voteType: 'up' | 'down'): Promise<{ message: string }> => {
    try {
      const response = await apiClient.post(`/queries/${queryId}/vote`, { vote_type: voteType });
      return response.data;
    } catch (error: any) {
      console.error(`[api.ts voteOnQuery] Error:`, error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to vote on query');
    }
  },

  updateQueryStatus: async (queryId: number, status: 'Posted' | 'Approved' | 'Not Approved' | 'Done' | 'Not Done'): Promise<Query> => {
    try {
      const response = await apiClient.put(`/queries/${queryId}/status`, { status });
      return response.data;
    } catch (error: any) {
      console.error(`[api.ts updateQueryStatus] Error:`, error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to update query status');
    }
  },

  postComment: async (queryId: number, data: { commentText: string; parentCommentId?: number }): Promise<Comment> => {
    try {
      const response = await apiClient.post(`/queries/${queryId}/comments`, data);
      return response.data;
    } catch (error: any) {
      console.error(`[api.ts postComment] Error:`, error.message, JSON.stringify(error.response?.data, null, 2));
      throw new Error(error.response?.data?.message || 'Failed to post comment');
    }
  },

  getInactiveStudents: async (): Promise<{ students: Student[] }> => {
    const response = await apiClient.get('/students/inactive');
    return response.data;
  },

  updateStudentStatus: async (id: number, status: { isActive: boolean }): Promise<{ student: Student }> => {
    const response = await apiClient.put(`/students/${id}/status`, status);
    return response.data;
  },

  getStudents: async (fromDate?: string, toDate?: string, branchId?: number): Promise<{ students: Student[] }> => {
    const params: any = { fromDate, toDate };
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/students', { params });
    return response.data;
  },

  getStudent: async (id: number): Promise<Student> => {
    const response = await apiClient.get(`/students/${id}`);
    return response.data;
  },

  getActiveStudents: async (branchId?: number): Promise<{ students: Student[] }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/students/active', { params });
    return response.data;
  },

  getExpiredMemberships: async (branchId?: number): Promise<{ students: Student[] }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/students/expired', { params });
    return response.data;
  },

  getExpiringSoon: async (branchId?: number, days?: number): Promise<{ students: Student[] }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    if (days) params.days = days;
    const response = await apiClient.get('/students/expiring-soon', { params });
    return response.data;
  },

  getExpiringByRange: async (branchId?: number, fromDays?: number, toDays?: number): Promise<{ students: Student[] }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    if (fromDays !== undefined) params.fromDays = fromDays;
    if (toDays !== undefined) params.toDays = toDays;
    const response = await apiClient.get('/students/expiring-by-range', { params });
    return response.data;
  },

  getExpiringCounts: async (branchId?: number): Promise<{
    expiring1to2Days: number;
    expiring3to5Days: number;
    expiring5to7Days: number;
  }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/students/expiring-counts', { params });
    return response.data;
  },

  getTotalStudentsCount: async (branchId?: number): Promise<number> => {
    const response = await api.getStudents(undefined, undefined, branchId);
    return response.students.length;
  },

  getActiveStudentsCount: async (branchId?: number): Promise<number> => {
    const response = await api.getActiveStudents(branchId);
    return response.students.length;
  },

  getExpiredMembershipsCount: async (branchId?: number): Promise<number> => {
    const response = await api.getExpiredMemberships(branchId);
    return response.students.length;
  },

  addStudent: async (studentData: {
    name: string;
    email: string;
    phone: string;
    address: string;
    registrationNumber?: string;
    fatherName?: string;
    aadharNumber?: string;
    branchId: number;
    membershipStart: string;
    membershipEnd: string;
    totalFee: number;
    amountPaid: number;
    shiftIds: number[];
    seatId?: number;
    lockerId?: number;
    cash?: number;
    online?: number;
    securityMoney?: number;
    remark?: string | null;
    profileImageUrl?: string | null;
    aadhaarFrontUrl?: string | null;
    aadhaarBackUrl?: string | null;
  }): Promise<{ student: Student }> => {
    try {
      const normalizedData = {
        ...studentData,
        cash: studentData.cash ?? 0,
        online: studentData.online ?? 0,
        securityMoney: studentData.securityMoney ?? 0,
        remark: studentData.remark ?? null,
        profileImageUrl: studentData.profileImageUrl ?? null,
        aadhaarFrontUrl: studentData.aadhaarFrontUrl ?? null,
        aadhaarBackUrl: studentData.aadhaarBackUrl ?? null,
      };
      console.log('[api.ts addStudent] Sending student data:', JSON.stringify(normalizedData, null, 2));
      const response = await apiClient.post('/students', normalizedData);
      console.log('[api.ts addStudent] Response received:', JSON.stringify(response.data, null, 2));
      return response.data;
    } catch (error: any) {
      console.error('[api.ts addStudent] Error:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      throw error;
    }
  },

  deleteStudent: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/students/${id}`);
    return response.data;
  },

  updateStudent: async (
    id: number,
    studentData: {
      name: string;
      email: string;
      phone: string;
      address: string;
      registrationNumber?: string;
      fatherName?: string;
      aadharNumber?: string;
      branchId: number;
      membershipStart: string;
      membershipEnd: string;
      totalFee: number;
      amountPaid: number;
      shiftIds: number[];
      seatId: number | null;
      lockerId?: number | null;
      cash: number;
      online: number;
      securityMoney: number;
      remark: string;
      profileImageUrl: string;
      aadhaarFrontUrl?: string | null;
      aadhaarBackUrl?: string | null;
      discount?: number;
    }
  ) => {
    // Transform camelCase to snake_case for the backend
    const payload = {
      name: studentData.name,
      email: studentData.email,
      phone: studentData.phone,
      address: studentData.address,
      registration_number: studentData.registrationNumber,
      father_name: studentData.fatherName,
      aadhar_number: studentData.aadharNumber,
      branch_id: studentData.branchId,
      membership_start: studentData.membershipStart,
      membership_end: studentData.membershipEnd,
      total_fee: studentData.totalFee,
      amount_paid: studentData.amountPaid,
      cash: studentData.cash,
      online: studentData.online,
      security_money: studentData.securityMoney,
      remark: studentData.remark,
      discount: studentData.discount || 0,
      shift_ids: studentData.shiftIds,
      seat_id: studentData.seatId,
      locker_id: studentData.lockerId || null,
      profile_image_url: studentData.profileImageUrl || '',
      aadhaar_front_url: studentData.aadhaarFrontUrl || null,
      aadhaar_back_url: studentData.aadhaarBackUrl || null
    };

    const response = await apiClient.put(`/students/${id}`, payload);
    return response.data;
  },

  renewStudent: async (
    id: number,
    membershipData: {
      name: string;
      registrationNumber?: string;
      fatherName?: string;
      aadharNumber?: string;
      address: string;
      email: string;
      phone: string;
      branchId: number;
      membershipStart: string;
      membershipEnd: string;
      shiftIds: number[];
      seatId?: number;
      lockerId?: number;
      totalFee: number;
      cash?: number;
      online?: number;
      securityMoney?: number;
      remark?: string;
    }
  ): Promise<{ message: string; student: Student }> => {
    const response = await apiClient.post(`/students/${id}/renew`, membershipData);
    return response.data;
  },

  getDashboardStats: async (params?: { branchId?: number }): Promise<DashboardStats> => {
    const response = await apiClient.get('/students/stats/dashboard', { params });
    return response.data;
  },

  getSchedules: async (branchId: number | null = null): Promise<{ schedules: Schedule[] }> => {
    const params: { branch_id?: number } = {};
    
    // Only add branch_id to params if it's not null
    if (branchId !== null && branchId !== undefined) {
      params.branch_id = branchId;
      console.log('Fetching schedules for branch ID:', branchId);
    } else {
      console.log('Fetching schedules for all branches');
    }
    
    try {
      const response = await apiClient.get('/schedules/with-students', { params });
      console.log('API Response:', response);
      
      // Handle both response formats:
      // 1. Direct array response: [schedule1, schedule2, ...]
      // 2. Object with schedules property: { schedules: [...] }
      let schedules = [];
      if (Array.isArray(response.data)) {
        console.log('Received array response with', response.data.length, 'schedules');
        schedules = response.data;
      } else if (response.data && Array.isArray(response.data.schedules)) {
        console.log('Received object response with', response.data.schedules.length, 'schedules');
        schedules = response.data.schedules;
      } else {
        console.warn('Unexpected API response format, defaulting to empty array:', response.data);
      }
      
      return { schedules };
    } catch (error) {
      console.error('Error in getSchedules:', error);
      throw error;
    }
  },

  getSchedule: async (id: number): Promise<Schedule> => {
    const response = await apiClient.get(`/schedules/${id}`);
    return response.data;
  },

  getSchedulesWithStudents: async () => {
    try {
      const response = await apiClient.get('/schedules/with-students');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching schedules with students:', error.response?.data || error.message);
      throw error;
    }
  },

  addSchedule: async (scheduleData: { 
    title: string; 
    time: string; 
    eventDate: string; 
    description?: string;
    fee?: number; // <-- Add this line
  }): Promise<Schedule> => {
    const response = await apiClient.post('/schedules', scheduleData);
    return response.data;
  },

  updateSchedule: async (id: number, scheduleData: { title?: string; time?: string; eventDate?: string; description?: string; fee?: number }): Promise<Schedule> => {
    const response = await apiClient.put(`/schedules/${id}`, scheduleData);
    return response.data;
  },

  deleteSchedule: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/schedules/${id}`);
    return response.data;
  },

  getUserProfile: async () => {
    try {
      const response = await apiClient.get('/users/profile');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching user profile:', error.response?.data || error.message);
      throw error;
    }
  },

  updateUserProfile: async (profileData: { fullName: string; email: string }) => {
    try {
      const response = await apiClient.put('/users/profile', profileData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating user profile:', error.response?.data || error.message);
      throw error;
    }
  },



  addUser: async (userData: NewUserData) => {
    try {
      const response = await apiClient.post('/users', userData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding user:', error.response?.data || error.message);
      throw error;
    }
  },

  getAllUsers: async () => {
    try {
      const response = await apiClient.get('/users');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching users:', error.response?.data || error.message);
      throw error;
    }
  },

  deleteUser: async (userId: number) => {
    try {
      const response = await apiClient.delete(`/users/${userId}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting user:', error.response?.data || error.message);
      throw error;
    }
  },

  changeUserPassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
    try {
      const response = await apiClient.put('/users/profile', passwordData);
      return response.data;
    } catch (error: any) {
      console.error('Error changing password:', error.response?.data || error.message);
      throw error;
    }
  },

  getStudentsByShift: async (shiftId: number, filters: { search?: string; status?: string }) => {
    const response = await apiClient.get(`/students/shift/${shiftId}`, { params: filters });
    return response.data;
  },

  getSeats: async (params?: { branchId?: number; shiftId?: number }): Promise<{ seats: Seat[] }> => {
    const response = await apiClient.get('/seats', { params });
    return response.data;
  },

  addSeats: async (data: { seatNumbers: string; branchId: number }): Promise<{ message: string }> => {
    const response = await apiClient.post('/seats', data);
    return response.data;
  },

  deleteSeat: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/seats/${id}`);
    return response.data;
  },

  getSeatAssignments: async (seatId: number) => {
    try {
      const response = await apiClient.get(`/seats/${seatId}/assignments`);
      return response.data;
    } catch (error: any) {
      console.error('Error fetching seat assignments:', error.response?.data || error.message);
      throw error;
    }
  },

  getAvailableShifts: async (seatId: number): Promise<{ shifts: Array<{ id: number; title: string; time: string; eventDate: string; fee: number; isAssigned: boolean }> }> => {
    try {
      const response = await apiClient.get(`/seats/${seatId}/all-shifts-status`);
      return response.data;
    } catch (error: any) {
      console.error(`Error fetching shifts status for seat ${seatId}:`, error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch shifts status');
    }
  },
  getSettings: async () => {
    try {
      const response = await apiClient.get('/settings');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching settings:', error.response?.data || error.message);
      throw error;
    }
  },

  updateSettings: async (settingsData: any) => {
    try {
      const response = await apiClient.put('/settings', settingsData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating settings:', error.response?.data || error.message);
      throw error;
    }
  },

  getTransactions: async () => {
    try {
      const response = await apiClient.get('/transactions');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching transactions:', error.response?.data || error.message);
      throw error;
    }
  },

  addTransaction: async (transactionData: any) => {
    try {
      const response = await apiClient.post('/transactions', transactionData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding transaction:', error.response?.data || error.message);
      throw error;
    }
  },

  updateTransaction: async (id: number, transactionData: any) => {
    try {
      const response = await apiClient.put(`/transactions/${id}`, transactionData);
      return response.data;
    } catch (error: any) {
      console.error('Error updating transaction:', error.response?.data || error.message);
      throw error;
    }
  },

  deleteTransaction: async (id: number) => {
    try {
      const response = await apiClient.delete(`/transactions/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting transaction:', error.response?.data || error.message);
      throw error;
    }
  },

  // Advance Payments APIs
  getAdvancePayments: async () => {
    try {
      const response = await apiClient.get('/advance-payments');
      return response.data;
    } catch (error: any) {
      console.error('Error fetching advance payments:', error.response?.data || error.message);
      throw error;
    }
  },

  addAdvancePayment: async (paymentData: { studentId: number; amount: number; paymentDate: string }) => {
    try {
      const response = await apiClient.post('/advance-payments', paymentData);
      return response.data;
    } catch (error: any) {
      console.error('Error adding advance payment:', error.response?.data || error.message);
      throw error;
    }
  },

  updateAdvancePayment: async (
    id: number,
    data: { amount?: number; paymentDate?: string; notes?: string }
  ) => {
    try {
      const response = await apiClient.put(`/advance-payments/${id}`, data);
      return response.data;
    } catch (error: any) {
      console.error('Error updating advance payment:', error.response?.data || error.message);
      throw error;
    }
  },

  toggleAdvancePaymentDone: async (id: number, isDone: boolean) => {
    try {
      const response = await apiClient.patch(`/advance-payments/${id}/done`, { isDone });
      return response.data;
    } catch (error: any) {
      console.error('Error toggling advance payment done:', error.response?.data || error.message);
      throw error;
    }
  },

  deleteAdvancePayment: async (id: number) => {
    try {
      const response = await apiClient.delete(`/advance-payments/${id}`);
      return response.data;
    } catch (error: any) {
      console.error('Error deleting advance payment:', error.response?.data || error.message);
      throw error;
    }
  },

  getCollections: async (params: { month?: string; branchId?: number } = {}): Promise<{ collections: Collection[] }> => {
    const response = await apiClient.get('/collections', { params });
    return response.data;
  },

  getCollectionStats: async (params: { month?: string; branchId?: number } = {}): Promise<CollectionStats> => {
    const response = await apiClient.get('/collections/stats', { params });
    return response.data;
  },

  updateCollectionPayment: async (
    historyId: number,
    paymentDetails: { amount: number; method: 'cash' | 'online' }
  ): Promise<{ message: string; collection: Collection }> => {
    const { amount, method } = paymentDetails;
    const response = await apiClient.put(`/collections/${historyId}`, {
      paymentAmount: amount,
      paymentMethod: method,
    });
    return response.data;
  },

  deleteCollectionRecord: async (historyId: number): Promise<{ message: string; deletedHistoryId: number }> => {
    const response = await apiClient.delete(`/collections/${historyId}`);
    return response.data;
  },

  getExpenses: async (branchId?: number): Promise<{ expenses: Expense[]; products: Product[] }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/expenses', { params });
    return response.data;
  },

  addExpense: async (expenseData: {
    title: string;
    amount: string | number;
    date: string;
    remark: string;
    branchId?: number | null;
  }): Promise<Expense> => {
    const response = await apiClient.post('/expenses', expenseData);
    return response.data;
  },

  updateExpense: async (
    id: number,
    expenseData: {
      title: string;
      amount: string | number;
      date: string;
      remark: string;
      branchId?: number | null;
    }
  ): Promise<Expense> => {
    const response = await apiClient.put(`/expenses/${id}`, expenseData);
    return response.data;
  },

  deleteExpense: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/expenses/${id}`);
    return response.data;
  },

  getProfitLoss: async (params: { month: string; branchId?: number }) => {
    const response = await apiClient.get('/reports/profit-loss', { params });
    return response.data;
  },

  getMonthlyCollections: async (month: string) => {
    const response = await apiClient.get('/reports/monthly-collections', { params: { month } });
    return response.data;
  },

  getLockers: async (branchId?: number): Promise<{ lockers: Locker[] }> => {
    const params: any = {};
    if (branchId) params.branchId = branchId;
    const response = await apiClient.get('/lockers', { params });
    return response.data;
  },

  addLockers: async (lockerNumbers: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/lockers', { lockerNumbers });
    return response.data;
  },

  createLocker: async (lockerData: { lockerNumber: string; branchId: number }): Promise<{ locker: Locker }> => {
    const response = await apiClient.post('/lockers', lockerData);
    return response.data;
  },

  updateLocker: async (id: number, lockerData: { lockerNumber: string; branchId: number }): Promise<{ locker: Locker }> => {
    const response = await apiClient.put(`/lockers/${id}`, lockerData);
    return response.data;
  },

  deleteLocker: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/lockers/${id}`);
    return response.data;
  },

  assignLocker: async (id: number, data: { studentId: number | null }): Promise<{ locker: Locker }> => {
    const response = await apiClient.put(`/lockers/${id}/assign`, data);
    return response.data;
  },

  fetchAttendance: async (
    filters: { 
      date?: string; 
      studentId?: string; 
      page?: number; 
      limit?: number; 
      view?: 'daily' | 'monthly'; 
      search?: string;
      includeMembership?: boolean;
      startDate?: string;
      endDate?: string;
      status?: string;
      branchId?: number;
    } = {}
  ): Promise<{ attendance: AttendanceRecord[]; pagination: any }> => {
    try {
      // Always include membership data
      const params = {
        ...filters,
        includeMembership: true
      };
      
      const response = await apiClient.get('/owner-dashboard/attendance', { params });
      
      // Process the response to ensure all required fields are present
      const processedAttendance = response.data.attendance.map((record: any) => ({
        ...record,
        // Ensure these fields exist with defaults if missing
        membershipStatus: record.membershipStatus || 'inactive',
        membershipEndDate: record.membershipEndDate || null,
        hasDueAmount: record.hasDueAmount || false,
        dueAmount: record.dueAmount || 0
      }));
      
      return {
        ...response.data,
        attendance: processedAttendance
      };
    } catch (error: any) {
      console.error('[api.ts fetchAttendance] Error:', error.message);
      throw new Error(error.response?.data?.message || 'Failed to fetch attendance');
    }
  },

  getLibraryProfile: async (): Promise<{ library: LibraryProfile }> => {
    const response = await apiClient.get('/owner-dashboard/profile');
    return response.data;
  },

  getStudentProfile: async (): Promise<{ student: StudentProfile }> => {
    const response = await apiClient.get('/student-auth/profile');
    return response.data;
  },

  markAttendanceWithQR: async (qrData: string): Promise<{ message: string }> => {
    try {
      // Parse the QR data to ensure it's valid JSON
      const parsedData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;
      
      // Create a new axios instance without interceptors
      const rawAxios = axios.create();
      
      // Create the request data object with qrData in camelCase
      const requestData = {
        qrData: parsedData,
        notes: 'Scanned via mobile app'
      };
      
      console.log('Sending QR attendance data:', requestData);
      
      // Use the raw axios instance to bypass interceptors
      const response = await rawAxios.post(
        `${API_URL}/student-auth/attendance/qr`, 
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : ''
          },
          withCredentials: true
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error in markAttendanceWithQR:', error);
      if (error.response) {
        console.error('Server responded with:', error.response.data);
      }
      throw new Error('Failed to mark attendance. Please try again.');
    }
  },

  getStudentAttendanceHistory: async (
    filters: {
      view?: 'daily' | 'monthly';
      date?: string;
      month?: number;
      year?: number;
    } = {}
  ): Promise<{ attendance: AttendanceHistoryRecord[] }> => {
    const response = await apiClient.get('/student-auth/attendance', { params: filters });
    return response.data;
  },

  getAnnouncements: async (params?: { branch_id?: number }) => {
    const response = await apiClient.get('/announcements', { params });
    return response.data;
  },

  getStudentMembershipHistory: async (): Promise<{ membershipHistory: any[]; totalRecords: number }> => {
    const response = await apiClient.get('/student-auth/membership-history');
    return response.data;
  },

  getStudentTransactions: (): Promise<{ transactions: any[]; totalRecords: number }> =>
    apiClient.get('/student-auth/transactions').then(res => res.data),

  getAttendanceStatus: (): Promise<{
    hasMarkedToday: boolean;
    nextAction: 'in' | 'out';
    totalScans: number;
    firstIn?: string | null;
    lastOut?: string | null;
    currentStatus?: 'checked_in' | 'checked_out';
  }> => apiClient.get('/student-auth/attendance/status').then(res => res.data),

  toggleAttendance: (notes?: string): Promise<{
    action: 'checked in' | 'checked out';
    record: any;
    totalToday: number;
  }> => apiClient.post('/student-auth/attendance/toggle', { notes }).then(res => res.data),

  // Announcements API

  createAnnouncement: (announcementData: {
    title: string;
    content: string;
    branch_id?: number | null;
    is_global?: boolean;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
  }): Promise<any> => 
    apiClient.post('/announcements', transformKeysToSnakeCase(announcementData)).then(res => res.data),

  updateAnnouncement: (id: number, announcementData: {
    title: string;
    content: string;
    branch_id?: number | null;
    is_global?: boolean;
    start_date?: string | null;
    end_date?: string | null;
    is_active?: boolean;
  }): Promise<any> => 
    apiClient.put(`/announcements/${id}`, transformKeysToSnakeCase(announcementData)).then(res => res.data),

  deleteAnnouncement: (id: number): Promise<{ message: string }> => 
    apiClient.delete(`/announcements/${id}`).then(res => res.data),

  getOwnerProfile: async () => {
    const response = await apiClient.get('/settings/owner/profile');
    return transformKeysToCamelCase(response.data);
  },

  updateOwnerProfile: async (data: OwnerProfileUpdateData) => {
    const response = await apiClient.put('/settings/owner/profile', data);
    return transformKeysToCamelCase(response.data);
  },

  changeOwnerPassword: async (data: any) => {
    const response = await apiClient.put('/settings/owner/password', data);
    return response.data;
  },

  deleteOwnerAccount: async (data: { currentPassword: string; confirmation: string }) => {
    // axios supports sending a request body with DELETE via the 'data' config option
    const response = await apiClient.delete('/owner-auth/delete-account', { data });
    return response.data;
  },

  updateUserPermissions: async (userId: number, permissions: string[]) => {
    try {
      const response = await apiClient.put(`/users/${userId}/permissions`, { permissions });
      return response.data;
    } catch (error: any) {
      console.error('Error updating user permissions:', error.response?.data || error.message);
      throw error;
    }
  },



};

export default api;
