import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient, type LoginResponse } from '../services/api';
import type { MenuItem, OrderStatus } from '../types/api';

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
    retry: 3
  });
};

export const usePublishedMenu = (restaurantId: string) => {
  return useQuery({
    queryKey: ['publishedMenu', restaurantId],
    queryFn: () => apiClient.getPublishedMenu(restaurantId),
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 3
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
      const currentMenu = await apiClient.getMenu(restaurantId);
      const newItems = [...(currentMenu.items || []), {
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
      const currentMenu = await apiClient.getMenu(restaurantId);
      const updatedItems = (currentMenu.items || []).map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      
      // Create new version with updated items
      await apiClient.createMenuVersion(restaurantId, updatedItems, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
    }
  });
};

export const useDeleteMenuItem = (restaurantId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      // Get current menu and remove the item
      const currentMenu = await apiClient.getMenu(restaurantId);
      const filteredItems = (currentMenu.items || []).filter(item => item.id !== itemId);
      
      // Create new version without the deleted item
      await apiClient.createMenuVersion(restaurantId, filteredItems, false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu', restaurantId] });
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
    retry: 3
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
    retry: 3
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