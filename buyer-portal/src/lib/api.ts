import axios, { AxiosError } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Get a user-friendly error message from an API error (400, 404, 500, etc.) */
export function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = (err as AxiosError<{ message?: string; errors?: Array<{ msg?: string; path?: string }> }>).response?.data;
    if (data?.message) return data.message;
    if (Array.isArray(data?.errors) && data.errors.length > 0) {
      return data.errors.map((e) => e.msg || e.path).join('. ');
    }
    const status = err.response?.status;
    if (status === 400) return 'Invalid request. Check your input.';
    if (status === 401) return 'Please sign in again.';
    if (status === 403) return 'Access denied.';
    if (status === 404) return 'Not found.';
    if (status && status >= 500) return 'Server error. Try again later.';
  }
  return err instanceof Error ? err.message : 'Something went wrong.';
}

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('buyerToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Listing {
  _id: string;
  cropName: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  description?: string;
  location?: { state?: string; district?: string; village?: string };
  contactPhone?: string;
  contactEmail?: string;
  sellerId?: { name?: string; phone?: string; email?: string; location?: Record<string, string> };
  sellerRating?: { avgRating: number | null; totalReviews: number };
  createdAt: string;
}

export interface Buyer {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: { state?: string; district?: string; village?: string; fullAddress?: string };
}

export interface Order {
  _id: string;
  buyerId: Buyer | string;
  listingId: Listing;
  quantity: number;
  status: string;
  createdAt: string;
}

export const marketplaceAPI = {
  browse: async (params?: { state?: string; cropName?: string; limit?: number; page?: number }) => {
    const response = await api.get<{ listings: Listing[]; total: number; page: number; limit: number }>(
      '/marketplace/listings/browse',
      { params }
    );
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get<{ listing: Listing }>(`/marketplace/listings/${id}`);
    return response.data;
  },
  createReview: async (listingId: string, rating: number, comment?: string) => {
    const response = await api.post(`/marketplace/listings/${listingId}/reviews`, { rating, comment });
    return response.data as { review: unknown; sellerRating: { avgRating: number | null; totalReviews: number } };
  },
  getReviews: async (listingId: string) => {
    const response = await api.get(`/marketplace/listings/${listingId}/reviews`);
    return response.data as {
      reviews: Array<{ id: string; rating: number; comment: string; buyerName: string; createdAt: string }>;
      sellerRating: { avgRating: number | null; totalReviews: number };
    };
  },
};

export const buyerAuthAPI = {
  register: async (data: { name: string; email: string; phone: string; password: string; address?: Record<string, string> }) => {
    const response = await api.post<{ token: string; buyer: Buyer }>('/buyer-auth/register', data);
    return response.data;
  },
  login: async (email: string, password: string) => {
    const response = await api.post<{ token: string; buyer: Buyer }>('/buyer-auth/login', { email, password });
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get<{ buyer: Buyer }>('/buyer-auth/profile');
    return response.data;
  },
};

export const ordersAPI = {
  create: async (listingId: string, quantity: number) => {
    const response = await api.post<{ order: Order }>('/orders', { listingId, quantity });
    return response.data;
  },
  myOrders: async () => {
    const response = await api.get<{ orders: Order[] }>('/orders/my');
    return response.data;
  },
};
