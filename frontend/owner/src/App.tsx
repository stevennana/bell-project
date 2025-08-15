import { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MenuManagementPage } from './pages/MenuManagementPage';
import { OrderManagementPage } from './pages/OrderManagementPage';
import { Layout } from './components/Layout';
import { useLogin } from './hooks/useApi';
import { apiClient, type LoginResponse } from './services/api';

interface User {
  id: string;
  email: string;
  restaurantId: string;
}

type Page = 'dashboard' | 'menu' | 'orders' | 'pos' | 'reports';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [restaurantId] = useState('rest_001'); // Default restaurant ID
  
  const loginMutation = useLogin();

  // Check for existing auth token on app load
  useEffect(() => {
    const token = localStorage.getItem('bell_auth_token');
    if (token) {
      // TODO: Validate token with backend
      setIsAuthenticated(true);
      setCurrentUser({
        id: 'owner_1',
        email: 'owner@test.com',
        restaurantId: restaurantId
      });
    }
  }, [restaurantId]);

  const handleLogin = async (credentials: { email: string; password: string }) => {
    try {
      const response = await loginMutation.mutateAsync(credentials) as LoginResponse;
      
      setCurrentUser({
        id: response.user.userId,
        email: response.user.email,
        restaurantId: response.user.restaurantId
      });
      setIsAuthenticated(true);
      console.log('User logged in:', response.user);
    } catch (error) {
      throw new Error('Login failed. Please check your credentials.');
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentPage('dashboard');
    console.log('User logged out');
  };

  const handleViewOrder = () => {
    setCurrentPage('orders');
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderCurrentPage = () => {
    if (!currentUser) return null;
    
    const userRestaurantId = currentUser.restaurantId;
    
    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            restaurantId={userRestaurantId}
            onViewOrder={handleViewOrder}
          />
        );
      case 'menu':
        return (
          <MenuManagementPage
            restaurantId={userRestaurantId}
          />
        );
      case 'orders':
        return (
          <OrderManagementPage
            restaurantId={userRestaurantId}
          />
        );
      case 'pos':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">POS Printing</h1>
            <p className="text-gray-600">POS printing interface will be implemented here.</p>
          </div>
        );
      case 'reports':
        return (
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Sales Reports</h1>
            <p className="text-gray-600">Sales reporting interface will be implemented here.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
  };

  return (
    <Layout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onLogout={handleLogout}
      restaurantName={currentUser ? `${currentUser.email}'s Restaurant` : "Bell Restaurant"}
    >
      {renderCurrentPage()}
    </Layout>
  );
}

export default App;
