import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type { MenuItem, Order, OrderStatus } from '../types/api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    userId: string;
    email: string;
    restaurantId: string;
  };
}

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          this.setToken(null);
          localStorage.removeItem('bell_auth_token');
          // Redirect to login if needed
        }
        return Promise.reject(error);
      }
    );

    // Load token from localStorage on initialization
    const savedToken = localStorage.getItem('bell_auth_token');
    if (savedToken) {
      this.setToken(savedToken);
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('bell_auth_token', token);
    } else {
      localStorage.removeItem('bell_auth_token');
    }
  }

  // Authentication
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    // Note: The PRD doesn't specify auth endpoints, so we'll implement a mock login
    // In real implementation, this would call POST /auth/login
    try {
      // Mock authentication - in real app this would be a real API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (credentials.email && credentials.password) {
        const mockToken = 'mock_jwt_token_' + Date.now();
        const response: LoginResponse = {
          token: mockToken,
          user: {
            userId: 'owner_1',
            email: credentials.email,
            restaurantId: 'rest_001'
          }
        };
        
        this.setToken(mockToken);
        return response;
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      throw new Error('Login failed');
    }
  }

  logout() {
    this.setToken(null);
  }

  // Menu Management - Based on PRD API specification
  async getMenu(restaurantId: string): Promise<{ items: MenuItem[] }> {
    const response: AxiosResponse<any> = await this.client.get(`/menu`, {
      params: { restaurantId }
    });
    
    // Backend returns { menu: { items: [...], ... } } but frontend expects { items: [...] }
    if (response.data.menu && response.data.menu.items) {
      return { items: response.data.menu.items };
    }
    
    return response.data;
  }

  async getPublishedMenu(restaurantId: string): Promise<{ items: MenuItem[], status: string, version: string }> {
    const response: AxiosResponse<any> = await this.client.get(`/menu/published`, {
      params: { restaurantId }
    });
    
    if (response.data.menu) {
      return {
        items: response.data.menu.items || [],
        status: response.data.menu.status,
        version: response.data.menu.version
      };
    }
    
    return response.data;
  }

  async getDraftMenu(restaurantId: string): Promise<{ items: MenuItem[], status: string, version: string } | null> {
    try {
      const response: AxiosResponse<any> = await this.client.get(`/menu/draft`, {
        params: { restaurantId }
      });
      
      if (response.data.menu) {
        return {
          items: response.data.menu.items || [],
          status: response.data.menu.status,
          version: response.data.menu.version
        };
      }
      
      return response.data;
    } catch (error) {
      if ((error as any).response?.status === 404) {
        return null; // No draft menu exists
      }
      throw error;
    }
  }

  async confirmMenuVersion(restaurantId: string, version: string): Promise<void> {
    await this.client.put(`/menu/${version}/confirm`, null, {
      params: { restaurantId }
    });
  }

  async createMenuVersion(restaurantId: string, items: MenuItem[], confirm: boolean = false): Promise<void> {
    await this.client.post(`/menu`, 
      { items },
      { 
        params: { 
          restaurantId,
          confirm: confirm ? 'true' : 'false'
        }
      }
    );
  }

  async publishMenu(restaurantId: string, items: MenuItem[]): Promise<void> {
    return this.createMenuVersion(restaurantId, items, true);
  }

  // Order Management - Based on PRD API specification
  async getOrders(restaurantId: string): Promise<Order[]> {
    // Note: PRD doesn't specify a "get all orders" endpoint
    // This would typically be GET /orders?restaurantId=<id>
    // For now, we'll return empty array and implement when backend adds this endpoint
    try {
      const response = await this.client.get(`/orders`, {
        params: { restaurantId }
      });
      return response.data || [];
    } catch (error) {
      // If endpoint doesn't exist yet, return empty array
      console.warn('Orders endpoint not available yet:', error);
      return [];
    }
  }

  async getOrder(orderId: string, restaurantId: string): Promise<Order> {
    const response: AxiosResponse<Order> = await this.client.get(`/order/${orderId}`, {
      params: { restaurantId }
    });
    
    return response.data;
  }

  async updateOrderStatus(orderId: string, restaurantId: string, status: OrderStatus): Promise<void> {
    // Note: PRD doesn't specify order status update endpoint
    // This would typically be PATCH/PUT /order/{orderId}
    try {
      await this.client.patch(`/order/${orderId}`, 
        { status },
        { params: { restaurantId } }
      );
    } catch (error) {
      console.warn('Order status update endpoint not available yet:', error);
      throw error;
    }
  }

  async cancelOrder(orderId: string, restaurantId: string): Promise<void> {
    await this.client.delete(`/order/${orderId}`, {
      params: { restaurantId }
    });
  }

  // POS Printing - Based on PRD API specification
  async printOrder(orderId: string, restaurantId: string): Promise<{ jobId: string }> {
    const response = await this.client.post('/pos/print', {
      orderId,
      restaurantId
    });
    
    return response.data;
  }

  async getPrintStatus(jobId: string): Promise<{ status: 'PENDING' | 'SUCCESS' | 'FAILED' }> {
    const response = await this.client.get(`/pos/print/${jobId}`);
    return response.data;
  }

  async reprintOrder(orderId: string, restaurantId: string): Promise<{ jobId: string }> {
    const response = await this.client.post('/pos/reprint', {
      orderId,
      restaurantId
    });
    
    return response.data;
  }

  // Sales/Statistics (would need to be added to backend)
  async getDashboardStats(restaurantId: string): Promise<{
    todayOrders: number;
    todayRevenue: number;
    activeOrders: number;
    avgOrderTime: number;
    pendingOrders: number;
  }> {
    try {
      const response = await this.client.get(`/stats/dashboard`, {
        params: { restaurantId }
      });
      return response.data;
    } catch (error) {
      // Mock data if endpoint doesn't exist yet
      const orders = await this.getOrders(restaurantId);
      const today = new Date().toISOString().split('T')[0];
      const todayOrders = orders.filter(order => 
        order.createdAt.startsWith(today)
      );
      
      return {
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, order) => sum + order.totalAmount, 0),
        activeOrders: orders.filter(o => ['PAID', 'COOKING', 'READY'].includes(o.status)).length,
        avgOrderTime: 25, // Mock average
        pendingOrders: orders.filter(o => o.status === 'PAID').length,
      };
    }
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export types for use in components
export type { LoginCredentials, LoginResponse };