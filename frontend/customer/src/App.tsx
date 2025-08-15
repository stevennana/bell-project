import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CartProvider } from './context/CartContext'
import MenuEntryPage from './pages/MenuEntryPage'
import MenuPage from './pages/MenuPage'
import CartPage from './pages/CartPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import PaymentPage from './pages/PaymentPage'
import OrderCompletePage from './pages/OrderCompletePage'
import OrderStatusPage from './pages/OrderStatusPage'
import ErrorPage from './pages/ErrorPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error: any) => {
        // Don't retry for 404s
        if (error?.response?.status === 404) return false
        return failureCount < 3
      },
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<Navigate to="/restaurant/rest_001" replace />} />
              <Route path="/restaurant/:restaurantId" element={<MenuEntryPage />} />
              <Route path="/restaurant/:restaurantId/menu" element={<MenuPage />} />
              <Route path="/restaurant/:restaurantId/cart" element={<CartPage />} />
              <Route path="/restaurant/:restaurantId/order-confirmation" element={<OrderConfirmationPage />} />
              <Route path="/restaurant/:restaurantId/payment" element={<PaymentPage />} />
              <Route path="/restaurant/:restaurantId/order-complete/:orderId" element={<OrderCompletePage />} />
              <Route path="/restaurant/:restaurantId/order-status/:orderId" element={<OrderStatusPage />} />
              <Route path="*" element={<ErrorPage />} />
            </Routes>
          </div>
        </Router>
      </CartProvider>
    </QueryClientProvider>
  )
}

export default App
