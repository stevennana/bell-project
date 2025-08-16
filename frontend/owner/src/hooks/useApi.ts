import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type LoginResponse } from '../services/api';
import type { MenuItem, OrderStatus, CreateCategoryRequest, UpdateCategoryRequest } from '../types/api';

// Auth hooks
export const useLogin = () => {
  return useMutation({
    mutationFn: apiClient.login.bind(apiClient),
    onSuccess: (data: LoginResponse) => {
      // Token is automatically saved in the apiClient
      console.log('Login successful:', data.user);
    },
    onError: (error) => {
      console.error('Login failed:', error);
    }
  });
};

// Menu hooks
export const useMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => apiClient.getMenu(restaurantId),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry 404 errors
      if (error?.response?.status === 404) {
        return false;
      }
      // Only retry other errors once
      return failureCount < 1;
    }
  });
};

export const usePublishedMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['publishedMenu', restaurantId],
    queryFn: () => apiClient.getPublishedMenu(restaurantId),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry 404 errors (no published menu exists)
      if (error?.response?.status === 404) {
        return false;
      }
      // Only retry other errors once
      return failureCount < 1;
    }
  });
};

export const useDraftMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['draftMenu', restaurantId],
    queryFn: () => apiClient.getDraftMenu(restaurantId),
    enabled: !!restaurantId,
    staleTime: 1 * 60 * 1000, // 1 minute - drafts change more frequently
    retry: 3
  });
};

export const useCreateMenuItem = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newItem: Omit<MenuItem, 'id'>) => {
      // For create, we'll need to get current menu and add the item
      let currentItems: MenuItem[] = [];
      
      try {
        // Try to get draft menu first, then fallback to published menu
        try {
          const draftMenu = await apiClient.getDraftMenu(restaurantId);
          currentItems = draftMenu?.items || [];
        } catch (draftError) {
          // If no draft, try published menu
          try {
            const publishedMenu = await apiClient.getPublishedMenu(restaurantId);
            currentItems = publishedMenu?.items || [];
          } catch (publishedError) {
            // If no menu exists yet, start with empty array
            console.log('No existing menu found, creating first menu item');
            currentItems = [];
          }
        }
      } catch (error) {
        // If no menu exists yet, start with empty array
        console.log('No existing menu found, creating first menu item');
        currentItems = [];
      }
      
      const newItems = [...currentItems, {
        ...newItem,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }];
      
      // Create new version (but don't confirm yet)
      await apiClient.createMenuVersion(restaurantId, newItems, false);
    },
    onSuccess: () => {
      // Invalidate and refetch menu data
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['publishedMenu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['draftMenu', restaurantId] });
    }
  });
};

export const useUpdateMenuItem = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<MenuItem> }) => {
      // Get current menu and update the specific item
      let currentItems: MenuItem[] = [];
      
      try {
        // Try to get draft menu first, then fallback to published menu
        try {
          const draftMenu = await apiClient.getDraftMenu(restaurantId);
          currentItems = draftMenu?.items || [];
        } catch (draftError) {
          // If no draft, try published menu
          const publishedMenu = await apiClient.getPublishedMenu(restaurantId);
          currentItems = publishedMenu?.items || [];
        }
      } catch (error) {
        throw new Error('No menu found to update item');
      }
      
      const updatedItems = currentItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      
      // Create new version with updated items
      await apiClient.createMenuVersion(restaurantId, updatedItems, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['publishedMenu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['draftMenu', restaurantId] });
    }
  });
};

export const useDeleteMenuItem = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      // Get current menu and remove the item
      let currentItems: MenuItem[] = [];
      
      try {
        // Try to get draft menu first, then fallback to published menu
        try {
          const draftMenu = await apiClient.getDraftMenu(restaurantId);
          currentItems = draftMenu?.items || [];
        } catch (draftError) {
          // If no draft, try published menu
          const publishedMenu = await apiClient.getPublishedMenu(restaurantId);
          currentItems = publishedMenu?.items || [];
        }
      } catch (error) {
        throw new Error('No menu found to delete item from');
      }
      
      const filteredItems = currentItems.filter(item => item.id !== itemId);
      
      // Create new version without the deleted item
      await apiClient.createMenuVersion(restaurantId, filteredItems, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['publishedMenu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['draftMenu', restaurantId] });
    }
  });
};

