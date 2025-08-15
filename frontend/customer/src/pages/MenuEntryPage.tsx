import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCart } from '../context/CartContext'

export default function MenuEntryPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const navigate = useNavigate()
  const { setRestaurant } = useCart()

  useEffect(() => {
    if (restaurantId) {
      setRestaurant(restaurantId)
    }
  }, [restaurantId, setRestaurant])

  const handleEnterMenu = () => {
    if (restaurantId) {
      navigate(`/restaurant/${restaurantId}/menu`)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex flex-col items-center justify-center p-4 animate-fade-in-up" style={{minHeight: '100vh', background: 'linear-gradient(135deg, #fff7ed 0%, #fef2f2 50%, #fdf2f8 100%)'}}>
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-orange-200 to-red-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="relative bg-white rounded-3xl shadow-2xl p-8 text-center max-w-md w-full backdrop-blur-sm border border-white/20">
        {/* Restaurant logo and title */}
        <div className="mb-8">
          <div className="relative mb-6">
            <div className="w-28 h-28 bg-gradient-to-br from-orange-400 via-red-500 to-pink-500 rounded-full mx-auto flex items-center justify-center shadow-lg">
              <span className="text-white text-4xl">🔔</span>
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-400 rounded-full flex items-center justify-center shadow-md">
              <span className="text-white text-xs font-bold">✓</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent mb-3">
            Bell Restaurant
          </h1>
          <p className="text-gray-600 text-lg">QR 기반 스마트 주문 시스템</p>
          <div className="mt-2 flex items-center justify-center space-x-1">
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-400">⭐</span>
            <span className="text-yellow-400">⭐</span>
            <span className="text-gray-500 text-sm ml-2">(4.9)</span>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="space-y-4 mb-8">
          <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-2xl p-5 border-l-4 border-orange-400 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">📱</span>
              <h3 className="font-bold text-gray-800">간편한 모바일 주문</h3>
            </div>
            <p className="text-sm text-gray-600">메뉴 선택부터 결제까지 한 번에</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-5 border-l-4 border-green-400 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">⚡</span>
              <h3 className="font-bold text-gray-800">실시간 주문 추적</h3>
            </div>
            <p className="text-sm text-gray-600">조리 상태를 실시간으로 확인</p>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border-l-4 border-blue-400 transform hover:scale-105 transition-transform duration-200">
            <div className="flex items-center mb-2">
              <span className="text-2xl mr-3">🎯</span>
              <h3 className="font-bold text-gray-800">대기 없는 픽업</h3>
            </div>
            <p className="text-sm text-gray-600">줄 서지 말고 바로 픽업하세요</p>
          </div>
        </div>

        <button
          onClick={handleEnterMenu}
          className="w-full bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white py-4 px-6 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <span>🍽️</span>
          <span>메뉴 보러가기</span>
          <span>→</span>
        </button>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>영업중</span>
            </div>
            <div>•</div>
            <div>평균 대기시간: 15분</div>
          </div>
          {restaurantId && (
            <p className="text-xs text-gray-400 mt-2">
              매장 코드: {restaurantId}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}