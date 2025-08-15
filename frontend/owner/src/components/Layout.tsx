import React, { useState } from 'react';
import { 
  Menu, 
  X, 
  Home, 
  ChefHat, 
  ShoppingCart, 
  Printer, 
  BarChart3, 
  LogOut,
  Bell
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  restaurantName?: string;
}

const navigation = [
  { name: 'Dashboard', href: 'dashboard', icon: Home },
  { name: 'Menu Management', href: 'menu', icon: ChefHat },
  { name: 'Orders', href: 'orders', icon: ShoppingCart },
  { name: 'POS Printing', href: 'pos', icon: Printer },
  { name: 'Sales Reports', href: 'reports', icon: BarChart3 },
];

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  currentPage, 
  onNavigate, 
  onLogout,
  restaurantName = "Bell Restaurant"
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 lg:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <Bell className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{restaurantName}</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      onNavigate(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`${
                      currentPage === item.href
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group flex items-center px-2 py-2 text-base font-medium rounded-md w-full text-left`}
                  >
                    <Icon className={`${
                      currentPage === item.href ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                    } mr-4 h-6 w-6`} />
                    {item.name}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
            <button
              onClick={onLogout}
              className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md w-full"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-400" />
              Sign out
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col h-0 flex-1 border-r border-gray-200 bg-white">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <Bell className="h-8 w-8 text-primary-600" />
                <span className="ml-2 text-xl font-bold text-gray-900">{restaurantName}</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      onClick={() => onNavigate(item.href)}
                      className={`${
                        currentPage === item.href
                          ? 'bg-primary-100 text-primary-900'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left`}
                    >
                      <Icon className={`${
                        currentPage === item.href ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 h-5 w-5`} />
                      {item.name}
                    </button>
                  );
                })}
              </nav>
            </div>
            
            <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
              <button
                onClick={onLogout}
                className="flex items-center px-2 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md w-full"
              >
                <LogOut className="mr-3 h-5 w-5 text-gray-400" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <div className="lg:hidden">
          <div className="flex items-center justify-between bg-white border-b border-gray-200 px-4 py-1.5">
            <div className="flex items-center">
              <Bell className="h-8 w-8 text-primary-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">{restaurantName}</span>
            </div>
            <button
              className="-mr-3 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
};