export const usePublishMenu = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      // Get current menu items and publish them
      const currentMenu = await apiClient.getMenu(restaurantId);
      await apiClient.publishMenu(restaurantId, currentMenu.items || []);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['publishedMenu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['draftMenu', restaurantId] });
    }
  });
};

export const useConfirmDraft = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (version: string) => {
      await apiClient.confirmMenuVersion(restaurantId, version);
    },
    onSuccess: () => {
      // Refresh all menu data
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['publishedMenu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['draftMenu', restaurantId] });
    }
  });
};

// Order hooks
export const useOrders = (restaurantId: string) => {
  return useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: () => apiClient.getOrders(restaurantId),
    enabled: !!restaurantId,
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
    retry: (failureCount, error: any) => {
      // Don't retry CORS errors or network errors from orders endpoint
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('CORS')) {
        return false;
      }
      // Only retry once for other errors
      return failureCount < 1;
    }
  });
};

export const useOrder = (orderId: string, restaurantId: string) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => apiClient.getOrder(orderId, restaurantId),
    enabled: !!orderId && !!restaurantId,
    retry: 3
  });
};

export const useUpdateOrderStatus = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: OrderStatus }) => {
      await apiClient.updateOrderStatus(orderId, restaurantId, status);
    },
    onSuccess: () => {
      // Refetch orders to get updated data
      queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
    }
  });
};

export const useCancelOrder = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (orderId: string) => apiClient.cancelOrder(orderId, restaurantId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders', restaurantId] });
    }
  });
};

// POS hooks
export const usePrintOrder = () => {
  return useMutation({
    mutationFn: ({ orderId, restaurantId }: { orderId: string; restaurantId: string }) =>
      apiClient.printOrder(orderId, restaurantId),
    onSuccess: (data) => {
      console.log('Print job created:', data.jobId);
    }
  });
};

export const usePrintStatus = (jobId: string) => {
  return useQuery({
    queryKey: ['printStatus', jobId],
    queryFn: () => apiClient.getPrintStatus(jobId),
    enabled: !!jobId,
    refetchInterval: 2000, // Check every 2 seconds
    retry: 3
  });
};

// Dashboard hooks
export const useDashboardStats = (restaurantId: string) => {
  return useQuery({
    queryKey: ['dashboardStats', restaurantId],
    queryFn: () => apiClient.getDashboardStats(restaurantId),
    enabled: !!restaurantId,
    refetchInterval: 60000, // Refetch every minute
    retry: (failureCount, error: any) => {
      // Don't retry network/CORS errors or 404s
      if (error?.code === 'ERR_NETWORK' || error?.message?.includes('CORS') || error?.response?.status === 404) {
        return false;
      }
      // Only retry once for other errors
      return failureCount < 1;
    }
  });
};

// Restaurant hooks
export const useRestaurant = (restaurantId: string) => {
  return useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: () => apiClient.getRestaurant(restaurantId),
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000, // 10 minutes - restaurant info doesn't change often
    retry: 3
  });
};

// Category hooks
export const useCategories = (restaurantId: string) => {
  return useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: () => apiClient.getCategories(restaurantId),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
  });
};

export const useCreateCategory = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (category: CreateCategoryRequest) => 
      apiClient.createCategory(restaurantId, category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', restaurantId] });
    }
  });
};

export const useUpdateCategory = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ categoryId, updates }: { categoryId: string; updates: UpdateCategoryRequest }) => 
      apiClient.updateCategory(restaurantId, categoryId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', restaurantId] });
      // Also invalidate menu data since category changes affect menu items
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
      queryClient.invalidateQueries({ queryKey: ['draftMenu', restaurantId] });
    }
  });
};