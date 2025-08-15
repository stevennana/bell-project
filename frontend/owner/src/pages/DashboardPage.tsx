import React from 'react';
import { 
  ShoppingCart, 
  DollarSign, 
  Clock, 
  Users,
  AlertCircle
} from 'lucide-react';
import { useDashboardStats, useOrders, useRestaurant } from '../hooks/useApi';

interface RecentOrder {
  id: string;
  customerName: string;
  items: string[];
  total: number;
  status: 'PAID' | 'COOKING' | 'READY';
  createdAt: string;
}

interface DashboardPageProps {
  restaurantId: string;
  onViewOrder: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  restaurantId,
  onViewOrder
}) => {
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats(restaurantId);
  const { data: orders = [], isLoading: ordersLoading } = useOrders(restaurantId);
  const { data: restaurant, isLoading: restaurantLoading } = useRestaurant(restaurantId);
  // Convert orders to recent orders format
  const recentOrders: RecentOrder[] = orders.slice(0, 5).map(order => ({
    id: order.orderId,
    customerName: order.customerInfo.name,
    items: order.items.map(item => item.name),
    total: order.totalAmount,
    status: order.status as 'PAID' | 'COOKING' | 'READY',
    createdAt: order.createdAt
  }));

  const statusColors = {
    PAID: 'bg-blue-100 text-blue-800',
    COOKING: 'bg-yellow-100 text-yellow-800',
    READY: 'bg-green-100 text-green-800'
  };

  // Show loading state
  if (statsLoading || ordersLoading || restaurantLoading) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card p-5">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error state
  if (statsError) {
    return (
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-red-600">Error loading dashboard data: {statsError.message}</p>
        </div>
      </div>
    );
  }

  // Use default values if stats not loaded
  const defaultStats = {
    todayOrders: 0,
    todayRevenue: 0,
    activeOrders: 0,
    avgOrderTime: 0,
    pendingOrders: 0
  };

  const displayStats = stats || defaultStats;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW'
    }).format(amount);
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}시간 ${mins}분`;
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">
              {restaurant ? `${restaurant.restaurantName} (${restaurant.restaurantId})` : 'Restaurant overview and recent activity'}
            </p>
          </div>
          {restaurant && (
            <div className="text-right">
              <p className="text-sm text-gray-500">Activation Code</p>
              <p className="text-lg font-mono font-bold text-blue-600">{restaurant.activationCode}</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingCart className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {displayStats.todayOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Today's Revenue
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatCurrency(displayStats.todayRevenue)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {displayStats.activeOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Avg Order Time
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {formatTime(displayStats.avgOrderTime)}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Pending Orders
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {displayStats.pendingOrders}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Recent Orders
            </h3>
            <button className="text-sm text-primary-600 hover:text-primary-500 self-start sm:self-auto">
              View all
            </button>
          </div>
          
          {recentOrders.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders yet</h3>
              <p className="mt-1 text-sm text-gray-500">
                Orders will appear here when customers start placing them.
              </p>
            </div>
          ) : (
            <div className="flow-root">
              <ul className="-my-5 divide-y divide-gray-200">
                {recentOrders.map((order) => (
                  <li key={order.id} className="py-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {order.customerName}
                        </p>
                        <p className="text-sm text-gray-500">
                          {order.items.join(', ')}
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(order.createdAt).toLocaleString('ko-KR')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(order.total)}
                        </div>
                        <button
                          onClick={() => onViewOrder()}
                          className="text-primary-600 hover:text-primary-500 text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};