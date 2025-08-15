import axios from 'axios'
import type { Menu, Order, CartItem, CustomerInfo, ApiResponse } from '../types/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000, // 5 second timeout
})

// Mock data for development when backend is not available
const mockMenu: Menu = {
  restaurantId: 'rest_001',
  version: '1.0.0',
  items: [
    {
      id: 'item-001',
      name: '불고기 버거',
      description: '진짜 맛있는 불고기 패티가 들어간 프리미엄 버거',
      price: 12000,
      image: 'https://via.placeholder.com/300x200/4f46e5/ffffff?text=불고기+버거',
      category: 'main',
      available: true,
      options: [
        {
          id: 'size',
          name: '사이즈',
          required: true,
          choices: [
            { id: 'regular', name: '레귤러', priceModifier: 0 },
            { id: 'large', name: '라지', priceModifier: 2000 }
          ]
        },
        {
          id: 'extras',
          name: '추가 토핑',
          required: false,
          choices: [
            { id: 'cheese', name: '치즈 추가', priceModifier: 1000 },
            { id: 'bacon', name: '베이컨 추가', priceModifier: 1500 }
          ]
        }
      ]
    },
    {
      id: 'item-002',
      name: '치킨 텐더',
      description: '바삭바삭한 치킨 텐더 5조각',
      price: 9000,
      image: 'https://via.placeholder.com/300x200/f59e0b/ffffff?text=치킨+텐더',
      category: 'main',
      available: true,
      options: [
        {
          id: 'sauce',
          name: '소스 선택',
          required: true,
          choices: [
            { id: 'honey', name: '허니 머스타드', priceModifier: 0 },
            { id: 'bbq', name: 'BBQ 소스', priceModifier: 0 },
            { id: 'spicy', name: '매운 소스', priceModifier: 0 }
          ]
        }
      ]
    },
    {
      id: 'item-003',
      name: '감자튀김',
      description: '바삭한 감자튀김',
      price: 4000,
      image: 'https://via.placeholder.com/300x200/ef4444/ffffff?text=감자튀김',
      category: 'side',
      available: true,
      options: [
        {
          id: 'size',
          name: '사이즈',
          required: true,
          choices: [
            { id: 'small', name: '스몰', priceModifier: 0 },
            { id: 'medium', name: '미디움', priceModifier: 1000 },
            { id: 'large', name: '라지', priceModifier: 2000 }
          ]
        }
      ]
    },
    {
      id: 'item-004',
      name: '콜라',
      description: '시원한 콜라',
      price: 2000,
      image: 'https://via.placeholder.com/300x200/06b6d4/ffffff?text=콜라',
      category: 'drink',
      available: true,
      options: []
    },
    {
      id: 'item-005',
      name: '아이스크림',
      description: '바닐라 아이스크림',
      price: 3000,
      image: 'https://via.placeholder.com/300x200/8b5cf6/ffffff?text=아이스크림',
      category: 'dessert',
      available: false,
      options: []
    }
  ],
  createdAt: new Date().toISOString(),
  status: 'ACTIVE'
}

export const menuApi = {
  getMenu: async (restaurantId: string): Promise<Menu> => {
    try {
      const response = await api.get(`/menu?restaurantId=${restaurantId}`)
      console.log('API Response:', response.data)
      
      // Handle both direct menu data and nested menu data
      const menuData = response.data.menu || response.data
      console.log('Menu Data:', menuData)
      
      return menuData
    } catch (error) {
      // If backend is not available, return mock data
      console.warn('Backend API not available, using mock data:', error)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return {
        ...mockMenu,
        restaurantId
      }
    }
  },
}

export const orderApi = {
  createOrder: async (orderData: {
    restaurantId: string
    items: CartItem[]
    customerInfo: CustomerInfo
  }): Promise<Order> => {
    try {
      const response = await api.post('/order', orderData)
      return response.data
    } catch (error) {
      // Mock order creation for development
      console.warn('Backend API not available, using mock order creation:', error)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const orderId = `ORDER-${Date.now()}`
      const mockOrder: Order = {
        orderId,
        restaurantId: orderData.restaurantId,
        items: orderData.items,
        customerInfo: orderData.customerInfo,
        status: 'CREATED',
        totalAmount: orderData.items.reduce((sum, item) => sum + item.totalPrice, 0),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      
      return mockOrder
    }
  },

  getOrder: async (orderId: string): Promise<Order> => {
    try {
      const response = await api.get(`/order/${orderId}`)
      return response.data
    } catch (error) {
      // Mock order status for development
      console.warn('Backend API not available, using mock order status:', error)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const mockOrder: Order = {
        orderId,
        restaurantId: 'rest_001',
        items: [
          {
            menuItemId: 'item-001',
            name: '불고기 버거',
            price: 12000,
            quantity: 1,
            selectedOptions: [],
            totalPrice: 12000,
          }
        ],
        customerInfo: {
          name: '홍길동',
          phone: '010-1234-5678',
          email: 'test@example.com',
        },
        status: 'COOKING',
        totalAmount: 12000,
        createdAt: new Date(Date.now() - 600000).toISOString(), // 10 minutes ago
        updatedAt: new Date().toISOString(),
        paymentInfo: {
          method: 'NAVERPAY',
          transactionId: 'TXN-123456',
          paidAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
          amount: 12000,
        }
      }
      
      return mockOrder
    }
  },

  cancelOrder: async (orderId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await api.delete(`/order/${orderId}`)
      return response.data
    } catch (error) {
      console.warn('Backend API not available, using mock order cancellation:', error)
      
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      return {
        success: true,
        data: null,
      }
    }
  },
}

export const paymentApi = {
  initiatePayment: async (orderId: string, method: 'NAVERPAY' | 'KAKAOPAY'): Promise<{ paymentUrl: string }> => {
    try {
      const response = await api.post(`/payment/initiate`, { orderId, method })
      return response.data
    } catch (error) {
      console.warn('Backend API not available, using mock payment initiation:', error)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Mock payment URL that would redirect back with success
      const mockPaymentUrl = `http://localhost:3002/restaurant/rest_001/payment?orderId=${orderId}&status=success&paymentId=MOCK-${Date.now()}`
      
      return {
        paymentUrl: mockPaymentUrl
      }
    }
  },

  verifyPayment: async (orderId: string, paymentId: string): Promise<ApiResponse<null>> => {
    try {
      const response = await api.post(`/payment/verify`, { orderId, paymentId })
      return response.data
    } catch (error) {
      console.warn('Backend API not available, using mock payment verification:', error)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return {
        success: true,
        data: null,
      }
    }
  },
}