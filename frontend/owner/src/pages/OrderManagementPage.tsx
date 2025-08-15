import React, { useState } from 'react';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Printer,
  RefreshCw,
  AlertCircle,
  User,
  Phone,
  Mail
} from 'lucide-react';
import { 
  useOrders, 
  useUpdateOrderStatus, 
  useCancelOrder, 
  usePrintOrder 
} from '../hooks/useApi';
import type { Order, OrderStatus } from '../types/api';

interface OrderManagementPageProps {
  restaurantId: string;
}

const statusConfig = {
  CREATED: { color: 'status-created', label: 'Created' },
  PAYMENT_PENDING: { color: 'status-badge bg-blue-100 text-blue-800', label: 'Payment Pending' },
  PAID: { color: 'status-paid', label: 'Paid' },
  COOKING: { color: 'status-cooking', label: 'Cooking' },
  READY: { color: 'status-ready', label: 'Ready' },
  COMPLETED: { color: 'status-completed', label: 'Completed' },
  CANCELLED: { color: 'status-cancelled', label: 'Cancelled' }
};

export const OrderManagementPage: React.FC<OrderManagementPageProps> = ({
  restaurantId
}) => {
  // API hooks
  const { data: orders = [], isLoading, error, refetch } = useOrders(restaurantId);
  const updateOrderStatus = useUpdateOrderStatus(restaurantId);
  const cancelOrder = useCancelOrder(restaurantId);
  const printOrder = usePrintOrder();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const filteredOrders = statusFilter === 'ALL' 
    ? orders 
    : orders.filter(order => order.status === statusFilter);

  const activeOrders = orders.filter(order => 
    ['PAID', 'COOKING', 'READY'].includes(order.status)
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const getTimeElapsed = (dateString: string) => {
    const now = new Date();
    const orderTime = new Date(dateString);
    const diffMs = now.getTime() - orderTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 60) return `${diffMins}분 전`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}시간 전`;
  };

  const canStartCooking = (order: Order) => order.status === 'PAID';
  const canMarkReady = (order: Order) => order.status === 'COOKING';
  const canComplete = (order: Order) => order.status === 'READY';
  const canCancel = (order: Order) => ['CREATED', 'PAYMENT_PENDING', 'PAID'].includes(order.status);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateOrderStatus.mutateAsync({ orderId, status });
    } catch (error) {
      console.error('Failed to update order status:', error);
      alert('Failed to update order status.');
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (window.confirm('Are you sure you want to cancel this order?')) {
      try {
        await cancelOrder.mutateAsync(orderId);
      } catch (error) {
        console.error('Failed to cancel order:', error);
        alert('Failed to cancel order.');
      }
    }
  };

  const handlePrintOrder = async (orderId: string) => {
    try {
      const result = await printOrder.mutateAsync({ orderId, restaurantId });
      console.log('Print job created:', result.jobId);
      alert(`Print job sent for order ${orderId}`);
    } catch (error) {
      console.error('Failed to print order:', error);
      alert('Failed to send print job.');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600">Loading orders...</p>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card p-4">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
          <p className="text-red-600">Error loading orders: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Management</h1>
            <p className="text-gray-600">Manage and track customer orders</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="btn-secondary"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Orders</p>
              <p className="text-2xl font-bold text-gray-900">{activeOrders.length}</p>
            </div>
            <Clock className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Cooking</p>
              <p className="text-2xl font-bold text-yellow-600">
                {orders.filter(o => o.status === 'COOKING').length}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ready</p>
              <p className="text-2xl font-bold text-purple-600">
                {orders.filter(o => o.status === 'READY').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Today's Total</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(orders.reduce((sum, order) => sum + order.totalAmount, 0))}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="mb-6">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          {(['ALL', ...Object.keys(statusConfig)] as Array<'ALL' | OrderStatus>).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                statusFilter === status
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {status === 'ALL' ? 'All' : statusConfig[status as OrderStatus]?.label || status}
              {status === 'ALL' 
                ? ` (${orders.length})`
                : ` (${orders.filter(o => o.status === status).length})`
              }
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="card">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No orders</h3>
            <p className="mt-1 text-sm text-gray-500">
              {statusFilter === 'ALL' 
                ? 'No orders have been placed yet.'
                : `No orders with status "${statusFilter}".`
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto scrollbar-hide">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Time
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.orderId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        #{order.orderId.slice(-8)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{order.customerInfo.name}</div>
                      <div className="text-sm text-gray-500">{order.customerInfo.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        {order.items.map(item => `${item.name} x${item.quantity}`).join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.totalAmount)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={statusConfig[order.status].color}>
                        {statusConfig[order.status].label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{formatTime(order.createdAt)}</div>
                      <div className="text-xs">{getTimeElapsed(order.createdAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePrintOrder(order.orderId)}
                          className="text-gray-600 hover:text-gray-900"
                          disabled={printOrder.isPending}
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                        {canStartCooking(order) && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.orderId, 'COOKING')}
                            className="text-yellow-600 hover:text-yellow-900"
                            disabled={updateOrderStatus.isPending}
                          >
                            Start Cooking
                          </button>
                        )}
                        {canMarkReady(order) && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.orderId, 'READY')}
                            className="text-purple-600 hover:text-purple-900"
                            disabled={updateOrderStatus.isPending}
                          >
                            Mark Ready
                          </button>
                        )}
                        {canComplete(order) && (
                          <button
                            onClick={() => handleUpdateOrderStatus(order.orderId, 'COMPLETED')}
                            className="text-green-600 hover:text-green-900"
                            disabled={updateOrderStatus.isPending}
                          >
                            Complete
                          </button>
                        )}
                        {canCancel(order) && (
                          <button
                            onClick={() => handleCancelOrder(order.orderId)}
                            className="text-red-600 hover:text-red-900"
                            disabled={cancelOrder.isPending}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Order #{selectedOrder.orderId.slice(-8)}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-gray-700">Customer Information</h4>
                  <div className="mt-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      {selectedOrder.customerInfo.name}
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2" />
                      {selectedOrder.customerInfo.phone}
                    </div>
                    {selectedOrder.customerInfo.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2" />
                        {selectedOrder.customerInfo.email}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-700">Order Items</h4>
                  <div className="mt-1 space-y-2">
                    {selectedOrder.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.name} x{item.quantity}</span>
                        <span>{formatCurrency(item.totalPrice)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>{formatCurrency(selectedOrder.totalAmount)}</span>
                  </div>
                </div>
                
                <div>
                  <span className={statusConfig[selectedOrder.status].color}>
                    {statusConfig[selectedOrder.status].label}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};